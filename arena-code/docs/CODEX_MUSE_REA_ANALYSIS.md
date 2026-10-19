# REA로 분석한 Codex & Muse — 역분석 보고서

> 분석 대상: `@openai/codex` (npm, Rust 95%+ / codex) + `Muse Code` (Meta, muse-spark 1.2)
> 분석 도구: REA 6.5.0 (JS/Electron analysis, binary investigation) + 공식 문서 교차검증
> 작성일: 2026-10-19

---

## 1. 요약 — 3대 에이전트의 설계 철학

| 에이전트 | 제작 | 출시 | 핵심 철학 | 코드베이스 특징 |
|----------|------|------|-----------|-----------------|
| **Claude Code** | Anthropic | 2024 | Less scaffolding, more model | TS 52만줄, Bun 번들 |
| **Codex CLI** | OpenAI | 2025.04 | Sandboxed, fast, cloud-agnostic | Rust 95.7% (codex-rs), 빠른 TUI |
| **Muse Code** | Meta | 2026.08 | Persistent agents + worktrees + event log | Native binary (Rust/Go), 1M 토큰 Spark 1.2 |

**공통점**: 모두 `while(tool_use) → execute → loop` agentic harness.
**차이점**: Codex는 **샌드박스**, Muse는 **병렬 worktree + 이벤트 로그**에 집중.

> Arena Code는 세 솔루션의 **최고 장점만** 결합한다.

---

## 2. REA 분석 방법론 (Codex & Muse)

### 2.1 Claude Code와 동일한 파이프라인으로 분석

```bash
# Codex CLI 확보 (Rust 바이너리 + npm 래퍼)
npm pack @openai/codex
tar xzf openai-codex-*.tgz -C /tmp/codex-target

# Codex CLI는 Rust 바이너리 — REA native investigation으로 분석
npx rea inspect /tmp/codex-target/codex --provider ghidra --json  # 역어셈블리
npx rea inspect /tmp/codex-target --json                          # 전체 개요

# Muse Code는 muse 바이너리 + API 호출 — 동일 방식
# (Muse는 GitHub에 소스 미공개, 문서 기반 분석 + 패킷 캡처로 보완)
npx rea inspect-web-capture --capture /tmp/muse-capture.json  # 네트워크 분석

# 문서/바이너리 교차검증
# Codex: github.com/openai/codex (오픈소스, README + Rust 소스)
# Muse: codepick.dev, dev.meta.ai, innfactory.ai (문서 기반)
```

### 2.2 REA가 밝힌 Codex CLI 바이너리 구조

| 관찰 | 증거 |
|------|------|
| Rust 95.7% | codex-rs 디렉토리, Cargo 구조, TypeScript는 npm 래퍼만 |
| 샌드박스 바이너리 | Seatbelt (macOS), Landlock/Bubblewrap (Linux) 문자열 포함 |
| AGENTS.md 파서 | 바이너리 strings에서 AGENTS.md 관련 로직 확인 |
| MCP 지원 | mcp__ 문자열, MCP 서버 연결 코드 |

### 2.3 REA가 밝힌 Muse Code 바이너리 구조

| 관찰 | 증거 |
|------|------|
| Native binary | 단일 정적 링크 실행파일, `muse` 이름 |
| 이벤트 로그 경로 | `.muse/events.log`, `~/.local/share/muse/sessions/` 문자열 |
| Worktree 관련 | `libgit2`, `worktree` 문자열, git 관련 호출 |
| OS 샌드박스 | Seatbelt, bubblewrap 문자열 (Muse와 유사) |

---

## 3. Codex CLI 심층 분석

### 3.1 아키텍처

```
[User] → [Codex TUI (Rust)] → [Harness] → [Sandbox] → [Tools] → [Execution]
              ↓
         [codex-rs core] — Rust 엔진 (95.7%)
           ├── sandbox.rs     — 3단계 샌드박스
           ├── tui.rs         — Ratatui 기반 TUI
           ├── config.rs      — AGENTS.md 파서
           └── mcp.rs         — MCP 클라이언트
```

### 3.2 3단계 샌드박스 (가장 큰 차별점!)

| 모드 | 이름 | 설명 | 파일 쓰기 | 네트워크 |
|------|------|------|-----------|----------|
| 1 | `read-only` | 읽기 전용 | 불가 | 차단 |
| 2 | `workspace-write` | 작업 영역 쓰기 (기본) | workspace만 | 차단 (기본) |
| 3 | `danger-full-access` | 모든 권한 | 전체 | 허용 |

```bash
# Codex CLI 샌드박스 사용
codex --sandbox read-only        # 안전한 탐색
codex --sandbox workspace-write  # 기본값 (권장)
codex --sandbox danger-full-access  # 전체 권한 (--yolo와 동일)
```

- **구현**: macOS Seatbelt, Linux Landlock/Bubblewrap, Windows 제한 토큰 + Starlark 실행 정책
- **특징**: 명령줄에서 자유롭게 전환, 설정 파일에서도 지정 가능

### 3.3 AGENTS.md 표준

> "A simple, open format for guiding coding agents" — Agentic AI Foundation / Linux Foundation

- **파일 위치**: 워크스페이스 루트에서 `.git` 경계까지 상위 디렉토리로 올라가며 탐색
- **각 디렉토리 레벨에서**: AGENTS.md 하나만 로드
- **우선순위**: 깊은 파일이 얕은 파일보다 우선, 프로젝트 규칙이 사용자 규칙보다 우선
- **호환성**: CLAUDE.md도 읽음 (Meta가 채택, Claude Code도 호환)

```markdown
# AGENTS.md 예시 (Codex)
# Codex는 AGENTS.md를 최우선으로 읽음

- 이 프로젝트는 Python을 쓴다
- 테스트는 `pytest`로 실행
- `src/legacy/` 폴더는 건드리지 마라
```

**Muse Code는 동일 표준 채택**: AGENTS.md → CLAUDE.md 순서로 탐색, 디렉토리 레벨당 하나씩.

### 3.4 Cloud Tasks & 승인 모델

| 기능 | 설명 |
|------|------|
| Cloud Tasks | GitHub repo를 백그라운드에서 처리 (Codex Cloud) |
| 승인 모드 | `on-request` (기본), `never`, `untrusted` |
| 자동 승인 | `codex --approve-for-me` (v0.147.0+, AI가 승인 판단) |

### 3.5 REA 분석 인사이트 — Codex의 강점

- **Rust 엔진 = 빠름**: TUI 렌더링, 샌드박스 스위칭, 도구 실행 모두 Rust 네이티브
- **샌드박스가 기본**: `read-only`가 안전한 초기 탐색에 유용 — Claude Code의 deny-first보다 세분화
- **오픈 표준 AGENTS.md**: 여러 에이전트가 동일한 규칙 파일을 공유

---

## 4. Muse Code 심층 분석

### 4.1 아키텍처

```
[User] → [muse binary] → [Hatch (하네스)] → [Model inference (외부 VM)]
              ↓
         [Runtime Cell: systemd-nspawn]
           ├── Main Agent Loop (Hatch)
           ├── 4× Background Observer Agents (영구)
           ├── Worktree Manager (git)
           ├── Event Log (append-only JSONL)
           └── Sandbox + Approvals (both on by default)
```

### 4.2 영구 백그라운드 에이전트 (핵심!)

> "Most harnesses spawn a subagent per task and throw it away. Muse Code keeps specialized background agents alive for the entire session."

- **4개의 observer agents** — 각각 품질 축을 감시 (보안, 성능, 스타일, 버그)
- **특징**: 태스크마다 생성/파기가 아니라, **세션 내내 살아있음**
- **동작**: 다음 단계를 자율적으로 수행, 보고 시점을 스스로 결정 — 메인 에이전트 블로킹 없음
- **효과**: 중복 컨텍스트 수집 감소, 대기 시간 감소

```
기존: Task → Spawn subagent → Done → Discard
Muse: Session start → Spawn 4 observers (persistent) → Tasks delegated → Auto-report
```

### 4.3 Git Worktree 병렬 (핵심!)

> "Each child subagent gets its own git worktree and branch — never collide on the same files. Your working copy is never touched."

| 측면 | 설명 |
|------|------|
| **Isolation** | `.muse/worktrees/` 아래에 각 subagent가 독립 worktree 생성 (detached HEAD) |
| **병렬도** | `core_count - 2`, 2~16 범위로 클램프, 추가 요청은 큐 |
| **깊이** | Child는 depth 1 — 자식이 자식을 생성 불가 |
| **취소** | 협력적 취소 (cooperative) — 체크포인트에서만 취소 |
| **요구사항** | Git repo 필요, non-git에서는 조용히 무시 |

```bash
# Muse Code의 fan-out 예시
# 사용자: "인증 모듈 리팩토링하고 테스트 업데이트해줘"
→ Lead agent: refactor subagent (auth/*.ts) + test-update subagent (tests/*)
→ 각각 독립 worktree에서 병렬 작업 → Lead가 통합
```

### 4.4 Append-only Event Log (핵심!)

> "Every model call, tool run, approval, and edit is appended to a local event log before it executes. If it crashes mid-task, it picks up exactly where it left off."

- **위치**: `~/.local/share/muse/sessions/*.jsonl` + `.muse/events.log`
- **내용**: 모든 model call, tool run, approval, edit을 순서대로 기록
- **특성**: crash-safe, replay-exact, restart-safe
- **명령어**: `muse resume`으로 중단 지점부터 재개
- **CI**: 이벤트를 deterministic replay fixture로 전환 가능 (테스트)

### 4.5 OS 샌드박스 + Approvals (둘 다 켜짐)

| 레이어 | 내용 |
|--------|------|
| **Sandbox** | Seatbelt (macOS) / bubblewrap (Linux), workspace+tmp 쓰기, 나머지 read-only, 실패 시 거부 (fails closed) |
| **Approvals** | `on-request` (기본), `untrusted`, `never`; compound 명령은 단계별 심사 |
| **Escape** | `--disable-approval`, `--disable-sandbox`, `--yolo` (둘 다 끄고 workspace 신뢰) |
| **주의** | MCP 도구는 샌드박스 없음 (문서 명시), `--yolo`는 PR checkout에서 위험 |

### 4.6 Bundled Skills

| Skill | 설명 |
|-------|------|
| `/plan` | 작업을 계획으로 변환, 승인 후 실행 |
| `/grill` | 계획을 스트레스 테스트 |
| `/goal` | 목표 달성까지 계속 작업 |
| `/loop` | cron job (예: `5m`, `1h`, `0 * * * *`) |

### 4.7 Inter-session Messaging

- **방법**: Unix socket (같은 머신 내에서만)
- **도구**: `send_message_to_session`, `discover_peers`
- **용도**: 다른 세션이 질문을 해결했을 때 답변 전달, 변경 사항 경고

---

## 5. 3사 비교 — Claude Code vs Codex vs Muse

| 차원 | Claude Code | Codex CLI | Muse Code |
|------|-------------|-----------|-----------|
| **벤더** | Anthropic | OpenAI | Meta |
| **언어** | TS (Bun 번들) | Rust 95% | Native binary |
| **컨텍스트** | 1M | 모델 의존 | 1M (Spark 1.2) |
| **프로젝트 규칙** | CLAUDE.md | AGENTS.md | AGENTS.md → CLAUDE.md |
| **MCP** | Yes | Yes | Yes |
| **병렬** | Subagents | Cloud Tasks | Worktree-isolated (2~16) |
| **샌드박스** | 기본 on | 3단계 (read-only/workspace-write/danger) | OS-enforced + fails closed |
| **승인** | 7단계 + ML | on-request/never/untrusted | on-request/untrusted/never |
| **특화 기능** | Plan Mode, Hooks | Security CLI, cloud | Event log, /plan,/grill,/goal,/loop |
| **지속성** | 세션 내 | 세션 내 | Worktree + event log (crash-safe) |
| **성숙도** | ~2년 | ~1.5년 | Beta (2026.08) |

---

## 6. Arena Code 통합 설계 — 3사의 장점을 하나로

### 6.1 통합 목표

```
Claude Code의 세련된 Agentic Loop
    + Codex의 3단계 샌드박스 + AGENTS.md 표준
    + Muse의 Worktree 병렬 + Event Log
    + Ghidra의 바이너리 분석
    = Arena Code Ultimate ⭐
```

### 6.2 구현 로드맵

| 우선순위 | 기능 | 출처 | 구현 난이도 | 상태 |
|----------|------|------|-------------|------|
| 1 | AGENTS.md 계층 로드 (`.git`까지 walk up) | Codex/Muse | 낮음 | ✅ |
| 2 | 샌드박스 3단계 (read-only/workspace-write/danger) | Codex | 낮음 | ✅ |
| 3 | Event Log (JSONL, crash-safe) | Muse | 낮음 | ✅ |
| 4 | Git worktree 병렬 | Muse | 중간 | ✅ |
| 5 | Skills (/plan, /grill, /goal, /loop) | Muse | 중간 | ✅ |
| 6 | Background observers | Muse | 중간 | ✅ |
| 7 | 승인 모드 (on-request/never/untrusted) | Codex/Muse | 낮음 | ✅ |

### 6.3 REA 분석이 주는 통찰

1. **샌드박스는 경로 체크가 핵심** — Codex는 Landlock으로 OS 강제, 우리는 JS에서 `workspace` 밖 쓰기 차단으로 동일 효과
2. **AGENTS.md는 오픈 표준** — `.git` 경계까지 walk up, 디렉토리 레벨당 하나, 깊은 것이 우선
3. **Event log는 단순한 append** — JSONL에 모든 tool call을 순차 기록, `resume`으로 재개
4. **Worktree는 git 명령어 래퍼** — `git worktree add`로 격리, 완료 후 `git worktree remove`
5. **Background agents는 main loop의 병렬 실행** — Muse의 4 observers는 우리의 TodoWrite + 병렬 tool 실행으로 근사

---

## 7. 한계 및 주의

- Codex CLI 소스는 오픈소스지만 전체 빌드 의존성은 공개되지 않음 — Rust 분석은 문자열/구조 기반
- Muse Code는 바이너리만 배포, 소스 미공개 — 문서 + 네트워크 캡처 + 바이너리 strings 기반
- Spark 1.2 모델은 호스팅 전용 — 로컬에서는 다른 LLM으로 대체
- Event log의 replay-exact 보장은 Muse 문서 기반 — 우리 구현은 단순 JSONL 근사

---

## 8. 참고

- [Codex CLI GitHub](https://github.com/openai/codex)
- [Muse Code Docs](https://codepick.dev/en/guides/muse-architecture/)
- [Muse Code Security (Meta Research)](https://research.meta.ai/blog/security-and-safety-for-ai-agents-our-approach-with-muse)
- [REA Ghidra Provider](../../docs/ghidra-provider.md)
