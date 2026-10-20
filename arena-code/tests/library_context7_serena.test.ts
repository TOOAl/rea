import { describe, it, expect } from "vitest";
import { HarnessLibrary } from "../src/harness2/library.js";
import { resolveLibraryId, queryDocs } from "../src/harness2/context7.js";
import { buildRegistry } from "../src/tools/index.js";
import { SERENA_TOOLS } from "../src/tools/serena.js";

describe("Library Context7 adapter", () => {
  it("resolveLibraryId known mapping", async () => {
    const r = await resolveLibraryId("react");
    expect(r[0].id).toBe("/facebook/react");
    expect(r[0].source).toBe("fallback"); // sandbox allowlist fallback
    const n = await resolveLibraryId("next.js");
    expect(n[0].id).toBe("/vercel/next.js");
  });

  it("resolveLibraryId fallback generic", async () => {
    const r = await resolveLibraryId("my-lib foo");
    expect(r[0].id).toBe("/my-lib-foo");
    expect(r[0].name).toBe("my-lib foo");
  });

  it("queryDocs returns snippets with fallback marker", async () => {
    const d = await queryDocs("/vercel/next.js", "routing");
    expect(d.libraryId).toBe("/vercel/next.js");
    expect(d.snippets.length).toBeGreaterThan(0);
    expect(d.snippets[0]).toContain("routing");
    expect(d.source).toBe("fallback");
  });

  it("HarnessLibrary delegates to Context7", async () => {
    const lib = new HarnessLibrary({ domain: "test-context7", root: "/tmp/arena-test-lib-" + Date.now() });
    const r = await lib.resolveLibraryId("react");
    expect(r[0].id).toBe("/facebook/react");
    const docs = await lib.queryDocs("/facebook/react", "hooks");
    expect(docs.snippets[0]).toContain("hooks");
    const snap = await lib.buildContext7Snapshot("/facebook/react", "hooks");
    expect(snap).not.toBeNull();
    // cleanup
    const { rmSync } = await import("node:fs");
    try { rmSync(snap!, { recursive: true, force: true }); } catch {}
  });
});

describe("Serena tools", () => {
  it("SERENA_TOOLS 3개가 registry에 등록됨", () => {
    const reg = buildRegistry();
    expect(reg.has("SerenaFindSymbol")).toBe(true);
    expect(reg.has("SerenaFindReferencingSymbols")).toBe(true);
    expect(reg.has("SerenaInsertAfterSymbol")).toBe(true);
    expect(SERENA_TOOLS.length).toBe(3);
  });

  it("SerenaFindSymbol 찾음", async () => {
    const reg = buildRegistry();
    const tool = reg.get("SerenaFindSymbol")!;
    const res = await tool.execute({ symbol: "HarnessLibrary" }, { cwd: process.cwd(), env: {} } as any);
    expect(res).toContain("HarnessLibrary");
  });

  it("SerenaFindReferencingSymbols 참조 탐지", async () => {
    const reg = buildRegistry();
    const tool = reg.get("SerenaFindReferencingSymbols")!;
    const res = await tool.execute({ symbol: "guardHarness" }, { cwd: process.cwd(), env: {} } as any);
    expect(res).toContain("guardHarness");
  });

  it("SerenaInsertAfterSymbol 삽입 후 원복", async () => {
    const { mkdtempSync, writeFileSync, readFileSync, rmSync } = await import("node:fs");
    const { join } = await import("node:path");
    const { tmpdir } = await import("node:os");
    const tmp = mkdtempSync(join(tmpdir(), "serena-test-"));
    const file = join(tmp, "a.ts");
    writeFileSync(file, "class Foo {}\n", "utf-8");
    const reg = buildRegistry();
    const tool = reg.get("SerenaInsertAfterSymbol")!;
    const res = await tool.execute({ file_path: file, symbol: "Foo", content: "// inserted" }, { cwd: tmp, env: {} } as any);
    expect(res).toContain("inserted");
    const after = readFileSync(file, "utf-8");
    expect(after).toContain("// inserted");
    rmSync(tmp, { recursive: true, force: true });
  });
});
