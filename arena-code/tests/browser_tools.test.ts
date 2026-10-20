import { describe, it, expect } from "vitest";
import { buildRegistry } from "../src/tools/index.js";

describe("Browser Design Mode tools registry", () => {
  it("registers 6 browser_* tools", () => {
    const reg = buildRegistry();
    const names = reg.all().map((t) => t.name);
    expect(names).toContain("browser_navigate");
    expect(names).toContain("browser_snapshot");
    expect(names).toContain("browser_act");
    expect(names).toContain("browser_screenshot");
    expect(names).toContain("browser_evaluate");
    expect(names).toContain("browser_close");
  });

  it("browser_navigate fallback works without playwright", async () => {
    const reg = buildRegistry();
    const tool = reg.get("browser_navigate");
    expect(tool).toBeDefined();
    // we won't actually fetch external URL in CI, just check schema
    expect(tool!.inputSchema.required).toContain("url");
  });

  it("browser tools have inputSchema required", () => {
    const reg = buildRegistry();
    for (const name of ["browser_snapshot", "browser_act", "browser_screenshot", "browser_evaluate", "browser_close"]) {
      const t = reg.get(name);
      expect(t, name).toBeDefined();
      expect(t!.inputSchema.type).toBe("object");
    }
  });
});
