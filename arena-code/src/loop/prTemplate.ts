/**
 * PR Danger 템플릿 — Pocock `pr/SKILL.md` + Humanlayer show-me 흡수
 * REA 원천: pr 스킬 Summary 시각 + Evidence Before/After + Merge Danger Door/Blast Radius
 * 12살: 소포에 "내용물 그림 + 깨지기 쉬움 스티커" 붙이기
 */

export type Door = "one-way" | "two-way";
export interface PrInput {
  // Summary — 최소 시각: 의사코드 / 호출트리 / 파일트리 / Mermaid / diff 중 1개
  summaryVisual: string;   // 예: "submitForm\n  createSession\n    launchAgent"
  summaryVisualKind?: "pseudocode" | "call-tree" | "file-tree" | "mermaid" | "diff" | "diagram";
  // Evidence — Before/After
  evidenceBefore?: string; // 실패 테스트 / 스크린샷 설명
  evidenceAfter?: string;  // 통과 테스트 / 스크린샷 설명
  // Merge Danger
  door: Door;
  doorNote?: string;       // 왜 되돌릴 수 없는지 1줄
  blastRadius: string;     // 한 단어 + 설명: "narrow: auth only" 등
  blastNote?: string;
  // 메타
  title?: string;
  closes?: string;         // "#123"
}

export function buildPrBody(input: PrInput): string {
  const lines: string[] = [];
  if (input.title) lines.push(`# ${input.title}`, "");
  lines.push("## Summary", "");
  // 시각 종류에 따라 펜스 힌트
  const fence = input.summaryVisualKind === "mermaid" ? "mermaid" : input.summaryVisualKind === "diff" ? "diff" : "text";
  lines.push("```" + fence);
  lines.push(input.summaryVisual.trim());
  lines.push("```", "");
  if (input.closes) lines.push(`Closes ${input.closes}`, "");
  lines.push("## Evidence", "");
  if (input.evidenceBefore || input.evidenceAfter) {
    lines.push(`- **Before:** ${input.evidenceBefore ?? "(no before — new feature)"}`);
    lines.push(`  **After:** ${input.evidenceAfter ?? "(manual verification)"}`);
    lines.push("");
  } else {
    lines.push("- **Before:** (no visual — new module)");
    lines.push("  **After:** `npm test` PASS — see CI");
    lines.push("");
  }
  lines.push("## Merge Danger", "");
  lines.push(`**Door:** ${input.door}`);
  if (input.doorNote) lines.push("", input.doorNote);
  lines.push("");
  lines.push(`**Blast Radius:** ${input.blastRadius}`);
  if (input.blastNote) lines.push("", input.blastNote);
  lines.push("");
  // Pocock 원칙: 짧게, 도메인 언어로
  lines.push(`> Door=${input.door} / Blast=${input.blastRadius} — two-way+narrow면 가볍게, one-way+wide면 꼼꼼히`);
  return lines.join("\n");
}

export function validatePrBody(md: string): { ok: boolean; missing: string[] } {
  const missing: string[] = [];
  if (!md.includes("## Summary")) missing.push("Summary 섹션 없음");
  if (!md.includes("## Evidence")) missing.push("Evidence 섹션 없음");
  if (!md.includes("## Merge Danger")) missing.push("Merge Danger 섹션 없음");
  if (!/Door:.*?((one|two)-way)/.test(md)) missing.push("Door(one-way|two-way) 표기 없음");
  if (!/Blast Radius:/.test(md)) missing.push("Blast Radius 표기 없음");
  return { ok: missing.length === 0, missing };
}

// 예시 생성 — 테스트/벤치마크용
export function examplePrBody(): string {
  return buildPrBody({
    summaryVisual: "submitForm\n  createSession\n    persistPrompt\n    expandSkillMention\n    launchAgent\n  navigateToSession\n    subscribeToEvents",
    summaryVisualKind: "call-tree",
    evidenceBefore: "`expect(limit).toBe(280)` tautological FAIL",
    evidenceAfter: "`expect(post.rejected).toBe(true)` when len=281 PASS",
    door: "two-way",
    blastRadius: "narrow: pr template only",
    closes: "#17",
  });
}
