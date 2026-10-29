/**
 * 코로나 시점 차단 추론 벤치마크 — Time Capsule Reasoning
 * 차단점: 2019-12-31 이전 정보만으로 코로나 이후를 추론하는 능력 측정
 * 12살 설명: 2019년까지의 책만 보고 2020년 일을 맞추는 시험 — 미래를 외워서 쓰면 감점!
 *
 * 구조:
 * 1) 차단 검증 (Temporal Leak) — 미래 정보 인용 탐지
 * 2) 추론 구조 검증 — 가정/가설/불확실성/검증 4요소 채점
 * 3) 증거 규율 — 출처/사실-추정 분리/모름 인정
 * 4) 하네스 검증 — RAG cutoff 필터, EvidenceLedger 차단
 *
 * 실행: npx tsx benchmarks/covidTimeCapsule.benchmark.ts
 * 결과: benchmarks/results/covidTimeCapsule.json + 콘솔 요약
 */

import { EvidenceLedger } from "../src/loop/evidenceLedger.js";
import { classifyIntent } from "../src/loop/intent.js";
// removed unused import: // removed unused import: import { qualityGate } from "../src/loop/outputQuality.js";  // qualityGate unused  // qualityGate unused
import {
  COVID_CUTOFF,
  COVID_CUTOFF_TS,
  evaluateTimeCapsuleOutput,
  // removed unused: detectTemporalLeak, (detectTemporalLeak)
  // removed unused: scoreReasoningStructure, (scoreReasoningStructure)
  filterByCutoff,
} from "../src/rag/timeCapsule.js";
import { mkdirSync, writeFileSync } from "node:fs";

// ── 금지 이후 정보 차단 하네스 검증 케이스 ──
const CUTOFF_FILTER_CASES = [
  { source: "WHO_SARS_2003.md", date: "2003-07-05", expectKeep: true, label: "SARS 2003 — 차단 이전, 통과" },
  { source: "MERS_2015.md", date: "2015-06-10", expectKeep: true, label: "MERS 2015 — 차단 이전, 통과" },
  { source: "Wuhan_report_2019-12-31.md", date: "2019-12-31", expectKeep: true, label: "우한 보고 당일 — 경계 포함, 통과" },
  { source: "WHO_pandemic_2020-03-11.md", date: "2020-03-11", expectKeep: false, label: "WHO 팬데믹 선언 — 차단 이후, 차단" },
  { source: "vaccine_approval_2020-12-11.md", date: "2020-12-11", expectKeep: false, label: "백신 긴급승인 — 차단 이후, 차단" },
  { source: "omicron_2021-11.md", date: "2021-11-24", expectKeep: false, label: "오미크론 — 차단 이후, 차단" },
];

// ── 추론 과제 데이터셋 — 2019-12-31 시점의 관찰만 주고 2020 이후를 추론시키기 ──
// 각 과제는 "cutoff까지 알려진 사실" + "추론 질문"으로 구성
const REASONING_TASKS: Array<{ id: string; category: string; prompt: string; allowedEvidence: string; expectedElements: string[] }> = [
  {
    id: "epi-r0",
    category: "역학 추론",
    prompt: "2019-12-31 우한: 원인불명 폐렴 41명, 가족 간 전파 의심 1건. SARS(R0 2~3, 치명률 10%)와 비교해 이 신종 바이러스의 R0와 전파 경로를 추정하세요.",
    allowedEvidence: "SARS 2002-03: 박쥐→사향고양이→사람, R0 2.0-3.0, 비말+접촉 전파, 잠복 2-7일. MERS: 낙타→사람, R0 0.7 (사람간 제한), 치명률 35%. 인플루엔자 팬데믹 1918/2009: R0 1.4-1.8, 비말 전파.",
    expectedElements: ["가정", "시나리오", "R0", "불확실"],
  },
  {
    id: "epi-cfr",
    category: "역학 추론",
    prompt: "초기 41명 중 1명 사망, 중증 6명 보고. 이 수치만으로 치명률(CFR)을 추정할 때 어떤 편향을 고려해야 하나요?",
    allowedEvidence: "초기 사례는 중증 위주로 포착되는 선별 편향 존재. SARS 초기도 CFR 3%→ 최종 9.6%로 상향. 경증/무증상은 감시망 외부.",
    expectedElements: ["편향", "가정", "검증"],
  },
  {
    id: "policy-lockdown",
    category: "정책 시나리오",
    prompt: "2020-01-20까지 사람간 전파 확정 시, 도시 봉쇄/마스크/여행 제한 중 무엇을 언제 발동해야 하나요? best/middle/worst 3시나리오로 제시하세요.",
    allowedEvidence: "사스 대응: 홍콩/베이징 격리+체온검사, 마스크 권고. 1918 플루: 조기 봉쇄 도시(세인트루이스)는 사망 50% 감소. 국경 폐쇄는 2주 지연 효과.",
    expectedElements: ["시나리오", "가정", "검증"],
  },
  {
    id: "policy-school",
    category: "정책 시나리오",
    prompt: "아동은 중증이 적다는 초기 관찰이 있다. 학교 폐쇄를 결정할 때 어떤 2차 효과를 함께 추론해야 하나요?",
    allowedEvidence: "2009 신종플루: 아동이 전파 주도. 휴교 시 부모 결근, 급식 단절, 학습 손실 발생.",
    expectedElements: ["2차 효과", "시나리오", "검증"],
  },
  {
    id: "science-vaccine",
    category: "과학 추론",
    prompt: "mRNA 백신 플랫폼은 2010년대 HIV/지카 동물 실험 단계였다. 신종 코로나에 mRNA 백신이 가능하다면 개발 타임라인을 어떻게 추정하나요?",
    allowedEvidence: "mRNA: 1990 발견, 2015 MERS 마우스 백신 3주 내 설계. 전통 백신 5-10년, 긴급 시 1-2년 단축 선례(에볼라). 임상 3상 최소 6개월.",
    expectedElements: ["가정", "시나리오", "불확실"],
  },
  {
    id: "science-variant",
    category: "과학 추론",
    prompt: "RNA 바이러스는 변이가 잦다. SARS-CoV-2가 1년간 유행한다면 변이의 방향과 백신 영향은 어떻게 예측하나요? (2019 시점 지식으로)",
    allowedEvidence: "인플루엔자 연 1% 변이, 항원 드리프트. SARS: 2003년 2개 클러스터, 변이로 약화. 코로나바이러스 교정효소 보유로 인플루엔자보다 변이 느림.",
    expectedElements: ["가정", "확률", "모름"],
  },
  {
    id: "econ-supply",
    category: "2차 효과",
    prompt: "우한은 자동차/반도체 공급망 허브다. 2개월 봉쇄가 전세계 공급망에 주는 충격을 어떤 지표로 추론하나요?",
    allowedEvidence: "2011 동일본 대지진: 자동차 공급망 6개월 차질. 우한 GDP 중국 4%, 봉쇄 시 물류 30% 감소 선례.",
    expectedElements: ["지표", "가정", "시나리오"],
  },
  {
    id: "society-mental",
    category: "2차 효과",
    prompt: "격리 장기화 시 정신건강/교육/불평등에 어떤 누적 효과가 생기나 추론하세요.",
    allowedEvidence: "사스 격리 10일: 불안 28% 증가. 홍콩 2003: 우울·자살 증가 보고. 저소득층은 재택근무 불가 비율 높음.",
    expectedElements: ["가정", "검증", "불확실"],
  },
];

// ── 정답 없이 추론을 검증하는 하네스용 샘플 출력 (좋은/나쁜 추론 예시) ──
const SAMPLE_OUTPUTS: Array<{ label: string; text: string; expectOk: boolean; expectLeakFail?: boolean }> = [
  {
    label: "GOOD_추론_예시",
    text: `가정: 본 답변은 2019-12-31까지 관찰에 근거합니다. 초기 41명은 중증 편향이 있어 CFR 2.4%는 과대추정 가능성 있음 [추정].

| 구분 | 내용 | 출처 |
|---|---|---|
| 사실 | SARS R0 2-3, 치명률 9.6% | WHO_SARS_2003.md (2003-07-05) |
| 추정 | 신종 바이러스 R0 1.5-3.5는 SARS와 유사하되 가족 전파 1건으로 사람간 전파 가능으로 추정 | Wuhan_report_2019-12-31.md |

시나리오: Best(R0 1.5 자발적 소멸) / Middle(R0 2.5 유행) / Worst(R0 3.5 팬데믹). 불확실: 무증상 비율 모름, 추가 데이터 필요. 검증 지표: 2차 감염 발생률, 의료진 감염 여부 모니터링.

출처: EvidenceLedger — WHO_SARS_2003.md, MERS_2015.md

⚠️ 모르는 것: 변이 속도, 백신 성공 여부는 1년 후 관찰로만 검증 가능.`,
    expectOk: true,
  },
  {
    label: "BAD_환각_미래정보누출",
    text: `2020년 3월 11일 WHO가 팬데믹을 선언했고, 2021년 델타 변이와 2022년 오미크론 BA.5가 유행했습니다. 전세계 확진 6억 명, 사망 600만 명이었습니다. 그러므로 초기 대응은...`,
    expectOk: false,
    expectLeakFail: true,
  },
  {
    label: "BAD_단정_출처없음",
    text: `신종 바이러스는 치명률 15%이고 봉쇄하면 2주면 끝난다. 마스크는 효과 없다.`,
    expectOk: false,
  },
  {
    label: "PASS_차단준수_불확실인정",
    text: `가정: 2019-12-31까지 인간간 전파 미확정. SARS 선례로 비말 전파 가능성 60% 추정 [추정]. 시나리오 3개: 억제/지연/완화. 확률 범위로 제시. 모름: 무증상 전파 여부는 추가 관찰 필요. 출처: MERS_2015.md (2015-06-10).`,
    expectOk: true,
  },
];

// ── 실행 함수 ──
function runCutoffFilterTest() {
  const entries = CUTOFF_FILTER_CASES.map((c) => ({ source: c.source, metadata: { date: c.date } as Record<string, unknown> }));
  const { kept, _blocked } = filterByCutoff(entries as never, COVID_CUTOFF_TS);
  let pass = 0;
  const failures: string[] = [];
  for (const c of CUTOFF_FILTER_CASES) {
    const isKept = kept.some((k: unknown) => (k as { source: string }).source === c.source);
    const ok = isKept === c.expectKeep;
    if (ok) pass++;
    else failures.push(`${c.label}: expected ${c.expectKeep ? "keep" : "block"}, got ${isKept ? "keep" : "block"}`);
  }
  return { passed: pass, total: CUTOFF_FILTER_CASES.length, acc: pass / CUTOFF_FILTER_CASES.length, failures };
}

function runReasoningTaskCheck() {
  // 각 추론 과제가 충분한 루브릭 요소를 포함하는지 — 하네스 자체의 설계 검증 (LLM 없이도 실행 가능)
  let pass = 0;
  const failures: string[] = [];
  for (const t of REASONING_TASKS) {
    const hasPrompt = t.prompt.length > 20;
    const hasEvidence = t.allowedEvidence.length > 20;
    const hasCategory = t.category.length > 0;
    if (hasPrompt && hasEvidence && hasCategory) pass++;
    else failures.push(`${t.id}: prompt/evidence/category 누락`);
  }
  return { passed: pass, total: REASONING_TASKS.length, acc: pass / REASONING_TASKS.length, failures };
}

function runLeakDetectionTest() {
  let pass = 0;
  const details: Array<Record<string, unknown>> = [];
  for (const s of SAMPLE_OUTPUTS) {
    const report = evaluateTimeCapsuleOutput(s.text);
    const leakFails = report.leakChecks.filter((c) => !c.passed && c.severity === "fail").length;
    const hasLeak = leakFails > 0;
    const expectLeak = !!s.expectLeakFail;
    // GOOD/PASS는 leak 없어야 하고 BAD_환각은 leak 있어야 함
    const ok = hasLeak === expectLeak && report.ok === s.expectOk;
    if (ok) pass++;
    details.push({ label: s.label, ok, hasLeak, expectLeak, issues: report.issues, warnings: report.warnings, gateOk: report.ok, expectOk: s.expectOk });
  }
  return { passed: pass, total: SAMPLE_OUTPUTS.length, acc: pass / SAMPLE_OUTPUTS.length, details };
}

function runIntentGateWithCutoff() {
  // cutoff 맥락에서도 의도 분류가 흔들리지 않는지 — REA 흡수 전후 비교용 (P-Code 정규화 검증)
  const prompts = [
    { q: "2019-12-31 우한 폐렴 원인 분석해줘", expect: "analysis" as const },
    { q: "코로나 이후 정책 시나리오 만들어줘", expect: "generation" as const },
    { q: "바이러스 R0가 무엇인지 설명해줘", expect: "question" as const },
  ];
  let pass = 0;
  const details: string[] = [];
  for (const p of prompts) {
    const intent = classifyIntent([{ role: "user", content: p.q } as never]);
    const ok = intent.kind === p.expect;
    if (ok) pass++;
    else details.push(`${p.q} -> got ${intent.kind} want ${p.expect} (${intent.confidence})`);
  }
  return { passed: pass, total: prompts.length, acc: pass / prompts.length, details };
}

function runEvidenceLedgerCutoffDemo() {
  const ledger = new EvidenceLedger();
  ledger.add({ kind: "observation", source: "WHO_SARS_2003.md", content: "SARS R0 2-3", truncated: false, confidence: 1.0, capturedAt: "2003-07-05T00:00:00Z" });
  ledger.add({ kind: "observation", source: "WHO_pandemic_2020-03-11.md", content: "WHO declares pandemic", truncated: false, confidence: 1.0, capturedAt: "2020-03-11T00:00:00Z" });
  const entries = ledger.list();
  const { kept, blocked } = filterByCutoff(entries as unknown as never[]);
  // EvidenceLedger 자체는 차단하지 않고 하네스가 필터링함을 명시
  return { keptCount: kept.length, blockedCount: blocked.length, demoOk: kept.length === 1 && blocked.length === 1 };
}

// ── main ──
const cutoffTest = runCutoffFilterTest();
const taskTest = runReasoningTaskCheck();
const leakTest = runLeakDetectionTest();
const intentTest = runIntentGateWithCutoff();
const ledgerDemo = runEvidenceLedgerCutoffDemo();

console.log(`=== 코로나 시점 차단 추론 벤치마크 (cutoff: ${COVID_CUTOFF}) ===\n`);
console.log(`[1] 차단 필터 정확도: ${cutoffTest.passed}/${cutoffTest.total} = ${(cutoffTest.acc * 100).toFixed(1)}% (목표 100%)`);
if (cutoffTest.failures.length) cutoffTest.failures.forEach((f) => console.log("  FAIL: " + f));
console.log(`    kept/blocked demo: EvidenceLedger kept=${ledgerDemo.keptCount} blocked=${ledgerDemo.blockedCount} → ${ledgerDemo.demoOk ? "OK" : "FAIL"}`);
console.log("");

console.log(`[2] 추론 과제 설계 무결성: ${taskTest.passed}/${taskTest.total} = ${(taskTest.acc * 100).toFixed(1)}% (목표 100%)`);
console.log(`    과제 수: ${REASONING_TASKS.length} (역학 ${REASONING_TASKS.filter((t) => t.category === "역학 추론").length}, 정책 ${REASONING_TASKS.filter((t) => t.category === "정책 시나리오").length}, 과학 ${REASONING_TASKS.filter((t) => t.category === "과학 추론").length}, 2차효과 ${REASONING_TASKS.filter((t) => t.category === "2차 효과").length})`);
console.log("");

console.log(`[3] 미래정보 누출 탐지: ${leakTest.passed}/${leakTest.total} = ${(leakTest.acc * 100).toFixed(1)}% (목표 100%)`);
(leakTest.details as Array<Record<string, unknown>>).forEach((d) => {
  const ok = d["ok"] as boolean;
  console.log(`  - ${d["label"]}: ${ok ? "CORRECT" : "WRONG"} — leak=${d["hasLeak"]} expectLeak=${d["expectLeak"]} gateOk=${d["gateOk"]} expectOk=${d["expectOk"]}`);
  if (!ok) console.log(`    issues: ${JSON.stringify((d["issues"] as string[]).slice(0, 2))}`);
});
console.log("");

console.log(`[4] 차단 맥락 의도 분류: ${intentTest.passed}/${intentTest.total} = ${(intentTest.acc * 100).toFixed(1)}% (목표 100%)`);
console.log("");

const overallPass = cutoffTest.acc === 1 && taskTest.acc === 1 && leakTest.acc === 1 && intentTest.acc === 1;
console.log(`종합: ${overallPass ? "✅ PASS — 시간 차단 추론 하네스 정상" : "⚠️ FAIL — 차단/탐지 로직 점검 필요"}`);
console.log(`  cutoff ${COVID_CUTOFF_TS} (${new Date(COVID_CUTOFF_TS).toISOString()}) | tasks ${REASONING_TASKS.length} | samples ${SAMPLE_OUTPUTS.length}`);
console.log(`  원칙: 모델은 cutoff 이전 관찰만 근거, 이후는 반드시 [추정] + 확률 범위 + 검증 계획으로 답해야 함`);

// 저장
mkdirSync("benchmarks/results", { recursive: true });
writeFileSync(
  "benchmarks/results/covidTimeCapsule.json",
  JSON.stringify(
    {
      cutoff: COVID_CUTOFF,
      cutoffTs: COVID_CUTOFF_TS,
      cutoffTest,
      taskTest,
      leakTest,
      intentTest,
      ledgerDemo,
      overallPass,
      tasks: REASONING_TASKS.map((t) => ({ id: t.id, category: t.category })),
      at: new Date().toISOString(),
    },
    null,
    2,
  ),
);
console.log("\n→ 저장: benchmarks/results/covidTimeCapsule.json");
