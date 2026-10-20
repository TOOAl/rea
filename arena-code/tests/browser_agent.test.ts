import { describe, it, expect } from "vitest";
import { buildRegistry } from "../src/tools/index.js";
import { BrowserBatchTool } from "../src/tools/browser.js";

describe("browser agent-browser batch", () => {
  it("registry has 7 browser tools including batch", () => {
    const reg = buildRegistry();
    expect(reg.has("browser_navigate")).toBe(true);
    expect(reg.has("browser_snapshot")).toBe(true);
    expect(reg.has("browser_batch")).toBe(true);
    const browserTools = reg.entries_().filter(e => e.tool.name.startsWith("browser_"));
    expect(browserTools.length).toBe(7);
  });

  it("browser_batch validates steps JSON", async () => {
    const res = await BrowserBatchTool.execute({ steps: "not-json" } as unknown as Record<string, unknown>, { cwd: process.cwd(), env: {} } as any);
    expect(res).toContain("invalid steps JSON");
  });

  it("browser_batch requires navigate first", async () => {
    // Ensure no browserState — call close to reset
    const reg = buildRegistry();
    const close = reg.get("browser_close")!;
    await close.execute({}, { cwd: process.cwd(), env: {} } as any);
    const res = await BrowserBatchTool.execute({ steps: JSON.stringify([{ kind: "click", selector: "#a" }]) } as unknown as Record<string, unknown>, { cwd: process.cwd(), env: {} } as any);
    expect(res).toContain("no page");
  });

  it("browser_batch fallback works after navigate", async () => {
    const reg = buildRegistry();
    const nav = reg.get("browser_navigate")!;
    // Use data URL to avoid network allowlist (example.com blocked)
    await nav.execute({ url: "data:text/html,<html><title>Test</title><body><button id=\"btn\">Click</button></body></html>" } as unknown as Record<string, unknown>, { cwd: process.cwd(), env: {} } as any);
    const res = await BrowserBatchTool.execute({ steps: JSON.stringify([{ kind: "click", selector: "#btn" }, { kind: "fill", selector: "input", text: "hi" }]) } as unknown as Record<string, unknown>, { cwd: process.cwd(), env: {} } as any);
    expect(res).toContain("batch");
    expect(res).toContain("2 steps");
    // cleanup
    const close = reg.get("browser_close")!;
    await close.execute({}, { cwd: process.cwd(), env: {} } as any);
  });
});
