import { readFileSync, rmSync } from "node:fs";
import { buildBrain, config } from "./run.ts";
import { STRATEGY_NAMES, type StrategyName } from "./strategies.ts";

interface GoldenCase {
  command: string;
  expected: string;
  taskType: string;
}

const golden = JSON.parse(
  readFileSync(new URL("../data/golden.json", import.meta.url).pathname, "utf8"),
) as GoldenCase[];

async function score(expected: string, actual: string): Promise<number> {
  const res = await fetch(`${config.externalAgentUrl}/score`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ expected, actual }),
  });
  const data = (await res.json()) as { score: number };
  return data.score;
}

async function runGolden(strategy?: StrategyName) {
  // Isolate the lesson store per strategy for a fair cold-start
  // comparison — otherwise lessons from earlier strategies leak in.
  const lessonsPath = strategy
    ? new URL(`../data/lessons-ab-${strategy}.jsonl`, import.meta.url).pathname
    : undefined;
  if (lessonsPath) rmSync(lessonsPath, { force: true });
  const brain = buildBrain(lessonsPath ? { lessonsPath } : undefined);
  let sum = 0;
  let attempts = 0;
  let withheld = 0;
  for (const c of golden) {
    const result = await brain.run(c.command, strategy ? { strategy } : undefined);
    const answer = result.conclusion?.answer ?? "";
    // Correct abstention counts as a pass when no grounded answer exists.
    const s = result.withheld
      ? c.expected === ""
        ? 1
        : 0
      : await score(c.expected, answer);
    sum += s;
    attempts += result.attempts;
    if (result.withheld) withheld += 1;
    console.log(
      `  ${s.toFixed(2)}  strategy=${result.strategy.padEnd(11)} withheld=${String(
        result.withheld,
      ).padEnd(5)} attempts=${result.attempts}  issues=${JSON.stringify(result.verdict.issues)}  | ${c.command}`,
    );
  }
  return {
    accuracy: sum / golden.length,
    avgAttempts: attempts / golden.length,
    withheld,
  };
}

const ab = process.argv.includes("--ab");
if (ab) {
  console.log("=== 전략 A/B 평가 (골든셋) ===\n");
  const rows: string[] = ["strategy      | accuracy | avg attempts | withheld"];
  for (const strategy of STRATEGY_NAMES) {
    console.log(`--- ${strategy} ---`);
    const r = await runGolden(strategy);
    rows.push(
      `${strategy.padEnd(13)} | ${r.accuracy.toFixed(2).padStart(8)} | ${r.avgAttempts
        .toFixed(2)
        .padStart(12)} | ${String(r.withheld).padStart(8)}`,
    );
    console.log("");
  }
  console.log(rows.join("\n"));
} else {
  console.log("=== 골든셋 평가 (전략 자동 선택) ===\n");
  const r = await runGolden();
  console.log(
    `\naccuracy: ${r.accuracy.toFixed(2)} | avg attempts: ${r.avgAttempts.toFixed(2)} | withheld: ${r.withheld}`,
  );
}
