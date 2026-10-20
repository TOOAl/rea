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

## 9. Harness² — Self-Improving Brain (v2.4, H1~H5 완료)

Google `harness2` (Apache 2.0) 포팅 — 하네스=파일 트리, 개선=파일 편집으로 단순화. Arena `AGENTS.md`/skills/hooks/tools가 Harness² 8개 컴포넌트(c1~c8)와 1:1 매칭되어 흡수가 쉬웠다. 상세 REA는 `docs/HARNESS2_REA_ANALYSIS.md`.

### 9.1 모듈

```
arena-code/src/harness2/
├── harness.ts   380줄 — ARENA_SURFACE (alwaysOn AGENTS.md+guardrails+CLAUDE.md+systemprompt.md, 12k), skills/sub_agents/scripts/plugins/.codex/hooks.json, normalizeRel/isAllowed/readTree/writeTree/validate(3원칙: trigger/{{/script동봉)/diffSummary/autotrigger
├── context.ts   352줄 — buildEvidenceTree(build MISSION.md: task.md/source/decisions/rollouts/deliverables/harness/library/pool) + assertNoLeaks, RolloutView
├── proposer.ts  382줄 — HarnessProposer invariant(vs domain) 프롬프트 분기, maxAttempts 2, omitted-is-inherited, cache
├── composer.ts  291줄 — composeFromCandidates(acceptTree validate→autotrigger 보정→domain 우선 머지→final validate fallback) + selectAnonymous(deliverable 길이 휴리스틱)
├── engine.ts    614줄 — Harness2Engine.run({k,mode,dryRun,probeFn}) parallel/sequential, defaultProbe queryLoop 6턴 재활용 + MOCK, FailureStore+Library 연동
├── failures.ts  299줄 — FailureStore(.arena/harness2/failures.jsonl) + analyzeFailure(5분류) + suggestAlternatives + recordAndResearch + tryAlternativeMerge
├── library.ts   256줄 — HarnessLibrary .arena/harness2/library/<domain>/INDEX.md + harnesses/<task>/harness+EXPERIENCE.md, hasExperience/forget/retain
├── guard.ts     — guardHarness(TODO/{{/budget/skill frontmatter) + guardHint → 다음 depth 힌트
└── depth.ts     249줄 — RecurrentDepthRunner depth1..5/earlyStop/bestScore/scoreHarness, GPT-6 Astra recurrent depth 영감
```

### 9.2 Execution Flow

```
CLI --harness2 --k 2 --mode parallel --depth 3 --domain auth --dry-run --mock
  → bootstrapSession provider 생성
  → readTree(ARENA_SURFACE, cwd) baseHarness
  → (depth>1 ? RecurrentDepthRunner(depth/k/mode/guard/earlyStop) : Harness2Engine(k/mode))
       → buildEvidenceTree(task.md + rollouts + harness + library) → MISSION.md
       → HarnessProposer.propose(invariant + domain) — 2회 재시도
       → probe(queryLoop 6턴) base vs inv vs dom → trajectory/deliverable
       → composeFromCandidates(autotrigger→validate→domain우선머지→final validate) — 실패 시 FailureStore→failure-research.json→recommended tryAlternativeMerge
       → guardHarness → depth hint 주입("[Recurrent Depth Hint]") → 다음 depth
       → HarnessLibrary.add(INDEX.md) 성공 시, depth-summary.json/best-harness.json 저장
  → finalHarness 최종 적용 → queryLoop 최종 실행
```

### 9.3 Evidence Layout (H4~H5)

```
.arena/harness2/
├── evidence/
│   ├── <task>#d1-step-1/MISSION.md + rollouts/ + harness/ + final-harness/ + failure-research.json + alternative-harness.json + guard-report.json
│   ├── <task>-depth-summary.json   — wantDepth/executedDepth/bestDepth/bestScore/depthNotes/guardReports
│   └── <task>-best-harness.json
├── failures.jsonl                  — FailureStore append (재현 가능)
└── library/<domain>/INDEX.md + harnesses/<taskId>/harness + EXPERIENCE.md
```

### 9.4 향후 확장 (Roadmap)

- [x] **Harness² H1~H5 완료** — Harness Tree → Evidence+Proposer → Composer+Engine → FailureStore+Library+CLI → Guard+Depth (GPT-6 Astra) — `e678e8f`, tsc0 build0 vitest47
- [ ] Subagents (Task 도구, depth=1) — Harness² c6 `sub_agents/<name>/AGENT.md` 이미 SurfaceSpec에 정의됨
- [x] Skills (`.arena-code/skills/*/SKILL.md`) — 5개 + Harness² skills/* 연동 (domain-check 등)
- [x] Hooks (tool 실행 전후 스크립트) — `postToolUse`에 Guard 연결 후보
- [x] MCP 클라이언트 완전 구현 — `--mcp` stdio JSON-RPC (Muse Code 호환)
- [x] Session persistence (JSONL) — EventLog + .arena/events.log
- [ ] Plan Mode (읽기 전용 선회) — skills/plan + /grill 연동
- [x] **Orca Fleet O1~O3 (v2.5.0) + Hybrid HF (v2.6.0) + D1 Design Mode/D2 RAG (v2.10.0)** — `src/fleet/` Run→Task→Dispatch→worker_done, `arena-code --fleet --fanout N --dry-run` + `arena-code fleet <run-create|task-create|worker-start|check|ack|worker-done|gh|diffs>` — `fleet` 6모듈, tsc0 build0 vitest63 — REA docs/ORCA_ADE_REA_ANALYSIS.md v2.5

---

## 10. Fleet — Orca ADE Orchestration (v2.5, O1~O3 완료) + Hybrid & Design+RAG (v2.6~2.7)

Orca `fleet`(stablyai/orca, MIT) CLI 계약을 `arena-code`에 경량 포팅 — Electron/30+에이전트 제외, 핵심 오케스트레이션만 흡수. 상세 REA `docs/ORCA_ADE_REA_ANALYSIS.md`.

### 10.1 모듈

```
arena-code/src/fleet/
├── types.ts          99줄 — Run/Task/Dispatch/Message/DecisionGate/FleetState, TaskStatus/DispatchStatus/MessageType, genId
├── store.ts         394줄 — FleetStore .arena/fleet.json + fleet.log, CRUD, DAG unblockDependents, circuit-breaker(per-task 3회→blocked), worker_done 자동 전이, check/ack/status
├── worktreeFleet.ts  70줄 — FleetWorktreeManager(WorktreeManager 확장) createFleet(N≤16) + injectPreamble(.arena/fleet/PREAMBLE.md)
├── dispatch.ts      170줄 — FleetDispatcher dispatchTask(preamble 주입)+runWorker(queryLoop 재활용)+ghCommand(gh CLI passthrough)
├── coordinator.ts   220줄 — FleetCoordinator canonical supervised loop: runCreate/taskCreate/workerStart/fanOut/check/ack/workerDone/workerRelease/status/collectDiffs/ghCommand
├── worker.ts        150줄 — WorkerAgent 5 obligations: parsePreamble/heartbeat/check/workerDone 1회 보장(lifecycle 검증)/idle, parseFilesModified
└── cli.ts           250줄 — handleFleetCommand(run-create/run-list/task-create/task-list/worker-start/fan-out/check/ack/worker-done/worker-release/status/gh/diffs)
```
+ `src/cli.ts` Fleet 통합: `arena-code fleet <sub>` (Orca 호환) + `arena-code --fleet --fanout N --dry-run` + `arena-code --fleet-worker-done --task-id/--dispatch-id/--outcome` + allowUnknownOption pass-through.

### 10.2 Execution Flow

```
# 1) Run/Task 생성 (코디네이터)
 arena-code fleet run-create --objective "flux 분해" → run_xxx
 arena-code fleet task-create --run run_xxx --spec "core utils" → task_xxx (ready)
 arena-code fleet task-create --run run_xxx --spec "api" --deps '["task_xxx"]' → task_yyy (pending, DAG)

# 2) Fan-out (병렬 후보) — 하나를 N개 worktree에서 동시에
 arena-code --fleet --print "flux 구현" --fanout 3 --dry-run
   → FleetCoordinator.fanOut(count=3) → FleetWorktreeManager.createFleet(3) → N dispatches (current worktree fallback in non-git)
   → (real) dispatcher.runWorker(queryLoop 12턴, preamble 주입) 병렬

# 3) Worker 계약 (각 worktree 내부)
 heartbeat() → check(decision_gate?) → 작업 → --fleet-worker-done --task-id T --dispatch-id D --outcome succeeded --files-modified a,b --summary "3줄"
   → FleetStore.createMessage(worker_done) → Task completed → unblockDependents(pending→ready) / failureCount≥3→blocked
   → 후 대기(worker_done 1회 보장), coordinator가 ack

# 4) Coordinator check (감독자 루프)
 arena-code fleet check --run run_xxx --types worker_done,escalation,question --wait --timeout 90000
 arena-code fleet ack --run run_xxx  # 또는 --message msg_xxx
 arena-code fleet gh issue view 123 --json title,state  # gh passthrough
 arena-code fleet diffs --run run_xxx  # 각 worktree diff 수집, 승자 병합 재료
```

### 10.3 Persisted State

```
.arena/
├── fleet.json     — {version:1, runs{}, tasks{}, dispatches{}, messages{}, gates{}, updatedAt}
├── fleet.log      — JSONL append-only (run_create/task_create/dispatch_create/message/ack/gate)
├── fleetProbe.ts 150줄 — createFleetProbeFn() Fleet-aware ProbeFn, Task/Dispatch/workerDone 추적, directProbe fallback
└── harness2/      — 증거 트리와 Fleet store 동시 기록 (hybrid 시 .arena/fleet.json + .arena/harness2/evidence 동시 생성)
```

### 10.4 Harness²×Fleet Hybrid (v2.6, HF 완료)

`EngineOptions.fleet={enabled, useWorktrees, runId, coordinator}` + `DepthOptions.fleet` → Engine이 `createFleetProbeFn()`으로 probeFn을 Fleet-aware로 래핑:

```
Engine.run() probeFn 결정
  fleet.enabled=false → defaultProbe (queryLoop 6턴)
  fleet.enabled=true  → createFleetProbeFn({provider, taskPrompt, cwd}) → per-candidate Fleet Task/Dispatch/workerDone
    - coordinator.taskCreate(runId, spec) → Task ready
    - coordinator.workerStart({taskId, worktree?}) → Dispatch running
    - coordinator.dispatcher.runWorker({dispatch, task, provider, systemExtra: harnessExtra}) → RolloutView
    - coordinator.workerDone({taskId, dispatchId, outcome}) → Task completed (DAG unblock)
DepthRunner.run() → Fleet Run 1개를 depth 전체에 재사용 (audit trail), depthNotes에 fleetRunId/fleetTaskIds 기록
```

CLI: `arena-code --harness2 --k 2 --depth 2 --harness2-fleet [--fleet-use-worktrees] --dry-run --mock`
 증거: `.arena/fleet.json` (Fleet Run+Tasks+Messages) + `.arena/harness2/evidence/<task>-depth-summary.json` (fleetRunId+fleetTaskIds+guardReports)
 테스트: `tests/harness2_fleet.test.ts` 7개 — engine standalone vs fleet, sequential, depth fleet, batch helper — vitest 70.

### 10.5 Design Mode & Library RAG (v2.7, D1+D2)

**Design Mode** `src/tools/browser.ts` (6 tools, ~350줄) — Orca `design_mode` + REA `browser-observation` passive CDP 모델을 Active Playwright 드라이버로 포팅. `browser_navigate`→`snapshot`→`act`→`screenshot`→`evaluate`→`close` 파이프라인. Playwright 없으면 fetch+DOM fallback으로 graceful degrade. 설치: `npm i -D playwright && npx playwright install chromium`. ToolRegistry에 자동 등록.

**Library RAG** `src/harness2/library.ts` TF-IDF lexical search — `STOP` 필터 + `tokenize/tf/cosine/idf` + cue bonus(0.08). `search(query, topK)` + `buildRagSnapshot(query, topK)` → 증거 트리 `library/`를 topK 필터링된 임시 스냅샷으로 교체 (evidence 예산 절약, 관련성 ↑).

**Selection LLM** `src/harness2/composer.ts` `selectAnonymousWithLLM(input, provider)` — 원본 `selection.py` 완전 포팅. 후보 deliverable/trajectory를 익명 A/B/C로 프롬프트, LLM judge가 JSON `{"choice":"A","reason":"..."}`로 투표. 실패 시 heuristic fallback. Engine/DepthRunner에서 `selectionLlm.enabled && !dryRun` 시 사용.

CLI: `--harness2-rag --harness2-rag-k 3 --harness2-selection-llm` (기본 rag on, llm off). Evidence 요약에 `ragHits/selectionMode` 기록.

### 10.6 Genius Skills (v2.8.0) + NL 트리거 (v2.9.0) + Guard 2축 (v2.9.1) + Library Context7/Serena (v2.10.0)
- Genius 4종(Curie/Da Vinci/Euler/Turing) + NL 트리거 라우팅 + code-review 2축(Standards/Spec) + Context7 2-tool/Serena 3-tool로 v2.10 완성

### 10.6.1 Memory Bank (v2.11.0)
- `src/memory/bank.ts` — `.memory-bank/<domain>/<slug>.md` 영속 기억, cue/content/evidence, TF-IDF+cue bonus search, Harness Library와 분리된 세션 기억

### 10.6.2 Security Gate (v2.11.0)
- `src/harness2/guard.ts` securityGate(stage: write|commit|pr) — write: secret/AKIA/password, commit: +TODO, pr: +Spec+Standards(Fowler). Gap #11 검사 시점별 흡수

### 10.6 향후

- Subagents(Task 도구) × Fleet worker (현재는 Fleet이 probe만, Task 도구를 Fleet worker가 직접 호출하는 확장은 다음)
- Library RAG/Selection LLM화 — `src/harness2/composer.ts` selectAnonymous를 LLM judge로, Library를 dense retrieval로
- Design Mode (browser automation) — Orca Design Mode 포팅 후보 (Playwright)



