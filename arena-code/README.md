# Arena Code v2 — Claude Code + Codex + Muse + Ghidra (REA 분석 기반)

> **REA로 3대 코딩 에이전트를 역분석하고, Arena Agent + 무료 API로 재구현한 궁극의 코딩 에이전트**
> **+ NSA Ghidra (Apache 2.0) 완전 통합 — 바이너리와 코드를 하나로!**

Claude Code(52만줄), Codex CLI(Rust 95%), Muse Code(영구 에이전트+worktree)는 모두 `while(tool_use) → loop` harness지만 **각자 다른 강점**이 있습니다. 이 프로젝트는 세 솔루션의 **최고 장점만** 결합해, 무료 API로 누구나 쓸 수 있는 에이전트를 제공합니다.

```
Claude Code의 세련된 Loop + Codex의 샌드박스 + Muse의 Worktree/EventLog + Ghidra 바이너리 분석
= Arena Code v2 ⭐
```

---

## 1. 무엇을 만들었나

```text
arena-code/
├── docs/
│   ├── CLAUDE_CODE_REA_ANALYSIS.md   # Claude Code 역분석 (REA)
│   ├── CODEX_MUSE_REA_ANALYSIS.md    # Codex + Muse 역분석 (REA) ⭐ NEW
│   ├── ARCHITECTURE.md               # 설계 문서
│   ├── GHIDRA_GUIDE.md               # Ghidra 완전 가이드
│   ├── FREE_API_GUIDE.md             # 무료 API 가이드
│   └── architecture-diagram.png      # 아키텍처 그림
├── 초보자_가이드/
│   ├── 0_다운로드_안내.md             # 다운로드 방법
│   ├── 1_초간단_설치가이드.md         # 설치 8단계
│   ├── 2_기능설명서_12세용.md         # 기능 쉽게 설명
│   ├── 3_사용방법_따라하기.md         # 실전 튜토리얼
│   └── 4_Ghidra_바이너리분석_가이드.md # Ghidra 쉽게 배우기
├── src/
│   ├── cli.ts                        # CLI v2 — 샌드박스/worktree/skills
│   ├── loop/
│   │   ├── queryLoop.ts              # Agentic Loop
│   │   └── context.ts                # AGENTS.md 계층 + Compaction
│   ├── sandbox/                      # Codex 3단계 샌드박스 ⭐ NEW
│   │   └── index.ts                  # read-only/workspace-write/danger-full-access
│   ├── eventLog/                     # Muse Event Log ⭐ NEW
│   │   └── index.ts                  # append-only JSONL, resume
│   ├── worktree/                     # Muse Worktree 병렬 ⭐ NEW
│   │   └── index.ts                  # git worktree 격리
│   ├── skills/                       # Muse Skills ⭐ NEW
│   │   └── index.ts                  # /plan, /grill, /goal, /loop, /ghidra
│   ├── background/                   # Muse Background Observers ⭐ NEW
│   │   └── index.ts                  # 4 observers (security/perf/style/correctness)
│   ├── config/
│   │   └── agentsMd.ts               # AGENTS.md 계층 로더 (.git까지 walk) ⭐ NEW
│   ├── providers/                    # 6개 LLM Provider
│   ├── tools/
│   │   ├── read/write/edit/bash/glob/grep/todo/webfetch (8 코딩)
│   │   └── ghidra/ (29 바이너리 분석)
│   └── cli_v1.ts                     # 이전 버전 보관
├── package.json
└── .env.example
```

---

## 2. 빠른 시작

### 요구사항
- Node.js >= 22.19.0, npm 11+

### 설치
```bash
cd arena-code
npm install
npm run build
cp .env.example .env  # GEMINI_API_KEY 등 설정
```

### Ghidra 설치 (바이너리 분석, 선택)
```bash
export GHIDRA_INSTALL_DIR=/path/to/ghidra_11.3_PUBLIC
npx rea-agents setup
npx rea doctor --provider ghidra --json  # healthy: true 확인
```

### 실행
```bash
# 대화형 (권장)
node dist/cli.js

# Headless
node dist/cli.js -p "버그를 찾아줘"

# 스킬 활용
node dist/cli.js --skill plan -p "인증 기능 설계해줘"    # 계획만 세우기
node dist/cli.js --skill ghidra -p "/tmp/app 분석해줘"  # Ghidra 모드

# 샌드박스 (Codex 스타일)
node dist/cli.js --sandbox read-only -p "파일 목록 보여줘"          # 안전한 탐색
node dist/cli.js --sandbox workspace-write                          # 기본값
node dist/cli.js --yolo -p "전체 시스템 정리해줘"                    # 위험! 전체 접근

# Worktree 병렬 (Muse 스타일)
node dist/cli.js --worktree "feature-login" -p "로그인 기능 구현해줘"  # 격리 브랜치에서

# 재개 (Muse Event Log)
node dist/cli.js --resume   # 중단된 세션 이어서

# Provider 선택
ARENA_PROVIDER=gemini node dist/cli.js
ARENA_PROVIDER=openrouter node dist/cli.js --model "qwen/qwen3-coder:free"
```

### 대화형 명령어 (실행 중에)
```
/help            도움말
/plan <요청>     계획을 세우고 승인 후 실행
/grill           계획을 스트레스 테스트
/goal <목표>     목표 달성까지 계속
/ghidra <요청>   Ghidra 분석 모드
/worktree <task> 새 worktree 생성
/worktree:list   worktree 목록
/sandbox <mode>  샌드박스 전환
/clear, /status, /resume, /exit
```

---

## 3. Provider 선택 (무료)

| Provider | 추천 모델 | 특징 | 키 발급 |
|----------|-----------|------|---------|
| **Gemini Free** | gemini-2.0-flash | 1M 컨텍스트, 가장 관대 ⭐ | aistudio.google.com |
| **OpenRouter Free** | deepseek-r1:free | 모델 가장 많음 | openrouter.ai/keys |
| **Groq Free** | llama-3.3-70b | 500 tok/s 초고속 | console.groq.com |
| **Ollama** | qwen2.5-coder:14b | 오프라인 무료 | ollama.com |
| **Arena Agent** | arena-agent | Arena 크레딧 내 | ARENA_API_URL |

---

## 4. REA 분석 재현

```bash
# Claude Code
npm pack @anthropic-ai/claude-code --pack-destination /tmp
npx rea analyze-javascript-application --artifact /tmp/cc-target/package
npx rea trace-application-feature --source /tmp/cc-evidence.json --seed Bash

# Codex CLI (Rust 바이너리)
npm pack @openai/codex
npx rea inspect /tmp/codex-target/codex --provider ghidra --json

# Muse Code (문서 기반 + 패킷)
npx rea inspect-web-capture --capture /tmp/muse-capture.json
```
상세: `docs/CLAUDE_CODE_REA_ANALYSIS.md`, `docs/CODEX_MUSE_REA_ANALYSIS.md`

---

## 5. 3사 비교 vs Arena Code v2

| 구분 | Claude Code | Codex CLI | Muse Code | **Arena Code v2** |
|------|-------------|-----------|-----------|-------------------|
| 벤더 | Anthropic | OpenAI | Meta | **REA + Arena** |
| 도구 | 40+ | 30+ | 40+ | **37개 (8+29)** |
| 샌드박스 | 7단계 deny-first | **3단계 (read-only/workspace/danger)** | OS-enforced | **3단계 통합** |
| 규칙 파일 | CLAUDE.md | **AGENTS.md 표준** | **AGENTS.md + CLAUDE.md** | **AGENTS.md 계층 (.git까지)** |
| 병렬 | Subagents | Cloud Tasks | **Worktree 격리** | **Worktree 격리** |
| 지속성 | 세션 내 | 세션 내 | **Event Log (JSONL)** | **Event Log + resume** |
| 스킬 | Skills/Hooks | Skills | **/plan,/grill,/goal,/loop** | **5개 Skills** |
| 백그라운드 | 없음 | 없음 | **4 Observers** | **4 Observers (휴리스틱)** |
| 바이너리 | 없음 | 없음 | 없음 | **Ghidra 29개 도구** |
| 비용 | 유료 | ChatGPT Plus | 내일/유료 | **무료 API로 $0** |

---

## 6. 라이선스

MIT — REA와 동일. Claude/Codex/Muse 유출 소스는 참고만 했으며 코드는 재작성됨. Ghidra는 Apache 2.0.

