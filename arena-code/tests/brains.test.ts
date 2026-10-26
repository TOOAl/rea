import { describe, it, expect } from "vitest";
import { BrainMemory } from "../src/brains/memory.js";
import { BrainRegistry } from "../src/brains/registry.js";
import { createDefaultBrains, GeniusBrain } from "../src/brains/brains.js";
import { Council } from "../src/brains/council.js";
import { buildRegistry } from "../src/tools/index.js";

describe("BrainMemory", () => {
  it("rememberError + commonFailures", () => {
    const m = new BrainMemory();
    m.rememberError("task1", "증거 없음", "증거를 대라");
    expect(m.commonFailures()).toContain("증거 없음");
  });
  it("recall recent lessons", () => {
    const m = new BrainMemory();
    m.addFeedback({
      targetId: "b1",
      reward: -1,
      note: "틀림",
      lesson: "조심해",
    });
    expect(m.recall("b1")).toContain("조심해");
  });
});

describe("BrainRegistry", () => {
  it("register + swap + remove", () => {
    const reg = new BrainRegistry();
    const mem = reg.memory;
    for (const b of createDefaultBrains(mem)) reg.register(b);
    expect(reg.all().length).toBe(68);
    const before = reg.get("genius-math")!;
    reg.swap(new GeniusBrain("genius-math", "새 수학", "새 설명", "Cooking"));
    expect(reg.get("genius-math")!.name).toBe("새 수학");
    reg.remove("genius-art");
    expect(reg.get("genius-art")).toBeUndefined();
  });
  it("validateFloors needs 5 layers", () => {
    const reg = new BrainRegistry();
    expect(reg.validateFloors().ok).toBe(false);
    for (const b of createDefaultBrains(reg.memory)) reg.register(b);
    expect(reg.validateFloors().ok).toBe(true);
  });
  it("byRole / byLayer", () => {
    const reg = new BrainRegistry();
    for (const b of createDefaultBrains(reg.memory)) reg.register(b);
    expect(reg.byRole("creative").length).toBe(1);
    expect(reg.byLayer(1).length).toBe(18);
    expect(reg.byLayer(5).length).toBe(2);
  });
});

describe("Council", () => {
  it("deliberate returns outputs + decision", async () => {
    const mem = new BrainMemory();
    const reg = new BrainRegistry();
    for (const b of createDefaultBrains(mem)) reg.register(b);
    const council = new Council(reg);
    const { outputs, decision } = await council.deliberate(
      "급식 메뉴 정하기",
      "알레르기 있음",
    );
    expect(outputs.length).toBeGreaterThanOrEqual(9);
    expect(decision.consensus).toContain("합의");
    expect(decision.votes.length).toBe(outputs.length);
  });
  it("feedback learns", async () => {
    const mem = new BrainMemory();
    const reg = new BrainRegistry();
    for (const b of createDefaultBrains(mem)) reg.register(b);
    const council = new Council(reg);
    const { decision } = await council.deliberate("테스트");
    await council.feedback(decision, 1, "잘했어");
    expect(mem.commonFailures()).toBeDefined();
  });
});

describe("BrainsTool via Registry", () => {
  it("buildRegistry includes Brains", () => {
    const reg = buildRegistry();
    expect(reg.get("Brains")).toBeDefined();
  });
  it("Brains deliberate via tool", async () => {
    const reg = buildRegistry();
    const tool = reg.get("Brains")!;
    const out = await tool.execute(
      { task: "새 게임 아이디어" },
      { cwd: "/tmp" },
    );
    expect(out).toContain("두뇌 회의");
    expect(out).toContain("합의");
  });
  it("Brains list", async () => {
    const reg = buildRegistry();
    const tool = reg.get("Brains")!;
    const out = await tool.execute(
      { task: "x", action: "list" },
      { cwd: "/tmp" },
    );
    expect(out).toContain("BrainRegistry");
  });
  it("Brains swap", async () => {
    const reg = buildRegistry();
    const tool = reg.get("Brains")!;
    const out = await tool.execute(
      { task: "x", action: "swap", genius: "음악" },
      { cwd: "/tmp" },
    );
    expect(out).toContain("교체 완료");
  });
});
