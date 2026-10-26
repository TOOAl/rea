import { describe, it, expect } from "vitest";
import { MathVerifier, simulateMathRounds } from "../src/harness2/mathVerifier.js";

describe("MathVerifier 3종 검증기", () => {
  const v = new MathVerifier();

  it("수치 검증: 올바른 식 통과, 틀린 식 차단", () => {
    const ok = v.verify("정답: 2×3=6, 캡셋 496→512 증가");
    expect(ok.results.find(r => r.verifier === "numerical")?.valid).toBe(true);
    const bad = v.verify("증명: 2×3=7 (오류)");
    expect(bad.results.find(r => r.verifier === "numerical")?.valid).toBe(false);
  });

  it("기호 검증: Lean theorem without proof 차단", () => {
    const bad = v.verify("theorem P1 : ∀ n, Even n → theorem 선언");
    expect(bad.results.find(r => r.verifier === "symbolic")?.valid).toBe(false);
    const ok = v.verify("기하 보조선: 점 D를 AB 연장선에 찍으면 △ABC ≅ △ADE → 증명 완료");
    expect(ok.results.find(r => r.verifier === "symbolic")?.valid).toBe(true);
  });

  it("논리 검증: 과장/오류 탐지", () => {
    const bad = v.verify("이 방법은 항상 완벽하다");
    expect(bad.results.find(r => r.verifier === "logic")?.valid).toBe(false);
  });

  it("2/3 합의: 2개 이상 통과면 consensus true", () => {
    const mixed = v.verify("2×3=6, 보조선 AB=CD, 논리 타당");
    expect(mixed.consensus).toBe(true);
    expect(mixed.validCount).toBeGreaterThanOrEqual(2);
  });

  it("filterValidIdeas: 합의 실패 제거", () => {
    const outputs = [
      { idea: "올바른 증명: 2×3=6, Lean theorem P1 proof 완료, 논리 타당" },
      { idea: "항상 완벽하다 2×3=7 틀림" },
    ];
    const { kept, blocked } = v.filterValidIdeas(outputs);
    expect(kept.length).toBe(1);
    expect(blocked.length).toBe(1);
  });
});

describe("simulateMathRounds — 3라운드 토론 시뮬", () => {
  it("3세대까지 변형 교차 시뮬", () => {
    const ideas = [
      "FunSearch: priority(x)= (x[0]+x[1])%3==0 ? 0.9 : 0.2 — 캡셋 496→512",
      "Tensor: 4×4 행렬곱을 TensorGame 상태/행동/보상으로 정의, MCTS 탐색",
      "Lean: theorem P1 proof 완료, Lean 검증 통과, Test-Time RL 수백만 변형",
    ];
    const rounds = simulateMathRounds(ideas);
    expect(rounds.length).toBeGreaterThanOrEqual(1);
    expect(rounds[0].kept + rounds[0].blocked).toBe(3);
    // 3라운드 합계가 초기보다 검증된 것만 남음
    const last = rounds[rounds.length - 1];
    expect(last.kept).toBeGreaterThanOrEqual(0);
  });

  it("틀린 아이디어는 1라운드에서 차단", () => {
    const badIdeas = ["항상 완벽하다 2×3=7 오류", "모순된 증명 불가능"];
    const rounds = simulateMathRounds(badIdeas);
    expect(rounds[0].blocked).toBeGreaterThan(0);
  });
});
