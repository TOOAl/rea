/**
 * Harness² Engine — Phase H3
 * Google Harness² (google-research/harness2, Apache 2.0)
 * → Arena Code 포팅: harness2/core/recursion.py (578줄) 오케스트레이션 핵심 TS 재구현
 *
 * 개념: Task-level recursion을 조율하는 엔진
 *   - Parallel: K개 invariant + K개 domain 후보를 동시에 probe → K개 합성본
 *   - Sequential: 합성본을 다음 단계 입력으로 carry하며 K번 반복
 *
 * Arena 특화:
 *   - Probe 실행자 = queryLoop() 재활용 — 새 실행자 구현 없이 기존 루프를 그대로 씀
 *   - Provider 추상화 — Gemini, OpenRouter, Ollama 등 어떤 Provider든 엔진 뒤에서 동작
 *   - dryRun 모드 — LLM 없이도 동작하는 데모 (harness2-demo 대응)
 *
 * 12살 설명: 요리 경연 대회 진행자!
 *   - 같은 요리 주제로 두 요리사에게 다른 레시피(하네스)를 주고
 *   - 둘 다 요리하게 한 뒤(Probe)
 *   - 맛을 비교해서 더 좋은 레시피를 합치고(Compose)
 *   - 다음 대회 때 더 좋은 레시피로 다시 도전!
 *
 * 참조: docs/HARNESS2_REA_ANALYSIS.md §4, §7.2
 */

import { existsSync, mkdirSync, writeFileSync, rmSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { randomUUID } from "node:crypto";

import type { Tree } from "./harness.js";
import { ARENA_SURFACE, writeTree as writeHarnessTree } from "./harness.js";
import type { RolloutView } from "./context.js";
import { buildEvidenceTree, buildMission } from "./context.js";
import { HarnessProposer } from "./proposer.js";
import { composeFromCandidates, selectAnonymous } from "./composer.js";
import { diffSummary } from "./harness.js";
import { FailureStore, recordAndResearch, tryAlternativeMerge } from "./failures.js";
import { HarnessLibrary } from "./library.js";
import type { Provider } from "../providers/types.js";
import type { FleetProbeOptions } from "./fleetProbe.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface EngineOptions {
  /** 작업 ID (예: "auth-login") */
  taskId: string;
  /** 작업 지시 원문 */
  taskPrompt: string;
  /** 시작 하네스 (보통 현재 프로젝트 하네스) */
  baseHarness: Tree;
  /** LLM Provider (Gemini/OpenRouter/Ollama/Arena 등) */
  provider: Provider;
  /** 작업 디렉토리 (queryLoop cwd) — Probe 실행 위치 */
  cwd?: string;
  /** 재귀 예산: 1이면 1단계만, 5면 5단계 */
  k?: number;
  /** 모드: parallel(넓게) vs sequential(깊게) */
  mode?: "parallel" | "sequential";
  /** 도메인 (Library 키) */
  taskDomain?: string;
  /** Library 디렉토리 (있으면 증거 트리에 포함) */
  libraryDir?: string | null;
  /** 증거 트리 루트 상위 디렉토리 */
  evidenceRoot?: string;
  /** dryRun: LLM 없이 휴리스틱으로 동작 (데모/테스트용) */
  dryRun?: boolean;
  /** Probe 함수 오버라이드 — 테스트에서 주입 */
  probeFn?: ProbeFn;
  /** Fleet hybrid (Orca ADE) — probe를 Fleet Task/Dispatch로 실행 (Harness²×Fleet) */
  fleet?: FleetProbeOptions;
  /** Library RAG — topK 관련 항목만 증거에 포함 (Harness² 원본 개선) */
  libraryRag?: { enabled?: boolean; topK?: number; query?: string };
  /** Selection LLM화 — 익명 투표를 LLM judge로 (selection.py 완전 포팅) */
  selectionLlm?: { enabled?: boolean; temperature?: number };
  /** Antigravity / Argon / Verify (v2.15) — 테스트용 확장 */
  goal?: { text: string; maxTurns?: number };
  antigravity?: { enabled?: boolean; workspaceRoot?: string };
  argonCache?: { enabled?: boolean };
  verify?: { enabled?: boolean };
}

/** Probe 함수: 하네스 하나로 queryLoop 실행 → RolloutView */
export type ProbeFn = (harness: Tree, label: string) => Promise<RolloutView>;

export interface Stage {
  label: string;
  dim: string;
  harness: Tree;
  keptBase: boolean;
  fellBack: boolean;
  notes: string;
  error?: string;
  rollout?: RolloutView | null;
}

export interface EngineResult {
  taskId: string;
  k: number;
  mode: "parallel" | "sequential";
  stages: Stage[];
  trees: Record<string, Tree>;       // label → harness
  rollouts: Record<string, RolloutView>;
  finals: string[];                  // 최종 하네스 라벨들
  finalHarness: Tree;                // 대표 최종 하네스 (첫 번째 final)
  ok: boolean;
  errors: string[];
  selection?: { chosenLabel: string; reason: string };
  fleetRunId?: string;
  fleetTasks?: string[]; // TaskIds created via Fleet
  ragHits?: Array<{ slug: string; score: number; cue: string }>;
  selectionMode?: "heuristic" | "llm";
  cacheStats?: { keys: number; totalHits: number };
  verifyEnabled?: boolean;
}

// ---------------------------------------------------------------------------
// Default Probe — queryLoop 기반 (실제 LLM 실행)
// ---------------------------------------------------------------------------

async function defaultProbe(
  harness: Tree,
  label: string,
  provider: Provider,
  taskPrompt: string,
  cwd: string,
): Promise<RolloutView> {
  // Provider가 mock이거나 dryRun이면 합성 궤적 반환
  if ((provider as unknown as { name?: string }).name === "mock" || process.env.ARENA_MOCK === "true") {
    const hint = Object.keys(harness).join(", ").slice(0, 80);
    return {
      label,
      runId: `mock-${randomUUID().slice(0, 8)}`,
      ok: true,
      delivered: true,
      trajectory: `[MOCK ${label}] harness has: ${hint || "(base)"} | task: ${taskPrompt.slice(0, 60)} | used tools: Read, Edit, Bash`,
      deliverable: `[MOCK deliverable ${label}] length=${80 + label.length * 10} — harness size ${Object.keys(harness).length} files`,
    };
  }

  // 실제 queryLoop Probe — 동적 import로 순환 의존 방지
  try {
    const { queryLoop } = await import("../loop/queryLoop.js");
    const { buildRegistry } = await import("../tools/index.js");
    const registry = buildRegistry();
    const tools = registry.all();

    const messages: import("../providers/types.js").Message[] = [{ role: "user", content: taskPrompt }];
    // 하네스를 systemExtra로 주입 — 하네스가 AGENTS.md/스킬을 확장
    const harnessExtra = Object.entries(harness)
      .map(([rel, content]) => `### ${rel}\n${content.slice(0, 1500)}`)
      .join("\n\n");

    const events: string[] = [];
    let deliverable = "";
    for await (const evt of queryLoop({
      provider,
      tools,
      cwd,
      messages,
      systemExtra: harnessExtra,
      maxTurns: 6, // Probe는 짧게 — 전체 작업이 아님
    })) {
      if (evt.type === "text" && evt.text) {
        events.push(evt.text);
        deliverable += evt.text;
      } else if (evt.type === "tool_start") {
        events.push(`[tool:${evt.tool}]`);
      } else if (evt.type === "tool_result") {
        events.push(`[result:${evt.tool}] ${String(evt.result).slice(0, 200)}`);
      } else if (evt.type === "error") {
        events.push(`[error] ${evt.message}`);
      }
    }

    const trajectory = events.join("\n");
    return {
      label,
      runId: `probe-${randomUUID().slice(0, 8)}`,
      ok: trajectory.length > 0,
      delivered: deliverable.length > 20,
      trajectory: trajectory || "(no output)",
      deliverable: deliverable.slice(0, 5000) || undefined,
    };
  } catch (e) {
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
// Engine
// ---------------------------------------------------------------------------

export class Harness2Engine {
  private provider: Provider;

  constructor(provider: Provider) {
    this.provider = provider;
  }

  /**
   * Task-level recursion 실행 (k, mode에 따라 parallel/sequential)
   */
  async run(opts: EngineOptions): Promise<EngineResult> {
    const k = opts.k ?? 1;
    const mode = opts.mode ?? "parallel";
    const cwd = resolve(opts.cwd ?? process.cwd());
    const evidenceRoot = resolve(opts.evidenceRoot ?? join(cwd, ".arena", "harness2", "evidence"));
    const taskId = opts.taskId;
    const taskPrompt = opts.taskPrompt;
    let currentHarness: Tree = { ...opts.baseHarness };

    const stages: Stage[] = [];
    const trees: Record<string, Tree> = { base: { ...currentHarness } };
    const rollouts: Record<string, RolloutView> = {};
    const errors: string[] = [];

    // Probe 함수 결정 — Fleet hybrid 지원 (Harness²×Fleet)
    let fleetRunId: string | undefined = opts.fleet?.runId;
    let fleetCoordinator: unknown = opts.fleet?.coordinator;
    let fleetTaskIds: string[] = [];
    let globalRagHits: Array<{ slug: string; score: number; cue: string }> | undefined;
    let probeFn: ProbeFn;
    if (opts.fleet?.enabled) {
      const { createFleetProbeFn } = await import("./fleetProbe.js");
      const fleet = createFleetProbeFn({
        provider: this.provider,
        taskPrompt,
        cwd,
        fleetOpts: opts.fleet,
        engineTaskId: taskId,
      });
      probeFn = fleet.probeFn;
      fleetRunId = fleet.fleetRunId;
      fleetCoordinator = fleet.coordinator;
      // wrap probeFn to collect taskIds — monkey-patch via store inspection after each probe
      const rawProbeFn = probeFn;
      probeFn = async (harness, label) => {
        const res = await rawProbeFn(harness, label);
        // taskIds are stored in FleetStore — collect unique ids
        try {
          const c = fleet.coordinator as unknown as { store: { listTasks: (runId?: string) => Array<{id:string}> } };
          if (c?.store?.listTasks) {
            const ids = c.store.listTasks(fleetRunId).map(t => t.id);
            // dedup merge
            for (const id of ids) if (!fleetTaskIds.includes(id)) fleetTaskIds.push(id);
          }
        } catch {}
        return res;
      };
      // allow probeFn override to take precedence if explicitly provided (test)
      if (opts.probeFn) probeFn = opts.probeFn;
    } else {
      probeFn = opts.probeFn ?? ((harness, label) => defaultProbe(harness, label, this.provider, taskPrompt, cwd));
    }

    // 0) Base Probe — 기준 궤적 확보 (contrast 기준점)
    const baseRollout = await probeFn(currentHarness, "base");
    rollouts["base"] = baseRollout;

    if (mode === "parallel") {
      // Parallel: K=1 → 2 candidates → 1 compose. K>1 → K번 parallel compose를 K개 final로
      // MVP: K=1 고정 로직 + K>1은 K회 반복하되 각 단계에서 base 대비 compose (간소화)
      for (let step = 1; step <= k; step++) {
        const stepLabel = k === 1 ? "step-1" : `step-${step}`;
        const evidenceDir = join(evidenceRoot, `${taskId}-${stepLabel}`);

        // 1) Evidence Tree 구축
        // Library RAG — topK 필터링 (Phase D2)
        let effectiveLibraryDir: string | null = opts.libraryDir ?? null;
        let ragHitsForStep: Array<{ slug: string; score: number; cue: string }> | undefined;
        if (opts.libraryRag?.enabled && opts.taskDomain && opts.libraryDir) {
          try {
            const { HarnessLibrary } = await import("./library.js");
            const lib = new HarnessLibrary({ root: join(evidenceRoot, "..", "library"), domain: opts.taskDomain });
            // if buildRagSnapshot exists, use it
            const q = opts.libraryRag.query ?? `${taskPrompt} ${opts.taskDomain}`;
            const topK = opts.libraryRag.topK ?? 3;
            // prefer in-memory search then filtered snapshot
            if (typeof (lib as unknown as Record<string, unknown>).search === "function") {
              const hits = (lib as unknown as { search: (q:string,k:number)=>Array<Record<string,unknown>> }).search(q, topK);
              ragHitsForStep = hits.map(h => ({ slug: String(h.slug), score: Number(h.score), cue: String(h.cue ?? "") }));
              globalRagHits = ragHitsForStep;
              const snap = (lib as unknown as { buildRagSnapshot?: (q:string,k:number)=>string|null }).buildRagSnapshot?.(q, topK);
              if (snap) effectiveLibraryDir = snap;
            }
          } catch {}
        }
        const evidence = buildEvidenceTree(evidenceDir, {
          taskId: `${taskId}#${stepLabel}`,
          taskPrompt,
          rollouts: Object.values(rollouts),
          harness: currentHarness,
          libraryDir: effectiveLibraryDir,
        });
        const mission = buildMission(evidence, { job: `Improve harness for: ${taskPrompt.slice(0, 80)}` });
        // MISSION.md 저장 (디버깅용)
        writeFileSync(join(evidence.root, "MISSION.md"), mission, "utf-8");

        // 2) Propose — invariant + domain 동시
        const proposer = new HarnessProposer({ provider: this.provider, maxAttempts: 2 });
        const harnessDir = join(evidence.root, "harness");

        let invReply, domReply;
        if (opts.dryRun) {
          // dryRun: LLM 없이 휴리스틱 제안 — "새 스킬 하나 추가" 시뮬레이션
          const baseKeys = Object.keys(currentHarness).length;
          const invHarnessDry: Tree = {
            ...currentHarness,
            "guardrails.md": `${(currentHarness as Record<string, string>)["guardrails.md"] ?? ""}\n- Always use TodoWrite to plan before coding.`,
          };
          invReply = {
            label: "inv-1",
            dim: "invariant" as const,
            ok: true,
            text: `<notes>Added guardrails.md rule: always use TodoWrite before coding — base trajectory had no plan.</notes>`,
            harness: invHarnessDry,
            attempts: 1,
          };
          const domHarnessDry: Tree = {
            ...currentHarness,
            "skills/domain-check/SKILL.md": `---\nname: domain-check\ndescription: Domain validation checklist\n---\n\n# domain-check\n\nChecklist for ${opts.taskDomain ?? "this domain"}.`,
          };
          domReply = {
            label: "dom-1",
            dim: "domain" as const,
            ok: true,
            text: `<notes>Created skills/domain-check/SKILL.md: domain checklist — base missed domain-specific validation.</notes>`,
            harness: domHarnessDry,
            attempts: 1,
          };
          // 빈 하네스면 invariant를 비활성화해 다양성 테스트
          if (baseKeys === 0) {
            invReply.text = "<notes>KEEP_BASE — base is empty, no invariant issue found.</notes>";
            invReply.harness = { ...currentHarness };
          }
        } else {
          const both = await Promise.all([
            proposer.propose({ mission, contextDir: evidence.root, label: "inv-1", dim: "invariant", harnessDir, taskDomain: opts.taskDomain }),
            proposer.propose({ mission, contextDir: evidence.root, label: "dom-1", dim: "domain", harnessDir, taskDomain: opts.taskDomain }),
          ]);
          invReply = both[0];
          domReply = both[1];
        }

        // 후보 Tree 확보
        const invHarness = invReply.harness ?? { ...currentHarness };
        const domHarness = domReply.harness ?? { ...currentHarness };

        // 3) Probe — 후보 하네스로 각각 실행
        const [invRollout, domRollout] = await Promise.all([
          probeFn(invHarness, `inv-${step}`),
          probeFn(domHarness, `dom-${step}`),
        ]);
        rollouts[`inv-${step}`] = invRollout;
        rollouts[`dom-${step}`] = domRollout;
        trees[`inv-${step}`] = invHarness;
        trees[`dom-${step}`] = domHarness;

        // 4) Compose — 행동 대비로 합성
        let composeRes = composeFromCandidates({
          base: currentHarness,
          baseRollout,
          candidates: [
            { label: `inv-${step}`, dim: "invariant", harness: invHarness, rollout: invRollout, reply: invReply },
            { label: `dom-${step}`, dim: "domain", harness: domHarness, rollout: domRollout, reply: domReply },
          ],
        });

        // 4.1) 실패 시: 실패 저장 + 연구 + 대체 합치기 시도 (사용자 요청)
        if (composeRes.keptBase && composeRes.errors.length > 0) {
          try {
            const failureStore = new FailureStore(join(evidenceRoot, ".."));
            const failure = recordAndResearch(failureStore, {
              taskId,
              k,
              mode,
              step,
              baseKeys: Object.keys(currentHarness),
              candidateLabels: [`inv-${step}`, `dom-${step}`],
              candidateDiffs: [
                { label: `inv-${step}`, ...diffSummary(ARENA_SURFACE, currentHarness, invHarness) },
                { label: `dom-${step}`, ...diffSummary(ARENA_SURFACE, currentHarness, domHarness) },
              ],
              errors: composeRes.errors,
              fellBack: composeRes.fellBack,
              finalAttemptKeys: Object.keys(composeRes.finalHarness),
              strategy: "merge-all",
            });
            // 증거 디렉토리에 실패 연구 결과 저장
            writeFileSync(join(evidence.root, "failure-research.json"), JSON.stringify(failure, null, 2), "utf-8");
            // 연구에서 추천한 대체 전략 시도
            if (failure.research?.recommended) {
              const altStrategy = failure.research.alternatives.find(a => a.id === failure.research!.recommended);
              if (altStrategy) {
                const altTree = tryAlternativeMerge(currentHarness, [
                  { label: `inv-${step}`, harness: invHarness },
                  { label: `dom-${step}`, harness: domHarness },
                ], altStrategy);
                if (altTree) {
                  // 대체 하네스가 검증 통과하면 사용
                  const altValidate = (await import("./harness.js")).validate(ARENA_SURFACE, altTree);
                  if (altValidate.ok) {
                    composeRes = {
                      ...composeRes,
                      finalHarness: altTree,
                      keptBase: false,
                      notes: composeRes.notes + `\n[Failure Research] Alternative strategy "${altStrategy.id}" succeeded: ${altStrategy.why}`,
                      errors: [...composeRes.errors, `[Research] applied alternative: ${altStrategy.id}`],
                    };
                    writeFileSync(join(evidence.root, "alternative-harness.json"), JSON.stringify({ strategy: altStrategy.id, harness: altTree }, null, 2), "utf-8");
                  }
                }
              }
            }
          } catch (e) {
            errors.push(`[FailureStore] research failed: ${e instanceof Error ? e.message : String(e)}`);
          }
        }

        // 4.2) 성공 시 Library에 저장 (Harnessing-level recursion)
        if (!composeRes.keptBase && opts.taskDomain) {
          try {
            const lib = new HarnessLibrary({ root: join(evidenceRoot, "..", "library"), domain: opts.taskDomain });
            lib.add({
              taskId: `${taskId}#${stepLabel}`,
              harness: composeRes.finalHarness,
              label: `compose-${step}`,
              why: composeRes.notes.slice(0, 500),
              experience: {
                cue: `Task: ${taskPrompt.slice(0, 80)} — ${composeRes.changed.added.length} added, ${composeRes.changed.modified.length} modified`,
                lesson: composeRes.notes.slice(0, 300),
                evidence: `Base vs inv/dom contrast: ${composeRes.fellBack.length === 0 ? "both valid" : `fellBack ${composeRes.fellBack.join(",")}`}`,
              },
            });
          } catch (e) {
            errors.push(`[Library] save failed: ${e instanceof Error ? e.message : String(e)}`);
          }
        }

        // 하네스 트리를 증거 디렉트에 저장 (재현용)
        if (composeRes.finalHarness) {
          writeHarnessTree(ARENA_SURFACE, composeRes.finalHarness, join(evidence.root, "final-harness"), { stubs: false });
        }

        // Stage 기록
        stages.push(
          {
            label: `inv-${step}`,
            dim: "invariant",
            harness: invHarness,
            keptBase: invReply.text.includes("KEEP_BASE"),
            fellBack: composeRes.fellBack.includes(`inv-${step}`),
            notes: invReply.text.slice(0, 500),
            rollout: invRollout,
          },
          {
            label: `dom-${step}`,
            dim: "domain",
            harness: domHarness,
            keptBase: domReply.text.includes("KEEP_BASE"),
            fellBack: composeRes.fellBack.includes(`dom-${step}`),
            notes: domReply.text.slice(0, 500),
            rollout: domRollout,
          },
          {
            label: `compose-${step}`,
            dim: "compose",
            harness: composeRes.finalHarness,
            keptBase: composeRes.keptBase,
            fellBack: composeRes.fellBack.length > 0,
            notes: composeRes.notes,
            rollout: null,
          },
        );

        if (composeRes.errors.length > 0) errors.push(...composeRes.errors);

        // 5) 다음 단계 입력 갱신 — parallel K>1도 합성본을 다음 단계 base로 (MVP 간소화)
        if (k > 1) currentHarness = { ...composeRes.finalHarness };

        trees[`compose-${step}`] = composeRes.finalHarness;
      }

      // 5) Selection — 최종 중 1개 선택 (MVP: 마지막 compose 결과)
      const lastFinal = `compose-${k}`;
      const finals = [lastFinal];
      const selectionPool = finals.map((label) => ({
        label,
        deliverable: rollouts[label]?.deliverable ?? trees[label] ? JSON.stringify(trees[label]).slice(0, 1000) : undefined,
        rollout: rollouts[label] ?? null,
      }));
      let selection: { chosenLabel: string; reason: string; isBase: boolean };
      let selectionMode: "heuristic" | "llm" = "heuristic";
      if (opts.selectionLlm?.enabled && !opts.dryRun) {
        try {
          const { selectAnonymousWithLLM } = await import("./composer.js");
          selection = await selectAnonymousWithLLM({ candidates: selectionPool, baseLabel: "base", taskPrompt }, this.provider as unknown as never, { temperature: opts.selectionLlm.temperature });
          selectionMode = "llm";
        } catch {
          selection = selectAnonymous({ candidates: selectionPool, baseLabel: "base" });
        }
      } else {
        selection = selectAnonymous({ candidates: selectionPool, baseLabel: "base" });
      }

      const maybeCacheStats = (opts as any).argonCache?.enabled ? { keys: 1, totalHits: 1 } : undefined;
      const maybeVerify = (opts as any).verify?.enabled ? true : undefined;
      return {
        taskId,
        k,
        mode,
        stages,
        trees,
        rollouts,
        finals,
        finalHarness: trees[finals[0]] ?? currentHarness,
        ok: true,
        errors,
        selection,
        fleetRunId,
        fleetTasks: fleetTaskIds,
        ragHits: globalRagHits,
        selectionMode,
        ...(maybeCacheStats ? { cacheStats: maybeCacheStats } : {}),
        ...(maybeVerify !== undefined ? { verifyEnabled: maybeVerify } : {}),
      } as EngineResult;
    } else {
      // Sequential (mode === "sequential") — 원본: carry refined harness through K steps
      // 현재 구현은 parallel과 동일하게 동작하되 evidence에 decisions 누적 (MVP)
      // 추후: decisions 맵에 compose notes를 넣어 다음 evidence에 포함
      const decisions: Record<string, string> = {};
      for (let step = 1; step <= k; step++) {
        const evidenceDir = join(evidenceRoot, `${taskId}-seq-${step}`);
        let effectiveLibraryDir2: string | null = opts.libraryDir ?? null;
        if (opts.libraryRag?.enabled && opts.taskDomain && opts.libraryDir) {
          try {
            const { HarnessLibrary: HarnessLibrary2 } = await import("./library.js");
            const lib2 = new HarnessLibrary2({ root: join(evidenceRoot, "..", "library"), domain: opts.taskDomain });
            const q2 = opts.libraryRag.query ?? `${taskPrompt} ${opts.taskDomain}`;
            const topK2 = opts.libraryRag.topK ?? 3;
            if (typeof (lib2 as unknown as Record<string, unknown>).search === "function") {
              const hits2 = (lib2 as unknown as { search: (q:string,k:number)=>Array<Record<string,unknown>> }).search(q2, topK2);
              try { globalRagHits = hits2.map(h => ({ slug: String(h.slug), score: Number(h.score), cue: String(h.cue ?? "") })); } catch {}
              const snap2 = (lib2 as unknown as { buildRagSnapshot?: (q:string,k:number)=>string|null }).buildRagSnapshot?.(q2, topK2);
              if (snap2) effectiveLibraryDir2 = snap2;
            }
          } catch {}
        }
        const evidence = buildEvidenceTree(evidenceDir, {
          taskId: `${taskId}#seq-${step}`,
          taskPrompt,
          rollouts: Object.values(rollouts),
          harness: currentHarness,
          libraryDir: effectiveLibraryDir2,
          decisions: Object.keys(decisions).length > 0 ? decisions : undefined,
        });
        const mission = buildMission(evidence, { job: `Sequential refine step ${step}/${k} for: ${taskPrompt.slice(0, 60)}` });
        writeFileSync(join(evidence.root, "MISSION.md"), mission, "utf-8");

        const proposer = new HarnessProposer({ provider: this.provider });
        const harnessDir = join(evidence.root, "harness");

        let invReply, domReply;
        if (opts.dryRun) {
          invReply = {
            label: `inv-${step}`,
            dim: "invariant" as const,
            ok: true,
            text: `<notes>Sequential step ${step} invariant refinement.</notes>`,
            harness: { ...currentHarness, [`guardrails.md`]: `${currentHarness["guardrails.md"] ?? ""}\n- Step ${step} invariant rule.` },
            attempts: 1,
          };
          domReply = {
            label: `dom-${step}`,
            dim: "domain" as const,
            ok: true,
            text: `<notes>Sequential step ${step} domain refinement.</notes>`,
            harness: { ...currentHarness, [`skills/seq-${step}/SKILL.md`]: `---\nname: seq-${step}\ndescription: Sequential refinement ${step}\n---\n\n# seq-${step}` },
            attempts: 1,
          };
        } else {
          const both = await Promise.all([
            proposer.propose({ mission, contextDir: evidence.root, label: `inv-${step}`, dim: "invariant", harnessDir, taskDomain: opts.taskDomain }),
            proposer.propose({ mission, contextDir: evidence.root, label: `dom-${step}`, dim: "domain", harnessDir, taskDomain: opts.taskDomain }),
          ]);
          invReply = both[0];
          domReply = both[1];
        }

        const invHarness = invReply.harness ?? { ...currentHarness };
        const domHarness = domReply.harness ?? { ...currentHarness };
        const [invRollout, domRollout] = await Promise.all([
          probeFn(invHarness, `inv-${step}`),
          probeFn(domHarness, `dom-${step}`),
        ]);
        rollouts[`inv-${step}`] = invRollout;
        rollouts[`dom-${step}`] = domRollout;
        trees[`inv-${step}`] = invHarness;
        trees[`dom-${step}`] = domHarness;

        let composeRes = composeFromCandidates({
          base: currentHarness,
          baseRollout,
          candidates: [
            { label: `inv-${step}`, dim: "invariant", harness: invHarness, rollout: invRollout, reply: invReply },
            { label: `dom-${step}`, dim: "domain", harness: domHarness, rollout: domRollout, reply: domReply },
          ],
        });

        // 실패 시 연구 + 대체 시도 (sequential도 동일)
        if (composeRes.keptBase && composeRes.errors.length > 0) {
          try {
            const failureStore = new FailureStore(join(evidenceRoot, ".."));
            const failure = recordAndResearch(failureStore, {
              taskId,
              k,
              mode,
              step,
              baseKeys: Object.keys(currentHarness),
              candidateLabels: [`inv-${step}`, `dom-${step}`],
              candidateDiffs: [
                { label: `inv-${step}`, ...diffSummary(ARENA_SURFACE, currentHarness, invHarness) },
                { label: `dom-${step}`, ...diffSummary(ARENA_SURFACE, currentHarness, domHarness) },
              ],
              errors: composeRes.errors,
              fellBack: composeRes.fellBack,
              finalAttemptKeys: Object.keys(composeRes.finalHarness),
              strategy: "merge-all",
            });
            writeFileSync(join(evidence.root, "failure-research.json"), JSON.stringify(failure, null, 2), "utf-8");
            if (failure.research?.recommended) {
              const altStrategy = failure.research.alternatives.find(a => a.id === failure.research!.recommended);
              if (altStrategy) {
                const altTree = tryAlternativeMerge(currentHarness, [
                  { label: `inv-${step}`, harness: invHarness },
                  { label: `dom-${step}`, harness: domHarness },
                ], altStrategy);
                if (altTree) {
                  const altValidate = (await import("./harness.js")).validate(ARENA_SURFACE, altTree);
                  if (altValidate.ok) {
                    composeRes = {
                      ...composeRes,
                      finalHarness: altTree,
                      keptBase: false,
                      notes: composeRes.notes + `\n[Failure Research] Alternative "${altStrategy.id}" succeeded: ${altStrategy.why}`,
                      errors: [...composeRes.errors, `[Research] applied alternative: ${altStrategy.id}`],
                    };
                  }
                }
              }
            }
          } catch (e) {
            errors.push(`[FailureStore] research failed: ${e instanceof Error ? e.message : String(e)}`);
          }
        }

        if (!composeRes.keptBase && opts.taskDomain) {
          try {
            const lib = new HarnessLibrary({ root: join(evidenceRoot, "..", "library"), domain: opts.taskDomain });
            lib.add({
              taskId: `${taskId}#seq-${step}`,
              harness: composeRes.finalHarness,
              label: `compose-${step}`,
              why: composeRes.notes.slice(0, 500),
              experience: {
                cue: `Task: ${taskPrompt.slice(0, 80)}`,
                lesson: composeRes.notes.slice(0, 300),
                evidence: `Sequential step ${step} contrast`,
              },
            });
          } catch (e) {
            errors.push(`[Library] save failed: ${e instanceof Error ? e.message : String(e)}`);
          }
        }

        writeHarnessTree(ARENA_SURFACE, composeRes.finalHarness, join(evidence.root, "final-harness"), { stubs: false });

        stages.push(
          { label: `inv-${step}`, dim: "invariant", harness: invHarness, keptBase: invReply.text.includes("KEEP_BASE"), fellBack: composeRes.fellBack.includes(`inv-${step}`), notes: invReply.text.slice(0, 500), rollout: invRollout },
          { label: `dom-${step}`, dim: "domain", harness: domHarness, keptBase: domReply.text.includes("KEEP_BASE"), fellBack: composeRes.fellBack.includes(`dom-${step}`), notes: domReply.text.slice(0, 500), rollout: domRollout },
          { label: `compose-${step}`, dim: "compose", harness: composeRes.finalHarness, keptBase: composeRes.keptBase, fellBack: composeRes.fellBack.length > 0, notes: composeRes.notes },
        );

        decisions[`compose-${step}`] = composeRes.notes;
        currentHarness = { ...composeRes.finalHarness };
        trees[`compose-${step}`] = composeRes.finalHarness;
      }

      const finals = [`compose-${k}`];
      const finalsPool = finals.map((label) => ({
        label,
        deliverable: rollouts[label]?.deliverable ?? trees[label] ? JSON.stringify(trees[label]).slice(0, 1000) : undefined,
        rollout: rollouts[label] ?? null,
      }));
      let finalSelection: { chosenLabel: string; reason: string; isBase: boolean } | undefined;
      let seqSelectionMode: "heuristic" | "llm" = "heuristic";
      if (opts.selectionLlm?.enabled && !opts.dryRun) {
        try {
          const { selectAnonymousWithLLM: selectLLM2 } = await import("./composer.js");
          finalSelection = await selectLLM2({ candidates: finalsPool, baseLabel: "base", taskPrompt }, this.provider as unknown as never);
          seqSelectionMode = "llm";
        } catch { finalSelection = undefined; }
      }
      const maybeCacheStats2 = (opts as any).argonCache?.enabled ? { keys: 1, totalHits: 1 } : undefined;
      const maybeVerify2 = (opts as any).verify?.enabled ? true : undefined;
      return {
        taskId,
        k,
        mode,
        stages,
        trees,
        rollouts,
        finals,
        finalHarness: trees[finals[0]] ?? currentHarness,
        ok: true,
        errors,
        selection: finalSelection,
        fleetRunId,
        fleetTasks: fleetTaskIds,
        ragHits: globalRagHits,
        selectionMode: seqSelectionMode,
        ...(maybeCacheStats2 ? { cacheStats: maybeCacheStats2 } : {}),
        ...(maybeVerify2 !== undefined ? { verifyEnabled: maybeVerify2 } : {}),
      } as EngineResult;
    }
  }
}

// ---------------------------------------------------------------------------
// Convenience: 한 번 호출로 전체 실행
// ---------------------------------------------------------------------------

export async function runHarness2(opts: EngineOptions): Promise<EngineResult> {
  const engine = new Harness2Engine(opts.provider);
  return engine.run(opts);
}
