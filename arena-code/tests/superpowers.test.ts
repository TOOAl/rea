import { describe, it, expect } from "vitest";
import { SkillManager } from "../src/skills/index.js";
import * as path from "node:path";
import * as fs from "node:fs";

const ROOT = path.resolve(".");

describe("superpowers skill", () => {
  it("loads via SkillManager", () => {
    const m = new SkillManager(ROOT);
    const s = m.get("superpowers");
    expect(s).toBeDefined();
    expect(s!.description).toContain("Superpowers");
    expect(s!.triggers).toEqual(expect.arrayContaining(["superpowers", "파이프라인"]));
  });

  it("natural language routing", () => {
    const m = new SkillManager(ROOT);
    expect(m.parseCommand("superpowers 파이프라인으로 진행해")?.skill).toBe("superpowers");
    expect(m.parseCommand("브레인스토밍부터 시작해")?.skill).toBe("superpowers");
  });

  it("file exists and contains 4 stages", () => {
    expect(fs.existsSync(path.resolve(".codex/skills/superpowers/SKILL.md"))).toBe(true);
    const m = new SkillManager(ROOT);
    const c = m.get("superpowers")!.content;
    expect(c).toContain("Brainstorm");
    expect(c).toContain("Plan");
    expect(c).toContain("Execute");
    expect(c).toContain("Review");
    expect(c).toContain("Superpowers Review:");
  });
});
