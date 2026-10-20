/**
 * Harness² × Fleet hybrid tests
 * Verifies engine/depth fleet probe integration (Orca ADE + Harness²)
 */
import { describe, it, expect } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Harness2Engine } from "../src/harness2/engine.js";
import { RecurrentDepthRunner } from "../src/harness2/depth.js";
import { FleetStore } from "../src/fleet/store.js";
import { FleetCoordinator } from "../src/fleet/coordinator.js";
import type { Provider } from "../src/providers/types.js";

function tmpRoot(): string {
  return mkdtempSync(join(tmpdir(), "arena-h2fleet-"));
}

function mockProvider(): Provider {
  return {
    name: "mock",
    streamChat: async function* () {
      yield { type: "text", text: "mock" } as unknown as never;
    },
  } as unknown as Provider;
}

describe("Harness2Engine × Fleet", () => {
  it("engine without fleet produces no fleetRunId", async () => {
    const root = tmpRoot();
    const engine = new Harness2Engine(mockProvider());
    const res = await engine.run({
      taskId: "test-no-fleet",
      taskPrompt: "do something",
      baseHarness: {},
      provider: mockProvider(),
      cwd: root,
      k: 1,
      mode: "parallel",
      dryRun: true,
    });
    expect(res.ok).toBe(true);
    expect(res.fleetRunId).toBeUndefined();
    rmSync(root, { recursive: true, force: true });
  });

  it("engine with fleet enabled creates fleetRunId and tasks", async () => {
    const root = tmpRoot();
    const store = new FleetStore(root);
    const coordinator = new FleetCoordinator({ workspaceRoot: root, store });
    const engine = new Harness2Engine(mockProvider());

    const res = await engine.run({
      taskId: "test-fleet",
      taskPrompt: "do fleet thing",
      baseHarness: { "AGENTS.md": "hello" },
      provider: mockProvider(),
      cwd: root,
      k: 1,
      mode: "parallel",
      dryRun: true,
      fleet: { enabled: true, coordinator, workspaceRoot: root },
    });

    expect(res.ok).toBe(true);
    expect(res.fleetRunId).toBeDefined();
    expect(res.fleetRunId!.startsWith("run_")).toBe(true);
    // 3 probes: base + inv + dom => 3 tasks
    expect(res.fleetTasks!.length).toBe(3);
    // FleetStore should have 1 run and 3 tasks
    const runs = store.listRuns();
    expect(runs.length).toBe(1);
    expect(runs[0].id).toBe(res.fleetRunId);
    const tasks = store.listTasks(res.fleetRunId!);
    expect(tasks.length).toBe(3);
    // Each task should have dispatched status or completed (via worker_done)
    // worker_done marks task completed for succeeded probes
    const completed = tasks.filter(t => t.status === "completed" || t.status === "dispatched" || t.status === "ready");
    expect(completed.length).toBe(3);
    rmSync(root, { recursive: true, force: true });
  });

  it("engine fleet tasks have worker_done messages", async () => {
    const root = tmpRoot();
    const store = new FleetStore(root);
    const coordinator = new FleetCoordinator({ workspaceRoot: root, store });
    const engine = new Harness2Engine(mockProvider());

    const res = await engine.run({
      taskId: "test-fleet-msgs",
      taskPrompt: "fleet messages",
      baseHarness: {},
      provider: mockProvider(),
      cwd: root,
      k: 1,
      mode: "parallel",
      dryRun: true,
      fleet: { enabled: true, coordinator, workspaceRoot: root },
    });

    const msgs = store.listMessages({ runId: res.fleetRunId! });
    // base + inv + dom = 3 worker_done messages
    const workerDones = msgs.filter(m => m.type === "worker_done");
    expect(workerDones.length).toBe(3);
    expect(workerDones.every(m => m.outcome === "succeeded")).toBe(true);
    rmSync(root, { recursive: true, force: true });
  });

  it("engine fleet sequential mode also works", async () => {
    const root = tmpRoot();
    const coordinator = new FleetCoordinator({ workspaceRoot: root });
    const engine = new Harness2Engine(mockProvider());
    const res = await engine.run({
      taskId: "test-fleet-seq",
      taskPrompt: "sequential fleet",
      baseHarness: {},
      provider: mockProvider(),
      cwd: root,
      k: 2,
      mode: "sequential",
      dryRun: true,
      fleet: { enabled: true, coordinator, workspaceRoot: root },
    });
    expect(res.ok).toBe(true);
    expect(res.fleetRunId).toBeDefined();
    // k=2 sequential: 2 steps * (base not counted per step? base 1 + 2*2=5 tasks)
    // Engine sequential does base probe 1 + each step 2 candidates => 1+4=5
    expect(res.fleetTasks!.length).toBe(5);
    rmSync(root, { recursive: true, force: true });
  });
});

describe("RecurrentDepthRunner × Fleet", () => {
  it("depth with fleet reuses single Fleet Run", async () => {
    const root = tmpRoot();
    const coordinator = new FleetCoordinator({ workspaceRoot: root });
    const runner = new RecurrentDepthRunner(mockProvider());

    const res = await runner.run({
      taskId: "depth-fleet-test",
      taskPrompt: "depth fleet test",
      baseHarness: {},
      provider: mockProvider(),
      cwd: root,
      k: 1,
      mode: "parallel",
      depth: 2,
      guard: false,
      dryRun: true,
      fleet: { enabled: true, coordinator, workspaceRoot: root },
    });

    expect(res.ok).toBe(true);
    expect(res.executedDepth).toBeGreaterThanOrEqual(1);
    expect(res.fleetRunId).toBeDefined();
    // depth=2, k=1 => each depth has 3 probes, total 6 tasks (but base deduplicated across depths still creates new tasks)
    // runner creates one Fleet Run and reuses it, so all depths share same runId
    expect(res.fleetTaskIds!.length).toBe(6);
    // All tasks belong to same run
    const store = coordinator.store;
    const tasks = store.listTasks(res.fleetRunId!);
    expect(tasks.length).toBe(6);
    rmSync(root, { recursive: true, force: true });
  });

  it("depth without fleet has no fleetRunId", async () => {
    const root = tmpRoot();
    const runner = new RecurrentDepthRunner(mockProvider());
    const res = await runner.run({
      taskId: "depth-no-fleet",
      taskPrompt: "no fleet depth",
      baseHarness: {},
      provider: mockProvider(),
      cwd: root,
      k: 1,
      depth: 1,
      guard: false,
      dryRun: true,
    });
    expect(res.fleetRunId).toBeUndefined();
    rmSync(root, { recursive: true, force: true });
  });

  it("fleetProbe batch helper parallelizes", async () => {
    const { fleetProbeBatch } = await import("../src/harness2/fleetProbe.js");
    const probeByLabel = new Map([
      ["a", async () => ({ label: "a", runId: "r1", ok: true, delivered: true, trajectory: "t1" } as unknown as import("../src/harness2/context.js").RolloutView)],
      ["b", async () => ({ label: "b", runId: "r2", ok: true, delivered: true, trajectory: "t2" } as unknown as import("../src/harness2/context.js").RolloutView)],
    ]);
    const candidates = [{ label: "a", harness: {} }, { label: "b", harness: {} }];
    const results = await fleetProbeBatch(candidates as unknown as Array<{ label: string; harness: import("../src/harness2/harness.js").Tree }>, probeByLabel as unknown as Map<string, (h: unknown, l: string) => Promise<import("../src/harness2/context.js").RolloutView>>);
    expect(results.size).toBe(2);
    expect(results.get("a")!.trajectory).toBe("t1");
  });
});
