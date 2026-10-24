/**
 * Human Approval guard — 천재 교체는 사람 도장 없으면 금지
 * 12살 설명: 천재를 바꾸려면 선생님 사인이 필요해요
 */
export function requireApproval(reason: string): void {
  if (process.env.HUMAN_APPROVED === "1") return;
  // CI에서는 에러, 로컬에서는 경고
  if (process.env.CI === "true" || process.env.GITHUB_ACTIONS === "true") {
    throw new Error(`Human approval required: ${reason} — set HUMAN_APPROVED=1 or add 'human-approved' label and get CODEOWNERS review`);
  }
  console.warn(`[approval] 경고: 사람 승인 없이 진행 — ${reason}. 머지 전에는 HUMAN_APPROVED=1 필요`);
}

export function approvalLabel(): string {
  return process.env.HUMAN_APPROVED === "1" ? "human-approved" : "needs-human-approval";
}
