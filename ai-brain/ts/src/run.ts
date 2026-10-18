import { loadConfig } from "./config.ts";
import { Brain } from "./orchestrator.ts";
import { OllamaProvider } from "./providers/ollama.ts";
import { MockProvider } from "./providers/mock.ts";
import { MockCollector, HttpCollector } from "./collector.ts";
import { LessonStore } from "./lessons.ts";
import { FailureStore } from "./failures.ts";
import { CredibilityModel } from "./credibility.ts";
import { AdjudicationLog } from "./adjudications.ts";
import { StrategyRegistry } from "./strategies.ts";

const config = loadConfig(new URL("../config.json", import.meta.url).pathname);
const data = (f: string) => new URL(`../data/${f}`, import.meta.url).pathname;

export function buildBrain(opts?: { lessonsPath?: string }) {
  const provider =
    process.env.BRAIN_PROVIDER === "ollama"
      ? new OllamaProvider(config.ollamaHost)
      : new MockProvider();
  const collector =
    config.collector === "http"
      ? new HttpCollector(config.externalAgentUrl)
      : new MockCollector(new URL("../../data/corpus.json", import.meta.url).pathname);
  return new Brain({
    config,
    provider,
    collector,
    lessons: new LessonStore(opts?.lessonsPath ?? data("lessons.jsonl")),
    failures: new FailureStore(data("failure-cases.jsonl")),
    credibility: new CredibilityModel(config.credibility, data("reliability.json")),
    adjudications: new AdjudicationLog(data("adjudications.jsonl")),
    strategies: new StrategyRegistry(data("strategy-stats.json"), config.epsilon),
  });
}

export { config };

if (import.meta.url === `file://${process.argv[1]}`) {
  const brain = buildBrain();
  const command = process.argv[2] ?? "프랑스의 수도는 무엇인가요?";
  const strategy = process.argv[3] as never;
  const result = await brain.run(command, strategy ? { strategy } : undefined);
  console.log(JSON.stringify(result, null, 2));
}
