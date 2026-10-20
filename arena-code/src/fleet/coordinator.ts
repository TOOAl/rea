/**
 * FleetCoordinator — Orca canonical supervised loop 포팅
 * runCreate/taskCreate/workerStart/check/ack + DAG unblock + worker_done 검증
 */
import { resolve } from "node:path";
import { exec as execCb } from "node:child_process";
import { promisify } from "node:util";
import { FleetStore } from "./store.js";
import { FleetDispatcher } from "./dispatch.js";
import { FleetWorktreeManager } from "./worktreeFleet.js";
import type { Run, Task, Dispatch, Message, MessageType } from "./types.js";
import type { Provider } from "../providers/types.js";
import type { EventLog } from "../eventLog/index.js";

const execAsync = promisify(execCb);

export interface CoordinatorOptions {
  workspaceRoot?: string;
  store?: FleetStore;
  provider?: Provider;
  eventLog?: EventLog;
}

export class FleetCoordinator {
  readonly store: FleetStore;
  readonly dispatcher: FleetDispatcher;
  readonly worktreeMgr: FleetWorktreeManager;
  private root: string;

  constructor(opts?: CoordinatorOptions) {
    const root = resolve(opts?.workspaceRoot ?? process.cwd());
    this.root = root;
    this.store = opts?.store ?? new FleetStore(root);
    this.dispatcher = new FleetDispatcher(root, this.store);
    this.worktreeMgr = this.dispatcher.fleetWorktreeMgr;
  }

  // ── Run ──

  runCreate(objective: string, opts?: { githubIssue?: number; metadata?: Record<string, unknown>; coordinatorSessionId?: string }): Run {
    return this.store.createRun(objective, opts);
  }

  runList(): Run[] {
    return this.store.listRuns();
  }

  // ── Task ──

  taskCreate(runId: string, spec: string, deps?: string[], opts?: { labels?: string[]; githubIssue?: number }): Task {
    return this.store.createTask(runId, spec, deps, opts);
  }

  taskList(runId?: string): Task[] {
    return this.store.listTasks(runId);
  }

  // ── Worker start (fan-out) ──

  async workerStart(opts: {
    taskId: string;
    worktreePath?: string | null;
    agentId?: string | null;
    provider?: string | null;
    preambleExtra?: string;
    // gh integration: optionally attach gh issue/pr to dispatch
    githubIssue?: number;
  }): Promise<{ dispatch: Dispatch; error?: string }> {
    const task = this.store.getTask(opts.taskId);
    if (!task) return { dispatch: null as unknown as Dispatch, error: `Task not found: ${opts.taskId}` };

    // if worktreePath provided, ensure it exists or create placeholder?
    // If not provided and fan-out requested via FleetWorktreeManager, caller should have created worktrees already
    return this.dispatcher.dispatchTask(task, {
      worktreePath: opts.worktreePath ?? null,
      agentId: opts.agentId ?? null,
      provider: opts.provider ?? null,
      preambleExtra: opts.preambleExtra,
    });
  }

  /**
   * Fan-out: 1 prompt → N worktrees → N dispatches → parallel workers
   * Arena Code fan-out (Orca fan-out 포팅) — 각 worktree에서 N개의 다른 Provider/에이전트가 병렬 작업
   */
  async fanOut(opts: {
    taskId: string;
    count: number;
    baseTaskName?: string;
    agentIds?: string[]; // e.g., provider ids for each worktree
    providers?: Provider[]; // optional provider instances for runWorker
    dryRun?: boolean;
    preambleExtra?: string;
    maxTurns?: number;
  }): Promise<{ dispatches: Dispatch[]; errors: string[]; worktrees: string[] }> {
    const task = this.store.getTask(opts.taskId);
    if (!task) return { dispatches: [], errors: [`Task not found: ${opts.taskId}`], worktrees: [] };

    const run = this.store.getRun(task.runId);
    if (!run) return { dispatches: [], errors: [`Run not found: ${task.runId}`], worktrees: [] };

    const count = Math.max(1, Math.min(16, opts.count));
    const { worktrees, errors: wtErrors } = await this.worktreeMgr.createFleet({
      runId: task.runId,
      count,
      taskNamePrefix: opts.baseTaskName ?? task.spec.slice(0, 12).replace(/[^a-z0-9]+/gi, "-").toLowerCase(),
    });

    const dispatches: Dispatch[] = [];
    const errors: string[] = [...wtErrors];
    const worktreePaths: string[] = worktrees.map(w => w.path);

    // Create dispatches for each worktree
    for (let i = 0; i < worktrees.length; i++) {
      const wt = worktrees[i];
      const agentId = opts.agentIds?.[i] ?? null;
      const providerName = opts.providers?.[i] ? (opts.providers[i] as unknown as { name?: string }).name ?? null : null;
      const { dispatch, error } = await this.workerStart({
        taskId: task.id,
        worktreePath: wt.path,
        agentId,
        provider: providerName,
      });
      if (error) errors.push(error);
      else dispatches.push(dispatch);
    }

    // If non-git (worktrees empty) but task is valid, still create dispatches on current workspace
    if (worktrees.length === 0) {
      // non-git fallback: create dispatches without worktrees (current dir)
      for (let i = 0; i < count; i++) {
        const { dispatch, error } = await this.workerStart({
          taskId: task.id,
          worktreePath: null,
          agentId: opts.agentIds?.[i] ?? null,
        });
        if (error) errors.push(error);
        else dispatches.push(dispatch);
      }
    }

    return { dispatches, errors, worktrees: worktreePaths };
  }

  // ── Check / Ack (Orca check --wait semantics) ──

  /**
   * Orca: orca orchestration check --wait --types worker_done,escalation,question --timeout-ms 900000 --json
   * Arena: check unacked messages for runId, optionally wait via polling (since we have no long-lived daemon)
   */
  async check(opts: {
    runId: string;
    types?: MessageType[];
    timeoutMs?: number;
    wait?: boolean;
  }): Promise<{ messages: Message[]; timedOut: boolean }> {
    const types = opts.types ?? ["worker_done", "escalation", "question", "decision_gate"];
    const timeoutMs = opts.timeoutMs ?? 30_000;
    const wait = opts.wait ?? false;

    // immediate check
    let msgs = this.store.check(opts.runId, types);
    if (msgs.length > 0 || !wait) {
      return { messages: msgs, timedOut: false };
    }

    // polling wait — since we don't have a daemon, we poll fleet.json
    const start = Date.now();
    const interval = 1000;
    while (Date.now() - start < timeoutMs) {
      await new Promise(r => setTimeout(r, interval));
      msgs = this.store.check(opts.runId, types);
      if (msgs.length > 0) return { messages: msgs, timedOut: false };
    }
    return { messages: [], timedOut: true };
  }

  ack(messageId: string): Message | undefined {
    return this.store.ackMessage(messageId);
  }

  ackAll(runId: string, types?: MessageType[]): number {
    const msgs = this.store.check(runId, types ?? ["worker_done", "escalation", "question", "decision_gate"]);
    let n = 0;
    for (const m of msgs) {
      this.store.ackMessage(m.id);
      n++;
    }
    return n;
  }

  // ── Worker done verification (수명주기 ID 대조 엄격) ──

  /**
   * Worker가 보고하는 worker_done을 검증 후 Message 생성
   * Orca safety floor: lifecycle ID 대조 없이 완료 인정 안 함, --outcome 필수, 산문에만 인코딩 금지
   */
  workerDone(opts: {
    taskId: string;
    dispatchId: string;
    outcome: "succeeded" | "failed";
    filesModified?: string[];
    summary?: string;
    // optional verification: ensure dispatch belongs to task
    cwd?: string;
  }): { message: Message; error?: string } {
    const task = this.store.getTask(opts.taskId);
    if (!task) return { message: null as unknown as Message, error: `Task not found: ${opts.taskId}` };
    const dispatch = this.store.getDispatch(opts.dispatchId);
    if (!dispatch) return { message: null as unknown as Message, error: `Dispatch not found: ${opts.dispatchId} — copy된 ID나 오래된 DB 행은 권한 없음 (Orca safety floor)` };
    if (dispatch.taskId !== opts.taskId) return { message: null as unknown as Message, error: `Dispatch ${opts.dispatchId} does not belong to Task ${opts.taskId} (lifecycle mismatch)` };
    if (task.runId !== dispatch.runId) return { message: null as unknown as Message, error: `Run mismatch: task run ${task.runId} vs dispatch run ${dispatch.runId}` };
    if (dispatch.status !== "running" && dispatch.status !== "pending") {
      return { message: null as unknown as Message, error: `Dispatch ${opts.dispatchId} not in runnable state (status=${dispatch.status}) — already completed/released?` };
    }

    const message = this.store.createMessage({
      runId: task.runId,
      taskId: task.id,
      dispatchId: dispatch.id,
      type: "worker_done",
      payload: {
        outcome: opts.outcome,
        filesModified: opts.filesModified ?? [],
        summary: opts.summary ?? "",
        cwd: opts.cwd ?? process.cwd(),
      },
      outcome: opts.outcome,
      filesModified: opts.filesModified,
      summary: opts.summary,
    });

    return { message };
  }

  // ── Worker release (terminal cleanup) ──

  workerRelease(dispatchId: string): { ok: boolean; error?: string } {
    const d = this.store.getDispatch(dispatchId);
    if (!d) return { ok: false, error: `Dispatch not found: ${dispatchId}` };
    // mark released — if its worktree exists, caller may choose to remove it
    this.store.updateDispatchStatus(dispatchId, "released");
    return { ok: true };
  }

  // ── GH integration ──

  /**
   * Fleet Run/Task에 gh 이슈 연동 — `gh issue view` / `gh pr view` / `gh issue create` 등
   * Best-effort: gh가 없으면 에러 반환하지만 fleet 상태는 유지
   */
  async ghCommand(args: string[], cwd?: string): Promise<{ stdout: string; stderr: string; exitCode: number }> {
    try {
      const { stdout, stderr } = await execAsync(`gh ${args.map(a => `"${a.replace(/"/g, '\\"')}"`).join(" ")} 2>&1`, {
        cwd: cwd ?? this.root,
        timeout: 15000,
      });
      return { stdout, stderr: "", exitCode: 0 };
    } catch (e: unknown) {
      const err = e as { stdout?: string; stderr?: string; message?: string; code?: number };
      return { stdout: err.stdout ?? "", stderr: err.stderr ?? err.message ?? String(e), exitCode: err.code ?? 1 };
    }
  }

  // ── Status aggregation ──

  status(): ReturnType<FleetStore["status"]> {
    return this.store.status();
  }

  // ── Diff/cherry-pick helpers (Fleet 병합 UX) ──

  /**
   * 각 worktree의 diff 수집 — 사람이 승자를 고르기 위한 비교 재료
   * Orca는 인라인 diff 주석을 에이전트에 반송; 우리는 git diff로 대체
   */
  async collectDiffs(dispatchIds: string[]): Promise<Array<{ dispatchId: string; worktreePath: string | null; diff: string; error?: string }>> {
    const out: Array<{ dispatchId: string; worktreePath: string | null; diff: string; error?: string }> = [];
    for (const id of dispatchIds) {
      const d = this.store.getDispatch(id);
      if (!d) {
        out.push({ dispatchId: id, worktreePath: null, diff: "", error: `Dispatch not found: ${id}` });
        continue;
      }
      const wt = d.worktreePath ?? this.root;
      try {
        const { stdout } = await execAsync(`git diff --stat && echo "---" && git diff --name-only 2>&1 | head -20`, {
          cwd: wt,
          timeout: 8000,
        });
        out.push({ dispatchId: id, worktreePath: d.worktreePath, diff: stdout.slice(0, 4000) });
      } catch (e: unknown) {
        out.push({ dispatchId: id, worktreePath: d.worktreePath, diff: "", error: e instanceof Error ? e.message : String(e) });
      }
    }
    return out;
  }
}

