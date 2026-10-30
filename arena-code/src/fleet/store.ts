/**
 * FleetStore — Orca SQLite를 JSON + JSONL로 경량 포팅
 * 영구 상태: .arena/fleet.json (현 상태) + .arena/fleet.log (append-only 메시징)
 * DAG 전이: pending → ready → dispatched → completed/failed/blocked
 * 서킷브레이커: failureCount >=3 => Task blocked
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync, appendFileSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import type { FleetState, Run, Task, Dispatch, Message, DecisionGate, TaskStatus, DispatchStatus, MessageType, DecisionGateStatus } from "./types.js";
import { genId } from "./types.js";

const VERSION = 1 as const;

function nowIso(): string {
  return new Date().toISOString();
}

function emptyState(): FleetState {
  return { version: VERSION, runs: {}, tasks: {}, dispatches: {}, messages: {}, gates: {}, updatedAt: nowIso() };
}

export class FleetStore {
  readonly root: string;
  readonly jsonPath: string;
  readonly logPath: string;

  constructor(workspaceRoot?: string) {
    const base = resolve(workspaceRoot ?? process.cwd());
    this.root = join(base, ".arena");
    this.jsonPath = join(this.root, "fleet.json");
    this.logPath = join(this.root, "fleet.log");
  }

  // ── Low-level I/O ──

  load(): FleetState {
    if (!existsSync(this.jsonPath)) return emptyState();
    try {
      const raw = readFileSync(this.jsonPath, "utf-8");
      const parsed = JSON.parse(raw) as FleetState;
      if (!parsed.version) (parsed as FleetState).version = VERSION;
      // backfill missing maps
      parsed.runs ??= {};
      parsed.tasks ??= {};
      parsed.dispatches ??= {};
      parsed.messages ??= {};
      parsed.gates ??= {};
      return parsed;
    } catch {
      return emptyState();
    }
  }

  save(state: FleetState): void {
    mkdirSync(dirname(this.jsonPath), { recursive: true });
    state.updatedAt = nowIso();
    writeFileSync(this.jsonPath, JSON.stringify(state, null, 2), "utf-8");
  }

  private appendLog(entry: Record<string, unknown>): void {
    mkdirSync(dirname(this.logPath), { recursive: true });
    appendFileSync(this.logPath, JSON.stringify({ ...entry, _ts: nowIso() }) + "\n", "utf-8");
  }

  // ── Runs ──

  createRun(objective: string, opts?: { coordinatorSessionId?: string; githubIssue?: number; metadata?: Record<string, unknown> }): Run {
    const state = this.load();
    const run: Run = {
      id: genId("run"),
      objective,
      status: "active",
      createdAt: nowIso(),
      coordinatorSessionId: opts?.coordinatorSessionId,
      githubIssue: opts?.githubIssue,
      metadata: opts?.metadata,
    };
    state.runs[run.id] = run;
    this.save(state);
    this.appendLog({ type: "run_create", runId: run.id, objective });
    return run;
  }

  getRun(runId: string): Run | undefined {
    return this.load().runs[runId];
  }

  listRuns(): Run[] {
    return Object.values(this.load().runs).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }

  updateRun(runId: string, patch: Partial<Run>): Run | undefined {
    const state = this.load();
    const run = state.runs[runId];
    if (!run) return undefined;
    Object.assign(run, patch);
    this.save(state);
    return run;
  }

  // ── Tasks ──

  createTask(runId: string, spec: string, deps?: string[], opts?: { labels?: string[]; githubIssue?: number }): Task {
    const state = this.load();
    if (!state.runs[runId]) throw new Error(`Run not found: ${runId}`);
    // validate deps exist
    for (const d of deps ?? []) {
      if (!state.tasks[d]) throw new Error(`Dependency task not found: ${d}`);
      if (state.tasks[d].runId !== runId) throw new Error(`Dependency ${d} belongs to different run`);
    }
    const id = genId("task");
    const status: TaskStatus = (deps && deps.length > 0) ? "pending" : "ready";
    const task: Task = {
      id,
      runId,
      spec,
      deps: deps ?? [],
      status,
      createdAt: nowIso(),
      updatedAt: nowIso(),
      labels: opts?.labels,
      githubIssue: opts?.githubIssue,
    };
    state.tasks[id] = task;
    this.save(state);
    this.appendLog({ type: "task_create", runId, taskId: id, spec, deps });
    // try unblock already-pending tasks that may depend on nothing else? no-op
    return task;
  }

  getTask(taskId: string): Task | undefined {
    return this.load().tasks[taskId];
  }

  listTasks(runId?: string): Task[] {
    const state = this.load();
    const all = Object.values(state.tasks);
    const filtered = runId ? all.filter(t => t.runId === runId) : all;
    return filtered.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }

  /** DAG unblock: when a task completes, pending tasks whose deps are all completed become ready */
  private unblockDependents(state: FleetState, completedTaskId: string): string[] {
    const unblocked: string[] = [];
    for (const task of Object.values(state.tasks)) {
      if (task.status !== "pending") continue;
      if (!task.deps.includes(completedTaskId)) continue;
      const allDepsDone = task.deps.every(depId => state.tasks[depId]?.status === "completed");
      if (allDepsDone) {
        task.status = "ready";
        task.updatedAt = nowIso();
        unblocked.push(task.id);
      }
    }
    return unblocked;
  }

  updateTaskStatus(taskId: string, status: TaskStatus): Task | undefined {
    const state = this.load();
    const task = state.tasks[taskId];
    if (!task) return undefined;
    task.status = status;
    task.updatedAt = nowIso();
    if (status === "completed") {
      this.unblockDependents(state, taskId);
    }
    this.save(state);
    this.appendLog({ type: "task_status", taskId, status });
    return task;
  }

  // ── Dispatches ──

  createDispatch(taskId: string, opts?: { worktreePath?: string | null; agentId?: string | null; provider?: string | null; paneId?: string; preamble?: string }): Dispatch {
    const state = this.load();
    const task = state.tasks[taskId];
    if (!task) throw new Error(`Task not found: ${taskId}`);
    if (task.status !== "ready" && task.status !== "dispatched") throw new Error(`Task ${taskId} not ready (status=${task.status}) — must be ready to dispatch`);
    const d: Dispatch = {
      id: genId("dispatch"),
      taskId,
      runId: task.runId,
      worktreePath: opts?.worktreePath ?? null,
      agentId: opts?.agentId ?? null,
      provider: opts?.provider ?? null,
      status: "pending",
      failureCount: 0,
      createdAt: nowIso(),
      updatedAt: nowIso(),
      paneId: opts?.paneId,
      preamble: opts?.preamble,
    };
    state.dispatches[d.id] = d;
    task.status = "dispatched";
    task.updatedAt = nowIso();
    this.save(state);
    this.appendLog({ type: "dispatch_create", dispatchId: d.id, taskId, runId: task.runId, worktreePath: d.worktreePath });
    return d;
  }

  getDispatch(dispatchId: string): Dispatch | undefined {
    return this.load().dispatches[dispatchId];
  }

  listDispatches(filter?: { runId?: string; taskId?: string }): Dispatch[] {
    const state = this.load();
    let all = Object.values(state.dispatches);
    if (filter?.runId) all = all.filter(d => d.runId === filter.runId);
    if (filter?.taskId) all = all.filter(d => d.taskId === filter.taskId);
    return all.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }

  updateDispatchStatus(dispatchId: string, status: DispatchStatus, opts?: { failureCount?: number }): Dispatch | undefined {
    const state = this.load();
    const d = state.dispatches[dispatchId];
    if (!d) return undefined;
    d.status = status;
    d.updatedAt = nowIso();
    if (opts?.failureCount !== undefined) d.failureCount = opts.failureCount;
    this.save(state);
    this.appendLog({ type: "dispatch_status", dispatchId, status });
    return d;
  }

  incrementFailure(dispatchId: string): { dispatch: Dispatch | undefined; taskBlocked: boolean } {
    const state = this.load();
    const d = state.dispatches[dispatchId];
    if (!d) return { dispatch: undefined, taskBlocked: false };
    d.failureCount += 1;
    d.updatedAt = nowIso();
    let taskBlocked = false;
    if (d.failureCount >= 3) {
      const task = state.tasks[d.taskId];
      if (task) {
        task.status = "blocked";
        task.updatedAt = nowIso();
        taskBlocked = true;
      }
    }
    this.save(state);
    this.appendLog({ type: "dispatch_failure", dispatchId, failureCount: d.failureCount, taskBlocked });
    return { dispatch: d, taskBlocked };
  }

  // ── Messages ──

  createMessage(msg: Omit<Message, "id" | "createdAt"> & Partial<Pick<Message, "id" | "createdAt">>): Message {
    const state = this.load();
    const m: Message = {
      id: msg.id ?? genId("msg"),
      runId: msg.runId,
      taskId: msg.taskId,
      dispatchId: msg.dispatchId,
      type: msg.type,
      payload: msg.payload ?? {},
      createdAt: (msg as Message).createdAt ?? nowIso(),
      outcome: msg.outcome,
      filesModified: msg.filesModified,
      summary: msg.summary,
      acked: msg.acked ?? false,
      deliveryId: msg.deliveryId ?? genId("delivery"),
    };
    state.messages[m.id] = m;
    this.save(state);
    // append to log file as Orca-style mailbox
    this.appendLog({ type: "message", messageId: m.id, runId: m.runId, msgType: m.type, outcome: m.outcome, dispatchId: m.dispatchId, taskId: m.taskId });

    // Auto-transition on worker_done
    if (m.type === "worker_done" && m.taskId) {
      const task = state.tasks[m.taskId];
      const dispatch = m.dispatchId ? state.dispatches[m.dispatchId] : undefined;
      if (task) {
        if (m.outcome === "succeeded") {
          task.status = "completed";
          task.updatedAt = nowIso();
          if (dispatch) {
            dispatch.status = "completed";
            dispatch.updatedAt = nowIso();
          }
          this.unblockDependents(state, task.id);
          this.save(state);
        } else if (m.outcome === "failed") {
          // increment per-dispatch failure, plus per-task total failures
          if (dispatch) {
            dispatch.failureCount += 1;
            dispatch.updatedAt = nowIso();
            // count total failed dispatches for this task
            const failedForTask = Object.values(state.dispatches).filter(d => d.taskId === task.id && (d.status === "failed" || d.id === dispatch.id)).length;
            // if this dispatch just failed, its failureCount already bumped, but we count via dispatch statuses
            // fallback: if dispatch failureCount >=3 OR total failed dispatches >=3, block
            const shouldBlock = dispatch.failureCount >= 3 || failedForTask >= 3;
            if (shouldBlock) {
              task.status = "blocked";
              dispatch.status = "failed";
            } else {
              // allow retry: task goes back to ready
              task.status = "ready";
              dispatch.status = "failed";
            }
            task.updatedAt = nowIso();
            this.save(state);
          } else {
            task.status = "failed";
            this.save(state);
          }
        }
      }
    }
    return m;
  }

  getMessage(messageId: string): Message | undefined {
    return this.load().messages[messageId];
  }

  listMessages(filter?: { runId?: string; type?: MessageType; acked?: boolean }): Message[] {
    const state = this.load();
    let all = Object.values(state.messages);
    if (filter?.runId) all = all.filter(m => m.runId === filter.runId);
    if (filter?.type) all = all.filter(m => m.type === filter.type);
    if (filter?.acked !== undefined) all = all.filter(m => m.acked === filter.acked);
    return all.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }

  ackMessage(messageId: string): Message | undefined {
    const state = this.load();
    const m = state.messages[messageId];
    if (!m) return undefined;
    m.acked = true;
    this.save(state);
    this.appendLog({ type: "message_ack", messageId });
    return m;
  }

  // Orca check semantics: wait for messages of given types, return unacked
  check(runId: string, types: MessageType[]): Message[] {
    const state = this.load();
    return Object.values(state.messages)
      .filter(m => m.runId === runId && types.includes(m.type) && !m.acked)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }

  // ── Decision Gates ──

  createGate(runId: string, taskId: string, question: string): DecisionGate {
    const state = this.load();
    const gate: DecisionGate = {
      id: genId("gate"),
      runId,
      taskId,
      question,
      status: "open",
      createdAt: nowIso(),
    };
    state.gates[gate.id] = gate;
    this.save(state);
    this.appendLog({ type: "gate_create", gateId: gate.id, runId, taskId });
    // also create a message for mailbox
    this.createMessage({ runId, taskId, type: "decision_gate", payload: { gateId: gate.id, question } });
    return gate;
  }

  resolveGate(gateId: string, status: DecisionGateStatus, answer?: string): DecisionGate | undefined {
    const state = this.load();
    const g = state.gates[gateId];
    if (!g) return undefined;
    g.status = status;
    g.answer = answer;
    g.resolvedAt = nowIso();
    this.save(state);
    this.appendLog({ type: "gate_resolve", gateId, status });
    return g;
  }

  // ── GC / prune ──

  clear(): void {
    const empty = emptyState();
    this.save(empty);
    // keep log file for audit, truncation optional
  }

  // Stats for CLI
  status(_workspaceRoot?: string): { runs: number; tasks: number; dispatches: number; messages: number; gates: number; path: string } {
    const s = this.load();
    return {
      runs: Object.keys(s.runs).length,
      tasks: Object.keys(s.tasks).length,
      dispatches: Object.keys(s.dispatches).length,
      messages: Object.keys(s.messages).length,
      gates: Object.keys(s.gates).length,
      path: this.jsonPath,
    };
  }
}

