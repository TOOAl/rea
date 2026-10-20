# Arena Code v2.10 — Claude Code + Codex + Muse + Ghidra + Harness² Self-Improving Brain

> **REA로 3대 코딩 에이전트를 역분석하고, Arena Agent + 무료 API로 재구현한 궁극의 코딩 에이전트**
> **+ NSA Ghidra (Apache 2.0) + REA Bridge — 외부 패키지 + 자동 업데이트 + Harness² Self-Improving Brain (Google harness2 + GPT-6 Astra + Orca ADE REA)!**

Claude Code(52만줄), Codex CLI(Rust 95%), Muse Code(영구 에이전트+worktree)는 모두 `while(tool_use) → loop` harness지만 **각자 다른 강점**이 있습니다. 세 솔루션의 **최고 장점만** 결합해, 무료 API로 누구나 쓸 수 있는 에이전트를 제공합니다.

```
Claude Code Loop + Codex 샌드박스 + Muse Worktree/EventLog + Ghidra 29 + REA Bridge
+ Hook/MCP/외부패키지/자동업데이트 + Harness² Self-Improving Brain (Propose-Probe-Compose)
= Arena Code v2.10 ⭐  (H1~H5 + Fleet O1~O3 + Hybrid HF + Design+RAG: Harness Tree→Evidence+Proposer→Composer+Engine→FailureStore+Library+CLI→Guard+Depth)
```

---

## 1. 무엇을 만들었나

```text
arena-code/
├── packages/                         ⭐ NEW — 외부 패키지
│   ├── ghidra-tools/                29 tools (NationalSecurityAgency/ghidra 추적)
│   │   └── src/{helpers,inspect,procedures,decompile,instructions,search,refs,annotate}
│   └── rea-bridge/                  6 tools (TOOAl/rea 추적)
│       └── src/{helpers,tools}      ReaDoctor/Analyze/Inspect/Trace/Graph/Catalog
├── src/
│   ├── harness2/                    ⭐ NEW v2.3~2.4 — Harness² Self-Improving Brain
│   │   ├── harness.ts              380줄 SurfaceSpec/validate/autotrigger/diff (H1)
│   │   ├── context.ts              352줄 Evidence Tree MISSION.md (H2)
│   │   ├── proposer.ts             382줄 invariant/domain Proposer (H2)
│   │   ├── composer.ts             291줄 Compose+Selection behavioral contrast (H3)
│   │   ├── engine.ts               614줄 Harness2Engine parallel/sequential + FailureStore/Library (H3~H4)
│   │   ├── failures.ts             299줄 FailureStore/Failure Research .arena/harness2/failures.jsonl (H4)
│   │   ├── library.ts              256줄 HarnessLibrary .arena/harness2/library/<domain> (H4)
│   │   ├── guard.ts                Guard TODO/{{/budget 환각 검사 (H5 GPT-6 Astra)
│   │   └── depth.ts                249줄 RecurrentDepth depth1..5 earlyStop/bestScore (H5)
│   ├── cli.ts                       CLI v2.6 — --harness2/--k/--mode/--depth/--domain/--evidence-root/--dry-run + --fleet/--fanout + --mcp/--update/--agent
│   ├── fleet/                     ⭐ NEW v2.5 — Orca ADE Fleet (6모듈, ~1200줄)
│   │   ├── types.ts/store.ts     Run→Task→Dispatch→worker_done, DAG, circuit-breaker
│   │   ├── worktreeFleet.ts/dispatch.ts  fan-out N=16 + preamble + runWorker(queryLoop)+gh
│   │   └── coordinator.ts/worker.ts/cli.ts  supervised loop + 5 obligations + fleet CLI
│   ├── hooks/                       ⭐ NEW — preToolUse/postToolUse/preCompact 등
│   ├── mcp/                         ⭐ NEW — MCP stdio 서버 (Muse Code 호환)
│   ├── updates/                     ⭐ NEW — GitHub releases 추적/승인/적용
│   │   ├── checker.ts               GitHub API polling (ghidra+rea)
│   │   ├── store.ts                 .arena/updates.json 로컬 버전/기록 저장
│   │   └── apply.ts                 승인 후 적용 (dry-run 기본)
│   ├── loop/{queryLoop,context,permissions}
│   ├── config/{agentsMd,resolve,schema}
│   ├── session/{bootstrap,banner}
│   ├── sandbox/  eventLog/  worktree/  skills/  background/
│   ├── providers/ (6: arena/openrouter/gemini/groq/ollama/anthropic)
│   └── tools/{read,write,edit,bash,glob,grep,todo,webfetch,ghidra,registry}
├── tests/                           ⭐ — Vitest 47 tests (harness2 19 포함)
├── .github/workflows/ci.yml         ⭐ NEW — GitHub Actions
├── arena.config.example.json        업데이트 설정 포함
└── package.json (2.4.0)
```

---

## 2. 빠른 시작

### 요구사항
- Node.js >= 22.19.0, npm 11+

### 설치
```bash
cd arena-code
npm install
npm run build
cp .env.example .env  # GEMINI_API_KEY 등 설정
npm test              # 47 tests — 전체 통과 확인 (harness2 19 포함)
```

### Ghidra 설치 (바이너리 분석, 선택)
```bash
export GHIDRA_INSTALL_DIR=/path/to/ghidra_11.3_PUBLIC
npx rea-agents setup
npx rea doctor --provider ghidra --json  # healthy: true 확인
```

### 실행
```bash
# 대화형 (권장)
node dist/cli.js

# Headless
node dist/cli.js -p "버그를 찾아줘"

# 스킬 활용
node dist/cli.js --skill plan -p "인증 기능 설계해줘"
node dist/cli.js --skill ghidra -p "/tmp/app 분석해줘"

# 샌드박스 (Codex 스타일)
node dist/cli.js --sandbox read-only -p "파일 목록 보여줘"
node dist/cli.js --yolo -p "전체 시스템 정리해줘"   # 위험!

# Worktree 병렬 (Muse 스타일)
node dist/cli.js --worktree "feature-login" -p "로그인 기능 구현해줘"

# MCP 서버 (Claude Code/MCP 클라이언트 연동)
node dist/cli.js --mcp

# 업데이트
node dist/cli.js --update check                    # 확인
node dist/cli.js --update apply                    # 승인 후 적용
node dist/cli.js --update apply --update-target ghidra --yes --dry-run

# 설정 파일
cp arena.config.example.json arena.config.json
# → provider, sandbox, updates.repos 등을 프로젝트별로 고정
```

### 외부 에이전트 — 원하는 에이전트를 자유롭게 연결 ⭐ NEW

어떤 외부 에이전트든 한 번 등록하면 **provider로 선택**하거나 **도구로 위임** 가능:

```bash
# 1) 한 줄로 연결 (CLI)
arena-code --agent 'my-gpt=openai:https://api.openai.com/v1' --provider my-gpt
arena-code --agent 'codex=mcp:npx @openai/codex mcp'  # MCP 도구로
arena-code --agent 'local=http:http://localhost:8080/v1'
arena-code --agent-config ./my-agents.json  # JSON 파일로 여러 개

# 2) 영구 등록 (arena.config.json → agents[])
arena-code --list-agents   # 등록된 에이전트 목록 확인
```

```jsonc
// arena.config.json — agents 예시
{
  "agents": [
    { "id": "my-gpt", "transport": "openai", "baseUrl": "https://api.openai.com/v1", "apiKey": "${ENV:OPENAI_API_KEY}", "model": "gpt-4o-mini" },
    { "id": "codex-tools", "transport": "mcp", "command": "npx", "args": ["-y", "@openai/codex"], "provides": "tools" },
    { "id": "bridge", "transport": "module", "module": "./my-agent.js" },
    { "id": "runner", "transport": "command", "command": "./agent.sh" }
  ]
}
```

지원 transport: `openai/http` (LLM API), `mcp` (stdio/sse/http), `module` (로컬 JS), `command` (서브프로세스).
API 키는 `${ENV:KEY_NAME}` 또는 `${ENV:KEY:-fallback}` 치환 지원.

```bash
# 3) 대화형에서
/agent list                          # 목록
/agent add '{"id":"x","transport":"openai","baseUrl":"https://..."}'
/agent test my-gpt                   # 연결 테스트
/agent remove my-gpt
# 도구로 위임: 모델이 AskAgent({agentId, prompt})를 호출해 외부 에이전트에 위임
```

### Harness² Self-Improving Brain — 작업할수록 똑똑해지는 하네스 ⭐ NEW v2.3~2.4

Google Harness²(Apache 2.0, arXiv:2610.14224) + GPT-6 Astra recurrent depth를 Arena에 포팅 — 모델 가중치는 안 건드리고 **하네스(프롬프트/스킬/가드레일/도구)**만 개선. 정답지 없이도 **행동 대비(behavioral contrast)**로 편집을 가이드하고, 같은 도메인 반복 시 **Library**에 교훈을 축적해 점점 똑똑해짐.

```bash
# 기본: 1작업에 2후보(inv+domain) → Probe → Compose → Library
node dist/cli.js --harness2 --harness2-k 1 --harness2-mode parallel --harness2-dry-run --mock -p "로그인 기능 만들어줘"

# 깊게: sequential 2단계 + recurrent depth 3 + guard
node dist/cli.js --harness2 --k 2 --mode sequential --harness2-depth 3 --harness2-domain auth --mock -p "인증 연마"

# 도메인 학습: auth 도메인 Library에 저장 → 다음 auth 작업 시 자동 참조
node dist/cli.js --harness2 --harness2-domain auth --harness2-evidence-root .arena/harness2/evidence -p "로그아웃 추가"

# 전체 옵션
# --harness2                  Harness² 실행
# --harness2-k <n>            K 예산 1~5 (parallel: 탐험, sequential: 연마)
# --harness2-mode parallel|sequential
# --harness2-depth 1..5       GPT-6 Astra recurrent depth (바깥 루프, earlyStop/bestScore)
# --harness2-domain <name>    Library 도메인 (예: auth, payments)
# --harness2-evidence-root <path>  증거 트리 루트
# --harness2-dry-run          LLM 없이 휴리스틱 (데모/CI용)
# --harness2-no-guard         guard 비활성
# alias: --k/--mode/--evidence-root/--dry-run 도 동일
```

**증거 레이아웃:**

```
.arena/harness2/
├── evidence/<task>#d<depth>-step-<k>/MISSION.md + harness/ + final-harness/ + failure-research.json
├── evidence/<task>-depth-summary.json + <task>-best-harness.json
├── failures.jsonl             실패 저장 + 대체 전략 연구 (single-inv/dom/shrink…)
└── library/<domain>/INDEX.md + harnesses/<task>/harness + EXPERIENCE.md  — 다음 작업에 자동 주입
```

상세 설계: `arena-code/docs/HARNESS2_REA_ANALYSIS.md`(H1~H5 구현 로그), `arena-code/docs/ORCA_ADE_REA_ANALYSIS.md`(Fleet O1~O3 로드맵, 다음 단계)


### 대화형 명령어
```
/help, /clear, /status, /config, /tools
/plan <요청>  /grill  /goal <목표>  /ghidra <요청>
/worktree <task>  /sandbox <mode>  /resume
/update [check|apply]  /hooks
/agent [list|add|remove|test]       ⭐ NEW
```

---

## 3. 외부 패키지 & Ghidra·REA 업데이트

### 외부 패키지
| 패키지 | 추적 대상 | 내용 |
|--------|-----------|------|
| `@arena-code/ghidra-tools` | `NationalSecurityAgency/ghidra` | 29 바이너리 도구 |
| `@arena-code/rea-bridge` | `TOOAl/rea` | 6 REA 도구 |

- `arena.config.json` → `updates.repos`에서 감시 대상 지정/추가 가능
- 내부 `src/tools/ghidra/`는 외부 패키지의 shim으로 유지 (하위 호환)

### 업데이트 흐름
```
GitHub Releases API (--update check)
  → .arena/updates.json 저장 + 알림
  → 사용자가 승인 (/update apply 또는 --update apply --yes)
  → apply.ts가 대상별 전략으로 적용
     - ghidra: 다운로드 안내 (OS 설치물이라 자동 치환 불가)
     - rea/arena-code: 안내 또는 npm update
```

```
# CLI
arena-code --update check
arena-code --update apply --update-target ghidra
arena-code --update apply --yes --dry-run

# 대화형
/update:check
/update apply rea
```

`updates.enabled=false` 또는 `updates.autoCheck=false`로 자동 체크 끄기.

### Ghidra 업데이트만 갱신하는 이유
Ghidra는 OS 레벨 설치물(`GHIDRA_INSTALL_DIR`)이라 Arena 내부에서 덮어쓰지 않습니다.
→ `apply`는 **다운로드 URL + 설치 안내**만 출력하고, 사용자가 직접 재설치합니다.

---

## 4. Hook & MCP

### Hook (`src/hooks/`)
```ts
// .arena/hooks/my-hook.js  (JS 파일로 로드)
export const hooks = [
  { event: "preToolUse", handler: async (ctx) => {
      if (ctx.toolName === "Bash" && ctx.input.command.includes("rm -rf"))
        return { block: true, reason: "blocked by policy" };
  }},
  { event: "postToolUse", handler: async (ctx) => ({ modifiedResult: ctx.result.slice(0, 1000) }) },
];
```

이벤트: `sessionStart | preToolUse | postToolUse | postTurn | preCompact | sessionEnd`
(`/hooks`로 활성 목록 확인)

### MCP Server (`--mcp`)
```json
// Claude Code MCP 설정 예시
{ "mcpServers": { "arena-code": { "command": "node", "args": ["/path/to/arena-code/dist/cli.js", "--mcp"] } } }
```
stdio JSON-RPC: `initialize / tools/list / tools/call / ping`

---

## 5. Provider 선택 (무료)

| Provider | 추천 모델 | 특징 | 키 발급 |
|----------|-----------|------|---------|
| **Gemini Free** | gemini-2.0-flash | 1M 컨텍스트 ⭐ | aistudio.google.com |
| **OpenRouter Free** | deepseek-r1:free | 모델 가장 많음 | openrouter.ai/keys |
| **Groq Free** | llama-3.3-70b | 500 tok/s | console.groq.com |
| **Ollama** | qwen2.5-coder:14b | 오프라인 무료 | ollama.com |
| **Arena Agent** | arena-agent | Arena 크레딧 내 | ARENA_API_URL |

---

## 6. 3사 비교 vs Arena Code v2.4 (Harness² 포함)

| 구분 | Claude Code | Codex CLI | Muse Code | **Arena Code v2.2** |
|------|-------------|-----------|-----------|---------------------|
| 도구 | 40+ | 30+ | 40+ | **43개 (8+29+6) + harness2 9모듈** |
| 샌드박스 | 7단계 | **3단계** | OS | **3단계 통합** |
| 병렬 | Subagents | Cloud Tasks | **Worktree** | **Worktree** |
| 지속성 | 세션 내 | 세션 내 | **EventLog** | **EventLog + resume** |
| 스킬 | Skills/Hooks | Skills | **/plan/grill/goal/loop** | **5 Skills + Hooks** |
| 백그라운드 | 없음 | 없음 | **4 Observers** | **4 Observers** |
| 바이너리 | 없음 | 없음 | 없음 | **Ghidra 29 + REA 6** |
| MCP 서버 | ✅ | ✅ | ✅ | **✅ (--mcp)** |
| 업데이트 추적 | — | — | — | **GitHub releases + 승인/적용** |
| 외부 에이전트 허브 | — | — | — | **openai/mcp/module/command 무제한** |
| **Self-Improving Brain** | — | — | — | **Harness² H1~H5: Propose-Probe-Compose + Library + FailureStore + Guard + Depth** |
| 품질 | — | — | — | **Vitest 47 + CI + ESLint/Prettier (harness2 19)** |
| 비용 | 유료 | ChatGPT Plus | 내일/유료 | **무료 API $0** |

---

## 7. 라이선스

MIT — REA와 동일. Ghidra는 Apache 2.0.
