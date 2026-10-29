/**
 * Arena Agent Provider — Arena 워크스페이스 내 LLM 브릿지
 *
 * 세 가지 모드:
 * 1. ARENA_API_URL이 있으면 OpenAI 호환 HTTP 호출 (실제 Arena Agent)
 * 2. 없으면 Arena MCP 또는 로컬 폴백 안내
 * 3. 환경변수 ARENA_MOCK=true이면 에코 목업 (테스트/데모용)
 */
import type { Provider, ChatRequest, StreamEvent } from "./types.js";
import { OpenRouterProvider } from "./openrouter.js";

export class ArenaProvider implements Provider {
  name = "arena";
  model: string;
  private apiUrl: string;
  private apiKey: string;
  private mock: boolean;
  private fallback: Provider | null;

  constructor(opts: { apiUrl?: string; apiKey?: string; model?: string; fallback?: Provider | null }) {
    this.apiUrl = opts.apiUrl?.replace(/\/$/, "") || "";
    this.apiKey = opts.apiKey || "";
    this.model = opts.model || "arena-agent";
    this.mock = process.env.ARENA_MOCK === "true";
    this.fallback = opts.fallback ?? null;
  }

  async *streamChat(req: ChatRequest): AsyncGenerator<StreamEvent> {
    // Mock mode — 테스트용
    if (this.mock) {
      yield* this.mockStream(req);
      return;
    }

    // 실제 Arena API URL이 있으면 OpenAI 호환 호출
    if (this.apiUrl) {
      yield* this.httpStream(req);
      return;
    }

    // 폴백이 있으면 폴백 사용
    if (this.fallback) {
      yield { type: "text_delta", text: `[Arena 연결 없음 → ${this.fallback.name} 폴백]\n` };
      yield* this.fallback.streamChat(req);
      return;
    }

    // 안내 메시지
    yield {
      type: "error",
      error: `Arena API URL이 설정되지 않았습니다.

설정 방법 (택1):
  1. .env에 ARENA_API_URL=https://your-arena-api/v1 와 ARENA_API_KEY 설정
  2. 다른 무료 Provider 사용: ARENA_PROVIDER=gemini (또는 openrouter/groq/ollama)
  3. 데모 목업: ARENA_MOCK=true npm start

현재 사용 가능한 무료 Provider:
  - GEMINI_API_KEY (Google Gemini Free)
  - OPENROUTER_API_KEY (OpenRouter Free)
  - GROQ_API_KEY (Groq Free)
  - Ollama 로컬 (ollama serve)

문서: docs/ARCHITECTURE.md#31 참조`,
    };
  }

  private async *httpStream(req: ChatRequest): AsyncGenerator<StreamEvent> {
    // OpenRouter와 동일한 OpenAI 호환 로직 — Arena Agent도 동일 규격이라 가정
    const _delegate = new OpenRouterProvider({ apiKey: this.apiKey, model: this.model });
    // URL 오버라이드를 위해 직접 fetch
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
      max_tokens: req.maxTokens ?? 8192,
    };

    const res = await fetch(`${this.apiUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      // Arena 연결 실패 시 폴백 시도
      if (this.fallback) {
        yield { type: "text_delta", text: `[Arena 연결 실패 (${res.status}) → ${this.fallback.name} 폴백]\n` };
        yield* this.fallback.streamChat(req);
        return;
      }
      yield { type: "error", error: `Arena API ${res.status}: ${text.slice(0, 1000)}` };
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
          const t = line.trim();
          if (!t.startsWith("data: ")) continue;
          const data = t.slice(6).trim();
          if (data === "[DONE]") {
            for (const [id, tc] of toolCallBuffers) {
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

  private async *mockStream(req: ChatRequest): AsyncGenerator<StreamEvent> {
    const lastUser = [...req.messages].reverse().find((m) => m.role === "user");
    const userText = typeof lastUser?.content === "string" ? lastUser.content : JSON.stringify(lastUser?.content ?? "");

    // 두 번째 턴 이후( tool_result가 있으면 )는 종료 응답
    const hasToolResult = req.messages.some(
      (m) => typeof m.content !== "string" && m.content.some((b) => b.type === "tool_result")
    );

    if (hasToolResult) {
      const doneMsg = `
✅ 도구 실행 결과를 확인했습니다. (MOCK 모드)

실제 LLM을 연결하면 이 지점에서 모델이 결과를 분석해 다음 도구 호출 또는 최종 답변을 생성합니다.

지금은 MOCK 모드이므로 루프가 종료됩니다.
→ 실제 사용: .env에 GEMINI_API_KEY / OPENROUTER_API_KEY / GROQ_API_KEY 중 하나를 설정하세요.

요약:
- 요청: "${userText.slice(0, 200)}"
- 처리: Glob 도구로 ${lastUser ? "파일 목록을 조회" : "작업을 수행"}했습니다.
- 다음 단계: 실제 Provider 연결 후 자동 진행됩니다.
`;
      for (const ch of doneMsg) {
        yield { type: "text_delta", text: ch };
        await new Promise((r) => setTimeout(r, 2));
      }
      yield { type: "done" };
      return;
    }

    const mockResponse = `[MOCK Arena Agent — ARENA_MOCK=true]
요청: "${userText.slice(0, 200)}"

이것은 목업 응답입니다. 실제 LLM을 사용하려면 .env에서 Provider를 설정하세요:
  - GEMINI_API_KEY  → Gemini Free (1M 컨텍스트)
  - OPENROUTER_API_KEY → DeepSeek R1 / Qwen3 Coder 무료
  - GROQ_API_KEY    → Groq 초저지연
  - OLLAMA_BASE_URL → 로컬 Ollama

사용 가능한 도구: ${req.tools.map((t) => t.name).join(", ")}

예시로 Glob 도구를 호출해보겠습니다...
`;

    for (const ch of mockResponse) {
      yield { type: "text_delta", text: ch };
      await new Promise((r) => setTimeout(r, 3));
    }

    yield {
      type: "tool_use",
      block: { type: "tool_use", id: "mock_1", name: "Glob", input: { pattern: "**/*" } },
    };
  }
}
