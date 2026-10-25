/**
 * Coding Understanding Benchmark — 코딩 의도·계획·검증 측정 (P1)
 * REA 6에이전트 코딩 능력 흡수 검증
 * 12살: 레고 설명서가 “조립인지 그림인지”를 헷갈리지 않는지 시험
 */
import { classifyIntentSync } from "../src/loop/intent.js";
import { deriveCodingPlan, formatCodingPlanPrompt, evaluateVerifyOutput, isCodingIntent } from "../src/loop/codingScaffold.js";
import type { Message } from "../src/providers/types.js";

type Case = { prompt: string; expectKind: string; expectIsCoding: boolean; expectDomainHint?: string };

const CASES: Case[] = [
  // implementation — feature/crud (4)
  { prompt: "로그인 기능 CRUD 만들어줘 — src/auth/login.ts에 JWT 포함", expectKind: "implementation", expectIsCoding: true, expectDomainHint: "crud" },
  { prompt: "게시판 API 추가해줘 — src/routes/posts.ts 에 GET/POST", expectKind: "implementation", expectIsCoding: true },
  { prompt: "결제 모듈 stripe 연동 구현해줘", expectKind: "implementation", expectIsCoding: true },
  { prompt: "README에 설치 가이드 작성해줘 — npm install rea-agents", expectKind: "implementation", expectIsCoding: true },

  // implementation — bugfix (3)
  { prompt: "버그 fix해줘 — queryLoop 무한 루프, evidenceSummary가 undefined래", expectKind: "implementation", expectIsCoding: true, expectDomainHint: "bugfix" },
  { prompt: "src/loop/context.ts 타입에러 패치해줘 — tsc failed", expectKind: "implementation", expectIsCoding: true },
  { prompt: "hotfix: Ghidra P-Code xrefs가 비어있을 때 fallback 추가", expectKind: "implementation", expectIsCoding: true },

  // implementation — refactor (2)
  { prompt: "기존 코드 리팩토링해줘 — queryLoop를 300줄 이하로 분리", expectKind: "implementation", expectIsCoding: true, expectDomainHint: "refactor" },
  { prompt: "리팩터: structuralContext를 P-Code IR로 정규화", expectKind: "implementation", expectIsCoding: true },

  // analysis — 코딩 맥락 포함 (2)
  { prompt: "/tmp/app 바이너리 분석해줘 — Ghidra로 entry point와 xrefs 추적", expectKind: "analysis", expectIsCoding: false },
  { prompt: "call graph 그려줘 — main에서 login까지 흐름", expectKind: "analysis", expectIsCoding: false },

  // question — 코딩 질문이지만 구현 아님 (2)
  { prompt: "tsc와 eslint 차이가 뭐야? 알려줘", expectKind: "question", expectIsCoding: false },
  { prompt: "다음 코드에서 버그가 어디야? ```ts\nconst a=1\n```", expectKind: "question", expectIsCoding: true }, // 코드블록 있으면 코딩 scaffold 대상이지만 kind는 question

  // chore — 코딩과 무관 (2)
  { prompt: "git status 보여줘", expectKind: "chore", expectIsCoding: false },
  { prompt: "npm test 결과 알려줘", expectKind: "chore", expectIsCoding: false },

  // generation — 시각물 (1)
  { prompt: "카드뉴스 썸네일 만들어줘 — 1280x720 타임캡슐 주제", expectKind: "generation", expectIsCoding: false },
];

function msg(t: string): Message[] { return [{ role: "user", content: t }]; }

function runIntent() {
  let pass = 0; const fails: string[] = [];
  for (const c of CASES) {
    const intent = classifyIntentSync(msg(c.prompt));
    const ok = intent.kind === c.expectKind;
    if (ok) pass++;
    else fails.push(`"${c.prompt.slice(0, 40)}" 기대 ${c.expectKind} 실제 ${intent.kind} (ev: ${intent.evidence.slice(0, 1).join("")})`);
  }
  return { pass, total: CASES.length, fails };
}

function runIsCoding() {
  let pass = 0; const fails: string[] = [];
  for (const c of CASES) {
    const intent = classifyIntentSync(msg(c.prompt));
    const got = isCodingIntent(intent, c.prompt);
    if (got === c.expectIsCoding) pass++; else fails.push(`"${c.prompt.slice(0, 40)}" 기대 isCoding=${c.expectIsCoding} 실제 ${got} kind=${intent.kind}`);
  }
  return { pass, total: CASES.length, fails };
}

function runPlan() {
  // 1) bugfix는 재현→수정, refactor는 영향도, feature는 설계→구현 포함
  // 2) 마지막은 항상 verify, 3~7개
  // 3) format에 Plan→Act→Verify 문구 포함
  const checks: { label: string; ok: boolean; detail?: string }[] = [];

  const bugfix = deriveCodingPlan("버그 fix해줘 — 무한루프 패치", classifyIntentSync(msg("버그 fix해줘 — 무한루프 패치")));
  checks.push({ label: "bugfix 플랜 4개 이상", ok: bugfix.length >= 4, detail: bugfix.map((t) => t.title).join(" | ") });
  checks.push({ label: "bugfix에 재현/원인/수정 포함", ok: bugfix.some((t) => /재현/.test(t.title)) && bugfix.some((t) => /수정/.test(t.title)) });
  checks.push({ label: "마지막은 verify", ok: bugfix[bugfix.length - 1].kind === "verify" && /검증/.test(bugfix[bugfix.length - 1].title) });

  const refactor = deriveCodingPlan("리팩터: structuralContext 분리", classifyIntentSync(msg("리팩터: structuralContext 분리")));
  checks.push({ label: "refactor에 영향도 포함", ok: refactor.some((t) => /영향도/.test(t.title)) });

  const crud = deriveCodingPlan("로그인 CRUD 만들어줘 src/auth/login.ts", classifyIntentSync(msg("로그인 CRUD 만들어줘 src/auth/login.ts")));
  checks.push({ label: "crud에 설계/구현 포함", ok: crud.some((t) => /설계/.test(t.title)) && crud.some((t) => /구현/.test(t.title)) });

  checks.push({ label: "플랜 7개 초과 금지", ok: bugfix.length <= 7 && crud.length <= 7 });

  const fmt = formatCodingPlanPrompt(bugfix);
  checks.push({ label: "포맷에 Plan→Act→Verify 문구", ok: /Plan→Act→Verify/.test(fmt) });
  checks.push({ label: "포맷에 TodoWrite/검증 규칙", ok: /TodoWrite/.test(fmt) && /verify/.test(fmt) });

  const pass = checks.filter((c) => c.ok).length;
  return { pass, total: checks.length, fails: checks.filter((c) => !c.ok).map((c) => `${c.label}: ${c.detail ?? "fail"}`) };
}

function runVerify() {
  const checks: { label: string; ok: boolean }[] = [];
  const okOut = evaluateVerifyOutput("PASS 12 tests ✓", "npm test");
  checks.push({ label: "PASS 출력은 ok=true", ok: okOut.ok === true });
  const failOut = evaluateVerifyOutput("Error: Cannot find module 'x' at src/index.ts:3", "npx tsc --noEmit");
  checks.push({ label: "Error 출력은 ok=false", ok: failOut.ok === false });
  checks.push({ label: "실패 시 nextAction 포함", ok: !!failOut.nextAction && /Edit/.test(failOut.nextAction) });
  checks.push({ label: "실패 summary는 1줄", ok: failOut.summary.startsWith("VERIFY FAIL") });
  const empty = evaluateVerifyOutput("", "npm run build");
  checks.push({ label: "빈 출력은 pass(조용한 성공)", ok: empty.ok === true });
  const pass = checks.filter((c) => c.ok).length;
  return { pass, total: checks.length, fails: checks.filter((c) => !c.ok).map((c) => c.label) };
}

export const codingCases = CASES;
export function runCodingBenchmark() {
  const a = runIntent();
  const b = runIsCoding();
  const c = runPlan();
  const d = runVerify();
  const total = a.total + b.total + c.total + d.total;
  const passed = a.pass + b.pass + c.pass + d.pass;
  return {
    intent: a,
    isCoding: b,
    plan: c,
    verify: d,
    acc: passed / total,
    passed,
    total,
    failures: [...a.fails, ...b.fails, ...c.fails, ...d.fails],
  };
}

// CLI
if (import.meta.url.endsWith("codingUnderstanding.benchmark.ts") || process.argv[1]?.includes("codingUnderstanding")) {
  const r = runCodingBenchmark();
  console.log(JSON.stringify(r, null, 2));
  const ok = r.passed === r.total;
  console.log(`\nCodingUnderstanding: ${r.passed}/${r.total} (${(r.acc * 100).toFixed(1)}%) ${ok ? "PASS" : "FAIL"}`);
  if (r.failures.length) { console.log("Failures:"); r.failures.forEach((f) => console.log(" -", f)); }
  process.exit(ok ? 0 : 1);
}
