import { describe, it, expect } from "vitest";
import { buildRegistry } from "../src/tools/index.js";
import { ATLASSIAN_TOOLS } from "../src/tools/atlassian.js";

describe("Atlassian tools", () => {
  it("ATLASSIAN_TOOLS 3개 등록됨", () => {
    expect(ATLASSIAN_TOOLS.length).toBe(3);
    const reg = buildRegistry();
    expect(reg.has("JiraSearch")).toBe(true);
    expect(reg.has("JiraCreateIssue")).toBe(true);
    expect(reg.has("ConfluenceSearch")).toBe(true);
  });

  it("JiraSearch fallback without env", async () => {
    delete process.env.ATLASSIAN_SITE;
    const reg = buildRegistry();
    const tool = reg.get("JiraSearch")!;
    const res = await tool.execute({ jql: "project=TEST" } as unknown as Record<string, unknown>, { cwd: process.cwd(), env: {} } as any);
    expect(res).toContain("fallback");
    expect(res).toContain("project=TEST");
  });

  it("ConfluenceSearch fallback", async () => {
    const reg = buildRegistry();
    const tool = reg.get("ConfluenceSearch")!;
    const res = await tool.execute({ cql: "space=DEV" } as unknown as Record<string, unknown>, { cwd: process.cwd(), env: {} } as any);
    expect(res).toContain("fallback");
  });

  it("JiraCreateIssue fallback", async () => {
    const reg = buildRegistry();
    const tool = reg.get("JiraCreateIssue")!;
    const res = await tool.execute({ project: "PROJ", summary: "Test issue" } as unknown as Record<string, unknown>, { cwd: process.cwd(), env: {} } as any);
    expect(res).toContain("fallback");
    expect(res).toContain("PROJ");
  });
});
