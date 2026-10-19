# Arena Code 아키텍처 — 설계 문서

## 1. 목표

Claude Code의 **Agentic Loop + Harness** 패턴을 유지하면서, 모델을 **교체 가능**하게 만든다.
Arena Agent와 무료 API(OpenRouter, Gemini, Groq, Ollama)를 같은 인터페이스로 호출한다.

---

## 2. 전체 구조

```
┌─────────────────────────────────────────────────────────────┐
│                        User (Terminal)                      │
│                    Ink TUI / Headless -p                    │
└──────────────────────┬──────────────────────────────────────┘
                       │ prompt
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                   CLI (src/cli.ts)                          │
│  - AGENT.md 로드 (CLAUDE.md 호환)                           │
│  - Provider 선택 (env: ARENA_PROVIDER)                       │
│  - queryLoop 생성                                            │
└──────────────────────┬──────────────────────────────────────┘
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                 queryLoop() — AsyncGenerator                 │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐     │
│  │ Context  │→ │  Model   │→ │Permission│→ │  Tools   │──┐  │
│  │ Assembly │  │   Call   │  │  Gate    │  │ Execute  │  │  │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘  │  │
│       ▲            │                              │     │  │
│       └────────────┴──────────────────────────────┘     │  │
│                    tool_results                          │  │
│              (stop_reason == "end_turn" 시 종료)         │  │
└──────────────────────────────────────────────────────────┘
                       │
                       ▼
              ┌─────────────────┐
              │   Providers     │
              │  ┌───────────┐  │
              │  │ Arena     │──┼─→ POST /v1/chat/completions (Arena)
              │  │ OpenRouter│──┼─→ https://openrouter.ai/api/v1
              │  │ Gemini    │──┼─→ https://generativelanguage.googleapis.com
              │  │ Groq      │──┼─→ https://api.groq.com/openai/v1
              │  │ Ollama    │──┼─→ http://localhost:11434
              │  │ Anthropic │──┼─→ https://api.anthropic.com
              │  └───────────┘  │
              └─────────────────┘
                       │
                       ▼
              ┌─────────────────┐
              │   Tools         │
              │  Read Write Edit│
              │  Bash Glob Grep │
              │  Todo WebFetch  │
              └─────────────────┘
```

---

## 3. Provider 추상화

모든 Provider는 동일 인터페이스를 구현한다 — Claude Code의 `deps.callModel()`과 동일 역할.

```typescript
interface Provider {
  name: string;
  // OpenAI 호환 Chat Completions 스트리밍
  streamChat(req: ChatRequest): AsyncGenerator<StreamEvent>;
  // 도구 스키마를 해당 API 형식으로 변환
  toToolSchema(tool: ToolDefinition): unknown;
}

interface ChatRequest {
  system: string;
  messages: Message[];
  tools: ToolDefinition[];
  model: string;
  maxTokens?: number;
  thinking?: { enabled: boolean };
}
```

### 3.1 Arena Agent Provider (핵심)

Arena Agent는 이 워크스페이스의 LLM 백엔드다. 두 가지 연동 방식:

**A. HTTP 브릿지 (권장)**
```typescript
// src/providers/arena.ts
// Arena Agent가 OpenAI 호환 엔드포인트를 노출한다고 가정
// 또는 이 프로젝트 자체가 Arena MCP 서버로 동작
const res = await fetch(`${ARENA_API_URL}/v1/chat/completions`, {
  method: "POST",
  headers: { "Authorization": `Bearer ${ARENA_API_KEY}` },
  body: JSON.stringify({
    model: "arena-agent",
    messages: [{ role: "system", content: system }, ...messages],
    tools,
    stream: true,
  }),
});
```

**B. MCP 서버로 노출**
```typescript
// arena-code 자체를 MCP 서버로 등록 → Arena Agent가 도구로 호출
// npx arena-code --mcp
// → Arena Agent의 tool list에 Read/Bash 등이 자동 등록
```

**C. 로컬 스텁 (개발용)**
- API 키 없이도 `OLLAMA` 또는 `GEMINI_FREE`로 폴백 — Arena 연결 실패 시 자동 전환

### 3.2 무료 모델 추천 매트릭스

| 용도 | 추천 모델 | Provider | 컨텍스트 | 비용 |
|------|-----------|----------|----------|------|
| 코딩 메인 | `deepseek/deepseek-r1:free` | OpenRouter | 128K | $0 |
| 코딩 보조 | `qwen/qwen3-coder:free` | OpenRouter | 128K | $0 |
| 빠른 추론 | `llama-3.3-70b-versatile` | Groq | 128K | $0 (Rate limit) |
| 긴 문서 | `gemini-2.0-flash` | Gemini | 1M | $0 |
| 오프라인 | `qwen2.5-coder:14b` | Ollama | 32K | $0 |
| Arena | `arena-agent` | Arena | 가변 | 크레딧 내 |

---

## 4. Agent Loop 상세 (queryLoop)

Claude Code `query.ts:queryLoop()`의 단순화 버전:

```typescript
async function* queryLoop(params: LoopParams): AsyncGenerator<LoopEvent> {
  const state: LoopState = { messages: [...params.messages], turnCount: 0 };

  while (true) {
    // 1. Context assembly
    const system = assembleSystemPrompt(params);
    // 2. Compaction check
    if (estimateTokens(state.messages) > params.maxContextTokens * 0.8) {
      yield { type: "compacting" };
      state.messages = await compact(state.messages, params.provider);
    }
    // 3. Model call (streaming)
    const stream = params.provider.streamChat({
      system, messages: state.messages, tools: params.tools,
    });
    let assistantContent: ContentBlock[] = [];
    for await (const event of stream) {
      if (event.type === "text_delta") yield { type: "text", text: event.text };
      if (event.type === "tool_use") assistantContent.push(event.block);
      if (event.type === "done") break;
    }
    const stopReason = assistantContent.some(b => b.type === "tool_use") ? "tool_use" : "end_turn";
    state.messages.push({ role: "assistant", content: assistantContent });

    if (stopReason === "end_turn") {
      yield { type: "result", content: assistantContent };
      break;
    }

    // 4. Permission gate + 5. Tool execution
    for (const block of assistantContent) {
      if (block.type !== "tool_use") continue;
      const decision = checkPermission(block, params.permissions);
      if (decision === "deny") {
        state.messages.push(toolResult(block.id, "Permission denied"));
        continue;
      }
      if (decision === "ask") {
        const approved = await askUser(block); // Ink prompt
        if (!approved) { state.messages.push(toolResult(block.id, "User denied")); continue; }
      }
      const result = await executeTool(block, params.cwd);
      yield { type: "tool_result", tool: block.name, result };
      state.messages.push({ role: "user", content: [{ type: "tool_result", tool_use_id: block.id, content: result }] });
    }

    if (++state.turnCount >= params.maxTurns) {
      yield { type: "error", message: "Max turns reached" };
      break;
    }
  }
}
```

### 핵심 차이점
- Claude Code는 10가지 종료 이유 → Arena Code는 3가지 (`end_turn`, `max_turns`, `error`)로 단순화
- StreamingToolExecutor 대신 순차 실행 (병렬은 Phase 2에서 추가)
- Compaction은 Budget Reduction + AutoCompact 2단계만 구현

---

## 5. Tools

각 도구는 `ToolDefinition`을 구현:

```typescript
interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: JSONSchema;
  execute(input: unknown, ctx: ToolContext): Promise<string>;
  isConcurrencySafe?: boolean; // Read/Grep/Glob = true, Write/Edit/Bash = false
}
```

| 도구 | 동시성 | 설명 |
|------|--------|------|
| Read | safe | 파일 읽기 (2000줄 제한) |
| Write | exclusive | 파일 생성/덮어쓰기 |
| Edit | exclusive | 정확한 문자열 교체 |
| Bash | exclusive | 셸 실행 (allowlist 체크) |
| Glob | safe | `fast-glob` 파일 탐색 |
| Grep | safe | `ripgrep` 또는 JS fallback |
| TodoWrite | exclusive | 작업 목록 관리 |
| WebFetch | safe | URL fetch |

MCP 확장: `src/skills/manager.ts`에서 MCP 서버 연결 시 도구가 자동 병합된다.

---

## 6. Permissions

Claude Code 7단계 → 3단계로 단순화하되, 정규식으로 유연성 확보:

```typescript
type PermissionDecision = "allow" | "ask" | "deny";

interface PermissionRule {
  pattern: RegExp;      // e.g., /^Bash\(npm (test|run).*\)$/
  decision: PermissionDecision;
}

// 평가 순서: deny → allow → ask (기본값)
```

`.arena-code/settings.json` 예시:
```json
{
  "permissions": {
    "allow": ["Read(*)", "Glob(*)", "Grep(*)", "Bash(npm *)", "Bash(git status*)"],
    "ask": ["Bash(*)", "Edit(*)", "Write(*)"],
    "deny": ["Bash(rm -rf *)", "Bash(sudo *)", "Read(.env)"]
  }
}
```

---

## 7. Context & Compaction

### AGENT.md (CLAUDE.md 호환)
```
~/.arena-code/AGENT.md        # 전역
./AGENT.md                    # 프로젝트
./.arena-code/AGENT.md        # 로컬 오버라이드
./CLAUDE.md                   # 호환용 (있으면 AGENT.md와 병합)
```

### Compaction 2단계
1. **Budget Reduction**: 오래된 tool_result를 500자로 요약
2. **AutoCompact**: 모델에게 "지금까지 대화 요약해줘" 요청 후, 요약으로 교체

```typescript
async function compact(messages: Message[], provider: Provider): Promise<Message[]> {
  const summary = await provider.streamChat({
    system: "Summarize the conversation so far concisely, preserving file paths and decisions.",
    messages,
    tools: [],
  });
  return [{ role: "user", content: `Previous conversation summary: ${summary}` }];
}
```

---

## 8. UI

- **Interactive**: Ink (React for CLI) — Claude Code와 동일 스택
- **Headless**: `node dist/cli.js -p "prompt"` — 파이프/CI용
- **Streaming**: 모델 토큰을 실시간으로 렌더링

---

## 9. 향후 확장 (Roadmap)

- [ ] Subagents (Task 도구, depth=1)
- [ ] Skills (`.arena-code/skills/*/SKILL.md`)
- [ ] Hooks (tool 실행 전후 스크립트)
- [ ] MCP 클라이언트 완전 구현
- [ ] Plan Mode (읽기 전용 선회)
- [ ] Session persistence (JSONL)
