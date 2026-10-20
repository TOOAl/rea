import type { ToolDefinition } from "../providers/types.js";

export interface ToolContext {
  cwd: string;
  askPermission?: (toolName: string, input: Record<string, unknown>) => Promise<boolean>;
}

export interface Tool extends ToolDefinition {
  execute(input: Record<string, unknown>, ctx: ToolContext): Promise<string>;
  isConcurrencySafe?: boolean;
}

export function toolToDefinition(tool: Tool): ToolDefinition {
  return {
    name: tool.name,
    description: tool.description,
    inputSchema: tool.inputSchema,
  };
}
