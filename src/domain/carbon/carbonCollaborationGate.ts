/**
 * CarbonCollaborationGate — 협업 -26%/-29% 흡수 (overreach/under-service)
 * REA: 모호하면 출처 3개 꺼내 물어보기 — “추측 말고 검색 → 불일치 보여주기”
 */
import type { CarbonAsk } from "./carbonTypes.js";

export const shouldAskBeforeAct = (input: {
  readonly confidence: number; // 0-1
  readonly sources: readonly string[];
}): boolean => {
  // Carbon: 모호하면(0.6 이하) 물어보기
  if (input.confidence < 0.6) return true;
  if (input.sources.length === 0) return true;
  if (input.sources.length === 1 && input.confidence < 0.85) return true;
  return false;
};

export const createCarbonAsk = (input: {
  readonly question: string;
  readonly sources: readonly string[];
  readonly options: readonly string[];
}): CarbonAsk => {
  const sources = input.sources.slice(0, 3);
  return {
    question: input.question,
    sources,
    options: [...input.options],
  };
};

export const CARBON_COLLABORATION_STATS = {
  overreachReduction: "-26%",
  underServiceReduction: "-29%",
  principle: "If ambiguous, fetch 3 sources and ask before acting",
} as const;
