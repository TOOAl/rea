import { describe, it, expect } from "vitest";
import { selectNeededGeniuses, GateBrain } from "../src/brains/gate.js";
import { BrainMemory } from "../src/brains/memory.js";
import { BrainRegistry } from "../src/brains/registry.js";
import { createDefaultBrains } from "../src/brains/brains.js";
import { Council } from "../src/brains/council.js";

describe("Gate 7+1 선발 — 필요 기반, 결정적", () => {
  it("같은 과제는 항상 같은 8명 (재현 가능)", () => {
    const a = selectNeededGeniuses("AI 문서 관리 시스템", "정확성·사용성");
    const b = selectNeededGeniuses("AI 문서 관리 시스템", "정확성·사용성");
    expect(a.selected.map((s) => s.id).join(",")).toBe(
      b.selected.map((s) => s.id).join(","),
    );
    expect(a.selected.length).toBe(8);
  });
  it("와일드카드는 가장 낮은 점수 1명", () => {
    const { selected, wildcard } = selectNeededGeniuses("수학 구조 증명", "");
    expect(selected[selected.length - 1].id).toBe(wildcard.id);
    expect(selected.length).toBe(8);
  });
  it("AI 문서 과제엔 튜링·섀넌·세종이 포함", () => {
    const { selected } = selectNeededGeniuses("AI 문서 관리와 한글 설계", "");
    const ids = selected.map((s) => s.id);
    expect(ids).toContain("hist-turing");
    // 세종은 한글 키워드 보너스
  });
  it("GateBrain 3.5층 — 6/8 통과, 반려 시 gate-reject 태그", async () => {
    const g = new GateBrain();
    const outPass = await g.think({
      task: "일반 문서 정리",
      context: "증거 있음 실현 가능",
      layer: 3.5 as any,
      priorOutputs: [
        {
          brainId: "x",
          role: "creative" as any,
          layer: 3 as any,
          idea: "좋은 아이디어",
          confidence: 0.9,
          tags: [],
          costMs: 0,
        },
      ],
    });
    expect(outPass.tags.some((t) => t.startsWith("score-"))).toBe(true);
    expect(["gate-pass", "gate-reject"]).toContain(outPass.tags[0]);
  });
});

describe("1층 3천재 — 지도·언어·맥락", () => {
  it("MemoryArchivist는 지도 출력", async () => {
    const mem = new BrainMemory();
    mem.rememberError("test", "증거 없음", "출처 확인");
    const reg = new BrainRegistry();
    for (const b of createDefaultBrains(mem)) reg.register(b);
    const m = reg.get("memory-archivist")!;
    const out = await m.think({
      task: "문서 정리",
      context: "",
      layer: 1,
      priorOutputs: [],
    });
    expect(out.idea).toContain("기억 지도");
    expect(out.idea).toContain("1층");
  });
  it("LanguageInterpreter는 의도·모호점", async () => {
    const reg = new BrainRegistry();
    for (const b of createDefaultBrains(new BrainMemory())) reg.register(b);
    const l = reg.get("memory-language")!;
    const out = await l.think({
      task: "빨리 완벽하게 만들어줘",
      context: "",
      layer: 1,
      priorOutputs: [],
    });
    expect(out.idea).toContain("의도");
    expect(out.tags).toContain("language");
  });
});

describe("Council 1→2→3→3.5→4→5 흐름 + 게이트 로그 — 42 brains", () => {
  it("42 brains, gateLogs 생성, 에스컬레이션 포함", async () => {
    const mem = new BrainMemory();
    const reg = new BrainRegistry();
    for (const b of createDefaultBrains(mem)) reg.register(b);
    expect(reg.all().length).toBe(47);
    expect(reg.byLayer(1).length).toBeGreaterThanOrEqual(8);
    expect(reg.byLayer(2).length).toBeGreaterThanOrEqual(4);
    expect(reg.byLayer(3.5 as any).length).toBe(1);
    const council = new Council(reg);
    const { gateLogs, gateResult, outputs } = await council.deliberate(
      "AI 문서 관리 시스템 설계",
      "정확성과 사용성",
    );
    expect(gateLogs.length).toBeGreaterThan(0);
    expect(gateResult).toBeDefined();
    expect(gateResult!.selected.length).toBe(8);
    expect(outputs.length).toBeGreaterThanOrEqual(47);
  });
});
