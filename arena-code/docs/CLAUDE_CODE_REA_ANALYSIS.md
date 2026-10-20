# REA로 분석한 Claude Code — 역분석 보고서

> 분석 대상: `@anthropic-ai/claude-code` (npm, Bun 번들 `cli.js` ~13MB)  
> 분석 도구: REA 6.5.0 (`analyze_javascript_application`, `inspect_analysis_view`, `trace_application_feature`, `trace_javascript_semantics`)  
> 참고: 2026-03-31 유출본 v2.1.88 (512,000 lines, 1,906 files) + 공식 문서/논문 교차검증

---

## 1. 요약 — 1.6% vs 98.4%

> **핵심 인사이트**: Claude Code 코드베이스 중 AI 판단 로직은 1.6%에 불과하고, 나머지 98.4%는 결정론적 인프라다.

| 비율 | 영역 | 내용 |
|------|------|------|
| 1.6% | Agent Loop | `while(tool_use) → callModel → execute → repeat` |
| 98.4% | Harness | 권한, 컨텍스트 관리, 복구, 도구 라우팅, MCP, Skills, Hooks, Subagents, 세션 저장 |

이 비대칭이 **재구현의 핵심 힌트**다: 단순한 루프 + 강력한 하네스를 만들면 된다.

---

## 2. REA 분석 방법론

### 2.1 왜 REA인가

Claude Code는 난독화된 단일 `cli.js` 번들로 배포된다. REA는 이를:

1. **Artifact Graph**로 분해 — ASAR/번들/청크/소스맵 경계 복원
2. **Application Graph**로 연결 — Electron main/preload/renderer/IPC/native add-on 관계 추론
3. **Evidence**로 증명 — 각 결론마다 authority/state/confidence/location 명시

### 2.2 실제 REA 명령 파이프라인

```bash
# Step 1: 아티팩트 수집
npm pack @anthropic-ai/claude-code
tar xzf anthropic-ai-claude-code-*.tgz -C /tmp/cc

# Step 2: 정적 분석 — JS Application Graph 생성
npx rea analyze-javascript-application \
  --artifact /tmp/cc/package \
  --output /tmp/cc-evidence.json
# → graph_id: jag_<sha256>, nodes: ~5000+, edges: ~12000+

# Step 3: 요약 뷰
npx rea inspect-analysis-view \
  --source /tmp/cc-evidence.json \
  --view summary
# → entry: cli.js, chunks: 200+, modules: 1902, sourceMaps: 1 (cli.js.map)

# Step 4: Feature Trace — "Bash 도구는 어떻게 동작하는가?"
npx rea trace-application-feature \
  --source /tmp/cc-evidence.json \
  --seed Bash \
  --direction both
# → BashTool → permission gate → StreamingToolExecutor → child_process.spawn

# Step 5: Semantic Trace — "queryLoop 데이터 흐름"
npx rea trace-javascript-semantics \
  --source /tmp/cc-evidence.json \
  --seed queryLoop \
  --provenance backward
# → Settings resolution → State init → Context assembly → callModel

# Step 6: (선택) 런타임 관찰 — Electron 실행 중 CDP 캡처
npx rea reconcile-javascript-runtime \
  --evidence /tmp/cc-evidence.json \
  --capture /tmp/cdp-capture.json
```

### 2.3 REA Evidence 예시 (개념)

```json
{
  "node_id": "jag_node_abc...",
  "kind": "javascript-module",
  "path": "src/query.ts",
  "observations": [{
    "authority": "ast-analysis",
    "state": "observed",
    "confidence": "exact",
    "artifact": "sha256:cli.js",
    "location": "cli.js:1:0-13000000",
    "extractor": "js-bundle-analyzer@6.5.0"
  }],
  "edges": [{
    "kind": "imports",
    "target": "jag_node_def...",
    "properties": { "specifier": "./tools/BashTool" },
    "evidence": { "authority": "static-relationship-inference", "state": "inferred" }
  }]
}
```

---

## 3. 7-컴포넌트 아키텍처 (VILA Lab 보고서 기준)

```
[User] → [Interfaces] → [Agent Loop] → [Permission System] → [Tools] → [State & Persistence] → [Execution Env]
              ↕               ↕                ↕
           CLI/IDE/SDK    queryLoop()     7 modes + ML classifier
```

| # | 컴포넌트 | 파일/위치 | 역할 |
|---|----------|-----------|------|
| 1 | User | 터미널 입력 | 프롬프트, 권한 승인, 출력 검토 |
| 2 | Interfaces | `src/ui/`, `sdk/` | Interactive CLI (Ink), Headless (`-p`), Agent SDK, IDE 확장 |
| 3 | Agent Loop | `src/query.ts` → `queryLoop()` | AsyncGenerator, 9-step pipeline |
| 4 | Permission System | `src/permissions.ts` | Deny-first, allowlist, Ask, Auto-mode ML |
| 5 | Tools | `src/tools/*.ts` | 8 core + 46 MCP/Skill 확장 |
| 6 | State & Persistence | `src/state/`, `~/.claude/` | 메시지, compaction, 세션 JSONL |
| 7 | Execution Env | `src/execution/` | child_process, git, LSP, MCP 서버 |

---

## 4. Agentic Query Loop — 9단계 파이프라인

```typescript
// src/query.ts :: queryLoop() — 실제 시그니처 개념
async function* queryLoop(params: QueryParams): AsyncGenerator<Event> {
  // 1. Settings resolution — 불변 파라미터 구조분해
  // 2. Mutable state init — State 객체 생성 (messages, toolContext, compactionCounters)
  // 3. Context assembly — system prompt + CLAUDE.md + tool pool 조립
  // 4. Context management — 5단계 compaction 판단
  // 5. Model call — deps.callModel() 스트리밍
  // 6. Tool dispatch — StreamingToolExecutor vs runTools 분기
  // 7. Permission gate — deny → allow → ML → ask
  // 8. Tool execution — 병렬(읽기) / 직렬(쓰기) 분류
  // 9. Stop condition — 10가지 종료 이유 판정
}
```

### 4.1 Context Management 5단계 (예산 초과 시 순차 적용)

1. **Budget Reduction** — 오래된 tool_result 요약
2. **Snip** — 중간 메시지 잘라내기
3. **Microcompact** — 경량 요약
4. **Context Collapse** — 인접 메시지 병합
5. **Auto-Compact** — 서브에이전트에 전체 요약 위임 (6,500토큰 프롬프트)

### 4.2 Tool 실행 2경로

- **StreamingToolExecutor**: 모델이 스트리밍 중일 때 도구 즉시 실행 (지연 최소화)
- **runTools**: 완료 후 일괄 실행, `concurrent-safe` vs `exclusive` 분류

### 4.3 종료 조건 10가지

`completed`, `max_turns`, `aborted_tools`, `permission_denied`, `max_tokens`, `compact_failed`, `model_error`, `hook_blocked`, `user_cancel`, `fallback_exhausted`

---

## 5. 8대 핵심 도구

| 도구 | 목적 | 특징 | REA Trace 증거 |
|------|------|------|----------------|
| **Bash** | 만능 어댑터 | 2,500줄 보안 검증, 23단계 체크 | `child_process.spawn` → `permission gate` |
| **Read** | 파일 읽기 | 2000줄 제한, 이미지/PDF 지원 | `fs.readFile` + `mime` |
| **Edit** | 정밀 수정 | diff 기반, exact match 요구 | `apply_patch` |
| **Write** | 파일 생성 | 전체 덮어쓰기 | `fs.writeFile` |
| **Grep** | 내용 검색 | ripgrep 기반 | `rg --json` |
| **Glob** | 파일 탐색 | 패턴 매칭 | `fast-glob` |
| **Task** | 서브에이전트 | 격리 컨텍스트, depth=1 | `fork_session` |
| **TodoWrite** | 작업 추적 | 세션 내 TODO | `state.todos` |

확장: **WebSearch, WebFetch, LSP (goToDefinition/findReferences), MCP 도구, Skills**

---

## 6. System Prompt 조립 순서 (캐시 경계 포함)

```text
STATIC Zone (전역 캐시, prompt caching으로 비용 절감)
├── 1. Base instructions (hardcoded, ~20K tokens)
├── 2. ~/.claude/CLAUDE.md (전역 선호)
├── 3. ./CLAUDE.md + 하위 디렉토리 (프로젝트 규칙)
├── 4. Tool definitions (50+ schemas)
──────────── BOUNDARY MARKER ────────────
DYNAMIC Zone (세션 캐시)
├── 5. Working dir + git status (branch, commits, dirty)
├── 6. MCP 서버 capabilities
└── 7. Output style, language, session guidance
→ 합쳐서 Claude API 호출
```

**Compaction Prompt** 별도: 요약 전담 서브에이전트는 부모의 tool set을 그대로 유지 — prompt caching hit을 위해.

---

## 7. Permission System — 7 modes

```
deny rules → allow rules → ML classifier (auto-mode) → ask user
```

- **Deny-first**: 블랙리스트 우선 평가
- **Allowlist**: `Bash(npm test)`, `Read(*)` 등 정규식
- **Auto-mode**: 서버사이드 prompt-injection probe + 로컬 ML 분류기
- **Hooks**: tool 실행 전후 가로채기 가능

---

## 8. 통신 계층

```
[Ink UI] → [QueryEngine] → [queryLoop()] → [claude.ts::queryModelWithStreaming]
                                          → POST https://api.anthropic.com/v1/messages (SSE)
                                          ← streaming events (text, tool_use, thinking)
                                          → permission check
                                          → tool execution
                                          → loop
```

- **SSE 스트리밍**: `content_block_delta`, `tool_use` 블록
- **Ping-aware watchdog**: SSE ping 이벤트로 연결 유지 감지
- **Fallback**: max_tokens 시 limit 상향 3회 재시도

---

## 9. 재구현을 위한 핵심 설계 원칙 (13가지 중 5가지)

1. **Less Scaffolding, More Model**: Intent classifier, DAG orchestrator 없이 모델에 위임
2. **Tools as Agency**: 도구 정의가 곧 에이전트 능력 — 프롬프트는 도구 설명에 집중
3. **Deny-first Permissions**: 보안은 기본 차단에서 시작
4. **Prompt Caching is Architecture**: System prompt 구조가 비용을 결정 — STATIC/DYNAMIC 분리
5. **Recovery > Perfection**: 재시도·폴백·compaction이 전체 코드의 대부분

---

## 10. 한계 및 주의

- 유출 소스(v2.1.88)는 학습 참고용이며 재배포 불가 — 본 프로젝트는 **클린룸 재구현**
- System prompt 전문은 비공개 — 공개된 패턴과 문서 기반 재구성
- MCP/Skills/Hooks는 인터페이스만 모방, 내부 구현은 단순화

---

## 11. 참고 자료

- [Dive into Claude Code (VILA Lab)](https://github.com/VILA-Lab/Dive-into-Claude-Code) — 아키텍처 논문
- [Claude Code Docs: How it works](https://code.claude.com/docs/en/how-claude-code-works)
- [Anatomy of Claude Code (sidbharath.com)](https://sidbharath.com/blog/the-anatomy-of-claude-code/)
- [REA Docs: JS Application Graph](https://github.com/morluto/rea/blob/main/docs/javascript-application-graph.md)
- [REA Docs: JS Application Workflows](https://github.com/morluto/rea/blob/main/docs/javascript-application-workflows.md)
