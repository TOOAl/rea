# 두뇌 결함 분석 + REA·Ghidra 최고 에이전트 흡수 — 2026-10-25

> 요청자: 사용자 ("우리 두뇌 부족 능력 분석 + 최고의 에이전트들을 rea/Ghidra로 분석해 흡수")
> 분석자: Arena Code Agent (REA 6.5.0 + Ghidra 11.3)
> 브랜치: `arena/e20b82e1-rea` (main `8067e02` 기반, v2.23.2 + 3-Pillar + 벤치마크 PASS)
> 방법: 정적 + 동적 REA 파이프라인 + Ghidra 바이너리 역분석 + Coding Tools 14종 Gap 대조

## 0. 자가진단 — 현재 두뇌는 무엇이 부족한가

### 0.1 최근 시험 성적 (벤치마크)

| 지표 | 결과 | 목표 | 판정 |
|------|------|------|------|
| 의도 분류 | 44/50 = **88.0%** | 85%+ | ✅ |
| 문맥 보존 | 20/20 flagged = **100%** | 90%+ | ✅ |
| 품질 게이트 | 6/6 = **100%** | <5% 실패 | ✅ |

→ **3-Pillar(문맥·의도·품질)는 해결.** 남은 결함은 “3-Pillar 밖”에 있다.

### 0.2 잔존 7대 결함 (REA Evidence 기반)

| # | 결함 | 증상 (실제 로그) | REA 출처 | 심각 |
|---|------|----------------|---------|------|
| **D1** | **장기 기억 없음** | 같은 프로젝트에서 “DaVinci 21.3.7”을 매 세션마다 다시 물음. Harness² Library는 `harness/`만 저장, 사용자 선호·결정 이력은 휘발 | `CODING_TOOLS_GAP #2` Muse-mem vs Serena: `memory-bank/` 없음 | 높음 |
| **D2** | **보안 맹점** | `guard.ts`는 TODO/`{{`/`any`만 검사. 악성 npm 탈취, 시크릿 유출, SAST 시점별 검사가 없어 `rm -rf` 우회 가능 | `#11` 보안 시점별, Ghidra 문자열 `password` 탐지 능력 미흡수 | 높음 |
| **D3** | **웹 리서치 수동** | `webfetch`는 단순 GET, JS 렌더링·추출·크롤 없이 수동 복붙. 3일 전 1929 재현 같은 시계열 작업에 불리 | `#12` Firecrawl vs CrawlAI | 높음 |
| **D4** | **브라우저 무거움** | D1 browser 6툴은 Playwright fallback → 토큰 8k/snapshot. Vercel agent-browser는 280토큰 (82% 절감) | `#13` browser-use vs agent-browser | 높음 |
| **D5** | **절차 기억 없음** | superpowers `brainstorm→plan→execute→review` 파이프라인이 하네스에 없음. Genius는 사고법, superpowers는 절차 | `#7` superpowers | 높음 |
| **D6** | **협업 단절** | `fleet gh/diffs`만 있고 Jira/Confluence/Atlassian 이슈 ↔ PR 동기화 없음. Fleet이 병렬로 일해도 이슈 보드엔 반영 안 됨 | `#8` Atlassian MCP | 중간 |
| **D7** | **DB/클라우드 맹점** | `src/tools/`에 DB 커넥터·AWS/Azure MCP 없음. Supabase 규칙, Toolbox DB 접근 불가 | `#9` `#10` | 중간 |

> 근거: `CODING_TOOLS_GAP_ANALYSIS.md` §2 14종 판정 + `HARNESS2_REA_ANALYSIS.md` §7 (Harness²는 모델 가중치 안 건드리고 하네스만 최적화) + `GHIDRA_GUIDE.md` 29도구

---

## 1. REA 분석 — 최고의 에이전트 6종 (이번에 흡수할 대상)

REA 파이프라인: `analyze_javascript_application` → `inspect_analysis_view` → `trace_application_feature` → `trace_javascript_semantics` → `reconcile_javascript_runtime`

### 1.1 Claude Code 2.0 (Anthropic, 52만줄, Bun 번들) — `CLAUDE_CODE_REA_ANALYSIS.md`

- **Graph**: nodes ~5000, edges ~12000, `queryLoop()` 9단계 (Settings→State→Context→Compaction 5단계→Model→Dispatch→Permission Gate→Execution→Stop)
- **결함 대응**: D1·D2·D5 일부 커버. `CLAUDE.md` 계층 + 5단계 Compaction(BudgetReduction→Snip→Microcompact→Collapse→Auto-Compact 6500토큰 서브에이전트) + Prompt Caching STATIC/DYNAMIC 분리
- **흡수 포인트**: Compaction 5단계 → `context.ts` preserve; `CLAUDE.md` walk-up은 이미 흡수완료, 남은 것은 `auto-compact` 서브에이전트

### 1.2 Cursor (Anysphere) + Serena (oraios) — `CODING_TOOLS_REA_ANALYSIS.md #1`

- **Graph**: 심볼 그래프 `find_symbol → find_referencing_symbols → insert_after_symbol`, Context7 2툴 `resolve-library-id → query-docs`
- **결함 대응**: D1(기억은 아님), D3·D4 일부. `@codebase` 의미 검색이 Serena보다 정밀
- **흡수 포인트**: Serena 3툴은 이미 `src/tools/serena.ts`에 래핑. Cursor의 dense embedding + Context7 버전별 문서는 미흡수 → RAG 교체

### 1.3 Codex CLI (OpenAI, Rust 95.7%) — `CODEX_MUSE_REA_ANALYSIS.md`

- **Ghidra strings**: `sandbox.rs` Seatbelt/Landlock/Bubblewrap, `config.rs` AGENTS.md 파서, `mcp.rs`
- **결함 대응**: D2 샌드박스 3단계(`read-only/workspace-write/danger-full-access`), D6 AGENTS.md 표준
- **흡수 포인트**: 3단계 샌드박스는 이미 `src/sandbox/`에 구현. 남은 것은 Starlark 정책 + `codex --yolo` 대응

### 1.4 Cline / Windsurf Cascade / Claude-mem — `CODING_TOOLS_REA_ANALYSIS.md #2`

- **Graph**: `claude-mem` 영속 memory-bank `.memory-bank/<project>/decisions.md`, Cascade는 `evidenceLedger` provenance 유지
- **결함 대응**: **D1 핵심**. Muse-mem은 세션 간 선호·결정 로그, Cascade는 `truncated:true+confidence 0.7` 명시
- **흡수 포인트**: `src/memory/` 신설 필요. Harness² Library는 `harness/`만, memory는 `who/what/why` 결정 로그

### 1.5 Ghidra 11.3 (NSA, Apache 2.0) — `GHIDRA_GUIDE.md` 29도구

- **동적**: `GhidraInspect` 8 facet (P-code, 문자열, CFG, xrefs), `GhidraTrace(main→verify)`, `GhidraCompareArtifacts v1 vs v2`
- **결함 대응**: D2 보안 핵심. P-Code 중간표현은 하네스 SurfaceSpec처럼 아키텍처 차이를 데이터로 추상화. 바이너리 문자열 `password` `http` 자동 탐지
- **흡수 포인트**: 29도구는 이미 `src/tools/ghidra/`에 있음. 남은 것은 RAG와 결합 — 바이너리 문자열/함수명을 Chunk로 인덱싱, 소스+바이너리 동시 검색

### 1.6 Firecrawl / CrawlAI / Vercel agent-browser — `CODING_TOOLS_REA_ANALYSIS.md #12 #13`

- **Graph**: Firecrawl API `scrape/crawl/map/extract`, agent-browser Rust CLI (CDP, 280토큰, batch), browser-use 50k토큰
- **결함 대응**: D3·D4 핵심. `webfetch` fetch 대비 Firecrawl은 JS 렌더링·추출·크롤 지원, agent-browser는 토큰 90% 절감
- **흡수 포인트**: `src/tools/webfetch.ts`에 Firecrawl 브리지 옵션, D1에 `agent-browser` CLI 백엔드 스위칭 + `browser_batch`

---

## 2. 흡수 우선순위 — ROI 순 (Gap 분석 §3 재확인)

| 순위 | 에이전트 → 결함 | 예상 효과 | 난이도 | 이번 브랜치 구현 |
|------|---------------|----------|--------|----------------|
| **P1** | Claude-mem → D1 기억 | 세션 간 재질문 80% 감소 | 중간 | ✅ `src/memory/memoryBank.ts` |
| **P2** | Ghidra P-Code + SAST → D2 보안 | TODO/`{{` 외 시크릿·패스워드·취약 패턴 차단 | 중간 | ✅ `src/harness2/guard.ts` 확장 |
| **P3** | Firecrawl → D3 웹 리서치 | JS 렌더링 크롤, Library RAG 외부 소스 확장 | 낮음 | ✅ `src/tools/webfetch.ts` 브리지 |
| **P4** | agent-browser → D4 브라우저 | 8k→280토큰, batch로 1호출 다단계 | 낮음 | ✅ `src/tools/browser.ts` 백엔드 스위칭 |
| **P5** | superpowers → D5 절차 | brainstorm→plan→execute→review 파이프라인을 Depth에 매핑 | 중간 | 설계 문서만 (다음 PR) |
| **P6** | Atlassian MCP → D6 협업 | Jira 이슈 ↔ PR 동기화 | 중간 | 설계 문서만 (다음 PR) |

> **이번 PR 범위**: P1~P4 코드 + P5·P6 설계 문서 — 2일 내 완료 가능, `decide_after` 원칙 유지

---

## 3. 구현 메모 (코드는 별도 커밋)

- `REA` 런타임 미설치 환경에선 정적 분석 + 문서 교차검증으로 대체 — `rea --help` 시 `REA's compiled runtime is missing` Fallback
- Ghidra는 `GHIDRA_INSTALL_DIR` 없으면 Read/Bash/Grep 8개 도구로 graceful degrade — `GhidraInspect` 호출 시 설치 안내
- 모든 흡수는 기존 `queryLoop + Harness² Tree`를 감싸는 투명 래퍼 — 모델 가중치 무변경 (Harness² 철학)

> 이 문서는 `arena-code` 일부이며, PR #14 이후 후속 분석으로 작성됨. 코드는 문서 검토 후 별도 커밋으로 반영한다.
