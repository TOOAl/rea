import type { AgentDefinition } from "./agents/types.js";

/**
 * 간단한 --agent 스펙 파서: "id=transport:target"
 * 예:
 *   my-gpt=openai:https://api.openai.com/v1
 *   codex=mcp:npx @openai/codex mcp
 *   local=http:http://localhost:8080/v1
 *   bridge=module:./my-agent.js
 *   runner=command:./agent.sh
 */
export function parseAgentSpec(spec: string): AgentDefinition | null {
  const eq = spec.indexOf("=");
  if (eq === -1) return null;
  const id = spec.slice(0, eq).trim();
  const rest = spec.slice(eq + 1).trim();
  const colon = rest.indexOf(":");
  if (colon === -1) return null;
  const transport = rest.slice(0, colon).trim() as AgentDefinition["transport"];
  const target = rest.slice(colon + 1).trim();

  const base: AgentDefinition = { id, transport };

  switch (transport) {
    case "http":
    case "openai":
      base.baseUrl = target;
      break;
    case "mcp":
      // target이 URL이면 url, 아니면 command
      if (target.startsWith("http://") || target.startsWith("https://")) base.url = target;
      else {
        const parts = target.split(/\s+/);
        base.command = parts[0]!;
        if (parts.length > 1) base.args = parts.slice(1);
      }
      break;
    case "module":
      base.module = target;
      break;
    case "command":
      base.command = target;
      break;
    default:
      return null;
  }
  return base;
}
