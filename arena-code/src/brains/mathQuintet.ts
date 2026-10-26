/**
 * Math Quintet — 수학 5형제 (v7.0.0)
 * 인류 난제를 푼 5종 AI의 토론 방식을 5개 두뇌로 압축
 * FunSearch(프로그램 진화) · AlphaTensor(게임화) · AlphaProof(Lean 검증) · AlphaGeometry(합성) · Gemini DeepThink(장기사고)
 *
 * 12살 설명: 수학 올림픽 금메달 팀 — 5명이 각자 다른 무기로 같은 문제를 공격
 */

import type { Brain, BrainInput, BrainOutput, BrainFeedback, BrainRole, BrainLayer } from "./types.js";
import { ReasoningEngine } from "./reasoning.js";
import { ContextEngine } from "./context.js";

function out(brain: Brain, idea: string, conf: number, tags: string[]): BrainOutput {
  return { brainId: brain.id, role: brain.role, layer: brain.layer, idea, confidence: conf, tags, costMs: 0 };
}

abstract class MathBase implements Brain {
  abstract id: string; abstract role: BrainRole; abstract layer: BrainLayer;
  abstract name: string; abstract description: string;
  version = "7.0.0";
  protected reasoning = new ReasoningEngine();
  protected context = new ContextEngine();
  protected learned: string[] = [];
  async learn(f: BrainFeedback) { if (f.lesson) this.learned.push(f.lesson); }
  abstract think(input: BrainInput): Promise<BrainOutput>;
}

// ── 1. FunSearch 캡셋 탐색 천재 ──────────────────────────────────────────────
export class MathFunSearchBrain extends MathBase {
  id = "math-funsearch"; role = "genius" as const; layer = 4 as const;
  name = "캡셋 탐색 천재 (FunSearch)"; description = "정답 대신 정답을 만드는 priority() 프로그램 1줄을 진화 — 수백만 변형 중 상위 2개 교차";
  async think(input: BrainInput): Promise<BrainOutput> {
    const task = input.task.slice(0, 80);
    const hint = input.priorOutputs.map(o => o.idea.slice(0, 30)).join(" | ").slice(0, 60);
    return out(this,
`🔬 FunSearch 렌즈 — 프로그램=해법:
문제 "${task}"를 직접 풀지 말고, 답을 만드는 함수 priority(x) 1개를 써라.
예: def priority(x): return (x[0]+x[1])%3 == 0 ? 0.9 : 0.2  ← 이 한 줄을 LLM이 수백만 번 변형
평가: 프로그램 실행해 캡셋 크기(예: 496→512)처럼 점수 측정 → 상위 2개를 프롬프트에 넣어 교차(crossover)
대칭 힌트: Ellenberg가 찾았듯, 문제의 숨은 대칭을 프로그램에 반영하면 점프(496→512) 가능
→ 적용: "${task}"에서 점수 함수가 무엇인가? 프로그램 1줄로 표현하면?

이전 토론 참고: ${hint || "(첫 라운드)"}`, 0.88, ["math","funsearch","program-search","evolution","cap-set"]);
  }
}

// ── 2. AlphaTensor 게임화 천재 ──────────────────────────────────────────────
export class MathTensorBrain extends MathBase {
  id = "math-tensor"; role = "genius" as const; layer = 4 as const;
  name = "게임화 천재 (AlphaTensor)"; description = "수학 문제를 TensorGame 상태/행동/보상으로 정의해 한 수씩 MCTS 탐색";
  async think(input: BrainInput): Promise<BrainOutput> {
    const task = input.task.slice(0, 80);
    const prior = input.priorOutputs.length ? `이전 ${input.priorOutputs.length}개 의견 중 tensor 관련: ${input.priorOutputs.filter(o=>o.idea.includes("tensor")||o.idea.includes("게임")).length}개` : "첫 수";
    return out(this,
`🎮 AlphaTensor 렌즈 — 게임화:
"${task}"를 1인 게임 TensorGame으로 정의:
 상태: 현재 텐서 분해 상태 (예: 4×4 행렬 → 남은 랭크)
 행동: 다음 rank-1 텐서 추가 (행동 공간 10¹², 체스 10²보다 10¹⁰배 큼)
 보상: -곱셈 횟수 (-47이 -49보다 좋음) - 시간
탐색: AlphaZero MCTS로 수천 수 탐색, 매번 항등식으로 검증(틀릴 수 없음)
 인간 협력: AI가 96(5×5) 찾으면 인간 Kauers가 95로 추가 개선 — 게임판이 토론 언어
→ 질문: "${task}"의 상태/행동/보상을 적어봐. 한 수 두면 무엇이 바뀌나?
${prior}`, 0.87, ["math","tensor","game","mcts","alphatensor"]);
  }
}

// ── 3. AlphaProof 형식 증명 천재 ────────────────────────────────────────────
export class MathLeanBrain extends MathBase {
  id = "math-lean"; role = "genius" as const; layer = 4 as const;
  name = "형식 증명 천재 (AlphaProof)"; description = "LLM 제안 + Lean 컴파일 검증 + Test-Time RL 수백만 변형 재학습";
  async think(input: BrainInput): Promise<BrainOutput> {
    const task = input.task.slice(0, 80);
    const article = (input as unknown as {article?:string}).article?.slice(0, 40) ?? "";
    return out(this,
`📐 AlphaProof 렌즈 — 신경-상징:
LLM이 Lean 코드를 쓰면 Lean 컴파일러가 100% 검증/반박 — 찍기 불가.
 절차:
  1) "${task}"를 Lean theorem으로 형식화 (예: theorem P1 : ∀ n, Even n → ...)
  2) LLM이 1차 증명 시도 → Lean 컴파일 실패 시 에러 메시지(예: type mismatch) 회수
  3) Test-Time RL: 실패 원인을 반영해 유사 문제 수백만 개를 현장에서 생성·학습, 2~3일 재시도 (P6처럼 609명 중 5명만 푼 문제도 해결)
  4) 성공 시 Lean 증명은 수학적 항등식이라 인간이 바로 신뢰
→ 적용: "${task}"에서 Lean이 잡아낼 수 있는 형식 오류 3가지는? 변형 문제 10개를 지금 만들어봐.
${article ? `기사: ${article}...` : ""}`, 0.89, ["math","lean","formal","test-time-rl","alphaproof"]);
  }
}

// ── 4. AlphaGeometry 합성 기하 천재 ─────────────────────────────────────────
export class MathSyntheticBrain extends MathBase {
  id = "math-synthetic"; role = "genius" as const; layer = 4 as const;
  name = "합성 기하 천재 (AlphaGeometry)"; description = "데이터 없으면 10억 개 합성 증명으로 먼저 학습, 보조선 토론";
  async think(input: BrainInput): Promise<BrainOutput> {
    const task = input.task.slice(0, 80);
    return out(this,
`📐 AlphaGeometry 렌즈 — 합성:
기하 문제는 데이터가 적어 인간 증명만으로는 부족 → 10억 개 합성 증명을 기계가 생성해 먼저 학습.
 토론: LLM(보조선 제안) ↔ Symbolic Engine(연역 추론) 교대
  - LLM: "점 D를 AB 연장선에 찍으면 ∠ABC = ∠ADE"
  - Symbolic: "그러면 △ABC ≅ △ADE → BC = DE, 모순 없음" → 검증 통과
 2024 IMO P4를 19초에 해결 — 합성 데이터가 토론 언어.
→ 적용: "${task}"에서 보조선 3개를 먼저 그려봐. 각각이 어떤 합동/닮음을 만드는가?`, 0.86, ["math","synthetic","geometry","auxiliary","alphageometry"]);
  }
}

// ── 5. Gemini Deep Think 장기사고 천재 ─────────────────────────────────────
export class MathDeepThinkBrain extends MathBase {
  id = "math-deepthink"; role = "genius" as const; layer = 4 as const;
  name = "장기 사고 천재 (DeepThink)"; description = "4.5시간 사고 끈 유지, ToT k=3 depth=2를 5회 반복";
  async think(input: BrainInput): Promise<BrainOutput> {
    const task = input.task.slice(0, 80);
    const tot = this.reasoning.totExplore(task, input.context, "bfs", 3, 2);
    const best = tot.bestPath.join("→") || tot.nodes[0]?.id || "t0-0";
    return out(this,
`🧠 DeepThink 렌즈 — 장기 사고:
Gemini 2025 IMO 금메달은 4.5시간 동안 사고(thinking) 채널을 유지해 자연어로 완주.
 전략:
  - ToT k=3 depth=2를 5회 반복 (총 15개 thought) — 한 번에 끝내지 말고 깊게 파기
  - 매 depth마다 Validator 3표 중 2표 통과해야 다음 depth로 — 틀리면 backtrack
  - 현재 ToT: policy=${tot.policy} k=${tot.branching} depth=${tot.depth} best=${best} backtrack=${tot.backtracked}
→ 적용: "${task}"를 5단계로 나눠 각 단계마다 3개 분기를 쓰고, 검증 후 1개만 살려봐. 포기하지 말고 4.5시간 시뮬레이션!`, 0.87, ["math","deepthink","tot","long-thinking","gemini"]);
  }
}

export const MATH_QUINTET_BRAINS: Brain[] = [
  new MathFunSearchBrain(),
  new MathTensorBrain(),
  new MathLeanBrain(),
  new MathSyntheticBrain(),
  new MathDeepThinkBrain(),
];
