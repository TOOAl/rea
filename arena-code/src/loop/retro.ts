/**
 * Retro — 세션 회고로 다음 리뷰를 가볍게 (Pocock retro 흡수)
 * REA 원천: retro/SKILL.md 6카테고리 + improve-codebase-architecture
 * 12살: 숙제 틀린 걸 모아 "다음엔 이렇게 하지 말자" 규칙 만들기
 */

export type RetroCategory = "Navigation" | "Automated checks" | "Coding standards" | "Global AGENTS.md" | "Tool economy" | "Information access" | "No-ops";
export interface RetroCandidate {
  category: RetroCategory;
  severity: "high" | "medium" | "low";
  finding: string;
  proposal: string; // 체크/규칙/포인터 중 하나
  kind: "check" | "rule" | "pointer" | "tool";
}

export interface SessionLike {
  toolCalls: string[]; // ["Read src/a.ts", "Grep xrefs ..."]
  errors: string[];    // 에이전트가 만든 실수
  durationMs?: number;
  standardsFileLines?: number;
  agentsMdLines?: number;
}

// 규칙: mechanical이면 check, judgement이면 rule
function isMechanical(finding: string): boolean {
  return /console\.log|import.*from|ban.*api|file.*location/i.test(finding);
}

export function runRetro(session: SessionLike | null, notes?: string): RetroCandidate[] {
  const cands: RetroCandidate[] = [];
  const s = session ?? { toolCalls: [], errors: [] };
  const text = [notes ?? "", ...s.errors, ...s.toolCalls].join("\n");

  // 1) Navigation — 파일을 오래 찾았는가
  if (/grep.*no results|Read.*not found|glob.*0 files/i.test(text) || s.toolCalls.filter(c=>/Grep|Glob/.test(c)).length >= 4) {
    cands.push({ category: "Navigation", severity: "medium", finding: "파일 탐색에 Grep/Glob 4회 이상 — 숨은 의존성", proposal: "`AGENTS.md`에 navigation pointer 추가 (`src/loop/*` 맵)", kind: "pointer" });
  }
  // 2) Automated checks — 에이전트 실수를 린트가 잡을 수 있었는가
  if (/lint.*fail|type.*error|tautological|implementation-coupled/i.test(text) || /console\.log/.test(text)) {
    const kind = isMechanical(text) ? "check" : "check";
    cands.push({ category: "Automated checks", severity: "high", finding: "실수가 자동검사로 잡힐 수 있었음 (lint/type/tautological)", proposal: "pre-commit에 `lint/typecheck` 추가 또는 커스텀 린트 규칙 — guardrail 없으면 그 자체가 finding", kind });
  }
  if (s.errors.length === 0 && !text.includes("lint")) {
    // guardrail 자체 부재도 finding (Pocock 규칙)
    // 단, 세션이 비어있으면 낮은 심각도로만
    if (!s.toolCalls.length) {
      // skip — 정보 부족
    }
  }
  // 3) Coding standards — 리뷰가 놓친 것
  if (/duplicated|Feature Envy|Primitive Obsession/i.test(text)) {
    const mechanical = isMechanical(text);
    cands.push({
      category: "Coding standards",
      severity: "medium",
      finding: "리뷰가 smell을 놓침 — CODING_STANDARDS.md 규칙 누락",
      proposal: mechanical ? "린트 규칙으로 승격 (mechanical)" : "CODING_STANDARDS.md에 judgement call 규칙 추가 (Fowler smell 인용, linter가 못하는 것만)",
      kind: mechanical ? "check" : "rule",
    });
  }
  // 4) Global AGENTS.md 비대
  if ((s.agentsMdLines ?? 0) > 800 || /AGENTS\.md.*large/i.test(text)) {
    cands.push({ category: "Global AGENTS.md", severity: "medium", finding: "AGENTS.md 800줄 초과 — 구현 컨텍스트 포화", proposal: "규칙을 CODING_STANDARDS.md(리뷰 전용)로 이동, AGENTS.md는 pointer만", kind: "pointer" });
  }
  // 5) Tool economy — 비싼 호출
  if (/Browser.*screenshot|tiktoken.*heavy|rg.*slow/i.test(text) || s.durationMs && s.durationMs > 120_000) {
    cands.push({ category: "Tool economy", severity: "low", finding: "비싼 도구 호출 — 세션 120초 초과 또는 무거운 브라우저 캡처", proposal: "rg/Grep 하이브리드 + HashEmbedder로 토큰 절감, dev 서버 로그 tee", kind: "tool" });
  }
  // 6) Information access
  if (/not found|no access|missing.*log/i.test(text)) {
    cands.push({ category: "Information access", severity: "medium", finding: "에이전트가 필요 정보에 접근 불가", proposal: "dev 서버 로그, read-only 서비스 접근 권한 추가", kind: "pointer" });
  }
  // 심각도 순 정렬
  const order = { high: 0, medium: 1, low: 2 } as const;
  cands.sort((a,b)=>order[a.severity]-order[b.severity]);
  return cands;
}

export function formatRetroReport(cands: RetroCandidate[]): string {
  if (cands.length===0) return "Retro: no findings — 다음 리뷰를 가볍게 할 규칙 없음 (guardrail은 유지)";
  return ["## Retro — 다음 리뷰를 가볍게 하는 제안 (심각도 순)", ...cands.map((c,i)=> `${i+1}. [${c.severity}] ${c.category}: ${c.finding}\n   → ${c.proposal} (${c.kind})`)].join("\n");
}
