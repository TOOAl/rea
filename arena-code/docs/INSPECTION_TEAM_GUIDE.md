# 검수팀 운영 가이드 — 4-Eye InspectionTeam

> 이 문서는 `VISUAL_EYE_REA_GHIDRA_2026-10-26.md`(분석)의 실행 가이드

## 1. 왜 검수팀이 필요한가

- 기존 `VisualEngine`은 “상상하는 눈”(프롬프트→VisualPacket 추론)이었고, 실제 렌더링된 DOM/SVG의 경계를 한 번도 읽지 않음.
- 사용자 제보 3건(그림 경계 초과 / 한글 tofu / E2B 토큰)이 모두 “눈으로 보고 검증” 단계 부재에서 비롯.

## 2. 4개의 눈

| 눈 | 원전 | 검사 대상 | FAIL 기준 | 처방 |
|---|---|---|---|---|
| **GeometryEye** | Ghidra P-Code | 모든 `<svg>` 자식의 BBox vs 부모 viewBox | 1px 초과 | `rx 52→40` 또는 `width 240→250` |
| **TypographyEye** | Claude AXTree | `document.fonts.check('가')` + base64 여부 | 한글 tofu 또는 외부 폰트 의존 | woff base64 임베딩 |
| **AccessibilityEye** | Cursor AXTree | a11y tree + WCAG 4.5:1 | 대비 실패 | #333으로 보정 |
| **PixelEye** | Codex --image | Puppeteer 스크린샷 2장 pixel diff | diff >2% | pixelmatch |

## 3. 사용법

### 정적 0.1초 검사 (CI, 빠른)
```bash
npx tsx arena-code/scripts/inspectExam.ts
# 또는 모듈로
import { inspectStatic } from "./src/visual/inspectionTeam.js";
const r = inspectStatic(html);
console.log(r.pass, r.summary);
```

### 브라우저 5초 정밀 검사 (출시 전 필수)
```bash
node scripts/inspect_layout.js
# 내부에서 Puppeteer + @sparticuz/chromium 로 getBBox() 정밀 검증
```

### Tool로 호출 (Agent가 직접)
```
inspectLayout(filePath: "중3과학시험지/문제지.html")
checkOverflow(html: "<svg>...")
```

## 4. Council 통합

- `GeometryVerifierBrain`(layer1, error)과 `TypographyVerifierBrain`(layer1, error)이 Council에 자동 참여.
- 작업에 HTML/SVG가 포함되면 자동으로 4-Eye 결과를 출력, FAIL 시 사람 공개 전 차단(1929 게이트).

## 5. 수정 이력

- `c9d98ed` 한글 폰트 내장 → TypographyEye PASS
- `827f7b4` 그림8 rx52→40/width250 → GeometryEye PASS
- 이번 PR 4-Eye 정적+Brower 이중 검증 → 모든 시험지 PASS(100점)

## 6. 실패 시 흐름 (Manus VerificationAgent 패턴)

```
Executor(생성) → HTML/PDF 생성
   ↓
InspectionTeam(4-Eye) 검사
   ↓ PASS? → 사람 공개 + git push
   ↓ FAIL → fixInstructions 생성 → Executor에 재지시 → 최대 3회
```

- Executor와 Verifier는 역할 프롬프트가 분리 — 자기확증 편향 방지.
