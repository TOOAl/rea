import { describe, it, expect } from "vitest";
import { BrainMemory } from "../src/brains/memory.js";
import { BrainRegistry } from "../src/brains/registry.js";
import { createDefaultBrains } from "../src/brains/brains.js";
import { MATH_QUINTET_BRAINS } from "../src/brains/mathQuintet.js";
import { Council } from "../src/brains/council.js";

describe("Math Quintet v7 — 5형제", () => {
  it("5명 모두 layer 4 genius로 등록", async () => {
    expect(MATH_QUINTET_BRAINS.length).toBe(5);
    for (const b of MATH_QUINTET_BRAINS) {
      expect(b.layer).toBe(4);
      expect(b.role).toBe("genius");
      expect(b.id.startsWith("math-")).toBe(true);
    }
  });

  it("각 두뇌 think()가 고유 토론 대사 생성", async () => {
    for (const b of MATH_QUINTET_BRAINS) {
      const out = await b.think({ task: "캡셋 문제 n=8에서 496→512 증명", context: "", layer: 4, priorOutputs: [] });
      expect(out.idea.length).toBeGreaterThan(40);
      expect(out.confidence).toBeGreaterThan(0.8);
      expect(out.tags).toContain("math");
    }
  });

  it("FunSearch는 priorOutputs 반영, Tensor는 게임화 키워드 포함", async () => {
    const fun = MATH_QUINTET_BRAINS.find(b => b.id === "math-funsearch")!;
    const tensor = MATH_QUINTET_BRAINS.find(b => b.id === "math-tensor")!;
    const out1 = await fun.think({ task: "행렬곱 최적화", context: "", layer: 4, priorOutputs: [{ brainId: "x", role: "genius", layer: 4, idea: "prior test idea", confidence: 0.8, tags: [], costMs: 0 }]});
    expect(out1.idea).toContain("priority");
    const out2 = await tensor.think({ task: "IMO P6 증명", context: "", layer: 4, priorOutputs: [] });
    expect(out2.idea).toContain("TensorGame");
  });

  it("createDefaultBrains에 5형제 포함되어 65명", async () => {
    const mem = new BrainMemory();
    const reg = new BrainRegistry();
    for (const b of createDefaultBrains(mem)) reg.register(b);
    expect(reg.all().length).toBe(65);
    expect(reg.get("math-funsearch")).toBeDefined();
    expect(reg.get("math-lean")).toBeDefined();
    expect(reg.get("math-deepthink")).toBeDefined();
  });

  it("Council deliberate에 5형제 참여 + 기존 genius-math와 협력", async () => {
    const mem = new BrainMemory();
    const reg = new BrainRegistry();
    for (const b of createDefaultBrains(mem)) reg.register(b);
    const council = new Council(reg);
    const { outputs } = await council.deliberate("IMO 2024 P6 대수 문제 증명", "algebra number theory");
    const mathOutputs = outputs.filter(o => o.brainId.startsWith("math-") || o.brainId === "genius-math");
    expect(mathOutputs.length).toBeGreaterThanOrEqual(6); // 기존 1 + 5형제
    // Lean 천재는 Test-Time RL 언급
    const lean = mathOutputs.find(o => o.brainId === "math-lean");
    expect(lean?.idea).toContain("Lean");
  });
});
