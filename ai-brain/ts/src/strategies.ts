import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import type { TaskType } from "./contracts.ts";

export type StrategyName = "direct" | "cot" | "reflect" | "consistency";

export const STRATEGY_NAMES: StrategyName[] = [
  "direct",
  "cot",
  "reflect",
  "consistency",
];

export interface StrategyPlan {
  name: StrategyName;
  instruction: string;
  samples: number;
  critique: boolean;
}

interface StrategyStats {
  wins: Record<string, number>;
  runs: Record<string, number>;
}

function planFor(name: StrategyName): StrategyPlan {
  switch (name) {
    case "cot":
      return {
        name,
        instruction: "STRATEGY: cot. Chain-of-Thought로 단계별 추론 후 결론을 내려라.",
        samples: 1,
        critique: false,
      };
    case "reflect":
      return {
        name,
        instruction: "STRATEGY: reflect. 초안을 작성하고 자가비판 후 수정안을 제출한다.",
        samples: 1,
        critique: true,
      };
    case "consistency":
      return {
        name,
        instruction: "STRATEGY: consistency. 독립 표본 3개를 생성해 다수결로 결론을 정한다.",
        samples: 3,
        critique: false,
      };
    default:
      return {
        name: "direct",
        instruction: "STRATEGY: direct.",
        samples: 1,
        critique: false,
      };
  }
}

// Strategy registry: the absorbed form of "advanced agent thinking
// circuits". New strategies are plugins; selection is epsilon-greedy
// over measured win rates (eval A/B and per-run outcomes).
export class StrategyRegistry {
  private path: string;
  private epsilon: number;
  private stats: StrategyStats = { wins: {}, runs: {} };
  private taskTypes: TaskType[] = ["reasoning", "analysis", "factual"];

  constructor(path: string, epsilon: number) {
    this.path = path;
    this.epsilon = epsilon;
    mkdirSync(dirname(path), { recursive: true });
    if (existsSync(path)) {
      this.stats = JSON.parse(readFileSync(path, "utf8")) as StrategyStats;
    }
  }

  plan(name: StrategyName): StrategyPlan {
    return planFor(name);
  }

  key(name: StrategyName, taskType: TaskType): string {
    return `${name}:${taskType}`;
  }

  winRate(name: StrategyName, taskType: TaskType): number {
    const k = this.key(name, taskType);
    const runs = this.stats.runs[k] ?? 0;
    if (runs === 0) return 0.5; // unknown = neutral prior
    return (this.stats.wins[k] ?? 0) / runs;
  }

  recordOutcome(name: StrategyName, taskType: TaskType, win: boolean): void {
    const k = this.key(name, taskType);
    this.stats.runs[k] = (this.stats.runs[k] ?? 0) + 1;
    if (win) this.stats.wins[k] = (this.stats.wins[k] ?? 0) + 1;
    writeFileSync(this.path, JSON.stringify(this.stats, null, 2));
  }

  // Epsilon-greedy: exploit the best-known strategy, occasionally
  // explore. Deterministic tie-break keeps runs reproducible.
  choose(taskType: TaskType, explore: boolean): StrategyName {
    const roll = explore && Math.random() < this.epsilon;
    if (roll) {
      return STRATEGY_NAMES[Math.floor(Math.random() * STRATEGY_NAMES.length)];
    }
    let best: StrategyName = "direct";
    let bestRate = -1;
    for (const name of STRATEGY_NAMES) {
      const rate = this.winRate(name, taskType);
      if (rate > bestRate) {
        bestRate = rate;
        best = name;
      }
    }
    return best;
  }

  table(): string {
    const lines = ["strategy      | reasoning | analysis | factual"];
    for (const name of STRATEGY_NAMES) {
      const cells = this.taskTypes.map((t) => this.winRate(name, t).toFixed(2).padStart(9));
      lines.push(`${name.padEnd(13)} | ${cells.join(" | ")}`);
    }
    return lines.join("\n");
  }
}
