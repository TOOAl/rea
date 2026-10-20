import { describe, it, expect } from "vitest";
import { HookManager } from "../src/hooks/index.js";

describe("HookManager", () => {
  it("blocks via preToolUse", async () => {
    const hm = new HookManager();
    hm.on("preToolUse", () => ({ block: true, reason: "nope" }));
    const r = await hm.runPreToolUse({ cwd: "/tmp", event: "preToolUse", toolName: "Bash", input: {} });
    expect(r?.block).toBe(true);
  });
  it("modifies input", async () => {
    const hm = new HookManager();
    hm.on("preToolUse", () => ({ modifiedInput: { extra: "1" } }));
    const r = await hm.runPreToolUse({ cwd: "/tmp", event: "preToolUse", toolName: "Read", input: { file_path: "a" } });
    expect(r?.modifiedInput).toHaveProperty("extra", "1");
  });
  it("postToolUse modifies result", async () => {
    const hm = new HookManager();
    hm.on("postToolUse", () => ({ modifiedResult: "redacted" }));
    const r = await hm.runPostToolUse({ cwd: "/tmp", event: "postToolUse", toolName: "Read", result: "secret" });
    expect(r?.modifiedResult).toBe("redacted");
  });
  it("emit calls all handlers", async () => {
    const hm = new HookManager();
    let count = 0;
    hm.on("sessionStart", () => { count++; });
    hm.on("sessionStart", () => { count++; });
    await hm.emit("sessionStart", { cwd: "/tmp" });
    expect(count).toBe(2);
  });
});
