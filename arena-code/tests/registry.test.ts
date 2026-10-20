import { describe, it, expect } from "vitest";
import { ToolRegistry } from "../src/tools/registry.js";

function mockTool(name: string) {
  return {
    name,
    description: `Mock ${name}`,
    inputSchema: { type: "object" as const, properties: {}, required: [] as string[] },
    async execute() { return `ok ${name}`; },
  };
}

describe("ToolRegistry", () => {
  it("registers and retrieves", () => {
    const r = new ToolRegistry();
    r.register(mockTool("Foo"));
    expect(r.has("Foo")).toBe(true);
    expect(r.get("Foo")?.name).toBe("Foo");
  });
  it("rejects duplicate name", () => {
    const r = new ToolRegistry();
    r.register(mockTool("Dup"));
    expect(() => r.register(mockTool("Dup"))).toThrow();
  });
  it("disables tools", () => {
    const r = new ToolRegistry();
    r.register(mockTool("A")).register(mockTool("B")).disable("A");
    expect(r.all().map(t => t.name)).toEqual(["B"]);
  });
  it("byCategory", () => {
    const r = new ToolRegistry();
    r.register(mockTool("C1"), { category: "core" });
    r.register(mockTool("G1"), { category: "ghidra" });
    expect(r.byCategory("core").length).toBe(1);
    expect(r.byCategory("ghidra").length).toBe(1);
  });
});
