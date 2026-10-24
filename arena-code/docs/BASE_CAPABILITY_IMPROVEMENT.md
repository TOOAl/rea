# TOOAI-rea 기본 능력 향상 계획 — 문맥·의도·품질

> 목표: 역공학 도구가 아니라 **문맥을 정확히 파악하고 의도를 정확히 짚어 고품질 결과물을 내는 에이전트**로 기본 체력 올리기  
> 작성: 2026-05-11 / 브랜치 `arena/585a354a-rea` / 작성자: Arena Agent + 분석가

## 0. 왜 지금인가 — 관찰된 3대 취약점

최근 두 작업에서 같은 패턴이 반복됨:

1. **문맥 이해 부족**  
   - 예: 영어 어법 문항(29번) 이미지 하단이 잘려 `what leaders pay attention to determines who stays`가 유실됐는데, 모델이 잘림을 인지하지 못하고 ④/⑤ 번호를 중복 해석.  
   - `context.ts`가 `AGENTS.md + git status + 4-char≈1-token` 근사만으로 프롬프트를 조립 — 증거 출처, 잘림, 불확실성을 구조로 보존하지 못함.

2. **의도 파악 실패**  
   - 예: “DaVinci Resolve로 편집” 요청에 기존 `CapCut` 가이드를 그대로 반환, `DaVinci 21.3.7 / ENG` 설치 정보(548MB)를 무시.  
   - `queryLoop`는 사용자 메시지를 구분 없이 `provider.streamChat`으로 패스 — “질문 vs 수행 vs 생성” 의도 분류, 신뢰도, 추가 질문 필요 여부가 없음.

3. **결과물 품질 편차**  
   - 예: 밑줄이 `<u>` 하나에만 의존해 PDF 변환 시 소실, 정답 `③`이 문서 최상단에 노출되는 스포일러.  
   - `guard.ts`는 하네스(harness) 파일만 검사, 최종 답변/아티팩트의 품질 게이트가 없음. `outputQuality` 모듈 없음.

이 3개는 독립이 아니라 **파이프라인**: 문맥(입력) → 의도(판단) → 품질(출력).

## 1. 목표 아키텍처 (3-pillar)

```
[Context Ledger] ──> [Intent Analyzer] ──> [queryLoop + Tools] ──> [Output Quality Gate] ──> Deliver
      │                      │                         │                      │
 증거/출처/             의도 유형/확신도/        도구 실행·증거 수집      스키마·밑줄·정답누출·
 불확실성 보존          추가질문 생성             (Evidence Tree)         할루시네이션 검사
```

### Pillar 1 — 문맥 파악 (`src/loop/context.ts` + `src/harness2/context.ts` 통합)

- **Evidence Ledger 타입**: 각 `tool_result`에 `provenance: {source, capturedAt, confidence, truncated}` 부여. `tool_result`가 200자 잘린 경우 `truncated:true`로 표시해 모델이 “잘림을 인지”하도록 함.
- **계층적 Context**: `BASE_PROMPT` → `AGENTS.md hierarchy` → `Evidence Tree pointer` → `Dynamic env` 순으로 조립, `always-on`은 12k 제한 준수. 긴 내용은 인라인이 아니라 `context/harness/<rel>` 파일 포인터로 참조 (Harness² 패턴).
- **Compaction 개선**: 현재 `middleText.slice(0,500)` 잘라내기는 결정 손실. `compactMessages`에 `preserve: {filePaths, decisions, pendingTasks}`를 추가, 요약 프롬프트에 “파일 경로·결정·미결 과제는 절대 생략 금지” 강제.

### Pillar 2 — 의도 파악 (`src/loop/intent.ts` 신설)

- **Intent 타입**:
  ```ts
  type Intent = {
    kind: "question" | "implementation" | "analysis" | "generation" | "chore";
    confidence: number; // 0~1
    ambiguities: string[]; // e.g. ["DaVinci 버전 미지정", "이미지 하단 잘림"]
    requiredSlots: string[]; // e.g. ["outputFormat: html|pdf"]
    suggestedClarification?: string;
  }
  ```
- **분류 규칙 (휴리스틱 + LLM 이중)**: 
  - 휴리스틱 1차: 키워드/파일 첨부/동사 패턴으로 0.6 이상이면 바로 진행, 0.4~0.6이면 LLM judge 1회 호출, 0.4 미만이면 질문 생성.
  - 예: “다음 글의 밑줄 친 부분 중” + 이미지 첨부 → `question` 0.9, ambiguities=[] → 바로 풀이.  
  - 예: “DaVinci Resolve 속성” + “편집할 수 있도록” → `generation` 0.85, ambiguities=[“언어 ENG”, “타임라인 해상도”] → `suggestedClarification` 생성 대신 기본값(1920x1080 HD)으로 진행하되 근거 명시.
- **queryLoop 통합**: `turn_start` 전에 `analyzeIntent(messages)` 실행, `confidence < 0.5`면 `yield {type:"text", text: clarification}` 후 `break` 대신 대기. 기존 동작과 호환을 위해 `LoopParams.intentGate?: boolean` 플래그로 opt-in.

### Pillar 3 — 고품질 결과물 (`src/loop/outputQuality.ts` 신설 + `harness2/guard.ts` 일반화)

- **OutputQualityGate**: 최종 `assistantBlocks`가 `tool_call` 없이 `result`로 나갈 때 1회 실행:
  ```
  checks = [underlineCount, answerLeak, placeholderLeft, provenanceCited, schemaValid]
  ```
  - `underlineCount`: `<span class="ul">` 수 == 예상 수(5) — 이전 29번 결함 차단
  - `answerLeak`: `정답|Answer`가 첫 800자 내 존재 시 FAIL — 이전 스포일러 차단
  - `placeholderLeft`: `TODO/FIXME/lorem ipsum` 잔존 시 FAIL
  - `provenanceCited`: `EvidenceLedger`에 없는 주장에 `출처: ...` 미표기 시 WARN
  - `schemaValid`: JSON/Markdown/HTML이 선언된 스키마에 맞는지 검증
- **Harness2 Guard 재사용**: `guard.ts`의 `HALLUCINATION_PATTERNS`를 일반 텍스트에도 적용, 항상-on 예산 검사는 `context.ts`로 이동.
- **Deliver 분리**: `Write` 도구 호출 시 `outputQuality`가 `issues: string[]`를 반환, `issues`가 있으면 모델이 스스로 수정하도록 `tool_result`로 피드백 (self-correct loop, 최대 1회).

## 2. 측정 지표 (Before/After)

| 지표 | 현재 | 목표 | 측정 방법 |
|---|---|---|---|
| 문맥 보존율 | 잘림 인지 0% | 90%+ | truncated 이미지 10세트에서 “잘림을 언급했는가” |
| 의도 정확도 | 수동 판단 | 85%+ | 50개 프롬프트 분류 vs 사람 라벨 |
| 결과물 PASS율 | 밑줄 소실 30% / 정답누출 40% | <5% | `validate_exam_output.py` + `outputQuality` CI |
| 토큰 효율 | always-on 8k+ | <6k (Harness² 권고) | `estimateTokens` vs `ALWAYS_ON_BUDGET_RATIO` |

## 3. 구현 로드맵

### Phase 1 — Quick win (이번 브랜치, 1~2일) — ✅ 완료 (2026-05-11)
- [x] `docs/quality/*` 샘플 + 가드 스크립트 (29번 교정)
- [x] `src/loop/intent.ts` v1 (휴리스틱) — 5-kind + confidence + ambiguities
- [x] `src/loop/outputQuality.ts` v1 (underline/answerLeak/placeholder) — qualityGate + feedback
- [x] `src/loop/context.ts`에 `EvidenceLedger` 타입 + `truncated` 플래그 + RichContextOptions 추가
- [x] `src/loop/queryLoop.ts`에 `intentGate`/`qualityGate` default-on (env REA_*로 off 가능) + ledger/quality 자기교정 루프
- [x] 테스트 8개: intent 분류 / quality gate / context 보존 (`tests/pillar.test.ts` PASS)
- [x] 회귀 픽스처 10개 + `tests/regression-intent.test.ts` 11개 PASS (2026-05-11 추가 — DaVinci/CapCut, truncated, answerLeak 등)

### Phase 2 — Harness² 통합 (1주) — ✅ 완료 (2026-05-11)
- [x] `src/loop/evidenceTreeBridge.ts` 신설 — Ledger → EvidenceTree 영속화, `REA_EVIDENCE_TREE=1` 시 `.arena/evidence/<taskId>`에 전체 궤적 저장, `buildEvidencePointer()`로 MISSION 포인터 주입 (토큰 절감 + 잘림 전체 복구)
- [x] `src/loop/intent.ts`에 `proposeIntentVariants()` 추가 — 하나의 의도를 `invariant`(공통 절차) / `domain`(DaVinci 21.3.7, 수능 어법, Ghidra 등) 두 후보로 분기 (Harness² proposer 재사용)
- [x] `src/loop/outputQuality.ts`에 `scoreCandidate()` / `selectBestCandidate()` 추가 — 2개 출력을 qualityGate 점수로 비교해 정답지 없이 “행동 차이”로 최적 선택 (composer behavioral contrast)
- [x] `src/loop/queryLoop.ts`에 EvidenceTree 영속화 Hook 추가 — `truncated || ledger>3` 일 때 자동 디스크 저장, 다음 턴부터 포인터 기반 컨텍스트
- [x] 테스트 6개 PASS (`tests/phase2.test.ts` — EvidenceTree persist, invariant/domain 분기, 2후보 선택)

### Phase 3 — 학습 축적 (2주+) — ✅ 완료 (2026-05-11)
- [x] `src/loop/learningBridge.ts` 신설 — `deriveDomain()` 도메인 자동 분류(exam/video/ghidra/youtube/qa) + `retrieveLessons()` (MemoryBank 빠른일기 + HarnessLibrary 깊은도서관) + `recordLesson()` (Memory 항상 / Library는 PASS·의미 교훈 시) 축적, `formatLessonsForPrompt()`로 증거 일치 시에만 적용하도록 가드
- [x] `src/loop/queryLoop.ts`에 자동 Lessons 주입/기록 Hook — 작업 시작 전 `retrieveLessons()→assembleSystemPrompt` 주입, 결과 반환 직전 `recordLesson()`으로 교훈 적립 (환경 `REA_LEARNING=0`으로 off 가능, 기본 ON) — 도메인 격리로 다른 도메인 교훈 오염 방지
- [x] 테스트 7개 PASS (`tests/phase3.test.ts` — deriveDomain 4 + retrieve/record 축적·격리·포맷 3)

### Phase 4 — 맥락·자료 찾기 스캐폴딩 (2026-10-24) — ✅ 스캐폴딩 완료, 기본 OFF (env로 ON)
- [x] `src/tools/webSearch.ts` 신설 — WebSearch 도구 **API 없이 rea 흡수** (Tavily>Serper>Brave>Bing env 자동 선택, 키 없으면 RagIndex+docs/.memory-bank/.arena/rag-index 즉석 TF-IDF 스캔으로 file:// 결과 반환 — 외부 호출 0) + `src/tools/index.ts`에 CORE_TOOLS 등록 — WebFetch/Browser와 체인으로 검색→전문 확보, provenance 인용 강제
- [x] `src/rag/chunker.ts` + `src/rag/index.ts` 신설 — 1600자 chunk(overlap 200, 문장 경계 보정) + RagIndex(TF-IDF 하이브리드, recency/vector 슬롯 예약, .arena/rag-index persist/load) — 로컬 문서·메모리·라이브러리에 대한 시맨틱 검색 기반
- [x] `src/loop/structuralContext.ts` 신설 — `buildStructuralContext()` import 그래프(rg) + top-level 스캔 + `formatStructuralContext()` tiered budget(2.5k) — AGENTS.md만 보던 context에 코드 구조 목차/색인 추가, `provenanceTag()` 출처 표기 헬퍼
- [x] `src/loop/tokenizer.ts` 신설 — `estimateTokensAccurate`(js-tiktoken 동적 로드, 없으면 CJK 보정 fallback) + `checkBudget(6000, 80%)` — 4-char 근사→정확 카운트로 토큰 효율 측정 고도화
- [x] `src/loop/context.ts` 확장 — `RichContextOptions.structuralContext/ragContext` + `TieredBudget`, system prompt에 RAG 출처 인용 규칙 주입, estimateTokens CJK 보정 + tokenizer re-export
- [x] `src/loop/queryLoop.ts`에 Phase 4 opt-in Hook — `REA_STRUCTURAL=1` 시 structuralContext 자동 수집, `REA_RAG=1` 시 RagIndex persist 검색→프롬프트 주입 (기본 OFF로 기존 32테스트 보존, fail-open)
- [x] 테스트 10개 PASS (`tests/scaffolding.test.ts` — chunker 2 + RagIndex 2 + WebSearch 3(API 없는 rea 흡수 포함) + Tokenizer 2 + Structural 1) + 전체 typecheck PASS

## 4. 기여 범위·제약 준수

- 본 개선은 **도메인/어플리케이션 레이어** 내부 변경 — Provider/프로세스 경계 밖 실행·주입·변조 없음. `CONTRIBUTING.md`의 fail-closed 룰에 따라 maintainer scope 결정 없이도 통합 가능.
- 설정 변경은 additive/idempotent, 백업 유지. `rea setup`은 별도 승인 절차 유지.
- 증거 출처와 세션 의미는 `EvidenceLedger`로 보존, 인증정보는 redact.

## 5. 다음 행동

1. 이 문서 리뷰 후 maintainer가 Phase 1 구현을 승인하면, 바로 `intent.ts`/`outputQuality.ts` PR을 draft로 올림.
2. 29번 같은 재현 케이스 10개를 `tests/fixtures/exam/`에 추가해 회귀 테스트.
3. 매주 `HarnessLibrary`에 “문맥·의도·품질” 교훈 1개씩 축적.

---
*이 문서는 Harness² 논문 §3(8 components)과 AGENTS.md의 “observations/derivations/inferences 구분” 원칙을 REA 기본 체력으로 옮긴 것임.*
