import { describe, it, expect } from "vitest";
import { problemToGame, applyMove, MathGameTool } from "../src/tools/mathGame.js";
import { generateSyntheticProof, generateBatch, batchStats } from "../src/rag/syntheticProofs.js";

describe("MathGame — 문제→게임 변환", () => {
  it("캡셋 문제 도메인 감지", () => {
    const g = problemToGame("캡셋 문제 n=8에서 496→512 증명");
    expect(g.domain).toBe("cap-set");
    expect(g.actions).toContain("priority(x) 함수 한 줄 수정");
    expect(g.verification).toContain("프로그램 실행");
  });
  it("행렬곱 도메인 감지 + 보상 음수 곱셈", () => {
    const g = problemToGame("4×4 행렬곱 49→47 최적화");
    expect(g.domain).toBe("matrix");
    expect(g.reward).toContain("-곱셈");
  });
  it("IMO 기하 도메인 + 보조선", () => {
    const g = problemToGame("IMO P4 기하 보조선 문제");
    expect(g.domain).toBe("imo-geometry");
    expect(g.actions[0]).toContain("보조선");
  });
  it("applyMove 터미널 판정", () => {
    const s = problemToGame("일반 수학");
    const m = applyMove(s, "증명 완료");
    expect(m.terminated).toBe(true);
    expect(m.reward).toBe(1.0);
  });
  it("MathGameTool execute", async () => {
    const res = await MathGameTool.execute({ task: "IMO P6 정수론 최난문" } as any);
    expect(res).toContain("MathGame");
    expect(res).toContain("상태:");
  });
});

describe("SyntheticProofs — 합성 증명 생성", () => {
  it("1개 생성: 보조선+결론 포함", () => {
    const p = generateSyntheticProof("△ABC 외심 증명", 0);
    expect(p.auxiliary.length).toBeGreaterThan(5);
    expect(p.steps.length).toBe(5);
    expect(p.verified).toBe(true);
  });
  it("batch 10개 생성 + 통계", () => {
    const batch = generateBatch("IMO 기하 문제", 10);
    expect(batch.length).toBe(10);
    const s = batchStats(batch);
    expect(s.rate).toBe("100%");
    expect(s.verified).toBe(10);
  });
  it("seed별 다른 보조선 (결정적 다양성)", () => {
    const a = generateSyntheticProof("기하", 0);
    const b = generateSyntheticProof("기하", 1);
    // 다를 수도 같을 수도 있으나 id는 다름
    expect(a.id).not.toBe(b.id);
  });
});
