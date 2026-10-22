import { describe, it, expect } from "vitest";
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { isGemini4Argon } from "../src/providers/gemini.js";
import { scanAntigravitySkills, loadReference, buildSkillsIndexPrompt, cacheKeyForArgon, resolveAgentsFile } from "../src/harness2/antigravity.js";
import { createGoalState, pinGoal, repinAfterCompact, checkGoalDone, advanceGoal, parseGoalConstraints } from "../src/harness2/goal.js";
import { buildVerifyArtifact, formatVerifyReport, verifyPasses } from "../src/harness2/verify.js";

describe("gemini 4 argon provider", () => {
  it("detects argon models", () => {
    expect(isGemini4Argon("gemini-4-argon")).toBe(true);
    expect(isGemini4Argon("gemini-4-argon-cyber-permissive")).toBe(true);
    expect(isGemini4Argon("gemini-2.0-flash")).toBe(false);
    expect(isGemini4Argon("gemini-4-argon-long")).toBe(true);
  });
});

describe("antigravity harness", () => {
  it("scan empty returns []", () => {
    const dir = mkdtempSync(join(tmpdir(), "rea-anti-"));
    expect(scanAntigravitySkills({ workspaceRoot: dir })).toEqual([]);
    rmSync(dir, { recursive: true, force: true });
  });
  it("scan .agents/skills with references", () => {
    const dir = mkdtempSync(join(tmpdir(), "rea-anti-"));
    const skillDir = join(dir, ".agents/skills/perf/SKILL.md");
    mkdirSync(join(dir, ".agents/skills/perf/references"), { recursive: true });
    writeFileSync(skillDir, "---\ndescription: perf skill\n---\n# Perf\nOptimize");
    writeFileSync(join(dir, ".agents/skills/perf/references/visibility.md"), "# visibility");
    const skills = scanAntigravitySkills({ workspaceRoot: dir });
    expect(skills.length).toBe(1);
    expect(skills[0].name).toBe("perf");
    expect(skills[0].hasReferences).toBe(true);
    expect(skills[0].references).toContain("references/visibility.md");
    const ref = loadReference(dir, "perf", "references/visibility.md");
    expect(ref).toContain("visibility");
    const prompt = buildSkillsIndexPrompt(skills);
    expect(prompt).toContain("perf");
    expect(prompt).toContain("refs:");
    expect(cacheKeyForArgon("system", prompt)).toMatch(/^argon-cache-/);
    rmSync(dir, { recursive: true, force: true });
  });
  it("resolveAgentsFile priority", () => {
    const dir = mkdtempSync(join(tmpdir(), "rea-anti2-"));
    writeFileSync(join(dir, "AGENTS.md"), "agents");
    writeFileSync(join(dir, "AGENT.md"), "agent");
    const p = resolveAgentsFile(dir);
    expect(p).toContain("AGENTS.md");
    rmSync(dir, { recursive: true, force: true });
  });
});

describe("goal mode", () => {
  it("create + pin + repin", () => {
    const g = createGoalState("/goal Make ADK faster", { maxTurns: 200 });
    expect(g.goal).toBe("Make ADK faster");
    expect(g.pinned).toContain("Make ADK faster");
    const sys = pinGoal("system", g);
    expect(sys.startsWith("[GOAL")).toBe(true);
    expect(sys.endsWith(g.pinned)).toBe(true);
    const compacted = "summary without goal";
    expect(repinAfterCompact(compacted, g)).toContain(g.pinned);
    expect(repinAfterCompact(sys, g)).toBe(sys);
  });
  it("checkGoalDone done when PR present", () => {
    const g = createGoalState("make PR");
    const r = checkGoalDone(g, "Opened pull request with before/after numbers and all tests pass");
    expect(r.done).toBe(true);
  });
  it("checkGoalDone not done when TODO", () => {
    const g = createGoalState("do work");
    const r = checkGoalDone(g, "TODO remaining");
    expect(r.done).toBe(false);
    expect(r.suggestion).toBeTruthy();
  });
  it("advance increments turns", () => {
    const g = createGoalState("x");
    expect(advanceGoal(g).turns).toBe(1);
  });
  it("parse constraints", () => {
    const c = parseGoalConstraints("Keep public API unchanged, and back each change with a test that would catch a regression. Open pull request.");
    expect(c.length).toBeGreaterThan(1);
  });
});

describe("verify", () => {
  it("build + format + passes", () => {
    const base = { "a.txt": "old" } as any;
    const next = { "a.txt": "new", "b.txt": "added" } as any;
    const a = buildVerifyArtifact({ base, next, plan: "# plan", browserLog: "browser ok" });
    expect(a.diff.modified).toContain("a.txt");
    expect(a.diff.added).toContain("b.txt");
    const report = formatVerifyReport(a);
    expect(report).toContain("Verify Report");
    expect(report).toContain("browser ok");
    expect(verifyPasses(a).ok).toBe(true);
  });
  it("verify fails when no change", () => {
    const base = { "a.txt": "same" } as any;
    const a = buildVerifyArtifact({ base, next: { ...base } });
    expect(verifyPasses(a).ok).toBe(false);
  });
});
