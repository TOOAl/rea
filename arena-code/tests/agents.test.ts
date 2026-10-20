import { describe, it, expect } from "vitest";
import { AgentManager } from "../src/agents/manager.js";
import { parseAgentSpec } from "../src/cli.parseAgent.js";
import { resolveEnvVars, resolveEnvInObject } from "../src/agents/resolveEnv.js";

describe("parseAgentSpec", () => {
  it("openai/http", () => {
    expect(parseAgentSpec("my-gpt=openai:https://api.example.com/v1")).toEqual(expect.objectContaining({ id: "my-gpt", transport: "openai", baseUrl: "https://api.example.com/v1" }));
  });
  it("mcp command", () => {
    expect(parseAgentSpec("codex=mcp:npx @openai/codex mcp")).toEqual(expect.objectContaining({ id: "codex", transport: "mcp", command: "npx" }));
  });
  it("mcp url", () => {
    expect(parseAgentSpec("srv=mcp:https://example.com/mcp")).toEqual(expect.objectContaining({ url: "https://example.com/mcp" }));
  });
  it("module", () => {
    expect(parseAgentSpec("m=module:./my-agent.js")).toEqual(expect.objectContaining({ transport: "module", module: "./my-agent.js" }));
  });
  it("command", () => {
    expect(parseAgentSpec("run=command:./agent.sh")).toEqual(expect.objectContaining({ transport: "command", command: "./agent.sh" }));
  });
  it("invalid returns null", () => {
    expect(parseAgentSpec("bad-format")).toBeNull();
  });
});

describe("resolveEnvVars", () => {
  it("replaces ENV", () => {
    process.env.TEST_AGENT_KEY = "secret123";
    expect(resolveEnvVars("${ENV:TEST_AGENT_KEY}")).toBe("secret123");
    expect(resolveEnvVars("prefix-${ENV:TEST_AGENT_KEY}-suffix")).toBe("prefix-secret123-suffix");
    delete process.env.TEST_AGENT_KEY;
  });
  it("fallback", () => {
    expect(resolveEnvVars("${ENV:MISSING_XYZ:-default-val}")).toBe("default-val");
  });
  it("nested object", () => {
    process.env.TMP_KEY = "hello";
    expect(resolveEnvInObject({ a: "${ENV:TMP_KEY}", b: { c: "${ENV:TMP_KEY}" } })).toEqual({ a: "hello", b: { c: "hello" } });
    delete process.env.TMP_KEY;
  });
});

describe("AgentManager", () => {
  it("add/list/remove", () => {
    const m = new AgentManager("/tmp");
    m.add({ id: "a1", transport: "openai", baseUrl: "https://example.com/v1" });
    expect(m.list()).toHaveLength(1);
    expect(m.get("a1")?.id).toBe("a1");
    expect(m.remove("a1")).toBe(true);
    expect(m.list()).toHaveLength(0);
  });
  it("validates required fields", () => {
    const m = new AgentManager("/tmp");
    expect(() => m.add({ id: "", transport: "openai" } as unknown as import("../src/agents/types.js").AgentDefinition)).toThrow();
    expect(() => m.add({ id: "x", transport: "http" } as unknown as import("../src/agents/types.js").AgentDefinition)).toThrow();
  });
  it("loadFromConfig", () => {
    const m = new AgentManager("/tmp");
    const r = m.loadFromConfig([
      { id: "g1", transport: "openai", baseUrl: "https://a.com/v1" },
      { id: "bad", transport: "openai" } as unknown as import("../src/agents/types.js").AgentDefinition,
    ]);
    expect(r.loaded).toBe(1);
    expect(r.errors.length).toBe(1);
  });
  it("collectTools skips provider-only", async () => {
    const m = new AgentManager("/tmp");
    m.add({ id: "p1", transport: "openai", baseUrl: "https://a.com/v1", provides: "provider" });
    const { tools } = await m.collectTools();
    expect(tools).toEqual([]);
  });
});
