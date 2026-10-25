/**
 * Provider 추상화 — 모든 LLM이 동일한 인터페이스로 동작
 * Claude Code의 deps.callModel() 역할
 */

export type Role = "system" | "user" | "assistant" | "tool";

export interface ContentBlock {
  type: "text" | "tool_use" | "tool_result" | "thinking";
  text?: string;
  id?: string;
  name?: string;
  input?: Record<string, unknown>;
  tool_use_id?: string;
  content?: string;
}

export interface Message {
  role: Role;
  content: string | ContentBlock[];
}

export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: "object";
    properties: Record<string, { type: string; description: string; enum?: string[] }>;
    required: string[];
  };
}

export interface ChatRequest {
  system: string;
  messages: Message[];
  tools: ToolDefinition[];
  model: string;
  maxTokens?: number;
  temperature?: number;
}

export interface StreamEvent {
  type: "text_delta" | "tool_use_delta" | "tool_use" | "thinking" | "thinking_delta" | "done" | "error";
  text?: string;
  block?: ContentBlock;
  error?: string;
}

export interface Provider {
  name: string;
  model: string;
  streamChat(req: ChatRequest): AsyncGenerator<StreamEvent>;
}
