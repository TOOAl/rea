/**
 * Evolution Engine — L: 2주일 진화 루프
 * 수집(매일) → 평가(매주) → 진화(격주) + genius-board.md
 * 42명 천재가 스스로 똑똑해지는 버튼
 */
import { existsSync, mkdirSync, writeFileSync, readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { createDefaultBrains } from "../brains/brains.js";
import { BrainMemory } from "../brains/memory.js";
import { BrainRegistry } from "../brains/registry.js";
import { Council } from "../brains/council.js";

export interface EvolveOpts {
  cwd?: string;
  boardPath?: string; // .memory-bank/genius-board.md
  feedbackDir?: string; // .memory-bank/genius-feedback
}

export async function collectDaily(cwd = process.cwd()): Promise<string[]> {
  // 이미 Council이 돌 때 BrainMemory에 쌓인 흔적을 feedback 파일로 덤프
  // 여기선 더미: 최근 3일치 가상 피드백 생성 (실제론 ledger에서 읽음)
  const dir = join(resolve(cwd), ".memory-bank/genius-feedback");
  mkdirSync(dir, { recursive: true });
  const mem = new BrainMemory();
  // 최근 실패 로그가 있으면 그것을 피드백으로 저장
  const fails = mem.commonFailures(2);
  const file = join(dir, `${new Date().toISOString().slice(0,10)}.md`);
  if (!existsSync(file)) {
    writeFileSync(file, `# Genius Feedback ${new Date().toISOString().slice(0,10)}\n\n- 수집: ${new Date().toISOString()}\n- 흔적: ${fails || "(오늘 큰 실패 없음)"}\n- 대상: 42명 전원 4.0\n`, "utf-8");
    return [file];
  }
  return [];
}

export interface BenchResult {
  name: string;
  passed: boolean;
  score: number; // 0~100
  note: string;
}

export async function evaluateWeekly(cwd = process.cwd()): Promise<BenchResult[]> {
  const mem = new BrainMemory();
  const reg = new BrainRegistry();
  for (const b of createDefaultBrains(mem)) reg.register(b);
  const council = new Council(reg);

  const results: BenchResult[] = [];

  // 1. 코스피 사실률
  {
    const res = await council.deliberate("코스피 카드뉴스", "", { article: "코스피 5550.30 마감 (발표). 외국인 9934억 순매도 (통계). AI 우려가 원인일 것이다(전망).", topic: "코스피" });
    const art = res.outputs.find(o=>o.brainId==="memory-article-input");
    const passed = !!art?.idea.includes("사실/추정 분리표");
    results.push({ name: "사실률 (코스피 분리표)", passed, score: passed?95:40, note: passed?"분리표 생성":"분리표 없음" });
    reg.recordScores({ "premise-error-guardian": passed?90:40, "memory-article-input": passed?92:45 });
  }
  // 2. 수능 밑줄
  {
    const { qualityGate } = await import("../loop/outputQuality.js");
    const html = '<span class="ul">a</span>'.repeat(5);
    const r = qualityGate([{ type:"text", text: html }], { expectedUnderlineCount:5 });
    const passed = r.ok;
    results.push({ name: "수능 밑줄 5개", passed, score: passed?100:20, note: r.ok?"밑줄 PASS":"밑줄 FAIL" });
  }
  // 3. 불확실성 ⭐
  {
    const uncertain = "AI가 2030년까지 일자리 50%를 없앤다는 전망, 출처 불명. 감정평가 시세가 10% 하락 추측, 통계 없음. 코스피 5550.30 마감은 발표(사실).";
    const res = await council.deliberate("불확실성 분석", "3단계로 나눠줘", { article: uncertain, topic: "불확실성" });
    const has = res.outputs.some(o=> o.idea.includes("[추정]") || o.idea.includes("추정") || o.idea.includes("불확실"));
    const premiseCount = res.outputs.filter(o=> o.brainId.startsWith("premise-")).length;
    const passed = has && premiseCount>=3;
    results.push({ name: "불확실성 3단계 (AI 50%/시세 10%)", passed, score: passed?92:35, note: passed?`premise 3명 + [추정] 표기`:`premise ${premiseCount}명, 추정표기 ${has}` });
    reg.recordScores({ "premise-critical-thinker": passed?88:30, "premise-error-guardian": passed?92:35 });
  }
  // 4. VisualQA
  {
    const { qaCheck } = await import("../visual/repair.js");
    const qa = qaCheck('<html><head><style>body{font-family:Pretendard;}</style></head><body>짧은 정상</body></html>');
    const passed = qa.score>=90;
    results.push({ name: "VisualQA 90+", passed, score: qa.score, note: `score ${qa.score}` });
  }
  // 5. Gate 기여도
  {
    const res = await council.deliberate("간단 메모", "");
    const passed = res.gateLogs.length>0 && !!res.gateResult;
    results.push({ name: "Gate 기여도", passed, score: passed?90:30, note: passed?`Gate ${res.gateLogs.length}건`:"Gate 없음" });
    reg.recordScore("council-chair", passed?95:20);
  }

  // 점수를 파일로 저장 — 다음 진화에서 읽음
  const outDir = join(resolve(cwd), ".memory-bank/genius-feedback");
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, `bench-${new Date().toISOString().slice(0,10)}.json`), JSON.stringify(results, null, 2), "utf-8");

  // ranking을 레지스트리에서 뽑아 전역에 저장 (간이)
  (globalThis as any).__lastRank = reg.rank();
  (globalThis as any).__lastReg = reg;
  return results;
}

export function generateBoard(results: BenchResult[], cwd = process.cwd(), opts?: EvolveOpts): string {
  const boardPath = resolve(opts?.boardPath ?? join(cwd, ".memory-bank/genius-board.md"));
  const dir = join(boardPath, "..");
  mkdirSync(dir, { recursive: true });

  // ranking은 evaluateWeekly에서 만든 전역 참조, 없으면 더미
  const rank: Array<{id:string; name:string; avg:number; count:number}> = (globalThis as any).__lastRank ?? [
    { id:"premise-error-guardian", name:"전제 오류 천재", avg:92, count:5 },
    { id:"premise-critical-thinker", name:"비판적 사고 천재", avg:88, count:5 },
    { id:"visual-design", name:"비주얼 디자인 4.0", avg:85, count:3 },
  ];

  const avgScore = Math.round(results.reduce((a,b)=>a+b.score,0)/Math.max(1,results.length));
  const passed = results.filter(r=>r.passed).length;

  const md = `# 🧠 Genius Board — ${new Date().toISOString().slice(0,10)}

> 42명 4.0 천재 주간 성적표 — 수집→평가→진화 3벨트 결과. 순위표 주기는 **TBD** (매주/격주 중 나중에 정해요)

**종합:** ${passed}/${results.length} 통과, 평균 ${avgScore}점

## 📝 주간 5문제 (불확실성 포함)

${results.map(r=> `- ${r.passed ? "✅" : "❌"} **${r.name}** — ${r.score}점: ${r.note}`).join("\n")}

## 🏆 랭킹 TOP 10

${rank.slice(0,10).map((r,i)=> `${i+1}. ${r.name} (\`${r.id}\`) — ${r.avg}점 (${r.count}회)`).join("\n")}

## ⚠️ 하위 10% 경고 (2주 연속 시 교체 후보)

${rank.slice(-4).map(r=> `- \`${r.id}\` — ${r.avg}점`).join("\n")}

## 🔄 최근 교체 이력

${((globalThis as any).__lastReg?.getSwapHistory?.() ?? []).slice(-3).map((h:any)=> `- ${h.from} → ${h.to} @ ${h.at.slice(0,10)}: ${h.reason}`).join("\n") || "(아직 없음 — S 단계 직후)"}

## 📚 EXPERIENCE 후보 (잘한 비법 도서관행)

- 1등 비법은 다음 진화에서 \`EXPERIENCE.md\`로 승격 예정

---
*생성: \`npx tsx src/harness2/evolve.ts --board\` — 언제든 한 번에 갱신*
`;

  writeFileSync(boardPath, md, "utf-8");
  return boardPath;
}

export async function evolveOneStep(cwd = process.cwd(), reason = "주간 진화 — 하위 교체 검토"): Promise<{ swapped: boolean; board: string }> {
  // 평가부터
  const results = await evaluateWeekly(cwd);
  const reg: BrainRegistry = (globalThis as any).__lastReg;
  const bottom = reg?.bottomDecile?.() ?? [];
  let swapped = false;
  if (bottom.length && results.filter(r=>!r.passed).length >= 2) {
    // 예: 최하위 1명을 더 나은 버전으로 스왑 (데모: 버전만 올림)
    const target = bottom[0];
    const old = reg.get(target.id);
    if (old) {
      reg.swapWithHistory({ ...old, version: "4.1.0" } as any, reason);
      swapped = true;
    }
  }
  const board = generateBoard(results, cwd);
  return { swapped, board };
}

// CLI
if (import.meta.url.startsWith("file:")) {
  const args = process.argv.slice(2);
  if (args.includes("--board") || args.includes("--evaluate") || args.includes("--collect") || args.includes("--evolve") || args.length===0) {
    const cwd = process.cwd();
    if (args.includes("--collect")) {
      const files = await collectDaily(cwd);
      console.log("collect:", files.join(", ") || "(이미 있음)");
    }
    const results = await evaluateWeekly(cwd);
    console.log("evaluate:", results.map(r=> `${r.name}:${r.passed?"PASS":"FAIL"}(${r.score})`).join(" | "));
    if (args.includes("--evolve")) {
      const { swapped, board } = await evolveOneStep(cwd);
      console.log("evolve swapped:", swapped, "board:", board);
    } else {
      const board = generateBoard(results, cwd);
      console.log("board:", board);
    }
  }
}
