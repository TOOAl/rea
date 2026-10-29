/**
 * OpenRouter Provider — 무료 모델 지원
 * https://openrouter.ai/docs
 */
import type { Provider, ChatRequest, StreamEvent, Message, _ContentBlock } from "./types.js";

function toOpenAITools(tools: ChatRequest["tools"]) {
  return tools.map((t) => ({
    type: "function" as const,
    function: {
      name: t.name,
      description: t.description,
      parameters: t.inputSchema,
    },
  }));
}

function toOpenAIMessages(system: string, messages: Message[]) {
  const out: { role: string; content: unknown }[] = [];
  if (system) out.push({ role: "system", content: system });
  for (const m of messages) {
    if (typeof m.content === "string") {
      out.push({ role: m.role, content: m.content });
    } else {
      // Claude Code의 tool_result를 OpenAI 호환으로 변환
      const hasToolResult = m.content.some((b) => b.type === "tool_result");
      if (hasToolResult) {
        for (const b of m.content) {
          if (b.type === "tool_result") {
            out.push({ role: "tool", content: b.content || "", tool_call_id: b.tool_use_id } as unknown as { role: string; content: unknown });
          } else if (b.type === "text" && b.text) {
            out.push({ role: m.role, content: b.text });
          }
        }
      } else {
        // Assistant with tool_use
        const toolCalls = m.content
          .filter((b) => b.type === "tool_use")
          .map((b) => ({
            id: b.id,
            type: "function" as const,
            function: { name: b.name, arguments: JSON.stringify(b.input ?? {}) },
          }));
        const text = m.content
          .filter((b) => b.type === "text")
          .map((b) => b.text)
          .join("\n");
        const msg: Record<string, unknown> = { role: m.role, content: text || "" };
        if (toolCalls.length > 0) msg.tool_calls = toolCalls;
        out.push(msg as { role: string; content: unknown });
      }
    }
  }
  return out;
}

export class OpenRouterProvider implements Provider {
  name = "openrouter";
  model: string;
  private apiKey: string;
  private baseUrl = "https://openrouter.ai/api/v1";

  constructor(opts: { apiKey: string; model: string }) {
    this.apiKey = opts.apiKey;
    this.model = opts.model;
  }

  async *streamChat(req: ChatRequest): AsyncGenerator<StreamEvent> {
    const body = {
      model: this.model,
      messages: toOpenAIMessages(req.system, req.messages),
      tools: req.tools.length > 0 ? toOpenAITools(req.tools) : undefined,
      stream: true,
      max_tokens: req.maxTokens ?? 8192,
      temperature: req.temperature ?? 0.2,
    };

    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://github.com/TOOAl/rea",
        "X-Title": "arena-code",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      yield { type: "error", error: `OpenRouter ${res.status}: ${text.slice(0, 1000)}` };
      return;
    }

    if (!res.body) {
      yield { type: "error", error: "No response body" };
      return;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    const toolCallBuffers = new Map<string, { name: string; args: string }>();

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
          if (data === "[DONE]") {
            // Flush buffered tool calls
            for (const [id, tc] of toolCallBuffers) {
              try {
                const input = tc.args ? JSON.parse(tc.args) : {};
                yield { type: "tool_use", block: { type: "tool_use", id, name: tc.name, input } };
              } catch {
                yield { type: "tool_use", block: { type: "tool_use", id, name: tc.name, input: { raw: tc.args } } };
              }
            }
            yield { type: "done" };
            return;
          }
          try {
            const json = JSON.parse(data) as {
              choices: {
                delta: { content?: string; tool_calls?: { id?: string; index: number; function?: { name?: string; arguments?: string } }[] };
                finish_reason?: string;
              }[];
            };
            const delta = json.choices?.[0]?.delta;
            if (!delta) continue;

            if (delta.content) {
              yield { type: "text_delta", text: delta.content };
            }
            if (delta.tool_calls) {
              for (const tc of delta.tool_calls) {
                const idx = String(tc.index);
                const existing = toolCallBuffers.get(idx) ?? { name: "", args: "" };
                if (tc.function?.name) existing.name = tc.function.name;
                if (tc.function?.arguments) existing.args += tc.function.arguments;
                if (tc.id) {
                  // Use real id if provided
                  toolCallBuffers.set(tc.id, existing);
                  if (idx !== tc.id) toolCallBuffers.delete(idx);
                } else {
                  toolCallBuffers.set(idx, existing);
                }
              }
            }
            if (json.choices[0]?.finish_reason === "tool_calls") {
              // Will be flushed on [DONE]
            }
          } catch {
            // ignore parse errors for partial JSON
          }
        }
      }
      // Flush if no [DONE]
      for (const [id, tc] of toolCallBuffers) {
        if (!tc.name) continue;
        try {
          const input = tc.args ? JSON.parse(tc.args) : {};
          yield { type: "tool_use", block: { type: "tool_use", id, name: tc.name, input } };
        } catch {
          yield { type: "tool_use", block: { type: "tool_use", id, name: tc.name, input: { raw: tc.args } as Record<string, unknown> } };
        }
      }
      yield { type: "done" };
    } finally {
      reader.releaseLock();
    }
  }
}
