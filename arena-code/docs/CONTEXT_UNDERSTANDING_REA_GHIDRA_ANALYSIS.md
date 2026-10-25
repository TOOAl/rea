# 맥락 이해 능력 REA+Ghidra 분석 — 최고 에이전트 흡수 보고서 (2026-10-25)

> 대상 브랜치: `arena/467cdf9a-rea` / 요청: 두뇌의 맥락 이해 부족
> 분석 도구: REA 6.5.0 (JS Application Graph) + Ghidra 11.3 (바이너리 역분석)
> 분석자: Arena Code Agent + REA

## 0. 문제 진단 — 현재 결함 3가지 (BASE_CAPABILITY_IMPROVEMENT.md §0)

1. **문맥 유실**: `context.ts`가 `AGENTS.md + git status + 4char=1token` 근사로만 조립 → 이미지 하단 잘림(29번 `what leaders...` 유실)을 truncated로 표시 못하고 환각.
2. **의도 오판**: `queryLoop`가 메시지 구분 없이 패스 → "DaVinci 21.3.7 ENG, 548MB" 설치 정보를 무시하고 CapCut 가이드 반환.
3. **품질 누출**: guard가 harness 파일만 검사, 최종 답변의 밑줄/정답노출/출처 없음은 미검증.

→ 파이프라인: **문맥(입력 보존) → 의도(판단) → 품질(출력 검증)**

## 1. REA 분석 — 최고 에이전트 6종

### 1.1 Claude Code (Anthropic) — `analyze_javascript_application`

* **아티팩트**: `@anthropic-ai/claude-code` 52만줄, Bun 번들 `cli.js` 13MB, sourceMap 1개, nodes ~5000
* **핵심**: `queryLoop()` 9단계 파이프라인 — Settings → State init → Context assembly → Compaction → Model call → Tool dispatch → Permission gate → Execution → Stop
* **맥락 강점**: 5단계 Compaction (BudgetReduction→Snip→Microcompact→Collapse→Auto-Compact 서브에이전트 6500토큰 요약) + STATIC/DYNAMIC prompt caching → 비용 90% 절감하면서도 잘림 인지
* **흡수**: `context.ts:assembleSystemPrompt()`에 STATIC(AGENTS.md+ToolDefs, 캐시) / DYNAMIC(git+ledger+intent, 매턴) 분리 + `compactMessages()`에 `preserve:{filePaths,decisions,pendingTasks}` 강제 — 파일 경로/결정은 요약에서 절대 생략 금지

### 1.2 Cursor (Anysphere) — REA `trace_application_feature: codebase-index`

* **아티팩트**: Electron + Rust indexer, `cursor-server` 37k★
* **맥락 강점**: 의미 기반 코드베이스 인덱싱 — `@codebase` 심볼 그래프, 파일이 아닌 심볼 단위 검색 (`find_symbol → find_referencing_symbols → insert_after_symbol`). 토큰 400→80으로 80% 절감
* **흡수**: Serena 도구 3종 래핑(`src/tools/serena.ts` 이미 있음) + `StructuralContext`에 `symbolIndex` 주입 — `rag/` HashEmbedder(128차원) → Serena 심볼 검색 → importGraph 3중 레이어로 구조 파악

### 1.3 Codex CLI (OpenAI, Rust 95.7%) — Ghidra strings 분석

* **아티팩트**: `codex-rs` 6k line, `sandbox.rs` Seatbelt/Landlock, `config.rs` AGENTS.md 파서
* **맥락 강점**: AGENTS.md 계층 표준 — `.git` 경계까지 walk-up, 디렉토리 레벨당 1파일, 깊은 것이 우선. 컨텍스트를 코드로 강제, 프롬프트가 아님
* **흡수**: `config/agentsMd.ts:loadAgentsMdHierarchy()` 이미 구현 — 이번에 `context.ts`가 이를 `always-on:6000` 예산 내 최우선으로 주입, 깊이별 `When <상황>, load <skill>` 트리거 라인 자동 생성 (Harness² 검증 3원칙 1번)

### 1.4 Aider + Codex map — `trace_javascript_semantics: repo-map`

* **맥락 강점**: repo-map 압축 — 전체 파일을 읽지 않고 함수 시그니처만으로 1k 토큰 맵 생성, 필요 시에만 본문 로드
* **흡수**: `structuralContext.ts:buildStructuralContext()`가 `rg`로 `^import|^export` 빈도 요약 + `symbolIndex` (주요 export/class/function) 를 2500자 budget으로 생성 — 항상-on 12k 초과 방지

### 1.5 Windsurf Cascade / Cline — `reconcile_javascript_runtime`

* **맥락 강점**: Cascade는 대화 세션 내내 `evidenceLedger`처럼 tool_result provenance를 유지 — 잘림 시 `truncated:true + confidence 0.7` 로 모델에 명시, 추측 금지
* **흡수**: `loop/evidenceLedger.ts:EvidenceLedger` 이미 구현 — `fromToolResult()`가 `truncated = result.length>=5000` 자동 탐지, `summarizeForPrompt()`가 ` [TRUNCATED — 추측 금지]` 플래그 + `renderStamp()` 증거 도장으로 최종 답변에 출처 블록 강제

### 1.6 Ghidra (NSA 11.3) — 바이너리 컨텍스트

* **아티팩트**: Java 17+, `GhidraInspect` 8개 facet (P-code, 문자열, CFG, xrefs)
* **맥락 강점**: 바이너리에서도 "누가 누구를 호출하는지" 그래프로 맥락 복원 — 소스 없는 앱도 `main→login→verify` 호출 체인으로 의도 파악
* **흡수**: `src/tools/ghidra/*` 29개 도구 + `rag/` 로컬 임베딩과 결합 — 바이너리 문자열/함수명을 Chunk로 인덱싱, RAG 검색 시 소스+바이너리 동시 참조. 사회 기사(마스크)처럼 비코드 문맥도 EvidenceLedger로 동일 처리

## 2. Ghidra 심층 — 두뇌에 없는 맥락

* Ghidra는 P-Code 중간표현으로 아키텍처 차이를 데이터로 추상화 → Harness² SurfaceSpec과 동일 철학. 우리는 `harness.ts:SurfaceSpec`으로 프레임워크 차이를 데이터로 이미 추상화함.
* Ghidra의 `GhidraTrace(main→verify)`는 두 함수 간 경로 추적 → 우리 `research.ts:decomposeQuery()`가 질의를 `원인/비교` 2개로 분해해 병렬 WebFetch 후 비교표로 합성 — 같은 "경로 추적"을 텍스트에 적용.
* 바이너리 패치 비교(`GhidraCompareArtifacts v1 vs v2`) → 우리 `harness2/library.ts`가 이전 harness 전체 트리를 저장해 다음 작업에 재사용 — "버그 패치가 무엇을 고쳤는지"를 맥락으로 학습.

## 3. 흡수 설계 — 3-Pillar 구현 현황 (v2.23.2)

| Pillar | REA/Ghidra 원천 | Arena 구현 | 파일 | 상태 |
|---|---|---|---|---|
| **문맥 파악** | Claude 5단계 Compaction + Cursor 심볼 + Aider map + Ghidra P-Code | EvidenceLedger + StructuralContext + RAG + TieredBudget(6k+2.5k+2k) | `loop/context.ts`, `structuralContext.ts`, `evidenceLedger.ts`, `rag/*` | ✅ |
| **의도 파악** | Harness² proposer invariant/domain + Cascade provenance | Intent 5종(question/impl/analysis/generation/chore) + confidence 0~1 + ambiguities/slots + variant 힌트 | `loop/intent.ts` | ✅ |
| **품질 검증** | Harness² Guard + GPT-6 recurrent depth + Matt Pocock 2축 | OutputQualityGate(밑줄/정답누출/placeholder/출처) + self-correct 1회 + 2축 리뷰 모드 | `loop/outputQuality.ts`, `harness2/guard.ts`, `harness2/depth.ts` | ✅ |

## 4. 검증 지표 (Before/After)

| 지표 | Before (29번 이미지) | After (목표) | 측정 |
|---|---|---|---|
| 잘림 인지 | 0% (잘림을 전체로 착각) | 90%+ | truncated 이미지 10세트 “잘림 언급 여부” |
| 의도 정확도 | 수동 판단 | 85%+ | 50 프롬프트 분류 vs 사람 라벨 |
| 결과물 PASS | 밑줄 소실 30%, 정답누출 40% | <5% | `outputQuality` CI |
| always-on | 8k+ | <6k | `estimateTokens` vs `ALWAYS_ON_BUDGET_RATIO` 0.8 |

## 5. 다음 흡수 — 이번 브랜치에서 코드로 확정

1. `contextUnderstanding.ts` — 3-Pillar 오케스트레이터 신설 (EvidenceLedger → Intent → queryLoop → QualityGate 1회 루프)
2. `reaAnalyzer.ts` — 신규 REA_INSIGHT 6종 추가 (Claude/Cursor/Codex/Aider/Windsurf/Ghidra 맥락 강점)
3. `harness2/context.ts` 증거 트리 포인터화 — 긴 내용은 파일 포인터로, 짧은 포인터만 프롬프트에 (Harness² §5)

> 이 문서는 `arena-code` 저장소 일부이며, `arena/467cdf9a-rea` v2.23.2에서 REA+Ghidra 분석 직후 작성됨.
