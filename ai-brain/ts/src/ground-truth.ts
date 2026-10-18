import { buildBrain } from "./run.ts";

// Ground-truth feedback CLI: when reality later confirms which side of
// an adjudicated conflict was actually right, record it. If the
// adjudication was wrong, the case becomes a reasoning-failure record
// (with the reason the credibility signals misled the judgment) and the
// learned source reliability is updated immediately.
//
// usage: node --experimental-strip-types src/ground-truth.ts "<command>" <actualEvidenceId> [note]

const command = process.argv[2];
const actual = process.argv[3];
const note = process.argv[4] ?? "";

if (!command || !actual) {
  console.error('usage: ground-truth.ts "<command>" <actualEvidenceId> [note]');
  process.exit(1);
}

const brain = buildBrain();
// Access internals through the same deps the brain uses.
const { config } = await import("./run.ts");
const { AdjudicationLog } = await import("./adjudications.ts");
const { FailureStore } = await import("./failures.ts");
const { CredibilityModel } = await import("./credibility.ts");

const data = (f: string) => new URL(`../data/${f}`, import.meta.url).pathname;
const adjudications = new AdjudicationLog(data("adjudications.jsonl"));
const failures = new FailureStore(data("failure-cases.jsonl"));
const credibility = new CredibilityModel(config.credibility, data("reliability.json"));

const rec = adjudications.latestForCommand(command);
if (!rec) {
  console.error(`이 명령에 대한 상충 판정 기록이 없습니다: ${command}`);
  process.exit(2);
}

if (rec.winner === actual) {
  credibility.update(rec.winnerSource, true);
  console.log(
    JSON.stringify(
      {
        outcome: "판단 확인",
        detail: `adjudication이 ${rec.winner}(${rec.winnerSource})를 택했고 실제도 동일 — 출처 신뢰도 상향`,
      },
      null,
      2,
    ),
  );
} else {
  const reason =
    `신뢰도 신호(prior x level x learned: ${rec.winner}=${rec.winnerScore.toFixed(2)} vs ` +
    `${rec.loser}=${rec.loserScore.toFixed(2)})가 ${rec.winnerSource}를 지지해 ${rec.winner}를 택했으나, ` +
    `실제 확인 결과 ${actual}가 옳았다 — 출처 사전확률이 오도됨`;
  failures.record({
    command,
    picked: rec.winner,
    pickedSource: rec.winnerSource,
    actual,
    actualSource: "ground-truth",
    reason,
    note,
  });
  credibility.update(rec.winnerSource, false);
  const actualItem = { id: actual, source: "ground-truth", level: "observation", text: "" };
  void actualItem;
  console.log(
    JSON.stringify(
      {
        outcome: "추론 실패 사례 기록",
        detail: reason,
        effects: [
          `failure-cases.jsonl에 사례 저장 (이후 유사 명령에 [실패사례]로 주입)`,
          `${rec.winnerSource} 출처 신뢰도 하향`,
          `다음 상충 판정에서 이 페어는 실패사례가 실증한 ${actual} 쪽을 승자로 결정`,
        ],
      },
      null,
      2,
    ),
  );
}
void brain;
