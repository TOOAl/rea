/**
 * Recurrent Depth — Phase H5 (GPT-6 Astra inspiration)
 * Google Harness² + GPT-6 Astra recurrent depth → Arena Code 포팅
 *
 * GPT-6 Astra 핵심: recurrent depth — 같은 문제를 여러 번 깊게 씹기
 *   - 1회 추론으로 끝내지 않고, 같은 작업에 대해 depth번 재연마
 *   - 얕은 넓이(breadth)보다 깊은 깊이(depth)가 중요한 작업에서 유리
 *   - Harness² sequential과 일치하지만, depth는 "합성본을 다음 단계 입력으로"를
 *     바깥 루프에서 또 감싸는 메타-재귀
 *
 * 우리 구현: Harness2Engine을 depth번 감싸는 Runner
 *   - 각 depth는 k*mode 1세트 (예: depth=3, k=2, parallel → 총 3*2=6 probe)
 *   - earlyStop: 개선이 없으면 중단 (비용 절약)
 *   - guard: 각 depth 후 환각 검사, 실패 시 힌트로 다음 depth 전략 보정
 *
 * 12살 설명: 숙제를 한 번 쓰고 끝이 아니라,
 * 선생님이 빨간 펜으로 고친 걸 보고 또 고치고, 또 고치는 것!
 * 깊게 씹을수록 더 좋아진다.
 */

import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

import type { Tree } from "./harness.js";
import { ARENA_SURFACE, writeTree as writeHarnessTree } from "./harness.js";
import { Harness2Engine, type EngineOptions, type EngineResult } from "./engine.js";
import { guardHarness, guardHint } from "./guard.js";
import type { FailureStore } from "./failures.js";
import type { Provider } from "../providers/types.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DepthOptions extends EngineOptions {
  /** recurrent depth — 1이면 H4와 동일, 2~5면 깊게 재연마 */
  depth?: number;
  /** earlyStop: 개선 없으면 중단 (기본 true) */
  earlyStop?: boolean;
  /** guard: 각 depth 후 환각 검사 (기본 true) */
  guard?: boolean;
  /** depth별 k 오버라이드 — 예: [1,2,3]이면 depth 1은 k=1,  depth 2는 k=2... */
  depthK?: number[];
}

export interface DepthResult extends EngineResult {
  depth: number;                         // 요청한 depth
  executedDepth: number;                 // 실제 실행한 depth (earlyStop으로 줄어들 수 있음)
  depthHistory: EngineResult[];           // 각 depth의 EngineResult
  bestHarness: Tree;                     // depth 중 가장 좋은 harness
  bestDepth: number;                     // bestHarness가 나온 depth (1-indexed)
  guardReports: Array<{ depth: number; ok: boolean; issues: string[]; warnings: string[] }>;
  depthNotes: string[];                  // 각 depth 요약
  fleetRunId?: string;
  fleetTaskIds?: string[];
}

// ---------------------------------------------------------------------------
// Runner
// ---------------------------------------------------------------------------

export class RecurrentDepthRunner {
  private provider: Provider;
  private engine: Harness2Engine;

  constructor(provider: Provider, engine?: Harness2Engine) {
    this.provider = provider;
    this.engine = engine ?? new Harness2Engine(provider);
  }

  async run(opts: DepthOptions): Promise<DepthResult> {
    const wantDepth = Math.max(1, Math.min(5, opts.depth ?? 1));
    const earlyStop = opts.earlyStop ?? true;
    const useGuard = opts.guard ?? true;
    const cwd = resolve(opts.cwd ?? process.cwd());
    const evidenceRoot = resolve(opts.evidenceRoot ?? join(cwd, ".arena", "harness2", "evidence"));

    const depthHistory: EngineResult[] = [];
    const guardReports: DepthResult["guardReports"] = [];
    const depthNotes: string[] = [];

    // Fleet hybrid — depth 전체를 하나의 Fleet Run으로 묶기 (audit trail)
    let fleetRunId: string | undefined = opts.fleet?.runId;
    let fleetCoordinator: unknown = opts.fleet?.coordinator;
    let allFleetTaskIds: string[] = [];
    if (opts.fleet?.enabled && !fleetRunId) {
      try {
        const { FleetCoordinator } = await import("../fleet/coordinator.js");
        const coord = (opts.fleet.coordinator as unknown) ?? new (FleetCoordinator as unknown as new (arg:any)=>unknown)({ workspaceRoot: cwd });
        fleetCoordinator = coord;
        const c = coord as unknown as { runCreate: (objective:string, opts:any)=>{id:string} };
        const run = c.runCreate(`Harness² Depth ${opts.taskId} depth=${wantDepth} k=${opts.k} — ${opts.taskPrompt.slice(0,60)}`, { metadata: { engineTaskId: opts.taskId, depth: wantDepth, mode: "harness2-depth-fleet" } });
        fleetRunId = run.id;
      } catch {}
    }

    let currentHarness: Tree = { ...opts.baseHarness };
    let bestHarness: Tree = { ...currentHarness };
    let bestDepth = 0;
    let bestScore = scoreHarness(currentHarness, null);

    // depth 루프
    for (let d = 1; d <= wantDepth; d++) {
      const kForDepth = opts.depthK?.[d - 1] ?? opts.k ?? 1;
      const modeForDepth = opts.mode ?? "parallel";
      const taskIdForDepth = `${opts.taskId}#d${d}`;

      // hint: 이전 guard 실패 힌트를 다음 depth의 taskPrompt에 주입 (프롬프트 보정)
      let taskPromptForDepth = opts.taskPrompt;
      const lastGuard = guardReports[guardReports.length - 1];
      if (lastGuard && !lastGuard.ok) {
        const hint = lastGuard.issues.join("; ").slice(0, 200);
        taskPromptForDepth += `\n\n[Recurrent Depth Hint — previous harness had issues: ${hint} — avoid these in this iteration. Focus on fixing them.]`;
      }

      const fleetForDepth = opts.fleet?.enabled ? { ...opts.fleet, runId: fleetRunId, coordinator: fleetCoordinator as unknown as import("../fleet/coordinator.js").FleetCoordinator } : undefined;
      const engineRes: EngineResult = await this.engine.run({
        ...opts,
        taskId: taskIdForDepth,
        taskPrompt: taskPromptForDepth,
        baseHarness: currentHarness,
        provider: this.provider,
        cwd,
        k: kForDepth,
        mode: modeForDepth,
        evidenceRoot,
        fleet: fleetForDepth,
      });
      if ((engineRes as unknown as { fleetTasks?: string[] }).fleetTasks) {
        for (const id of (((engineRes as unknown as { fleetTasks?: string[] }).fleetTasks) ?? [])) if (!allFleetTaskIds.includes(id)) allFleetTaskIds.push(id);
      }
      if ((engineRes as unknown as { fleetRunId?: string }).fleetRunId && !fleetRunId) fleetRunId = (engineRes as unknown as { fleetRunId?: string }).fleetRunId;

      depthHistory.push(engineRes);
      depthNotes.push(`Depth ${d}/${wantDepth}: k=${kForDepth} mode=${modeForDepth} keptBase=${engineRes.stages.some(s => s.keptBase)} finals=${engineRes.finals.join(",")} errors=${engineRes.errors.length}`);

      // guard 검사
      if (useGuard) {
        const report = guardHarness(engineRes.finalHarness);
        guardReports.push({ depth: d, ok: report.ok, issues: report.issues, warnings: report.warnings });
        if (!report.ok) {
          depthNotes[depthNotes.length - 1] += ` | GUARD ISSUES: ${report.issues.join(" | ").slice(0, 150)}`;
          // hint를 증거에 기록
          try {
            const hint = guardHint(report);
            if (hint) {
              const guardPath = join(evidenceRoot, `${taskIdForDepth}-step-1`, "guard-report.json");
              if (existsSync(join(evidenceRoot, `${taskIdForDepth}-step-1`))) {
                mkdirSync(join(evidenceRoot, `${taskIdForDepth}-step-1`), { recursive: true });
                writeFileSync(guardPath, JSON.stringify({ depth: d, report, hint }, null, 2), "utf-8");
              }
            }
          } catch {}
        }
      }

      // best 갱신 — score 기반
      const curScore = scoreHarness(engineRes.finalHarness, engineRes);
      if (curScore > bestScore) {
        bestScore = curScore;
        bestHarness = { ...engineRes.finalHarness };
        bestDepth = d;
      }

      // 다음 depth 입력 갱신 — 항상 최신 finalHarness로 (sequential carry와 동일 철학)
      currentHarness = { ...engineRes.finalHarness };

      // earlyStop: 두 depth 연속으로 개선이 없으면 중단 (비용 절약)
      if (earlyStop && d >= 2) {
        const prev = depthHistory[d - 2];
        const curr = depthHistory[d - 1];
        const bothKeptBase = prev.stages.every(s => s.keptBase || s.fellBack) && curr.stages.every(s => s.keptBase || s.fellBack);
        const noScoreGain = curScore <= scoreHarness(prev.finalHarness, prev);
        if (bothKeptBase || noScoreGain) {
          // 단, 마지막 depth가 guard 실패였다면 한 번 더 시도할 기회 부여 (최대 1회 연장)
          const lastGuardFailed = guardReports[guardReports.length - 1] && !guardReports[guardReports.length - 1].ok;
          if (!lastGuardFailed) {
            depthNotes.push(`Early stop at depth ${d} — no improvement (bothKeptBase=${bothKeptBase} noScoreGain=${noScoreGain})`);
            break;
          }
        }
      }
    }

    const executedDepth = depthHistory.length;
    // DepthResult는 마지막 EngineResult를 기반으로 하되 bestHarness를 final로
    const last = depthHistory[depthHistory.length - 1];
    // best가 마지막과 다르면 best를 최종으로 채택 (선택 UX)
    const finalHarness = bestDepth > 0 ? bestHarness : last.finalHarness;

    // depth 요약 기록 — 최상위 evidence에 depth-summary.json
    try {
      const summaryPath = join(evidenceRoot, `${opts.taskId}-depth-summary.json`);
      mkdirSync(evidenceRoot, { recursive: true });
      writeFileSync(summaryPath, JSON.stringify({
        taskId: opts.taskId,
        wantDepth,
        executedDepth,
        bestDepth: bestDepth || executedDepth,
        bestScore,
        depthNotes,
        guardReports,
        fleetRunId,
        fleetTaskIds: allFleetTaskIds,
        finals: depthHistory.map((r, i) => ({ depth: i + 1, finalKeys: Object.keys(r.finalHarness), keptBase: r.stages.some(s => s.keptBase), errors: r.errors.length })),
      }, null, 2), "utf-8");
    } catch {}

    // 전체 harness도 최종 depth 결과의 final-harness 위치에 best를 덮어쓰기 (재현용)
    if (bestDepth > 0 && bestDepth !== executedDepth) {
      try {
        const bestEvidenceDir = join(evidenceRoot, `${opts.taskId}#d${bestDepth}-step-1`, "final-harness");
        // bestHarness를 최상위 summary 옆에도 저장
        const bestPath = join(evidenceRoot, `${opts.taskId}-best-harness.json`);
        writeFileSync(bestPath, JSON.stringify({ bestDepth, bestScore, harness: bestHarness }, null, 2), "utf-8");
      } catch {}
    }

    return {
      taskId: opts.taskId,
      k: last.k,
      mode: last.mode,
      stages: depthHistory.flatMap(r => r.stages),
      trees: Object.fromEntries(depthHistory.flatMap((r, idx) => Object.entries(r.trees).map(([k, v]) => [`d${idx + 1}:${k}`, v]))),
      rollouts: Object.fromEntries(depthHistory.flatMap((r, idx) => Object.entries(r.rollouts).map(([k, v]) => [`d${idx + 1}:${k}`, v]))),
      finals: [`depth-${executedDepth}:compose-${last.k}`],
      finalHarness,
      ok: last.ok,
      errors: depthHistory.flatMap(r => r.errors),
      selection: last.selection,
      depth: wantDepth,
      executedDepth,
      depthHistory,
      bestHarness,
      bestDepth: bestDepth || executedDepth,
      guardReports,
      depthNotes,
      fleetRunId,
      fleetTaskIds: allFleetTaskIds,
    };
  }
}


/**
 * Harness 점수 — 높을수록 좋음
 * 휴리스틱: 파일 수 + guard 통과 + errors 적음 + deliverable 길이 (가능하면)
 * MVP: 단순히 파일 수와 errors로 판단, 나중에 LLM judge로 교체 가능
 */
function scoreHarness(harness: Tree, result: EngineResult | null): number {
  const fileCount = Object.keys(harness).length;
  const hasSkill = Object.keys(harness).some(k => k.startsWith("skills/"));
  const hasGuardrails = "guardrails.md" in harness;
  const errorPenalty = result ? result.errors.length * 2 : 0;
  // always-on 예산 초과 패널티
  const alwaysOnLen = ["AGENTS.md", "CLAUDE.md", "systemprompt.md", "guardrails.md"].map(k => (harness[k] ?? "").length).reduce((a, b) => a + b, 0);
  const overBudget = alwaysOnLen > 12000 ? 5 : 0;

  let score = fileCount * 10 + (hasSkill ? 15 : 0) + (hasGuardrails ? 5 : 0) - errorPenalty - overBudget;
  // deliverable 길이 보너스 (있으면)
  if (result?.rollouts) {
    const totalDeliv = Object.values(result.rollouts).reduce((a, r) => a + (r.deliverable?.length ?? 0), 0);
    score += Math.min(totalDeliv / 200, 10);
  }
  return score;
}

export async function runWithDepth(opts: DepthOptions): Promise<DepthResult> {
  const runner = new RecurrentDepthRunner(opts.provider);
  return runner.run(opts);
}

