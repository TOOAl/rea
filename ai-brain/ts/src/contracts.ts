// Contracts for the AI brain. The evidence taxonomy mirrors REA's epistemology:
// observations, derivations, inferences, and unknowns stay distinct across
// every boundary, and uncertainty is preserved instead of being flattened.

export type EvidenceLevel = "observation" | "derivation" | "inference" | "unknown";

export interface EvidenceItem {
  id: string;
  source: string; // e.g. "external-agent", "rea-mcp", "file", "web-search"
  level: EvidenceLevel;
  text: string;
  conflicts?: string[]; // ids of evidence this item contradicts (seeded; judge model later)
}

export interface Claim {
  text: string;
  evidenceIds: string[]; // must resolve to ids in the collected evidence set
}

export interface Conclusion {
  answer: string;
  claims: Claim[];
  confidence: number; // 0..1
  unknowns: string[]; // explicit unknowns — never claim what was not evidenced
}

export interface CheckResult {
  gate: string;
  ok: boolean;
  detail: string;
}

export interface Verdict {
  pass: boolean;
  confidence: number;
  issues: string[]; // blocking findings
  warnings: string[]; // non-blocking findings (reported, confidence-penalized)
  checks: CheckResult[];
  skipped: string[]; // planned checks not implemented at this stage (honest disclosure)
}

export interface AdjudicationRecord {
  command: string;
  pair: [string, string];
  winner: string;
  winnerSource: string;
  loser: string;
  loserSource: string;
  winnerScore: number;
  loserScore: number;
  decidedBy: "credibility-model" | "failure-case";
  reason: string;
  ts: string;
}

// Reasoning-failure case: when adjudication sides with the higher-
// credibility evidence but reality confirms the other side, the case
// is stored WITH the reason the credibility signals misled the judgment
// and reused as accuracy-improvement material.
export interface ReasoningFailure {
  command: string;
  picked: string; // evidence id the adjudication chose
  pickedSource: string;
  actual: string; // evidence id reality confirmed
  actualSource: string;
  reason: string;
  note: string;
  ts: string;
}

export interface BrainResult {
  command: string;
  taskType: TaskType;
  model: string;
  strategy: string;
  withheld: boolean; // true when verification failed: fail-closed, no conclusion returned
  conclusion: Conclusion | null;
  verdict: Verdict;
  attempts: number;
  lessonsApplied: string[];
  failuresApplied: string[];
  lessonsRecorded: number;
}

export type TaskType = "reasoning" | "analysis" | "factual";
