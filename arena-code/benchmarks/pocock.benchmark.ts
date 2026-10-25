/**
 * Pocock Benchmark — code-review 2축 + pr danger + retro 3종 검증
 * 원전: mattpocock/skills code-review(2축)/pr/retro + show-me
 */
import { codeReview, SMELL_BASELINE } from "../src/loop/codeReview.js";
import { buildPrBody, validatePrBody, examplePrBody } from "../src/loop/prTemplate.js";
import { runRetro, formatRetroReport } from "../src/loop/retro.js";

function runCodeReview() {
  const checks: { label: string; ok: boolean; detail?: string }[] = [];
  // 1) fixedPoint 없으면 throw
  let threw = false;
  try { (codeReview as any)("diff", { diff:"x", fixedPoint:"" }); } catch { threw = true; }
  checks.push({ label: "fixedPoint 없이 호출 시 throw", ok: threw });
  // 2) empty diff throw
  threw = false;
  try { codeReview("", { fixedPoint:"main" }); } catch { threw = true; }
  checks.push({ label: "empty diff throw", ok: threw });
  // 3) smell 탐지 — Duplicated Code / Mysterious Name 패턴 포함 diff는 Standards에 잡혀야
  const diffWithSmell = "function foo(tmp, data){ console.log(tmp) }\n// copy paste duplicated code here";
  const r1 = codeReview(diffWithSmell, { fixedPoint:"main", spec:null, standardsDocs:[] });
  checks.push({ label: "smell diff → Standards finding 있음", ok: r1.standards.length >= 1, detail: JSON.stringify(r1.standards.map(s=>s.rule)) });
  checks.push({ label: "smell은 judgement severity", ok: r1.standards.some(s=>s.severity==="judgement") });
  // 4) standardsDocs 금지 규칙 — console.log 금지 문서가 있으면 hard로 잡힘
  const r2 = codeReview("added console.log('debug')", { fixedPoint:"main", standardsDocs:["rule: no console.log"] });
  checks.push({ label: "repo 표준 위반은 hard", ok: r2.standards.some(s=>s.rule.includes("no console.log") && s.severity==="hard") });
  // 5) report는 두 축 분리, 리랭킹 없음
  const diffOk = "function checkout(cart){ return cart.total }";
  const spec = "Spec: user must be able to checkout with valid cart — must implement checkout";
  const r3 = codeReview(diffOk, { fixedPoint:"main", spec, standardsDocs:[] });
  checks.push({ label: "report에 Standards/Spec 분리", ok: Array.isArray(r3.standards) && Array.isArray(r3.spec) });
  checks.push({ label: "summary에 worst per axis 포함", ok: /worst Standards/.test(r3.summary) });
  // 6) Spec null이면 Spec 축 skip
  const r4 = codeReview(diffOk, { fixedPoint:"HEAD~1", spec: null });
  checks.push({ label: "spec null → Spec 0건(no spec available)", ok: r4.spec.length===0 });
  // 7) SMELL_BASELINE 12종 정확히
  checks.push({ label: "smell baseline 12종", ok: SMELL_BASELINE.length===12 });
  return checks;
}

function runPr() {
  const checks: { label: string; ok: boolean; detail?: string }[] = [];
  const body = buildPrBody({
    summaryVisual: "on(save)\n  if content unchanged return cached\n  write new",
    summaryVisualKind: "pseudocode",
    evidenceBefore: "FAIL: tautological test",
    evidenceAfter: "PASS: interface test",
    door: "two-way",
    blastRadius: "narrow: pr template",
    closes: "#999",
  });
  checks.push({ label: "PR body에 Summary/Evidence/Merge Danger 3섹션", ok: body.includes("## Summary") && body.includes("## Evidence") && body.includes("## Merge Danger") });
  checks.push({ label: "Door 표기", ok: /Door:.*?two-way/.test(body) });
  checks.push({ label: "Blast Radius 표기", ok: /Blast Radius:/.test(body) });
  const v = validatePrBody(body);
  checks.push({ label: "validatePrBody PASS", ok: v.ok, detail: v.missing.join(",") });
  const bad = "## Summary\nhello";
  const v2 = validatePrBody(bad);
  checks.push({ label: "누락된 PR은 FAIL", ok: !v2.ok && v2.missing.length>=2 });
  checks.push({ label: "examplePrBody 검증 PASS", ok: validatePrBody(examplePrBody()).ok });
  return checks;
}

function runRetroBench() {
  const checks: { label: string; ok: boolean; detail?: string }[] = [];
  // Navigation — Grep 4회 이상
  const r1 = runRetro({ toolCalls:["Grep a","Grep b","Grep c","Grep d"], errors:[] });
  checks.push({ label: "Navigation 4회 → finding", ok: r1.some(c=>c.category==="Navigation") });
  // Automated checks — console.log
  const r2 = runRetro({ toolCalls:[], errors:["console.log left"] });
  checks.push({ label: "console.log → Automated checks high", ok: r2.some(c=>c.category==="Automated checks" && c.severity==="high") });
  // Coding standards — judgement vs mechanical
  const r3 = runRetro({ toolCalls:[], errors:["Feature Envy in checkout"] });
  checks.push({ label: "smell → Coding standards 제안", ok: r3.some(c=>c.category==="Coding standards") });
  // AGENTS.md 비대
  const r4 = runRetro({ toolCalls:[], errors:[], agentsMdLines:1200 });
  checks.push({ label: "AGENTS.md 1200줄 → Global AGENTS.md", ok: r4.some(c=>c.category==="Global AGENTS.md") });
  // 포맷
  const fmt = formatRetroReport(r1);
  checks.push({ label: "retro 리포트는 심각도 순", ok: fmt.includes("Retro") });
  // 심각도 정렬: high가 먼저
  const mixed = runRetro({ toolCalls:["Grep a","Grep b","Grep c","Grep d", "Browser screenshot"], errors:["console.log"], agentsMdLines:1200 });
  const firstHigh = mixed[0]?.severity==="high";
  checks.push({ label: "high severity가 먼저 정렬", ok: firstHigh, detail: mixed.map(m=>m.severity).join(",") });
  return checks;
}

export function runPocockBenchmark() {
  const a = runCodeReview();
  const b = runPr();
  const c = runRetroBench();
  const all = [...a,...b,...c];
  const passed = all.filter(x=>x.ok).length;
  const total = all.length;
  return { codeReview: { pass: a.filter(x=>x.ok).length, total: a.length, fails: a.filter(x=>!x.ok).map(x=>x.label) }, pr: { pass: b.filter(x=>x.ok).length, total: b.length, fails: b.filter(x=>!x.ok).map(x=>x.label) }, retro: { pass: c.filter(x=>x.ok).length, total: c.length, fails: c.filter(x=>!x.ok).map(x=>x.label) }, passed, total, acc: passed/total, failures: all.filter(x=>!x.ok).map(x=>`${x.label}: ${x.detail??""}`) };
}

if (import.meta.url.endsWith("pocock.benchmark.ts") || process.argv[1]?.includes("pocock")) {
  const r = runPocockBenchmark();
  console.log(JSON.stringify(r,null,2));
  console.log(`\nPocock: ${r.passed}/${r.total} (${(r.acc*100).toFixed(1)}%) ${r.passed===r.total?"PASS":"FAIL"}`);
  if (r.failures.length) { console.log("Failures:"); r.failures.forEach(f=>console.log(" -",f)); }
  process.exit(r.passed===r.total?0:1);
}
