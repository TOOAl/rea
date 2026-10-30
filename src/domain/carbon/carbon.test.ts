import { describe, expect, test } from "vitest";

import { scanCarbonSecure } from "./carbonSecureScanner.js";
import { verifyCarbonExploit } from "./carbonExploitVerifier.js";
import { generateCarbonPatch } from "./carbonSecurePatcher.js";
import { createCarbonPlan, advanceCarbonPlan } from "./carbonLongHorizonPlanner.js";
import { checkCarbonTransparency } from "./carbonTransparencyGate.js";
import { checkCarbonInjection } from "./carbonInjectionShield.js";
import { shouldAskBeforeAct } from "./carbonCollaborationGate.js";
import { measureCarbonTokens } from "./carbonTokenMeter.js";

describe("carbon", () => {
  test("scan finds exec", () => {
    const vulns = scanCarbonSecure({ file: "a.ts", code: "exec(user)" });
    expect(vulns.length).toBeGreaterThan(0);
    expect(vulns[0]?.kind).toBe("cwe-78");
  });
  test("exploit verify dry-run", () => {
    const vulns = scanCarbonSecure({ file: "a.ts", code: "eval(x)" });
    const v = vulns[0];
    if (v) {
      const r = verifyCarbonExploit({ vuln: v, code: "eval(x)" });
      expect(r.sandbox).toBe("isolated");
    }
  });
  test("patch generates high quality for critical", () => {
    const vulns = scanCarbonSecure({ file: "a.ts", code: "exec(a)" });
    const v = vulns[0];
    if (v) {
      const p = generateCarbonPatch({ vuln: v, oldCode: "exec(a)" });
      expect(p.quality).toBe("high");
    }
  });
  test("long horizon plan", () => {
    const plan = createCarbonPlan({ goal: "migrate to Rust", steps: 5 });
    expect(plan.steps.length).toBe(5);
    const next = advanceCarbonPlan(plan, "done");
    expect(next.steps[0]?.status).toBe("done");
  });
  test("transparency", () => {
    const t = checkCarbonTransparency({ known: false, remaining: ["a"] });
    expect(t.known).toBe(false);
  });
  test("injection blocked", () => {
    const v = checkCarbonInjection('require("node:fs")');
    expect(v.blocked).toBe(true);
  });
  test("ask before act", () => {
    expect(shouldAskBeforeAct({ confidence: 0.5, sources: [] })).toBe(true);
  });
  test("token meter", () => {
    const u = measureCarbonTokens({ inputTokens: 1000000, outputTokens: 500000, cachedInputTokens: 500000 });
    expect(u.costUsd).toBeGreaterThan(0);
  });
});
