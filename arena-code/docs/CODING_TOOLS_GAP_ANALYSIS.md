# Coding Tools Gap 분석 — 지금까지 결과물(v2.11.0)에 필요한 것 (REA)

> 분석일: 2026-10-21 · 대상: `arena-code v2.11.0` (Harness² H1~H5 + Fleet O1~O3 + D1/D2 + Genius NL + Guard 2축 + Library Context7/Serena, 5b78e04) vs 영상 14종(0:23~9:17)
> 목적: 첨부 14개 중 **현재 결과물에 보완이 필요한 것**만 REA로 선별

## 1. 현황 요약

| 현재 모듈 | 상태 | 대응한 영상 항목 |
|-----------|------|------------------|
| Harness² H1~H5, Guard, Depth | ✅ 완료 | 11 보안(부분) |
| Fleet (Run/Task/Dispatch/worktree) | ✅ 완료 | 5 동시 실행(Orca) |
| D1 Browser 6 tools | ✅ 완료(Playwright fallback) | 13 브라우저(부분) |
| D2 Library RAG + Context7/Serena | ✅ v2.11 완료 | 1 라이브러리 문서 |
| Guard 2축 + code-review 스킬 | ✅ v2.9.1 | 4 코드 리뷰 |
| Genius 4종 NL 트리거 | ✅ v2.9 | — |
| CLI/agents/MCP/ToolRegistry | ✅ | 8 협업(GitHub MCP) 부분 |

## 2. 14종 Gap 판정

| # | 영상 제목(OCR) | 현재 반영도 | 필요도 | 판단 근거 | 흡수 난이도 |
|---|----------------|-------------|--------|-----------|-------------|
| **1** | 라이브러리 문서 Context7 vs Serena | **완료** | — | v2.11에서 resolveLibraryId→queryDocs + Serena 3툴로 흡수 | — |
| **2** | 기억 Muse-mem vs Muse | **미흡** | **높음** | Harness² Library는 도메인별 경험만 저장, 세션 간 장기 기억(per-project `.memory-bank`) 없음. Muse/Codex의 영속 memory 필요 | 중간 |
| **3** | 스킬 찾기 find-skills vs 공식 플러그인 목록 | **미흡** | **중간** | SkillManager는 로컬 `.codex/.arena/.agents`만 스캔, 외부 마켓플레이스 검색 없음. Discovery 필요 | 낮음 |
| **4** | 코드 리뷰 PR-Agent vs Matt Pocock | **완료** | — | v2.9.1 Guard 2축 + code-review 스킬로 흡수 | — |
| **5** | 동시 실행 Orca vs ralph-loop | **완료** | — | Orca b59d929 + HF 5272bbe로 완료, wave는 2차로 이월 | — |
| **6** | 톤즈? cava vs rtk headroom | **없음** | **낮음** | 알림/사운드 — Fleet worker_done 알림 정도로 충분, 코어와 무관 | 낮음 |
| **7** | 개발 절차 superpowers vs Matt Pocock skills | **부분** | **높음** | superpowers의 `brainstorm→plan→execute→review` 파이프라인이 Harness Depth/Guard와 직접 연결. Genius는 개별 사고법, superpowers는 절차로 보완 | 중간 |
| **8** | 협업 GitHub MCP vs Atlassian | **부분** | **높음** | `fleet gh/diffs`는 있으나 Jira/Confluence/Atlassian 이슈 연동 없음. PR↔이슈 동기화가 Fleet 워크플로우에 필요 | 중간 |
| **9** | 데이터베이스 Toolbox vs Supabase vs DBHub | **없음** | **중간** | 현재 DB 커넥터 없음. Toolbox 규칙 기반 DB 접근은 DBHub보다 보안상 유리, Supabase 규칙은 별도 | 중간 |
| **10** | 클라우드 AWS MCP vs Agent Toolkit vs Azure | **없음** | **중간** | Cloud MCP 3종 없음. Arena Provider가 Anthropic/Gemini/OpenRouter만, AWS/Azure 배포 연동 필요 시 | 중간~높음 |
| **11** | 보안 검사 시점별 | **부분** | **높음** | Guard는 환각/스타일만, SAST/DAST 시점별(작성/커밋/PR) 게이트 없음. 2축 리뷰와 결합 시 효과 큼 | 중간 |
| **12** | 웹 검색 Firecrawl vs CrawlAI | **미흡** | **높음** | `webfetch`는 단순 fetch, Firecrawl/CrawlAI는 JS 렌더링·크롤·추출 지원. Library 외 웹 리서치 시 필요 | 낮음 |
| **13** | 브라우저 browser-use vs agent-browser vs Playwright-DevTools MCP | **부분** | **높음** | D1 6툴에 Playwright fallback만, agent-browser 82% 절감·batch 미흡. browser-use는 토큰 과다라 제외, agent-browser 1순위 | 낮음 |
| **14** | 디자인 frontend-design vs UI UX Pro Max | **없음** | **중간** | D1 screenshot은 있으나 디자인 시스템/프론트엔드 리뷰 루프 없음. Design Mode 고도화에 필요 | 중간 |

## 3. REA 결론 — 꼭 필요한 6개

> 현재 v2.11.0에서 **당장 보완 시 ROI가 높은 6개** (상위 → 하위):

1. **2 기억 (Claude-mem)** — `.memory-bank/<project>` 영속 기억 + `.serena/` 분리. Harness Library가 도메인 경험이라면, memory는 세션 간 의사결정 로그. 1일 구현.
2. **11 보안 시점별** — Guard에 SAST 시점 게이트(작성/커밋/PR) 추가, 2축과 연동해 `Verdict: FAIL` 시 Fleet block. 1일.
3. **12 웹 검색 (Firecrawl)** — `webfetch` → Firecrawl API 브리지, `src/tools/webfetch.ts` 교체 없이 옵션 추가. Library RAG 외부 소스 확장. 0.5일.
4. **13 브라우저 고도화 (agent-browser)** — D1에 Rust 바이너리 `agent-browser` CLI 백엔드 스위칭 + `browser_batch`. 1일.
5. **7 개발 절차 (superpowers)** — superpowers 파이프라인을 Harness Depth에 매핑, Genius와 상호보완. 1일.
6. **8 협업 (Atlassian)** — GitHub MCP에 더해 Jira/Confluence MCP 브리지, `fleet gh` ↔ 이슈 동기화. 1~2일.

**2차(선택):** 3 스킬 찾기, 9 DB(Toolbox), 10 클라우드(AWS), 14 디자인 — 필요 시.

**불필요/보류:** 6 알림(사운드) — Fleet 알림으로 대체 가능, 코어에 직접 기여 적음.

## 4. 다음 단계 제안 (phased → decide_after 유지)

- **Phase 2A (1~2일):** 2 기억 + 11 보안 → Fleet/Guard와 직결
- **Phase 2B (1일):** 12 Firecrawl + 13 agent-browser → D1/D2 토큰/검색 강화
- **Phase 2C (1~2일):** 7 superpowers + 8 Atlassian → 절차/협업 확장

> 본 문서는 `docs/CODING_TOOLS_REA_ANALYSIS.md v2.11.0` 후속 Gap 분석이며, 코드는 `decide_after` 원칙에 따라 문서 검토 후 반영한다.
