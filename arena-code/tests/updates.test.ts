import { describe, it, expect } from "vitest";
import { formatUpdateSummary } from "../src/updates/checker.js";
import { shouldCheck } from "../src/updates/store.js";

describe("updates/checker", () => {
  it("shouldCheck respects interval", () => {
    const store = { versions: {}, checks: [], history: [], lastCheckedAt: new Date().toISOString() };
    expect(shouldCheck(store, 24)).toBe(false);
    const old = { ...store, lastCheckedAt: new Date(Date.now() - 25 * 3600 * 1000).toISOString() };
    expect(shouldCheck(old, 24)).toBe(true);
  });
  it("formatUpdateSummary no updates", () => {
    const s = formatUpdateSummary([{ name: "rea", repo: "TOOAl/rea", localVersion: "1.0.0", remoteTag: "1.0.0", remoteDate: "", updateAvailable: false, releaseUrl: "", checkedAt: "" }]);
    expect(s).toContain("최신");
  });
  it("formatUpdateSummary with update", () => {
    const s = formatUpdateSummary([{ name: "rea", repo: "TOOAl/rea", localVersion: "1.0.0", remoteTag: "2.0.0", remoteDate: "", updateAvailable: true, releaseUrl: "https://example.com", checkedAt: "" }]);
    expect(s).toContain("2.0.0");
  });
});
