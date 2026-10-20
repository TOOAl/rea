export interface ToolInputSchema {
  type: "object";
  properties: Record<string, { type: string; description: string; enum?: string[] }>;
  required: string[];
}
export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: ToolInputSchema;
}
export interface ToolContext {
  cwd: string;
  askPermission?: (toolName: string, input: Record<string, unknown>) => Promise<boolean>;
}
export interface Tool extends ToolDefinition {
  execute(input: Record<string, unknown>, ctx: ToolContext): Promise<string>;
  isConcurrencySafe?: boolean;
}
