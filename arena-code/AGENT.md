# AGENT.md — Arena Code 프로젝트 규칙

이 파일은 Claude Code의 CLAUDE.md와 동일한 역할을 합니다.
Arena Code가 매 턴마다 자동으로 읽는 프로젝트 메모리입니다.

## 프로젝트 규칙
- 언어: 응답은 한국어로, 코드 주석은 영어로
- 커밋 전 `npm run build`와 `npm run typecheck`로 검증 (Harness²/Fleet 변경 시 `npm test` 63 통과 확인)
- 모든 파일 수정 전 Read로 기존 내용 확인
- 복잡한 작업은 TodoWrite로 계획 후 실행
- Harness² SurfaceSpec 준수: `AGENTS.md` always-on 12k, `skills/<name>/SKILL.md` trigger, `{{` 금지, `scripts/` 동봉 — `validate(ARENA_SURFACE,tree)` 통과 필수

## 코드 스타일
- TypeScript strict 모드
- 함수형 선호, 클래스 최소화 (Provider는 예외)
- 에러 처리는 명시적 — silent fail 금지

## 도구 사용 가이드
- 탐색: Glob/Grep 먼저, 그 다음 Read
- 수정: Edit 우선, 새 파일만 Write
- 검증: Bash로 `npm test` 또는 `npm run build` 실행

## 현재 프로젝트 상태
- arena-code v2.5: Claude Code + Codex + Muse + Ghidra + Harness² Self-Improving Brain + Orca Fleet (REA v2.4→2.5)
- Provider: gemini/openrouter/groq/ollama/arena/anthropic + 외부 에이전트(openai/mcp/module/command 무제한)
- Tools: Read, Write, Edit, Bash, Glob, Grep, TodoWrite, WebFetch + Ghidra 29 + REA 6 + MCP
- Harness²: H1~H5 9모듈 완료 (e678e8f, guard+depth 511줄, vitest 47→63) + Fleet O1~O3 6모듈 (types 99+store 394+worktreeFleet 70+dispatch 170+coordinator 220+worker 150+cli 250, fan-out 16, GH passthrough, decisionGate)
  - 실행: `node dist/cli.js --harness2 --k <n> --mode parallel|sequential --depth 1..5 --domain <name> --evidence-root <path> --dry-run --mock -p "task"`
  - Fleet: `node dist/cli.js --fleet --fanout N --dry-run -p "prompt"` + `arena-code fleet <run-create|task-create|worker-start|check|ack|worker-done|gh|diffs>`
  - 증거: .arena/harness2/{evidence/<task>#d<depth>-step-<k>/, failures.jsonl, library/<domain>/INDEX.md}
  - 철학: 정답 없이 행동 대비로 편집, omitted-is-inherited, always-on 12k 예산, 3원칙(skill trigger/{{/script동봉), Library 축적
- 다음: Harness²×Fleet 결합 (probe를 dispatch로 병렬, depth×fan-out) + Design Mode — docs/ORCA_ADE_REA_ANALYSIS.md v2.5 참조
