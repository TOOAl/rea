---
name: code-review
description: Matt Pocock 2축 병렬 리뷰 — Standards/Spec로 PR diff를 독립 검증하는 스킬
triggers: ["리뷰", "code review", "code-review", "review", "pr", "standards", "spec", "diff"]
---

# 코드 리뷰 — 2축 병렬

Matt Pocock의 `code-review`는 HEAD와 고정점(diff base) 사이 변경을 **Standards**(저희가 코드 쓰는 방식)와 **Spec**(원래 이슈/PRD가 시킨 일) 2축으로 나눠, 각 축을 독립 sub-agent가 병렬로 리뷰한다. 한 축의 판단이 다른 축을 오염시키지 않는다.

> 출처: mattpocock/skills `code-review` — diff vs fixed point, Standards+Spec, parallel sub-agents [mattpocock/skills:code-review.md], 독립 세션 리뷰 권장, CODING_STANDARDS.md 커스터마이즈 [x.com/mattpocock]

## 언제 발동

"리뷰해줘", "code review", "PR 리뷰", "standards 검사", "spec 일치 확인" 트리거 시.
슬래시 `/code-review [base]` 또는 자연어 `리뷰해줘 <base>` 모두 지원.

## 3단계 (2축 + 통합)

1. **Standards (기준)** — `CODING_STANDARDS.md` + Fowler 냄새 기준
   - `CODING_STANDARDS.md`가 harness/tree에 있으면 그 규칙을 로드
   - `guardTwoAxis`가 Fowler smell(`any` 남용, God Class, Long Method 등) 검사
   - 출력: `Standards: PASS/WARN/FAIL` + 위반 파일:줄

2. **Spec (명세)** — 이슈/PRD와 diff 일치 검증
   - 고정점 `base` 이후 diff를 추출 (git diff `base..HEAD`)
   - `spec` 텍스트와 harness/tree 키워드 겹침으로 미구현/과구현 탐지
   - 출력: `Spec: PASS/WARN/FAIL` + missing/partial/scope-creep 분류

3. **병렬 통합** — 두 축을 병렬 sub-agent로 실행, 결과 side-by-side 리포트
   - Arena 구현: `guardTwoAxis(tree, {spec, standardsPath, baseRef})`가 Standards/Spec를 Promise.all로 병렬
   - 보고서: Standards와 Spec 섹션을 분리 유지, 절대 병합/재순위화 금지 (확증 편향 방지)
   - 최종 verdict: 둘 다 PASS면 PASS, 하나라도 FAIL이면 FAIL, WARN만 있으면 WARN

## 출력 규칙

- 보고서에 `Standards:` 1문장 + `Spec:` 1문장 + `Verdict: PASS|WARN|FAIL` 필수
- Standards 증거는 파일명:줄 포함, Spec 증거는 spec 원문 인용 포함
- `CODING_STANDARDS.md`가 없으면 `Standards: WARN — CODING_STANDARDS.md 없음`으로 시작
- 독립 세션에서 리뷰했음을 명시 (작성 세션 내 리뷰는 확증 편향)

## 예시

> Standards: WARN — `src/foo.ts:42`에서 `any` 남용, CODING_STANDARDS.md 규칙 3 위반
> Spec: FAIL — PRD "로그인에 PKCE 추가" 중 `code_challenge` 구현 누락 (missing)
> Verdict: FAIL — Standards 1개 WARN, Spec 1개 FAIL
