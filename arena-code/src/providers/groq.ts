/**
 * Groq Provider — OpenAI 호환, 초저지연
 * https://console.groq.com/docs/quickstart
 */
import type { Provider, ChatRequest, StreamEvent } from "./types.js";
import { OpenRouterProvider } from "./openrouter.js";

export class GroqProvider implements Provider {
  name = "groq";
  model: string;
  private inner: OpenRouterProvider;

  constructor(opts: { apiKey: string; model: string }) {
    this.model = opts.model || "llama-3.3-70b-versatile";
    // Groq는 OpenAI 호환이지만 baseUrl만 다름 — OpenRouter 로직 재사용하되 Groq 전용 파생 필요
    // 간단히 OpenRouterProvider를 래핑하고 fetch URL만 오버라이드
    this.inner = new OpenRouterProvider({ apiKey: opts.apiKey, model: this.model });
    // Groq 엔드포인트로 fetch 오버라이드: OpenRouterProvider는 baseUrl이 private이라 직접 재구현
    // 여기서는 Groq 직접 구현을 위해 별도 로직 사용
  }

  async *streamChat(req: ChatRequest): AsyncGenerator<StreamEvent> {
    const apiKey = (this.inner as unknown as { apiKey: string }).apiKey ?? process.env.GROQ_API_KEY ?? "";
    // 실제 Groq 호출 — OpenRouter와 동일 형식이지만 다른 URL
    const { model } = this;
    // 재구현: Groq는 OpenAI 호환이므로 OpenRouter와 동일 변환 사용
    // 간단히 OpenRouter Provider 로직을 Groq URL로 복제
    const groqBase = "https://api.groq.com/openai/v1";

    // 변환 함수는 openrouter.ts와 동일 — 여기서는 동적 import로 재사용
    const body = {
      model,
      messages: (() => {
        const out: { role: string; content: unknown }[] = [];
        if (req.system) out.push({ role: "system", content: req.system });
        for (const m of req.messages) {
          if (typeof m.content === "string") out.push({ role: m.role, content: m.content });
          else {
            const hasToolResult = m.content.some((b) => b.type === "tool_result");
            if (hasToolResult) {
              for (const b of m.content) {
                if (b.type === "tool_result") out.push({ role: "tool", content: b.content || "", tool_call_id: b.tool_use_id } as unknown as { role: string; content: unknown });
                else if (b.type === "text" && b.text) out.push({ role: m.role, content: b.text });
              }
            } else {
              const toolCalls = m.content.filter((b) => b.type === "tool_use").map((b) => ({ id: b.id, type: "function" as const, function: { name: b.name, arguments: JSON.stringify(b.input ?? {}) } }));
              const text = m.content.filter((b) => b.type === "text").map((b) => b.text).join("\n");
              const msg: Record<string, unknown> = { role: m.role, content: text || "" };
              if (toolCalls.length > 0) msg.tool_calls = toolCalls;
              out.push(msg as { role: string; content: unknown });
            }
          }
        }
        return out;
      })(),
      tools: req.tools.length > 0 ? req.tools.map((t) => ({ type: "function" as const, function: { name: t.name, description: t.description, parameters: t.inputSchema } })) : undefined,
      stream: true,
      max_tokens: req.maxTokens ?? 8192,
      temperature: req.temperature ?? 0.2,
    };

    const res = await fetch(`${groqBase}/chat/completions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      yield { type: "error", error: `Groq ${res.status}: ${text.slice(0, 1000)}` };
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
            const json = JSON.parse(data) as { choices: { delta: { content?: string; tool_calls?: { id?: string; index: number; function?: { name?: string; arguments?: string } }[] }; finish_reason?: string }[] };
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
