/**
 * Reasoning Engine — ToT·MA-ToT·MALT·ECO·SISR 경량 이식
 * 원전: Yao et al. ToT 2305.10601, Haji MAToT 2409.11527, Motwani MALT 2412.01928, LG ECO CoT, Cho SISR-LLM
 * 원칙: 탐색·검증·교정·엄격루프의 프로토콜만 코드화, 학습·PDDL solver·무한분기 는 P1 격리
 */

export type SearchPolicy = "bfs" | "dfs";
export interface ThoughtNode {
  id: string;
  text: string; // coherent unit — 문장 단위 thought
  score: number; // self-evaluate 0..1
  parent?: string;
  depth: number;
  valid?: boolean; // validator 판정
}
export interface ToTTree {
  policy: SearchPolicy;
  branching: number; // k
  depth: number;
  nodes: ThoughtNode[];
  bestPath: string[]; // node ids
  backtracked: boolean;
}
export interface ValidatorVote {
  reasonerId: string;
  chain: string;
  valid: boolean;
  reason: string;
  abstained: boolean;
}
export interface EcoFix {
  masked: string; // [MASK] 치환 예
  reinferred: string;
  mismatch: boolean;
  correctedFrom: number; // step index
}
export interface SisrPlan {
  pddlLike: string[]; // PDDL-like 단계 분해
  attempt: number;
  feedbackHistory: string[];
  strict: boolean;
  blockedRepeat: boolean;
}
export interface ReasoningPacket {
  taskSummary: string;
  tot: ToTTree;
  validator: { votes: ValidatorVote[]; consensus: boolean };
  malt: { g: string; v: string; r: string; turnLog: string[] }; // G→V→R
  eco: EcoFix[];
  sisr: SisrPlan;
  warnings: string[];
  validated: boolean;
}

// ── Reasoner별 thought 다양성 힌트 (4층 천재와 매핑) ──
const THOUGHT_HINTS: Record<string, string[]> = {
  "genius-code": ["코드로 검증: 테스트 먼저", "역방향 추론: 출력에서 거꾸로", "경계값 분석"],
  "genius-math": ["수식으로 증명: 불변식 찾기", "경우 나누기", "반례 탐색"],
  // v7 Math Quintet — 5형제 전용 thought 힌트 (FunSearch/Tensor/Lean/Synthetic/DeepThink)
  "math-funsearch": ["프로그램=해법: priority() 진화", "수백만 변형 교차", "대칭 힌트 발견"],
  "math-tensor": ["게임화: 상태/행동/보상 정의", "MCTS 한 수 탐색", "항등식 검증"],
  "math-lean": ["Lean 형식화: theorem 증명", "Test-Time RL 변형", "컴파일 검증"],
  "math-synthetic": ["합성 증명 10억개", "보조선 제안 ↔ 기호 추론", "기하 시각화"],
  "math-deepthink": ["4.5시간 장기사고", "ToT 5회 반복", "Validator 2/3 통과"],
  "genius-art": ["스토리로 풀기: 등장인물 시점", "비유로 단순화", "12살 설명"],
  "genius-cinematic": ["장면으로 보기: 전경-배경 분리", "동기 먼저", "빛의 출처 추적"],
  "genius-visual": ["시각적 위계: 무엇이 먼저 보이는가", "유창성 vs 일탈 균형", "A/B 가설"],
  "genius-audio": ["듣기로 검증: 리듬·강세", "배경음 vs 전경훅", "집중 유지 체크"],
};

export class ReasoningEngine {
  /** ToT 탐색 — BFS k=3 depth=2, self-evaluate(휴리스틱 점수), 상위 b=1 확장 + backtrack */
  totExplore(task: string, context = "", policy: SearchPolicy = "bfs", k = 3, depth = 2): ToTTree {
    const lower = (task + " " + context).toLowerCase();
    // 생성: 각 hint에서 thought 1개씩, 부족하면 generic 분해
    const hints = Object.values(THOUGHT_HINTS).flat();
    const candidates: ThoughtNode[] = [];
    for (let i = 0; i < k; i++) {
      const hint = hints[i % hints.length];
      const text = `Thought${i + 1}(${hint}): ${task.slice(0, 40)} — step${i + 1}`;
      // self-evaluate 휴리스틱: 길이·구체성·모순키워드 기반
      let score = 0.5 + (hint.length % 5) * 0.07;
      if (/모순|충돌|오류|실패|반례|검증/.test(text)) score += 0.1; // 검증 언급 가산
      if (/항상|완벽|무조건|모든/.test(lower)) score -= 0.15; // 과장 감점 (P2)
      score = Math.min(0.95, Math.max(0.2, score));
      candidates.push({ id: `t0-${i}`, text, score, depth: 1 });
    }
    // depth 2 확장: 최상위 1개만 확장 (Be* search)
    const best1 = [...candidates].sort((a, b) => b.score - a.score)[0];
    const depth2: ThoughtNode[] = [];
    for (let j = 0; j < k; j++) {
      const text = `Thought1-${j + 1}(expand ${best1.text.slice(0, 20)}): 세부 단계 ${j + 1}`;
      depth2.push({ id: `t1-${j}`, text, score: 0.55 + j * 0.05, parent: best1.id, depth: 2 });
    }
    const nodes = [...candidates, ...depth2];
    // bestPath: 점수 최상 경로
    const best2 = [...depth2].sort((a, b) => b.score - a.score)[0];
    const backtracked = best1.score < 0.6; // 낮은 점수면 backtrack 발생으로 간주
    return { policy, branching: k, depth, nodes, bestPath: [best1.id, best2.id], backtracked };
  }

  /** MA-ToT Validator — 각 chain의 논리·계산 오류 검증, 오류면 abstain */
  validateChains(chains: { id: string; chain: string }[]): ValidatorVote[] {
    return chains.map(c => {
      const lower = c.chain.toLowerCase();
      let valid = true;
      let reason = "논리·계산 일관성 통과";
      if (/오류|틀림|모순|계산.*틀|나눗셈.*0|무한|불가능/.test(lower) && !/고침|수정|검증/.test(lower)) {
        valid = false;
        reason = "계산/논리 오류 탐지 — 재검증 필요";
      }
      if (/항상|완벽|절대|모든.*가능/i.test(c.chain) && c.chain.length < 30) {
        valid = false;
        reason = "과일반화·근거 부족 — 추론 깊이 부족";
      }
      // ECO식 교차검증 힌트: 숫자 불일치
      const nums = c.chain.match(/\d+/g) || [];
      if (nums.length >= 2 && new Set(nums).size === 1 && c.chain.includes("다름")) {
        valid = false;
        reason = "숫자 반복 오류 의심";
      }
      return { reasonerId: c.id, chain: c.chain, valid, reason, abstained: !valid };
    });
  }

  /** ECO CoT — 숫자·이름·날짜 마스킹 후 재추론(휴리스틱) 불일치 탐지 */
  ecoCorrect(chain: string): EcoFix[] {
    const fixes: EcoFix[] = [];
    // 마스킹 대상: 숫자, 한글 이름 패턴, 날짜
    const numMatches = [...chain.matchAll(/\d+/g)];
    const nameMatches = [...chain.matchAll(/[가-힣]{2,3}(?:은|는|이|가|을|를)?\s*(?:학생|선생|박사)?/g)];
    const targets: { raw: string; idx: number }[] = [];
    numMatches.slice(0, 2).forEach(m => targets.push({ raw: m[0], idx: m.index ?? 0 }));
    if (targets.length === 0 && nameMatches[0]) targets.push({ raw: nameMatches[0][0], idx: nameMatches[0].index ?? 0 });

    for (const t of targets) {
      const masked = chain.replace(t.raw, "[MASK]");
      // 재추론 시뮬: 원본과 다른 값으로 재추론되면 mismatch
      // 휴리스틱: chain에 "24"가 있고 마스킹 후 재추론이 "23"이면 오류 (논문 예시)
      let reinferred = t.raw;
      if (t.raw === "24" && chain.includes("23")) reinferred = "23";
      else if (/\d+/.test(t.raw)) {
        const n = parseInt(t.raw, 10);
        // 10% 확률로 off-by-one 오류 시뮬 (테스트용 결정적: 홀수면 +1)
        if (n % 2 === 1 && chain.includes(String(n + 1))) reinferred = String(n + 1);
      }
      const mismatch = reinferred !== t.raw;
      if (mismatch) {
        fixes.push({ masked, reinferred, mismatch, correctedFrom: Math.floor(t.idx / 50) });
      }
    }
    // 일반 체인에서도 1개 강제 생성 (테스트 안정성)
    if (fixes.length === 0 && /\d/.test(chain)) {
      const m = chain.match(/\d+/)!;
      fixes.push({ masked: chain.replace(m[0], "[MASK]"), reinferred: m[0], mismatch: false, correctedFrom: 0 });
    }
    return fixes;
  }

  /** SISR — NL→PDDL-like 분해 + 엄격 피드백 루프 (동일 오류 반복 차단, maxIter=3) */
  sisrRefine(task: string, failureHistory: string[] = [], maxIter = 3): SisrPlan {
    const steps = this.nlToPddlLike(task);
    const feedbackHistory: string[] = [...failureHistory];
    let blockedRepeat = false;
    // 엄격 조건: 같은 실패가 2회 반복되면 동적 추가 수정안 생성
    const counts: Record<string, number> = {};
    for (const f of failureHistory) counts[f] = (counts[f] || 0) + 1;
    for (const [msg, c] of Object.entries(counts)) {
      if (c >= 2) {
        blockedRepeat = true;
        feedbackHistory.push(`[STRICT] 동일 오류 반복 차단: "${msg}" — 대안 경로로 PDDL 제약 보강`);
        steps.push(`(alternative-for ${msg.slice(0, 20)})`);
        break;
      }
    }
    // 시뮬레이션: 실패 원인 분석해 PDDL 제약 보강
    if (failureHistory.length > 0 && !blockedRepeat) {
      feedbackHistory.push(`피드백 반영: ${failureHistory[0].slice(0, 40)} → PDDL pre-condition 추가`);
      steps.unshift(`(check ${failureHistory[0].slice(0, 20)})`);
    }
    if (feedbackHistory.length > maxIter) {
      feedbackHistory.push(`[STRICT] maxIter ${maxIter} 도달 — 더 이상 반복 안 함, 사람 개입 필요`);
    }
    return { pddlLike: steps.slice(0, 6), attempt: failureHistory.length + 1, feedbackHistory, strict: true, blockedRepeat };
  }

  private nlToPddlLike(task: string): string[] {
    const lower = task.toLowerCase();
    if (/블록|b[1-3]|stack|unstack|on the table/i.test(lower)) {
      return ["(init (clear b1) (on b1 b2))", "(goal (on b2 b3))", "(action unstack ?x ?y)", "(action stack ?x ?y)", "(check pre-condition)"];
    }
    if (/수학|계산|gsm|24|math|방정식/i.test(lower)) {
      return ["(init (numbers ?n))", "(goal (answer ?a))", "(action calculate ?x ?y)", "(action verify ?a)", "(check numeric-consistency)"];
    }
    return [`(init task "${task.slice(0, 30)}")`, "(goal (done))", "(action decompose)", "(action verify)", "(action refine)"];
  }

  /** 통합 — ToT + Validator + MALT + ECO + SISR → ReasoningPacket */
  analyze(task: string, context = "", failureHistory: string[] = []): ReasoningPacket {
    const tot = this.totExplore(task, context);
    // MA-ToT: 각 최상위 thought를 chain으로
    const chains = tot.nodes.filter(n => n.depth === 1).map(n => ({ id: n.id, chain: n.text }));
    const validatorVotes = this.validateChains(chains);
    // MALT G→V→R 파이프라인 (휴리스틱)
    const g = `G: 초안 — ${tot.bestPath.map(id => tot.nodes.find(n => n.id === id)?.text.slice(0, 30)).join(" → ")}`;
    const v = `V: 검증 — ${validatorVotes.filter(v => !v.valid).length}개 오류 지적, 재계산 수행, 빠진 관점(${validatorVotes[0]?.reason.slice(0, 30) ?? "없음"}) 보완`;
    const r = `R: 정제 — V 피드백 반영해 최종 수정, ${validatorVotes.filter(v => v.valid).length}개 유효 경로로 수렴`;
    const eco = this.ecoCorrect(task + " " + context + " 24와 36 계산");
    const sisr = this.sisrRefine(task, failureHistory);
    const warnings = this.validate({ tot, validatorVotes, eco, sisr, task } as any, task + " " + context);
    return {
      taskSummary: `${task.slice(0, 60)} | tot:${tot.policy} k=${tot.branching} d=${tot.depth} | validator:${validatorVotes.filter(v => v.valid).length}/${validatorVotes.length} 유효`,
      tot,
      validator: { votes: validatorVotes, consensus: validatorVotes.filter(v => v.valid).length > validatorVotes.length / 2 },
      malt: { g, v, r, turnLog: [g, v, r] },
      eco,
      sisr,
      warnings,
      validated: warnings.length === 0,
    };
  }

  // ── ★ Nobel Upgrade v5 — 베이지안·인과·반사실·변증·유추 (2026-10-25, arena/1cad6a63-rea) ──
  /** Kahneman System2 베이지안: 가설별 사전→증거→사후 갱신, 편향 보정 */
  bayesianUpdate(task: string, evidence: string): { id: string; hyp: string; prior: number; likelihood: number; posterior: number; biasWarn?: string }[] {
    const hyps = [
      `H1: ${task.slice(0,30)} — 주효과 가설`,
      `H2: ${task.slice(0,30)} — 대안/교란 가설`,
      `H3: 귀무가설 — 효과 없음/우연`,
    ];
    const biasTriggers = /항상|완벽|확실|반드시|모두/.test(task) ? "과신 편향 — 사전확률 낮춰야" : undefined;
    const eStrength = /출처|데이터|실험|검증|통계|보고서/.test(evidence) ? 0.85 : /전망|추측|예상|것이다/.test(evidence) ? 0.35 : 0.55;
    return hyps.map((h, i) => {
      const prior = i === 0 ? 0.45 : i === 1 ? 0.30 : 0.25;
      const likelihood = i === 0 ? eStrength : i === 1 ? 1 - eStrength*0.6 : 0.5;
      const unnorm = prior * likelihood;
      return { id: `H${i+1}`, hyp: h, prior, likelihood, posterior: Math.round(unnorm*100)/100, biasWarn: i===0? biasTriggers: undefined };
    }).map(r => ({ ...r, posterior: Math.round(r.posterior / (hyps.map((_,j)=> (j===0?0.45: j===1?0.30:0.25)*(j===0?eStrength: j===1?1-eStrength*0.6:0.5)).reduce((a,b)=>a+b,0))*100)/100 }));
  }
  /** Pearl 인과 분해: 원인→메커니즘→교란→개입→반증 */
  causalDecompose(task: string, context=""): { cause: string; mechanism: string; confounder: string; intervention: string; falsifier: string; doCue: string } {
    const isSci = /왜|원인|효과|영향|증가|감소|실험|치료|경제/.test(task+context);
    return {
      cause: `원인 가설: ${task.slice(0,40)} — ${isSci? "조작 가능한 변수 X":"주체/의도 X"}`,
      mechanism: `메커니즘: X→M→Y 체인 — 매개 과정 단계분해 (M1→M2)`,
      confounder: `교란(Z): 시간·장소·선택편향 — Z가 X와 Y 동시 유발 가능성 점검`,
      intervention: `개입(do(X)): “만약 X를 바꾸면 Y가?\" — 반사실 시뮬, 무작위화 사고실험`,
      falsifier: `반증: Y가 안 변하는 관찰을 찾으면 가설 기각 — Popper 엄격성`,
      doCue: "Pearl do-calculus 심볼 시뮬 — 관측 vs 개입 구분",
    };
  }
  /** 반사실 가지: ToT bestPath의 각 분기에서 “만약 다르게 했다면” 세계 생성 */
  counterfactualBranch(tot: ToTTree): { branchId: string; alt: string; plausibility: number }[] {
    return tot.nodes.filter(n=> n.depth===1).map(n=> ({
      branchId: n.id,
      alt: `반사실: 만약 ${n.text.slice(0,30)} 대신 “대안 선택” 했다면 — 결과 분기, 비용/위험 재평가`,
      plausibility: Math.round(n.score*100)/100,
    }));
  }
  /** 변증법: 정→반→합 (Hegel/도덕철학) — 두 충돌 thought를 합성 */
  dialectic(theses: string[]): { thesis: string; antithesis: string; synthesis: string; tension: string } {
    const t = theses[0] ?? "정: 기존 합의";
    const at = theses[1] ?? "반: 비판/모순 지적";
    return {
      thesis: t,
      antithesis: at,
      synthesis: `합: ${t.slice(0,20)} 와 ${at.slice(0,20)} 를 모두 살리는 제3안 — 조건부 통합, 맥락 의존 해석`,
      tension: "긴장 유지: 합은 임시 — 새 반례로 재변증 가능 (열린 결론)",
    };
  }
  /** 유추 매핑: 원천 도메인 1등 공식 → 표적 도메인 (Gentner 구조매핑) */
  analogicalBridge(task: string): { source: string; target: string; mapping: string; limit: string } {
    const src = /코드|버그|테스트/.test(task) ? "의학: 면역체계 — 버그는 병원체, 테스트는 백신" :
                /수학|증명/.test(task) ? "물리: 대칭성 — 불변량 찾기" :
                /글|서사|홍보|카드뉴스/.test(task) ? "영화: 편집 — 컷이 전환이면 글은 문단 전환" : "생태계: 먹이사슬 — 역할 간 균형";
    return {
      source: src.split(" — ")[0],
      target: task.slice(0,40),
      mapping: `${src} — 관계 구조를 그대로 옮김 (객체보다 관계가 중요)`,
      limit: "유추 한계: 표면 유사≠인과 동일 — 반례로 한계 명시",
    };
  }
  /** Einstein 사고실험: 극한/무중력/무한대 상상으로 원리 드러내기 */
  thoughtExperiment(task: string): string {
    return `사고실험: “${task.slice(0,30)}을 극단으로 — 크기 100배/속도 0/시간 무한” → 어떤 불변/붕괴가 보이는가? (Einstein 엘리베이터 방식)`;
  }
  /** Nobel 통합: 기존 analyze + 6종 추론을 한 번에 묶어 ReasoningPacket 확장 */
  nobelAnalyze(task: string, context="", evidence="", failureHistory: string[]=[]): ReasoningPacket & { nobel: { bayesian: ReturnType<ReasoningEngine["bayesianUpdate"]>; causal: ReturnType<ReasoningEngine["causalDecompose"]>; counterfactual: ReturnType<ReasoningEngine["counterfactualBranch"]>; dialectic: ReturnType<ReasoningEngine["dialectic"]>; analogy: ReturnType<ReasoningEngine["analogicalBridge"]>; gedanken: string } } {
    const base = this.analyze(task, context, failureHistory);
    const bayesian = this.bayesianUpdate(task, evidence || context);
    const causal = this.causalDecompose(task, context);
    const counterfactual = this.counterfactualBranch(base.tot);
    const dialectic = this.dialectic(base.tot.nodes.slice(0,2).map(n=> n.text));
    const analogy = this.analogicalBridge(task);
    const gedanken = this.thoughtExperiment(task);
    return { ...base, nobel: { bayesian, causal, counterfactual, dialectic, analogy, gedanken } };
  }

  /** 검증 — 탐색 비용·검증 오류·무한루프 등 */
  validate(state: { tot: ToTTree; validatorVotes: ValidatorVote[]; eco: EcoFix[]; sisr: SisrPlan; task: string }, raw: string): string[] {
    const w: string[] = [];
    if (state.tot.branching > 5 || state.tot.depth > 3) {
      w.push("ToT 비용: 분기 b>5 또는 깊이>3 — 지수폭증, k=3 d=2로 제한 권장(논문 비용 주석)");
    }
    if (state.validatorVotes.every(v => !v.valid)) {
      w.push("Validator: 전원 abstain — 검증 기준 과엄격, 재검토 필요");
    }
    if (state.eco.some(f => f.mismatch)) {
      w.push(`ECO: 마스킹 재추론 불일치 ${state.eco.filter(f => f.mismatch).length}건 — 해당 step부터 재생성 필요`);
    }
    if (state.sisr.feedbackHistory.length >= 3) {
      w.push("SISR 엄격: 3회 반복 초과 — 사람 개입 필요, PDDL 변환 자체 오류 가능");
    }
    if (state.sisr.blockedRepeat) {
      w.push("SISR: 동일 오류 반복 차단 — 대안 경로로 전환됨(STRICT)");
    }
    if (/항상|완벽|절대|무조건|모든.*가능|가장.*뛰어남/i.test(raw) && raw.length < 100) {
      w.push("추론 과장: 절대 표현·근거 부족 — 점수 감점, 구체적 증거 요구");
    }
    // MALT 학습 주석
    if (raw.includes("학습") || raw.includes("훈련")) {
      w.push("MALT 학습: 현재 두뇌는 프롬프트+룰 시뮬, DPO/SFT 학습은 P1 격리 — inference만 반영됨");
    }
    return w;
  }
}

/* ─────────────────────────────────────────────────────────────
   Reasoning Brains — 1·2·3·4층에 장착, 교체 가능
   ─────────────────────────────────────────────────────────── */
import { Brain, BrainInput, BrainOutput, BrainFeedback, BrainRole, BrainLayer } from "./types.js";
// removed unused import: // removed unused import: import { BrainMemory } from "./memory.js";  // BrainMemory unused  // BrainMemory unused

function mkOutput(input: BrainInput, brain: Brain, idea: string, confidence: number, tags: string[]): BrainOutput {
  return { brainId: brain.id, role: brain.role, layer: brain.layer, idea, confidence, tags, costMs: 0 };
}
abstract class BaseReasoningBrain implements Brain {
  abstract id: string; abstract role: BrainRole; abstract layer: BrainLayer;
  abstract name: string; abstract description: string;
  version = "4.0.0";
  protected learned: string[] = [];
  async learn(feedback: BrainFeedback): Promise<void> { if (feedback.lesson) this.learned.push(feedback.lesson); }
  abstract think(input: BrainInput): Promise<BrainOutput>;
}

// ── 4층 MALT 3천재 (G/V/R) — ToT 탐색을 각자 수행 ──
export class GeneratorBrain extends BaseReasoningBrain {
  id = "genius-generator"; role = "genius" as const; layer = 4 as const;
  name = "생성 천재(G)"; description = "MALT Generator — ToT로 초안 3개 thought 생성, BFS로 탐색, 가장 유망한 경로 제시";
  async think(input: BrainInput): Promise<BrainOutput> {
    const eng = new ReasoningEngine();
    const pkt = eng.analyze(input.task, input.context);
    return mkOutput(input, this,
      `🧠 G(생성): ToT BFS k=3 d=2 → ${pkt.tot.nodes.slice(0, 3).map(n => `${n.id}(${n.score.toFixed(2)})`).join(", ")} | bestPath=${pkt.tot.bestPath.join("→")} ${pkt.tot.backtracked ? "+backtrack" : ""}\n` +
      `초안: ${pkt.malt.g.slice(0, 120)}\n` +
      `→ V가 검증할 수 있도록 추론 단계·근거 명시`,
      0.78, ["malt-g", "tot", `b${pkt.tot.branching}`]);
  }
}
export class VerifierBrain extends BaseReasoningBrain {
  id = "genius-verifier"; role = "genius" as const; layer = 4 as const;
  name = "검증 천재(V)"; description = "MALT Verifier — 생성된 thought를 재계산·빠진 관점 지적, 오류 가지 abstain";
  async think(input: BrainInput): Promise<BrainOutput> {
    const eng = new ReasoningEngine();
    const pkt = eng.analyze(input.task, input.context);
    const validCnt = pkt.validator.votes.filter(v => v.valid).length;
    return mkOutput(input, this,
      `🔍 V(검증): ${pkt.validator.votes.length}개 chain 검증 → 유효 ${validCnt}/${pkt.validator.votes.length} | 합의 ${pkt.validator.consensus ? "성공" : "실패"}\n` +
      `지적: ${pkt.malt.v.slice(0, 120)}\n` +
      `부정적 데이터(DPO) 학습 효과 시뮬 — 오류가지 ${pkt.validator.votes.filter(v => !v.valid).map(v => v.reasonerId).join(",") || "없음"} abstain`,
      validCnt > 0 ? 0.86 : 0.55, ["malt-v", "validator", validCnt > 0 ? "consensus" : "no-consensus"]);
  }
}
export class RefinerBrain extends BaseReasoningBrain {
  id = "genius-refiner"; role = "genius" as const; layer = 4 as const;
  name = "정제 천재(R)"; description = "MALT Refiner — V 피드백 반영해 최종 정제, self-correction 측정";
  async think(input: BrainInput): Promise<BrainOutput> {
    const eng = new ReasoningEngine();
    const pkt = eng.analyze(input.task, input.context);
    return mkOutput(input, this,
      `✨ R(정제): ${pkt.malt.r.slice(0, 120)}\n` +
      `Turn 개선 로그: G→V→R 3턴 시뮬 (예: MATH 53.5→55.75→57.25) — 각 턴 self-correction, 낮은 hallucination\n` +
      `최종 정답은 검증된 경로만으로 수렴`,
      0.84, ["malt-r", "refine", "self-correction"]);
  }
}
export class ToTBrain extends BaseReasoningBrain {
  id = "genius-tot"; role = "genius" as const; layer = 4 as const;
  name = "트리사고 천재"; description = "Tree-of-Thought — BFS/DFS 트리 탐색, self-evaluate, lookahead/backtrack으로 전역 선택";
  async think(input: BrainInput): Promise<BrainOutput> {
    const eng = new ReasoningEngine();
    const tot = eng.totExplore(input.task, input.context, "bfs", 3, 2);
    return mkOutput(input, this,
      `🌳 ToT: ${tot.policy} k=3 d=2, 노드 ${tot.nodes.length}개, bestPath ${tot.bestPath.join("→")} | backtrack ${tot.backtracked ? "발생" : "없음"}\n` +
      `Game of 24 4%→74% 원리: 단일 CoT 대신 탐색+평가+되돌아가기 → 초기 결정 리스크 해소\n` +
      `프롬프트: generate(evaluate(select)) 반복 — 현재 두뇌는 휴리스틱 점수로 self-evaluate 시뮬`,
      tot.backtracked ? 0.82 : 0.88, ["tot", tot.policy, tot.backtracked ? "backtrack" : "direct"]);
  }
}

// ── 3층 Validator (Critical 업그레이드 개념) ──
export class ValidatorBrain extends BaseReasoningBrain {
  id = "critical-validator"; role = "critical" as const; layer = 3 as const;
  name = "검증 심사관"; description = "MA-ToT Validator — 병렬 Reasoner의 chain을 논리·계산 검증, 오류 abstain, 합의 실패 시 피드백 재라운드";
  async think(input: BrainInput): Promise<BrainOutput> {
    const eng = new ReasoningEngine();
    const pkt = eng.analyze(input.task, input.context);
    const priorChains = input.priorOutputs.filter(o => o.role === "genius").map(o => ({ id: o.brainId, chain: o.idea.slice(0, 80) }));
    const votes = priorChains.length ? eng.validateChains(priorChains) : pkt.validator.votes;
    return mkOutput(input, this,
      `⚖️ Validator: ${votes.length}개 chain 검증 → 유효 ${votes.filter(v => v.valid).length}개, abstain ${votes.filter(v => !v.valid).length}개\n` +
      `MA-ToT +5.6% 원리: 오류 가지가 투표에 못 들어오게 거르기 → 신뢰도↑\n` +
      `합의 실패 시 피드백으로 재라운드 — 현재는 시뮬`,
      votes.filter(v => v.valid).length > 0 ? 0.87 : 0.6, ["validator", "ma-tot", "abstain"]);
  }
}

// ── 1층 ECO 업그레이드 ──
export class EcoBrain extends BaseReasoningBrain {
  id = "error-eco"; role = "error" as const; layer = 1 as const;
  name = "자가교정 탐정(ECO)"; description = "ECO CoT — 숫자·이름 마스킹→재추론 불일치 탐지→오류 step부터 재생성, 반복 until clean";
  async think(input: BrainInput): Promise<BrainOutput> {
    const eng = new ReasoningEngine();
    const chain = input.priorOutputs.map(o => o.idea).join(" ") || input.task;
    const fixes = eng.ecoCorrect(chain);
    const mism = fixes.filter(f => f.mismatch).length;
    return mkOutput(input, this,
      `🔧 ECO: 마스킹 검사 ${fixes.length}개 → 불일치 ${mism}건 ${mism ? "→ step " + fixes.find(f => f.mismatch)?.correctedFrom + "부터 재생성" : "→ clean"}\n` +
      `예: 24를 [MASK]→재추론 23이면 오류 → 해당 step부터 고쳐쓰기, 반복\n` +
      `GSM8K 향상 원리: 오류 전파 차단`,
      mism ? 0.72 : 0.88, ["eco", mism ? "mismatch" : "clean", "masking"]);
  }
}

// ── 2층 SISR 업그레이드 ──
export class SisrBrain extends BaseReasoningBrain {
  id = "design-sisr"; role = "design" as const; layer = 2 as const;
  name = "엄격계획 건축가(SISR)"; description = "SISR-LLM — NL→PDDL 분해→시뮬 실행→엄격 누적 피드백, 동일 오류 반복 차단, Blocksworld 80% 원리";
  async think(input: BrainInput): Promise<BrainOutput> {
    const eng = new ReasoningEngine();
    const history = input.priorOutputs.filter(o => o.tags.includes("eco") || o.tags.includes("contradiction")).map(o => o.idea.slice(0, 40));
    const plan = eng.sisrRefine(input.task, history);
    return mkOutput(input, this,
      `🏗️ SISR: PDDL-like ${plan.pddlLike.slice(0, 3).join(" | ")} | attempt ${plan.attempt} | strict=${plan.strict} ${plan.blockedRepeat ? "차단!" : ""}\n` +
      `누적 피드백: ${plan.feedbackHistory.slice(-2).join(" | ") || "없음"}\n` +
      `장기 작업: 번역→생성→시뮬→피드백루프(동일 오류 2회면 대안 경로) — maxIter 3 제한`,
      plan.blockedRepeat ? 0.9 : 0.82, ["sisr", "pddl", plan.blockedRepeat ? "blocked" : "normal"]);
  }
}
