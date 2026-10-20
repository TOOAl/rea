/**
 * Composer & Selection — Phase H3
 * Google Harness² (google-research/harness2, Apache 2.0)
 * → Arena Code 포팅: harness2/core/recursion.py (578줄) + selection.py (505줄) 핵심 TS 재구현
 *
 * 개념: 후보들의 "행동 차이(behavioral contrast)"로 검증된 편집만 합성
 *   - 정답지 없이도 가능: 같은 작업을 다른 하네스로 돌려보고 궤적/결과물 차이로 판단
 *   - 후보가 검증 실패하면 버리고 base 유지 (KEEP_BASE)
 *
 * 12살 설명: 두 친구가 각자 다른 방법으로 숙제를 해왔을 때,
 * 선생님이 "누가 더 잘했는지" 답안지가 아니라 "과정"을 보고 좋은 부분만 모아
 * 하나의 완벽한 답안지를 만드는 것!
 *
 * 참조: docs/HARNESS2_REA_ANALYSIS.md §4.1
 */

import type { Tree, SurfaceSpec, DiffSummary } from "./harness.js";
import { validate, autotrigger, diffSummary, ARENA_SURFACE } from "./harness.js";
import type { RolloutView } from "./context.js";
import type { ProposerReply } from "./proposer.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Candidate {
  label: string;                  // 예: "inv-1", "dom-1"
  dim: "invariant" | "domain";
  harness: Tree;
  rollout: RolloutView | null;    // Probe 결과 (없으면 아직 안 돌린 것)
  reply: ProposerReply;           // Proposer 응답 원문 + notes
}

export interface ComposeInput {
  surface?: SurfaceSpec;          // 기본 ARENA_SURFACE
  base: Tree;                     // 기준 하네스
  baseRollout: RolloutView | null; // 기준 궤적 (contrast용)
  candidates: Candidate[];        // 후보들 (일반적으로 2개: inv + dom)
  /** 허용 옵션 */
  allowSubagents?: boolean;
}

export interface ComposeResult {
  finalHarness: Tree;             // 합성된 최종 하네스
  keptBase: boolean;              // base를 그대로 유지했는가 (변경 없음)
  fellBack: string[];             // 검증 실패로 버려진 후보 라벨
  keptBaseLabels: string[];       // KEEP_BASE를 반환한 후보 라벨
  errors: string[];               // 검증 에러 목록
  notes: string;                  // 합성 근거 노트 (사람이 읽음)
  changed: DiffSummary;           // base → final 변경 요약
  stageLabel: string;             // 예: "compose-1"
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isKeepBase(reply: ProposerReply): boolean {
  return reply.text.includes("KEEP_BASE");
}

/** 후보 하네스를 검증 — 허용 표면 + 3원칙 (autotrigger 보정 후) */
function acceptTree(
  surface: SurfaceSpec,
  fallback: Tree,
  candidate: Tree,
  label: string,
  allowSubagents?: boolean,
): { keptBase: boolean; error: string; fixed: Tree } {
  // 원본 Harness²는 validate 전에 autotrigger로 트리거 라인을 자동 보정
  const fixed: Tree = { ...candidate };
  const triggered = autotrigger(surface, fixed);
  if (triggered.length > 0) {
    // 보정 로그는 필요 시 사용 — 후보에 트리거가 자동 추가됨
    void triggered;
  }

  // 변경 여부 (보정 후 기준)
  const diff = diffSummary(surface, fallback, fixed);
  const kept = diff.added.length === 0 && diff.removed.length === 0 && diff.modified.length === 0;

  const result = validate(surface, fixed, { allowSubagents });
  if (!result.ok) {
    return { keptBase: kept, error: `[${label}] validate failed: ${result.errors.slice(0, 2).join("; ")}`, fixed };
  }

  // 추가 검사: autotrigger 후에도 검증 통과해야 함 (원본은 autotrigger를 먼저 적용)
  // MVP에서는 autotrigger 자동 보정으로 완화 — 검증 실패가 autotrigger로 고쳐지면 ok
  return { keptBase: kept, error: "", fixed };
}

// ---------------------------------------------------------------------------
// Main: Compose
// ---------------------------------------------------------------------------

/**
 * 후보들을 행동 대비(contrast)로 검증된 편집만 합성
 * 원본 recursion._run_stage → _accept_tree → compose 흐름의 간소화
 */
export function composeFromCandidates(input: ComposeInput): ComposeResult {
  const surface = input.surface ?? ARENA_SURFACE;
  const base = input.base;
  const errors: string[] = [];
  const fellBack: string[] = [];
  const keptBaseLabels: string[] = [];

  // 1) 각 후보 검증 — 실패하면 버림
  const validCandidates: Candidate[] = [];
  for (const c of input.candidates) {
    if (isKeepBase(c.reply)) {
      keptBaseLabels.push(c.label);
      continue;
    }
    if (!c.harness) {
      fellBack.push(c.label);
      errors.push(`[${c.label}] no harness in reply`);
      continue;
    }
    const { error, fixed } = acceptTree(surface, base, c.harness, c.label, input.allowSubagents);
    if (error) {
      fellBack.push(c.label);
      errors.push(error);
      continue;
    }
    // autotrigger 보정된 하네스로 교체
    validCandidates.push({ ...c, harness: fixed });
  }

  // 2) 유효 후보가 없으면 base 유지
  if (validCandidates.length === 0) {
    const reason =
      keptBaseLabels.length > 0
        ? `all candidates returned KEEP_BASE (${keptBaseLabels.join(", ")}) — no change needed`
        : fellBack.length > 0
          ? `all candidates failed validation: ${errors.slice(0, 2).join(" | ")}`
          : "no candidates provided";
    return {
      finalHarness: { ...base },
      keptBase: true,
      fellBack,
      keptBaseLabels,
      errors,
      notes: `KEEP_BASE — ${reason}`,
      changed: diffSummary(surface, base, base),
      stageLabel: "compose-1",
    };
  }

  // 3) 합성: base에서 시작해 유효 후보들의 변경을 머지
  //    - added/modified: 후보의 파일 내용으로 덮어쓰기 (충돌 시 domain 우선 — 전문 지식 우선)
  //    - removed: 후보가 삭제한 파일은 삭제 (한 후보라도 삭제하면 삭제)
  //    원본은 LLM이 직접 합성하지만, MVP는 규칙 기반 머지로 동작 확인
  let merged: Tree = { ...base };

  // 삭제 먼저
  const toRemove = new Set<string>();
  for (const c of validCandidates) {
    const diff = diffSummary(surface, base, c.harness);
    for (const r of diff.removed) toRemove.add(r);
  }
  for (const r of toRemove) delete merged[r];

  // 추가/수정 — domain이 invariant보다 늦게 덮어쓰도록 정렬 (domain 우선)
  const sorted = [...validCandidates].sort((a, b) => {
    if (a.dim === b.dim) return 0;
    return a.dim === "invariant" ? -1 : 1;
  });
  for (const c of sorted) {
    const diff = diffSummary(surface, base, c.harness);
    for (const k of [...diff.added, ...diff.modified]) {
      merged[k] = c.harness[k];
    }
  }

  // 4) autotrigger 보정 — 새로 생긴 skill에 트리거 라인 자동 추가
  const triggered = autotrigger(surface, merged);

  // 5) 최종 검증 — 합성 후에도 유효해야 함
  const finalValidate = validate(surface, merged, { allowSubagents: input.allowSubagents });
  if (!finalValidate.ok) {
    // 합성 자체가 검증 실패하면 base로 폴백 (안전)
    return {
      finalHarness: { ...base },
      keptBase: true,
      fellBack: [...fellBack, "compose"],
      keptBaseLabels,
      errors: [...errors, `compose validate failed: ${finalValidate.errors.slice(0, 2).join("; ")}`],
      notes: `FALLBACK to base — compose produced invalid harness: ${finalValidate.errors[0]}`,
      changed: diffSummary(surface, base, base),
      stageLabel: "compose-1",
    };
  }

  const changed = diffSummary(surface, base, merged);
  const keptBase = changed.added.length === 0 && changed.removed.length === 0 && changed.modified.length === 0;

  // 6) 노트 생성 — 행동 대비 요약 (원본 composer가 LLM에게 맡기지만 MVP는 휴리스틱)
  const notes = buildComposeNotes({
    baseRollout: input.baseRollout,
    candidates: validCandidates,
    triggered,
    changed,
    fellBack,
  });

  return {
    finalHarness: merged,
    keptBase,
    fellBack,
    keptBaseLabels,
    errors,
    notes,
    changed,
    stageLabel: "compose-1",
  };
}

function buildComposeNotes(opts: {
  baseRollout: RolloutView | null;
  candidates: Candidate[];
  triggered: string[];
  changed: DiffSummary;
  fellBack: string[];
}): string {
  const lines: string[] = [];

  if (opts.baseRollout) {
    lines.push(`Base rollout (${opts.baseRollout.label}): ${opts.baseRollout.trajectory.slice(0, 120)}...`);
  }

  for (const c of opts.candidates) {
    const traj = c.rollout?.trajectory.slice(0, 120) ?? "(no rollout yet)";
    const diff = c.reply.text.match(/<notes>([\s\S]*?)<\/notes>/i)?.[1]?.trim() ?? c.reply.text.slice(0, 200);
    lines.push(`- ${c.label} (${c.dim}): trajectory: ${traj}... | notes: ${diff.slice(0, 150)}`);
  }

  if (opts.triggered.length > 0) {
    lines.push(`Autotrigger fixed: ${opts.triggered.join(", ")} → AGENTS.md`);
  }

  lines.push(`Changed: +${opts.changed.added.length} added, -${opts.changed.removed.length} removed, ~${opts.changed.modified.length} modified`);
  if (opts.fellBack.length > 0) lines.push(`Fell back (invalid): ${opts.fellBack.join(", ")}`);

  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Selection (익명 투표) — MVP 간소화
// ---------------------------------------------------------------------------

export interface SelectionInput {
  candidates: Array<{ label: string; deliverable?: string; rollout: RolloutView | null }>;
  baseLabel?: string;
}

export interface SelectionResult {
  chosenLabel: string;
  reason: string;
  isBase: boolean;
}

/**
 * 익명 후보 중 1개 선택 — 원본 selection.py는 LLM이 익명으로 투표
 * MVP: deliverable이 있는 후보 중 가장 긴 deliverable을 선택 (가장 완전한 결과물)
 * 동일하면 첫 번째. base만 있으면 base 선택.
 */
export function selectAnonymous(input: SelectionInput): SelectionResult {
  const pool = input.candidates;
  if (pool.length === 0) {
    return { chosenLabel: input.baseLabel ?? "base", reason: "no candidates — keep base", isBase: true };
  }

  // deliverable 길이로 랭킹 (실제로는 LLM이 품질 판단)
  let best = pool[0];
  let bestScore = (best.deliverable?.length ?? 0) + (best.rollout?.trajectory.length ?? 0) * 0.1;

  for (const c of pool.slice(1)) {
    const score = (c.deliverable?.length ?? 0) + (c.rollout?.trajectory.length ?? 0) * 0.1;
    if (score > bestScore) {
      best = c;
      bestScore = score;
    }
  }

  const isBase = best.label === input.baseLabel;
  return {
    chosenLabel: best.label,
    reason: `picked ${best.label} — longest deliverable (${best.deliverable?.length ?? 0} chars) as quality proxy (MVP heuristic)`,
    isBase,
  };
}
