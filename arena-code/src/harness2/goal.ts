/** Goal mode — REA 흡수: Claude Code goal pinning (Goal State) */
export interface GoalState { goal: string; pinned: string; turns: number; maxTurns: number }
export function createGoalState(text: string, opts?: { maxTurns?: number }): GoalState {
  const g = text.replace(/^\/goal\s*/i, "").trim();
  return { goal: g, pinned: `🎯 GOAL: ${g}`, turns: 0, maxTurns: opts?.maxTurns ?? 100 };
}
export function pinGoal(prefix: string, g: GoalState): string { return `[GOAL ${prefix}] ${g.pinned}`; }
export function repinAfterCompact(compacted: string, g: GoalState): string {
  if (compacted.includes(g.pinned)) return compacted;
  return compacted + "\n" + g.pinned;
}
export function checkGoalDone(g: GoalState, output: string): { done: boolean; suggestion?: string } {
  const hasPR = /pull request|PR/i.test(output);
  const hasBeforeAfter = /before.*after|numbers/i.test(output);
  const done = hasPR && hasBeforeAfter;
  return done ? { done: true } : { done: false, suggestion: `Goal "${g.goal}" not done — add PR and numbers` };
}
export function advanceGoal(g: GoalState): GoalState { return { ...g, turns: g.turns + 1 }; }
export function parseGoalConstraints(text: string): string[] {
  const parts = text.split(/,|and|—|·/).map(s=>s.trim()).filter(Boolean);
  return parts.length ? parts : [text];
}
