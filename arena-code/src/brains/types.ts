/**
 * Multi-Brain System — 5층 + 3.5층 게이트 창의/비판/천재/오류/설계/기억 두뇌
 * v2.23.0 — 3.5층 검증 게이트 + 1층 3천재 확장
 */

export type BrainId = string;
export type BrainRole = "creative" | "critical" | "genius" | "error" | "design" | "memory" | "council" | "gate" | "strategist";
export type BrainLayer = 1 | 2 | 3 | 3.5 | 4 | 5;

export interface BrainInput {
  task: string;
  context: string;
  layer: BrainLayer;
  priorOutputs: BrainOutput[];
}

export interface BrainOutput {
  brainId: BrainId;
  role: BrainRole;
  layer: BrainLayer;
  idea: string;
  confidence: number; // 0..1
  tags: string[];
  costMs: number;
}

export interface Brain {
  id: BrainId;
  role: BrainRole;
  layer: BrainLayer;
  name: string;          // 예: "창의-라이트형제"
  description: string;
  version: string;
  think(input: BrainInput): Promise<BrainOutput>;
  learn(feedback: BrainFeedback): Promise<void>;
}

export interface BrainFeedback {
  targetId: BrainId;
  reward: number; // -1..1
  note: string;
  lesson?: string;
}

export interface CouncilDecision {
  consensus: string;
  votes: { brainId: BrainId; stance: "agree"|"disagree"|"abstain"; reason: string }[];
  dissent: string[];
  confidence: number;
}

export interface GateResult {
  selected: string[]; // genius ids
  votes: { geniusId: string; pass: boolean; reason: string }[];
  passed: boolean;
  score: number; // 0..8
  reason: string;
  retryCount: number;
}
