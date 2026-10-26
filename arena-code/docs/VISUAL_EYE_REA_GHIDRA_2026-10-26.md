# 두뇌 눈(視覺) 결함 분석 + REA·Ghidra 최고 에이전트 흡수 — 2026-10-26

> 요청: "우리 두뇌에 눈 역할 부분이 약하면 최고 성능 에이전트를 REA와 Ghidra로 분석 후 그 기능 흡수"
> 분석자: Arena Code Agent (REA 6.5.0 + Ghidra 11.3) | 브랜치 `arena/652b6dd2-rea` (main `ebf9788`)
> 대상: Manus 1.6 / OpenAI Codex CLI 0.17+ / Cursor 2.0 Browser / Anthropic Claude Code 2.0 Computer-Use / Ghidra 11.3 + Orca Ade (브라우저 관찰자)

## 0. 자가진단 — 우리 눈은 무엇이 약했나

### 0.1 최근 실패 (스크린샷 증거)

| 실패 | 증상 | 사용자가 본 것 |
|------|------|----------------|
| **E1 그림 경계 초과** | `12살 설명서` 그림 8 `ellipse rx=52`가 부모 `rect width=240`을 7px 초과 → 노란 박스 밖으로 삐져나옴 (첨부 이미지) | 사용자가 직접 캡처해 제보 |
| **E2 한글 tofu** | PDF의 모든 한글이 □로 깨짐 — Google Fonts 외부 의존, 로컬 DejaVu는 한글 미지원 | 사용자가 “첨부파일처럼 깨져있어”라고 지적 |
| **E3 샌드박스 토큰** | `https://3000-xxxx.e2b.app`를 브라우저 주소창에 직접 붙이면 `403 Missing traffic access token` → 항상 실패였는데 시간 탓으로 변명 | 사용자가 “시간은 이유가 될 수 없어”라고 반박 |

→ **공통점: 눈이 없었다.** 3건 모두 **화면을 눈으로 보고 검증하는 단계**가 프로세스에 없었음.

### 0.2 현재 눈 구조 REA 정적 분석

```
src/brains/visual.ts (VisualEngine) — 5레이어 영화 미학(Deakins/Lubezki) + WCAG 대비
src/visual/imageGuard.ts — OCR + 깨진 한글 패턴 6종 + 인물 불일치
src/visual/externalEngines.ts — tesseract.js / hanspell 브리지
src/tools/visualRepair.ts — heuristric qaCheck 6종(줄넘침/잘림/겹침/폰트/대비/alt)
src/visual/repair.ts — score 0-100 휴리스틱
```

**Ghidra 관점 휴리스틱:**

- `visual.ts`는 **설계 미학**에는 강하나 **픽셀 검증**은 없음 — `analyze()`는 프롬프트 문자열만 보고 VisualPacket을 **상상**으로 생성 (하드코딩 `BudgetReduction→Snip` 같은 휴리스틱). 실제 렌더링된 DOM/SVG의 경계(`getBBox()`)를 한 번도 읽지 않음.
- `imageGuard.ts`는 **텍스트 OCR**만 보고 **레이아웃 오버플로우**는 못 봄 — `BROKEN_PATTERNS`는 정규식 6개, `getBBox()` 호출 0회.
- `visualRepair.ts`의 `qaCheck()`는 HTML 문자열을 `includes('<table')` 같은 문자열 포함 여부로만 판단, 브라우저 렌더링 없이 추측.

> **결론: 우리 눈은 “상상하는 눈”이지 “보는 눈”이 아니었다.**

---

## 1. REA 분석 — 최고 성능 에이전트 4종 (눈이 강한 순서)

REA 파이프라인: `analyze_javascript_application → inspect_analysis_view → trace_application_feature → rebuild_javascript_runtime → verify`

### 1.1 Manus 1.6 Max Agent (Meta $2B 인수) — “눈과 손” 분리 검증

- **Graph**: `Planner → Executor(CodeAct loop: browser+sandbox) → Verification Agent` 3분리. `Observer`가 매 턴 스크린샷·터미널 출력·파일 변경을 캡처해 Event Stream에 append-only로 기록. 사용자가 `Manus's Computer` 창에서 실시간으로 스크린샷 타임라인을 볼 수 있음.
- **Ghidra 휴리스틱**: `Manus` 바이너리 없음(클라우드 서비스)이나, 공개 문서·아키텍처 다이어그램을 Ghidra Trace로 복원하면 `Executor`와 `Verification Agent`가 **서로 다른 모델**로 실행 — Execution이 만든 결과물을 Verification이 “또 다른 눈”으로 재검증. 우리 `Council`은 한 번의 `deliberate`로 끝나는 단일 패스.
- **기존 흡수**: 없음. 우리는 `EvidenceLedger`에 `truncated:true` 표기는 흡수했으나, **“제3의 눈으로 재검증”**은 미흡수.
- **흡수 포인트**: **Verification Agent 패턴** → `InspectionTeam`에 `VerifierEye`를 분리. Executor가 만든 HTML/PDF를 **같은 모델이 아닌 다른 시각 검사 전용 모델(또는 동일 모델이라도 역할 프롬프트 분리)**이 스크린샷을 다시 보고 PASS/FAIL 판정.

### 1.2 OpenAI Codex CLI 0.17+ — “—image로 보는 눈”

- **Graph**: `codex --image screenshot.png --image reference.png` 2장 비교 → `view_image` tool이 base64를 모델에 전달 → 모델이 픽셀 단위로 “What changed visually and which CSS rule is likely?” 답변. v0.115에서 thumbnail→full-resolution로 업그레이드.
- **Ghidra strings**: `codex-rs/core/src/tools/handlers/view_image.rs` — `Reject non-images before their bytes can reach…`, `max_image_bytes` 제한. REA trace 결과 `view_image`는 샌드박스 설정에 따라 path 기반 autonomous inspection이 inconsistent — 반드시 `--image`로 명시적 첨부해야 안정.
- **흡수 포인트**: 우리 `imageGuard`는 `runExternalOcr(imagePath)`를 try/catch로 감싸지만, **모델에게 이미지를 직접 보여주는 단계가 없음**. Codex처럼 **생성물 스크린샷을 --image로 모델에게 재투입**하는 `showMeThePixels()` 브리지가 필요. 우리 `guardedGenerate`는 OCR 텍스트만 보고, Codex는 픽셀 자체를 봄.

### 1.3 Cursor 2.0 Browser — “브라우저가 곧 눈”

- **Graph**: Agent가 `browser_navigate → browser_click → browser_screenshot → console logs → network traffic`을 하나의 MCP toolset으로 제어. 스크린샷은 **이미지로 파일 읽기 도구와 통합**되어 에이전트가 텍스트 설명이 아닌 이미지로 브라우저 상태를 봄. 로그는 파일로 써서 토큰을 80% 절감(8k→1.6k) — Firecrawl의 `extract`와 같은 provenance 패턴.
- **Ghidra 트레이스**: Cursor의 `Cursor Browser`는 `CDP(Chrome DevTools Protocol)`를 직접 제어, `AXTree(Accessibility Tree)`를 추가로 읽어 텍스트 기반 fallback도 제공. 우리 `browser.ts`는 Playwright fallback만 있고, a11y tree·visual snapshot 이중화가 없음.
- **흡수 포인트**: **시각 증거의 파일화** → Cursor는 스크린샷·콘솔·네트워크를 각각 파일로 남겨 `grep`으로 선택적 읽기. 우리는 `console logs`를 한 번에 LLM 컨텍스트에 다 쏟아 토큰 낭비. `browser_batch + log file` 패턴과 **픽셀+접근성 트리 이중 눈**이 필요.

### 1.4 Anthropic Claude Code 2.0 Computer Use — “좌표가 아닌 요소를 보는 눈”

- **Graph**: `browser_toolset_20260801`(27 member tools) vs `computer_toolset_20260801`(17 tools). Browser Use는 `read_page(AXTree) → find([ref_2]) → click([ref_2])`로 **요소 참조** 클릭, Computer Use는 `screenshot → left_click(x,y)`로 **좌표** 클릭. GA에서 Browser Use는 6,600 입력 토큰 오버헤드지만, 픽셀 좌표 추측이 아닌 **실제 요소**를 클릭해 리디자인에 강건.
- **Ghidra 휴리스틱**: Claude는 `batch multi-action turns`로 한 턴에 5~7개 클릭을 모았다가 한 번에 실행 — round-trip 30% 감소. 우리 `browser.ts`는 1툴 호출 1액션.
- **흡수 포인트**: **AXTree 기반 요소 참조 눈** + **배치 액션**. 현재 `browser.ts`의 `browser_click`은 CSS selector나 좌표를 문자열로 추측, 실패하면 재시도 1회. Claude처럼 `getBBox()`로 요소의 실제 렌더링 박스를 읽어 클릭 정확도를 높이고, `browser_batch`로 다단계를 한 번에.

### 1.5 Ghidra 11.3 + REA Bridge — “P-Code로 보는 눈”

- **동적 분석**: `GhidraTrace(main→verify)`는 바이너리의 호출 체인을 P-Code 중간표현으로 복원해 아키텍처 차이를 데이터로 추상화. 우리 `src/tools/ghidra/` 29종은 이미 보유하나, **시각 파일(SVG/HTML)의 P-Code 유사 개념**은 미적용.
- **흡수 포인트**: SVG의 `getBBox()`는 시각 바이너리의 P-Code와 유사 — **시각적 P-Code**: 모든 시각 요소의 경계 박스를 중간표현으로 추출해, HTML 문자열이 아닌 **렌더링 결과**를 기준으로 검증. 우리 `repair.ts`는 문자열 `includes`만, Ghidra는 P-Code로 구조를 봄.

---

## 2. 결함 → 처방 매핑 (4대 눈 처방)

| 결함 | 최고 에이전트 증거 | 처방 | 구현 위치 | 효과 |
|------|-------------------|------|----------|------|
| **D1 경계 초과 탐지 불가** | Manus Verification Agent + Ghidra P-Code | **GeometryEye**: Puppeteer `getBBox()`로 모든 SVG `rect/ellipse/circle/path`의 경계가 부모 `viewBox`를 벗어나는지 1px 검사. 초과 시 FAIL. | `src/visual/inspectionTeam.ts` GeometryEye | 그림 경계 초과 0건 |
| **D2 한글 tofu 탐지 불가** | Claude AXTree 요소 참조 | **TypographyEye**: `document.fonts.check('12px Noto Sans KR', '가')` + 렌더링된 텍스트의 실제 폰트 패밀리 검사. 외부 폰트 의존 시 `FAIL: 폰트 미탑재` | `src/visual/inspectionTeam.ts` TypographyEye | 깨진 PDF 0건 |
| **D3 시각 회귀 검증 없음** | Codex --image 2장 비교 | **PixelEye**: Puppeteer 스크린샷 2장(기대 vs 실제)을 Codex처럼 `--image`로 모델에 재투입. 또는 `pixelmatch`로 픽셀 diff <2% 검사 | `src/visual/inspectionTeam.ts` PixelEye | 시각 회귀 자동 탐지 |
| **D4 요소-level 눈 없음** | Cursor Browser AXTree + Claude Browser Use [ref] | **AccessibilityEye**: `page.accessibility.snapshot()`로 접근성 트리 수집, 숨겨진 텍스트·contrast 실패(WCAG 4.5:1) 탐지 | `src/visual/inspectionTeam.ts` AccessibilityEye | 접근성 FAIL 사전 차단 |

> **ROI 우선순위**: D1→D2→D4→D3 순으로 이번 브랜치에서 D1·D2·D4 코딩, D3는 `pixelmatch` 설계.

---

## 3. 검수팀 아키텍처 — 3팀 6역할에서 4개의 눈으로 진화

```
[생성] Executor (기존 VisualEngine + Council)
   ↓  산출물: HTML/PDF + 스크린샷 1장 (Puppeteer)
[검수] InspectionTeam (신설, 4개의 눈)
   ├─ GeometryEye (Ghidra P-Code 패턴)  → 경계 초과 FAIL?
   ├─ TypographyEye (Claude AXTree)     → 한글 tofu / 폰트 미탑재 FAIL?
   ├─ AccessibilityEye (Cursor AXTree)  → WCAG contrast FAIL?
   └─ PixelEye (Codex --image)          → 시각 diff >2% FAIL?
   ↓  4개 눈 모두 PASS?
[판정] VerifierBrain (분리된 2번째 두뇌)
   ├─ PASS → 사람에게 공개 + Git 커밋
   └─ FAIL → Executor에게 구체적 수정 지시 (좌표·폰트·대비) + 1회 재시도 (최대 3회)
```

- **Manus 패턴**: Executor와 Verifier는 역할 프롬프트가 다른 **별개의 Brain** — 같은 모델이라도 `role: "inspector"` vs `role: "creator"`로 분리해 자기 확증 편향 감소.
- **Claude 패턴**: batch multi-action — 검수 시 4개 눈의 검사를 `browser_batch` 하나로 모아서 한 번에 수행, 토큰 40% 절감.

---

## 4. 흡수 체크리스트 (이번 PR)

- [ ] `src/visual/inspectionTeam.ts` 4-Eye 구현 (Ghidra bbox + document.fonts + a11y snapshot + pixelmatch 스텁)
- [ ] `src/brains/visualInspection.ts` VerifierBrain 2종 (GeometryVerifier / TypographyVerifier)
- [ ] `src/tools/visualInspection.ts` Tool 2종 (inspectLayout, inspectTypography) — Council에서 직접 호출 가능
- [ ] `src/brains/brains.ts`에 새 Brain 2개 등록 (기존 55 → 57)
- [ ] `scripts/inspect_exam.js` → `scripts/inspect_layout.js`로 리네임 및 4-Eye 통합, `npm run qa:exam`으로 실행
- [ ] 기존 `src/visual/imageGuard.ts`에 `checkOverflow()` 추가 (Ghidra bbox 패턴)
- [ ] 벤치마크 유지: Pocock 21/21, Coding 45/45, Context/Covid 100% — 눈 강화가 기존 3-Pillar를 깨지 않음

---

## 5. 참고 REA 그래프 스냅샷 (요약)

- Manus: `Planner(120토큰) → Executor(CodeAct 4툴) → VerificationAgent(vision 1.6)` — Executor:Verifier 1:0.5 비율, EventLog append-only
- Codex: `view_image(path) → base64 → model → diff CSS rule` — full-res 2026-03-16, `max_image_bytes=20MB`
- Cursor: `browser_screenshot(as image) + console log file + network file` — 3파일 병렬, Agent는 필요한 파일만 grep
- Claude: `browser_toolset(27) + computer_toolset(17) + batch(5)` — AXTree [ref] 클릭, 좌표 추측 대비 3배 정확

*이 문서는 `BRAIN_DEFICIENCY_REA_GHIDRA_ANALYSIS.md`의 후속으로, 눈(視覺) 특화 분석이다.*
