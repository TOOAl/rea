/**
 * Anthropic Provider — Claude 정식 API
 * https://docs.anthropic.com/en/api/messages
 */
import type { Provider, ChatRequest, StreamEvent, Message, ToolDefinition } from "./types.js";

function toAnthropicTools(tools: ToolDefinition[]) {
  return tools.map((t) => ({
    name: t.name,
    description: t.description,
    input_schema: t.inputSchema,
  }));
}

function toAnthropicMessages(messages: Message[]) {
  return messages.map((m) => {
    if (typeof m.content === "string") {
      return { role: m.role as "user" | "assistant", content: m.content };
    }
    // Already in content blocks format
    const content = m.content.map((b) => {
      if (b.type === "text") return { type: "text" as const, text: b.text! };
      if (b.type === "tool_use") return { type: "tool_use" as const, id: b.id!, name: b.name!, input: b.input ?? {} };
      if (b.type === "tool_result") return { type: "tool_result" as const, tool_use_id: b.tool_use_id!, content: b.content ?? "" };
      return { type: "text" as const, text: "" };
    });
    return { role: m.role as "user" | "assistant", content };
  });
}

export class AnthropicProvider implements Provider {
  name = "anthropic";
  model: string;
  private apiKey: string;

  constructor(opts: { apiKey: string; model: string }) {
    this.apiKey = opts.apiKey;
    this.model = opts.model || "claude-sonnet-4-20250514";
  }

  async *streamChat(req: ChatRequest): AsyncGenerator<StreamEvent> {
    const body = {
      model: this.model,
      system: req.system || undefined,
      messages: toAnthropicMessages(req.messages),
      tools: req.tools.length > 0 ? toAnthropicTools(req.tools) : undefined,
      stream: true,
      max_tokens: req.maxTokens ?? 8192,
    };

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": this.apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      yield { type: "error", error: `Anthropic ${res.status}: ${text.slice(0, 1000)}` };
      return;
    }
    if (!res.body) { yield { type: "error", error: "No body" }; return; }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let currentTool: { id: string; name: string; inputJson: string } | null = null;

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith("data: ")) continue;
          const data = trimmed.slice(6).trim();
          if (!data) continue;
          try {
            const evt = JSON.parse(data) as {
              type: string;
              delta?: { type: string; text?: string; partial_json?: string };
              content_block?: { type: string; id?: string; name?: string };
              message?: { stop_reason?: string };
            };
            if (evt.type === "content_block_start" && evt.content_block?.type === "tool_use") {
              currentTool = { id: evt.content_block.id ?? `toolu_${Math.random().toString(36).slice(2)}`, name: evt.content_block.name ?? "", inputJson: "" };
            } else if (evt.type === "content_block_delta" && evt.delta?.type === "text_delta" && evt.delta.text) {
              yield { type: "text_delta", text: evt.delta.text };
            } else if (evt.type === "content_block_delta" && evt.delta?.type === "input_json_delta" && evt.delta.partial_json) {
              if (currentTool) currentTool.inputJson += evt.delta.partial_json;
            } else if (evt.type === "content_block_stop" && currentTool) {
              try {
                const input = currentTool.inputJson ? JSON.parse(currentTool.inputJson) : {};
                yield { type: "tool_use", block: { type: "tool_use", id: currentTool.id, name: currentTool.name, input } };
              } catch {
                yield { type: "tool_use", block: { type: "tool_use", id: currentTool.id, name: currentTool.name, input: { raw: currentTool.inputJson } as Record<string, unknown> } };
              }
              currentTool = null;
            } else if (evt.type === "message_stop") {
              yield { type: "done" };
              return;
            }
          } catch { /* ignore */ }
        }
      }
      yield { type: "done" };
    } finally { reader.releaseLock(); }
  }
}
