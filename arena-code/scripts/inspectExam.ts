/**
 * Exam QA 4-Eye — 정적(0.1초) + 브라우저(5초) 2단계 검수
 * 사용: npx tsx scripts/inspectExam.ts
 *       npx tsx scripts/inspectExam.ts --browser /abs/path/to/file.html
 */
import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { inspectStatic } from "../src/visual/inspectionTeam.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");
const TARGETS = [
  join(ROOT, "중3과학시험지/3학년_과학_문제지.html"),
  join(ROOT, "중3과학시험지/3학년_과학_정답및해설지.html"),
  join(ROOT, "중3과학시험지/12살을위한_쉬운과학설명서.html"),
];

const argFile = process.argv.find(a => a.endsWith(".html") && existsSync(a));

async function main() {
  if (argFile) {
    const html = readFileSync(argFile, "utf-8");
    const r = inspectStatic(html);
    console.log(`\n=== ${argFile} ===`);
    console.log(`종합: ${r.overallGrade} ${r.overallScore}점 — ${r.pass ? "PASS ✅" : "FAIL 🚫"}`);
    r.eyes.forEach(e => console.log(`  ${e.eye.padEnd(15)} ${e.grade.padEnd(4)} ${e.score}점 ${e.issues.length ? "— " + e.issues[0].slice(0, 80) : "OK"}`));
    if (r.fixInstructions.length) {
      console.log("\n🔧 수정 지시:");
      r.fixInstructions.forEach((s, i) => console.log(`  ${i+1}. ${s}`));
    }
    process.exit(r.pass ? 0 : 1);
  }

  let allPass = true;
  for (const f of TARGETS) {
    console.log(`\n=== ${f} ===`);
    if (!existsSync(f)) { console.log("  SKIP not found"); continue; }
    const html = readFileSync(f, "utf-8");
    const r = inspectStatic(html);
    console.log(`  종합: ${r.overallGrade} ${r.overallScore}점 — ${r.pass ? "PASS ✅" : "FAIL 🚫"}`);
    r.eyes.forEach(e => {
      const icon = e.grade === "PASS" ? "✓" : e.grade === "WARN" ? "⚠" : "✗";
      console.log(`    ${e.eye.padEnd(15)} ${e.grade.padEnd(4)} ${String(e.score).padStart(3)}점 ${icon} ${e.issues.length ? e.issues[0].slice(0, 90) : "OK"}`);
    });
    if (!r.pass) {
      r.fixInstructions.forEach(s => console.log(`    → ${s}`));
      allPass = false;
    }
  }
  console.log(`\n${allPass ? "✅ 전체 PASS" : "❌ FAIL 있음 — 수정 필요"}`);
  if (!allPass) console.log("브라우저 모드 추가 검증: node scripts/inspect_layout.js");
  process.exit(allPass ? 0 : 1);
}

main().catch(e => { console.error(e); process.exit(1); });
