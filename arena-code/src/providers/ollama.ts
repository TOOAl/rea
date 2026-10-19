/**
 * Ollama Provider — 로컬 무료
 * https://ollama.com/docs
 * Ollama는 OpenAI 호환 엔드포인트 /v1/chat/completions 제공 (v0.3+)
 */
import type { Provider, ChatRequest, StreamEvent } from "./types.js";

export class OllamaProvider implements Provider {
  name = "ollama";
  model: string;
  private baseUrl: string;

  constructor(opts: { baseUrl: string; model: string }) {
    this.baseUrl = opts.baseUrl?.replace(/\/$/, "") || "http://localhost:11434";
    this.model = opts.model || "qwen2.5-coder:14b";
  }

  async *streamChat(req: ChatRequest): AsyncGenerator<StreamEvent> {
    // Ollama OpenAI 호환 경로
    const url = `${this.baseUrl}/v1/chat/completions`;

    const messages: { role: string; content: unknown }[] = [];
    if (req.system) messages.push({ role: "system", content: req.system });
    for (const m of req.messages) {
      if (typeof m.content === "string") messages.push({ role: m.role, content: m.content });
      else {
        const hasToolResult = m.content.some((b) => b.type === "tool_result");
        if (hasToolResult) {
          for (const b of m.content) {
            if (b.type === "tool_result") messages.push({ role: "tool", content: b.content || "", tool_call_id: b.tool_use_id } as unknown as { role: string; content: unknown });
            else if (b.type === "text" && b.text) messages.push({ role: m.role, content: b.text });
          }
        } else {
          const toolCalls = m.content.filter((b) => b.type === "tool_use").map((b) => ({ id: b.id, type: "function" as const, function: { name: b.name, arguments: JSON.stringify(b.input ?? {}) } }));
          const text = m.content.filter((b) => b.type === "text").map((b) => b.text).join("\n");
          const msg: Record<string, unknown> = { role: m.role, content: text || "" };
          if (toolCalls.length > 0) msg.tool_calls = toolCalls;
          messages.push(msg as { role: string; content: unknown });
        }
      }
    }

    const body = {
      model: this.model,
      messages,
      tools: req.tools.length > 0 ? req.tools.map((t) => ({ type: "function" as const, function: { name: t.name, description: t.description, parameters: t.inputSchema } })) : undefined,
      stream: true,
      options: { temperature: req.temperature ?? 0.2 },
    };

    let res: Response;
    try {
      res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    } catch (e: unknown) {
      yield { type: "error", error: `Ollama connection failed (${this.baseUrl}): ${e instanceof Error ? e.message : String(e)}\n→ ollama serve 실행 여부와 모델 설치(ollama pull ${this.model})를 확인하세요.` };
      return;
    }

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      yield { type: "error", error: `Ollama ${res.status}: ${text.slice(0, 1000)}` };
      return;
    }
    if (!res.body) { yield { type: "error", error: "No body" }; return; }

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
            for (const [id, tc] of toolCallBuffers) {
              try { const input = tc.args ? JSON.parse(tc.args) : {}; yield { type: "tool_use", block: { type: "tool_use", id, name: tc.name, input } }; } catch { yield { type: "tool_use", block: { type: "tool_use", id, name: tc.name, input: { raw: tc.args } as Record<string, unknown> } }; }
            }
            yield { type: "done" }; return;
          }
          try {
            const json = JSON.parse(data) as { choices?: { delta?: { content?: string; tool_calls?: { id?: string; index: number; function?: { name?: string; arguments?: string } }[] } }[]; message?: { content?: string } };
            // Ollama non-streaming fallback: message.content
            if (json.message?.content) { yield { type: "text_delta", text: json.message.content }; continue; }
            const delta = json.choices?.[0]?.delta;
            if (!delta) continue;
            if (delta.content) yield { type: "text_delta", text: delta.content };
            if (delta.tool_calls) {
              for (const tc of delta.tool_calls) {
                const idx = String(tc.index);
                const existing = toolCallBuffers.get(idx) ?? { name: "", args: "" };
                if (tc.function?.name) existing.name = tc.function.name;
                if (tc.function?.arguments) existing.args += tc.function.arguments;
                if (tc.id) { toolCallBuffers.set(tc.id, existing); if (idx !== tc.id) toolCallBuffers.delete(idx); } else toolCallBuffers.set(idx, existing);
              }
            }
          } catch { /* ignore */ }
        }
      }
      for (const [id, tc] of toolCallBuffers) {
        if (!tc.name) continue;
        try { const input = tc.args ? JSON.parse(tc.args) : {}; yield { type: "tool_use", block: { type: "tool_use", id, name: tc.name, input } }; } catch { yield { type: "tool_use", block: { type: "tool_use", id, name: tc.name, input: { raw: tc.args } as Record<string, unknown> } }; }
      }
      yield { type: "done" };
    } finally { reader.releaseLock(); }
  }
}
