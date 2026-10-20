import { readFileSync } from "node:fs";

export interface BrainConfig {
  models: { reasoning: string; judge: string; fast: string };
  thresholds: {
    passConfidence: number;
    judgeMinAgreement: number;
    claimSupportMin: number;
  };
  credibility: {
    priors: Record<string, number>;
    levelWeights: Record<string, number>;
    adjudicationMargin: number;
  };
  strategy: string; // "auto" | strategy name
  epsilon: number; // exploration rate for strategy selection
  maxAttempts: number;
  ollamaHost: string;
  collector: "mock" | "http";
  externalAgentUrl: string;
}

const DEFAULTS: BrainConfig = {
  models: { reasoning: "llama3.1", judge: "llama3.1", fast: "llama3.2:1b" },
  thresholds: { passConfidence: 0.7, judgeMinAgreement: 0.6, claimSupportMin: 0.25 },
  credibility: {
    priors: {
      encyclopedia: 0.9,
      "history-journal": 0.8,
      "public-wiki": 0.8,
      "mock-web": 0.7,
      "insider-blog": 0.4,
      "low-quality-blog": 0.3,
    },
    levelWeights: { observation: 1.0, derivation: 0.9, inference: 0.8, unknown: 0.5 },
    adjudicationMargin: 0.2,
  },
  strategy: "auto",
  epsilon: 0.2,
  maxAttempts: 2,
  ollamaHost: "http://127.0.0.1:11434",
  collector: "mock",
  externalAgentUrl: "http://127.0.0.1:8787",
};

// Additive merge: file values override defaults, missing keys keep defaults.
// This keeps configuration additive and idempotent (REA convention).
export function loadConfig(path: string): BrainConfig {
  try {
    const file = JSON.parse(readFileSync(path, "utf8")) as Partial<BrainConfig>;
    return {
      ...DEFAULTS,
      ...file,
      models: { ...DEFAULTS.models, ...file.models },
      thresholds: { ...DEFAULTS.thresholds, ...file.thresholds },
      credibility: {
        priors: { ...DEFAULTS.credibility.priors, ...file.credibility?.priors },
        levelWeights: {
          ...DEFAULTS.credibility.levelWeights,
          ...file.credibility?.levelWeights,
        },
        adjudicationMargin:
          file.credibility?.adjudicationMargin ??
          DEFAULTS.credibility.adjudicationMargin,
      },
    };
  } catch {
    return DEFAULTS;
  }
}
