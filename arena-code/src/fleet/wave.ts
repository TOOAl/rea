/**
 * Fleet Wave — intra-loop wave (Orca 흡수, 병렬 8.0→8.5)
 * 단일 Task 내에서 N개 하네스 후보를 maxConcurrent로 병렬 실행, durable queue(lease/lock) + aggregator wait_for_all
 * 12살 설명: 한 주방에서 요리사 4명이 동시에 다른 레시피로 요리하고, 모두 끝나면 심판이 한 번에 맛보기
 */
import type { Tree } from "../harness2/harness.js";
import type { RolloutView } from "../harness2/context.js";

export interface WaveOptions {
  maxConcurrent?: number; // Orca --max-concurrent N (기본 3)
  leaseMs?: number; // durable queue lease (기본 30s)
  timeoutMs?: number; // 전체 wave 타임아웃 (기본 60s)
}

export interface WaveTask {
  label: string;
  harness: Tree;
}

export interface WaveResult {
  rollouts: Map<string, RolloutView>;
  leased: number;
  timedOut: boolean;
  durationMs: number;
}

// Durable queue lease — 간단 메모리 락 (Ghidra durable queue lease/lock 패턴)
class LeaseQueue {
  private leased = new Set<string>();
  acquire(id: string): boolean {
    if (this.leased.has(id)) return false;
    this.leased.add(id);
    return true;
  }
  release(id: string) {
    this.leased.delete(id);
  }
  size() {
    return this.leased.size;
  }
}

export async function runWave(
  tasks: WaveTask[],
  probeFn: (harness: Tree, label: string) => Promise<RolloutView>,
  opts: WaveOptions = {},
): Promise<WaveResult> {
  const maxConcurrent = Math.max(1, Math.min(16, opts.maxConcurrent ?? 3));
  const timeoutMs = opts.timeoutMs ?? 60000;
  const start = Date.now();
  const queue = new LeaseQueue();
  const rollouts = new Map<string, RolloutView>();
  let timedOut = false;

  // concurrency limiter
  let idx = 0;
  const workers: Promise<void>[] = [];
  const runOne = async () => {
    while (idx < tasks.length) {
      if (Date.now() - start > timeoutMs) {
        timedOut = true;
        break;
      }
      const t = tasks[idx++];
      if (!queue.acquire(t.label)) continue; // leased
      try {
        const r = await probeFn(t.harness, t.label);
        rollouts.set(t.label, r);
      } finally {
        queue.release(t.label);
      }
    }
  };
  for (let i = 0; i < Math.min(maxConcurrent, tasks.length); i++)
    workers.push(runOne());
  // aggregator wait_for_all — Orca orchestration wait
  await Promise.all(workers);
  return {
    rollouts,
    leased: queue.size(),
    timedOut,
    durationMs: Date.now() - start,
  };
}

// Engine 통합 헬퍼 — Fleet Wave로 inv/dom 동시 실행 (기존 Promise.all 대체)
export async function fleetWaveBatch(
  candidates: WaveTask[],
  probeByLabel: Map<
    string,
    (harness: Tree, label: string) => Promise<RolloutView>
  >,
  opts: WaveOptions = {},
): Promise<Map<string, RolloutView>> {
  const probeFn = async (harness: Tree, label: string) => {
    const fn = probeByLabel.get(label);
    if (!fn) throw new Error(`No probeFn for ${label}`);
    return fn(harness, label);
  };
  const { rollouts } = await runWave(candidates, probeFn, opts);
  return rollouts;
}
