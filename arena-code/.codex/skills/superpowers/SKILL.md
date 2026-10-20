---
name: superpowers
description: Superpowers 개발 절차 — brainstorm→plan→execute→review 엄격 파이프라인으로 자율 추론 실행 스킬
triggers: ["superpowers", "슈퍼파워", "파이프라인", "브레인스토밍", "절차", "방법론"]
---

# Superpowers — 엄격 파이프라인

Superpowers는 `brainstorm → plan → execute → review` 4단계를 subagents와 worktree 격리로 강제하는 방법론이다. Matt Pocock skills가 개별 도구라면, superpowers는 전체 라이프사이클을 관장한다.

## 언제 발동

"superpowers처럼", "파이프라인으로 진행해", "브레인스토밍부터 시작해" 트리거 시.

## 4단계

1. **Brainstorm (발산)** — 요구사항을 3가지 대안으로 발산. `create_block(type=text, content="대안 A/B/C")`로 기록, 각 대안의 trade-off 명시.
2. **Plan (수렴)** — 대안 중 1개를 선택해 단계별 계획으로 수렴. `TodoWrite`로 3~5단계 계획, 각 단계의 검증 방법 포함. 계획 없이는 execute 금지.
3. **Execute (실행)** — 계획을 한 단계씩 실행, 매 단계마다 `GhidraDecompile`/`Edit` 등 도구를 호출하고 결과를 `list_files`로 검증. 실패 시 `failures.ts`에 로그.
4. **Review (검토)** — Guard 2축(Standards/Spec)으로 자체 리뷰. `securityGate(pr)` + `guardTwoAxis`로 PASS가 될 때까지 반복. review 없이는 완료로 간주하지 않음.

## 출력 규칙

- 보고서에 `Superpowers Brainstorm:` 대안 3개, `Superpowers Plan:` 단계 3개, `Superpowers Review:` PASS/FAIL 필수
- Plan이 없으면 Execute를 시작하지 않음 (파이프라인 위반 시 LIKELY로 강등)

## 예시

> Superpowers Brainstorm: A) PKCE 단일 파일 B) 모듈 분리 C) 외부 라이브러리 — B 선택 (테스트 용이)
> Superpowers Plan: 1) auth.ts 작성 2) PKCE 테스트 3) Guard 통과
> Superpowers Review: Standards PASS, Spec PASS → Verdict PASS
