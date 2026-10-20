# Coding Tools REA Analysis — 14종 도구 장점 흡수 설계 (v2.9.1)

> 분석일: 2026-10-21 · 대상 브랜치: `arena/41417706-rea` v2.9.0 · 분석자: Arena Code REA (정적 + 동적)
> 영상 챕터 14개(0:23~9:17) 기반 — OCR 일부 유실로 추정 복원, 1차 단계 4개 집중 분석, 흡수 형태는 문서 검토 후 결정(decide_after)

## 1. 전체 14종 목록 (영상 기준, 일부 추정)

| # | 한글 제목 (OCR) | 원문 추정 | 영역 | 영상 |
|---|----------------|-----------|------|------|
| 1 | 라이브러리 문서: Context7 vs Serena | Context7 (Upstash) vs Serena (oraios/serena) | Library Docs | 0:23 |
| 2 | 기억: Claude-mem vs Muse 기본 | claude-mem vs Muse memory / skills | Memory | 1:05 |
| 3 | 스킬 찾기: find-skills vs 공식 플러그인 목록 | find-skills vs MCP Directory / marketplace | Skill Discovery | 1:45 |
| 4 | 코드 리뷰: PR-Agent vs Matt Pocock 공식 플러그인 | PR-Agent (The-PR-Agent) vs mattpocock/skills `code-review` | Review | 2:26 |
| 5 | 동시 실행: Orca 내장 하위 에이전트 vs ralph-loop | Orca ADE vs ralph-loop / Ralph Wiggum loop | Fleet | 3:07 |
| 6 | 톤즈? … cava vs rtk headroom | (추정) 알림/사운드 rtk / headroom — 코딩 보조 | Notification | 3:49 |
| 7 | 개발 절차: superpowers vs Matt Pocock skills | superpowers (obra) vs mattpocock/skills 27종 | Methodology | 4:33 |
| 8 | 협업: GitHub MCP vs Atlassian | GitHub MCP vs Atlassian MCP (Jira/Confluence) | Collaboration | 5:16 |
| 9 | 데이터베이스: Toolbox vs Supabase 규칙 vs DBHub | Toolbox (Google) vs Supabase vs DBHub | Database | 5:50 |
| 10 | 클라우드: AWS MCP vs Agent Toolkit vs Azure | AWS MCP vs Agent Toolkit vs Azure MCP | Cloud | 6:34 |
| 11 | 보안: 검사 시점별 | (추정) 보안 검사 시점별 — SAST/DAST/Guard | Security | 7:15 |
| 12 | 웹 검색: Firecrawl vs CrawlAI | Firecrawl vs CrawlAI / crawl4ai | Web Search | 7:58 |
| 13 | 브라우저: browser-use vs agent-browser vs Playwright-DevTools MCP | browser-use (117k) vs Vercel agent-browser (Rust/CDP) vs Playwright/Chrome DevTools MCP | Browser | 8:29 |
| 14 | 디자인: frontend-design vs UI UX Pro Max | frontend-design vs UI UX Pro Max | Design | 9:17 |

> ※ 6, 11번은 OCR 유실로 추정이며, 영상 원본 대조 시 제목 보정 필요.

## 2. 우선순위 선정 이유 (phased 4개)

기존 Arena Code 스택: **Harness² H1~H5 + Fleet O1~O3 + Hybrid HF + D1 Browser 6 tools + D2 RAG TF-IDF+LLM + Genius NL v2.9** 와 직접 맞물리는 영역을 1차로 선정:

- **P1-1 라이브러리 문서 (Context7/Serena)**: D2 RAG/Library 흡수 — 토큰·심볼 효율 개선
- **P1-4 코드 리뷰 (PR-Agent/Matt Pocock)**: Guard/Depth 흡수 — 2축 리뷰(Standards/Spec) 품질 게이트
- **P1-5 동시 실행 (Orca)**: Fleet 흡수 — 이미 Orca REA 완료(b59d929), Harness² 플릿 프로브와 연결
- **P1-13 브라우저 (browser-use/agent-browser)**: D1 Browser 흡수 — 토큰 90% 절감, CDP 기반 경량화

> P1-8 협업(GitHub MCP)은 기존 `fleet gh/diffs`와 겹쳐 2차로 이월.

## 3. 심층 분석 (P1 4개)

### 3.1 Context7 vs Serena — 라이브러리 문서 & 심볼 탐색

**Context7 (Upstash, 62k★, MIT)**
- 2툴: `resolve-library-id` → `query-docs` 2단계 [10](https://chatforest.com/reviews/context7-mcp-server/)[11](https://decodo.com/blog/context7-mcp). 버전별 문서 + 코드 예제 주입.
- 원격 `https://mcp.context7.com/mcp` 또는 로컬 `npx @upstash/context7-mcp`, API 키 선택 [9](https://www.augmentcode.com/mcp/context7).
- CLI+Skills 모드: `ctx7 library` / `ctx7 docs`로 MCP 없이 스킬로 호출 [11](https://decodo.com/blog/context7-mcp).

**Serena (oraios, Python, MIT, LSP)**
- 심볼 단위: `find_symbol`, `find_referencing_symbols`, `insert_after_symbol` 등 IDE 수준 도구 [1](https://mcpvault.io/blog/serena-mcp-server-guide)[4](https://note.com/right_avocet5550/n/nb6785c6bf539?hl=en). 전체 파일 읽기 대신 심볼 1개씩.
- `uv tool install -p 3.13 serena-agent; serena init`로 활성화, JetBrains 백엔드 선택 가능 [16](https://mcp.so/servers/serena).

**비교**
| 관점 | Context7 | Serena | Arena 기존 |
|------|----------|--------|------------|
| 대상 | 외부 라이브러리 문서 | 내부 코드베이스 심볼 | D2 RAG(TF-IDF+LLM) |
| 토큰 | 낮음 — 매칭 섹션만 | 낮음 — 심볼 1개 | 중간 — topK chunks |
| 버전 특화 | Yes | No | 부분 |
| 용도 | "이 라이브러리 어떻게 쓰나" | "이 심볼 어디 쓰이나" | 둘 다 혼합 |

**흡수 제안 (D2 확장)**
- `library.ts`에 **resolve-library-id → query-docs** 2단계 어댑터 추가 (Context7 MCP 호출 래핑, `CONTEXT7_API_KEY` env).
- Serena 심볼 도구 3개(`find_symbol`, `find_referencing_symbols`, `insert_after_symbol`)를 `src/tools/`에 Thin wrapper — Ghidra 도구 29개처럼 `ToolRegistry`에 등록.
- RAG 선택: `library.ts`가 `selectionMode=heuristic|llm`에 더해 `mode=context7|serena|hybrid` 지원 — Context7 문서는 LLM judge 전 TF-IDF 사전 필터로 주입.

**난이도:** 중간 — MCP 2툴 + LSP 3툴 래핑, 기존 Library 인터페이스 유지.

---

### 3.2 PR-Agent vs Matt Pocock `code-review` — 2축 리뷰

**Matt Pocock `code-review` (27 skills 중 1, v1.3.1, MIT)**
- HEAD와 고정점(branch/commit) diff를 **Standards**(repo 코딩 표준 + Fowler 냄새) vs **Spec**(이슈/PRD 일치) 2축 병렬 sub-agent로 리뷰 [4](https://github.com/mattpocock/skills/blob/main/docs/engineering/code-review.md)[12](https://www.claudepluginhub.com/blog/code-review-plugins-in-claude-code).
- `CODING_STANDARDS.md` 커스터마이즈 지원 [10](https://x.com/mattpocockuk/status/2088256432265167185).
- 독립 세션 리뷰 권장 — 작성 세션 내 리뷰는 확증 편향 [4](https://github.com/mattpocock/skills/blob/main/docs/engineering/code-review.md).

**PR-Agent (The-PR-Agent, MIT, v0.42.0)**
- PR 설명/라벨/체인지로그 자동화 + diff 리뷰, GitHub Action/CLI/Docker, LiteLLM 경유 임의 모델 [16](https://www.metacto.com/blogs/automating-pull-request-workflows-with-pr-agent).

**Arena 대비**
- 기존 `guard.ts`는 단순 규칙, `code-review`는 2축 병렬 + `CODING_STANDARDS.md` 기반.
- PR-Agent는 CI 통합, Arena는 아직 Action 미연동.

**흡수 제안 (Guard 강화)**
- `src/harness2/guard.ts`에 **2축 리뷰** 옵션 추가: `guardMode: "single" | "two-axis"` — Standards/Spec 각각 sub-agent(또는 LLM judge 2회 호출)로 병렬 실행, 결과 side-by-side 리포트.
- `.codex/skills/code-review/SKILL.md` 스킬 파일 추가 (Matt Pocock 원문 기반) — `/code-review` 슬래시로 수동 발동, 자연어 `리뷰해줘`도 triggers.
- PR-Agent의 `describe/review/improve` 워크플로를 `src/fleet/cli.ts` `fleet gh`에 매핑 — `arena-code fleet gh --review two-axis` 형태.

**난이도:** 낮음~중간 — Guard 확장 + 스킬 1개, 외부 Action은 선택.

---

### 3.3 Orca — Fleet (이미 흡수, 고도화 여지)

**Orca (stablyai/orca, MIT, 88k★)**
- Git worktree 격리: 에이전트당 독립 checkout, 공유 mutable state 없음 [1](https://rpabotsworld.com/orca-ade-open-source-parallel-agent-orchestrator-guide/).
- Orchestration: `@all/@idle/@codex/@worktree:<id>` 디스패치, `worker_done` 리포트, `orca orchestration run --max-concurrent N` [3](https://www.ramonchancay.me/blog/orca-parallel-coding-agent-fleet).
- 우리는 b59d929에서 Run→Task→Dispatch→worker_done, `worktreeFleet.ts`로 이미 흡수 완료. Harness² `fleetProbe` + Engine/Depth 연동은 5272bbe HF.

**추가 흡수 여지**
- Ralph의 **intra-loop wave** (concurrency N + aggregator wait_for_all) [5](https://github.com/mikeyobrien/ralph-orchestrator/issues/210) — 현재 Fleet은 loop 레벨 병렬만, wave는 single-task 내 병렬.
- **AgentLoop** durable queue 재사용 제안 [6](https://github.com/woodsja/AgentLoop/issues/6) — detached executor + lease/lock.
- → `src/fleet/types.ts`에 `Wave { concurrency, isolation: "none"|"worktree", aggregate: "wait_for_all" }` 추가 검토.

**난이도:** 중간 — 설계 먼저, 구현은 2차.

---

### 3.4 Browser: browser-use vs agent-browser vs Playwright/Chrome DevTools MCP

**현황 (2026)**
| 도구 | Stars | 접근 | 토큰/페이지 | 특징 |
|------|-------|------|-------------|------|
| browser-use | 117k | Python, CDP (Playwright 제거 2025.08) | 높음 (vision) | 자연어 goal → agent loop, cloud 병렬 [6](https://ryanalberts.github.io/best-of-Agent-Harnesses/compare/browser-agents/) |
| Vercel agent-browser | — | Rust, CDP | 3~5k (93% 절감) | CLI+skill, `@e1` compact refs, batch, streaming [12](https://dev.to/chen_zhang_bac430bc7f6b95/why-vercels-agent-browser-is-winning-the-token-efficiency-war-for-ai-browser-automation-4p87)[14](https://www.test-lab.ai/blog/agent-browser-vs-playwright-cli) |
| Playwright MCP | 37k | MCP, a11y snapshot | 15k (기존) / 2-5k (신규) | Microsoft, 크로스 브라우저, Actions 최다 [1](https://www.heyuan110.com/posts/ai/2026-01-28-claude-code-browser-automation/) |
| Chrome DevTools MCP | 52k | MCP, DevTools | 중 | Google, performance/network/console 특화 [2](https://stevekinney.com/writing/driving-vs-debugging-the-browser) |

**평가**: Browser-use는 토큰 50k/step, loop 비용 큼 [10](https://lite.ego.app/article/playwright-mcp-vs-browser-use). **agent-browser**는 82.5% context 감소, 버튼 클릭 6자 응답 [12][16](https://www.pulumi.com/blog/self-verifying-ai-agents-vercels-agent-browser-in-the-ralph-wiggum-loop/) — Arena D1에 최적.

**Arena D1 현황**: `src/tools/browser.ts` 6툴 (navigate/click/fill/snapshot/screenshot/eval) + Playwright fetch fallback — 이미 tsc0 vitest 82.

**흡수 제안 (D1 고도화)**
- **agent-browser**를 1순위로 래핑: `agent-browser` CLI (Rust 바이너리) 설치 시 D1이 MCP 대신 CLI JSON 모드 사용 — `browser_snapshot` 280 tokens vs 8k [16](https://www.pulumi.com/blog/self-verifying-ai-agents-vercels-agent-browser-in-the-ralph-wiggum-loop/).
- `browser_batch` 도구 추가: 여러 스텝을 한 호출로 (agent-browser `batch` 지원).
- Playwright MCP `isolated` 모드와 Chrome DevTools MCP `console/network`는 선택적 2순위로 `browser_console`/`browser_network` 확장.

**난이도:** 낮음 — 기존 D1 인터페이스 유지, 백엔드 스위칭만.

---

## 4. 2차 대상 요약 (간략)

| # | 도구 | 한줄 흡수 아이디어 |
|---|------|-------------------|
| 2 | Claude-mem | Harness² `context.ts`에 영속 memory-bank (.memory-bank/<project>) 추가 — Serena 메모와 분리 |
| 3 | find-skills | `SkillManager`가 MCP Directory API로 skill 검색 → `arena-code skills discover <query>` CLI |
| 6 | 알림/사운드 | Fleet `worker_done` 시 데스크톱 알림 (headroom/rtk 스타일) — 선택 |
| 7 | superpowers | `superpowers` 파이프라인(plan→execute→review)을 Harness² Depth에 매핑 — 이미 Genius가 일부 커버 |
| 8 | GitHub/Atlassian MCP | `fleet gh`에 Jira/Confluence MCP 브리지 — PR↔이슈 동기화 |
| 9 | Toolbox/Supabase | `src/tools/`에 DB 커넥터 — Toolbox 규칙 기반 접근 |
| 10 | AWS/Agent Toolkit/Azure | Cloud MCP 3종 중 AWS를 1순위로 `src/providers/`에 추가 |
| 11 | 보안 | Guard에 SAST 시점별(작성/커밋/PR) 게이트 추가 |
| 12 | Firecrawl/CrawlAI | `webfetch.ts`에 Firecrawl API 브리지 (현재 fetch 래핑보다 JS 렌더링 지원) |
| 14 | 디자인 | D1 `browser_screenshot` + frontend-design 스킬로 디자인 리뷰 루프 |

## 5. 다음 단계 (decide_after → 제안)

1. **P1 4개 코드 반영 여부 결정**: 위 흡수 제안 중 어떤 것부터 코드로 반영할지 선택 (기본: agent-browser + Matt Pocock 2축 + Context7 2툴)
2. **2차 10개 중 2차 우선순위**: 예) Firecrawl, superpowers, GitHub MCP
3. **구현 순서**: D1 Browser 고도화(1일) → Guard 2축(1일) → D2 Context7/Serena(2일) → Fleet wave(설계)

> 본 문서는 `arena-code` 저장소 일부이며, PR `#1` 머지(v2.9) 이후 후속 분석으로 작성되었다. 질문/수정은 이 문서에 코멘트하거나 해당 모듈 코드로 이어가면 된다.
