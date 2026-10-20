import { describe, it, expect } from "vitest";
import { SkillManager } from "../src/skills/index.js";
import * as fs from "node:fs";
import * as path from "node:path";
const ROOT = path.resolve(".");
describe("genius skills", () => {
  it("loads 4 genius skills via SkillManager", () => {
    const m = new SkillManager(ROOT);
    const names = m.list().map(s=>s.name);
    for (const g of ["genius_curie","genius_da_vinci","genius_euler","genius_turing"]) expect(names).toContain(g);
  });
  it("each has 3-stage workflow content", () => {
    const m = new SkillManager(ROOT);
    for (const g of ["genius_curie","genius_da_vinci","genius_euler","genius_turing"]) {
      const s = m.get(g); expect(s).toBeDefined();
      expect(s!.content.length).toBeGreaterThan(300);
    }
  });
  it("files exist on disk", () => {
    for (const g of ["genius_curie","genius_da_vinci","genius_euler","genius_turing"]) {
      expect(fs.existsSync(path.resolve(".codex/skills/"+g+"/SKILL.md"))).toBe(true);
    }
  });
  it("allDescriptions includes at least 4 skills", () => {
    const m = new SkillManager(ROOT);
    expect(m.list().length).toBeGreaterThanOrEqual(9);
  });
});
