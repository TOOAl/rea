import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { MemoryBank } from "../src/memory/bank.js";
import { join } from "node:path";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";

let tmp: string;
let bank: MemoryBank;

beforeEach(() => {
  tmp = mkdtempSync(join(tmpdir(), "mem-test-"));
  bank = new MemoryBank({ root: tmp, domain: "test-domain" });
});

afterEach(() => {
  try { rmSync(tmp, { recursive: true, force: true }); } catch {}
});

describe("MemoryBank", () => {
  it("add and list", () => {
    expect(bank.list().length).toBe(0);
    bank.add({ id: "dec1", cue: "auth login", content: "use PKCE", evidence: "trajectory" });
    bank.add({ id: "dec2", cue: "payment", content: "use stripe", evidence: "test" });
    expect(bank.list().length).toBe(2);
  });

  it("get and delete", () => {
    bank.add({ id: "a/b", cue: "alpha", content: "first" });
    const e = bank.get("a/b");
    expect(e?.cue).toBe("alpha");
    bank.delete("a/b");
    expect(bank.get("a/b")).toBeNull();
  });

  it("search returns relevant", () => {
    bank.add({ id: "1", cue: "auth login OIDC", content: "PKCE required" });
    bank.add({ id: "2", cue: "payment stripe", content: "webhook handling" });
    bank.add({ id: "3", cue: "auth logout", content: "clear session" });
    const hits = bank.search("OIDC PKCE login", 2);
    expect(hits.length).toBeGreaterThan(0);
    expect(hits[0].cue).toContain("auth");
  });

  it("search cue bonus", () => {
    bank.add({ id: "x", cue: "special cue word", content: "unrelated" });
    bank.add({ id: "y", cue: "other", content: "special cue word inside content" });
    const hits = bank.search("special cue word");
    expect(hits[0].id).toBe("x");
  });

  it("reject empty cue/content", () => {
    expect(bank.add({ id: "bad", cue: "", content: "x" })).toBeNull();
    expect(bank.add({ id: "bad2", cue: "ok", content: "" })).toBeNull();
  });
});
