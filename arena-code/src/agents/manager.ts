/**
 * AgentManager — 외부 에이전트 등록/해제/연결/프록시
 */
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import type { Provider } from "../providers/types.js";
import type { Tool } from "../tools/types.js";
import type { AgentDefinition, AgentConnection } from "./types.js";
import { resolveEnvInObject } from "./resolveEnv.js";

export class AgentManager {
  private agents: Map<string, AgentDefinition> = new Map();
  private connections: Map<string, AgentConnection> = new Map();
  private configPath: string | null = null;

  constructor(private cwd: string) {}

  // ── 등록 ──

  /** arena.config.json에서 agents[] 로드 */
  loadFromConfig(defs: AgentDefinition[]): { loaded: number; errors: string[] } {
    let loaded = 0;
    const errors: string[] = [];
    for (const raw of defs) {
      try {
        const def = resolveEnvInObject(raw);
        this.validate(def);
        this.agents.set(def.id, def);
        loaded++;
      } catch (e: unknown) {
        errors.push(`${(raw as AgentDefinition)?.id ?? "?"}: ${e instanceof Error ? e.message : String(e)}`);
      }
    }
    return { loaded, errors };
  }

  /** 단일 에이전트 등록 (CLI /agent add) */
  add(def: AgentDefinition): void {
    const resolved = resolveEnvInObject(def);
    this.validate(resolved);
    this.agents.set(resolved.id, resolved);
  }

  /** 해제 */
  remove(id: string): boolean {
    return this.agents.delete(id) && (this.connections.delete(id), true);
  }

  get(id: string): AgentDefinition | undefined {
    return this.agents.get(id);
  }

  list(): AgentDefinition[] {
    return [...this.agents.values()];
  }

  enabled(): AgentDefinition[] {
    return this.list().filter(a => a.enabled !== false);
  }

  private validate(def: AgentDefinition): void {
    if (!def.id || typeof def.id !== "string") throw new Error("id required");
    if (!/^[a-zA-Z0-9._-]+$/.test(def.id)) throw new Error(`invalid id: ${def.id}`);
    const valid = ["http", "openai", "mcp", "module", "command"];
    if (!valid.includes(def.transport)) throw new Error(`unknown transport: ${def.transport}`);
    if ((def.transport === "http" || def.transport === "openai") && !def.baseUrl) throw new Error("baseUrl required for http/openai");
    if (def.transport === "module" && !def.module) throw new Error("module path required for module transport");
    if (def.transport === "command" && !def.command) throw new Error("command required for command transport");
    if (def.transport === "mcp" && !def.command && !def.url) throw new Error("mcp requires command or url");
  }

  // ── Provider 생성 (transport별) ──

  async createProvider(id: string): Promise<Provider> {
    const def = this.agents.get(id);
    if (!def) throw new Error(`Unknown agent: ${id}`);

    switch (def.transport) {
      case "http":
      case "openai": {
        const { OpenAICompatibleProvider } = await import("./transports/openaiCompat.js");
        return new OpenAICompatibleProvider({
          name: def.id,
          baseUrl: def.baseUrl!,
          apiKey: def.apiKey,
          model: def.model ?? "default",
          headers: def.headers,
          timeout: def.timeout,
        });
      }
      case "mcp": {
        // MCP는 tool provider — provider로는 래핑 불가, 안내
        throw new Error(`Agent "${id}" is MCP (tools only). Use as tools, not provider. Try: registry integration or AskAgent tool.`);
      }
      case "module": {
        const modPath = def.module!.startsWith(".") ? resolve(this.cwd, def.module!) : def.module!;
        const mod = await import(modPath);
        const exported = def.exportName ? mod[def.exportName] : (mod.default ?? mod);
        // factory function 또는 Provider 인스턴스
        if (typeof exported === "function") {
          const instance = exported(def);
          if (instance?.streamChat) return instance as Provider;
          throw new Error(`Module ${modPath} factory did not return Provider`);
        }
        if (exported?.streamChat) return exported as Provider;
        throw new Error(`Module ${modPath} does not export Provider`);
      }
      case "command": {
        const { CommandProvider } = await import("./transports/command.js");
        return new CommandProvider({
          name: def.id,
          command: def.command!,
          args: def.args,
          cwd: this.cwd,
          timeout: def.timeout,
        });
      }
      default:
        throw new Error(`Unsupported transport for provider: ${def.transport}`);
    }
  }

  // ── Tools 수집 (MCP 등) ──

  async collectTools(): Promise<{ tools: Tool[]; connections: AgentConnection[] }> {
    const tools: Tool[] = [];
    const connections: AgentConnection[] = [];

    for (const def of this.enabled()) {
      if (def.provides === "provider") continue; // provider-only는 tools 스킵
      if (def.transport === "mcp") {
        try {
          const { McpToolCollector } = await import("./transports/mcp.js");
          const collector = new McpToolCollector(def, this.cwd);
          const result = await collector.collect();
          tools.push(...result.tools);
          connections.push({ id: def.id, definition: def, status: "connected", remoteTools: result.tools.map(t => ({ name: t.name, description: t.description })) });
          this.connections.set(def.id, connections[connections.length - 1]!);
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : String(e);
          connections.push({ id: def.id, definition: def, status: "error", error: msg });
        }
      }
      if (def.transport === "module" && (def.provides === "tools" || def.provides === "both")) {
        try {
          const modPath = def.module!.startsWith(".") ? resolve(this.cwd, def.module!) : def.module!;
          const mod = await import(modPath);
          const exported = def.exportName ? mod[def.exportName] : mod;
          const list: Tool[] = exported.tools ?? exported.TOOLS ?? (Array.isArray(exported) ? exported : []);
          for (const t of list) {
            if (t?.name && typeof t.execute === "function") tools.push(t);
          }
          connections.push({ id: def.id, definition: def, status: "connected", remoteTools: tools.slice(-list.length).map(t => ({ name: t.name, description: t.description })) });
        } catch (e: unknown) {
          connections.push({ id: def.id, definition: def, status: "error", error: e instanceof Error ? e.message : String(e) });
        }
      }
    }
    return { tools, connections };
  }

  /** AskAgent 도구용 — 다른 에이전트에게 위임 */
  async delegate(agentId: string, prompt: string, opts?: { system?: string }): Promise<string> {
    const provider = await this.createProvider(agentId);
    // dynamic import not needed — just for side effect check, removed
    let full = "";
    const stream = provider.streamChat({
      system: opts?.system ?? "",
      messages: [{ role: "user", content: prompt }],
      tools: [],
      model: provider.model,
    });
    for await (const ev of stream) {
      if (ev.type === "text_delta" && ev.text) full += ev.text;
      if (ev.type === "error" && ev.error) throw new Error(ev.error);
    }
    return full || "(empty response)";
  }

  // ── 영속화 (arena.config.json에 저장) ──

  bindConfigPath(path: string): void { this.configPath = path; }

  save(): void {
    if (!this.configPath) return;
    try {
      const raw = existsSync(this.configPath) ? JSON.parse(readFileSync(this.configPath, "utf-8")) : {};
      raw.agents = this.list();
      mkdirSync(dirname(this.configPath), { recursive: true });
      writeFileSync(this.configPath, JSON.stringify(raw, null, 2), "utf-8");
    } catch {}
  }

  snapshot(): { agents: AgentDefinition[]; connections: AgentConnection[] } {
    return { agents: this.list(), connections: [...this.connections.values()] };
  }
}
