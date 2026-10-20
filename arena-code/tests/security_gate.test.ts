import { describe, it, expect } from "vitest";
import { securityGate } from "../src/harness2/guard.js";

describe("securityGate stage별", () => {
  it("write 단계: secret 탐지", () => {
    const tree = { "src/a.ts": `const password = "s3cret123"` };
    const r = securityGate(tree, "write");
    expect(r.warnings.some(w => w.includes("password"))).toBe(true);
    expect(r.ok).toBe(true); // write는 warning만
  });

  it("write 단계: 정상 코드는 경고 없음", () => {
    const tree = { "src/a.ts": "const x = 1;" };
    const r = securityGate(tree, "write");
    expect(r.warnings.length).toBe(0);
  });

  it("commit 단계: TODO 탐지", () => {
    const tree = { "src/a.ts": "TODO fix me" };
    const r = securityGate(tree, "commit");
    expect(r.warnings.some(w => w.includes("TODO"))).toBe(true);
  });

  it("pr 단계: spec 불일치 시 issue", () => {
    const tree = { "src/a.ts": "nothing" };
    const spec = "반드시 PKCE code_challenge 구현 필요";
    const r = securityGate(tree, "pr", { spec });
    expect(r.issues.some(i => i.includes("Spec:"))).toBe(true);
    expect(r.ok).toBe(false);
  });

  it("pr 단계: 정상 spec 일치 시 ok", () => {
    const tree = { "src/auth.ts": "PKCE code_challenge 구현됨" };
    const spec = "PKCE code_challenge 구현";
    const r = securityGate(tree, "pr", { spec });
    expect(r.ok).toBe(true);
  });

  it("AWS key 탐지", () => {
    const tree = { "src/a.ts": "AKIAIOSFODNN7EXAMPLE" };
    const r = securityGate(tree, "write");
    expect(r.warnings.some(w => w.includes("AWS"))).toBe(true);
  });
});
