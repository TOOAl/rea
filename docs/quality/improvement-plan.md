# 메인 프로젝트 품질 개선안 — 문맥 이해도 + 결과물 품질

> 지적: 첨부 이미지에서 **밑줄 미표시**와 **정답(③)이 맨 앞에 노출**되는 두 결함이 재발.
> 원인: 프롬프트가 질문+정답을 한 번에 생성 → 렌더러가 `<u>`만 믿음 → PDF 변환/폰트에서 소실, 그리고 정답이 상단에 평문으로 누출.

## 1. 문맥 이해도 향상

### 현재 취약점
- 이미지 하단 잘림(`attention to determines who stays.`)으로 ⑤ 범위 불명확 → 모델이 추측으로 원문 복원 없이 번호만 재배치.
- 절 구조 분석 없이 “understanding”을 단순 단어로만 판단 → 오답 근거 약함.

### 개선
1. **Truncation-aware 파싱**: 입력 이미지가 잘리면 ` [TRUNCATED] ` 태그를 붙이고, 모델에 “잘린 뒤는 `what leaders pay attention to determines who stays`로 복원하되 확신도 표시”를 강제.
2. **절 단위 구조화 IR**: 원문을 평문이 아니라 `clauses[]`로 분해:
   ```json
   { "id":"29", "type":"grammar_in_underline",
     "passage_clauses":[
       {"text":"Managers who listen well are often called “nice,”", "note":"as though + 가정법 were"},
       {"text":"People rarely leave ... when they feel that no one in the organization understands what their work costs them.", "underline":{"num":"③","surface":"understanding","expected":"understands"}}
     ]}
   ```
   이렇게 하면 밑줄 대상이 문자열이 아니라 구조적 슬롯이 됨 → 렌더러가 빠뜨릴 수 없음.
3. **검증용 재진술(Paraphrase) 단계**: 정답을 고르기 전, 각 번호를 “원문→문법 기능→대체 가능 형태”로 1줄씩 재진술하고, 그 재진술이 원문과 모순되면 자동 재시도.

## 2. 결과물 품질 — 렌더링/누출 방지

### 밑줄 미표시 Fix
- `<u>` 단독 사용 금지. 항상 **이중 보장**:
  ```html
  <span class="ul">worth solving</span>
  /* CSS: border-bottom:2.2px solid #000; + text-decoration: underline as fallback */
  ```
- 빌드 시 **스크린샷 리그레션**: Playwright로 HTML → PNG 렌더 후 밑줄 픽셀 수 체크. `validate_exam_output.py`의 `check_underline()`이 5개 미만이면 빌드 실패.
- 폰트: `Noto Sans KR`을 PDF에 임베드, `text-underline-offset` 지정으로 한글/영문 모두에서 밑줄이 글자와 겹치지 않게.

### 정답 노출 Fix (가장 중요)
- **단일 프롬프팅 금지**: `generate(question+answer)`를 `generate_question_IR()` → `generate_answer_separate()` 2단계로 분리.
- **IR 분리**: `question.html`과 `answer.json`을 별도 파일. 최종 HTML은 `{{question}} + <details>`로 조립, 절대 LLM이 상단에 “정답: ③”을 쓰지 못하게 시스템 프롬프트에서 금지 패턴(`정답|Answer.*[①-⑤]`)을 `leak_window=800`에서 차단.
- **빌드 가드**: `scripts/validate_exam_output.py`가 CI에서 실행. 첫 800자에 정답 패턴이 있으면 `FAIL`. 현재 샘플은 PASS.
- **인쇄/PDF 분리**: `<details open>`은 웹에서만 열고, `print` 미디어 쿼리에서는 `page-break-before: always`로 정답이 2페이지로 강제 이동.

## 3. 적용 체크리스트

- [x] 샘플 교정: `docs/quality/sample-29-corrected.html` — 밑줄 7개, 정답은 `<details>` 내부에만
- [x] 가드 스크립트: `scripts/validate_exam_output.py` — PASS
- [ ] CI 연동: `npm run check:pr`에 `python3 scripts/validate_exam_output.py` 추가
- [ ] 프롬프트 분리: 스킬(SKILL.md)에서 `question-only` 모드 추가
- [ ] 스크린샷 테스트: Playwright `expect(page.locator('.ul')).toHaveCount(5)` 추가

## 4. 29번 문항 교정 근거 (요약)

- **정답 ③** — `understanding`은 절의 서술어가 될 수 없음. 주어 `no one`에 대해 `understands`가 필요. 상태동사 진행형도 어색.
- 다른 번호는 모두 문법적으로 정상(상세는 샘플 HTML `<details>` 참조).

이 문서는 다음 생성부터 템플릿으로 강제됩니다.
