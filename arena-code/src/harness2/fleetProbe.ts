/**
 * Fleet Probe — Harness² × Fleet hybrid (Phase HF)
 * Orca Fleet orchestration을 Harness² Engine의 probe 실행에 주입
 *
 * Goal: Harness2Engine의 각 candidate probe를 Fleet Task→Dispatch→worker_done으로 실행
 *   - Audit: .arena/fleet.json 에 모든 probe 기록 (재현 가능)
 *   - DAG: step 간 의존성 (optional) — sequential mode는 deps로 표현 가능
 *   - Worktree: optional — useWorktrees=true면 FleetWorktreeManager.createFleet로 격리 실행
 *
 * 12살 설명: 요리 대회에서 각 요리사를 별도 주방(worktree)으로 보내고, 심판(코디네이터)이 결과를 모으는 것
 */

import { resolve, join } from "node:path";
import { randomUUID } from "node:crypto";
import type { Tree } from "./harness.js";
import type { RolloutView } from "./context.js";
import type { Provider } from "../providers/types.js";
import type { FleetCoordinator } from "../fleet/coordinator.js";
import { FleetCoordinator as FleetCoordinatorImpl } from "../fleet/coordinator.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface FleetProbeOptions {
  /** Fleet 활성화 — false면 defaultProbe와 동일 (no-op) */
  enabled?: boolean;
  /** 기존 Fleet Run 재사용 (없으면 taskPrompt로 새로 생성) */
  runId?: string;
  /** 작업 디렉토리 (FleetStore 루트) */
  workspaceRoot?: string;
  /** worktree 사용 — true면 createFleet으로 격리 (기본 false: current-dir) */
  useWorktrees?: boolean;
  /** 미리 생성된 coordinator (테스트용) — 없으면 workspaceRoot로 새로 생성 */
  coordinator?: FleetCoordinator;
  /** 각 probe에 붙일 preamble extra */
  preambleExtra?: string;
}

// ---------------------------------------------------------------------------
// Factory — ProbeFn을 Fleet-aware로 래핑
// ---------------------------------------------------------------------------

/**
 * Fleet-aware probeFn 생성
 * @param provider LLM Provider
 * @param taskPrompt 원본 작업 지시
 * @param cwd Probe 실행 cwd
 * @param fleetOpts Fleet 옵션
 * @param baseRunId Engine이 생성한 Fleet RunId (없으면 내부에서 생성)
 * @returns ProbeFn + runId (Evidence에 기록용)
 */
export function createFleetProbeFn(opts: {
  provider: Provider;
  taskPrompt: string;
  cwd: string;
  fleetOpts: FleetProbeOptions;
  engineTaskId: string; // e.g. "auth-login" or "auth-login#d1"
}): { probeFn: (harness: Tree, label: string) => Promise<RolloutView>; fleetRunId: string; coordinator: FleetCoordinator } {
  const cwd = resolve(opts.cwd);
  const workspaceRoot = resolve(opts.fleetOpts.workspaceRoot ?? cwd);
  const coordinator = opts.fleetOpts.coordinator ?? new FleetCoordinatorImpl({ workspaceRoot });

  // Fleet Run 확보 — engine 단위로 1개 Run, 그 아래 Task들이 probe들
  let fleetRunId = opts.fleetOpts.runId;
  if (!fleetRunId) {
    const run = coordinator.runCreate(`Harness² probe: ${opts.engineTaskId} — ${opts.taskPrompt.slice(0, 80)}`, {
      metadata: { engineTaskId: opts.engineTaskId, mode: "harness2-fleet" },
    });
    fleetRunId = run.id;
  }

  const probeFn = async (harness: Tree, label: string): Promise<RolloutView> => {
    // 1) Fleet Task 생성 — spec에 harness diff 요약 포함
    const harnessKeys = Object.keys(harness).join(", ").slice(0, 100);
    const spec = `[Harness² probe ${label}] task=${opts.engineTaskId} harnessKeys=${harnessKeys || "(empty)"} — ${opts.taskPrompt.slice(0, 80)}`;
    let taskId: string;
    try {
      const task = coordinator.taskCreate(fleetRunId, spec);
      taskId = task.id;
    } catch (e: unknown) {
      // Task 생성 실패 시 fallback to direct probe
      return directProbe(harness, label, opts.provider, opts.taskPrompt, cwd);
    }

    // 2) Dispatch 생성 (worktree optional)
    let worktreePath: string | null = null;
    if (opts.fleetOpts.useWorktrees) {
      try {
        // 단일 Task에 대해 1개 worktree 생성 (fan-out=1)
        const { worktrees } = await coordinator.fanOut({ taskId, count: 1 });
        if (worktrees.length > 0) worktreePath = worktrees[0];
      } catch {
        // non-git fallback — current dir
      }
    }

    const workerStartRes = await coordinator.workerStart({ taskId, worktreePath, provider: (opts.provider as unknown as { name?: string }).name ?? null });
    if (workerStartRes.error || !workerStartRes.dispatch) {
      return directProbe(harness, label, opts.provider, opts.taskPrompt, cwd);
    }
    const dispatch = workerStartRes.dispatch;

    // 3) 실제 Probe 실행 — harness를 systemExtra로 주입, Fleet dispatcher.runWorker 재활용
    const dispatchExtra = `You are Fleet worker ${dispatch.id} for Harness² probe ${label} (Fleet Task ${taskId}, Run ${fleetRunId}). When done, your deliverable will be scored by behavioral contrast.`;
    const harnessExtra = Object.entries(harness)
      .map(([rel, content]) => `### ${rel}\n${String(content).slice(0, 1500)}`)
      .join("\n\n");
    const systemExtra = [harnessExtra, dispatchExtra, opts.fleetOpts.preambleExtra ?? ""].filter(Boolean).join("\n\n");

    let rollout: RolloutView;
    try {
      // FleetDispatcher.runWorker는 내부적으로 queryLoop를 호출 — harnessExtra를 systemExtra로 전달
      // dryRun/mock은 합성 궤적 반환
      const workerRes = await coordinator.dispatcher.runWorker({
        dispatch,
        task: coordinator.store.getTask(taskId)!,
        provider: opts.provider,
        cwd: worktreePath ?? cwd,
        maxTurns: 6,
        systemExtra,
        dryRun: (opts.provider as unknown as { name?: string }).name === "mock" || process.env.ARENA_MOCK === "true",
      });

      rollout = {
        label,
        runId: dispatch.id, // Fleet dispatch id를 runId로 재사용 (추적성)
        ok: workerRes.ok,
        delivered: !!workerRes.deliverable && workerRes.deliverable.length > 20,
        trajectory: workerRes.trajectory || "(no output)",
        deliverable: workerRes.deliverable,
        // Fleet 메타 (UI에서 활용 가능) — RolloutView에 추가 필드는 미정의지만 trajectory에 기록
      };
    } catch (e: unknown) {
      rollout = {
        label,
        runId: dispatch.id,
        ok: false,
        delivered: false,
        trajectory: `fleet probe failed: ${e instanceof Error ? e.message : String(e)}`,
        error: e instanceof Error ? e.message : String(e),
      };
    }

    // 4) Fleet worker_done — lifecycle 엄격 검증, DAG unblock
    try {
      const outcome = rollout.ok ? "succeeded" : "failed";
      coordinator.workerDone({
        taskId,
        dispatchId: dispatch.id,
        outcome,
        filesModified: rollout.deliverable ? [label] : [],
        summary: `Harness² probe ${label}: ok=${rollout.ok} delivered=${rollout.delivered} trajectory.len=${rollout.trajectory.length}`,
      });
    } catch {
      // workerDone 실패는 rollout 결과에 영향 없음 — 이미 FleetStore에 기록될 수 있는 실패만
    }

    return rollout;
  };

  return { probeFn, fleetRunId, coordinator };
}

// ---------------------------------------------------------------------------
// Fallback direct probe (fleet 실패 시)
// ---------------------------------------------------------------------------

async function directProbe(
  harness: Tree,
  label: string,
  provider: Provider,
  taskPrompt: string,
  cwd: string,
): Promise<RolloutView> {
  if ((provider as unknown as { name?: string }).name === "mock" || process.env.ARENA_MOCK === "true") {
    const hint = Object.keys(harness).join(", ").slice(0, 80);
    return {
      label,
      runId: `mock-${randomUUID().slice(0, 8)}`,
      ok: true,
      delivered: true,
      trajectory: `[MOCK ${label}] harness: ${hint || "(base)"} | task: ${taskPrompt.slice(0, 60)}`,
      deliverable: `[MOCK deliverable ${label}] length=${80 + label.length * 10}`,
    };
  }
  try {
    const { queryLoop } = await import("../loop/queryLoop.js");
    const { buildRegistry } = await import("../tools/index.js");
    const registry = buildRegistry();
    const tools = registry.all();
    const messages: import("../providers/types.js").Message[] = [{ role: "user", content: taskPrompt }];
    const harnessExtra = Object.entries(harness).map(([rel, c]) => `### ${rel}\n${String(c).slice(0, 1500)}`).join("\n\n");
    const events: string[] = [];
    let deliverable = "";
    for await (const evt of queryLoop({ provider, tools, cwd, messages, systemExtra: harnessExtra, maxTurns: 6 })) {
      if (evt.type === "text" && evt.text) { events.push(evt.text); deliverable += evt.text; }
      else if (evt.type === "tool_start") events.push(`[tool:${evt.tool}]`);
      else if (evt.type === "tool_result") events.push(`[result:${evt.tool}] ${String(evt.result).slice(0, 200)}`);
    }
    return {
      label,
      runId: `probe-${randomUUID().slice(0, 8)}`,
      ok: events.length > 0,
      delivered: deliverable.length > 20,
      trajectory: events.join("\n") || "(no output)",
      deliverable: deliverable.slice(0, 5000) || undefined,
    };
  } catch (e: unknown) {
    return {
      label,
      runId: `error-${randomUUID().slice(0, 8)}`,
      ok: false,
      delivered: false,
      trajectory: `probe failed: ${e instanceof Error ? e.message : String(e)}`,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

// ---------------------------------------------------------------------------
// Batch helper — Engine의 inv/dom 2 probes를 Fleet로 병렬 실행
// ---------------------------------------------------------------------------

/**
 * Engine이 호출하는 batch runner — 2 candidates를 Fleet로 병렬 probe
 * 기존: await Promise.all([probeFn(invHarness, "inv-1"), probeFn(domHarness, "dom-1")])
 * 신규: createFleetProbeFn으로 각 후보를 Fleet Task/Dispatch로 실행
 */
export async function fleetProbeBatch(
  candidates: Array<{ label: string; harness: Tree }>,
  probeByLabel: Map<string, (harness: Tree, label: string) => Promise<RolloutView>>,
): Promise<Map<string, RolloutView>> {
  const results = await Promise.all(
    candidates.map(async ({ label, harness }) => {
      const fn = probeByLabel.get(label);
      if (!fn) throw new Error(`No probeFn for ${label}`);
      const rollout = await fn(harness, label);
      return [label, rollout] as const;
    })
  );
  return new Map(results);
}
