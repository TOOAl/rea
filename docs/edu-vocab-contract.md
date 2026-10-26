# 교육 단어장 데이터 계약 & 파이프라인 (Edu Vocab Contract)

> **REA Evidence 원칙**: 모든 생성물은 `evidence_id`와 `limitations`를 명시한다. `unknown`을 `absent`로 오판하지 않는다.

## 1. 왜 이 문서가 main에 필요한가

`arena/48ca6478-rea`에서 1,200단어 생성 중 13번의 fix 커밋이 발생했다:
`20어→20단어` → `blank 노출` → `더미 synonyms` → `폰트 깨짐` → `generic fallback` → `중복 en`

원인: **스펙이 코드가 아니었다**. 사람의 기억에 의존한 규칙은 매번 다른 사람이(에이전트가) 깨뜨린다.

이 문서는 스펙을 CI가 검사하는 계약(Contract)으로 승격한다.

## 2. 데이터 계약 (JSON Schema v1)

### Word 엔트리 구조

```json
{
  "id": "Lv1-001", // Lv{1-4}-{001-1200} 고유
  "en": "deteriorate", // 영단어 (소문자, 중복 금지 within level)
  "ipa": "/dɪˈtɪəriəreɪt/", // 발음기호
  "pos": "v.", // 품사
  "ko": "악화되다", // 한글 뜻 — en과 다름, "(뜻)" 금지, 1자+ 허용 (층/팀/틀)
  "ko_detail": "상태·질·관계가 점점 나빠지다", // 상세 뜻 (필수)
  "level": "Lv1", // Lv1 400 / Lv2 400 / Lv3 300 / Lv4 100
  "day": 1, // 1~60 (Lv1 20일 ×20단어)
  "synonyms": [{ "en": "worsen", "nuance": "점점 나빠지다" }],
  "antonyms": ["improve"],
  "caution": "deteriorate vs determine 구분",
  "etymology": "de(나빠지게)+terior(아래)",
  "example": "Air pollution can deteriorate...",
  "example_ko": "대기오염은 ...",
  "cloze": "Air pollution can ______ children's...",
  "freq": 37, // 1~100 빈도 (수능 출제 빈도)
  "limitations": null // REA: 증거 한계 (선택)
}
```

### 7대 계약 (자동 검증: `node scripts/validate-vocab-contract.mjs`)

| #   | 계약                     | 검증 규칙                                                                             | 실패 시 |
| --- | ------------------------ | ------------------------------------------------------------------------------------- | ------- |
| 1   | ko 유효성                | `ko !== en`, `ko !== "(뜻)"`, `ko.length >=1`                                         | FAIL    |
| 2   | blank 노출               | `cloze`에 `______` 포함                                                               | FAIL    |
| 3   | synonyms/antonyms 무결성 | `-related`, `-like`, `similar word` 단독 금지. 단 `similar` 단독은 정상 동의어로 허용 | FAIL    |
| 4   | example 무결성           | `This is a ____ case.` 더미 금지, example 내 `similar word`는 prefix 필터             | FAIL    |
| 5   | HTML blank               | Lv1 402 / Lv2 400 / Lv3 301 / Lv4 100 정확히                                          | FAIL    |
| 6   | 레벨 분포                | Lv1 400, Lv2 400, Lv3 300, Lv4 100, total 1200                                        | FAIL    |
| 7   | 폰트 임베딩              | `Noto Sans KR` + `base64 @font-face` + `@import` 금지 + `hasNoto true`                | FAIL    |
| +   | 표기 규칙                | `20어` 금지 → `20단어` 사용                                                           | WARN    |
| +   | 중복                     | 동일 레벨 내 `en` 중복 0 (레벨간 반복은 Evidence로 추적)                              | WARN    |

## 3. 생성 파이프라인 (3바퀴 루프)

```
Generate (Executor)
  ↓
InspectStatic (Geometry/Typography) — 브라우저 없이 0.5초
  ↓ FAIL? → Fix prompt → Re-generate → Re-inspect
InspectBrowser (getBBox, fonts.check) — Puppeteer 8초
  ↓ FAIL? → Fix geometry (rx, viewBox) → Re-inspect
InspectPixel (screenshot diff) — 3초
  ↓ PASS (3개 눈) → Evidence bundle 저장 → 배포
```

**고정 규칙**: 실패 시 자동 re-plan — 같은 오류로 2번 실패하면 프롬프트를 수정, 데이터를 수동으로 고치지 않는다.

## 4. REA 흡수 설계

| 최고 에이전트               | REA로 분석할 대상            | 흡수할 패턴           | 우리 구현                                                 |
| --------------------------- | ---------------------------- | --------------------- | --------------------------------------------------------- |
| **Ghidra P-Code**           | SVG viewBox 중간표현         | BBox 경계 검사        | `checkGeometryStatic` — ellipse/circle/rect 초과 탐지     |
| **Manus VerificationAgent** | Executor/Verifier 분리       | 생성과 검증 주체 분리 | `inspectStatic` vs 생성 파이프라인 분리                   |
| **Codex `--image`**         | Before/After 스크린샷 재투입 | 픽셀 diff 회귀 탐지   | `checkPixelStatic` + `compare_web_screenshots`            |
| **Cursor Browser**          | AXTree + console log         | 이중 검증             | 브라우저 모드 `document.fonts.check('가')` + console 캡처 |
| **Claude Browser Use**      | [ref] 클릭 (좌표 추측 금지)  | 실박스 기반 검사      | `page.evaluate(el.getBBox())`                             |
| **Mem0/Letta**              | 장기기억 + 자가진화          | 오류 패턴 벡터 저장   | `.memory-bank/errors.md` → 다음 프롬프트 자동 주입        |

## 5. 지속적 진화 로드맵

- **단기(1주)**: `validate-vocab-contract.mjs` CI 게이트 추가, 중복 18개 WORD 교체
- **중기(1개월)**: WordNet 오프라인 번들(현재 `nltk wordnet TLS EOF`로 차단), `raw.githubusercontent→codeload` 전환, Playwright E2E 확장
- **장기(지속)**: 매 실패를 `.memory-bank/errors.md`에 기록 → 다음 생성 프롬프트에 자동 주입, PASS율 95%→99%

## 6. 검증 명령어

```bash
# 1초 계약 검증
node scripts/validate-vocab-contract.mjs

# 자동 수정 (ko, cloze, synonyms)
node scripts/fix_vocab_contract.mjs

# 레이아웃 검증 (브라우저 없이)
node --loader tsx arena-code/src/visual/inspectionTeam.ts

# 전체 (HTML + JSON + Typography)
npm run test -- inspectionTeam
```
