import { describe, it, expect } from "vitest";
import { BrainMemory } from "../src/brains/memory.js";
import { BrainRegistry } from "../src/brains/registry.js";
import { Council } from "../src/brains/council.js";
import { ReasoningEngine } from "../src/brains/reasoning.js";
import { ContextEngine } from "../src/brains/context.js";

describe("Nobel Reasoning v5", ()=>{
  it("ReasoningEngine.nobelAnalyze — 6종 추론 모두 생성", ()=>{
    const eng = new ReasoningEngine();
    const pkt = eng.nobelAnalyze("의료 진단 희귀병", "검사 양성, 유병률 0.1%", "검사 민감도 99%");
    expect(pkt.nobel.bayesian.length).toBe(3);
    expect(pkt.nobel.bayesian[0].posterior).toBeDefined();
    expect(pkt.nobel.causal.doCue).toContain("do-calculus");
    expect(pkt.nobel.counterfactual.length).toBeGreaterThanOrEqual(3);
    expect(pkt.nobel.dialectic.synthesis).toContain("합");
    expect(pkt.nobel.analogy.mapping).toBeDefined();
    expect(pkt.nobel.gedanken).toContain("사고실험");
  });
  it("ContextEngine.nobelAnalyze — ToM·함축·관련성·공감", ()=>{
    const eng = new ContextEngine();
    const p = eng.nobelAnalyze("카드뉴스 대본", "SSR/하이드레이션 그거 고쳐 빨리");
    expect(p.tom.mismatch).toBeDefined();
    expect(p.impl.maxim).toBeDefined();
    expect(p.relevance.score).toBeGreaterThan(0);
    expect(p.empathy.calibrate).toBeDefined();
  });
  it("Nobel 5두뇌 — Council에 참여, 태그 포함", async ()=>{
    const mem = new BrainMemory();
    const reg = new BrainRegistry();
    const { createDefaultBrains } = await import("../src/brains/brains.js");
    for(const b of createDefaultBrains(mem)) reg.register(b);
    expect(reg.all().length).toBe(55);
    expect(reg.get("genius-physics-nobel")).toBeDefined();
    expect(reg.get("genius-literature-nobel")!.version).toBe("5.0.0");
    const council = new Council(reg);
    const res = await council.deliberate("기본소득 찬반 변증", "", { article: "찬성 빈곤해소 반대 인플레이션, 무한 지급 사고실험", topic: "nobel-dialectic" });
    const nobelOut = res.outputs.filter(o=> o.brainId.includes("nobel"));
    expect(nobelOut.length).toBe(5);
    const ideas = res.outputs.map(o=> o.idea).join("\n");
    expect(ideas).toMatch(/노벨|nobel/);
    expect(ideas).toMatch(/합성|변증|베이지안|ToM|사고실험/);
  });
});
