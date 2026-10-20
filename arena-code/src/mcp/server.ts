/**
 * MCP Server Mode — Phase 2
 * arena-code를 MCP 서버로 실행: --mcp 플래그
 * 프로토콜: MCP JSON-RPC over stdio
 */
import { createInterface } from "node:readline";
import type { ToolRegistry } from "../tools/registry.js";
import type { ToolContext } from "../tools/types.js";

interface McpRequest {
  jsonrpc: string;
  id: number | string;
  method: string;
  params?: Record<string, unknown>;
}

interface McpResponse {
  jsonrpc: string;
  id: number | string | null;
  result?: unknown;
  error?: { code: number; message: string };
}

function send(resp: McpResponse): void {
  process.stdout.write(JSON.stringify(resp) + "\n");
}

export async function runMcpServer(opts: {
  registry: ToolRegistry;
  cwd: string;
}): Promise<void> {
  const { registry, cwd } = opts;
  console.error(`[arena-code MCP] ${registry.size()} tools, cwd=${cwd}`);

  const rl = createInterface({ input: process.stdin, terminal: false });
  rl.on("line", async (line: string) => {
    const trimmed = line.trim();
    if (!trimmed) return;
    let req: McpRequest;
    try { req = JSON.parse(trimmed) as McpRequest; } catch { return; }
    const id = req.id ?? null;

    switch (req.method) {
      case "initialize":
        send({ jsonrpc: "2.0", id, result: { protocolVersion: "2024-11-05", capabilities: { tools: {} }, serverInfo: { name: "arena-code", version: "2.2.0" } } });
        break;
      case "notifications/initialized":
        break;
      case "tools/list": {
        const tools = registry.all().map((t) => ({ name: t.name, description: t.description, inputSchema: t.inputSchema }));
        send({ jsonrpc: "2.0", id, result: { tools } });
        break;
      }
      case "tools/call": {
        const params = req.params as { name: string; arguments?: Record<string, unknown> } | undefined;
        const name = params?.name;
        const args = params?.arguments ?? {};
        if (!name) { send({ jsonrpc: "2.0", id, error: { code: -32602, message: "Missing tool name" } }); break; }
        const tool = registry.get(name);
        if (!tool) { send({ jsonrpc: "2.0", id, error: { code: -32602, message: `Unknown tool: ${name}` } }); break; }
        try {
          const ctx: ToolContext = { cwd };
          const result = await tool.execute(args, ctx);
          send({ jsonrpc: "2.0", id, result: { content: [{ type: "text", text: result }], isError: false } });
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : String(e);
          send({ jsonrpc: "2.0", id, result: { content: [{ type: "text", text: msg }], isError: true } });
        }
        break;
      }
      case "ping":
        send({ jsonrpc: "2.0", id, result: {} });
        break;
      default:
        if (id !== null) send({ jsonrpc: "2.0", id, error: { code: -32601, message: `Method not found: ${req.method}` } });
    }
  });

  // Keep process alive
  await new Promise<void>(() => {});
}
