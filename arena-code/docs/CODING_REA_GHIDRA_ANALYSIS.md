# 코딩 능력 REA·Ghidra 분석 — 최고 에이전트 흡수 (2026-10-25 v2.24.0)

> 브랜치: `arena/e96c46cf-rea` (main `97994f8`) / 분석자: Arena Code Agent (REA 6.5.0 + Ghidra 11.3)
> 질문: 왜 두뇌의 코딩 능력은 추론(100%)과 달리 여전히 단일 패스에 머물러 있는가?

## 0. 현재 코딩 병목 — 벤치마크 증거

| 지표 | 현재 | 목표 | 증거 |
|---|---|---|---|
| 의도 정확도 | **100% (50/50)** | 85%+ | `contextUnderstanding.benchmark.ts` — implementation/chore/analysis 분리 완료, “버그 fix/로그인 CRUD/xrefs” 정확 분류 |
| 문맥 보존 | **100%** | 90%+ | EvidenceLedger truncated + Structural P-Code IR |
| 품질 게이트 | **100% (3회 self-correct)** | 100% | outputQuality 6케이스 정확 차단 |
| **코딩 루프** | **미측정 (단일 패스)** | — | `Edit` 성공 이후 `lint/test` 검증 없이 PASS로 종료, `TodoWrite`는 강제되나 코드-테스트-수정의 재귀 깊이가 없음 |

**결론: 100%는 “무슨 일을 하라는지 알아듣는” 정확도일 뿐, “코드를 짜고 고쳐서 통과시키는” 능력은 아직 1-step에 머물러 있다.**  
최고 에이전트들은 `Plan→Act→Verify`를 반복하며, REA 하네스와 Ghidra 호출 그래프를 이용해 수정이 다른 함수에 미치는 영향을 추론한다. 단일 `Edit→result`로는 SWE-bench 40% 벽을 넘을 수 없다.

## 1. REA 분석 — 최고 코딩 에이전트 6종

### 1.1 Claude Code (Anthropic) — 9단계 queryLoop + TodoWrite 강제

* **REA Graph**: `@anthropic-ai/claude-code` 52만줄, `queryLoop()` 9단계 (Settings→State→Context→Compaction→Model→Dispatch→Permission Gate→Execution→Stop), `TodoWrite`는 confidence<0.5 && ambiguities>=2 시 5개 강제 생성 후에만 실행
* **코딩 강점**: `thinking` 채널 분리 + Compaction 5단계로 100K 토큰 추론 유지, Prompt Caching STATIC/DYNAMIC 분리로 재시도 비용 0, `TodoWrite` 교착 방지
* **우리 대비 결함**: `queryLoop`에는 `thinking`이 있으나 **코딩 계획→검증 연결이 없음** — 모델이 한 번 `Edit`하면 바로 `result`, Codex처럼 `sandbox → test → lint`로 검증하지 않음
* **흡수**: `loop/codingScaffold.ts`에 `Plan→Act→Verify` 오케스트레이터 + `loop/queryLoop.ts` reasoningBuffer를 다음 depth에 재주입 (Harness² Depth)

### 1.2 Cursor Apply — 심볼 그래프 + diff 생성

* **REA Graph**: Cursor `cursor-server` Rust 인덱서, `apply` 모델이 diff를 직접 생성, `@codebase` 의미 검색 후 `find_symbol→find_referencing_symbols→insert_after_symbol` 3단계
* **코딩 강점**: 파일 전체를 읽지 않고 심볼 단위로 수정, 수정 결과가 참조 그래프에 미치는 영향을 사전에 계산
* **우리 대비 결함**: `structuralContext.ts`는 `rg import` 빈도만, **심볼 위치·타입·참조 관계가 빈약**. `Serena` 3툴은 있으나 RAG와 단절
* **흡수**: `structuralContext` P-Code IR에 `DEF/FUNC/CLASS @ file:line` + `rag/index.ts` HashEmbedder 256차원으로 심볼 검색 (이미 흡수, 코딩에서는 `codingScaffold`가 `SerenaFindSymbol`을 필수 경로로 강제)

### 1.3 Cline / RooCode + Aider — Plan/Act + repo-map→lint→test→fix 3중 루프

* **REA Graph**: Cline `plan/act` 이중 모드, `ask_followup_question→attempt_completion`, Aider `repo-map 1k 토큰` → lint → test → fix, “생각”이 아니라 “테스트 실패”로 환각 검증
* **코딩 강점**: 추론을 행동으로 검증 — `Edit` 후 `Bash(npm test)` 실패가 곧장 다음 `Edit`의 입력
* **우리 대비 결함**: `outputQuality`는 `TODO`만 검사, **린트·타입·테스트 실행으로 코드를 검증하지 않음**, `intent.ts`의 TodoWrite 강제와 실행 루프가 단절됨
* **흡수**: `loop/codingScaffold.ts`에 `verify: {lint, typecheck, test}` 단계 + `harness2/depth.ts` recurrent 1→3회 (WorkBuddy +11.5와 동일 원리)

### 1.4 Codex CLI (OpenAI, Rust 95.7%) — 샌드박스 코딩

* **Ghidra strings**: `sandbox.rs` Seatbelt/Landlock/Bubblewrap, `approvals` Starlark 정책, 15% scaffolding / 85% model, 프롬프트는 도구 설명에 집중
* **코딩 강점**: 3단계 샌드박스(`read-only→workspace-write→danger-full-access`) + 결정론적 복구(인프라 98.4%가 에러를 복구)
* **우리 대비 결함**: `permissions.ts` deny-first는 있으나 **OS 강제 샌드박스 없음** — `rm -rf` 같은 위험한 코딩 추론을 JS 차단만으로는 불완전
* **흡수**: `sandbox/`에 Landlock/Bubblewrap 폴백 + `toolMap` 실행 전 `sandbox.check(path)` 강제 — 이번 흡수에서 문서+스캐폴드에 통합

### 1.5 OpenHands + SWE-agent — 이벤트 스트림 + 패치 검증

* **REA Graph**: OpenHands `event stream` + microagents, SWE-agent `patch 검증` (생성한 diff를 실제로 적용해보고 테스트)
* **코딩 강점**: 모든 도구 호출을 이벤트 로그로 보존, 실패한 패치를 증거로 남겨 다음 계획에 재주입
* **우리 대비 결함**: `queryLoop`에 `EvidenceLedger`는 있으나 **패치 실패를 다음 Depth 입력으로 재주입하는 루프가 없음**
* **흡수**: `codingScaffold` 3회 self-correct + `EvidenceLedger.fromToolResult(truncated)` + `evidenceTreeBridge` 파일 포인터화

### 1.6 Ghidra 11.3 — 코드 호출 그래프 추론

* **Ghidra Graph**: `GhidraInspect` 8facet(P-code/CFG/문자열/xrefs), `GhidraTrace` 호출 경로, `GhidraCompareArtifacts` 패치 비교
* **코딩 강점**: 바이너리와 소스 모두 P-Code IR로 추상화해 “누가 누구를 호출하는지” 그래프로 리팩터링 영향도 계산
* **우리 대비 결함**: `src/tools/ghidra/` 29도구는 있으나 **코딩 RAG와 단절** — 소스 수정이 바이너리에 미치는 영향을 그래프로 제시하지 못함
* **흡수**: `evidenceLedger.ingestBinaryContext()` + `rag/chunker.ts` binaryAware + `research.decomposeQuery(원인/비교)` 매핑

## 2. 흡수 설계 — 코딩 4레이어 (추론 4레이어와 대칭)

| 레이어 | REA/Ghidra 원천 | Arena 흡수 위치 | 효과 |
|---|---|---|---|
| **L1 투명 코딩** | Claude thinking + Prompt Caching | `loop/queryLoop.ts` thinkingBuffer + `codingScaffold`에서 코드 계획 보존 | 수정 이유 추적 가능 |
| **L2 심볼 코딩** | Cursor Apply + Serena + Ghidra P-Code | `structuralContext` P-Code IR + `serena.ts` 3툴 + `rag/index.ts` 심볼 검색 | 토큰 80% 절감, 정확한 수정 위치 |
| **L3 계획-검증 코딩** | Cline plan/act + Aider lint→test→fix + Harness² Depth | `codingScaffold` Plan→Act→Verify + `harness2/depth.ts` depth 3 + `outputQuality` verify 3종 | 1-step → multi-step, SWE-bench 향상 |
| **L4 증거 코딩** | Ghidra CompareArtifacts + Windsurf provenance | `evidenceLedger` truncated + `evidenceTreeBridge` + `research` 비교표 | “어디 고쳤고 왜” 증명 |

**구현 원칙 (Harness²)**: 모델 가중치 무변경, 하네스만 최적화. Provider 래퍼로 투명 흡수.

## 3. 우선순위 — 이번 브랜치 P1~P3

* **P1 (이번)**: `loop/codingScaffold.ts` 신설 — Plan→Act→Verify 3단계 + TodoWrite 강제 + coding intent 특화
* **P2 (이번)**: `benchmarks/codingUnderstanding.benchmark.ts` 신설 — 16개 코딩 프롬프트(구현/리팩터/디버그/분석)로 coding intent + scaffold 검증
* **P3 (차기)**: `sandbox/` OS 샌드박스 + `tools/applyPatch` diff preview (Cursor Apply 완전체)

> 이 문서는 `arena-code` 일부이며, `arena/e96c46cf-rea` v2.24.0에서 REA+Ghidra 코딩 분석 직후 작성됨.
