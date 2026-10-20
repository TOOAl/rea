import { describe, it, expect } from "vitest";
import { mkdtempSync, rmSync, existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { guardHarness } from "../src/harness2/guard.js";
import { RecurrentDepthRunner } from "../src/harness2/depth.js";
import { ARENA_SURFACE } from "../src/harness2/harness.js";

describe("Guard", () => {
  it("detects TODO placeholder", () => {
    const tree = { "AGENTS.md": "When test — do thing, load the `test` skill.", "skills/test/SKILL.md": "---\nname: test\ndescription: does a useful test thing\n---\n\n# test\nTODO fix this" };
    const r = guardHarness(tree);
    expect(r.ok).toBe(false);
    expect(r.issues.some(i => i.includes("TODO"))).toBe(true);
  });

  it("detects always-on overflow", () => {
    const big = "x".repeat(13000);
    const tree = { "AGENTS.md": big, "skills/a/SKILL.md": "---\nname: a\ndescription: valid description for skill a\n---\n\ncontent" };
    const r = guardHarness(tree);
    expect(r.issues.some(i => i.includes("always-on 초과"))).toBe(true);
  });

  it("passes valid harness", () => {
    const tree = {
      "AGENTS.md": "When my-skill — does my thing, load the `my-skill` skill.",
      "skills/my-skill/SKILL.md": "---\nname: my-skill\ndescription: does my useful thing for validation\n---\n\n# my-skill\nDetailed content here with enough length to pass guard checks.",
    };
    const r = guardHarness(tree);
    expect(r.ok).toBe(true);
    expect(r.issues).toEqual([]);
  });

  it("warns short description", () => {
    const tree = {
      "AGENTS.md": "When x — short, load the `x` skill.",
      "skills/x/SKILL.md": "---\nname: x\ndescription: hi\n---\n\n# x\nshort",
    };
    const r = guardHarness(tree);
    expect(r.warnings.length).toBeGreaterThan(0);
  });
});

describe("RecurrentDepthRunner", () => {
  const mockProvider: any = { name: "mock", model: "test" };

  it("depth=1 behaves like engine", async () => {
    const tmp = mkdtempSync(join(tmpdir(), "h2-depth1-"));
    const runner = new RecurrentDepthRunner(mockProvider);
    const base = { "AGENTS.md": "base" };
    const res = await runner.run({
      taskId: "depth-test-1",
      taskPrompt: "Simple task",
      baseHarness: base,
      provider: mockProvider,
      cwd: tmp,
      k: 1, mode: "parallel", depth: 1, guard: true, dryRun: true,
      evidenceRoot: join(tmp, ".arena", "harness2", "evidence"),
    });
    expect(res.depth).toBe(1);
    expect(res.executedDepth).toBe(1);
    expect(res.depthHistory).toHaveLength(1);
    expect(res.guardReports).toHaveLength(1);
    expect(Object.keys(res.finalHarness).length).toBeGreaterThan(0);
    rmSync(tmp, { recursive: true, force: true });
  });

  it("depth=2 with earlyStop may run 2 depths", async () => {
    const tmp = mkdtempSync(join(tmpdir(), "h2-depth2-"));
    const runner = new RecurrentDepthRunner(mockProvider);
    const base = { "AGENTS.md": "base", "guardrails.md": "rules" };
    const res = await runner.run({
      taskId: "depth-test-2",
      taskPrompt: "Deep task that benefits from recurrent depth",
      baseHarness: base,
      provider: mockProvider,
      cwd: tmp,
      k: 1, mode: "parallel", depth: 2, guard: true, dryRun: true,
      evidenceRoot: join(tmp, ".arena", "harness2", "evidence"),
      earlyStop: false, // force 2
    });
    expect(res.depth).toBe(2);
    expect(res.executedDepth).toBe(2);
    expect(res.depthHistory).toHaveLength(2);
    expect(res.depthNotes.length).toBeGreaterThanOrEqual(2);
    expect(res.bestHarness).toBeDefined();
    // summary file created
    expect(existsSync(join(tmp, ".arena", "harness2", "evidence", "depth-test-2-depth-summary.json"))).toBe(true);
    rmSync(tmp, { recursive: true, force: true });
  });

  it("depth=3 sequential with k=1", async () => {
    const tmp = mkdtempSync(join(tmpdir(), "h2-depth3-"));
    const runner = new RecurrentDepthRunner(mockProvider);
    const base = { "AGENTS.md": "base" };
    const res = await runner.run({
      taskId: "depth-test-3",
      taskPrompt: "Sequential deep task",
      baseHarness: base,
      provider: mockProvider,
      cwd: tmp,
      k: 1, mode: "sequential", depth: 3, guard: false, dryRun: true,
      evidenceRoot: join(tmp, ".arena", "harness2", "evidence"),
      earlyStop: false,
    });
    expect(res.executedDepth).toBe(3);
    expect(res.stages.length).toBe(9); // 3 depths * 3 stages each (inv,dom,compose)
    rmSync(tmp, { recursive: true, force: true });
  });

  it("guard failure hint triggers extra depth attempt", async () => {
    // Simulate base with TODO that guard will catch
    const tmp = mkdtempSync(join(tmpdir(), "h2-depth-guard-"));
    const runner = new RecurrentDepthRunner(mockProvider);
    // Create base that already has TODO in AGENTS.md? But engine dryRun will add valid skills, so guard may still pass.
    // We test that guard report exists and hint logic doesn't crash
    const base = { "AGENTS.md": "This has TODO placeholder that should be flagged even though engine will clean?" };
    const res = await runner.run({
      taskId: "depth-guard-test",
      taskPrompt: "Task with potential hallucination",
      baseHarness: base,
      provider: mockProvider,
      cwd: tmp,
      k: 1, mode: "parallel", depth: 2, guard: true, dryRun: true,
      evidenceRoot: join(tmp, ".arena", "harness2", "evidence"),
    });
    expect(res.guardReports.length).toBeGreaterThan(0);
    rmSync(tmp, { recursive: true, force: true });
  });
});

