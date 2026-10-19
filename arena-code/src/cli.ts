#!/usr/bin/env node
/**
 * Arena Code CLI v2 — Claude Code + Codex + Muse + Ghidra Fusion
 * 
 * Codex: 3단계 샌드박스, AGENTS.md 계층, 승인 모드
 * Muse: 이벤트 로그, worktree 병렬, 스킬 시스템, 백그라운드 옵저버
 * Ghidra: 29개 바이너리 분석 도구
 */
import { createInterface } from "node:readline";
import { existsSync, readFileSync, mkdirSync } from "node:fs";
import { resolve, join } from "node:path";
import { Command } from "commander";
import { createProvider } from "./providers/index.js";
import { queryLoop } from "./loop/queryLoop.js";
import { ALL_TOOLS, CORE_TOOLS } from "./tools/index.js";
import type { Message } from "./providers/types.js";
import { getDefaultSandbox, sandboxStatus, canWritePath, canExecuteCommand } from "./sandbox/index.js";
import type { SandboxMode } from "./sandbox/index.js";
import { EventLog } from "./eventLog/index.js";
import { WorktreeManager } from "./worktree/index.js";
import { SkillManager } from "./skills/index.js";
import { BackgroundAgentManager } from "./background/index.js";
import { loadAgentsMdHierarchy } from "./config/agentsMd.js";

// ─── Env ───────────────────────────────────────────────────
function loadEnv() {
  for (const p of [resolve(process.cwd(), ".env"), resolve(process.cwd(), "../.env")]) {
    if (existsSync(p)) {
      try {
        const content = readFileSync(p, "utf-8");
        for (const line of content.split("\n")) {
          const t = line.trim();
          if (!t || t.startsWith("#")) continue;
          const eq = t.indexOf("=");
          if (eq === -1) continue;
          const k = t.slice(0, eq).trim(), v = t.slice(eq + 1).trim();
          if (!process.env[k] && v) process.env[k] = v;
        }
      } catch {}
      break;
    }
  }
}
loadEnv();

// ─── CLI ──────────────────────────────────────────────────
const program = new Command();

program
  .name("arena-code")
  .description("Arena Code v2 — Claude Code + Codex + Muse + Ghidra (37 tools, 무료 API)")
  .version("2.0.0")
  .option("-p, --print <prompt>", "Headless: 한 번 질문하고 종료")
  .option("--provider <name>", "LLM: arena|openrouter|gemini|groq|ollama|anthropic")
  .option("--model <model>", "모델 이름 직접 지정")
  .option("--max-turns <n>", "최대 반복 횟수", "20")
  .option("--cwd <path>", "작업 디렉토리", process.cwd())
  .option("--mock", "가짜 모드 (API 키 없이 데모)")
  // Codex 샌드박스
  .option("--sandbox <mode>", "샌드박스: read-only|workspace-write|danger-full-access (Codex 스타일)")
  .option("--yolo", "샌드박스+승인 모두 끄기 (--dangerously-skip-permissions 별칭, 위험!)")
  .option("--dangerously-skip-permissions", "승인 검사 건너뛰기")
  // Muse Code 기능
  .option("--worktree <task>", "git worktree에 격리 실행 (Muse 병렬)")
  .option("--resume", "중단된 세션 재개 (이벤트 로그에서)")
  .option("--skill <name>", "시작 시 스킬 활성화: plan|grill|goal|loop|ghidra")
  .option("--approval-mode <mode>", "승인 모드: on-request|never|untrusted")
  .argument("[prompt]", "프롬프트 (대안)")
  .action(async (promptArg, opts) => {
    let cwd = resolve(opts.cwd);
    const maxTurns: number = parseInt(opts.maxTurns, 10);
    const printPrompt: string | undefined = opts.print ?? promptArg;

    if (opts.mock) process.env.ARENA_MOCK = "true";
    if (opts.provider) process.env.ARENA_PROVIDER = opts.provider;
    if (opts.model) {
      const p = (opts.provider ?? process.env.ARENA_PROVIDER ?? "arena").toLowerCase();
      const map: Record<string, string> = { gemini: "GEMINI_MODEL", openrouter: "OPENROUTER_MODEL", groq: "GROQ_MODEL", ollama: "OLLAMA_MODEL", anthropic: "ANTHROPIC_MODEL", arena: "ARENA_MODEL" };
      if (map[p]) process.env[map[p]] = opts.model;
    }

    // ── Sandbox ──
    let sandboxMode: string | undefined = opts.sandbox || (opts.yolo ? "danger-full-access" : undefined);
    if (opts.yolo) opts.dangerouslySkipPermissions = true;
    const sandbox = getDefaultSandbox(sandboxMode, cwd);

    // ── Event Log ──
    let eventLog: EventLog | null = null;
    try { eventLog = new EventLog(cwd); } catch {}

    // ── Worktree ──
    let worktreeMgr: WorktreeManager | null = null;
    let effectiveCwd = cwd;
    if (opts.worktree) {
      worktreeMgr = new WorktreeManager(cwd);
      if (worktreeMgr.isGitRepo()) {
        console.log(`\n🔀 Worktree 생성 중: ${opts.worktree}`);
        const r = await worktreeMgr.create(opts.worktree);
        if (!r.error) {
          effectiveCwd = r.worktree.path;
          cwd = effectiveCwd;
          console.log(`   → ${r.worktree.path} (branch: ${r.worktree.branch})`);
        } else {
          console.log(`   ⚠️ ${r.error} — 원래 workspace에서 진행`);
        }
      } else {
        console.log(`   ⚠️ Git 저장소가 아님 — worktree 없이 진행`);
      }
    }

    // ── Resume ──
    if (opts.resume && eventLog) {
      const events = EventLog.findLastSession(cwd);
      if (events && events.length > 0) {
        console.log(`\n🔄 이전 세션 복구: ${events.length}개 이벤트, session ${events[0]?.session_id}`);
        console.log(`   마지막 이벤트: ${events[events.length - 1]?.type} at ${events[events.length - 1]?.timestamp}`);
        // 이벤트 로그 요약은 context에 추가됨 (queryLoop에서)
      } else {
        console.log(`\n⚠️ 복구할 세션이 없습니다`);
      }
    }

    // ── Skills ──
    const skillMgr = new SkillManager(cwd);
    let skillExtra = "";
    if (opts.skill) {
      const sk = skillMgr.get(opts.skill);
      if (sk) {
        skillExtra = skillMgr.formatForPrompt(opts.skill) || "";
        console.log(`\n✨ Skill 활성화: /${sk.name} — ${sk.description}`);
      } else {
        console.log(`\n⚠️ 스킬 없음: ${opts.skill}. 사용 가능: ${skillMgr.list().map(s=>s.name).join(", ")}`);
      }
    }

    // ── Provider ──
    let provider;
    try {
      provider = createProvider(opts.provider);
      if (opts.model) provider.model = opts.model;
    } catch (e: unknown) {
      console.error(`\n❌ Provider 오류: ${e instanceof Error ? e.message : String(e)}`);
      console.error(`\n설정 방법 (.env):\n  cp .env.example .env\n  GEMINI_API_KEY=... (https://aistudio.google.com/app/apikey)\n  OPENROUTER_API_KEY=... (https://openrouter.ai/keys)\n  GROQ_API_KEY=... (https://console.groq.com/keys)\n  또는 --mock으로 데모\n`);
      process.exit(1);
    }

    // ── Banner ──
    console.log(`\n🤖 Arena Code v2.0 — Claude Code + Codex + Muse + Ghidra`);
    console.log(`   Provider: ${provider.name} (${provider.model})`);
    console.log(`   CWD: ${effectiveCwd}${effectiveCwd !== opts.cwd ? ` (원래: ${opts.cwd})` : ""}`);
    console.log(`   Tools: ${ALL_TOOLS.length}개 (코딩 ${CORE_TOOLS.length} + Ghidra ${ALL_TOOLS.length - CORE_TOOLS.length})`);
    console.log(`   ${sandboxStatus(sandbox)}`);
    if (eventLog) console.log(`   📝 Event Log: ${eventLog.logPath} (session: ${eventLog.session_id})`);
    if (skillMgr.list().length > 0) console.log(`   ✨ Skills: ${skillMgr.list().map(s=>`/${s.name}`).join(", ")}`);
    // AGENTS.md 계층
    const agentsMdEntries = loadAgentsMdHierarchy(cwd);
    if (agentsMdEntries.length > 0) console.log(`   📄 AGENTS.md: ${agentsMdEntries.map(e=>e.path).join(", ")}`);
    if (opts.dangerouslySkipPermissions || opts.yolo) console.log(`   ⚠️  Permissions: SKIPPED (--yolo)`);
    if (printPrompt) console.log(`   Mode: headless`);
    else console.log(`   Mode: interactive`);
    console.log("");

    const sharedOpts = {
      dangerouslySkipPermissions: !!opts.dangerouslySkipPermissions,
      sandbox,
      eventLog: eventLog || undefined,
      skillExtra,
      worktreeMgr: worktreeMgr || undefined,
    };

    if (printPrompt) {
      await runPrompt(printPrompt as string, provider, cwd, maxTurns, sharedOpts);
      eventLog?.sessionEnd("headless done");
      return;
    }
    await runInteractive(provider, cwd, maxTurns, sharedOpts, skillMgr);
    eventLog?.sessionEnd("interactive ended");
  });

// ─── Helpers ───────────────────────────────────────────────
import type { SandboxConfig } from "./sandbox/index.js";

interface SharedOpts {
  dangerouslySkipPermissions?: boolean;
  sandbox?: SandboxConfig;
  eventLog?: EventLog;
  skillExtra?: string;
  worktreeMgr?: WorktreeManager;
}

async function runPrompt(
  prompt: string, provider: ReturnType<typeof createProvider>, cwd: string, maxTurns: number, shared: SharedOpts
) {
  const messages: Message[] = [{ role: "user", content: prompt }];
  console.log(`\n▶ Prompt: ${prompt}\n` + "─".repeat(60));
  await runLoop(messages, provider, cwd, maxTurns, shared);
}

async function runInteractive(
  provider: ReturnType<typeof createProvider>, cwd: string, maxTurns: number, shared: SharedOpts, skillMgr: SkillManager
) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const messages: Message[] = [];
  const bgMgr = new BackgroundAgentManager(shared.eventLog || undefined);

  console.log("💬 Interactive — 'exit'로 종료, '/help'로 도움말\n");

  const ask = (q: string) => new Promise<string>(res => rl.question(q, res));
  let abortController = new AbortController();
  process.on("SIGINT", () => { console.log("\n\n⚡ Interrupted. Aborting..."); abortController.abort(); abortController = new AbortController(); });

  // 스킬 / 명령어 처리 헬퍼
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
        // 마지막 계획이나 코드를 grill
        const lastAssistant = [...messages].reverse().find(m => m.role === "assistant");
        const content = lastAssistant ? (typeof lastAssistant.content === "string" ? lastAssistant.content : "") : "검사할 계획이 없습니다";
        messages.push({ role: "user", content: `${skill.content}\n\n검사 대상:\n${content}` });
        const txt = `Skill /grill로 검토 중...`;
        console.log(`\n${txt}\n` + "─".repeat(60));
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
      // 일반 스킬: 시스템 프롬프트에 주입하여 다음 루프에서 반영
      const extra = skillMgr.formatForPrompt(parsed.skill) || "";
      messages.push({ role: "user", content: parsed.args || `스킬 /${parsed.skill} 활성화` });
      abortController = new AbortController();
      console.log(`\n` + "─".repeat(60));
      await runLoop(messages, provider, cwd, maxTurns, { ...shared, skillExtra: extra }, abortController.signal, bgMgr);
      console.log("─".repeat(60));
      return true;
    }

    // 빌트인 명령어
    if (input === "/help") {
      console.log(`
명령어:
  /help           도움말
  /clear          대화 초기화
  /status         상태 (provider, sandbox, event log, worktrees)
  /plan [요청]    계획을 세우고 승인 후 실행 (Muse Skill)
  /grill          마지막 계획을 스트레스 테스트
  /goal <목표>    목표 달성까지 계속 (Muse Skill)
  /loop <간격> <작업> 반복 실행 (예: /loop 5m "테스트 실행")
  /ghidra <요청>  Ghidra 바이너리 분석 모드
  /worktree <task> 새 worktree 생성
  /worktree:list  worktree 목록
  /worktree:prune 모든 arena worktree 정리
  /sandbox <mode> 샌드박스 전환 (read-only/workspace-write/danger-full-access)
  /resume         이벤트 로그 복구
  /exit, exit, quit 종료

팁:
  - "이 프로젝트 구조 설명해줘" / "버그 찾아줘" / "새 기능 만들어줘"
  - Ghidra: "/tmp/binary를 분석하고 main 디컴파일해줘"
  - worktree: 병렬 작업 시 각 작업이 독립 브랜치에서 진행
`);
      return true;
    }
    if (input === "/clear") { messages.length = 0; console.log("🧹 초기화됨."); return true; }
    if (input === "/status") {
      const wt = shared.worktreeMgr ? await shared.worktreeMgr.list() : null;
      console.log(`\nProvider: ${provider.name} (${provider.model})\nCWD: ${cwd}\nMessages: ${messages.length}\nMax turns: ${maxTurns}\nSandbox: ${shared.sandbox?.mode}\nEvent Log: ${shared.eventLog?.logPath}\nWorktrees: ${wt ? wt.worktrees.length + "개" : "없음 (git repo 아님)"}\nSkills: ${skillMgr.list().map(s=>"/"+s.name).join(", ")}`);
      return true;
    }
    if (input.startsWith("/worktree")) {
      const rest = input.slice("/worktree".length).trim();
      const mgr = shared.worktreeMgr || new WorktreeManager(cwd);
      if (!mgr.isGitRepo()) { console.log("⚠️ Git 저장소 아님"); return true; }
      if (!rest || rest === ":list") {
        const r = await mgr.list();
        console.log(`\nWorktrees:\n${r.detail}`);
        return true;
      }
      if (rest === ":prune") {
        const r = await mgr.pruneAll();
        console.log(`\n${r.message}`);
        return true;
      }
      // /worktree <task> — 생성
      const taskName = rest.replace(/^:/, "");
      const r = await mgr.create(taskName);
      if (r.error) console.log(`\n⚠️ ${r.error}`);
      else console.log(`\n✅ Worktree 생성: ${r.worktree.path} (branch: ${r.worktree.branch})`);
      return true;
    }
    if (input.startsWith("/sandbox")) {
      const mode = input.slice("/sandbox".length).trim() as SandboxMode;
      if (["read-only","workspace-write","danger-full-access"].includes(mode)) {
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
      else console.log(`\n📝 최근 세션: ${events.length}개 이벤트\n${events.slice(-5).map(e=>`  ${e.timestamp} [${e.type}]`).join("\n")}`);
      return true;
    }
    return false;
  };

  while (true) {
    const input = await ask("\n\x1b[1m❯ \x1b[0m");
    const trimmed = input.trim();
    if (!trimmed) continue;
    if (["exit","quit","/exit"].includes(trimmed.toLowerCase())) { console.log("\n👋 종료합니다."); break; }

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
  messages: Message[], provider: ReturnType<typeof createProvider>, cwd: string, maxTurns: number, shared: SharedOpts, signal?: AbortSignal, bgMgr?: BackgroundAgentManager
): Promise<"done" | "aborted" | "error"> {
  let fullText = "";
  let outcome: "done" | "aborted" | "error" = "done";

  const onAskPermission = shared.dangerouslySkipPermissions
    ? async () => true
    : async (block: { type: string; name?: string; input?: Record<string, unknown> }) => {
        // 샌드박스 체크 먼저 (Codex 스타일)
        if (shared.sandbox && (block.name === "Write" || block.name === "Edit")) {
          const fp = (block.input as Record<string,string>)?.file_path || "";
          if (fp) {
            const c = canWritePath(fp, shared.sandbox);
            if (!c.allowed) { console.log(`\n${c.reason}`); return false; }
          }
        }
        if (shared.sandbox && block.name === "Bash") {
          const cmd = (block.input as Record<string,string>)?.command || "";
          if (cmd) {
            const c = canExecuteCommand(cmd, shared.sandbox);
            if (!c.allowed) { console.log(`\n${c.reason}`); return false; }
          }
        }
        // Ghidra 도구는 읽기 전용이므로 샌드박스 영향 적음

        if (process.stdin.isTTY) {
          const rl = createInterface({ input: process.stdin, output: process.stdout });
          const input2 = block.input ?? {};
          const cmd = block.name === "Bash" ? (input2.command as string) : `${block.name}(${JSON.stringify(input2).slice(0, 200)})`;
          const ans = await new Promise<string>(res => rl.question(`\n❓ 권한 요청 (${shared.sandbox?.mode}): ${block.name} — ${cmd}\n   허용? [Y/n] `, a => { rl.close(); res(a); }));
          const t = ans.trim().toLowerCase();
          return t === "" || t === "y" || t === "yes";
        }
        console.log(`\n⚠️  Auto-allowing (headless): ${block.name}(${JSON.stringify(block.input ?? {}).slice(0, 200)})`);
        return true;
      };

  shared.eventLog?.modelCall({ messages: messages.length, provider: provider.name });

  try {
    for await (const event of queryLoop({
      provider,
      tools: ALL_TOOLS,
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
        const alreadyPushed = messages.length > 0 && messages[messages.length - 1].role === "assistant";
        if (!alreadyPushed) messages.push({ role: "assistant", content: fullText });
      }
    }
  }

  if (outcome === "done") {
    console.log(`\n✅ 완료 (${fullText.length} chars)`);

    // ── Muse Code 스타일: 백그라운드 옵저버 실행 ──
    if (bgMgr && fullText.length > 100) {
      console.log(`\n🔍 Background observers 검사 중...`);
      const ctx = `작업 결과: ${fullText.slice(0, 3000)}\n수정 파일: ${messages.slice(-5).map(m=>typeof m.content === "string" ? m.content : "").join(" ").slice(0, 1000)}`;
      const results = await bgMgr.runAllObservers(ctx);
      const { accepted, summary } = bgMgr.reconcile(results);
      if (accepted.length > 0) {
        console.log(summary);
        console.log(`   💡 위 이슈를 반영하려면 다음 요청에 말씀해주세요.`);
      } else {
        console.log(`   ✅ 이슈 없음`);
      }
    }
  }

  return outcome;
}

program.parse();
