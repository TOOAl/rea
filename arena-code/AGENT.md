# AGENT.md — Arena Code 프로젝트 규칙

이 파일은 Claude Code의 CLAUDE.md와 동일한 역할을 합니다.
Arena Code가 매 턴마다 자동으로 읽는 프로젝트 메모리입니다.

## 프로젝트 규칙
- 언어: 응답은 한국어로, 코드 주석은 영어로
- 커밋 전 `npm run build`와 `npm run typecheck`로 검증 (Harness² 변경 시 `npm test` 47 통과 확인)
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
- arena-code v2.4: Claude Code + Codex + Muse + Ghidra + Harness² Self-Improving Brain (REA v2.3→2.4)
- Provider: gemini/openrouter/groq/ollama/arena/anthropic + 외부 에이전트(openai/mcp/module/command 무제한)
- Tools: Read, Write, Edit, Bash, Glob, Grep, TodoWrite, WebFetch + Ghidra 29 + REA 6 + MCP
- Harness²: H1 harness.ts 380줄 → H2 context 352줄+proposer 382줄 → H3 composer 291줄+engine 614줄 → H4 failures 299줄+library 256줄+CLI → H5 guard+depth 249줄 (e678e8f, vitest 47)
  - 실행: `node dist/cli.js --harness2 --k <n> --mode parallel|sequential --depth 1..5 --domain <name> --evidence-root <path> --dry-run --mock -p "task"`
  - 증거: .arena/harness2/{evidence/<task>#d<depth>-step-<k>/, failures.jsonl, library/<domain>/INDEX.md}
  - 철학: 정답 없이 행동 대비로 편집, omitted-is-inherited, always-on 12k 예산, 3원칙(skill trigger/{{/script동봉), Library 축적
- 다음: Orca Fleet O1~O3 (Run→Task→Dispatch→worker_done) 또는 Library RAG/Selection LLM화 — docs/ORCA_ADE_REA_ANALYSIS.md 참조
