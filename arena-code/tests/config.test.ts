import { describe, it, expect } from "vitest";
import { resolveConfig } from "../src/config/resolve.js";

describe("resolveConfig", () => {
  it("defaults when no file or env", () => {
    const cfg = resolveConfig("/tmp", {});
    expect(cfg.provider).toBeDefined();
    expect(cfg.maxTurns).toBeGreaterThanOrEqual(20);
    expect(cfg.sandbox).toBe("workspace-write");
  });
  it("cli overrides file", () => {
    const cfg = resolveConfig("/tmp", { provider: "gemini", maxTurns: "99" });
    expect(cfg.provider).toBe("gemini");
    expect(cfg.maxTurns).toBe(99);
  });
  it("yolo sets danger-full-access", () => {
    const cfg = resolveConfig("/tmp", { yolo: true });
    expect(cfg.sandbox).toBe("danger-full-access");
    expect(cfg.dangerouslySkipPermissions).toBe(true);
  });
  it("updates defaults present", () => {
    const cfg = resolveConfig("/tmp", {});
    expect(cfg.updates.enabled).toBe(true);
    expect(cfg.updates.repos.length).toBeGreaterThan(0);
  });
});
