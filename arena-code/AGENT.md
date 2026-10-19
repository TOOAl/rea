# AGENT.md — Arena Code 프로젝트 규칙

이 파일은 Claude Code의 CLAUDE.md와 동일한 역할을 합니다.
Arena Code가 매 턴마다 자동으로 읽는 프로젝트 메모리입니다.

## 프로젝트 규칙
- 언어: 응답은 한국어로, 코드 주석은 영어로
- 커밋 전 `npm run build`와 `npm run typecheck`로 검증
- 모든 파일 수정 전 Read로 기존 내용 확인
- 복잡한 작업은 TodoWrite로 계획 후 실행

## 코드 스타일
- TypeScript strict 모드
- 함수형 선호, 클래스 최소화 (Provider는 예외)
- 에러 처리는 명시적 — silent fail 금지

## 도구 사용 가이드
- 탐색: Glob/Grep 먼저, 그 다음 Read
- 수정: Edit 우선, 새 파일만 Write
- 검증: Bash로 `npm test` 또는 `npm run build` 실행

## 현재 프로젝트 상태
- arena-code: Claude Code 클론, REA 분석 기반
- Provider: gemini/openrouter/groq/ollama/arena 중 선택
- Tools: Read, Write, Edit, Bash, Glob, Grep, TodoWrite, WebFetch
