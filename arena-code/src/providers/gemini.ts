/**
 * Google Gemini Provider — Free Tier
 * https://ai.google.dev/gemini-api/docs
 * Gemini는 OpenAI 형식이 아니라 별도 형식 — 변환 레이어 포함
 */
import type { Provider, ChatRequest, StreamEvent, Message, ToolDefinition } from "./types.js";

function toGeminiTools(tools: ToolDefinition[]) {
  if (tools.length === 0) return undefined;
  return [
    {
      functionDeclarations: tools.map((t) => ({
        name: t.name,
        description: t.description,
        parameters: t.inputSchema,
      })),
    },
  ];
}

function toGeminiContents(system: string, messages: Message[]) {
  const contents: { role: string; parts: unknown[] }[] = [];

  for (const m of messages) {
    if (typeof m.content === "string") {
      const role = m.role === "assistant" ? "model" : "user";
      contents.push({ role, parts: [{ text: m.content }] });
    } else {
      const parts: unknown[] = [];
      for (const b of m.content) {
        if (b.type === "text" && b.text) parts.push({ text: b.text });
        if (b.type === "tool_use") parts.push({ functionCall: { name: b.name, args: b.input ?? {} } });
        if (b.type === "tool_result") {
          // Gemini는 tool 결과를 functionResponse로
          parts.push({
            functionResponse: {
              name: "tool_result",
              response: { content: b.content?.slice(0, 10000) ?? "" },
            },
          });
        }
      }
      if (parts.length > 0) {
        const role = m.role === "assistant" ? "model" : "user";
        contents.push({ role, parts });
      }
    }
  }
  return contents;
}

export class GeminiProvider implements Provider {
  name = "gemini";
  model: string;
  private apiKey: string;

  constructor(opts: { apiKey: string; model: string }) {
    this.apiKey = opts.apiKey;
    this.model = opts.model || "gemini-2.0-flash";
  }

  async *streamChat(req: ChatRequest): AsyncGenerator<StreamEvent> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:streamGenerateContent?key=${this.apiKey}&alt=sse`;

    const body: Record<string, unknown> = {
      systemInstruction: req.system ? { parts: [{ text: req.system }] } : undefined,
      contents: toGeminiContents(req.system, req.messages),
      tools: toGeminiTools(req.tools),
      generationConfig: {
        maxOutputTokens: req.maxTokens ?? 8192,
        temperature: req.temperature ?? 0.2,
      },
    };

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      yield { type: "error", error: `Gemini ${res.status}: ${text.slice(0, 1000)}` };
      return;
    }
    if (!res.body) {
      yield { type: "error", error: "No response body" };
      return;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

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
          if (!data || data === "[DONE]") continue;
          try {
            const json = JSON.parse(data) as {
              candidates?: {
                content?: { parts?: { text?: string; functionCall?: { name: string; args: Record<string, unknown> } }[] };
              }[];
            };
            const parts = json.candidates?.[0]?.content?.parts;
            if (!parts) continue;
            for (const part of parts) {
              if (part.text) yield { type: "text_delta", text: part.text };
              if (part.functionCall) {
                const name = part.functionCall.name;
                const args = part.functionCall.args ?? {};
                const id = `call_${Math.random().toString(36).slice(2, 8)}`;
                yield { type: "tool_use", block: { type: "tool_use", id, name, input: args as Record<string, unknown> } };
              }
            }
          } catch {
            // ignore
          }
        }
      }
      yield { type: "done" };
    } finally {
      reader.releaseLock();
    }
  }
}
