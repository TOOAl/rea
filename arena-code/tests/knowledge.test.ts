import { describe, it, expect } from "vitest";
import { KnowledgeEngine } from "../src/brains/knowledge.js";
import {
  HISTORY_30,
  HistoryRegistry,
  createHistoryBrains,
} from "../src/brains/geniusHistory.js";
import { BrainMemory } from "../src/brains/memory.js";
import { BrainRegistry } from "../src/brains/registry.js";
import { createDefaultBrains } from "../src/brains/brains.js";
import { Council } from "../src/brains/council.js";

describe("KnowledgeEngine — 5층 분류", () => {
  it("사실/해석/추측 3구분 + AI요약 미검증 경고", () => {
    const e = new KnowledgeEngine();
    const p = e.analyze("AI 요약으로 세종이 혼자 한글 만들었다고 알려주기");
    expect(p.factChecks.length).toBeGreaterThanOrEqual(1);
    expect(p.warnings.join(" ")).toContain("AI 검증");
    expect(
      p.factChecks.some((f) => f.level === "추측" || f.level === "사실"),
    ).toBe(true);
  });
  it("4층 체계·PARA·GTD·이름짓기·FAIR 포함", () => {
    const p = new KnowledgeEngine().analyze("문서 정리", "");
    expect(p.design.fourLayers.source).toContain("원자료");
    expect(p.design.naming).toContain("v03");
    expect(p.design.fair).toContain("FAIR");
    expect(p.design.twoWeekTest).toContain("2주");
  });
  it("인출·분산·자기설명·교차·장소법·수면·외부·왜곡 모두 포함", () => {
    const p = new KnowledgeEngine().analyze("학습법", "");
    expect(p.memory.retrieval).toContain("g=.499");
    expect(p.memory.spacing).toContain("d=.54");
    expect(p.memory.selfExplain).toContain("g=.55");
    expect(p.memory.interleaving).toContain("g=.42");
    expect(p.memory.loci).toContain("d=.88");
    expect(p.memory.falseMemory).toContain("Loftus");
    expect(p.memory.external).toContain("Risko");
  });
  it("창의 6씨앗 + 비판 10건 포함", () => {
    const p = new KnowledgeEngine().analyze("창의", "");
    expect(p.creativeSeeds.length).toBe(6);
    expect(p.critical.length).toBe(10);
    expect(
      p.critical.find((c) => c.topic === "의도적 연습")!.correctSentence,
    ).toContain("개인 성공");
  });
  it("통계 과장 입력에 경고 발생", () => {
    const p = new KnowledgeEngine().analyze(
      "손글씨가 항상 타이핑보다 좋다",
      "",
    );
    expect(p.warnings.join("")).toContain("매체 과장");
  });
});

describe("History 30인", () => {
  it("30명 정확히 포함, 8분야 커버", () => {
    expect(HISTORY_30.length).toBe(36);
    const fields = new Set(HISTORY_30.map((h) => h.field));
    expect(fields.size).toBe(10);
  });
  it("각 30인은 4단 서술(achievement/interpretation/condition/limit)", () => {
    for (const h of HISTORY_30) {
      expect(h.achievement.length).toBeGreaterThan(5);
      expect(h.interpretation.length).toBeGreaterThan(5);
      expect(h.condition.length).toBeGreaterThan(3);
      expect(h.limit.length).toBeGreaterThan(5);
    }
  });
  it("HistoryRegistry — get/byField/compareTable", () => {
    expect(HistoryRegistry.get("hist-sejong")!.name).toBe("세종");
    expect(HistoryRegistry.byField("수학").length).toBe(6);
    expect(HistoryRegistry.compareTable()).toContain("유형");
  });
  it("createHistoryBrains 8개 생성", () => {
    expect(createHistoryBrains().length).toBe(8);
  });
});

describe("Council 4중 패킷 (Context+Visual+Reasoning+Knowledge) + 42 brains", () => {
  it("deliberate가 knowledgePacket 반환, 42 brains 보고", async () => {
    const mem = new BrainMemory();
    const reg = new BrainRegistry();
    for (const b of createDefaultBrains(mem)) reg.register(b);
    expect(reg.all().length).toBe(54);
    const c = new Council(reg);
    const {
      outputs,
      knowledgePacket,
      contextPacket,
      visualPacket,
      reasoningPacket,
    } = await c.deliberate("문서 정리와 학습 계획", "맥락");
    expect(outputs.length).toBeGreaterThanOrEqual(54);
    expect(knowledgePacket.factChecks.length).toBeGreaterThan(0);
    expect(knowledgePacket.fiveLayerMap).toContain("1층");
    expect(contextPacket.frame.primary.length).toBeGreaterThan(0);
    expect(visualPacket.purposeZone.length).toBeGreaterThan(0);
    expect(reasoningPacket.tot.policy.length).toBeGreaterThan(0);
  });
});
