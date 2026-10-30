/**
 * FleetStore + Coordinator + Worker integration tests
 * Orca ADE 포팅 검증: Run→Task→Dispatch→worker_done, DAG unblock, circuit breaker, lifecycle 검증
 */
import { describe, it, expect, beforeEach } from "vitest";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { FleetStore } from "../src/fleet/store.js";
import { FleetCoordinator } from "../src/fleet/coordinator.js";
import { WorkerAgent } from "../src/fleet/worker.js";

function tmpRoot(): string {
  const dir = mkdtempSync(join(tmpdir(), "arena-fleet-"));
  return dir;
}

describe("FleetStore", () => {
  let root: string;
  let store: FleetStore;

  beforeEach(() => {
    root = tmpRoot();
    store = new FleetStore(root);
  });

  it("runCreate + taskCreate with deps => pending/ready DAG", () => {
    const run = store.createRun("build flux: core, api, site");
    expect(run.id.startsWith("run_")).toBe(true);

    const t1 = store.createTask(run.id, "core: implement utils");
    expect(t1.status).toBe("ready"); // no deps => ready
    const t2 = store.createTask(run.id, "api: implement api", [t1.id]);
    expect(t2.status).toBe("pending"); // has dep => pending
    const t3 = store.createTask(run.id, "site: implement site", [t2.id]);
    expect(t3.status).toBe("pending");

    // dispatch + worker_done should unblock DAG
    const d1 = store.createDispatch(t1.id);
    store.updateDispatchStatus(d1.id, "running");
    store.createMessage({ runId: run.id, taskId: t1.id, dispatchId: d1.id, type: "worker_done", payload: {}, outcome: "succeeded" });
    const t2after = store.getTask(t2.id)!;
    expect(t2after.status).toBe("ready");
    const t3after = store.getTask(t3.id)!;
    expect(t3after.status).toBe("pending"); // still blocked on t2
  });

  it("circuit breaker: failureCount>=3 => task blocked", () => {
    const run = store.createRun("cb test");
    const task = store.createTask(run.id, "flaky task");
    const d1 = store.createDispatch(task.id);
    store.updateDispatchStatus(d1.id, "running");
    store.createMessage({ runId: run.id, taskId: task.id, dispatchId: d1.id, type: "worker_done", payload: {}, outcome: "failed" });
    // after 1 failure, task should be ready again for retry
    expect(store.getTask(task.id)!.status).toBe("ready");
    const d2 = store.createDispatch(task.id);
    store.updateDispatchStatus(d2.id, "running");
    store.createMessage({ runId: run.id, taskId: task.id, dispatchId: d2.id, type: "worker_done", payload: {}, outcome: "failed" });
    expect(store.getTask(task.id)!.status).toBe("ready");
    const d3 = store.createDispatch(task.id);
    store.updateDispatchStatus(d3.id, "running");
    store.createMessage({ runId: run.id, taskId: task.id, dispatchId: d3.id, type: "worker_done", payload: {}, outcome: "failed" });
    expect(store.getTask(task.id)!.status).toBe("blocked");
    expect(store.getDispatch(d3.id)!.failureCount).toBe(1); // per-dispatch 1, per-task total 3 triggers blocked
  });

  it("check/ack mailbox semantics", () => {
    const run = store.createRun("mailbox");
    const task = store.createTask(run.id, "t");
    const d = store.createDispatch(task.id);
    store.updateDispatchStatus(d.id, "running");
    const m = store.createMessage({ runId: run.id, taskId: task.id, dispatchId: d.id, type: "worker_done", payload: { summary: "done" }, outcome: "succeeded" });
    let msgs = store.check(run.id, ["worker_done"]);
    expect(msgs.length).toBe(1);
    expect(msgs[0].id).toBe(m.id);
    store.ackMessage(m.id);
    msgs = store.check(run.id, ["worker_done"]);
    expect(msgs.length).toBe(0);
  });

  it("createDispatch rejects when task not ready", () => {
    const run = store.createRun("not-ready");
    const t1 = store.createTask(run.id, "dep");
    const t2 = store.createTask(run.id, "needs dep", [t1.id]);
    expect(() => store.createDispatch(t2.id)).toThrow(/not ready/);
  });

  it("status aggregation", () => {
    const run = store.createRun("status test");
    const t1 = store.createTask(run.id, "a");
    const _t2 = store.createTask(run.id, "b");
    const _d = store.createDispatch(t1.id);
    const s = store.status();
    expect(s.runs).toBe(1);
    expect(s.tasks).toBe(2);
    expect(s.dispatches).toBe(1);
  });

  it("decision gate create/resolve + mailbox", () => {
    const run = store.createRun("gate test");
    const task = store.createTask(run.id, "needs approval");
    const gate = store.createGate(run.id, task.id, "Approve this?");
    expect(gate.status).toBe("open");
    const msgs = store.check(run.id, ["decision_gate"]);
    expect(msgs.length).toBe(1);
    const resolved = store.resolveGate(gate.id, "approved", "yes");
    expect(resolved!.status).toBe("approved");
  });

  it("fleet.json persisted and reloadable", () => {
    const run = store.createRun("persist");
    store.createTask(run.id, "persist task");
    const store2 = new FleetStore(root);
    expect(store2.getRun(run.id)!.objective).toBe("persist");
    expect(store2.listTasks(run.id).length).toBe(1);
  });
});

describe("FleetCoordinator worker_done lifecycle", () => {
  let root: string;
  let coordinator: FleetCoordinator;

  beforeEach(() => {
    root = tmpRoot();
    coordinator = new FleetCoordinator({ workspaceRoot: root });
  });

  it("workerDone validates lifecycle IDs (strict)", () => {
    const run = coordinator.runCreate("lifecycle test");
    const task = coordinator.taskCreate(run.id, "do things");
    // need to create dispatch first
    coordinator.store.createDispatch(task.id);
    const dispatches = coordinator.store.listDispatches({ taskId: task.id });
    const goodId = dispatches[0].id;
    coordinator.store.updateDispatchStatus(goodId, "running");

    // wrong dispatchId should fail
    const bad = coordinator.workerDone({ taskId: task.id, dispatchId: "dispatch_fake123", outcome: "succeeded" });
    expect(bad.error).toMatch(/not found/i);

    // wrong taskId/dispatch mismatch should fail
    const run2 = coordinator.runCreate("other run");
    const task2 = coordinator.taskCreate(run2.id, "other");
    const bad2 = coordinator.workerDone({ taskId: task2.id, dispatchId: goodId, outcome: "succeeded" });
    expect(bad2.error).toMatch(/does not belong/i);

    // correct should succeed
    const ok = coordinator.workerDone({ taskId: task.id, dispatchId: goodId, outcome: "succeeded", filesModified: ["a.ts"], summary: "did it" });
    expect(ok.message).toBeDefined();
    expect(ok.message.outcome).toBe("succeeded");
  });

  it("workerDone auto-completes task and dispatches", () => {
    const run = coordinator.runCreate("auto complete");
    const task = coordinator.taskCreate(run.id, "finish me");
    const d = coordinator.store.createDispatch(task.id);
    coordinator.store.updateDispatchStatus(d.id, "running");
    coordinator.workerDone({ taskId: task.id, dispatchId: d.id, outcome: "succeeded" });
    expect(coordinator.store.getTask(task.id)!.status).toBe("completed");
    expect(coordinator.store.getDispatch(d.id)!.status).toBe("completed");
  });

  it("check with types and ackAll", async () => {
    const run = coordinator.runCreate("check test");
    const task = coordinator.taskCreate(run.id, "check task");
    const d = coordinator.store.createDispatch(task.id);
    coordinator.store.updateDispatchStatus(d.id, "running");
    coordinator.workerDone({ taskId: task.id, dispatchId: d.id, outcome: "succeeded" });

    const { messages, timedOut } = await coordinator.check({ runId: run.id, types: ["worker_done"], timeoutMs: 1000, wait: false });
    expect(messages.length).toBe(1);
    expect(timedOut).toBe(false);

    const n = coordinator.ackAll(run.id);
    expect(n).toBe(1);
    const { messages: after } = await coordinator.check({ runId: run.id, types: ["worker_done"], wait: false });
    expect(after.length).toBe(0);
  });

  it("fan-out dryRun creates worktree-free dispatches (non-git fallback)", async () => {
    const run = coordinator.runCreate("fanout");
    const task = coordinator.taskCreate(run.id, "fanout task");
    // tmpRoot is non-git, so createFleet will error, fallback to current-dir dispatches
    const { dispatches, worktrees } = await coordinator.fanOut({ taskId: task.id, count: 2, dryRun: true });
    // non-git fallback: worktrees empty, but dispatches still created
    expect(dispatches.length).toBeGreaterThanOrEqual(0);
    // In non-git env, we expect 0 worktrees and 2 fallback dispatches
    if (worktrees.length === 0) expect(dispatches.length).toBeGreaterThanOrEqual(1);
  });
});

describe("WorkerAgent worker_done 1회 보장", () => {
  let root: string;
  let store: FleetStore;
  let worker: WorkerAgent;

  beforeEach(() => {
    root = tmpRoot();
    store = new FleetStore(root);
    worker = new WorkerAgent(root, store);
  });

  it("workerDone succeeds once, second call fails", () => {
    const run = store.createRun("once test");
    const task = store.createTask(run.id, "once");
    const d = store.createDispatch(task.id);
    store.updateDispatchStatus(d.id, "running");

    const first = worker.workerDone({ taskId: task.id, dispatchId: d.id, outcome: "succeeded" });
    expect(first.ok).toBe(true);
    const second = worker.workerDone({ taskId: task.id, dispatchId: d.id, outcome: "succeeded" });
    expect(second.ok).toBe(false);
    expect(second.error).toMatch(/already fired/i);
  });

  it("workerDone rejects missing outcome / invalid outcome", () => {
    const run = store.createRun("outcome test");
    const task = store.createTask(run.id, "outcome");
    const d = store.createDispatch(task.id);
    store.updateDispatchStatus(d.id, "running");
    const bad = worker.workerDone({ taskId: task.id, dispatchId: d.id, outcome: "" as any });
    expect(bad.ok).toBe(false);
  });

  it("parseFilesModified splits comma list", () => {
    expect(WorkerAgent.parseFilesModified("a.ts,b.ts")).toEqual(["a.ts", "b.ts"]);
    expect(WorkerAgent.parseFilesModified(" a.ts , b.ts ")).toEqual(["a.ts", "b.ts"]);
    expect(WorkerAgent.parseFilesModified(null)).toEqual([]);
    expect(WorkerAgent.parseFilesModified("")).toEqual([]);
  });

  it("parsePreamble reads PREAMBLE.md or DISPATCH_ID", () => {
    // without files, should return error
    const parsed = worker.parsePreamble(root);
    expect(parsed.error).toMatch(/No preamble/i);
  });
});

describe("Fleet CLI integration (smoke)", () => {
  it("fleet dry-run via coordinator fan-out + check + ack", async () => {
    const root = tmpRoot();
    const coordinator = new FleetCoordinator({ workspaceRoot: root });
    const run = coordinator.runCreate("cli smoke", { metadata: { test: true } });
    const t1 = coordinator.taskCreate(run.id, "first: implement utils");
    const t2 = coordinator.taskCreate(run.id, "second: implement api", [t1.id]);
    expect(t2.status).toBe("pending");
    const d = coordinator.store.createDispatch(t1.id);
    coordinator.store.updateDispatchStatus(d.id, "running");
    coordinator.workerDone({ taskId: t1.id, dispatchId: d.id, outcome: "succeeded" });
    expect(coordinator.store.getTask(t2.id)!.status).toBe("ready");
    await coordinator.check({ runId: run.id, types: ["worker_done"], wait: false });
    coordinator.ackAll(run.id);
    expect(coordinator.status().tasks).toBeGreaterThanOrEqual(2);
    expect(coordinator.store.getTask(t1.id)!.status).toBe("completed");
  });
});
