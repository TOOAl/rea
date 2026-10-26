import { describe, it, expect } from "vitest";
import { VisualEngine } from "../src/brains/visual.js";
import { BrainMemory } from "../src/brains/memory.js";
import { BrainRegistry } from "../src/brains/registry.js";
import { createDefaultBrains } from "../src/brains/brains.js";
import { Council } from "../src/brains/council.js";

describe("VisualEngine — 💡 Light", () => {
  it("창문광 → 동기 있는 빛 + 0원 Cove 대안", () => {
    const e = new VisualEngine();
    const p = e.analyze("창문광으로 인물 찍기", "0원 스마트폰");
    expect(p.light.motivationSource).toContain("창문광");
    expect(p.light.subtractiveFirst).toBe(true);
    expect(p.budgetTier).toBe("0원");
    expect(p.light.grade).toBe("H");
  });
});

describe("VisualEngine — 🎨 Color", () => {
  it("네온 키워드 → Doyle 팔레트 + 60:30:10 가설", () => {
    const e = new VisualEngine();
    const p = e.analyze("홍콩 네온 밤거리 감성", "브랜드 필름");
    expect(p.color.paletteHint).toContain("빨강");
    expect(p.color.ratio).toBe("60:30:10");
    expect(p.color.grade).toBe("H");
  });
});

describe("VisualEngine — ◧ Composition", () => {
  it("기생충/계급 → 21mm@S35 렌즈 힌트 + 포맷 병기", () => {
    const e = new VisualEngine();
    const p = e.analyze("기생충처럼 계급을 공간으로 표현", "");
    expect(p.composition.lensHint).toContain("21mm");
    expect(p.composition.lensHint).toContain("S35");
    expect(p.composition.threeLayers).toBe(true);
  });
});

describe("VisualEngine — 🎥 Movement", () => {
  it("드론 키워드 → 동기 있는 움직임 + 훈련용 비율", () => {
    const e = new VisualEngine();
    const p = e.analyze("드론으로 공간 정보 전달", "");
    expect(p.movement.motivation).toContain("드론");
    expect(p.movement.ratioHeuristic).toContain("훈련용");
    expect(p.movement.grade).toBe("H");
  });
});

describe("VisualEngine — 🧱 Depth", () => {
  it("헤이즈 → 대기 산란 + 안전 경고", () => {
    const e = new VisualEngine();
    const p = e.analyze("헤이즈로 깊이 만들기", "");
    expect(p.depth.techniques.join(",")).toContain("대기 산란");
    expect(p.depth.hazeSafety).toContain("MSDS");
    expect(p.depth.grade).toBe("H");
  });
});

describe("VisualEngine — Bridge Zone", () => {
  it("결제/대시보드 → Zone A 수행, 랜딩/브랜드 → Zone B 감흥", () => {
    const e = new VisualEngine();
    const a = e.analyze("결제 화면 결제하기", "대시보드 설정");
    const b = e.analyze("브랜드 랜딩 페이지", "캠페인 히어로");
    expect(a.purposeZone).toBe("A:수행");
    expect(b.purposeZone).toBe("B:감흥");
    expect(b.neuro.fluency).toContain("일탈");
  });
});

describe("VisualEngine — 🎧 Audio", () => {
  it("숏폼 3초 훅 → attention 120-135BPM + 무음갭, 코딩 집중 → focus 60-90 무가사", () => {
    const e = new VisualEngine();
    const hook = e.analyze("숏폼 인트로 3초 훅", "");
    const focus = e.analyze("코딩 집중 몰입", "");
    expect(hook.audio.hookOrFocus).toBe("attention");
    expect(hook.audio.bpm).toContain("120");
    expect(focus.audio.hookOrFocus).toBe("focus");
    expect(focus.audio.bpm).toContain("60-90");
    expect(focus.audio.lyrics).toContain("무가사");
  });
  it("고난도 언어작업에 가사 → A 위반 경고", () => {
    const e = new VisualEngine();
    const p = e.analyze("논문 작성", "가사 있는 팝송 결제 화면");
    // purposeZone A + 가사 → 경고
    expect(
      p.warnings.some((w) => w.includes("음운루프") || w.includes("가사")),
    ).toBe(true);
  });
});

describe("VisualEngine — WCAG Gate", () => {
  it("뉴모피즘 저대비 → WCAG 실패 + 차단 경고", () => {
    const e = new VisualEngine();
    const p = e.analyze("뉴모피즘 저대비 카드", "브랜드 랜딩");
    expect(p.accessibility.contrastOK).toBe(false);
    expect(p.warnings.some((w) => w.includes("WCAG"))).toBe(true);
    expect(p.evidenceGrades.neumorphism).toBe("D");
  });
});

describe("VisualEngine + Council 통합", () => {
  it("Council.deliberate는 visualPacket 반환 + 42 brains", async () => {
    const mem = new BrainMemory();
    const reg = new BrainRegistry();
    for (const b of createDefaultBrains(mem)) reg.register(b);
    expect(reg.all().length).toBe(57);
    const council = new Council(reg);
    const { outputs, decision, visualPacket, contextPacket } =
      await council.deliberate(
        "창문광 네온 드론으로 브랜드 랜딩 영상",
        "0원 스마트폰",
      );
    expect(visualPacket).toBeDefined();
    expect(visualPacket.masters.length).toBeGreaterThan(0);
    expect(visualPacket.budgetTier).toBe("0원");
    expect(contextPacket).toBeDefined();
    expect(outputs.length).toBeGreaterThanOrEqual(54);
    expect(decision.consensus).toContain("합의");
  });
});
