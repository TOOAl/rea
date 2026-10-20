/**
 * MCP Tool Collector — mcp transport
 * stdio: 스폰 후 JSON-RPC로 tools/list → 동적 Tool 생성
 * sse/http: 원격 MCP fetch
 */
import { spawn } from "node:child_process";
import type { AgentDefinition } from "../types.js";
import type { Tool, ToolContext } from "../../tools/types.js";

export class McpToolCollector {
  constructor(private def: AgentDefinition, private cwd: string) {}

  async collect(): Promise<{ tools: Tool[] }> {
    if (this.def.command) return this.collectStdio();
    if (this.def.url) return this.collectHttp();
    throw new Error("MCP agent needs command or url");
  }

  private async collectStdio(): Promise<{ tools: Tool[] }> {
    const { command, args = [], env } = this.def;
    const timeout = this.def.timeout ?? 10_000;

    return new Promise((resolve, reject) => {
      const child = spawn(command!, args, {
        cwd: this.cwd,
        env: { ...process.env, ...env },
        stdio: ["pipe", "pipe", "pipe"],
      });

      let stdout = "";
      let stderr = "";
      let settled = false;
      const timer = setTimeout(() => {
        if (!settled) { settled = true; child.kill(); reject(new Error(`MCP stdio timeout (${timeout}ms): ${stderr.slice(0, 500)}`)); }
      }, timeout);

      child.stdout.on("data", (d: Buffer) => { stdout += d.toString(); });
      child.stderr.on("data", (d: Buffer) => { stderr += d.toString(); });

      child.on("error", (e) => {
        if (!settled) { settled = true; clearTimeout(timer); reject(e); }
      });

      // MCP initialize → tools/list 시퀀스
      const init = JSON.stringify({ jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2024-11-05", capabilities: {}, clientInfo: { name: "arena-code", version: "2.2.0" } } }) + "\n";
      const listReq = JSON.stringify({ jsonrpc: "2.0", id: 2, method: "tools/list", params: {} }) + "\n";

      child.stdin.write(init);
      child.stdin.write(listReq);

      // 응답 파싱 — 줄 단위 JSON
      const tryParse = () => {
        const lines = stdout.split("\n").filter(Boolean);
        for (const line of lines) {
          try {
            const msg = JSON.parse(line) as { id: number; result?: { tools?: { name: string; description: string; inputSchema: unknown }[] } };
            if (msg.id === 2 && msg.result?.tools) {
              if (!settled) {
                settled = true;
                clearTimeout(timer);
                child.kill();
                const tools: Tool[] = msg.result.tools.map((t) => this.wrapMcpTool(t));
                resolve({ tools });
              }
              return;
            }
          } catch {}
        }
      };

      // 주기적으로 파싱 시도
      const interval = setInterval(tryParse, 100);
      child.on("close", () => {
        clearInterval(interval);
        if (!settled) {
          settled = true;
          clearTimeout(timer);
          tryParse();
          // 여전히 없으면 stderr로 에러
          const lastTry = stdout.split("\n").find(l => { try { const j = JSON.parse(l); return j.id === 2; } catch { return false; } });
          if (lastTry) {
            try {
              const msg = JSON.parse(lastTry) as { result?: { tools?: unknown[] } };
              const tools: Tool[] = (msg.result?.tools ?? []).map((t: unknown) => this.wrapMcpTool(t as { name: string; description: string; inputSchema: unknown }));
              resolve({ tools }); return;
            } catch {}
          }
          reject(new Error(`MCP stdio no tools/list response. stderr: ${stderr.slice(0, 500)} stdout: ${stdout.slice(0, 500)}`));
        }
      });
    });
  }

  private async collectHttp(): Promise<{ tools: Tool[] }> {
    const url = this.def.url!;
    const headers: Record<string, string> = { "Content-Type": "application/json", ...this.def.headers };
    if (this.def.apiKey) headers["Authorization"] = `Bearer ${this.def.apiKey}`;

    // MCP SSE는 복잡 — http JSON-RPC로 시도
    const body = JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list", params: {} });
    const ac = new AbortController();
    const tid = setTimeout(() => ac.abort(), this.def.timeout ?? 10_000);
    try {
      const res = await fetch(url, { method: "POST", headers, body, signal: ac.signal });
      if (!res.ok) throw new Error(`MCP http ${res.status}: ${await res.text().catch(() => "")}`);
      const data = await res.json() as { result?: { tools?: { name: string; description: string; inputSchema: unknown }[] } };
      const tools: Tool[] = (data.result?.tools ?? []).map((t) => this.wrapMcpTool(t));
      return { tools };
    } finally { clearTimeout(tid); }
  }

  private wrapMcpTool(t: { name: string; description: string; inputSchema: unknown }): Tool {
    const agentId = this.def.id;
    const toolName = t.name;
    return {
      name: `${agentId}__${toolName}`,
      description: `[${agentId}] ${t.description}`,
      inputSchema: (t.inputSchema ?? { type: "object", properties: {}, required: [] }) as Tool["inputSchema"],
      async execute(input: Record<string, unknown>, _ctx: ToolContext): Promise<string> {
        // 재호출: 매번 MCP 서버에 tools/call
        return mcpCall(agentId, toolName, input, _ctx.cwd);
      },
    };
  }
}

// 캐시: agentId → definition (전역, wrap에서 재사용)
const mcpDefs = new Map<string, AgentDefinition>();
export function registerMcpDef(def: AgentDefinition): void { mcpDefs.set(def.id, def); }

async function mcpCall(agentId: string, toolName: string, input: Record<string, unknown>, cwd: string): Promise<string> {
  // stdio 재스폰으로 매 호출 처리 (간단, 세션 유지 없는 버전)
  // sse/http는 fetch로
  const def = mcpDefs.get(agentId);
  if (!def) return `MCP agent not found: ${agentId}`;

  if (def.url) {
    const headers: Record<string, string> = { "Content-Type": "application/json", ...def.headers };
    if (def.apiKey) headers["Authorization"] = `Bearer ${def.apiKey}`;
    const body = JSON.stringify({ jsonrpc: "2.0", id: 2, method: "tools/call", params: { name: toolName, arguments: input } });
    const res = await fetch(def.url, { method: "POST", headers, body });
    const data = await res.json() as { result?: { content?: { text?: string }[] }; error?: { message: string } };
    if (data.error) throw new Error(data.error.message);
    return data.result?.content?.[0]?.text ?? JSON.stringify(data.result);
  }

  // stdio
  return new Promise((resolve, reject) => {
    const child = spawn(def.command!, def.args ?? [], { cwd, env: { ...process.env, ...def.env }, stdio: ["pipe", "pipe", "pipe"] });
    let stdout = "";
    child.stdout.on("data", (d: Buffer) => { stdout += d.toString(); });
    const timer = setTimeout(() => { child.kill(); reject(new Error("MCP tools/call timeout")); }, def.timeout ?? 15_000);
    child.stdin.write(JSON.stringify({ jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2024-11-05", capabilities: {}, clientInfo: { name: "arena-code", version: "2.2.0" } } }) + "\n");
    child.stdin.write(JSON.stringify({ jsonrpc: "2.0", id: 2, method: "tools/call", params: { name: toolName, arguments: input } }) + "\n");
    child.on("close", () => {
      clearTimeout(timer);
      for (const line of stdout.split("\n")) {
        try {
          const msg = JSON.parse(line) as { id: number; result?: { content?: { text?: string }[] }; error?: { message: string } };
          if (msg.id === 2) {
            if (msg.error) { reject(new Error(msg.error.message)); return; }
            resolve(msg.result?.content?.[0]?.text ?? JSON.stringify(msg.result)); return;
          }
        } catch {}
      }
      reject(new Error(`MCP no response for ${toolName}`));
    });
    child.on("error", reject);
  });
}
