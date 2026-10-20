/**
 * Dispatch + Worker execution — Orca dispatch --inject 포팅
 * dispatchTask: Dispatch 생성 + preamble 주입
 * runWorker: queryLoop()를 worker로 실행 (Provider 추상화 재활용)
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { exec as execCb } from "node:child_process";
import { promisify } from "node:util";
import type { Task, Dispatch } from "./types.js";
import { FleetStore } from "./store.js";
import { FleetWorktreeManager } from "./worktreeFleet.js";
import type { Provider } from "../providers/types.js";
import type { EventLog } from "../eventLog/index.js";

const execAsync = promisify(execCb);

export interface DispatchOptions {
  worktreePath?: string | null;
  agentId?: string | null;
  provider?: string | null;
  preambleExtra?: string;
}

export class FleetDispatcher {
  private store: FleetStore;
  private worktreeMgr: FleetWorktreeManager;

  constructor(workspaceRoot?: string, store?: FleetStore) {
    const root = resolve(workspaceRoot ?? process.cwd());
    this.store = store ?? new FleetStore(root);
    this.worktreeMgr = new FleetWorktreeManager(root);
  }

  get fleetWorktreeMgr(): FleetWorktreeManager {
    return this.worktreeMgr;
  }

  /**
   * Dispatch 생성 + preamble 주입 — Orca dispatch --to + --inject
   */
  async dispatchTask(task: Task, opts?: DispatchOptions): Promise<{ dispatch: Dispatch; error?: string }> {
    // 1) Dispatch 레코드 생성
    let dispatch: Dispatch;
    try {
      dispatch = this.store.createDispatch(task.id, {
        worktreePath: opts?.worktreePath ?? null,
        agentId: opts?.agentId ?? null,
        provider: opts?.provider ?? null,
        preamble: opts?.preambleExtra,
      });
    } catch (e: unknown) {
      return { dispatch: null as unknown as Dispatch, error: e instanceof Error ? e.message : String(e) };
    }

    // 2) Preamble 주입 (worktree가 있으면)
    if (opts?.worktreePath && existsSync(resolve(opts.worktreePath))) {
      const err = this.worktreeMgr.injectPreamble(opts.worktreePath, dispatch.id, task.runId, task.id, task.spec, opts.preambleExtra);
      if (err) {
        // preamble 실패는 warning이지만 dispatch는 유효 — 작업은 계속 가능
        // store에 기록만
      }
      // also mark dispatch running
      this.store.updateDispatchStatus(dispatch.id, "running");
      dispatch = this.store.getDispatch(dispatch.id)!;
    } else {
      this.store.updateDispatchStatus(dispatch.id, "running");
      dispatch = this.store.getDispatch(dispatch.id)!;
    }

    return { dispatch };
  }

  /**
   * GH integration helper — Dispatch에 연결된 GitHub 이슈/PR을 gh CLI로 조회 (best-effort)
   * Orca의 GH/Linear/SSH/mobile 중 Arena에 흡수 가능한 gh 연동 부분
   */
  async ghIssueInfo(issueNumber: number, cwd?: string): Promise<{ title?: string; state?: string; error?: string }> {
    try {
      const { stdout } = await execAsync(`gh issue view ${issueNumber} --json title,state --jq '{title:.title,state:.state}' 2>&1`, {
        cwd: cwd ?? process.cwd(),
        timeout: 8000,
      });
      const j = JSON.parse(stdout.trim());
      return { title: j.title, state: j.state };
    } catch (e: unknown) {
      return { error: e instanceof Error ? e.message : String(e) };
    }
  }

  async ghPrInfo(prNumber: number, cwd?: string): Promise<{ title?: string; state?: string; error?: string }> {
    try {
      const { stdout } = await execAsync(`gh pr view ${prNumber} --json title,state --jq '{title:.title,state:.state}' 2>&1`, {
        cwd: cwd ?? process.cwd(),
        timeout: 8000,
      });
      const j = JSON.parse(stdout.trim());
      return { title: j.title, state: j.state };
    } catch (e: unknown) {
      return { error: e instanceof Error ? e.message : String(e) };
    }
  }

  /**
   * Worker로 queryLoop 실행 — 각 Dispatch는 독립 queryLoop 세션
   * dryRun/mock 시 합성 궤적 반환
   */
  async runWorker(opts: {
    dispatch: Dispatch;
    task: Task;
    provider: Provider;
    cwd?: string;
    maxTurns?: number;
    systemExtra?: string;
    eventLog?: EventLog;
    dryRun?: boolean;
  }): Promise<{ ok: boolean; trajectory: string; deliverable?: string; error?: string }> {
    const cwd = resolve(opts.cwd ?? opts.dispatch.worktreePath ?? process.cwd());
    const taskPrompt = opts.task.spec;

    // dryRun/mock branch — 합성 궤적
    if (opts.dryRun || (opts.provider as unknown as { name?: string }).name === "mock" || process.env.ARENA_MOCK === "true") {
      const wtHint = opts.dispatch.worktreePath ? ` worktree=${opts.dispatch.worktreePath}` : " current";
      return {
        ok: true,
        trajectory: `[MOCK worker ${opts.dispatch.id}${wtHint}] task: ${taskPrompt.slice(0, 80)} | used tools: Read, Edit, Bash`,
        deliverable: `[MOCK deliverable ${opts.dispatch.id}] task completed in ${opts.dispatch.worktreePath ?? "current"} — length=${100 + taskPrompt.length}`,
      };
    }

    // real queryLoop
    try {
      const { queryLoop } = await import("../loop/queryLoop.js");
      const { buildRegistry } = await import("../tools/index.js");
      const registry = buildRegistry();
      const tools = registry.all();

      const messages: import("../providers/types.js").Message[] = [{ role: "user", content: taskPrompt }];
      const dispatchExtra = `You are Fleet worker ${opts.dispatch.id} for Task ${opts.task.id} (Run ${opts.task.runId}). Worktree: ${opts.dispatch.worktreePath ?? cwd}. When done, you MUST report with arena-code --fleet-worker-done --task-id ${opts.task.id} --dispatch-id ${opts.dispatch.id} --outcome succeeded|failed`;
      const systemExtra = [opts.systemExtra ?? "", dispatchExtra].filter(Boolean).join("\n\n");

      const events: string[] = [];
      let deliverable = "";
      for await (const evt of queryLoop({
        provider: opts.provider,
        tools,
        cwd,
        messages,
        systemExtra,
        maxTurns: opts.maxTurns ?? 12,
      })) {
        if (evt.type === "text" && evt.text) {
          events.push(evt.text);
          deliverable += evt.text;
        } else if (evt.type === "tool_start") events.push(`[tool:${evt.tool}]`);
        else if (evt.type === "tool_result") events.push(`[result:${evt.tool}] ${String(evt.result).slice(0, 200)}`);
        else if (evt.type === "error") events.push(`[error] ${evt.message}`);
      }
      return {
        ok: events.length > 0,
        trajectory: events.join("\n"),
        deliverable: deliverable.slice(0, 5000) || undefined,
      };
    } catch (e: unknown) {
      return { ok: false, trajectory: `worker failed: ${e instanceof Error ? e.message : String(e)}`, error: e instanceof Error ? e.message : String(e) };
    }
  }
}

