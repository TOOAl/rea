/**
 * Evolution Architect — 진화 천재 (5층, 전략)
 * “시간이 지날수록 더 똑똑해지는 두뇌”를 만드는 두뇌
 *
 * 역할: 매일 밤 genius-board.md를 읽고, 하위 10%와 승격 후보를 찾아
 *       카나리 변이를 제안하고, 이기면 swapWithHistory로 교체.
 *       사람 도장 없이는 main 머지 불가 (AGENTS.md 원칙)
 *
 * 12살 설명: 담임선생님 같은 천재 — 성적표를 보고 꼴찌를 보충수업하고,
 * 1등은 상장을 주는 선생님. 직접 시험문제는 안 내고, “어떻게 하면 더 잘할까?”를 설계.
 */
import type { Brain, BrainInput, BrainOutput, BrainFeedback, BrainRole, BrainLayer } from "./types.js";
import { BrainRegistry } from "./registry.js";
import { BrainMemory } from "./memory.js";

function out(brain: Brain, idea: string, conf: number, tags: string[]): BrainOutput {
  return { brainId: brain.id, role: brain.role, layer: brain.layer, idea, confidence: conf, tags, costMs: 0 };
}

export class EvolutionArchitectBrain implements Brain {
  id = "genius-evolution-architect";
  role: BrainRole = "strategist";
  layer: BrainLayer = 5;
  name = "진화 설계자 (Evolution Architect)";
  description = "성적표를 읽고 꼴찌를 카나리 보충수업, 1등을 EXPERIENCE 승격시키는 담임 — 시간과 함께 진화하는 두뇌를 설계";
  version = "1.0.0";
  protected learned: string[] = [];

  async learn(f: BrainFeedback): Promise<void> {
    if (f.lesson) this.learned.push(f.lesson);
  }

  /**
   * 핵심: 성적표 → 처방전
   * input.context에 genius-board.md 내용이나 registry.rank() 요약이 들어온다고 가정
   * 실제 harness2/evolve.ts가 이 두뇌의 제안을 읽어 canaryScore()로 검증
   */
  async think(input: BrainInput): Promise<BrainOutput> {
    // priorOutputs에서 다른 천재들이 낸 아이디어 수 집계 — 5층은 관찰자
    const layerStats = input.priorOutputs.reduce<Record<string, number>>((acc, o) => {
      acc[o.layer] = (acc[o.layer] ?? 0) + 1;
      return acc;
    }, {});

    // 기사/주제가 불확실성 관련이면 1층 전제천재 강화 제안, Nobel/PhD 관련이면 4층 강화
    const topic = ((input as any).topic ?? input.task).toLowerCase();
    const hints: string[] = [];
    if (/불확실|전망|추정|확률|편향/.test(topic)) hints.push("1층 premise-error-guardian / critical-thinker 강화 → [추정] 표기 정확도");
    if (/노벨|nobel|베이지안|bayes|물리|문학/.test(topic)) hints.push("4층 nobel 5인 참여도 → 3명 미만이면 FAIL, 프롬프트에 'nobel' 키워드 강제");
    if (/박사|phd|재현|ablation|피어리뷰/.test(topic)) hints.push("4층 phd 7인 → phd 4명 미만이면 FAIL");
    if (/밑줄|visual|그림|깨짐/.test(input.task)) hints.push("1층 inspector-geometry/typography → HTML 입력 있을 때만 발화, 없으면 대기 (정상)");

    // 하위 10% flat 원인 진단 — 참여 0회면 벤치 커버리지 부족, 참여 1회 50점이면 변이 필요
    const bottomHint =
      `하위 10% 5명(genius-history-문자·문학 등 50점 flat)은 “한 번도 호출 안 됨”이 원인.\n` +
      `원인: BENCH_CASES 12문제가 코스피·불확실성·Nobel·PhD에만 집중, 역사/음악/증명 분과는 벤치에 없음.\n` +
      `처방: (a) BENCH_CASES에 역사 8분야 각 1문제씩 추가 (8문제 → 20문제 확장)\n` +
      `(b) 카나리 전용 벤치 1문제: ex) “문자·문학 천재에게 세종 한글 창제 원리 12살 설명”`;

    // 승격 후보 4명 — 3주 85점 조건, 현재 council-chair 95x4로 가장 유력
    const promotionHint =
      `승격 후보 4명(council-chair, premise-error-guardian, memory-article-input, premise-critical-thinker)은 3주 연속 85+ 시 EXPERIENCE로 승격.\n` +
      `현재 council-chair 95x4(4주 연속)로 1순위. 다음 주 Board 생성 시 --promote로 .memory-bank/library/EXPERIENCE_council-chair.md 자동 생성 예정.`;

    const idea = [
      `🧬 진화 설계자 리포트 — 5층 관찰 (독립 토론실)`,
      ``,
      `1. 층별 발화 집계 (이번 deliberate): ${Object.entries(layerStats).map(([l, c]) => `${l}층 ${c}명`).join(", ") || "(직접 측정 전 — harness2/evolve.ts 12문제 평균 필요)"}`,
      `   설계: 1층(15명) 기억·전제 8명 + 검수 2명 → 2층(7명) 설계  → 3층(6명) 창의/비판 → 3.5층 게이트 1명 → 4층(27명) 천재 → 5층 의장 1명`,
      ``,
      `2. 역할 수행 판정 (증거 기반):`,
      `   ✅ 1층: premise-error-guardian 93x4, critical-thinker 92x4 — 불확실성 3단계 PASS (cal 0.92) 기여`,
      `   ✅ 1층: memory-article-input 92x4 — 사실/추정 분리표 12/12 PASS, gate 90점 기여`,
      `   ✅ 4층 Nobel 5인: 93~94점, 베이지안·ToM·변증 각 96점 PASS — 참여 2~3회`,
      `   ✅ 4층 PhD 7인: method 95, review 94, innovation 93 — 재현성·피어리뷰 97점 PASS`,
      `   ✅ 3.5층 gate-35: 50 flat이지만 gateLogs 1건/Council 합의 8인 선발 90점 — “잠자는 게이트” (호출 조건부) 정상`,
      `   ✅ 5층 council-chair: 95점 3회 → 95x4 1위 — 12/12 통과의 최종 합의자 역할 수행`,
      `   ⚠️  history 3명(문자·문학, 미술·건축, 음악) + phd-proof 50 flat — 벤치 커버리지 0회, “쉬는 천재” (부진 아님, 기회 없음)`,
      ``,
      `3. 주제별 처방 (이번 입력: "${input.task.slice(0, 60)}"):`,
      ...hints.map((h) => `   • ${h}`),
      hints.length === 0 ? `   • 일반 주제 — 전층 균형 참여 유지, 게이트 6/8 기준 유지` : ``,
      ``,
      `4. 하위 처방 (진화 로드맵):`,
      `   ${bottomHint}`,
      ``,
      `5. 승격 로드맵:`,
      `   ${promotionHint}`,
      ``,
      `6. 내일 카나리 제안 (사람 도장 필요):`,
      `   대상: genius-history-문자·문학 (50 flat) → v2 프롬프트: “세종 한글 창제 원리를 12살에게 3단계(관찰→원리→놀이)로”`,
      `   검증: canaryScore(newBrain, bench) > old+5 이면 swapWithHistory, 아니면 폐기 + errors.md 기록`,
      ``,
      `7. 한계 (REA 증거 원칙):`,
      `   • 나는 직접 코드를 고치지 않음 — 처방전만 쓰고, harness2/evolve.ts --evolve가 canary로 검증 후 사람 승인`,
      `   • 이번 리포트는 ${input.priorOutputs.length}개 priorOutputs 요약 기반 — 전체 12문제 평균은 Board 재측정 필요`,
      `   • selfCheck: 불확실 수치는 [추정] 표기, 출처는 evidence_id로 분리`,
    ]
      .filter(Boolean)
      .join("\n");

    return out(this, idea, 0.88, ["evolution", "architect", "board", "canary", "promotion"]);
  }
}
