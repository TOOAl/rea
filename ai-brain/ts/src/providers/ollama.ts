import type { LlmProvider, ChatMessage, ChatResult } from "./provider.ts";

export class OllamaProvider implements LlmProvider {
  readonly kind = "ollama";
  private host: string;

  constructor(host: string) {
    this.host = host;
  }

  async chat(model: string, messages: ChatMessage[], opts?: { json?: boolean }): Promise<ChatResult> {
    const res = await fetch(`${this.host}/api/chat`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        model,
        messages: messages.map((m) => ({ role: m.role, content: m.text })),
        stream: false,
        ...(opts?.json ? { format: "json" } : {}),
      }),
    });
    if (!res.ok) {
      throw new Error(`ollama chat failed: ${res.status} ${await res.text()}`);
    }
    const data = (await res.json()) as { message?: { content?: string } };
    return { text: data.message?.content ?? "" };
  }
}
