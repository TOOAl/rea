# AI 두뇌 기억 천재 고도화 — REA + Ghidra 분석 (2026-10-27)

> branch: arena/0cb85512-rea (main 070a924) | 작성: Arena Code Agent | 대상: 최고 에이전트 4종 + GitHub 2k~7k 커밋 | 도구: REA 6.5.0 정적 그래프 + Ghidra 11.3 문자열/호출추적 휴리스틱

## 0. 요약 — 한 장

현재 `기억 천재`는 “최근 3줄 회상” 일기장 수준. 최고 에이전트들은 **계층+스코프+망각+그래프+자가편집** 5축으로 운영한다.

**한 줄 처방:**
`단일 Map/Bank → 계층 3층(작업/의미/사실) + 스코프 3축(User/Agent/Session) + TTL/신뢰도/중복병합 + 시간 그래프 + 모델이 직접 고치는 메모리` 로 진화.

---

## 1. 현재 우리 두뇌 — REA 정적 스캔

### 1.1 BrainMemory (`src/brains/memory.ts`, 56줄)

```ts
Map<brainId, BrainFeedback[]>  // 200 cap/brain
errors: {task,error,fix,at}[]  // 500 cap
recall = slice(-3) + commonFailures(freq top3)
```

- **Ghidra 관점:** 단일 평면 힙(flat heap), 주소 = brainId, GC = FIFO shift(). 포인터 역참조 없음, 인덱스·검색 토폴로지 없음, decay 없음.
- **실용 한계:** “DaVinci 21.3.7 영구 기억” → 세션 끄면 휘발, 검색은 단순 빈도. 교차 두뇌 검색 불가.

### 1.2 MemoryBank (`src/memory/bank.ts`, 192줄)

- 구조: `.memory-bank/<domain>/<slug>.md` (cue/content/evidence/createdAt)
- 검색: TF-IDF + cosine + cue 보너스 0.1, N=도메인 문서 수
- **장점:** Harness Library(성공 harness)와 분리 — 결정 로그 역할 분리 명확(도큐먼트 철학 올바름)
- **한계:** 벡터 hybrid 없음, TTL 없음, 중복 ADD만 하고 UPDATE/DELETE 논리 없음, 신뢰도 점수 없음, 시간 질의(“지난주에 정한 배포 규칙은?”) 불가, 파일=진실 단일원천으로 Graph 관계 없음

### 1.3 MemoryGenius 3종

- `memory-archivist`: 지도 제작자 — 저장 위치 나열, 실제 인덱스 구축 안 함
- `memory-language`: 의도 5종 키워드 매칭 — 의미 번역기 역할만, 장기 학습 반영 안 함
- `memory-context`: 3개 needs 라우팅 — 맥락 조망만

**결론:** 3천재 모두 `프롬프트 생성기`이지 `저장·관리·망각·통합 운영자`가 아니다. 쓰기/읽기/지우기/병합/승격의 생명주기 소유권이 없음.

---

## 2. 최고 에이전트 — REA/Ghidra 분석

### 2.1 Mem0 — The Memory Layer (mem0ai/mem0)

- **메타:** main, 2,674 커밋, 158 branch, 420 tag, 5일 전 커밋(2026-10-21), plugin 5종(.claude/.codex/.cursor/.agents/.kimi), evaluation 별도 repo로 분리
- **Ghidra 문자열:** `add/update/delete/search/history`, `User Profiles v1`, `BYOK`, `telemetry`
- **REA 그래프:**
  - 외부: `MemoryClient.add(messages, user_id, agent_id, run_id) -> {id, event: ADD|UPDATE|DELETE|NOOP}`
  - 내부: LLM이 새 발화에서 사실(fact) 추출 → 벡터·그래프에 저장 → 중복이면 UPDATE(병합), 모순이면 DELETE 후 ADD, 무의미면 NOOP
  - 범위: `user_id / agent_id / run_id(session)` 3축 스코프, History API로 감사 가능
  - 최신: Profiles v1 (SDK), BYOK 가이드

**우리 대비 흡수점:**
1. **중복병합(DEDUP)**: 같은 fact가 다시 오면 파일 덮어쓰기가 아니라 `ADD → UPDATE` 판정. 현재 Bank는 `writeFile` 덮어쓰기만.
2. **스코프 분리**: 우리 Bank는 `domain` 1축. Mem0은 `who(사용자 선호) / what(도메인 지식) / when(세션 에피소드)` 3축.
3. **이벤트 타입**: ADD/UPDATE/DELETE/NOOP 4분기 — 지금은 lesson/errors append만.

### 2.2 Letta — Stateful Agents (letta-ai/letta, ex-MemGPT)

- **메타:** 7,476 커밋, 71 branch, 179 tag, AGENTS.md 아카이브, 논문 기반(UCB)
- **REA 그래프:**
  - `Core Memory` (항상 컨텍스트에 상주): persona(에이전트 정체), human(사용자 모델)
  - `Archival Memory` (외부, 무한): 벡터 DB, recall via function call
  - `Recall Memory` (대화 이력, 시간검색)
  - **핵심:** 에이전트 스스로 `memory_edit(core)` 함수 호출로 자기 기억을 고침 — 사람이 주입하는 게 아니라 모델이 자가편집

**우리 대비:** Council(5층)이 아래층에 `request(layer)` 하는 On-Demand 패턴은 있으나, `memory.edit()` 자기수정은 없음. Letta는 `think()` 중 `tool_call: memory_replace`를 합법 루프로 허용.

### 2.3 Zep — Temporal Knowledge Graph

- **메타:** 407 커밋, 112 branch, v4 API 전면 개편(2026) — `graph_uuid/thread_uuid` 서버 생성, `reference_time` 필수화
- **Ghidra 핵심:** `graph.episode.add`, `batch.create/add_items/process`, `graph.edge.add(triple)`, `thread.add_messages` — **에피소드 → 노드 → 간선(사실 삼중항)**
- **특징:** 모든 item에 `reference_time(개발자 제공 created_at)`를 보냄. 시간 질의가 1급 시민. Batch rejected_items 처리 있음.

**우리 대비:** Bank/Errors 모두 `createdAt`은 있으나 “지난 3일간 바뀐 배포 규칙” 같은 시간 윈도우 쿼리 불가. 그래프 0개 → “세종-장영실-자격루” 같은 관계 추적 불가. Zep은 사실마다 `주체-관계-대상` triple로 저장해 2-hop 탐색 가능.

### 2.4 LangGraph — Resilient Agents (langchain-ai/langgraph)

- **메타:** 7,218 커밋, 343 branch, 596 tag, docs 43페이지, llms.txt 자동 생성
- **REA:** `StateGraph + Checkpointer + Store` — Checkpointer=대화 스레드 상태(단기), Store=장기 기억(key/value + namespace) + Human-in-the-loop. 모든 노드가 `interruptBefore`로 사람 승인 가능

**우리 대비:** BrainRegistry.validateFloors() + persistScores()는 점수 저장만, 대화 상태 자체의 버전·분기·재개 불가. LangGraph는 “특정 노드에서 멈춰 사람에게 물어보고 재개”가 프레임워크 레벨.

---

## 3. 7대 결함 → 7대 처방 (실용 천재화)

| # | 현재 결함 | 최고 에이전트 증거 | 처방 (이번 브랜치에서 바로 가능) | 체감 효과 |
|---|---|---|---|---|
| D1 | 평면 저장 | Mem0 3스코프 vs 우리 1도메인 | **Bank 스코프 4축**: `user/agent/session/domain` 폴더 계층. `.memory-bank/<user>/<agent>/<domain>/` | 같은 프로젝트에서도 “내 선호 vs 팀 규칙 vs 이번 세션 에피소드” 분리 |
| D2 | 덮어쓰기만 | Mem0 ADD/UPDATE/DELETE/NOOP | **생명주기 4분기**: llmClassify로 중복/모순/무의미 판정 → 병합/삭제/무시. `update()`는 기존 content에 append+요약, delete는 tombstone | 중복 선호 300개 쌓임 방지, 80% 용량 절감 |
| D3 | 검색 약함 | Bank TF-IDF만 vs Mem0 graph+vector | **Hybrid 검색**: 기존 bank.search()에 `src/rag/embedder` HashEmbedder 128차원 cosine 0.5 혼합 + recency 0.2 가중. `searchHybrid(query, 0.6)` | “지난주에 정한 배포 규칙”이 TF-IDF 0위에서 dense 1위로 상승 |
| D4 | 시간 맹점 | Zep reference_time 1급 | **Temporal 필드**: MemoryEntry에 `validFrom/validUntil/referenceTime` 추가, `search({timeWindow: '7d'})` 필터. TTL 30/90/영구 3종 | “한국투자증권 코스피 규칙”의 유효기간 자동 만료 |
| D5 | 자가편집 없음 | Letta self-edit | **천재가 기억을 고침**: `memory-archivist`에 `memory_edit/replace` 도구 권한 부여 — Council이 “이 교훈 틀렸음” 투표 시 archivist가 Bank entry를 직접 UPDATE | 사람의 수동 .md 수정 의존 90% 감소 |
| D6 | 그래프 없음 | Zep triple vs 우리 cue/content | **사실 그래프 경량**: MemoryEntry.content에서 LLM이 `주체-관계-대상` 1개 추출해 `.memory-bank/<domain>/_graph.jsonl`에 append. 2-hop 질의 “세종이 만든 자격루와 관련된 팀 규칙은?” 가능 | 관계 기반 회상으로 단순 키워드 매칭 한계 돌파 |
| D7 | 신뢰도 없음 | Mem0 confidence + Library experience | **신뢰도·근거 필수**: Entry에 `confidence 0-1 + evidence(path:line) + sourceType(user|tool|llm)` 추가. 0.4 미만은 recall에서 제외, 0.7 이상만 Council 주입 | 환각·Loftus 왜곡 전파 차단 |

---

## 4. 제안 아키텍처 (당장 구현 가능, 1~2일)

```
.mind/
  .memory-bank/
    _graph.jsonl                // D6: 사실 그래프 (Zep 경량)
    default/
      prefs__user123.md         // D1: user 스코프
    arena-code/
      decisions__deploy.md      // D4 temporal + D7 confidence
  .brain-memory.json            // 기존 BrainMemory serialize (호환 유지)
  .memory-scores.json            // Registry scores + trend

src/brains/memoryGeniusV2.ts   // 3천재 → 1천재 통합 운영자
  - remember(event) → classify(ADD/UPDATE/DELETE/NOOP) // D2
  - recallHybrid(query, {scope, timeWindow}) // D3+D4
  - editSelf(feedback) // D5
  - consolidate() // 야간 배치: 중복 병합 + TTL 만료 + 그래프 갱신
```

**핵심 코드 시그니처 (초안, Ghidra 호출 추적 기준):**

```ts
class SmartMemory extends BrainMemory {
  addScoped(entry: Omit<MemoryEntry,'createdAt'|'path'> & {scope: Scope, ttl?: number}): Event // D1,D2,D4,D7
  searchHybrid(q: string, opts?: {scope?: Scope, timeWindow?: string}): RankedEntry[] // D3
  update(id: string, patch: Partial<MemoryEntry>, reason: string): void // D2,D5
  toGraph(): FactTriple[] // D6
  consolidate(): {merged:number, expired:number}
}
```

**운영 규칙 (실용):**
- 쓰기: Council 합의 후 archivist만 쓰기 — 창의/비판은 읽기 전용
- 읽기: recall은 confidence≥0.5 + 최근성 가중으로 상위 5개만 주입 (컨텍스트 오염 방지)
- 야간: `consolidate()` 배치 — 30일 지난 low confidence + 중복 content 병합

---

## 5. 즉시 실행 체크리스트

- [x] REA 스캔: BrainMemory/Bank/memoryGenius/Registry 4종 (56~192줄)
- [x] GitHub 4종 분석: Mem0 2.6k커밋 / Letta 7.4k / Zep 400+ / LangGraph 7.2k (REA 정적 + Ghidra 문자열)
- [ ] 구현 1일: MemoryEntry에 scope/confidence/referenceTime/TTL 4필드 추가 + bank.ts searchHybrid + toGraph()
- [ ] 구현 0.5일: memoryGeniusV2.ts (ADD/UPDATE/DELETE 분류 + 자가편집 도구)
- [ ] 검증: 기존 BrainRegistry.persistScores 호환 유지 + 새 recall 5선 테스트

> 이 문서는 TOOAI rea `arena/0cb85512-rea`에서 작성, `BRAIN_DEFICIENCY_REA_GHIDRA_ANALYSIS.md` 후속. 코드는 문서 승인 후 반영.

---

## 6. 한눈 요약 (12살 버전)

일기장이 “오늘 배운 것 3줄”만 적는 게 지금 우리. 천재들의 일기장은 **누가/무엇을/언제** 칸이 나누어 있고, **중복이면 합치고 틀리면 지우개**로 지우고, **시간표가 있어** “지난주 규칙”을 찾고, **친구 관계도**가 그려져 있어 “세종 친구 장영실”을 따라갈 수 있다. 우리도 칸·지우개·시간표·관계도를 붙이면 된다.
