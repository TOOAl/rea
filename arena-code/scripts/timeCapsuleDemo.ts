/**
 * Time Capsule Demo — 차단 추론 실험 데모 (LLM 없이 모의 provider로 하네스 동작 시연)
 * 실행: npx tsx scripts/timeCapsuleDemo.ts
 * 12살 설명: 미래를 외워서 쓴 답과, 과거만 보고 추론한 답 중 어떤 것이 하네스를 통과하는지 보여주는 시연
 */
import { evaluateTimeCapsuleOutput, COVID_CUTOFF, filterByCutoff } from "../src/rag/timeCapsule.js";
import { EvidenceLedger } from "../src/loop/evidenceLedger.js";
import { queryLoop } from "../src/loop/queryLoop.js";
import type { Provider, StreamEvent } from "../src/providers/types.js";

function _mockProvider(scriptedText: string): Provider {
  return {
    name: "mock-demo",
    model: "mock",
    async *streamChat(): AsyncGenerator<StreamEvent> {
      yield { type: "text_delta", text: scriptedText };
      yield { type: "done" };
    },
  };
}

const GOOD = `가정: 본 답변은 ${COVID_CUTOFF}까지 관찰에만 근거합니다. 초기 41명은 중증 편향이 있어 CFR 2.4%는 과대추정 가능 [추정].

| 구분 | 내용 | 출처 |
|---|---|---|
| 사실 | SARS R0 2-3, 치명률 9.6% | WHO_SARS_2003.md (2003-07-05) |
| 추정 | 신종 바이러스 R0 1.5-3.5, 사람간 전파 가능 | Wuhan_report_2019-12-31.md |

시나리오: Best(R0 1.5 소멸)/Middle(R0 2.5 유행)/Worst(R0 3.5 팬데믹). 불확실: 무증상 비율 모름, 추가 데이터 필요. 검증 지표: 2차 감염률, 의료진 감염 모니터링. 모름: 변이 속도·백신 성공은 1년 후 검증 필요.

출처: EvidenceLedger — WHO_SARS_2003.md, MERS_2015.md`;

const BAD = `2020년 3월 11일 WHO가 팬데믹을 선언했고 2021년 델타와 2022년 오미크론 BA.5가 유행했습니다. 전세계 확진 6억 명, 사망 600만 명이었습니다.`;

async function runDirectEval() {
  console.log("=== Time Capsule 직접 평가 (하네스만) ===\n");
  const goodR = evaluateTimeCapsuleOutput(GOOD);
  const badR = evaluateTimeCapsuleOutput(BAD);
  console.log(`GOOD ok=${goodR.ok} issues=${goodR.issues.length} warnings=${goodR.warnings.length} → ${goodR.ok ? "PASS" : "FAIL"}`);
  console.log(`BAD  ok=${badR.ok} issues=${badR.issues.length} → ${!badR.ok ? "CORRECTLY BLOCKED" : "WRONG"}`);
  console.log(`  BAD issues: ${badR.issues.slice(0, 2).join(" | ")}`);
  console.log("");
}

async function runCutoffFilterDemo() {
  console.log("=== EvidenceLedger 차단 필터 데모 ===\n");
  const ledger = new EvidenceLedger();
  ledger.add({ kind: "observation", source: "WHO_SARS_2003.md", content: "SARS R0 2-3", truncated: false, confidence: 1.0, capturedAt: "2003-07-05T00:00:00Z" });
  ledger.add({ kind: "observation", source: "WHO_pandemic_2020-03-11.md", content: "WHO declares pandemic", truncated: false, confidence: 1.0, capturedAt: "2020-03-11T00:00:00Z" });
  const { kept, blocked } = filterByCutoff(ledger.list() as unknown as never[]);
  console.log(`kept ${kept.length} (SARS 2003) / blocked ${blocked.length} (WHO 2020-03-11) → ${kept.length === 1 && blocked.length === 1 ? "PASS" : "FAIL"}`);
  console.log("");
}

async function runQueryLoopDemo() {
  console.log("=== queryLoop TimeCapsule 통합 데모 (mock provider) ===\n");
  // BAD 입력은 하네스가 차단하고 자동 재시도 → GOOD으로 교정되는 흐름을 mock provider로 시연
  // 실제 LLM 없이 두 번째 시도에 GOOD을 반환하도록 스크립팅된 provider
  let attempt = 0;
  const scriptedProvider: Provider = {
    name: "mock-retry",
    model: "mock",
    async *streamChat(): AsyncGenerator<StreamEvent> {
      attempt++;
      if (attempt === 1) yield { type: "text_delta", text: BAD };
      else yield { type: "text_delta", text: GOOD };
      yield { type: "done" };
    },
  };
  const ledgerEntries = new EvidenceLedger();
  ledgerEntries.add({ kind: "observation", source: "Wuhan_report_2019-12-31.md", content: "우한 폐렴 41명, 가족 전파 의심 1건", truncated: false, confidence: 1.0, capturedAt: "2019-12-31T00:00:00Z" });
  ledgerEntries.add({ kind: "observation", source: "WHO_pandemic_2020-03-11.md", content: "should be blocked", truncated: false, confidence: 1.0, capturedAt: "2020-03-11T00:00:00Z" });

  const events: string[] = [];
  // evidenceLedger는 queryLoop 내부에서 만들지만, timeCapsule은 messages로 전달된 초기 evidence도 필터링하므로
  // 여기서는 RAG/ledger 필터를 직접 시연하기 위해 ledger 경유 대신 timeCapsule 프롬프트 자체를 확인
  for await (const ev of queryLoop({
    provider: scriptedProvider,
    tools: [],
    cwd: process.cwd(),
    messages: [{ role: "user", content: "2019-12-31 우한 폐렴 41명, 가족 전파 1건을 SARS(R0 2-3)와 비교해 R0를 추정하세요. Time Capsule 차단 모드로 답하세요." }],
    timeCapsule: { cutoff: COVID_CUTOFF, enforceLeakCheck: true, maxLeakRetries: 2 },
  })) {
    if (ev.type === "text") events.push(ev.text.slice(0, 120));
    if (ev.type === "thinking") events.push(`[thinking] ${ev.text.slice(0, 40)}`);
    if (ev.type === "result") {
      console.log(`  result turns=${ev.turns} contentLen=${ev.content[0]?.text?.length ?? 0} → ${ev.content[0]?.text?.includes("가정") ? "PASS" : "FAIL"}`);
      console.log(`  preview: ${ev.content[0]?.text?.slice(0, 180).replace(/\n/g, " | ")}...`);
    }
    if (ev.type === "error") console.log(`  error: ${ev.message}`);
  }
  console.log(`  attempts observed (BAD→GOOD retry): ${attempt} → ${attempt === 2 ? "PASS (차단 후 재시도 성공)" : "FAIL"}`);
  console.log(`  events: ${events.slice(0, 3).join(" || ").slice(0, 200)}...`);
  console.log("");
}

await runDirectEval();
await runCutoffFilterDemo();
await runQueryLoopDemo();
console.log("=== 데모 완료 ===");
console.log("실제 추론 실험: npx tsx benchmarks/covidTimeCapsule.benchmark.ts");
console.log("타임캡슐 모드 실행: REA_TIMECAPSULE=1 npx tsx arena-code/scripts/....ts  또는 LoopParams.timeCapsule={cutoff:'2019-12-31'}");
