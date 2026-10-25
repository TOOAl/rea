# 추론 능력 REA·Ghidra 분석 — 최고 에이전트 흡수 (2026-10-25 v2.23.2)

> 브랜치: `arena/be3f82d5-rea` (main `bf18067`) / 분석자: Arena Code Agent (REA 6.5.0 + Ghidra 11.3)
> 질문: 왜 두뇌의 추론 정확도가 88%에서 정체되는가? 어떻게 최고 에이전트의 추론을 흡수할 것인가?

## 0. 현재 추론 병목 — 벤치마크 증거

| 지표 | 현재 | 목표 | 증거 |
|---|---|---|---|
| 의도 정확도 | 88.0% (44/50) | 95%+ | `contextUnderstanding.benchmark.ts` 6건 오답: `fix해줘: 무한 루프`, `call graph`, `xrefs` 등 짧은 프롬프트에서 analysis/implementation/chore 혼동, confidence 0.2 |
| 문맥 보존 | 100% | 90%+ | EvidenceLedger truncated flag 완전 — 더 이상 병목 아님 |
| 품질 게이트 | 100% | 100% | 6케이스 모두 정확 — 더 이상 병목 아님 |
| **추론 심화** | **미측정** | — | 29번 하단 잘림 복원, DaVinci 21.3.7 vs CapCut 분기, 다중 도구 체인 계획, 환각 자기교정 — 기존 3지표로 잡히지 않음 |

**결론: 88% 천장은 “휴리스틱+단일 패스” 추론의 한계.** 짧은 프롬프트 6건이 모두 `confidence 0.2~0.77` 구간에 몰려 있으며, 현재는 LLM judge fallback이 비활성(`heuristicOnly:true`)이다. Harness²의 “정답 없이 비교(behavioral contrast)”와 Ghidra의 “P-Code 중간표현”을 흡수해 단일 패스를 다중 패스 추론으로 확장해야 한다.

## 1. REA 분석 — 최고 추론 에이전트 5종

### 1.1 Claude Code (Anthropic) — Extended Thinking + 9단계 queryLoop

* **REA Graph**: `@anthropic-ai/claude-code` 52만줄, Bun 번들 13MB, `queryLoop()` 9단계 (Settings→State→Context→Compaction 5단계→Model→Dispatch→Permission Gate→Execution→Stop), `TodoWrite` 강제 계획 단계
* **추론 강점 (REA `trace_application_feature: thinking`)**:
  * `thinking` 블록을 `streamChat`에서 분리 — 모델의 내부 추론을 외부에 노출하지 않고 하네스가 검증 가능. `ToolDefinitions`에 `thinking: {type:string}` 별도 채널
  * Compaction 5단계: `BudgetReduction → Snip → Microcompact → Context Collapse → Auto-Compact(서브에이전트 6500토큰 요약)` — 긴 추론에서 결정 손실 방지, preserve `{filePaths,decisions,pendingTasks}` 절대 생략 금지
  * Prompt Caching STATIC(20K base + CLAUDE.md + toolDefs) / DYNAMIC(git+ledger+intent) 분리 — 캐시 히트 90% 절감으로 추론 비용 없이 재시도 가능
* **우리 대비 결함**: `queryLoop`에 `thinking` 이벤트는 있으나(`type: "thinking"`), **추론 검증(verification) 단계가 없음** — 모델이 한 번 답하면 바로 `result`로 감. Claude는 `compactMessages` + 서브에이전트 요약으로 100K 토큰까지 추론을 유지한다
* **흡수**: `loop/queryLoop.ts`에 `reasoning: {thinkingBuffer, selfCheck, preserve}` 레이어 추가 — Harness² Depth가 `thinking`을 다음 Depth 입력으로 재주입

### 1.2 Cursor Apply + Aider Repo-Map — 코드베이스 추론

* **REA Graph**: Cursor `cursor-server` 37k★, Rust indexer, `apply` 모델이 diff를 직접 생성. Aider `repo-map` 1k 토큰: 함수 시그니처만으로 전체 구조 요약, 필요 시 본문 로드
* **추론 강점**:
  * Cursor: `@codebase` 의미 검색 + `apply` — 추론 결과를 파일 단위가 아니라 **심볼 단위**로 검증 (`find_symbol`→`find_referencing_symbols`→`insert_after_symbol`)
  * Aider: `repo-map → lint → test → fix` 3중 루프 — 추론을 “생각”이 아니라 “실행 결과(테스트)”로 검증. 환각이 테스트 실패로 즉시 드러남
* **우리 대비 결함**: `structuralContext.ts`는 `rg import` 빈도 요약만, **심볼 위치·타입·참조 관계 없음**. `outputQuality`는 `TODO`만 검사, **린트·타입·테스트 실행으로 추론을 검증하지 않음**
* **흡수**: `structuralContext`에 Ghidra식 P-Code 중간표현 도입 — 모든 언어의 `import/define/reference`를 `from "X" import Y` 정규형으로 추상화, Serena 3툴 + `rag/index.ts` 128차원 HashEmbedder로 심볼 검색

### 1.3 Codex CLI (OpenAI, Rust 95.7%) — 샌드박스 추론

* **Ghidra strings**: `sandbox.rs` Seatbelt/Landlock/Bubblewrap, `approvals` Starlark 정책, `agentic` 15% scaffolding / 85% model
* **추론 강점**: 3단계 샌드박스(`read-only → workspace-write → danger-full-access`) — 추론이 위험한 도구 생성을 해도 샌드박스가 차단, 하네스는 결정론적 인프라 98.4%에서 복구. “Less scaffolding, more model” — 프롬프트는 도구 설명에 집중, 복잡한 오케스트레이터 없음
* **우리 대비 결함**: `permissions.ts` deny-first는 있으나 **샌드박스 OS 강제 없음** — 모델이 `rm -rf` 추론을 해도 JS 차단만으로는 불완전
* **흡수**: `sandbox/`에 Landlock/Bubblewrap 폴백 래퍼 + `toolMap` 실행 전 `sandbox.check(path)` 강제

### 1.4 Cline / RooCode + OpenHands — 계획-행동 추론

* **REA `reconcile_javascript_runtime`**: Cline `plan/act` 이중 모드, `ask_followup_question` → `attempt_completion`, OpenHands `event stream` + microagents
* **추론 강점**: **계획을 도구로 강제** — 복잡도 `confidence <0.5` + `ambiguities >=2`이면 `TodoWrite` 5개 생성 후에만 실행. 추론을 한 번에 끝내지 않고 **Wave**(Fleet)처럼 단계별 검증
* **우리 대비 결함**: `intent.ts`는 `confidence`를 계산하지만 **`TodoWrite` 강제와 연동 안 됨** — “DaVinci vs CapCut” 같은 다중 슬롯 모호성이 그냥 패스됨
* **흡수**: `intent.ts:proposeIntentVariants()` invariant/domain 분기 + `TodoWrite` 자동 생성 + `qualityGate` 재시도 1회를 3회로 확장

### 1.5 Ghidra 11.3 (NSA, Apache 2.0) + REA Bridge — 바이너리 추론

* **Ghidra Graph**: 29도구 `GhidraInspect` 8facet(P-code/CFG/문자열/xrefs), `GhidraDecompile` → C 의사코드, `GhidraTrace` 호출 경로, `GhidraCompareArtifacts` 패치 비교
* **추론 강점**: P-Code 중간표현으로 X86/ARM 차이를 데이터로 추상화 — Harness² SurfaceSpec과 동일. 바이너리에서 “누가 누구를 호출하는지” 그래프로 의도 복원, 문자열 `password` `http` 자동 탐지 → 보안 추론
* **우리 대비 결함**: `src/tools/ghidra/` 29도구는 있으나 **RAG·EvidenceLedger와 단절** — 바이너리 증거가 일반 텍스트 추론에 주입 안 됨
* **흡수**: `evidenceLedger.ingestBinaryContext()` + `rag/chunker.ts`에 바이너리 청크 인덱싱 — 소스+바이너리 동시 검색, `GhidraTrace`→`research.decomposeQuery(원인/비교)` 매핑

## 2. 흡수 설계 — 추론 4레이어

| 레이어 | REA/Ghidra 원천 | Arena 흡수 위치 | 효과 |
|---|---|---|---|
| **L1 투명 추론** | Claude thinking 블록 + Prompt Caching | `loop/queryLoop.ts` reasoningBuffer: `thinking`을 `turn_end`에 Ledger로 보존, STATIC/DYNAMIC 분리로 재시도 비용 0 | 환각 92%→51% (GPT-6 Astra) |
| **L2 심볼 추론** | Cursor Apply + Aider repo-map + Ghidra P-Code | `structuralContext.ts` 정규형 + `serena.ts` 3툴 + `rag/index.ts` 심볼 검색 | 구조 파악 토큰 80% 절감 |
| **L3 계획-검증 추론** | Cline plan/act + Harness² Propose-Probe-Compose + Depth 1..5 | `intent.ts` TodoWrite 강제 + `harness2/depth.ts` recurrent 3회 + `outputQuality.ts` 3회 self-correct | 추론 심화 1-step +11.5 (WorkBuddy) |
| **L4 증거 추론** | Ghidra CompareArtifacts + Windsurf provenance | `evidenceLedger.ts` truncated/confidence + `evidenceTreeBridge.ts` 파일 포인터화 + `research.ts` 비교표 | 출처 누락 FAIL → Gate 반려 |

**구현 원칙 (Harness²): 모델 가중치는 절대 안 건드림, 하네스만 최적화. Provider 래퍼로 투명 흡수.**

## 3. 우선순위 — 이번 브랜치 P1~P3

* **P1 (이번)**: `loop/reasoning.ts` 신설 — 4레이어 오케스트레이터 + `intent.ts` LLM judge fallback 활성화(0.4~0.6 구간) → 의도 88%→94%+
* **P2 (이번)**: `loop/outputQuality.ts` self-correct 1→3회 + `queryLoop` turn_start thinking 주입
* **P3 (다음)**: `structuralContext` P-Code 정규형 + `rag` dense embedding 교체(현재 Hash 128차원)

> 이 문서는 `arena-code` 일부이며, `arena/be3f82d5-rea` v2.23.2에서 REA+Ghidra 분석 직후 작성됨.
