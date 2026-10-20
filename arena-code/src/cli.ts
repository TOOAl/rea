#!/usr/bin/env node
/**
 * Arena Code CLI v2.3 — Claude Code + Codex + Muse + Ghidra Fusion
 *
 * Phase 2: Hook 시스템 + MCP 서버 (--mcp)
 * Phase 4: 외부 패키지 (@arena-code/ghidra-tools/@arena-code/rea-bridge) + 업데이트
 * Phase 5: 외부 에이전트 허브 (--agent, /agent)
 */
import { createInterface } from "node:readline";
import { resolve } from "node:path";
import { Command } from "commander";
import { queryLoop } from "./loop/queryLoop.js";
import { buildRegistry, buildRegistryAsync } from "./tools/index.js";
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
import { autoCheckUpdates, manualCheckUpdates } from "./updates/index.js";
import { applyUpdate } from "./updates/apply.js";
import { AgentManager } from "./agents/manager.js";
import { createAskAgentTool } from "./agents/tool.js";
import { parseAgentSpec } from "./cli.parseAgent.js";

// ─── CLI 정의 ──────────────────────────────────────────────
const program = new Command();

program
  .name("arena-code")
  .description("Arena Code v2.6 — Claude Code + Codex + Muse + Ghidra + Harness² Self-Improving Brain")
  .version("2.6.0")
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
  .option("--mcp", "MCP 서버 모드로 실행 (stdio JSON-RPC)")
  .option("--update <action>", "업데이트: check|apply [대상: ghidra|rea|all]")
  .option("--update-target <target>", "업데이트 대상 지정", "all")
  .option("--agent <spec>", "외부 에이전트 추가: id=transport:target (예: my-gpt=openai:https://api.example.com/v1)")
  .option("--agent-config <path>", "외부 에이전트 config JSON 경로")
  .option("--list-agents", "등록된 외부 에이전트 목록 출력 후 종료")
  .option("--yes", "업데이트 시 자동 승인 (질문 없이 진행)")
  .option("--dry-run", "업데이트 dry-run (적용 없이 계획만 표시)")
  .option("--harness2", "Harness2 실행 (task-level recursion)")
  .option("--harness2-k <n>", "Harness2 K 예산 (기본 1)")
  .option("--harness2-mode <mode>", "Harness2 모드: parallel|sequential")
  .option("--harness2-domain <domain>", "Harness2 도메인 (library 키)")
  .option("--harness2-evidence-root <path>", "Harness2 증거 트리 루트")
  .option("--harness2-dry-run", "Harness2 dryRun (LLM 없이)")
  .option("--k <n>", "(alias) --harness2-k")
  .option("--mode <mode>", "(alias) --harness2-mode")
  .option("--evidence-root <path>", "(alias) --harness2-evidence-root")
  .option("--harness2-depth <n>", "Harness2 recurrent depth 1~5 (GPT-6 Astra, 기본 1)")
  .option("--harness2-no-guard", "Harness2 guard 비활성")
  .option("--fleet", "Fleet orchestration (Orca ADE, Worktree+GH)")
  .option("--harness2-fleet", "Harness²×Fleet hybrid — harness probes via Fleet dispatches")
  .option("--fleet-use-worktrees", "Fleet hybrid: use git worktrees per probe (default: false)")
  .option("--harness2-fleet-worktrees", "(alias) --fleet-use-worktrees")
  .option("--fleet-run <id>", "Fleet Run ID (for --fleet fan-out)")
  .option("--fleet-task <id>", "Fleet Task ID (for --fleet fan-out)")
  .option("--fanout <n>", "Fleet fan-out count (1..16, default 3)")
  .option("--fleet-worker-done", "Fleet worker_done report (requires --task-id/--dispatch-id/--outcome)")
  .option("--task-id <id>", "Fleet task id (for worker-done)")
  .option("--dispatch-id <id>", "Fleet dispatch id (for worker-done)")
  .option("--outcome <o>", "Fleet worker outcome: succeeded|failed")
  .option("--files-modified <list>", "Fleet worker files-modified (comma separated)")
  .option("--summary <text>", "Fleet worker summary")
  .allowUnknownOption(true)
  .allowExcessArguments(true)
  .argument("[prompt]", "프롬프트 (대안)")
  .action(async (promptArg, opts) => {
    // MCP 모드는 초기에 분기 — config/session 없이 registry만으로 동작
    if (opts.mcp) {
      const cwdForConfig = resolve(opts.cwd ?? process.cwd());
      const config = resolveConfig(cwdForConfig, opts);
      const registry = await buildRegistryAsync(config.disabledTools);
      for (const p of config.pluginPaths) await registry.loadPlugin(p);
      const { runMcpServer } = await import("./mcp/server.js");
      await runMcpServer({ registry, cwd: cwdForConfig });
      return;
    }

    // ── Fleet subcommand: arena-code fleet <sub> ... (orca orchestration 포팅)
    // Commander treats "fleet" as [prompt] — detect here and delegate to FleetCli
    if ((promptArg as string) === "fleet") {
      const fleetIdx = process.argv.findIndex((a: string) => a === "fleet");
      const fleetArgs = process.argv.slice(fleetIdx + 1);
      const sub = fleetArgs[0] ?? "status";
      // parse fleet flags from fleetArgs into opts-like object
      const fleetOpts: Record<string, unknown> = {};
      const fleetPositional: string[] = [];
      for (let i = 1; i < fleetArgs.length; i++) {
        const a = fleetArgs[i];
        if (a.startsWith("--")) {
          const key = a.slice(2).replace(/-([a-z])/g, (_: string, c: string) => c.toUpperCase());
          const next = fleetArgs[i + 1];
          if (next !== undefined && !next.startsWith("--")) { fleetOpts[key] = next; i++; }
          else fleetOpts[key] = true;
        } else if (a.startsWith("-") && a.length === 2) {
          // ignore short
        } else {
          fleetPositional.push(a);
        }
      }
      // also merge --cwd if present in main opts
      if (opts.cwd) fleetOpts.cwd = opts.cwd;
      if (fleetOpts.json === undefined && (opts as any).json) fleetOpts.json = true;
      const { handleFleetCommand } = await import("./fleet/cli.js");
      await handleFleetCommand(sub, fleetPositional, fleetOpts as any);
      return;
    }

    // --fleet-worker-done top-level shortcut (worker obligation 4)
    if (opts.fleetWorkerDone) {
      const cwdForFleet = resolve(opts.cwd ?? process.cwd());
      const taskId = (opts.taskId as string) ?? (opts as any).fleetTask ?? undefined;
      const dispatchId = (opts.dispatchId as string) ?? undefined;
      const outcome = (opts.outcome as string) as "succeeded" | "failed";
      if (!taskId || !dispatchId || !outcome) {
        console.error("Usage: arena-code --fleet-worker-done --task-id <id> --dispatch-id <id> --outcome succeeded|failed [--files-modified a,b] [--summary ...]");
        process.exit(1);
      }
      const filesModified = typeof opts.filesModified === "string" ? (opts.filesModified as string).split(",").map((s: string) => s.trim()).filter(Boolean) : [];
      const { WorkerAgent } = await import("./fleet/worker.js");
      const { FleetStore } = await import("./fleet/store.js");
      const store = new FleetStore(cwdForFleet);
      const worker = new WorkerAgent(cwdForFleet, store);
      const r = worker.workerDone({ taskId, dispatchId, outcome, filesModified, summary: opts.summary as string | undefined, cwd: cwdForFleet });
      if (!r.ok) { console.error("worker-done failed: " + r.error); process.exit(1); }
      console.log(JSON.stringify({ ok: true, messageId: r.messageId, taskId, dispatchId, outcome }, null, 2));
      return;
    }

    // --update check/apply 는 헤드리스 유틸리티 명령
    if (opts.update) {
      const cwdForConfig = resolve(opts.cwd ?? process.cwd());
      const config = resolveConfig(cwdForConfig, opts);
      await handleUpdateCommand(opts.update, {
        cwd: cwdForConfig, config, target: opts.updateTarget, yes: !!opts.yes, dryRun: !!opts.dryRun,
      });
      return;
    }

    // --list-agents
    if (opts.listAgents) {
      const cwdForConfig = resolve(opts.cwd ?? process.cwd());
      const config = resolveConfig(cwdForConfig, opts);
      const mgr = new AgentManager(cwdForConfig);
      if (config.agents.length) mgr.loadFromConfig(config.agents);
      // --agent-config 추가 로드
      if (opts.agentConfig) {
        try {
          const { readFileSync } = await import("node:fs");
          const extra = JSON.parse(readFileSync(resolve(opts.agentConfig), "utf-8"));
          const list = Array.isArray(extra) ? extra : (extra.agents ?? [extra]);
          mgr.loadFromConfig(list);
        } catch (e: unknown) { console.error(`--agent-config 로드 실패: ${e instanceof Error ? e.message : String(e)}`); }
      }
      if (opts.agent) {
        const spec = parseAgentSpec(opts.agent);
        if (spec) { try { mgr.add(spec); } catch (e: unknown) { console.error(`--agent 파싱 실패: ${e instanceof Error ? e.message : String(e)}`); } }
      }
      const agents = mgr.list();
      if (!agents.length) console.log("등록된 외부 에이전트 없음. arena.config.json → agents[] 또는 --agent 로 추가하세요.");
      else {
        console.log(`\n외부 에이전트 ${agents.length}개:\n`);
        for (const a of agents) {
          console.log(`  - ${a.id} [${a.transport}] ${a.description ?? ""}`);
          if (a.baseUrl) console.log(`    baseUrl: ${a.baseUrl}`);
          if (a.command) console.log(`    command: ${a.command} ${(a.args ?? []).join(" ")}`);
          if (a.module) console.log(`    module: ${a.module}`);
          if (a.url) console.log(`    url: ${a.url}`);
        }
      }
      return;
    }

    // 일반 세션 플로우
    const cwdForConfig = resolve(opts.cwd ?? process.cwd());
    const config = resolveConfig(cwdForConfig, opts);
    if (opts.disableTools) {
      const extra = (opts.disableTools as string).split(",").map((s: string) => s.trim()).filter(Boolean);
      config.disabledTools = [...config.disabledTools, ...extra];
    }
    if (opts.mock) config.mock = true;
    if (opts.resume) (config as unknown as Record<string, unknown>).resume = true;
    if (promptArg && !opts.print) config.printPrompt = promptArg;
    else if (opts.print) config.printPrompt = opts.print;
    if (opts.model) config.model = opts.model;

    // CLI --agent / --agent-config 를 config.agents에 병합
    if (opts.agent) {
      const spec = parseAgentSpec(opts.agent);
      if (spec) config.agents.push(spec);
    }
    if (opts.agentConfig) {
      try {
        const { readFileSync } = await import("node:fs");
        const extra = JSON.parse(readFileSync(resolve(opts.agentConfig as string), "utf-8"));
        const list = Array.isArray(extra) ? extra : (extra.agents ?? [extra]);
        for (const a of list) config.agents.push(a);
      } catch (e: unknown) { console.error(`--agent-config 로드 실패: ${e instanceof Error ? e.message : String(e)}`); }
    }

    // AgentManager — 외부 에이전트
    const agentManager = new AgentManager(cwdForConfig);
    let agentLoadErrors: string[] = [];
    if (config.agents.length) {
      const r = agentManager.loadFromConfig(config.agents);
      agentLoadErrors = r.errors;
    }
    // provider가 외부 에이전트 id와 일치하면 AgentManager에서 provider 생성 시도
    let providerOverride: import("./providers/types.js").Provider | null = null;
    if (agentManager.get(config.provider)) {
      try {
        providerOverride = await agentManager.createProvider(config.provider);
        console.log(`\n🔗 외부 에이전트 provider: ${config.provider} (${agentManager.get(config.provider)?.transport})`);
      } catch (e: unknown) {
        console.error(`\n⚠️ 외부 에이전트 provider 실패 (${config.provider}): ${e instanceof Error ? e.message : String(e)} — 기본 provider로 fallback`);
      }
    }

    const session = await bootstrapSession(config, providerOverride);
    const cwd = session.effectiveCwd;

    // Fleet fan-out mode (arena-code --fleet --print "prompt" --fanout 3) — standalone, not when harness2 also enabled
    if (opts.fleet && !opts.harness2) {
      const cwdForFleet = resolve(opts.cwd ?? process.cwd());
      const prompt = (promptArg as string) || (opts.print as string) || "";
      const fanout = Math.max(1, Math.min(16, parseInt(String(opts.fanout ?? "3"), 10) || 3));
      const runIdOpt = (opts.fleetRun as string) ?? undefined;
      const taskIdOpt = (opts.fleetTask as string) ?? undefined;
      try {
        const { FleetCoordinator } = await import("./fleet/coordinator.js");
        const coordinator = new FleetCoordinator({ workspaceRoot: cwdForFleet });
        let taskId = taskIdOpt;
        let runId = runIdOpt;
        if (!taskId) {
          if (!runId) {
            const run = coordinator.runCreate(prompt || "Fleet run: " + new Date().toISOString(), {});
            runId = run.id;
            console.log("Fleet run created: " + run.id + " objective=" + run.objective.slice(0,80));
          }
          const spec = prompt || "Fleet task: implement requested change";
          const task = coordinator.taskCreate(runId!, spec);
          taskId = task.id;
          console.log("Fleet task created: " + task.id + " spec=" + spec.slice(0,80));
        }
        console.log("Fleet fan-out: task=" + taskId + " count=" + fanout + " dryRun=" + (!!opts.dryRun));
        const { dispatches, errors, worktrees } = await coordinator.fanOut({ taskId: taskId!, count: fanout, dryRun: !!opts.dryRun });
        console.log("Fleet dispatches: " + dispatches.map(d => d.id).join(", "));
        if (worktrees.length) console.log("Worktrees: " + worktrees.join(", "));
        if (errors.length) console.error("Fleet errors: " + errors.join(" | "));
        // if not dryRun and provider available, optionally run workers (best-effort, sequential for now)
        if (!opts.dryRun && dispatches.length && prompt) {
          console.log("Fleet workers would run here (use --dry-run to skip LLM calls, or run workers via fleet worker-start per worktree)");
        }
        console.log(JSON.stringify({ runId, taskId, dispatches: dispatches.map(d => ({ id: d.id, worktree: d.worktreePath })), worktrees, errors }, null, 2));
      } catch (e: unknown) {
        console.error("Fleet failed: " + (e instanceof Error ? e.message : String(e)));
        if (e instanceof Error && e.stack) console.error(e.stack.slice(0,2000));
        process.exit(1);
      }
      return;
    }

    // Harness2 mode (arena-code --harness2 ...) + Fleet hybrid (Harness²×Fleet)
    const h2Enabled = !!opts.harness2;
    if (h2Enabled) {
      const rawK = opts.harness2K ?? opts.k ?? "1";
      const rawMode = opts.harness2Mode ?? opts.mode ?? "parallel";
      const h2k = Math.max(1, Math.min(5, parseInt(String(rawK), 10) || 1));
      const h2mode = (String(rawMode).toLowerCase() === "sequential" ? "sequential" : "parallel") as "parallel" | "sequential";
      const h2dry = !!(opts.harness2DryRun || opts.dryRun);
      const h2domain = (opts.harness2Domain as string) || undefined;
      const h2evidenceRoot = (opts.harness2EvidenceRoot ?? opts.evidenceRoot) as string | undefined;
      const taskPrompt = (promptArg as string) || (opts.print as string) || config.printPrompt || "Improve harness via Harness2 recursion";
      const taskId = (taskPrompt.slice(0, 24).replace(/[^a-z0-9]+/gi, "-").toLowerCase() || "task") + "-h2";
      try {
        const { ARENA_SURFACE, readTree: readH2Tree } = await import("./harness2/harness.js");
        const { Harness2Engine } = await import("./harness2/engine.js");
        let baseHarness: Record<string, string> = {};
        try { baseHarness = readH2Tree(ARENA_SURFACE, cwd); } catch {}
        const rawDepth = (opts.harness2Depth as string) ?? "1";
        const h2depth = Math.max(1, Math.min(5, parseInt(String(rawDepth), 10) || 1));
        const h2guard = !(opts.harness2NoGuard === true);
        const h2fleet = !!(opts.fleet || opts.harness2Fleet);
        const h2fleetWorktrees = !!(opts.fleetUseWorktrees || opts.harness2FleetWorktrees);
        console.log("\nHarness2 run: k=" + h2k + " mode=" + h2mode + " depth=" + h2depth + " guard=" + h2guard + " dryRun=" + h2dry + " domain=" + (h2domain ?? "(none)") + " fleet=" + h2fleet + (h2fleet ? (h2fleetWorktrees ? "(worktrees)" : "(current-dir)") : ""));
        console.log("   taskId=" + taskId + " evidenceRoot=" + (h2evidenceRoot ?? ".arena/harness2/evidence"))
        // Fleet hybrid setup — create fleet opts for engine/depth
        const fleetProbeOpts = h2fleet ? {
          enabled: true,
          useWorktrees: h2fleetWorktrees,
          workspaceRoot: cwd,
        } as unknown as import("./harness2/fleetProbe.js").FleetProbeOptions : undefined;
        let result: any;
        if (h2depth > 1) {
          const { RecurrentDepthRunner } = await import("./harness2/depth.js");
          const runner = new RecurrentDepthRunner(session.provider);
          result = await runner.run({
            taskId, taskPrompt, baseHarness,
            provider: session.provider, cwd,
            k: h2k, mode: h2mode, depth: h2depth, guard: h2guard,
            taskDomain: h2domain,
            evidenceRoot: h2evidenceRoot ? resolve(h2evidenceRoot) : undefined,
            dryRun: h2dry,
            fleet: fleetProbeOpts,
          });
          console.log("\nHarness2 Depth done - ok=" + result.ok + " depth=" + result.executedDepth + "/" + result.depth + " bestDepth=" + result.bestDepth + " guardIssues=" + result.guardReports.filter((g: any) => !g.ok).length);
          for (const note of result.depthNotes) console.log("   * " + note);
        } else {
          const engine = new Harness2Engine(session.provider);
          result = await engine.run({
            taskId, taskPrompt, baseHarness,
            provider: session.provider, cwd,
            k: h2k, mode: h2mode,
            taskDomain: h2domain,
            evidenceRoot: h2evidenceRoot ? resolve(h2evidenceRoot) : undefined,
            dryRun: h2dry,
            fleet: fleetProbeOpts,
          });
          console.log("\nHarness2 done - ok=" + result.ok + " stages=" + result.stages.length + " finals=" + result.finals.join(",") + " errors=" + result.errors.length);
        }
        if ((result as unknown as { fleetRunId?: string }).fleetRunId) console.log("   fleetRunId: " + (result as unknown as { fleetRunId?: string }).fleetRunId + " fleetTasks=" + (((result as unknown as { fleetTasks?: string[] }).fleetTasks ?? []).length || ((result as unknown as { fleetTaskIds?: string[] }).fleetTaskIds ?? []).length) + " (Fleet hybrid)");
        if ((result as unknown as { fleetTaskIds?: string[] }).fleetTaskIds) console.log("   fleetTaskIds: " + (result as unknown as { fleetTaskIds?: string[] }).fleetTaskIds?.join(", ").slice(0,200));
        if (result.selection) console.log("   selection: " + result.selection.chosenLabel + " - " + result.selection.reason.slice(0,120));
        if (result.guardReports) {
          for (const g of result.guardReports) if (!g.ok) console.log("   guard d" + g.depth + " issues: " + g.issues.join(" | ").slice(0,200));
        }
        for (const s of result.stages) {
          console.log("   - " + s.label + " [" + s.dim + "] keptBase=" + s.keptBase + " fellBack=" + s.fellBack + " notes=" + s.notes.slice(0,80));
        }
        if (result.errors.length) console.log("   errors: " + result.errors.slice(0,3).join(" | ").slice(0,500));
        console.log("   finalHarness keys: " + (Object.keys(result.finalHarness).join(", ").slice(0,200) || "(empty)"))
        if (result.bestHarness) console.log("   bestHarness keys: " + (Object.keys(result.bestHarness).join(", ").slice(0,200) || "(empty)"));
      } catch (e) {
        console.error("\nHarness2 failed: " + (e instanceof Error ? e.message : String(e)));
        if (e instanceof Error && e.stack) console.error(e.stack.slice(0,2000));
        process.exit(1);
      }
      session.hooks.emit("sessionEnd", { cwd, event: "sessionEnd" });
      session.eventLog?.sessionEnd("harness2 done");
      return;
    }

    // Tool Registry — 외부 패키지 + 외부 에이전트 MCP/tools 포함 (async)
    const registry = await buildRegistryAsync(config.disabledTools);
    for (const p of config.pluginPaths) {
      const r = await registry.loadPlugin(p);
      if (r.error) console.log(`   ⚠️ 플러그인 로드 실패 (${p}): ${r.error}`);
      else if (r.loaded > 0) console.log(`   🔌 플러그인 ${p}: ${r.loaded}개 도구 로드`);
    }
    // 외부 에이전트: MCP/tools 수집 → registry에 주입
    if (agentManager.list().length) {
      const { tools: agentTools } = await agentManager.collectTools();
      for (const t of agentTools) {
        try { registry.register(t, { category: "plugin", source: `agent:${t.name.split("__")[0]}` }); } catch {}
      }
      if (agentTools.length) console.log(`   🤖 외부 에이전트 tools: ${agentTools.length}개`);
    }
    // AskAgent 도구 — 에이전트가 하나라도 있으면 항상 제공 (위임용)
    if (agentManager.list().length) {
      try { registry.register(createAskAgentTool(agentManager), { category: "plugin", source: "builtin:AskAgent" }); } catch {}
    }
    const tools = registry.all();

    printBanner(session, config.printPrompt);
    if (config.disabledTools.length) console.log(`   🚫 비활성 도구: ${config.disabledTools.join(", ")}`);
    if (config.pluginPaths.length) console.log(`   🔌 플러그인: ${config.pluginPaths.join(", ")}`);
    if (registry.size() !== tools.length) console.log(`   Tools: ${tools.length}개 활성 / ${registry.size()}개 등록`);
    if (session.hooks.size > 0) console.log(`   🪝 Hooks: ${session.hooks.size}개 활성`);
    if (agentLoadErrors.length) console.log(`   ⚠️ 에이전트 로드 오류: ${agentLoadErrors.join("; ")}`);
    if (agentManager.list().length) console.log(`   🤖 외부 에이전트: ${agentManager.list().map(a => `${a.id}(${a.transport})`).join(", ")}`);

    // 업데이트 자동 체크 (비동기, 결과는 배너 아래 표시 — sessionStart 이후)
    if (config.updates.enabled && config.updates.autoCheck && !config.mock) {
      autoCheckUpdates(cwd, config).catch(() => {});
    }

    const shared: SharedOpts = {
      dangerouslySkipPermissions: config.dangerouslySkipPermissions,
      sandbox: session.sandbox,
      eventLog: session.eventLog ?? undefined,
      skillExtra: session.skillExtra,
      worktreeMgr: session.worktreeMgr ?? undefined,
      tools,
      hooks: session.hooks,
      cwd,
      config,
      agentManager,
    };

    if (config.printPrompt) {
      await runPrompt(config.printPrompt, session.provider, cwd, config.maxTurns, shared);
      session.hooks.emit("sessionEnd", { cwd, event: "sessionEnd" });
      session.eventLog?.sessionEnd("headless done");
      return;
    }
    await runInteractive(session.provider, cwd, config.maxTurns, shared, session.skillMgr);
    session.hooks.emit("sessionEnd", { cwd, event: "sessionEnd" });
    session.eventLog?.sessionEnd("interactive ended");
  });

// ─── Update CLI handler ──────────────────────────────────
async function handleUpdateCommand(
  action: string,
  opts: { cwd: string; config: import("./config/schema.js").ArenaConfig; target: string; yes: boolean; dryRun: boolean },
): Promise<void> {
  const { cwd, config, yes, dryRun } = opts;
  // 정규화: --update check 또는 --update=check 둘 다 지원
  const act = (action || "check").toLowerCase();
  const target = (opts.target || "all").toLowerCase();

  if (act === "check") {
    console.log(`\n🔍 업데이트 확인 중... (repos: ${config.updates.repos.map(r => r.repo).join(", ")})\n`);
    const infos = await manualCheckUpdates(cwd, config);
    // 인터랙티브라면 결과 후 종료
    if (infos.some(i => i.updateAvailable)) {
      console.log(`\n적용 방법:  arena-code --update apply${target !== "all" ? ` --update-target ${target}` : ""}${yes ? " --yes" : ""}`);
    }
    return;
  }

  if (act === "apply") {
    console.log(`\n📦 업데이트 적용${target !== "all" ? ` (대상: ${target})` : ""}...\n`);
    const infos = await manualCheckUpdates(cwd, config);
    const toApply = target === "all"
      ? infos.filter(i => i.updateAvailable)
      : infos.filter(i => i.name === target && i.updateAvailable);

    if (toApply.length === 0) {
      console.log(target === "all" ? "적용할 업데이트가 없습니다." : `'${target}' 업데이트 없음. --update check로 확인하세요.`);
      return;
    }

    for (const info of toApply) {
      console.log(`\n— ${info.name}: ${info.localVersion} → ${info.remoteTag} —`);
      const askFn = yes ? undefined : async (msg: string) => {
        const rl = createInterface({ input: process.stdin, output: process.stdout });
        const ans = await new Promise<string>(res => rl.question(`${msg} `, res));
        rl.close();
        const t = ans.trim().toLowerCase();
        return t === "" || t === "y" || t === "yes";
      };
      const r = await applyUpdate({
        cwd, name: info.name, repo: info.repo, targetTag: info.remoteTag,
        dryRun, requireApproval: !yes || !!askFn, askFn,
      });
      console.log(r.ok ? `✅ ${r.message}` : `❌ ${r.message}`);
      if (r.command) console.log(`   실행: ${r.command}`);
    }
    return;
  }

  console.error(`알 수 없는 업데이트 액션: ${action} (check|apply 중 하나)`);
  process.exit(1);
}

// ─── Helpers ─────────────────────────────────────────────
import type { Tool } from "./tools/types.js";
import type { SandboxConfig } from "./sandbox/index.js";
import type { HookManager } from "./hooks/index.js";
import type { ArenaConfig } from "./config/schema.js";

interface SharedOpts {
  dangerouslySkipPermissions?: boolean;
  sandbox?: SandboxConfig;
  eventLog?: EventLog;
  skillExtra?: string;
  worktreeMgr?: WorktreeManager;
  tools: Tool[];
  hooks?: HookManager;
  cwd: string;
  config: ArenaConfig;
  agentManager: AgentManager;
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
  /update [check|apply] 업데이트 확인/적용 (GitHub releases 추적)
  /update:check   업데이트 확인
  /hooks          활성 hooks 목록
  /agent list     외부 에이전트 목록
  /agent add <json> 외부 에이전트 추가 (예: /agent add {"id":"my-gpt","transport":"openai","baseUrl":"https://..."})
  /agent remove <id> 에이전트 제거
  /agent test <id> 에이전트 연결 테스트
  /exit, exit, quit 종료
  /config         현재 config 덤프
  /tools          등록된 도구 목록
`);
      return true;
    }
    if (input === "/clear") { messages.length = 0; console.log("🧹 초기화됨."); return true; }
    if (input === "/status") {
      const wt = shared.worktreeMgr ? await shared.worktreeMgr.list() : null;
      console.log(`\nProvider: ${provider.name} (${provider.model})\nCWD: ${cwd}\nMessages: ${messages.length}\nMax turns: ${maxTurns}\nSandbox: ${shared.sandbox?.mode}\nHooks: ${shared.hooks?.size ?? 0}개\nEvent Log: ${shared.eventLog?.logPath}\nWorktrees: ${wt ? wt.worktrees.length + "개" : "없음"}\nSkills: ${skillMgr.list().map(s => "/" + s.name).join(", ")}\nTools: ${shared.tools.map(t => t.name).join(", ")}`);
      return true;
    }
    if (input === "/config") {
      console.log(`\nSandbox: ${shared.sandbox?.mode}\nProvider: ${provider.name} (${provider.model})\nMaxTurns: ${maxTurns}\nCWD: ${cwd}\nTools: ${shared.tools.length}개\nUpdates: ${shared.config.updates.enabled ? "ON" : "OFF"} (repos: ${shared.config.updates.repos.map(r => r.name).join(", ")})`);
      return true;
    }
    if (input === "/tools") {
      console.log(`\nTools (${shared.tools.length}개):\n${shared.tools.map(t => `  - ${t.name}: ${t.description.slice(0, 80)}`).join("\n")}`);
      return true;
    }
    if (input === "/hooks") {
      const entries = shared.hooks ? (["sessionStart", "preToolUse", "postToolUse", "postTurn", "preCompact", "sessionEnd"] as const).flatMap(e => shared.hooks!.forEvent(e).map(h => `  - [${e}] ${h.source}`)) : [];
      console.log(entries.length ? `\nHooks (${entries.length}개):\n${entries.join("\n")}` : "\n활성 hooks 없음. .arena/hooks/*.js 로 추가하세요.");
      return true;
    }
    // /agent — 외부 에이전트 관리
    if (input.startsWith("/agent")) {
      const rest = input.slice("/agent".length).trim();
      const [sub, ...argsParts] = rest.split(/\s+/);
      const argsStr = argsParts.join(" ").trim();
      const mgr = shared.agentManager;
      if (!sub || sub === "list" || sub === ":list") {
        const agents = mgr.list();
        if (!agents.length) console.log("\n등록된 외부 에이전트 없음.\n추가: /agent add '{\"id\":\"my-gpt\",\"transport\":\"openai\",\"baseUrl\":\"https://...\",\"apiKey\":\"${ENV:MY_KEY}\"}'\n또는 arena.config.json → agents[]\n형식: http/openai/mcp/module/command");
        else { console.log(`\n외부 에이전트 ${agents.length}개:`); for (const a of agents) { const d = a.baseUrl ?? a.command ?? a.module ?? a.url ?? ""; console.log(`  - ${a.id} [${a.transport}] ${a.description ?? ""} ${d ? `→ ${d}` : ""} ${a.enabled===false?"(disabled)":""}`); } }
        return true;
      }
      if (sub === "add" || sub === ":add") {
        if (!argsStr) { console.log('사용법: /agent add \'{"id":"my-gpt","transport":"openai","baseUrl":"https://..."}\''); return true; }
        try { const def = JSON.parse(argsStr); mgr.add(def); if (def.transport==="mcp") { console.log(`  MCP ${def.id} 추가 — 도구 수집 중...`); const { tools: nt } = await mgr.collectTools(); for (const t of nt) { try { shared.tools.push(t); } catch {} } if (nt.length) console.log(`  → ${nt.length}개 도구 추가`); } console.log(`✅ 추가: ${def.id} (${def.transport})`); } catch (e) { const m=e instanceof Error?e.message:String(e); console.log(`❌ 실패: ${m}`); }
        return true;
      }
      if (sub === "remove" || sub === ":remove") {
        if (!argsStr) { console.log("사용법: /agent remove <id>"); return true; }
        console.log(mgr.remove(argsStr.trim()) ? `✅ 제거: ${argsStr.trim()}` : `❌ 없음: ${argsStr.trim()}`);
        return true;
      }
      if (sub === "test" || sub === ":test") {
        const id = argsStr.trim() || mgr.list()[0]?.id;
        if (!id) { console.log("테스트할 에이전트 없음"); return true; }
        console.log(`🔍 테스트: ${id} ...`);
        try { const r = await mgr.delegate(id, "Hello! Respond with one short sentence."); console.log(`✅ 응답:\n${r.slice(0,2000)}`); } catch (e) { const m=e instanceof Error?e.message:String(e); console.log(`❌ 실패: ${m}`); }
        return true;
      }
      console.log("사용법: /agent [list|add|remove|test]\n  /agent list\n  /agent add '{\"id\":\"my-gpt\",\"transport\":\"openai\",\"baseUrl\":\"https://api.example.com/v1\"}'\n  /agent test my-gpt");
      return true;
    }
    if (input.startsWith("/update")) {
      const rest = input.slice("/update".length).trim().replace(/^:/, "").trim();
      const act = rest.split(/\s+/)[0] || "check";
      const tgt = rest.split(/\s+/)[1] || "all";
      if (act === "check" || act === "apply" || act === "") {
        await handleUpdateCommand(act || "check", {
          cwd, config: shared.config, target: tgt, yes: false, dryRun: false,
        });
      } else {
        console.log(`사용법: /update [check|apply] [대상]\n예: /update:check, /update apply ghidra`);
      }
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
      hooks: shared.hooks,
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
