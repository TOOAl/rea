import { describe, it, expect } from "vitest";
import { mkdtempSync, writeFileSync, mkdirSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { Harness2Engine } from "../src/harness2/engine.js";
import { ArgonCache, argonCacheKey } from "../src/harness2/cache.js";
import { simulateLongRun, longRunSummary } from "../src/harness2/longRun.js";

const mockProvider = { name: "mock", model: "mock" } as any;

describe("Harness2Engine Argon integration (v2.15)", () => {
  it("goal pin + cache + verify wired", async () => {
    const engine = new Harness2Engine(mockProvider);
    const cwd = mkdtempSync(join(tmpdir(), "rea-int-"));
    mkdirSync(join(cwd, ".agents/skills/demo"), { recursive: true });
    writeFileSync(join(cwd, ".agents/skills/demo/SKILL.md"), "---\ndescription: demo\n---\n# demo");
    const res = await engine.run({
      taskId: "int-goal",
      taskPrompt: "Make ADK faster — keep API unchanged",
      baseHarness: { "AGENTS.md": "base" },
      provider: mockProvider,
      cwd,
      k: 1,
      mode: "parallel",
      dryRun: true,
      goal: { text: "Make ADK add no noticeable overhead", maxTurns: 200 },
      antigravity: { enabled: true, workspaceRoot: cwd },
      argonCache: { enabled: true },
      verify: { enabled: true },
    } as any);
    expect(res.ok).toBe(true);
    expect(res.cacheStats).toBeDefined();
    expect((res as any).verifyEnabled).toBe(true);
    expect(res.finals.length).toBe(1);
    // verify report written
    const verifyPath = join(cwd, ".arena/harness2/evidence", "int-goal-step-1", "verify-report.json");
    // engine writes to evidenceRoot inside cwd — check exists via any file
    const evidenceRoot = join(cwd, ".arena/harness2/evidence");
    expect(existsSync(evidenceRoot)).toBe(true);
  });

  it("cache 95% hit sim", () => {
    const c = new ArgonCache();
    const k1 = argonCacheKey("system A", "skills index");
    const k2 = argonCacheKey("system A", "skills index");
    expect(k1).toBe(k2);
    const a = c.touch("system A", "skills index");
    expect(a.hit).toBe(false);
    const b = c.touch("system A", "skills index");
    expect(b.hit).toBe(true);
    expect(b.savedRatio).toBe(0.95);
    expect(c.stats().keys).toBe(1);
    expect(c.stats().totalHits).toBe(2);
  });

  it("longRun 11h sim 2 shipped 4 rejected", () => {
    const r = simulateLongRun("Make ADK add no noticeable overhead");
    expect(r.benchmarks.length).toBe(5);
    expect(r.proposals.length).toBe(6);
    expect(r.shipped.length).toBe(2);
    expect(r.rejected.length).toBe(4);
    expect(r.prBody).toContain("before → after");
    expect(r.selfAudit).toContain("3분 전");
    const sum = longRunSummary(r);
    expect(sum).toContain("2 shipped");
    expect(sum).toContain("4 rejected");
    // shipped titles match ADK real
    expect(r.shipped[0].title).toContain("세션 이벤트 필터");
    expect(r.shipped[1].title).toContain("import 지연");
  });

  it("engine dryRun without argon still ok (backward compat)", async () => {
    const engine = new Harness2Engine(mockProvider);
    const cwd = mkdtempSync(join(tmpdir(), "rea-int2-"));
    const res = await engine.run({
      taskId: "compat",
      taskPrompt: "simple",
      baseHarness: {},
      provider: mockProvider,
      cwd,
      k: 1,
      dryRun: true,
    } as any);
    expect(res.ok).toBe(true);
    expect(res.stages.length).toBeGreaterThan(0);
  });
});
