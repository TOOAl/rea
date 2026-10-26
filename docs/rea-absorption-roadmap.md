# REA 흡수 로드맵 — 최고 에이전트에서 배우는 두뇌 진화

> **REA 본업**: 바이너리/앱/런타임에서 증거를 뽑아낸다. 같은 방법으로 경쟁 에이전트를 역분석해 그들의 설계 패턴을 증거와 함께 흡수한다.

## 1. 왜 계속 문제가 발견되었는가 (5대 근본원인 — 증거 기반)

| 원인                        | 증거 (커밋)                                       | REA 해석                                                       | 해결                                                                     |
| --------------------------- | ------------------------------------------------- | -------------------------------------------------------------- | ------------------------------------------------------------------------ |
| **Fallback 더미 누수**      | `generic 800→0` 9차례 패치 (`ba1067a`, `80b601e`) | `base_words` 부족 시 `similar word` 자동 생성 — 증거 없는 생성 | `validate-vocab-contract.mjs`가 `-related`를 FAIL로 차단                 |
| **폰트/레이아웃 검증 부재** | `DejaVu TOFU`, `libnspr4 127`, `@import` 미종결   | 렌더 증거 없이 배포 — `hasNoto` 검증 없음                      | `inspectionTeam.ts` TypographyEye가 `□`를 정밀 판정 (hasKoreanFont 분기) |
| **표기 린트 없음**          | `20어` 372건 (`780522a`), `blank` 1200건 노출     | 자연어 규칙이 코드가 아님                                      | HTML 계약 테스트가 `20어`를 WARN, `______`를 FAIL로 강제                 |
| **단일 패스 생성**          | 그림 오버플로 미발견                              | 생성=검증 동일 주체 → 맹점                                     | Manus 패턴: Executor(생성)와 Verifier(검수) 분리                         |
| **차단 대응 부재**          | `raw.githubusercontent SSL 35`, `nltk TLS EOF`    | 외부 의존을 증거 없이 신뢰                                     | `codeload.github` 전환, 오프라인 WordNet 번들                            |

## 2. 두뇌를 최고 수준으로 만드는 5가지 흡수

### Ghidra P-Code → GeometryEye

- **원리**: 바이너리를 P-Code 중간표현으로 분해해 모든 분기 검증
- **흡수**: SVG `viewBox`를 P-Code로 보고 모든 `ellipse/circle/rect`의 BBox가 경계 안인지 정적 검사
- **구현**: `checkGeometryStatic()` — `ellipse cx+rx vs containerW` (그림 8 버그 케이스 `rect 240 vs ellipse 247` 탐지)
- **증거**: `geometryIssues: [{figIndex, tag, overflowPx}]`

### Manus VerificationAgent → Executor/Verifier 분리

- **원리**: 생성을 한 에이전트, 검증을 다른 에이전트가 — 동일 이미지를 다른 눈으로 재검증
- **흡수**: 생파 파이프라인(`generate_all_cards.py`)과 검수팀(`inspectionTeam.ts`)을 다른 모듈로 분리, 검수팀은 생성 로직을 모름
- **구현**: `inspectStatic()` 4개 눈이 독립적으로 FAIL, `fixInstructions`로 재생성

### Codex `--image` → PixelEye

- **원리**: Before/After 스크린샷을 모델에 재투입해 픽셀 diff
- **흡수**: Puppeteer 스크린샷 → `pixelmatch`로 전후 diff <2% 검사 (레이아웃 회귀 탐지)
- **구현**: `checkPixelStatic()` 스텁 + browser 모드 `page.screenshot()`

### Cursor AXTree + console → 이중 검증

- **원리**: 접근성 트리와 콘솔 로그 두 채널로 교차 확인
- **흡수**: `document.fonts.check('12px Noto Sans KR', '가')` (브라우저 폰트 증거) + `computedFont` + `a11yHidden` 수집
- **구현**: `inspectWithBrowser()`가 AXTree와 fonts API 동시 수집

### Claude Browser Use [ref] → 실박스 검사

- **원리**: 좌표 추측이 아닌 실제 렌더 박스 기반 클릭/검사
- **흡수**: `page.evaluate(el.getBBox())`로 SVG 요소의 정확한 렌더 박스 취득, `transform=translate` 그룹은 browser 모드로 위임
- **구현**: `hasTranslateGroup` 시 정적 검사 스킵 → browser 모드로 정확한 BBox

## 3. REA로 직접 흡수하는 방법 (다음 단계)

```bash
# 경쟁 에이전트를 REA로 역분석 — 증거와 함께 패턴 추출
npx rea-agents analyze-javascript-application /path/to/manus-agent --json > manus-evidence.json
npx rea-agents analyze-javascript-application /path/to/cursor-agent --json > cursor-evidence.json

# Evidence에서 패턴 추출 (모듈 그래프, 함수 경계, 오류 처리)
rea inspect-analysis-view manus-evidence.json:summary
# → Verifier가 Executor의 오류를 어떻게 분류하는지 (todo-queue vs 3바퀴 루프)

# 추출한 패턴을 inspectionTeam에 반영
# 예: Manus의 재시도 예산(retry budget) → inspectionTeam의 fixInstructions 우선순위
```

## 4. 진화 루프 (시간이 갈수록 뛰어나지는 구조)

```
매 생성 실패 → .memory-bank/errors.md에 Evidence로 기록
  (generic, hasNoto, overflow, 20어, blank 등 7대 계약 위반 패턴)

다음 생성 전 → memory search로 동일 패턴 재발 방지 프롬프트 자동 주입
  (Mem0/Letta 장기기억 패턴)

주간 self-eval → PASS율 95%→99% 추적, 실패 케이스를 다음 검증 케이스로 승격
  (LangGraph 자가진화)
```

## 5. 완료된 증거 (이번 PR)

- `validate-vocab-contract.mjs`: 1,200 JSON 계약 검사 — generic 0, ko==en 0, blank 0 위반
- `eduVocabContract.ts`: REA Evidence 래퍼 — `evidence_id`+`limitations`+`provenance`
- `eduVocabContract.test.ts`: 15개 계약 테스트 — CI에서 자동 차단
- `edu-verify.yml`: GitHub Actions 3-job 게이트 (vocab-contract + typo-geometry + evidence)
- `inspectionTeam.ts` 패치: □ 체크박스 오탐 수정 (12줄)
- `docs/edu-vocab-contract.md`: 7대 계약 문서화

## 6. 남은 과제 (Evidence provenance 원칙 준수)

| 과제                                             | Evidence                      | Limitation                                                          |
| ------------------------------------------------ | ----------------------------- | ------------------------------------------------------------------- |
| Lv1 내 en 중복 18건 (deteriorate×2 등)           | `distinct 470/1200`           | `dupe within level WARN` — 다음 사이클에서 18개 신규 단어 교체 필요 |
| 동의어 520개 _limitation (generic 제거 후 empty) | `_limitation: synonyms empty` | `unknown ≠ absent` — WordNet 오프라인 번들 필요 (nltk TLS 차단)     |
| Antonyms 707개 0개                               | Evidence에만 기록             | 정상 — 반의어 없는 단어 다수, FAIL 아님                             |
