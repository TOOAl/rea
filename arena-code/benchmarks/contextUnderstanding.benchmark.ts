/**
 * 맥락 이해 벤치마크 — BASE_CAPABILITY_IMPROVEMENT.md 지표 검증
 * 3 지표: 문맥 보존율 / 의도 정확도 / 결과물 PASS율
 */
import { classifyIntent } from "../src/loop/intent.js";
import { EvidenceLedger } from "../src/loop/evidenceLedger.js";
import { qualityGate } from "../src/loop/outputQuality.js";
import type { Message } from "../src/providers/types.js";

// ── 1) 의도 정확도: 50 프롬프트 vs 사람 라벨 ─────────────────────────
type IntentKind = "question" | "implementation" | "analysis" | "generation" | "chore";

const INTENT_DATASET: Array<{ prompt: string; expected: IntentKind }> = [
  // question 10
  { prompt: "다음 글의 밑줄 친 부분 중 어법상 틀린 것은?", expected: "question" },
  { prompt: "왜 이 문장에서 that이 틀렸는지 설명해줘", expected: "question" },
  { prompt: "what is the difference between who and whom?", expected: "question" },
  { prompt: "보기 중 정답을 알려줘", expected: "question" },
  { prompt: "모의고사 29번 정답이 왜 3번인지 해설해줘", expected: "question" },
  { prompt: "이 문장 해석해줘", expected: "question" },
  { prompt: "how does Ghidra decompile work?", expected: "question" },
  { prompt: "다음 지문의 주제를 알려줘", expected: "question" },
  { prompt: "이 코드 왜 틀렸는지 알려줘", expected: "question" },
  { prompt: "수능 어법 문제 해설 부탁", expected: "question" },
  // implementation 10
  { prompt: "로그인 기능 만들어줘 src/auth/login.ts에", expected: "implementation" },
  { prompt: "버그 fix해줘: 무한 루프 수정", expected: "implementation" },
  { prompt: "implement user CRUD in Python", expected: "implementation" },
  { prompt: "추가해줘: 다크 모드 토글", expected: "implementation" },
  { prompt: "작성해줘: README에 설치 가이드", expected: "implementation" },
  { prompt: "개발해줘: 결제 모듈", expected: "implementation" },
  { prompt: "리팩토링해줘: queryLoop.ts", expected: "implementation" },
  { prompt: "src/loop/context.ts에 기능 추가해줘", expected: "implementation" },
  { prompt: "생성해줘: 테스트 파일 for evidenceLedger", expected: "implementation" },
  { prompt: "fix bug in harness.ts", expected: "implementation" },
  // analysis 10
  { prompt: "/tmp/app 바이너리 Ghidra로 분석해줘", expected: "analysis" },
  { prompt: "역공학 해줘: 이 펌웨어", expected: "analysis" },
  { prompt: "디컴파일 결과 trace 해줘", expected: "analysis" },
  { prompt: "inspect 바이너리: entry point는?", expected: "analysis" },
  { prompt: "ida 대신 Ghidra로 봐줘", expected: "analysis" },
  { prompt: "분석해줘: 이 코드의 취약점", expected: "analysis" },
  { prompt: "리버스 해줘: auth 함수", expected: "analysis" },
  { prompt: "call graph 그려줘", expected: "analysis" },
  { prompt: "Ghidra로 문자열 검색해줘", expected: "analysis" },
  { prompt: "xrefs로 참조 추적해줘", expected: "analysis" },
  // generation 10
  { prompt: "DaVinci Resolve로 영상 편집 가이드 만들어줘", expected: "generation" },
  { prompt: "유튜브 썸네일 만들어줘 1280x720", expected: "generation" },
  { prompt: "썸네일 디자인해줘", expected: "generation" },
  { prompt: "PDF 가이드 만들어줘", expected: "generation" },
  { prompt: "HTML로 카드뉴스 만들어줘", expected: "generation" },
  { prompt: "영상 자막 SRT 생성해줘", expected: "generation" },
  { prompt: "이미지 생성: 마스크 착용 Z세대 인포그래픽", expected: "generation" },
  { prompt: "매뉴얼 작성해줘: 설치부터 배포까지", expected: "generation" },
  { prompt: "DaVinci Resolve 21.3.7 ENG 가이드 편집할 수 있도록", expected: "generation" },
  { prompt: "유튜브 설명란과 태그 만들어줘", expected: "generation" },
  // chore 10
  { prompt: "git status 보여줘", expected: "chore" },
  { prompt: "npm run build 실행해줘", expected: "chore" },
  { prompt: "ls 파일 목록 보여줘", expected: "chore" },
  { prompt: "cat package.json", expected: "chore" },
  { prompt: "--update check 해줘", expected: "chore" },
  { prompt: "git log 보여줘", expected: "chore" },
  { prompt: "npm test 결과 알려줘", expected: "chore" },
  { prompt: "setup Ghidra 해줘", expected: "chore" },
  { prompt: "--help 보여줘", expected: "chore" },
  { prompt: "git diff 보여줘", expected: "chore" },
];

function toMessages(prompt: string): Message[] {
  return [{ role: "user", content: prompt } as Message];
}

// ── 2) 문맥 보존율: truncated 10세트 ────────────────────────────────
const TRUNCATED_CASES = Array.from({ length: 10 }, (_, i) => ({
  tool: `Read:file${i}.txt`,
  content: "a".repeat(6000), // >5000 → truncated
  attachHint: `image-${i}.png 하단 잘림: what leaders pay attention to determines who stays 유실`,
}));

// ── 3) 결과물 PASS율: outputQuality ──────────────────────────────────
const OUTPUT_CASES = [
  // PASS: 밑줄 5개 + 출처 + 정답은 뒤에
  {
    label: "PASS_완벽",
    html: `<span class="ul">A</span> <span class="ul">B</span> <span class="ul">C</span> <span class="ul">D</span> <span class="ul">E</span> 내용... ` + "x".repeat(900) + `<div>정답: ③</div>` + `<div>출처: EvidenceLedger — Read(src/a.ts)</div>`,
    expected: 5,
    expectOk: true,
  },
  // FAIL: 정답이 첫 800자에 노출 (스포일러)
  {
    label: "FAIL_정답노출",
    html: `정답은 ③ 입니다. ` + `<span class="ul">A</span>`.repeat(5),
    expected: 5,
    expectOk: false,
  },
  // FAIL: 밑줄 개수 부족 (1개만)
  {
    label: "FAIL_밑줄부족",
    html: `<span class="ul">A</span> 내용... 출처: ...`,
    expected: 5,
    expectOk: false,
  },
  // FAIL: placeholder
  {
    label: "FAIL_TODO",
    html: `<span class="ul">A</span>`.repeat(5) + ` TODO 내용 출처: ...`,
    expected: 5,
    expectOk: false,
  },
  // FAIL: 수치 있는데 출처 없음
  {
    label: "FAIL_출처없음",
    html: `<span class="ul">A</span>`.repeat(5) + ` 매출 1,200원 증가 — 숫자 있음`,
    expected: 5,
    expectOk: false,
  },
  // PASS: generation, 밑줄 기대 없음 + 출처 있음
  {
    label: "PASS_generation",
    html: `<h1>가이드</h1> 내용 출처: EvidenceLedger`,
    expected: null,
    expectOk: true,
  },
];

function runIntentBenchmark(): { acc: number; passed: number; total: number; failures: string[] } {
  let passed = 0;
  const failures: string[] = [];
  for (const { prompt, expected } of INTENT_DATASET) {
    const intent = classifyIntent(toMessages(prompt));
    const ok = intent.kind === expected;
    if (ok) passed++;
    else failures.push(`"${prompt.slice(0,30)}…" → got ${intent.kind}, want ${expected} (conf ${intent.confidence})`);
  }
  const total = INTENT_DATASET.length;
  return { acc: passed / total, passed, total, failures };
}

function runContextPreservation(): { rate: number; passed: number; total: number; detail: string[] } {
  const ledger = new EvidenceLedger();
  for (const c of TRUNCATED_CASES) {
    ledger.fromToolResult(c.tool, { file_path: c.tool }, c.content);
    ledger.fromUserAttach(`image-${c.tool}.png`, c.attachHint, true);
  }
  const summary = ledger.summarizeForPrompt();
  // 잘림 플래그가 요약에 포함되는지
  const hasFlag = (summary.match(/TRUNCATED/g) || []).length;
  const passed = hasFlag >= 5 ? 10 : hasFlag; // 최소 5개 이상 플래그면 모두 인지한 것으로 간주 — 보수적
  // 더 정확히: 각 entry가 truncated true로 저장됐는지
  const entries = ledger.list();
  const truncatedEntries = entries.filter(e => e.truncated).length;
  const rate = truncatedEntries / entries.length;
  const detail = [
    `entries: ${entries.length}, truncated: ${truncatedEntries}, flags in summary: ${hasFlag}`,
    `summary preview: ${summary.slice(0,400).replace(/\n/g," | ")}…`,
  ];
  return { rate, passed: Math.round(rate*10), total: 10, detail };
}

function runQualityBenchmark(): { passRate: number; results: Array<{label:string; ok:boolean; expectOk:boolean}> } {
  const results = OUTPUT_CASES.map(c => {
    const blocks = [{ type: "text" as const, text: c.html, content: c.html } as any];
    const report = qualityGate(blocks, { expectedUnderlineCount: c.expected });
    return { label: c.label, ok: report.ok, expectOk: c.expectOk, checks: report.checks };
  });
  // 정확도: 예상과 일치한 케이스 수
  const correct = results.filter(r => r.ok === (r as any).expectOk).length;
  return { passRate: correct / results.length, results: results as any };
}

// ── main ─────────────────────────────────────────────────────────────
const intent = runIntentBenchmark();
const ctx = runContextPreservation();
const qual = runQualityBenchmark();

console.log("=== 맥락 이해 벤치마크 v2.23.2 ===\n");
console.log(`[1] 의도 정확도: ${intent.passed}/${intent.total} = ${(intent.acc*100).toFixed(1)}% (목표 85%+)`);
if (intent.failures.length) {
  console.log("  실패 케이스:");
  intent.failures.slice(0,8).forEach(f => console.log("   - " + f));
}
console.log("");
console.log(`[2] 문맥 보존율: truncated flagged ${ctx.passed}/${ctx.total} = ${(ctx.rate*100).toFixed(1)}% (목표 90%+)`);
ctx.detail.forEach(d => console.log("  " + d));
console.log("");
console.log(`[3] 결과물 PASS 판정 정확도: ${(qual.passRate*100).toFixed(1)}% (4 FAIL을 FAIL로, 2 PASS를 PASS로 맞췄는가)`);
(qual.results as any).forEach((r:any) => console.log(`  - ${r.label}: gate ok=${r.ok} (기대 ${r.expectOk}) → ${r.ok===r.expectOk?"CORRECT":"WRONG"}`));
console.log("");

// 종합 게이트
const gates = [
  intent.acc >= 0.85,
  ctx.rate >= 0.9,
  qual.passRate >= 0.83, // 5/6 이상
];
const allPass = gates.every(Boolean);
console.log(`종합: ${allPass ? "✅ PASS — 3대 지표 모두 목표 달성" : "⚠️ 부분 FAIL — 개선 필요"}`);
console.log(` 세부: 의도 ${gates[0]?"PASS":"FAIL"} / 문맥 ${gates[1]?"PASS":"FAIL"} / 품질 ${gates[2]?"PASS":"FAIL"}`);

// JSON 저장용
import { writeFileSync, mkdirSync } from "node:fs";
mkdirSync("benchmarks/results", { recursive: true });
writeFileSync("benchmarks/results/contextUnderstanding.json", JSON.stringify({
  intent: { acc: intent.acc, passed: intent.passed, total: intent.total, failures: intent.failures },
  context: { rate: ctx.rate, detail: ctx.detail },
  quality: { passRate: qual.passRate, results: qual.results },
  gates, allPass, at: new Date().toISOString(),
}, null, 2));
console.log("\n→ 저장: benchmarks/results/contextUnderstanding.json");
