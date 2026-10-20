/**
 * OpenAI 호환 Provider — http/openai transport
 * 어떤 OpenAI 호환 엔드포인트든 연결 (로컬 LLM, 프록시, 타사 API 등)
 */
import type { Provider, ChatRequest, StreamEvent, Message } from "../../providers/types.js";

function toOpenAIMessages(system: string, messages: Message[]) {
  const out: { role: string; content: unknown }[] = [];
  if (system) out.push({ role: "system", content: system });
  for (const m of messages) {
    if (typeof m.content === "string") {
      out.push({ role: m.role, content: m.content });
    } else {
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
        if (toolCalls.length) msg.tool_calls = toolCalls;
        out.push(msg as { role: string; content: unknown });
      }
    }
  }
  return out;
}

function toOpenAITools(tools: ChatRequest["tools"]) {
  return tools.map((t) => ({
    type: "function" as const,
    function: { name: t.name, description: t.description, parameters: t.inputSchema },
  }));
}

export class OpenAICompatibleProvider implements Provider {
  name: string;
  model: string;
  private baseUrl: string;
  private apiKey?: string;
  private headers: Record<string, string>;
  private timeout: number;

  constructor(opts: { name: string; baseUrl: string; apiKey?: string; model: string; headers?: Record<string, string>; timeout?: number }) {
    this.name = opts.name;
    this.baseUrl = opts.baseUrl.replace(/\/$/, "");
    this.apiKey = opts.apiKey;
    this.model = opts.model;
    this.headers = opts.headers ?? {};
    this.timeout = opts.timeout ?? 120_000;
  }

  async *streamChat(req: ChatRequest): AsyncGenerator<StreamEvent> {
    const url = `${this.baseUrl}/chat/completions`;
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...this.headers,
    };
    if (this.apiKey) headers["Authorization"] = `Bearer ${this.apiKey}`;

    const body = {
      model: this.model !== "default" ? this.model : req.model,
      messages: toOpenAIMessages(req.system, req.messages),
      tools: req.tools.length ? toOpenAITools(req.tools) : undefined,
      stream: true,
      max_tokens: req.maxTokens ?? 8192,
    };

    const ac = new AbortController();
    const tid = setTimeout(() => ac.abort(), this.timeout);

    let res: Response;
    try {
      res = await fetch(url, { method: "POST", headers, body: JSON.stringify(body), signal: ac.signal });
    } catch (e: unknown) {
      clearTimeout(tid);
      yield { type: "error", error: `[${this.name}] fetch failed: ${e instanceof Error ? e.message : String(e)}` };
      return;
    }
    clearTimeout(tid);

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      yield { type: "error", error: `[${this.name}] ${res.status}: ${text.slice(0, 1000)}` };
      return;
    }
    if (!res.body) { yield { type: "error", error: `[${this.name}] No body` }; return; }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    const toolBuf = new Map<string, { name: string; args: string }>();
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          const t = line.trim();
          if (!t.startsWith("data: ")) continue;
          const data = t.slice(6).trim();
          if (data === "[DONE]") {
            for (const [id, tc] of toolBuf) {
              try { const input = tc.args ? JSON.parse(tc.args) : {}; yield { type: "tool_use", block: { type: "tool_use", id, name: tc.name, input } }; } catch { yield { type: "tool_use", block: { type: "tool_use", id, name: tc.name, input: { raw: tc.args } as Record<string, unknown> } }; }
            }
            yield { type: "done" }; return;
          }
          try {
            const json = JSON.parse(data) as { choices: { delta: { content?: string; tool_calls?: { id?: string; index: number; function?: { name?: string; arguments?: string } }[] } }[] };
            const delta = json.choices?.[0]?.delta;
            if (!delta) continue;
            if (delta.content) yield { type: "text_delta", text: delta.content };
            if (delta.tool_calls) {
              for (const tc of delta.tool_calls) {
                const idx = String(tc.index);
                const ex = toolBuf.get(idx) ?? { name: "", args: "" };
                if (tc.function?.name) ex.name = tc.function.name;
                if (tc.function?.arguments) ex.args += tc.function.arguments;
                if (tc.id) { toolBuf.set(tc.id, ex); if (idx !== tc.id) toolBuf.delete(idx); } else toolBuf.set(idx, ex);
              }
            }
          } catch {}
        }
      }
      for (const [id, tc] of toolBuf) {
        if (!tc.name) continue;
        try { const input = tc.args ? JSON.parse(tc.args) : {}; yield { type: "tool_use", block: { type: "tool_use", id, name: tc.name, input } }; } catch { yield { type: "tool_use", block: { type: "tool_use", id, name: tc.name, input: { raw: tc.args } as Record<string, unknown> } }; }
      }
      yield { type: "done" };
    } finally { reader.releaseLock(); }
  }
}
