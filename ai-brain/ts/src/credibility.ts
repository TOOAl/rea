import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import type { EvidenceItem } from "./contracts.ts";

export interface CredibilityConfig {
  priors: Record<string, number>;
  levelWeights: Record<string, number>;
  adjudicationMargin: number;
}

interface Reliability {
  passed: number;
  failed: number;
}

const DEFAULT_PRIORS: Record<string, number> = {
  encyclopedia: 0.9,
  "history-journal": 0.8,
  "public-wiki": 0.8,
  "mock-web": 0.7,
  "insider-blog": 0.4,
  "low-quality-blog": 0.3,
};

const DEFAULT_LEVEL_WEIGHTS: Record<string, number> = {
  observation: 1.0,
  derivation: 0.9,
  inference: 0.8,
  unknown: 0.5,
};

// Source credibility model for conflict adjudication.
// score = prior(source) x level(evidence) x learned(source)
//
// `learned` is Laplace-smoothed (Beta(2,2)) reliability from
// verification history: starts neutral (1.0) and shifts as sources
// survive or lose adjudication. Ground-truth feedback that exposes a
// misjudgment updates it immediately — the axis on which "the
// low-credibility side was actually right" cases correct the model.
export class CredibilityModel {
  private priors: Record<string, number>;
  private levelWeights: Record<string, number>;
  readonly margin: number;
  private reliabilityPath: string;
  private reliability = new Map<string, Reliability>();

  constructor(config: CredibilityConfig, reliabilityPath: string) {
    this.priors = { ...DEFAULT_PRIORS, ...config.priors };
    this.levelWeights = { ...DEFAULT_LEVEL_WEIGHTS, ...config.levelWeights };
    this.margin = config.adjudicationMargin;
    this.reliabilityPath = reliabilityPath;
    this.load();
  }

  private load(): void {
    if (!existsSync(this.reliabilityPath)) return;
    const data = JSON.parse(
      readFileSync(this.reliabilityPath, "utf8"),
    ) as Record<string, Reliability>;
    for (const [k, v] of Object.entries(data)) this.reliability.set(k, v);
  }

  save(): void {
    mkdirSync(dirname(this.reliabilityPath), { recursive: true });
    const obj: Record<string, Reliability> = {};
    for (const [k, v] of this.reliability) obj[k] = v;
    writeFileSync(this.reliabilityPath, JSON.stringify(obj, null, 2));
  }

  private learned(source: string): number {
    const r = this.reliability.get(source);
    if (!r) return 1;
    return (r.passed + 2) / (r.failed + 2); // Beta(2,2) smoothing
  }

  score(item: EvidenceItem): number {
    const prior = this.priors[item.source] ?? 0.5;
    const level = this.levelWeights[item.level] ?? 0.7;
    const learned = Math.min(5, Math.max(0.2, this.learned(item.source)));
    return prior * level * learned;
  }

  signals(item: EvidenceItem): {
    prior: number;
    levelWeight: number;
    learned: number;
  } {
    return {
      prior: this.priors[item.source] ?? 0.5,
      levelWeight: this.levelWeights[item.level] ?? 0.7,
      learned: this.learned(item.source),
    };
  }

  // Called when ground truth shows an adjudication outcome was right
  // or wrong. One wrong call must not flip the world: Beta smoothing
  // keeps the shift moderate until patterns accumulate.
  update(source: string, passed: boolean): void {
    const r = this.reliability.get(source) ?? { passed: 0, failed: 0 };
    if (passed) r.passed += 1;
    else r.failed += 1;
    this.reliability.set(source, r);
    this.save();
  }
}
