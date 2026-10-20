import { describe, it, expect } from "vitest";
import { guardHarness, guardTwoAxis } from "../src/harness2/guard.js";
import { SkillManager } from "../src/skills/index.js";
import * as path from "node:path";

const ROOT = path.resolve(".");

describe("guard two-axis (Matt Pocock)", () => {
  it("Standards PASS when tree is clean and has CODING_STANDARDS.md", () => {
    const tree = {
      "AGENTS.md": "base content",
      "CODING_STANDARDS.md": "- no any\n- prefer small functions\n",
      "src/foo.ts": "export function add(a: number, b: number){ return a+b; }",
    };
    const r = guardTwoAxis(tree, { baseRef: "main", spec: "add numbers" });
    expect(r.standards.ok).toBe(true);
    expect(r.meta.hasCodingStandards).toBe(true);
    expect(r.verdict).not.toBe("FAIL");
  });

  it("Standards WARN when CODING_STANDARDS.md missing", () => {
    const tree = { "AGENTS.md": "base", "src/a.ts": "const x=1" };
    const r = guardTwoAxis(tree);
    expect(r.standards.warnings.some(w => w.includes("CODING_STANDARDS.md"))).toBe(true);
    expect(r.meta.hasCodingStandards).toBe(false);
  });

  it("Standards detects Fowler any and TODO", () => {
    const tree = { "AGENTS.md": "TODO fix", "src/bad.ts": "function foo(x: any){ return x; }" };
    const r = guardTwoAxis(tree);
    expect(r.standards.issues.some(i => i.includes("TODO"))).toBe(true);
    expect(r.standards.warnings.some(w => w.includes("any"))).toBe(true);
  });

  it("Spec FAIL when spec keywords not in tree", () => {
    const tree = { "AGENTS.md": "base", "src/a.ts": "nothing related" };
    const spec = "이 PR은 로그인에 PKCE와 code_challenge를 구현해야 함 — OIDC 인증 플로우";
    const r = guardTwoAxis(tree, { spec });
    expect(r.spec.ok).toBe(false);
    expect(r.spec.issues[0]).toContain("Spec: FAIL");
    expect(r.verdict).toBe("FAIL");
  });

  it("Spec WARN when spec partially matches", () => {
    const tree = { "AGENTS.md": "implements login PKCE flow with OIDC", "src/auth.ts": "PKCE code_challenge" };
    const spec = "로그인에 PKCE와 code_challenge를 구현, 추가로 MFA는 아직 없음";
    const r = guardTwoAxis(tree, { spec });
    // overlap should be moderate -> WARN or PASS, not FAIL
    expect(r.spec.ok || r.spec.warnings.length > 0).toBe(true);
  });

  it("Spec ok when spec empty", () => {
    const tree = { "AGENTS.md": "base" };
    const r = guardTwoAxis(tree);
    expect(r.spec.ok).toBe(true);
    expect(r.spec.warnings[0]).toContain("spec 없음");
    expect(r.meta.specProvided).toBe(false);
  });

  it("combined verdict logic", () => {
    const clean = { "AGENTS.md": "base", "CODING_STANDARDS.md": "- rule\n", "src/a.ts": "ok" };
    const ok = guardTwoAxis(clean, { spec: "base ok" });
    expect(["PASS","WARN"]).toContain(ok.verdict);
    const bad = { "AGENTS.md": "TODO", "src/a.ts": "any" };
    const fail = guardTwoAxis(bad, { spec: "completely unrelated spec keywords not present xyz123" });
    expect(fail.verdict).toBe("FAIL");
    expect(fail.combined.ok).toBe(false);
  });

  it("guardHarness backward compat still works", () => {
    const tree = { "AGENTS.md": "TODO inside" };
    const r = guardHarness(tree);
    expect(r.ok).toBe(false);
    expect(r.issues.length).toBeGreaterThan(0);
  });
});

describe("code-review skill", () => {
  it("SkillManager loads code-review with correct description and triggers", () => {
    const m = new SkillManager(ROOT);
    const s = m.get("code-review");
    expect(s).toBeDefined();
    expect(s!.description).toContain("2축");
    expect(s!.triggers).toEqual(expect.arrayContaining(["리뷰", "code review"]));
    expect(m.parseCommand("리뷰해줘 PR diff")?.skill).toBe("code-review");
    expect(m.parseCommand("code review 부탁")?.skill).toBe("code-review");
    expect(m.parseCommand("/code-review main")?.skill).toBe("code-review");
    expect(s!.content).toContain("Standards:");
    expect(s!.content).toContain("Spec:");
    expect(s!.content).toContain("Verdict:");
  });

  it("allDescriptions shows code-review with correct description (not ---)", () => {
    const m = new SkillManager(ROOT);
    const all = m.allDescriptions();
    expect(all).toContain("/code-review: Matt Pocock 2축");
    expect(all).not.toContain("/code-review: ---");
  });
});
