import type { BrainConfig } from "./config.ts";
import type { TaskType } from "./contracts.ts";

// Model router: the absorbed form of Ollama's "pick any LLM" feature.
// Task type -> model mapping with a fallback chain. Model switching cost
// is made visible (stage 2: tracking only; VRAM awareness comes later).
export class ModelRouter {
  private loaded = new Set<string>();
  private config: BrainConfig;

  constructor(config: BrainConfig) {
    this.config = config;
  }

  select(taskType: TaskType): string {
    const primary =
      taskType === "factual" ? this.config.models.fast : this.config.models.reasoning;
    this.loaded.add(primary);
    return primary;
  }

  judgeModel(): string {
    return this.config.models.judge;
  }

  loadedModels(): string[] {
    return [...this.loaded];
  }
}
