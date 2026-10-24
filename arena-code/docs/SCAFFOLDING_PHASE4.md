# Phase 4 Scaffolding — 사용 가이드 (2026-10-24)

이 문서는 `arena/44525c12-rea`에 추가된 **맥락 이해 + 자료 찾기** 스캐폴딩을 바로 쓰는 법을 12살도 따라 할 수 있게 적었다.

## 1. 새로 생긴 파일

| 파일 | 역할 | 기본 상태 |
|------|------|-----------|
| `src/tools/webSearch.ts` | 웹 검색 — **API 없이 rea 흡수**: 키 없으면 로컬 RagIndex/docs/.memory-bank TF-IDF로 즉시 fallback, 키 있으면 Tavily/Serper/Brave/Bing 자동 선택 | 항상 등록, 외부 호출 0으로도 동작 (fail-open) |
| `src/rag/chunker.ts` | 긴 문서를 1600자 청크로 자르기 (겹침 200) | 로컬 RAG 기초 |
| `src/rag/index.ts` | RagIndex — TF-IDF 하이브리드 + vector 슬롯 + persist | 메모리, `.arena/rag-index/<domain>.json` 저장 |
| `src/loop/structuralContext.ts` | import 그래프 + top-level 스캔 → 구조 목차 | `REA_STRUCTURAL=1` 시 자동 주입 |
| `src/loop/tokenizer.ts` | 정확한 토큰 측정 + 예산 검사 | `js-tiktoken` 있으면 정확, 없으면 CJK 보정 |

`src/loop/context.ts`는 두 컨텍스트를 `RichContextOptions.structuralContext / ragContext`로 받도록 확장,
`src/loop/queryLoop.ts`는 두 env가 1일 때만 자동 수집한다 (기존 동작 보존).

## 2. 바로 쓰는 법

### WebSearch — 자료 찾기

```ts
// 에이전트 프롬프트에서
// /search 코스피 2024-10-23 반등 원인
// 또는 Tool 호출:
{ name: "WebSearch", input: { query: "코스피 2024-10-23 반등 원인", count: 5 } }
```

**API 없이도 동작 — rea로 흡수:** 키가 하나도 없어도 `arena-code/docs/*.md + docs/*.md + .memory-bank/*.md + .arena/rag-index`를 즉석에서 `RagIndex`로 스캔해 `file://` 결과 반환 (외부 호출 0). 예: `BASE_CAPABILITY_IMPROVEMENT 문맥 의도 품질` → `file://arena-code/docs/BASE_CAPABILITY_IMPROVEMENT.md` (local, score 0.42).

환경변수 중 하나를 설정하면 라이브 웹으로 자동 승격 (선택):

```
TAVILY_API_KEY=tvly-...     # 권장 (AI 검색) — 있으면 외부 우선, 실패 시 local로 재흡수
SERPER_API_KEY=...          # Google SERP
BRAVE_API_KEY=...           # Brave Search
BING_API_KEY=...            # Azure Bing
# REA_WEBSEARCH_LOCAL=0 로 로컬 fallback 비활성화 가능 (기본 1)
```

키가 없으면 로컬 문서에서 먼저 찾고, 정말 없으면 `TAVILY_API_KEY ...` 안내만 반환 — 블록하지 않음.
검색 → 각 URL을 `WebFetch`로 본문 확보 → 답변에 `출처: URL (날짜)` 인용. 로컬은 `file://` 경로를 `Read`로 전문 확인.

### 로컬 RAG — 내 문서 찾기

```ts
import { RagIndex } from "./src/rag/index.js";

const idx = new RagIndex({ domain: "exam", persistDir: "./.arena/rag-index" });
idx.addDocuments([
  { source: "docs/exam-29.md", text: await readFile("docs/exam-29.md", "utf-8") },
  { source: "docs/policy.md", text: "영농형 태양광 ..." },
]);
idx.persist(); // .arena/rag-index/exam.json 저장

// 다음 세션
idx.load();
const hits = idx.search("어법 밑줄 5개", 3);
// hits[0].chunk.source + hits[0].score
```

`queryLoop`에서 `REA_RAG=1`로 켜면 `domain`별 persist 인덱스를 자동 검색해 프롬프트에 주입한다.
아직 dense vector가 없으므로 TF-IDF만 동작 — 나중에 `vectorScores` 맵을 넘기면 하이브리드(0.5:0.5)로 합성된다.

### Structural Context — 맥락 이해

```bash
REA_STRUCTURAL=1 npm run dev -- --query "ghidra p-code 분석"
```

`buildStructuralContext(cwd)`가 `rg`로 import graph를 스캔해 상위 30개 source를 요약한다.
토큰 예산 2.5k 내에서 `## Structural Context` 섹션으로 system prompt에 들어간다.
없으면 `(unavailable)`로 fail-open — 에이전트가 멈추지 않는다.

### Tokenizer — 예산 검사

```ts
import { estimateTokens, checkBudget } from "./src/loop/tokenizer.js";
// 또는 context.ts re-export
import { checkBudget } from "./src/loop/context.js";

checkBudget(messages, 6000); // { tokens, budget, ratio, ok, message }
```

`js-tiktoken`을 설치하면 `encodingForModel("gpt-4o")`로 정확히 측정, 없으면 `chars/4 + CJK*0.5` 보정.

## 3. 다음에 할 일 (Week 1~2)

- [ ] `js-tiktoken` + `sqlite-vss` 또는 `chromadb` 설치 후 `RagIndex.vectorScores` 연결
- [ ] `BRAVE_API_KEY` 발급 후 `WebSearch` E2E 테스트 (현재는 mock)
- [ ] `RagIndex`를 `harness2/library` + `.memory-bank` 자동 색인에 연결
- [ ] Research Loop: `WebSearch 5개 → 병렬 WebFetch → 비교표 → 출처 블록` 고정 루프를 `src/loop/research.ts`로 승격

## 4. 테스트

```
npm test -- tests/scaffolding.test.ts          # 9 tests
npm test -- tests/pillar.test.ts tests/phase2.test.ts tests/phase3.test.ts  # 32 tests (기존 보존)
./node_modules/.bin/tsc --noEmit               # typecheck
```

모두 PASS 확인 (2026-10-24).
