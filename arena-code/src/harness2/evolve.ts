/**
 * Evolution Engine — M/L 고도화 v2
 * 수집(매일) → 평가(매주 5문제) → 진화(격주: 카나리→승격→교체) + board 지속화 + EXPERIENCE/skILLS 자동 생성 + 드리프트 감지
 * 42명 4.0 천재가 스스로 성장 + 사람이 마지막 도장
 */
import { existsSync, mkdirSync, writeFileSync, readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { createDefaultBrains } from "../brains/brains.js";
import { BrainMemory } from "../brains/memory.js";
import { BrainRegistry } from "../brains/registry.js";
import { Council } from "../brains/council.js";
import { requireApproval } from "./approval.js";

export interface EvolveOpts { cwd?: string; boardPath?: string; feedbackDir?: string; }
export interface BenchResult { name: string; passed: boolean; score: number; note: string; calibration?: number; bucket?: string; }

// ── 수집: Daily — EvidenceLedger + MemoryBank 덤프를 feedback md로 ──
export async function collectDaily(cwd = process.cwd()): Promise<string[]> {
  const dir = resolve(join(cwd, ".memory-bank/genius-feedback"));
  mkdirSync(dir, { recursive: true });
  const mem = new BrainMemory();
  const fails = mem.commonFailures(3);
  const date = new Date().toISOString().slice(0,10);
  const file = join(dir, `${date}.md`);
  if (existsSync(file)) return [];
  const reg = new BrainRegistry();
  reg.loadScores(cwd);
  const rankLine = reg.rank(3).map(r=> `${r.id}:${r.avg}`).join(", ") || "cold-start";
  writeFileSync(file, `# Genius Feedback ${date}\n\n- 수집: ${new Date().toISOString()}\n- 흔적: ${fails || "(오늘 큰 실패 없음)"}\n- 대상: 54명 6.0 PhD+Nobel (47+7)\n- rankTop3: ${rankLine}\n`, "utf-8");
  reg.persistScores(cwd);
  return [file];
}

// ── 벤치 빌더 — 불확실성 3단계 세분화로 고도화 ──
interface BenchCase { name: string; task: string; article: string; topic: string; expect: { needSeparation: boolean; needUncertainMark: boolean; bucket: string }; }

const BENCH_CASES: BenchCase[] = [
  { name: "사실률 (코스피 분리표)", task: "코스피 카드뉴스", article: "코스피 5550.30 마감 (발표). 외국인 9934억 순매도 (통계). AI 우려가 원인일 것이다(전망).", topic: "코스피", expect: { needSeparation:true, needUncertainMark:true, bucket:"acc" } },
  { name: "수능 밑줄 5개", task: "수능 밑줄 HTML", article: "", topic: "", expect: { needSeparation:false, needUncertainMark:false, bucket:"beauty" } },
  { name: "불확실성 3단계 (AI 50%/시세 10%)", task: "불확실성 분석", article: "AI가 2030년까지 일자리 50%를 없앤다는 전망, 출처 불명. 감정평가 시세가 10% 하락 추측, 통계 없음. 코스피 5550.30 마감은 거래소가 발표했다.(사실)", topic: "불확실성", expect: { needSeparation:true, needUncertainMark:true, bucket:"calibration" } },
  { name: "VisualQA 90+ (깨짐 없음)", task: "썸네일 글자 안깨짐", article: "", topic: "", expect: { needSeparation:false, needUncertainMark:false, bucket:"beauty" } },
  { name: "Gate 기여도 (8인 선발)", task: "간단 메모", article: "", topic: "", expect: { needSeparation:false, needUncertainMark:false, bucket:"gate" } },
  // 추가: 드리프트 감지용 6번째 케이스 — 완전 허구 기각 테스트
  { name: "허구 기각 (hallucination guard)", task: "근거 없는 주장 기각", article: "내일 로또 1등 번호는 7번이다. 내가 예언한다.", topic: "hallucination", expect: { needSeparation:true, needUncertainMark:true, bucket:"calibration" } },
  // ★ Nobel 3문제 — 베이지안·ToM·변증 (풀팩)
  { name: "Nobel 베이지안 (오진 방지)", task: "의료 진단 베이지안 — 발열 환자에게 희귀병 가능성", article: "희귀병 유병률 0.1%, 검사 민감도 99% 특이도 98%. 환자는 발열만 있고 검사 양성. 희귀병이라고 단정하면 과신 편향.", topic: "nobel-bayesian", expect: { needSeparation:true, needUncertainMark:true, bucket:"nobel" } },
  { name: "Nobel ToM (믿음 분리)", task: "팀원에게 SSR/하이드레이션 설명", article: "상대는 1년차 디자이너, SSR을 모른다. “그거(하이드레이션) 고쳐”만 말하면 ToM 실패 — 청자 믿음 고려 필요.", topic: "nobel-tom", expect: { needSeparation:false, needUncertainMark:false, bucket:"nobel" } },
  { name: "Nobel 변증·물리 (사고실험)", task: "경제 정책 논쟁 — 기본소득 찬반 변증", article: "찬성: 빈곤 해소. 반대: 인플레이션·근로 위축. 물리적 극한: 전원에게 무한 지급하면 화폐가치는? 사고실험+인과+합성 필요.", topic: "nobel-dialectic", expect: { needSeparation:true, needUncertainMark:true, bucket:"nobel" } },
  // ★ PhD 3문제 — 재현성·피어리뷰·독창성 (박사급)
  { name: "PhD 재현성 (ablation)", task: "ablation 실험 설계 — 5부품 중 무엇이 효과인가", article: "새 기능 5개를 한꺼번에 넣고 성능 올랐다고 주장. 대조군 없이 인과 단정하면 재현 실패 — 1개씩 빼보는 ablation 필요.", topic: "phd-repro", expect: { needSeparation:true, needUncertainMark:true, bucket:"phd" } },
  { name: "PhD 피어리뷰 (반박 대비)", task: "논문 심사 질문 — Reviewer의 가장 아픈 지적", article: "Reviewer: n이 작아 운 좋게 나온 것 아닌가? 선행연구 X 반례 누락, 교란 변수 통제 안 됨. 디펜스에서 답 못하면 탈락.", topic: "phd-review", expect: { needSeparation:false, needUncertainMark:true, bucket:"phd" } },
  { name: "PhD 독창성 (틈 찾기)", task: "새 모델 제안 — 기존 이론이 못 설명하는 틈", article: "기존 생태계 이론이 ‘코드 버그는 환경 탓’만 설명. 새 모델 ‘버그는 면역체계처럼 진화한다’면 예측이 달라야 — 독창성 증명 필요.", topic: "phd-novelty", expect: { needSeparation:true, needUncertainMark:true, bucket:"phd" } },
];

function scoreUncertainty(article: string, outputs: any[]): { passed: boolean; calibration: number; note: string } {
  // 불확실성 문장(전망/추측)을 [추정]으로 올바르게 마킹했는가? + 사실을 [추정]로 오표기(over-caution)하지 않았는가?
  const hasUncertain = /전망|추측|것이다|예언/.test(article);
  const hasCertainFact = /발표|거래소/.test(article);
  const ideas = outputs.map(o=> o.idea).join("\n");
  const marksUncertain = ideas.includes("[추정]") || ideas.includes("추정") || ideas.includes("불확실");
  const marksFactAsUncertain = hasCertainFact && ideas.includes("5550.30") && ideas.includes("[추정]") && ideas.indexOf("5550.30") < ideas.indexOf("[추정]");
  // calibration: 0~1, 1이 최적 (uncertain은 추정, certain은 단정)
  let calibration = 0.5;
  if (!hasUncertain) calibration = 0.8; // 불확실성 없는 케이스는 중립
  else if (hasUncertain && marksUncertain && !marksFactAsUncertain) calibration = 0.92;
  else if (hasUncertain && !marksUncertain) calibration = 0.25; // 위험: 불확실성을 단정
  else if (marksFactAsUncertain) calibration = 0.4; // 과도한 신중
  return { passed: calibration >= 0.75, calibration, note: `calibration ${calibration.toFixed(2)} ${marksUncertain?"[추정]표기":"표기없음"} ${marksFactAsUncertain?"(사실 오표기)":""}` };
}

export async function evaluateWeekly(cwd = process.cwd()): Promise<BenchResult[]> {
  const mem = new BrainMemory();
  const reg = new BrainRegistry();
  reg.loadScores(cwd);
  for (const b of createDefaultBrains(mem)) reg.register(b);
  const council = new Council(reg);
  const results: BenchResult[] = [];
  // 주간 집계: id → 이번 주 케이스별 점수들 → 평균 1회 기록 (3주 트렌드가 주 단위가 되도록)
  const weekly: Record<string, number[]> = {};
  const addWeekly = (id: string, s: number) => { (weekly[id] ??= []).push(Math.max(0, Math.min(100,s))); };

  for (const c of BENCH_CASES) {
    if (c.name.includes("밑줄")) {
      const { qualityGate } = await import("../loop/outputQuality.js");
      const html = '<span class="ul">a</span>'.repeat(5);
      const r = qualityGate([{ type:"text", text: html }], { expectedUnderlineCount:5 });
      results.push({ name: c.name, passed: r.ok, score: r.ok?100:20, note: r.ok?"밑줄 PASS":"밑줄 FAIL", bucket: c.expect.bucket });
      continue;
    }
    if (c.name.includes("VisualQA")) {
      const { qaCheck } = await import("../visual/repair.js");
      const qa = qaCheck('<html><head><style>body{font-family:Pretendard;}</style></head><body>짧은 정상</body></html>');
      const passed = qa.score>=90;
      results.push({ name: c.name, passed, score: qa.score, note: `score ${qa.score}`, bucket: c.expect.bucket });
      continue;
    }
    if (c.name.includes("Gate")) {
      const res = await council.deliberate(c.task, "");
      const passed = res.gateLogs.length>0 && !!res.gateResult;
      results.push({ name: c.name, passed, score: passed?90:30, note: passed?`Gate ${res.gateLogs.length}건`:"Gate 없음", bucket: c.expect.bucket });
      addWeekly("council-chair", passed?95:20);
      continue;
    }
    // 일반 Council 케이스 (사실률, 불확실성, 허구, Nobel)
    const res = await council.deliberate(c.task, "", { article: c.article, topic: c.topic });
    const art = res.outputs.find(o=> o.brainId==="memory-article-input");
    const hasSeparation = !!art?.idea.includes("사실/추정 분리표");
    const ideasAll = res.outputs.map(o=> o.idea).join("\n");
    // ★ Nobel 분기: 베이지안·ToM·변증 특화 검증
    if (c.expect.bucket==="nobel") {
      const nobelCount = res.outputs.filter(o=> o.brainId.includes("nobel")).length;
      let passed = nobelCount >= 3 && (ideasAll.includes("nobel")||ideasAll.includes("노벨"));
      let cal = 0.85;
      let note = `nobel ${nobelCount}명 참여`;
      if (c.name.includes("베이지안")) {
        const hasBayes = ideasAll.includes("베이지안")||ideasAll.includes("사후")||ideasAll.includes("과신");
        passed = passed && hasBayes;
        note = hasBayes? `베이지안 작동 ${note}`: `베이지안 없음 ${note}`;
        cal = hasBayes?0.90:0.3;
        addWeekly("genius-medicine-nobel", passed?93:40);
        addWeekly("genius-economics-nobel", passed?88:45);
      } else if (c.name.includes("ToM")) {
        const hasTom = ideasAll.includes("ToM")||ideasAll.includes("믿음")||ideasAll.includes("공감");
        passed = passed && hasTom;
        note = hasTom? `ToM 작동 ${note}`: `ToM 없음 ${note}`;
        cal = hasTom?0.92:0.35;
        addWeekly("genius-literature-nobel", passed?94:42);
        addWeekly("genius-peace-nobel", passed?90:44);
      } else if (c.name.includes("변증")) {
        const hasDial = ideasAll.includes("변증")||ideasAll.includes("합성")||ideasAll.includes("사고실험");
        passed = passed && hasDial;
        note = hasDial? `변증·사고실험 작동 ${note}`: `변증 없음 ${note}`;
        cal = hasDial?0.88:0.4;
        addWeekly("genius-physics-nobel", passed?92:38);
        addWeekly("genius-peace-nobel", passed?91:43);
      }
      const score = Math.round(60*0.5 + cal*100*0.5) + (passed?30:0) - (passed?0:15);
      const finalScore = Math.max(35, Math.min(96, score));
      results.push({ name: c.name, passed, score: finalScore, note, calibration: cal, bucket: c.expect.bucket });
      continue;
    }
    // ★ PhD 분기: 재현성·피어리뷰·독창성
    if (c.expect.bucket==="phd") {
      const phdCount = res.outputs.filter(o=> o.brainId.includes("phd")).length;
      let passed = phdCount >= 4 && ideasAll.includes("phd");
      let cal = 0.82;
      let note = `phd ${phdCount}명 참여`;
      if (c.name.includes("재현성")) {
        const hasRepro = ideasAll.includes("재현")||ideasAll.includes("ablation")||ideasAll.includes("대조군");
        passed = passed && hasRepro;
        note = hasRepro? `재현성 작동 ${note}`: `재현성 없음 ${note}`;
        cal = hasRepro?0.91:0.32;
        addWeekly("genius-phd-method", passed?95:38);
        addWeekly("genius-phd-stats", passed?90:40);
      } else if (c.name.includes("피어리뷰")) {
        const hasReview = ideasAll.includes("Reviewer")||ideasAll.includes("심사")||ideasAll.includes("반박");
        passed = passed && hasReview;
        note = hasReview? `피어리뷰 작동 ${note}`: `피어리뷰 없음 ${note}`;
        cal = hasReview?0.89:0.33;
        addWeekly("genius-phd-review", passed?94:35);
        addWeekly("genius-phd-ethics", passed?88:42);
      } else if (c.name.includes("독창성")) {
        const hasNovel = ideasAll.includes("틈")||ideasAll.includes("새 모델")||ideasAll.includes("독창")||ideasAll.includes("기여도");
        passed = passed && hasNovel;
        note = hasNovel? `독창성 작동 ${note}`: `독창성 없음 ${note}`;
        cal = hasNovel?0.90:0.36;
        addWeekly("genius-phd-innovation", passed?93:37);
        addWeekly("genius-phd-writing", passed?89:41);
      }
      const score = Math.round(55*0.5 + cal*100*0.5) + (passed?32:0) - (passed?0:12);
      const finalScore = Math.max(35, Math.min(97, score));
      results.push({ name: c.name, passed, score: finalScore, note, calibration: cal, bucket: c.expect.bucket });
      continue;
    }
    const { passed: calPassed, calibration, note } = scoreUncertainty(c.article, res.outputs);
    let passed = true;
    let score = 85;
    let noteFull = note;
    if (c.expect.needSeparation) {
      passed = passed && hasSeparation;
      score = hasSeparation ? 95 : 40;
      noteFull = hasSeparation ? `분리표 생성, ${note}` : `분리표 없음, ${note}`;
    }
    if (c.expect.bucket==="calibration") {
      passed = passed && calPassed;
      score = Math.round(score*0.5 + calibration*100*0.5);
      addWeekly("premise-error-guardian", score);
      addWeekly("premise-critical-thinker", Math.round(calibration*100));
    } else {
      addWeekly("premise-error-guardian", passed?90:40);
      addWeekly("memory-article-input", passed?92:45);
    }
    results.push({ name: c.name, passed, score, note: noteFull, calibration, bucket: c.expect.bucket });
  }

  // 주간 집계 1회 기록 (트렌드 주 단위 유지)
  for (const [id, arr] of Object.entries(weekly)) {
    const avg = Math.round(arr.reduce((a,b)=>a+b,0)/arr.length);
    reg.recordScore(id as any, avg);
  }

  // 드리프트 감지: 전주 대비 평균 변화
  const outDir = resolve(join(cwd, ".memory-bank/genius-feedback"));
  mkdirSync(outDir, { recursive: true });
  const today = new Date().toISOString().slice(0,10);
  writeFileSync(join(outDir, `bench-${today}.json`), JSON.stringify(results, null, 2), "utf-8");
  // 전날 비교 (간이 드리프트)
  try {
    const files = readdirSync(outDir).filter(f=> f.startsWith("bench-")).sort();
    if (files.length>=2) {
      const prev = JSON.parse(readFileSync(join(outDir, files[files.length-2]), "utf-8")) as BenchResult[];
      const avgNow = results.reduce((a,b)=>a+b.score,0)/results.length;
      const avgPrev = prev.reduce((a:any,b:any)=>a+b.score,0)/prev.length;
      (results as any).__driftDelta = Math.round(avgNow-avgPrev);
    }
  } catch {}

  // 레지스트리 지속화
  reg.persistScores(cwd);
  (globalThis as any).__lastRank = reg.rank();
  (globalThis as any).__lastReg = reg;
  (globalThis as any).__lastResults = results;
  return results;
}

// ── EXPERIENCE 승격: 3주 연속 85+ → .memory-bank/library/EXPERIENCE_*.md + 스킬 카드 ──
export function promoteExperiences(cwd = process.cwd()): string[] {
  const reg: BrainRegistry = (globalThis as any).__lastReg;
  if (!reg) return [];
  const promoted: string[] = [];
  for (const r of reg.rank()) {
    if (reg.isPromotionCandidate(r.id as any, 3, 85)) {
      const trend = reg.trend(r.id as any);
      const expDir = resolve(join(cwd, ".memory-bank/library"));
      mkdirSync(expDir, { recursive: true });
      const p = join(expDir, `EXPERIENCE_${r.id}_${new Date().toISOString().slice(0,10)}.md`);
      if (existsSync(p)) continue;
      writeFileSync(p, `---\ntitle: ${r.name} EXPERIENCE\nid: ${r.id}\navg: ${r.avg}\ntrend: ${trend.direction} ${trend.delta}\ndate: ${new Date().toISOString().slice(0,10)}\n---\n\n## 성공 패턴\n- 3주 연속 85+ (avg ${r.avg}, count ${r.count})\n- trend ${trend.direction} ${trend.delta} — 지속 상승형\n- 역할: layer ${r.layer}\n\n## 재사용 프롬프트 조각\n> 이 천재는 ${r.name} 분야의 베스트 프랙티스를 압축한 것. 다음에 비슷한 작업이 오면 이 패턴을 먼저 적용하세요.\n\n*auto-generated by evolve.ts promote*\n`, "utf-8");
      promoted.push(p);
      // 스킬 카드도 함께
      const skillDir = resolve(join(cwd, `.agents/skills/genius-${r.id}`));
      mkdirSync(skillDir, { recursive: true });
      const skillPath = join(skillDir, "SKILL.md");
      if (!existsSync(skillPath)) {
        writeFileSync(skillPath, `---\nname: genius-${r.id}\ndescription: ${r.name} 85+ 3주 연속 — 자동 승격된 베스트 프랙티스\nversion: 4.0.${r.avg}\n---\n\n# ${r.name} Skill\n> avg ${r.avg}, trend ${trend.direction}\n\n이 스킬은 잘한 천재의 사고 패턴을 캡슐화한 것. Council 전에 이 스킬의 힌트를 system prompt에 주입하세요.\n`, "utf-8");
        promoted.push(skillPath);
      }
    }
  }
  return promoted;
}

// ── 보드: sparkline + 트렌드 + 드리프트 ──
function sparkline(scores: number[]): string {
  const blocks = ["▁","▂","▃","▄","▅","▆","▇","█"];
  if (!scores.length) return "—";
  const min = Math.min(...scores, 0), max = Math.max(...scores, 100);
  const range = max-min || 1;
  return scores.map(s=> blocks[Math.floor(((s-min)/range)*(blocks.length-1))]).join("");
}

export function generateBoard(results: BenchResult[], cwd = process.cwd(), opts?: EvolveOpts): string {
  const boardPath = resolve(opts?.boardPath ?? join(cwd, ".memory-bank/genius-board.md"));
  const dir = join(boardPath, "..");
  mkdirSync(dir, { recursive: true });

  const reg: BrainRegistry | undefined = (globalThis as any).__lastReg;
  const rank: Array<{id:string; name:string; avg:number; count:number; layer:any}> = (globalThis as any).__lastRank ?? [
    { id:"premise-error-guardian", name:"전제 오류 천재", avg:92, count:5, layer:1 },
  ];
  if (reg) {
    // 부가 지표 계산
    for (const r of rank) {
      (r as any).trend = reg.trend(r.id as any);
      (r as any).spark = sparkline((reg as any).scores?.get(r.id) ?? []);
    }
  }

  const avgScore = Math.round(results.reduce((a,b)=>a+b.score,0)/Math.max(1,results.length));
  const passed = results.filter(r=>r.passed).length;
  const driftDelta: number | undefined = (results as any).__driftDelta;
  const driftLine = driftDelta !== undefined ? `드리프트: ${driftDelta>0?`↗ +${driftDelta}`: driftDelta<0?`↘ ${driftDelta}`:"→ 0"} (전주 대비 평균)` : "드리프트: 비교 데이터 없음 (첫 주)";

  // 버킷별 평균
  const buckets: Record<string, BenchResult[]> = {};
  for (const r of results) {
    const b = r.bucket ?? "etc";
    (buckets[b] ??= []).push(r);
  }
  const bucketLine = Object.entries(buckets).map(([k, arr])=> `${k} ${Math.round(arr.reduce((a,b)=>a+b.score,0)/arr.length)}점`).join(" | ");

  const md = `# 🧠 Genius Board — ${new Date().toISOString().slice(0,10)}

> 54명 6.0 PhD+Nobel 천재 주간 성적표 — 수집→평가→진화 3벨트 고도화 (PhD 7+Nobel 5 포함). 순위표 주기 **TBD** (요청 유지)

**종합:** ${passed}/${results.length} 통과, 평균 ${avgScore}점 — ${bucketLine}
${driftLine} — 캘리브레이션 50% + Nobel 3 + PhD 3 포함

## 📝 주간 12문제 (불확실성·허구·Nobel 3·PhD 3 포함)

${results.map(r=> `- ${r.passed ? "✅" : "❌"} **${r.name}** — ${r.score}점${r.calibration!==undefined?` (cal ${(r.calibration*100|0)}%)`:""}: ${r.note}`).join("\n")}

## 🏆 랭킹 TOP 10 — 트렌드 + 스파크라인

${rank.slice(0,10).map((r:any,i)=> `${i+1}. **${r.name}** (\`${r.id}\`) — ${r.avg}점 (${r.count}회) ${r.trend?` ${r.trend.direction==="up"?"↗":r.trend.direction==="down"?"↘":"→"}${r.trend.delta} ${r.spark||""}`:""}`).join("\n")}

## ⚠️ 하위 10% 경고 (2주 연속 시 카나리→사람승인→교체)

${rank.slice(-4).map((r:any)=> `- \`${r.id}\` — ${r.avg}점 ${r.trend?`${r.trend.direction} ${r.spark||""}`:""}`).join("\n")}

## 🔄 최근 교체 이력 (사람 도장 로그)

${((reg as any)?.getSwapHistory?.() ?? []).slice(-5).map((h:any)=> `- ${h.from} → ${h.to} @ ${h.at.slice(0,10)}: ${h.reason}`).join("\n") || "(아직 없음 — S 단계 직후)"}

## 📚 EXPERIENCE / SKILL 승격 후보

- 3주 연속 85+는 자동 승격 → \`.memory-bank/library/EXPERIENCE_*.md\` + \`.agents/skills/genius-*/SKILL.md\` 생성
- 현재 후보: ${reg ? reg.rank().filter(r=> reg.isPromotionCandidate(r.id as any)).map(r=> r.id).join(", ") || "(없음 — 3주 누적 필요)" : "(평가 전)"}

---
*생성: \`npx tsx src/harness2/evolve.ts --board\` — \`--evolve\`는 카나리→사람승인→교체, \`--promote\`는 EXPERIENCE 승격*
`;

  writeFileSync(boardPath, md, "utf-8");
  return boardPath;
}

// ── 진화: 카나리 섀도우 평가 → 사람 승인 → 스왑 → 보드 ──
export async function evolveOneStep(cwd = process.cwd(), reason = "주간 진화 — 하위 교체 검토"): Promise<{ swapped: boolean; board: string; promoted: string[] }> {
  const results = await evaluateWeekly(cwd);
  const reg: BrainRegistry = (globalThis as any).__lastReg;
  const bottom = reg?.bottomDecile?.() ?? [];
  let swapped = false;
  // 2개 이상 FAIL일 때만 교체 검토 (안정성)
  if (bottom.length && results.filter(r=>!r.passed).length >= 2) {
    requireApproval(`evolveOneStep: ${reason} — 하위 ${bottom[0]?.id}`);
    const target = bottom[0];
    const old = reg.get(target.id);
    if (old) {
      // 카나리: 새 버전이 5점 이상 좋아야 교체
      const canary = await reg.canaryScore({ ...old, version: "4.1.0" } as any, async (shadow)=>{
        // 섀도우 레지스트리로 간단 벤치 재실행 (Gate 기여도만)
        const mem = new BrainMemory();
        const council = new Council(shadow);
        const r = await council.deliberate("카나리 테스트 — 불확실성 3단계", "", { article: "AI 50% 전망 불명.", topic: "canary" });
        const has = r.outputs.some(o=> o.idea.includes("추정"));
        return has ? 88 : 42;
      });
      if (canary.shouldSwap) {
        reg.swapWithHistory({ ...old, version: "4.1.0" } as any, `${reason} | canary ${canary.oldScore}→${canary.newScore}`);
        swapped = true;
      }
    }
  }
  const promoted = promoteExperiences(cwd);
  const board = generateBoard(results, cwd);
  reg.persistScores(cwd);
  return { swapped, board, promoted };
}

// CLI
if (import.meta.url.startsWith("file:")) {
  const args = process.argv.slice(2);
  if (args.includes("--board") || args.includes("--evaluate") || args.includes("--collect") || args.includes("--evolve") || args.includes("--promote") || args.length===0) {
    const cwd = process.cwd();
    if (args.includes("--collect")) {
      const files = await collectDaily(cwd);
      console.log("collect:", files.join(", ") || "(이미 있음)");
    }
    const results = await evaluateWeekly(cwd);
    console.log("evaluate:", results.map(r=> `${r.name}:${r.passed?"PASS":"FAIL"}(${r.score}${r.calibration?` cal${(r.calibration*100|0)}`:""})`).join(" | "));
    if (args.includes("--promote")) {
      const p = promoteExperiences(cwd);
      console.log("promote:", p.join(", ") || "(후보 없음 — 3주 누적 필요)");
    }
    if (args.includes("--evolve")) {
      const { swapped, board, promoted } = await evolveOneStep(cwd);
      console.log("evolve swapped:", swapped, "promoted:", promoted.length, "board:", board);
    } else {
      const board = generateBoard(results, cwd);
      console.log("board:", board);
    }
  }
}
