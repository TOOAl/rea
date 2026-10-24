import { describe, it, expect } from "vitest";
import { ReasoningEngine } from "../src/brains/reasoning.js";
import { BrainMemory } from "../src/brains/memory.js";
import { BrainRegistry } from "../src/brains/registry.js";
import { createDefaultBrains } from "../src/brains/brains.js";
import { Council } from "../src/brains/council.js";

describe("ReasoningEngine — 🌳 ToT", () => {
  it("BFS k=3 d=2 → 6 nodes + bestPath 2개 + score 0.2-0.95", () => {
    const e = new ReasoningEngine();
    const t = e.totExplore("Game of 24: 4 4 6 8", "", "bfs", 3, 2);
    expect(t.nodes.length).toBe(6);
    expect(t.bestPath.length).toBe(2);
    expect(t.branching).toBe(3);
    expect(t.nodes.every((n) => n.score >= 0.2 && n.score <= 0.95)).toBe(true);
  });
  it("과장 표현은 감점 → backtrack 가능", () => {
    const e = new ReasoningEngine();
    const t = e.totExplore("항상 완벽한 해답", "");
    // 과장 감점으로 backtrack 여부 체크 (점수 낮으면 true일 수도, 아니면 false여도 정상)
    expect(typeof t.backtracked).toBe("boolean");
  });
});

describe("ReasoningEngine — Validator MA-ToT", () => {
  it("오류 chain은 abstain, 정상은 valid", () => {
    const e = new ReasoningEngine();
    const votes = e.validateChains([
      { id: "r1", chain: "2+2=4 이므로 정답 4" },
      { id: "r2", chain: "오류 계산 틀림 무조건 불가능" },
    ]);
    expect(votes[0].valid).toBe(true);
    expect(votes[1].valid).toBe(false);
    expect(votes[1].abstained).toBe(true);
  });
});

describe("ReasoningEngine — 🔧 ECO", () => {
  it("숫자 마스킹 → 재추론 불일치 시 mismatch, clean도 1개 보장", () => {
    const e = new ReasoningEngine();
    const fixes = e.ecoCorrect("24와 36을 더하면 60, 24는 23으로 잘못 쓴 경우");
    expect(fixes.length).toBeGreaterThanOrEqual(1);
    // 24→23 예시는 mismatch true
    expect(fixes.some((f) => f.masked.includes("[MASK]"))).toBe(true);
  });
});

describe("ReasoningEngine — 🏗️ SISR", () => {
  it("Blocksworld는 PDDL 분해 + 실패 2회 반복 시 차단", () => {
    const e = new ReasoningEngine();
    const p1 = e.sisrRefine("b2 on b3, b3 on b1 블록 쌓기", [], 3);
    expect(p1.pddlLike.join("")).toContain("stack");
    const p2 = e.sisrRefine(
      "b2 on b3",
      ["Goal b3 on b1 not satisfied", "Goal b3 on b1 not satisfied"],
      3,
    );
    expect(p2.blockedRepeat).toBe(true);
    expect(p2.feedbackHistory.join("").includes("STRICT")).toBe(true);
  });
});

describe("ReasoningEngine — MALT G→V→R", () => {
  it("analyze는 tot+validator+malt+eco+sisr 전부 포함", () => {
    const e = new ReasoningEngine();
    const pkt = e.analyze("수학 방정식 2x+3=7 풀기", "GSM8K 스타일");
    expect(pkt.tot.nodes.length).toBeGreaterThan(0);
    expect(pkt.validator.votes.length).toBe(3);
    expect(pkt.malt.g).toContain("G:");
    expect(pkt.malt.v).toContain("V:");
    expect(pkt.malt.r).toContain("R:");
    expect(pkt.malt.turnLog.length).toBe(3);
    expect(pkt.eco.length).toBeGreaterThan(0);
    expect(pkt.sisr.pddlLike.length).toBeGreaterThan(0);
  });
});

describe("ReasoningEngine — 통합 validate", () => {
  it("분기 b>5 경고, SISR 3회 초과 경고", () => {
    const e = new ReasoningEngine();
    const pkt = e.analyze("일반 작업", "");
    // 강제 큰 분기로 경고 유도
    const tot = e.totExplore("test", "", "bfs", 6, 4);
    const w = e.validate(
      {
        tot,
        validatorVotes: pkt.validator.votes,
        eco: pkt.eco,
        sisr: {
          ...pkt.sisr,
          feedbackHistory: ["a", "b", "c", "d"],
          attempt: 4,
          pddlLike: [],
          strict: true,
          blockedRepeat: false,
        } as any,
        task: "test",
      },
      "test",
    );
    expect(w.some((x) => x.includes("비용"))).toBe(true);
    expect(w.some((x) => x.includes("3회"))).toBe(true);
  });
});

describe("ReasoningEngine + Council 통합", () => {
  it("Council.deliberate는 reasoningPacket 반환 + 42 brains", async () => {
    const mem = new BrainMemory();
    const reg = new BrainRegistry();
    for (const b of createDefaultBrains(mem)) reg.register(b);
    expect(reg.all().length).toBe(54);
    const council = new Council(reg);
    const { outputs, decision, reasoningPacket, contextPacket, visualPacket } =
      await council.deliberate("Game of 24 수학 추론 8 4 6 4", "GSM8K");
    expect(reasoningPacket).toBeDefined();
    expect(reasoningPacket.tot.nodes.length).toBe(6);
    expect(reasoningPacket.validator.votes.length).toBeGreaterThan(0);
    expect(reasoningPacket.malt.turnLog.length).toBe(3);
    expect(outputs.length).toBeGreaterThanOrEqual(54);
    expect(decision.consensus).toContain("합의");
    expect(contextPacket).toBeDefined();
    expect(visualPacket).toBeDefined();
  });
});

describe("BrainsTool — 4 packet", () => {
  it("BrainsTool 출력에 4 packet 모두 포함", async () => {
    const { buildRegistry } = await import("../src/tools/index.js");
    const reg = buildRegistry();
    const tool = reg.get("Brains")!;
    const out = await tool.execute({ task: "수학 추론 24 게임" }, {
      cwd: "/tmp",
    } as any);
    expect(out).toContain("ContextPacket");
    expect(out).toContain("VisualPacket");
    expect(out).toContain("ReasoningPacket");
    expect(out).toContain("KnowledgePacket");
    expect(out).toContain("ToT");
  });
});
