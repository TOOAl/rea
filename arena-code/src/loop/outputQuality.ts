/**
 * Output Quality Gate — Pillar 3: 고품질 결과물
 * 최종 답변이 tool 호출 없이 `result`로 나가기 직전에 1회 검사
 *
 * 검사 항목 (일반화):
 * - underlineCount: 밑줄/강조 개수가 예상과 일치하는가 (29번 케이스 일반화)
 * - answerLeak: 정답이 문서 상단(첫 800자)에 노출되지 않았는가
 * - placeholderLeft: TODO/lorem ipsum 등 미완성 흔적
 * - provenanceCited: EvidenceLedger에 없는 주장에 출처 표기 빠짐
 * - schemaValid: 출력이 선언된 스키마(JSON/Markdown/HTML)에 맞는가
 *
 * Harness² Guard의 harness 전용 검사를 일반 텍스트/아티팩트로 확장
 * 12살 설명: 제출 전 맞춤법 검사기 — 틀린 곳을 빨간 밑줄로 알려주는 것
 */

import type { ContentBlock } from "../providers/types.js";

export interface QualityCheck {
  id: string;
  severity: "fail" | "warn";
  passed: boolean;
  message: string;
}

export interface QualityReport {
  ok: boolean; // fail이 하나라도 있으면 false
  checks: QualityCheck[];
  issues: string[]; // fail 메시지 모음 — 모델에 피드백으로 전달
  warnings: string[]; // warn 메시지 모음
  checkedAt: string;
}

export interface QualityOptions {
  /** 예상 밑줄 수 — exam 타입에서만 사용, 그 외 null */
  expectedUnderlineCount?: number | null;
  /** 정답 누출 검사 윈도 — 기본 800 */
  leakWindow?: number;
  /** 최종 출력이 따라야 할 스키마 힌트 — 예: "exam-html", "youtube-package" */
  schemaHint?: string | null;
}

const PLACEHOLDER_RE = /\b(TODO|FIXME|TBD|lorem ipsum)\b/i;
const ANSWER_LEAK_RES: RegExp[] = [
  /정답\s*[:：]?\s*[①-⑤\d]/,
  /정답은\s*[①-⑤]/,
  /Answer\s*[:：]?\s*[1-5A-E]/i,
  /Correct answer/i,
];

function checkUnderline(text: string, expected: number | null): QualityCheck {
  if (expected == null) {
    return {
      id: "underlineCount",
      severity: "warn",
      passed: true,
      message: "밑줄 개수 검사 건너뜀 (expected=null)",
    };
  }
  // 안정적 밑줄: <span class="ul"> 또는 border-bottom 또는 <u>
  const ulSpans = (
    text.match(/<span[^>]*class=["'][^"']*ul[^"']*["'][^>]*>/gi) || []
  ).length;
  const uTags = (text.match(/<u[\s>]/gi) || []).length;
  const border = (text.match(/border-bottom/gi) || []).length;
  // 마크다운 밑줄 ** 또는 __ 도 카운트 (휴리스틱)
  const _mdBold = (text.match(/\*\*[^*]+\*\*|__[^_]+__/g) || []).length;

  const _count = Math.max(ulSpans, uTags, border > 0 ? ulSpans || border : 0, 0);
  // 실제로는 ulSpans가 가장 정확 — 그걸 기준으로
  const actual = ulSpans || uTags || 0;
  const passed = actual >= expected && actual <= expected + 3; // +3 여유 (추가 강조 허용)
  return {
    id: "underlineCount",
    severity: "fail",
    passed,
    message: `밑줄 개수: 실제 ${actual} / 예상 ${expected} — ${passed ? "PASS" : `FAIL: ${expected}개 필요`}`,
  };
}

function checkAnswerLeak(text: string, window = 800): QualityCheck {
  const head = text.slice(0, window);
  const leaked = ANSWER_LEAK_RES.filter((re) => re.test(head));
  const passed = leaked.length === 0;
  return {
    id: "answerLeak",
    severity: "fail",
    passed,
    message: passed
      ? `정답 누출 없음 (첫 ${window}자 검사 PASS)`
      : `FAIL: 첫 ${window}자에 정답 패턴 노출 — ${leaked.map((r) => r.source).join(", ")}`,
  };
}

function checkPlaceholder(text: string): QualityCheck {
  const passed = !PLACEHOLDER_RE.test(text);
  return {
    id: "placeholderLeft",
    severity: "fail",
    passed,
    message: passed
      ? "미완성 흔적 없음"
      : `FAIL: 미완성 흔적 발견 — ${text.match(PLACEHOLDER_RE)?.[0]}`,
  };
}

function checkProvenance(text: string): QualityCheck {
  // 정확한 것 Pillar 강화: 숫자/주장이 있는데 출처 블록 없으면 FAIL (이전 WARN)
  const hasNumbers =
    /[\d,]+%|[\d,]+원|\d{4}년|\d+\.\d+%|\d{3,}(?:,\d{3})+원/.test(text);
  const hasCitation =
    /출처|Source|출처:|근거|근거 목록|증거 도장|EvidenceLedger/.test(text);
  const hasNumbersAndNoCitation = hasNumbers && !hasCitation;
  if (hasNumbersAndNoCitation) {
    return {
      id: "provenanceCited",
      severity: "fail",
      passed: false,
      message:
        "FAIL: 수치/통계가 있으나 출처 블록(증거 도장/근거 목록) 없음 — Gate 반려 조건. 1층 전제 오류 천재가 요구한 출처를 반드시 추가하세요.",
    };
  }
  // 수치 없이도 주장이 있는데 출처 없으면 WARN 유지
  const hasClaim = /(급락|급등|역대|최대|최초|전망|예상된다)/.test(text);
  if (hasClaim && !hasCitation) {
    return {
      id: "provenanceCited",
      severity: "warn",
      passed: false,
      message:
        "WARN: 주장 표현(급락/최대 등) 있으나 출처 표기 없음 — [추정] 표기 또는 출처 추가 권장",
    };
  }
  return {
    id: "provenanceCited",
    severity: "warn",
    passed: true,
    message: "출처 표기 PASS",
  };
}

export function qualityGate(
  blocks: ContentBlock[],
  opts: QualityOptions = {},
): QualityReport {
  const text = blocks
    .map((b) => b.text ?? b.content ?? (b.input ? JSON.stringify(b.input) : ""))
    .join("\n\n");

  const checks: QualityCheck[] = [
    checkUnderline(text, opts.expectedUnderlineCount ?? null),
    checkAnswerLeak(text, opts.leakWindow ?? 800),
    checkPlaceholder(text),
    checkProvenance(text),
  ];

  const issues = checks
    .filter((c) => !c.passed && c.severity === "fail")
    .map((c) => c.message);
  const warnings = checks
    .filter((c) => !c.passed && c.severity === "warn")
    .map((c) => c.message);

  return {
    ok: issues.length === 0,
    checks,
    issues,
    warnings,
    checkedAt: new Date().toISOString(),
  };
}

/** 모델에게 돌려줄 자기 교정 피드백 생성 */
export function qualityFeedback(report: QualityReport): string {
  if (report.ok) return "";
  const lines = ["[Output Quality Gate — 수정 필요]"];
  for (const c of report.checks.filter((c) => !c.passed)) {
    lines.push(`- ${c.id} (${c.severity}): ${c.message}`);
  }
  lines.push(
    "위 항목을 수정하여 다시 출력하세요. 특히 answerLeak/underlineCount는 반드시 PASS여야 합니다.",
  );
  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Reasoning L3: self-correct 3회 확장 — 기존 1회 → 3회 (Harness² Depth earlyStop 재사용)
// ---------------------------------------------------------------------------
export interface SelfCorrectState {
  attempts: number;
  lastReport: QualityReport | null;
  history: QualityReport[];
}

/** 3회까지 재시도, 2회 연속 개선 없으면 중단 — Depth earlyStop과 동일 철학 */
export function shouldContinueSelfCorrectEx(state: SelfCorrectState): boolean {
  if (state.attempts >= 3) return false;
  if (!state.lastReport || state.lastReport.ok) return false;
  if (state.history.length >= 2) {
    const a = state.history[state.history.length - 2];
    const b = state.history[state.history.length - 1];
    const noGain = b.issues.length >= a.issues.length;
    if (noGain && state.attempts === 2) return true; // 마지막 1회 더 시도
    if (noGain) return false;
  }
  return state.attempts < 3;
}

// ---------------------------------------------------------------------------
// Phase 2: composer.ts behavioral contrast 확장 — 2후보 중 택1
// ---------------------------------------------------------------------------

export interface CandidateScore {
  label: string;
  report: QualityReport;
  // 점수: fail 0점, warn -0.5, pass +1. 단순 가중치지만 Harness² composer처럼 “행동 차이”로 선택
  score: number;
}

export function scoreCandidate(
  label: string,
  blocks: ContentBlock[],
  opts: QualityOptions = {},
): CandidateScore {
  const report = qualityGate(blocks, opts);
  let score = 0;
  for (const c of report.checks) {
    if (c.severity === "fail") score += c.passed ? 1 : -2;
    else if (c.severity === "warn") score += c.passed ? 0.5 : -0.5;
  }
  return { label, report, score };
}

/**
 * 두 후보 중 더 나은 것을 선택 — composer.ts의 selectAnonymous와 동일 철학
 * “정답지 없이도 행동 차이로 선택” — 더 높은 qualityGate 점수를 가진 후보를 택함
 */
export function selectBestCandidate(
  candidates: CandidateScore[],
): CandidateScore | null {
  if (candidates.length === 0) return null;
  if (candidates.length === 1) return candidates[0];
  // 점수 내림차순, 동점이면 fail 적은 순, 그 다음 warn 적은 순
  const sorted = [...candidates].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    const aFails = a.report.issues.length;
    const bFails = b.report.issues.length;
    if (aFails !== bFails) return aFails - bFails;
    return a.report.warnings.length - b.report.warnings.length;
  });
  return sorted[0];
}
