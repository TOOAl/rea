import { describe, it, expect } from "vitest";
import { ContextEngine } from "../src/brains/context.js";
import { BrainMemory } from "../src/brains/memory.js";
import { BrainRegistry } from "../src/brains/registry.js";
import { createDefaultBrains } from "../src/brains/brains.js";
import { Council } from "../src/brains/council.js";

describe("ContextEngine — ④ 프레임", () => {
  it("농담/ㅋㅋ 감지 → keyed", () => {
    const e = new ContextEngine();
    const p = e.analyze("친구 수다", "ㅋㅋ 농담이야 이거 웃기지? haha");
    expect(p.frame.variant).toBe("keyed");
    expect(p.frame.keyCue).toBeDefined();
  });
  it("공식 보고서는 straight 유지 + 미스키잉 위험 없음", () => {
    const e = new ContextEngine();
    const p = e.analyze("공식 보고서 발표", "이번 분기 실적을 보고드립니다");
    expect(p.frame.variant).toBe("straight");
    expect(p.frame.risk.length).toBe(0);
  });
});

describe("ContextEngine — ⑤ 레지스터", () => {
  it("공식 발표 → low맥락 + 공식 genre", () => {
    const e = new ContextEngine();
    const p = e.analyze("공식 보고서 발표 자리", "데이터를 설명합니다");
    expect(p.register.highLow).toBe("low");
    expect(p.register.genre).toBe("공식 발표");
    expect(p.register.field).toContain("공식");
  });
  it("공식+놀이 혼합 → mismatchWarning + validate 경고", () => {
    const e = new ContextEngine();
    const p = e.analyze("공식 발표 회의", "ㅋㅋ 농담이야 이거 웃기지? haha 진짜 웃겨요");
    expect(p.register.mismatchWarning).toBeDefined();
    expect(p.warnings.some(w => w.includes("⑤ 레지스터"))).toBe(true);
  });
});

describe("ContextEngine — ⑦ 인지/정서", () => {
  it("화남 단어 → anger + 미소 교정 제안", () => {
    const e = new ContextEngine();
    const p = e.analyze("일반 대화", "진짜 짜증나고 화났어, 이건 심각한 문제야");
    expect(p.cognitive.emotion).toBe("anger");
    expect(p.cognitive.intensity).toBeGreaterThan(0.8);
    expect(p.cognitive.suggestion).toContain("미소 금지");
  });
  it("화남 대사에 웃음 이모지 → ⑦ 경고", () => {
    const e = new ContextEngine();
    const p = e.analyze("", "화났어 진짜 짜증나 😊 하하 ㅋㅋ");
    expect(p.warnings.some(w => w.includes("⑦"))).toBe(true);
  });
});

describe("ContextEngine — ⑧ 접지", () => {
  it("수락 신호 없으면 접지 부족 경고 + sufficient false", () => {
    const e = new ContextEngine();
    const p = e.analyze("일반 대화", "이따 회의하자");
    expect(p.grounding.sufficient).toBe(false);
    expect(p.warnings.some(w => w.includes("⑧ 접지"))).toBe(true);
  });
  it("수락 신호 있으면 sufficient true는 아님 — 언어적+수락 둘다 필요", () => {
    const e = new ContextEngine();
    const p = e.analyze("일반", "네 알겠어 여기 화면 봐");
    // linguistic true (len>8) + acceptanceSignal true → sufficient true
    expect(p.grounding.sufficient).toBe(true);
    expect(p.grounding.triple.physical).toBe(true);
  });
});

describe("ContextEngine + Council 통합", () => {
  it("Council.deliberate는 ContextPacket을 반환하고 1층에 주입", async () => {
    const mem = new BrainMemory();
    const reg = new BrainRegistry();
    for (const b of createDefaultBrains(mem)) reg.register(b);
    const council = new Council(reg);
    const { outputs, decision, contextPacket } = await council.deliberate("ㅋㅋ 농담이야 재밌지?", "친구 수다 방송");
    expect(contextPacket).toBeDefined();
    expect(contextPacket.frame.variant).toBe("keyed");
    expect(contextPacket.register.highLow).toBe("high");
    expect(outputs.length).toBeGreaterThanOrEqual(38);
    expect(decision.consensus).toContain("합의");
    expect(outputs[0].idea.length).toBeGreaterThan(10);
  });
});
