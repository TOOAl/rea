export interface ChatMessage {
  role: "system" | "user" | "assistant";
  text: string;
}

export interface ChatResult {
  text: string;
}

// Provider adapter: swap Ollama, llama.cpp server, or any OpenAI-compatible
// endpoint without touching the orchestrator (REA adapter convention).
export interface LlmProvider {
  readonly kind: string;
  chat(model: string, messages: ChatMessage[], opts?: { json?: boolean }): Promise<ChatResult>;
}
