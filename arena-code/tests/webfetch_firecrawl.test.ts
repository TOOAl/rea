import { describe, it, expect } from "vitest";
import { WebFetchTool } from "../src/tools/webfetch.js";

describe("WebFetch Firecrawl", () => {
  it("fetch fallback works without API key", async () => {
    // Use a data URL or example.com — but avoid external network, test that tool returns string
    const res = await WebFetchTool.execute({ url: "https://example.com", useFirecrawl: false } as unknown as Record<string, unknown>, { cwd: process.cwd(), env: {} } as any);
    expect(typeof res).toBe("string");
    // Should contain Fetched or Fetch failed or Error — but not throw
    expect(res.length).toBeGreaterThan(0);
  });

  it("Firecrawl path falls back gracefully when no key", async () => {
    delete process.env.FIRECRAWL_API_KEY;
    const res = await WebFetchTool.execute({ url: "https://example.com", useFirecrawl: true } as unknown as Record<string, unknown>, { cwd: process.cwd(), env: {} } as any);
    expect(typeof res).toBe("string");
  });

  it("inputSchema has useFirecrawl", () => {
    expect(WebFetchTool.inputSchema.properties).toHaveProperty("useFirecrawl");
    expect(WebFetchTool.description).toContain("Firecrawl");
  });
});
