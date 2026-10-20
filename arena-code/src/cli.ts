#!/usr/bin/env node
/**
 * Arena Code CLI v2.1 — Claude Code + Codex + Muse + Ghidra Fusion
 *
 * Phase 1 (기반 다지기): config 통합 + registry + session 분리
 * - config/resolve.ts: arena.config.json + .env + CLI 병합
 * - session/bootstrap.ts: sandbox/eventLog/worktree/skill/provider 초기화
 * - session/banner.ts: 상태 출력
 * - tools/registry.ts: 동적 도구 등록 (플러그인 슬롯)
 */
import { createInterface } from "node:readline";
import { resolve } from "node:path";
import { Command } from "commander";
import { queryLoop } from "./loop/queryLoop.js";
import { buildRegistry } from "./tools/index.js";
import type { Message } from "./providers/types.js";
import { resolveConfig } from "./config/resolve.js";
import { bootstrapSession } from "./session/bootstrap.js";
import type { Session } from "./session/bootstrap.js";
import { printBanner } from "./session/banner.js";
import { getDefaultSandbox, sandboxStatus, canWritePath, canExecuteCommand } from "./sandbox/index.js";
import type { SandboxMode } from "./sandbox/index.js";
import { EventLog } from "./eventLog/index.js";
import { WorktreeManager } from "./worktree/index.js";
import { BackgroundAgentManager } from "./background/index.js";

// ─── CLI 정의 ──────────────────────────────────────────────
const program = new Command();

program
  .name("arena-code")
  .description("Arena Code v2.1 — Claude Code + Codex + Muse + Ghidra (37 tools)")
  .version("2.1.0")
  .option("-p, --print <prompt>", "Headless: 한 번 질문하고 종료")
  .option("--provider <name>", "LLM: arena|openrouter|gemini|groq|ollama|anthropic")
  .option("--model <model>", "모델 이름 직접 지정")
  .option("--max-turns <n>", "최대 반복 횟수", "20")
  .option("--cwd <path>", "작업 디렉토리", process.cwd())
  .option("--mock", "가짜 모드 (API 키 없이 데모)")
  .option("--sandbox <mode>", "샌드박스: read-only|workspace-write|danger-full-access")
  .option("--yolo", "샌드박스+승인 모두 끄기 (--dangerously-skip-permissions 별칭)")
  .option("--dangerously-skip-permissions", "승인 검사 건너뛰기")
  .option("--worktree <task>", "git worktree에 격리 실행")
  .option("--resume", "중단된 세션 재개 (이벤트 로그에서)")
  .option("--skill <name>", "시작 시 스킬 활성화: plan|grill|goal|loop|ghidra")
  .option("--approval-mode <mode>", "승인 모드: on-request|never|untrusted")
  .option("--config <path>", "arena.config.json 경로 직접 지정")
  .option("--disable-tools <list>", "비활성화할 도구 (콤마 구분)")
  .argument("[prompt]", "프롬프트 (대안)")
  .action(async (promptArg, opts) => {
    // 1) 통합 config 해석 (arena.config.json + .env + CLI)
    const cwdForConfig = resolve(opts.cwd ?? process.cwd());
    const config = resolveConfig(cwdForConfig, opts);

    // --disable-tools CLI 병합
    if (opts.disableTools) {
      const extra = (opts.disableTools as string).split(",").map((s: string) => s.trim()).filter(Boolean);
      config.disabledTools = [...config.disabledTools, ...extra];
    }
    if (opts.mock) config.mock = true;
    if (opts.resume) (config as unknown as Record<string, unknown>).resume = true;
    if (promptArg && !opts.print) config.printPrompt = promptArg;
    else if (opts.print) config.printPrompt = opts.print;

    // provider/model 환경변수 반영 (resolveConfig가 이미 처리하지만 CLI 직접 주입도 보정)
    if (opts.model) config.model = opts.model;

    // 2) 세션 부트스트랩
    const session = await bootstrapSession(config);
    const cwd = session.effectiveCwd;

    // 3) Tool Registry (config.disabledTools 반영)
    const registry = buildRegistry(config.disabledTools);
    const tools = registry.all();

    // 플러그인 로드 (있는 경우)
    for (const p of config.pluginPaths) {
      const r = await registry.loadPlugin(p);
      if (r.error) console.log(`   ⚠️ 플러그인 로드 실패 (${p}): ${r.error}`);
      else if (r.loaded > 0) console.log(`   🔌 플러그인 ${p}: ${r.loaded}개 도구 로드`);
    }

    // 4) 배너
    printBanner(session, config.printPrompt);
    if (config.disabledTools.length) console.log(`   🚫 비활성 도구: ${config.disabledTools.join(", ")}`);
    if (config.pluginPaths.length) console.log(`   🔌 플러그인: ${config.pluginPaths.join(", ")}`);
    if (registry.size() !== tools.length) console.log(`   Tools: ${tools.length}개 활성 / ${registry.size()}개 등록`);

    const shared: SharedOpts = {
      dangerouslySkipPermissions: config.dangerouslySkipPermissions,
      sandbox: session.sandbox,
      eventLog: session.eventLog ?? undefined,
      skillExtra: session.skillExtra,
      worktreeMgr: session.worktreeMgr ?? undefined,
      tools,
    };

    if (config.printPrompt) {
      await runPrompt(config.printPrompt, session.provider, cwd, config.maxTurns, shared);
      session.eventLog?.sessionEnd("headless done");
      return;
    }
    await runInteractive(session.provider, cwd, config.maxTurns, shared, session.skillMgr);
    session.eventLog?.sessionEnd("interactive ended");
  });

// ─── Helpers ─────────────────────────────────────────────
import type { Tool } from "./tools/types.js";
import type { SandboxConfig } from "./sandbox/index.js";

interface SharedOpts {
  dangerouslySkipPermissions?: boolean;
  sandbox?: SandboxConfig;
  eventLog?: EventLog;
  skillExtra?: string;
  worktreeMgr?: WorktreeManager;
  tools: Tool[];
}

async function runPrompt(
  prompt: string, provider: Session["provider"], cwd: string, maxTurns: number, shared: SharedOpts,
) {
  const messages: Message[] = [{ role: "user", content: prompt }];
  console.log(`\n▶ Prompt: ${prompt}\n` + "─".repeat(60));
  await runLoop(messages, provider, cwd, maxTurns, shared);
}

async function runInteractive(
  provider: Session["provider"], cwd: string, maxTurns: number, shared: SharedOpts, skillMgr: Session["skillMgr"],
) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const messages: Message[] = [];
  const bgMgr = new BackgroundAgentManager(shared.eventLog);

  console.log("💬 Interactive — 'exit'로 종료, '/help'로 도움말\n");

  const ask = (q: string) => new Promise<string>(res => rl.question(q, res));
  let abortController = new AbortController();
  process.on("SIGINT", () => { console.log("\n\n⚡ Interrupted. Aborting..."); abortController.abort(); abortController = new AbortController(); });

  const tryHandleSlash = async (input: string): Promise<boolean> => {
    const parsed = skillMgr.parseCommand(input);
    if (parsed) {
      const skill = skillMgr.get(parsed.skill)!;
      console.log(`\n✨ Skill /${skill.name}: ${skill.description}`);
      if (parsed.skill === "plan") {
        messages.push({ role: "user", content: `활성 스킬 /plan: ${skill.content}\n\n사용자 요청: ${parsed.args || "(다음 메시지에서 요청)"}` });
        console.log(`   → 다음 메시지에서 계획을 세웁니다. 요청을 입력하세요.`);
        return true;
      }
      if (parsed.skill === "grill") {
        const lastAssistant = [...messages].reverse().find(m => m.role === "assistant");
        const content = lastAssistant ? (typeof lastAssistant.content === "string" ? lastAssistant.content : "") : "검사할 계획이 없습니다";
        messages.push({ role: "user", content: `${skill.content}\n\n검사 대상:\n${content}` });
        console.log(`\nSkill /grill로 검토 중...\n` + "─".repeat(60));
        abortController = new AbortController();
        await runLoop(messages, provider, cwd, maxTurns, { ...shared, skillExtra: skillMgr.formatForPrompt("grill") || "" }, abortController.signal, bgMgr);
        console.log("─".repeat(60));
        return true;
      }
      if (parsed.skill === "goal" || parsed.skill === "loop" || parsed.skill === "ghidra") {
        messages.push({ role: "user", content: `${skill.content}\n\n사용자: ${parsed.args}` });
        console.log(`\n─`.repeat(60));
        abortController = new AbortController();
        await runLoop(messages, provider, cwd, maxTurns, { ...shared, skillExtra: skillMgr.formatForPrompt(parsed.skill) || "" }, abortController.signal, bgMgr);
        console.log("─".repeat(60));
        return true;
      }
      const extra = skillMgr.formatForPrompt(parsed.skill) || "";
      messages.push({ role: "user", content: parsed.args || `스킬 /${parsed.skill} 활성화` });
      abortController = new AbortController();
      console.log(`\n` + "─".repeat(60));
      await runLoop(messages, provider, cwd, maxTurns, { ...shared, skillExtra: extra }, abortController.signal, bgMgr);
      console.log("─".repeat(60));
      return true;
    }

    if (input === "/help") {
      console.log(`
명령어:
  /help           도움말
  /clear          대화 초기화
  /status         상태 (provider, sandbox, event log, worktrees)
  /plan [요청]    계획을 세우고 승인 후 실행
  /grill          마지막 계획을 스트레스 테스트
  /goal <목표>    목표 달성까지 계속
  /loop <간격> <작업> 반복 실행 (예: /loop 5m "테스트 실행")
  /ghidra <요청>  Ghidra 바이너리 분석 모드
  /worktree <task> 새 worktree 생성
  /worktree:list  worktree 목록
  /worktree:prune 모든 arena worktree 정리
  /sandbox <mode> 샌드박스 전환 (read-only/workspace-write/danger-full-access)
  /resume         이벤트 로그 복구
  /exit, exit, quit 종료
  /config         현재 config 덤프 (v2.1+)
  /tools          등록된 도구 목록 (v2.1+)
`);
      return true;
    }
    if (input === "/clear") { messages.length = 0; console.log("🧹 초기화됨."); return true; }
    if (input === "/status") {
      const wt = shared.worktreeMgr ? await shared.worktreeMgr.list() : null;
      console.log(`\nProvider: ${provider.name} (${provider.model})\nCWD: ${cwd}\nMessages: ${messages.length}\nMax turns: ${maxTurns}\nSandbox: ${shared.sandbox?.mode}\nEvent Log: ${shared.eventLog?.logPath}\nWorktrees: ${wt ? wt.worktrees.length + "개" : "없음"}\nSkills: ${skillMgr.list().map(s => "/" + s.name).join(", ")}\nTools: ${shared.tools.map(t => t.name).join(", ")}`);
      return true;
    }
    if (input === "/config") {
      // 현재 세션의 sandbox/provider 등 상태 출력
      console.log(`\nSandbox: ${shared.sandbox?.mode}\nProvider: ${provider.name} (${provider.model})\nMaxTurns: ${maxTurns}\nCWD: ${cwd}\nTools: ${shared.tools.length}개`);
      return true;
    }
    if (input === "/tools") {
      console.log(`\nTools (${shared.tools.length}개):\n${shared.tools.map(t => `  - ${t.name}: ${t.description.slice(0, 80)}`).join("\n")}`);
      return true;
    }
    if (input.startsWith("/worktree")) {
      const rest = input.slice("/worktree".length).trim();
      const mgr = shared.worktreeMgr || new WorktreeManager(cwd);
      if (!mgr.isGitRepo()) { console.log("⚠️ Git 저장소 아님"); return true; }
      if (!rest || rest === ":list") { const r = await mgr.list(); console.log(`\nWorktrees:\n${r.detail}`); return true; }
      if (rest === ":prune") { const r = await mgr.pruneAll(); console.log(`\n${r.message}`); return true; }
      const taskName = rest.replace(/^:/, "");
      const r = await mgr.create(taskName);
      if (r.error) console.log(`\n⚠️ ${r.error}`);
      else console.log(`\n✅ Worktree 생성: ${r.worktree.path} (branch: ${r.worktree.branch})`);
      return true;
    }
    if (input.startsWith("/sandbox")) {
      const mode = input.slice("/sandbox".length).trim() as SandboxMode;
      if (["read-only", "workspace-write", "danger-full-access"].includes(mode)) {
        shared.sandbox = getDefaultSandbox(mode, cwd);
        console.log(`\n${sandboxStatus(shared.sandbox!)}`);
      } else {
        console.log(`\n사용법: /sandbox read-only|workspace-write|danger-full-access\n현재: ${shared.sandbox?.mode}`);
      }
      return true;
    }
    if (input === "/resume") {
      const events = EventLog.findLastSession(cwd);
      if (!events) console.log("⚠️ 복구할 세션 없음");
      else console.log(`\n📝 최근 세션: ${events.length}개 이벤트\n${events.slice(-5).map(e => `  ${e.timestamp} [${e.type}]`).join("\n")}`);
      return true;
    }
    return false;
  };

  while (true) {
    const input = await ask("\n\x1b[1m❯ \x1b[0m");
    const trimmed = input.trim();
    if (!trimmed) continue;
    if (["exit", "quit", "/exit"].includes(trimmed.toLowerCase())) { console.log("\n👋 종료합니다."); break; }
    if (await tryHandleSlash(trimmed)) continue;
    messages.push({ role: "user", content: trimmed });
    abortController = new AbortController();
    console.log("\n" + "─".repeat(60));
    await runLoop(messages, provider, cwd, maxTurns, shared, abortController.signal, bgMgr);
    console.log("─".repeat(60));
  }
  rl.close();
}

async function runLoop(
  messages: Message[], provider: Session["provider"], cwd: string, maxTurns: number, shared: SharedOpts, signal?: AbortSignal, bgMgr?: BackgroundAgentManager,
): Promise<"done" | "aborted" | "error"> {
  let fullText = "";
  let outcome: "done" | "aborted" | "error" = "done";

  const onAskPermission = shared.dangerouslySkipPermissions
    ? async () => true
    : async (block: { type: string; name?: string; input?: Record<string, unknown> }) => {
        if (shared.sandbox && (block.name === "Write" || block.name === "Edit")) {
          const fp = (block.input as Record<string, string>)?.file_path || "";
          if (fp) { const c = canWritePath(fp, shared.sandbox); if (!c.allowed) { console.log(`\n${c.reason}`); return false; } }
        }
        if (shared.sandbox && block.name === "Bash") {
          const cmd = (block.input as Record<string, string>)?.command || "";
          if (cmd) { const c = canExecuteCommand(cmd, shared.sandbox); if (!c.allowed) { console.log(`\n${c.reason}`); return false; } }
        }
        if (process.stdin.isTTY) {
          const rl = createInterface({ input: process.stdin, output: process.stdout });
          const input2 = block.input ?? {};
          const cmd = block.name === "Bash" ? (input2.command as string) : `${block.name}(${JSON.stringify(input2).slice(0, 200)})`;
          const ans = await new Promise<string>(res => rl.question(`\n❓ 권한 요청 (${shared.sandbox?.mode}): ${block.name} — ${cmd}\n   허용? [Y/n] `, a => { rl.close(); res(a); }));
          return ans.trim().toLowerCase() === "" || ans.trim().toLowerCase() === "y" || ans.trim().toLowerCase() === "yes";
        }
        console.log(`\n⚠️  Auto-allowing (headless): ${block.name}(${JSON.stringify(block.input ?? {}).slice(0, 200)})`);
        return true;
      };

  shared.eventLog?.modelCall({ messages: messages.length, provider: provider.name });

  try {
    for await (const event of queryLoop({
      provider,
      tools: shared.tools,
      cwd,
      messages,
      maxTurns,
      signal,
      onAskPermission,
      systemExtra: shared.skillExtra,
    })) {
      switch (event.type) {
        case "text": process.stdout.write(event.text); fullText += event.text; shared.eventLog?.modelResponse({ delta: event.text }); break;
        case "tool_start": {
          process.stdout.write(`\n\n🔧 ${event.tool}(${Object.entries(event.input).map(([k, v]) => `${k}=${JSON.stringify(v).slice(0, 100)}`).join(", ")})\n`);
          shared.eventLog?.toolRequest(event.tool, event.input);
          break;
        }
        case "tool_result": {
          process.stdout.write(`   → ${event.result.slice(0, 1000)}${event.result.length > 1000 ? "..." : ""}\n`);
          shared.eventLog?.toolResult(event.tool, event.result, undefined, "success");
          break;
        }
        case "tool_denied": process.stdout.write(`\n⛔ Denied: ${event.tool} — ${event.reason}\n`); shared.eventLog?.approvalRequest(event.tool, "denied"); break;
        case "compacting": process.stdout.write(`\n📦 ${event.message}\n`); break;
        case "error": process.stdout.write(`\n\n❌ ${event.message}\n`); outcome = "error"; shared.eventLog?.error(event.message); break;
        case "aborted": process.stdout.write(`\n\n⚡ ${event.reason}\n`); outcome = "aborted"; shared.eventLog?.append("session_end", { reason: event.reason }, { outcome: "failure" }); break;
        case "result":
          process.stdout.write("\n");
          if (fullText) messages.push({ role: "assistant", content: fullText });
          outcome = "done";
          shared.eventLog?.append("session_end", { turns: event.turns }, { outcome: "success" });
          break;
      }
    }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(`\n❌ Loop error: ${msg}`);
    shared.eventLog?.error(msg);
    outcome = "error";
  }

  if (fullText && outcome !== "aborted" && !messages.some(m => m.role === "assistant" && m.content === fullText)) {
    const lastAssistant = [...messages].reverse().find(m => m.role === "assistant");
    if (!lastAssistant || lastAssistant.content !== fullText) {
      if (outcome === "done" || outcome === "error") {
        if (messages.length === 0 || messages[messages.length - 1].role !== "assistant") messages.push({ role: "assistant", content: fullText });
      }
    }
  }

  if (outcome === "done") {
    console.log(`\n✅ 완료 (${fullText.length} chars)`);
    if (bgMgr && fullText.length > 100) {
      console.log(`\n🔍 Background observers 검사 중...`);
      const ctx = `작업 결과: ${fullText.slice(0, 3000)}\n수정 파일: ${messages.slice(-5).map(m => typeof m.content === "string" ? m.content : "").join(" ").slice(0, 1000)}`;
      const results = await bgMgr.runAllObservers(ctx);
      const { accepted, summary } = bgMgr.reconcile(results);
      if (accepted.length > 0) { console.log(summary); console.log(`   💡 위 이슈를 반영하려면 다음 요청에 말씀해주세요.`); }
      else console.log(`   ✅ 이슈 없음`);
    }
  }
  return outcome;
}

program.parse();
