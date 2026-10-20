# Orca ADE REA 분석 및 Arena Code 흡수 설계

> **Stably AI — Orca: The Agent Development Environment (ADE)**  
> 저장소: `stablyai/orca` · 라이선스: MIT · 버전: 1.4.214 (2026-10-20 기준) · 커밋 15,284개 · 파일 38,133개  
> 분석일: 2026-10-21 · 분석자: Arena Code REA (정적 + 동적) · 대상 분기: `arena/41417706-rea` v2.9 (D1+D2 완료)  
> 분석 소스: `/tmp/orca` (git clone --depth 1, 2026-10-20), 공식 문서 https://onorca.dev

---

## 0. TL;DR — 30초 요약

| 항목 | 내용 |
|------|------|
| **Orca란?** | **ADE (Agent Development Environment)** — IDE가 "한 사람이 코드 치는 곳"이라면, ADE는 "한 사람이 5~100개 AI 에이전트를 지휘하는 곳" [1](https://www.onorca.dev/) |
| **핵심 추상화** | **Fleet (함대)** — 하나의 프롬프트를 5개 에이전트(Claude Code, Codex, Gemini 등)에 동시에 뿌리고, 각자 격리된 git worktree에서 병렬 실행 후 결과를 비교/병합 [2](https://dev.to/arshtechpro/orca-explained-the-agent-development-environment-for-running-ai-coding-agents-in-parallel-440n) |
| **오케스트레이션** | **Run → Task → Dispatch → worker_done** — Run은 네임스페이스/우편함, Task는 DAG 노드, Dispatch는 한 번의 시도. `worker_done --outcome succeeded/failed`로만 완료 처리 [3](https://www.onorca.dev/docs/cli/orchestration) |
| **우리와 관계** | 우리 `WorktreeManager`(1개 worktree), `BackgroundAgentManager`(4 observer)는 Orca의 fleet(무제한 worktree) + coordinator(감독자) 개념의 단순 버전 — 흡수하면 **Harness²(한 개체를 똑똑하게) + Orca(여러 개체를 함께)**가 결합됨 |
| **흡수 전략** | Electron GUI 없이 **CLI-first 경량 fleet**으로 흡수: `src/fleet/` 모듈 추가 (Run/Task/Dispatch 상태 DB + `arena-code --fleet` 명령). 기존 Harness² 진행과 충돌 없음 — 서로 보완 |
| **진행 상태 (v2.9)** | **Harness² H1~H5(e678e8f)+Fleet O1~O3(b59d929)+Hybrid(5272bbe)+D1 browser 6 tools+D2 RAG TF-IDF/LLM selection(v2.9.0) 완료** — Design Mode(Playwright/fetch fallback)+RAG(topK filtering)+LLM judge, tsc0 build0 vitest70 — 다음은 dense embeddings/E2E hardening |

---

## 1. 분석 방법 (REA)

```
대상: /tmp/orca (stablyai/orca, MIT, 26,704 .ts 파일, Electron + React 19 + Monaco + xterm.js + node-pty)
      package.json 404줄, README.md 276줄, skill-guides 10개, docs/ 30+ 문서
분석 도구: 정적 — 디렉토리 트리 / package.json / skill-guides/orchestration.md / skills/orchestration/SKILL.md
           동적 — git log (15,284 커밋), 이슈/PR 분석 (fleet, worktree, dispatch)

핵심 문서:
  skill-guides/orchestration.md (202줄) — Run/Task/Dispatch 정식 계약
  skill-guides/orca-cli.md (294줄) — worktree/agent/terminal/browser CLI
  skill-guides/orchestration/references/{coordinator-loop,worker-contract,messaging-and-gates,placement-and-remote}.md
  docs/model/worktrees, docs/terminal, docs/browser/design-mode
  src/main/* (worktree 생성, terminal PTY 스폰), src/renderer/* (Fleet UI)

검증: MIT 라이선스 확인 (LICENSE), pnpm-lock.yaml 564KB, Electron 43.7.0, 매일 5~15개 커밋
```

---

## 2. Orca가 푼 문제 — 왜 ADE인가?

### 2.1 IDE → ADE 패러다임 전환

| IDE (전통) | ADE (Orca) |
|------------|------------|
| 한 사람이 코드를 친다 | 한 사람이 여러 AI를 지휘한다 |
| 파일/에디터/터미널/디버거 | Fleet(함대) / Run / Task / Dispatch / Decision Gate |
| 병렬은 탭으로 흉내 | **git worktree로 진짜 격리** — 각 에이전트는 자기 브랜치, 자기 터미널, 자기 브라우저 탭을 가짐 [1](https://www.onorca.dev/) [2](https://dev.to/arshtechpro/orca-explained-the-agent-development-environment-for-running-ai-coding-agents-in-parallel-440n) |
| 하나의 에이전트 세션 | **30+ CLI 에이전트 동시 지원** — Claude Code, Codex, Gemini, Cursor, Grok, Copilot, OpenCode, Pi, Cline 등. 규칙: *if it runs in a terminal, it runs in Orca* [4](https://github.com/stablyai/orca) |

### 2.2 핵심 인사이트 — Orca는 모델이 아니다

> *"Orca does not choose which agent to dispatch to. It does not arbitrate quality between competing drafts. It does not decide which of the five parallel outputs is best. The human still has to pick a winner."* — Aniket Karne 리뷰 [5](https://aniketkarneai.com/blog/2026-10-10-orca-ade-fleet-parallel-coding-agents-worktrees)

즉, Orca는 **IDE 배관(plumbing)**이다. 모델 선택, 품질 판정은 사람이 한다. 이 점이 우리 Harness²와 정확히 보완된다 — Harness²는 "한 에이전트를 더 똑똑하게", Orca는 "여러 에이전트를 함께 움직이게".

---

## 3. Orca 아키텍처 — Fleet이 움직이는 법

### 3.1 3계층 오케스트레이션 모델

```
Run (네임스페이스 + 코디네이터 우편함)          — Orca가 소유, 절대 스케줄 안 함
 └─ Task (작업 단위 + DAG edges)               — spec, deps, 상태: pending → ready → dispatched → completed/failed/blocked
     └─ Dispatch (한 번의 시도)                — ctx_* ID, failure_count (3회 서킷브레이커), heartbeats, pane identity
         └─ Worker (터미널 안의 실제 에이전트)  — Claude Code, Codex 등 CLI 프로세스. preamble을 받고 worker_done으로 보고
```

*   **Run** — 영구 네임스페이스. `run-create --objective "migrate auth to OIDC"`로 생성. 코디네이터의 우편함 역할만 함 [3](https://www.onorca.dev/docs/cli/orchestration)
*   **Task** — `task-create --spec "port token exchange" --deps '["task_1"]'`로 DAG 구성. Task는 어떤 시도보다 오래 산다 [3](https://www.onorca.dev/docs/cli/orchestration)
*   **Dispatch** — `dispatch --task task_2 --to term_abc123 --inject`로 터미널에 바인딩. `--inject`가 preamble(작업 ID, Dispatch ID, 통신 규칙)을 주입 [3](https://www.onorca.dev/docs/cli/orchestration)
*   **Message** — 영구 메일: `dispatch`, `worker_done`, `escalation`, `question`, `heartbeat`, `decision_gate`

### 3.2 Worker 계약 (preamble이 곧 법)

디스패치된 worker는 5개 의무를 지켜야 한다 (`skill-guides/orchestration.md` §Worker obligations):

1.  현재 Task만 수행, 차단 질문은 preamble의 `ask` 명령으로만
2.  heartbeat는 preamble의 cadence대로만 — heartbeat는 liveness 증명, 완료 아님
3.  매 자연스러운 체크포인트(파일 시작 전, 테스트 후) + `worker_done` 직전에 `check --terminal <handle>`로 코디네이터 후속 확인
4.  `worker_done`은 **정확히 1회**, dispatched 터미널에서, 두 lifecycle ID + `--outcome succeeded|failed` + 3문장 요약 + `--files-modified`와 함께. 실패를 산문에만 인코딩하지 말 것
5.  `worker_done` 후 idle — 폴링하거나 새 작업 시작 금지

### 3.3 Canonical Supervised Loop (정식 감독 루프)

```text
ORCA status --json
ORCA orchestration run-create --objective "<objective>" --json
ORCA orchestration worker-start --spec "<worker A task>" --worktree current --agent codex --json
ORCA orchestration worker-start --spec "<worker B task>" --worktree current --agent claude --json
ORCA orchestration check --wait --types "worker_done,escalation,question" --timeout-ms 900000 --json
# 코디네이터가 각 메시지를 처리:
ORCA orchestration reply --id <message_id> --body "<answer>" --json
ORCA orchestration worker-release --dispatch <dispatch_id> --json   # 터미널 정리
ORCA orchestration check --ack <delivery_id> --wait ...             # FIFO 재시작
```

완료 판정은 `worker_done`의 명시적 `--outcome`으로만. 터미널 제목, 복사된 ID, 오래된 DB 행, provider transcript는 권한이 없다. `live / unverifiable / exited` 3단 판정은 fleet verdict vs PTY liveness를 분리한다 [3](https://www.onorca.dev/docs/cli/orchestration).

### 3.4 Fan-out 병렬 실행

```
하나의 프롬프트 ──┬─→ Worktree A (Claude Code)  ─┐
                  ├─→ Worktree B (Codex)        ├─→ 나란히 diff 비교 → cherry-pick 병합
                  ├─→ Worktree C (Gemini)       │
                  ├─→ Worktree D (Cursor)       ┘
                  └─→ Worktree E (OpenCode) ───→ 모바일로 알림, 승인 대기 표시
```
각 worktree는 `.orca/worktrees/<id>`에 격리, `cherry-pick` hunks로 최종 병합 [2](https://dev.to/arshtechpro/orca-explained-the-agent-development-environment-for-running-ai-coding-agents-in-parallel-440n).

---

## 4. Arena Code 현재 상태 vs Orca — 흡수가 쉬운 이유

| 관점 | Orca (ADE) | Arena Code (현재 v2.3 + Harness² H1) | 흡수 난이도 |
|------|------------|--------------------------------------|-------------|
| Worktree | `.orca/worktrees/<id>` — 무제한, fan-out | `.arena/worktrees/<id>` — 1개만 (`--worktree <task>`) | ★ 쉬움 — WorktreeManager를 fleet으로 확장 |
| 병렬 에이전트 | 30+ CLI 에이전트, 각 worktree에 하나씩 | 6 Provider + 외부 에이전트(무제한) — 개념 동일 | ★ 쉬움 — agents/manager.ts 재활용 |
| 오케스트레이션 | Run/Task/Dispatch + worker_done 계약 | 없음 — 단일 `queryLoop` 직렬 실행 | ☆ 보통 — src/fleet/ 신설 필요 |
| 터미널 | Ghostty급 WebGL, 무한 split, scrollback 생존 | 단일 Node PTY (Bash tool) | ☆ 보통 — 터미널은 CLI로 충분, GUI 불필요 |
| 브라우저/Design Mode | 내장 Chromium, 요소 클릭 → HTML/CSS/스크린샷을 프롬프트로 | 없음 | △ 나중 — WebFetch로 1차 대체 가능 |
| 모바일/SSH | iOS/Android 컴패니언, SSH 원격 worktree | 없음 | △ 나중 — SSH는 WorktreeManager 원격 확장으로 |
| Diff 리뷰 | 인라인 diff 주석을 에이전트에 반송 | 없음 | ★ 쉬움 — `git diff` + `worker_done --files-modified`로 대체 |
| 상태 추적 | Run/Task/Dispatch DB, decision gates, DAG | EventLog(JSONL) + Background observers | ★ 쉬움 — EventLog에 Task/Dispatch 테이블 추가 |

**핵심:** Orca는 Electron GUI지만, 그 핵심은 **CLI 계약**(Run/Task/Dispatch/worker_done)이다. GUI 없이 CLI 계약만 흡수하면 80% 가치를 얻는다.

---

## 5. Harness² + Orca 결합 — 우리 프로젝트 최종 그림

두 프레임워크는 서로 다른 축을 개선한다:

```
┌─────────────────────────────────────────────────────────────┐
│  Orca Fleet (가로 확장 — 여러 에이전트를 함께)               │  ← 이번에 흡수
│  - 1개 프롬프트를 N개 에이전트(worktree)에 fan-out            │
│  - Run/Task/Dispatch로 누가 무엇을 했는지 추적               │
│  - worker_done으로 완료 판정, 사람은 승자만 pick            │
└──────────────────────┬──────────────────────────────────────┘
                       │ 각 worker 안에서는
                       ▼
┌─────────────────────────────────────────────────────────────┐
│  Harness² (세로 깊이 — 한 에이전트를 똑똑하게)               │  ← H1 완료, H2~H4 진행 중
│  - Propose-Probe-Compose로 하네스를 스스로 개선              │
│  - Library에 교훈 축적, 같은 도메인 반복 시 점점 똑똑해짐    │
└──────────────────────┬──────────────────────────────────────┘
                       │ 하네스가 개선한 프롬프트/도구/스킬로
                       ▼
┌─────────────────────────────────────────────────────────────┐
│  Engine (두뇌)                                              │
│  Gemini / OpenRouter / Ollama / Arena 등 어떤 Provider든    │
└─────────────────────────────────────────────────────────────┘
```

> **비유 (12살용):** Harness²는 "한 명의 학생이 공부법을 스스로 개선"하는 것이고, Orca는 "5명의 학생이 각자 다른 답안지를 써서 선생님이 제일 좋은 답을 고르는" 것이다. 둘을 함께 쓰면 가장 똑똑한 팀이 된다.

---

## 6. 우리 프로젝트 흡수 설계 — `src/fleet/` (CLI-first, 경량)

### 6.1 설계 목표

1.  Electron/GUI 없이 **CLI와 Node만**으로 fleet 핵심을 재현 — Orca의 CLI 계약을 그대로 차용
2.  기존 `WorktreeManager`, `BackgroundAgentManager`, `EventLog`를 **확장** — 새로 갈아엎지 않음
3.  Harness² 진행과 **충돌 없음** — fleet worker 안에서도 Harness²가 돌 수 있음
4.  `arena-code --fleet --fanout 3 -p "로그인 기능 만들어줘"` 한 줄로 체험 가능

### 6.2 새 파일 구조

```
arena-code/src/fleet/
├── types.ts          ← Run, Task, Dispatch, Message 타입 (Orca 계약 포팅, Zod 없이 TS 타입만)
│                       - Run { id, objective, createdAt, coordinatorSessionId }
│                       - Task { id, runId, spec, deps: TaskId[], status, createdAt }
│                       - Dispatch { id, taskId, runId, worktreePath, agentId, provider, status, failureCount }
│                       - Message { id, runId, type: "worker_done"|"escalation"|"question"|"dispatch", payload }
│                       - DecisionGate { id, taskId, question, status }
│
├── store.ts          ← 영구 상태 저장소 (Orca는 SQLite, 우리는 .arena/fleet.json + JSONL)
│                       - FleetStore 클래스: runs/tasks/dispatches/messages CRUD
│                       - DAG 상태 전이: pending → ready → dispatched → completed/failed/blocked
│                       - 서킷브레이커: failureCount >= 3이면 blocked
│
├── worktreeFleet.ts  ← Fleet Worktree 확장 (WorktreeManager → FleetWorktreeManager)
│                       - createFleet(baseBranch, count): N개 worktree 병렬 생성
│                       - 기존 WorktreeManager.create() 재사용 — fan-out만 추가
│                       - 각 worktree에 AGENTS.md, .arena/fleet/DISPATCH_ID 주입 (preamble)
│
├── dispatch.ts       ← Dispatch/Worker 실행 (Orca dispatch --inject 포팅)
│                       - dispatchTask(task, worktree, agent): Dispatch 생성 + preamble 주입
│                       - runWorker(dispatch, provider): queryLoop()를 worker로 실행
│                       - preamble 예: "You are worker <dispatchId> for task <taskId>. When done, run: arena-code --fleet-worker-done ..."
│
├── coordinator.ts    ← Coordinator 루프 (Orca canonical supervised loop 포팅)
│                       - FleetCoordinator 클래스: runCreate, taskCreate, workerStart, check, ack
│                       - check --wait --types worker_done,escalation,question — EventLog를 우편함으로 재활용
│                       - worker_done 검증: lifecycle ID 대조, --outcome 필수, --files-modified 기록
│                       - DAG unblock: Task 완료 시 deps를 가진 대기 Task를 ready로
│
├── worker.ts         ← Worker 계약 (Worker obligations 1~5 포팅)
│                       - WorkerAgent: preamble 파싱, heartbeat, worker_done 1회 보장
│                       - CLI: arena-code --fleet-worker-done --task-id <id> --dispatch-id <id> --outcome succeeded --files-modified "<list>"
│                       - 실패 인코딩 금지 — outcome은 반드시 succeeded/failed 명시
│
└── cli.ts            ← CLI 통합 (--fleet, --fleet-fanout, --fleet-task, --fleet-check)
                        - arena-code --fleet --fanout 5 -p "같은 프롬프트"
                        - arena-code fleet run-create --objective "..." --json
                        - arena-code fleet task-create --spec "..." --deps '["task_1"]' --json
                        - arena-code fleet check --wait --json
```

### 6.3 기존 코드 변경점 (최소 침습)

| 파일 | 변경 | 크기 |
|------|------|------|
| `src/worktree/index.ts` | `WorktreeManager` → `FleetWorktreeManager` 상속 확장, `createFleet(n)` 추가 | ~40줄 |
| `src/eventLog/index.ts` | Fleet Message 타입 추가 — `append("fleet_message", ...)`으로 우편함 겸용 | ~15줄 |
| `src/cli.ts` | `--fleet`, `--fleet-fanout`, `--fleet-worker-done` 옵션 + `fleet/cli.ts` 라우팅 | ~40줄 |
| `src/session/bootstrap.ts` | fleet 모드 시 `FleetCoordinator` 생성 분기 | ~20줄 |
| 기타 | 변경 없음 (`queryLoop`, `providers`, `harness2/*` 그대로) | 0줄 |

### 6.4 데이터 흐름 (MVP: fan-out 3 예시)

```
1. 사용자가 실행: arena-code --fleet --fanout 3 -p "인증 기능 만들어줘"
2. FleetCoordinator.runCreate({ objective: "인증 기능 만들어줘" }) → Run 생성 (.arena/fleet.json)
3. FleetCoordinator.taskCreate({ spec: "인증 기능 만들어줘" }) → Task 1개 생성
4. FleetWorktreeManager.createFleet(main, 3) → worktree A/B/C 생성 (각자 브랜치)
   - A: arena/wt-auth-xxx1 (Provider: gemini)
   - B: arena/wt-auth-xxx2 (Provider: openrouter)
   - C: arena/wt-auth-xxx3 (Provider: ollama)
5. Dispatch 3개 생성 + 각 worktree에 preamble 주입:
   - "You are worker dispatch_abc for task task_1. Run: queryLoop(...). When done, report with --outcome ..."
6. 3개 worker가 각자 queryLoop() 실행 — 각 worktree에서 독립적
   - (각 worker 안에서는 Harness² Propose-Probe-Compose도 돌 수 있음)
7. Worker가 완료 시: arena-code --fleet-worker-done --task-id task_1 --dispatch-id dispatch_abc --outcome succeeded --files-modified "src/auth.ts"
   → EventLog에 Message 기록 → Coordinator의 check --wait가 깨어남
8. Coordinator가 3개 worker_done을 수집 → diff 비교
9. 사람이 승자 선택 (또는 자동: Harness² composer가 3개 중 1개 선택) → cherry-pick → 병합
10. FleetCoordinator가 worker-release (worktree 정리 또는 retain) → 종료
```

### 6.5 Orca에서 빌리지 않는 것 (의도적 제외)

| Orca 기능 | 제외 이유 |
|-----------|-----------|
| Electron GUI, 탭/스플릿, Ghostty 터미널 | CLI-first — 터미널은 이미 Bash tool로 충분 |
| Design Mode (Chromium 요소 클릭) | 브라우저 자동화는 Phase 2로 — 1차는 WebFetch로 대체 |
| 모바일 컴패니언, SSH 원격 worktree | 1차 MVP 이후 — SSH는 `git worktree` 원격 확장으로 나중에 |
| 계정/레이트리밋 추적 | Provider별 분산 — 외부 에이전트 `agents/manager.ts`가 이미 관리 |
| Linear/Jira/GitHub 네이티브 브라우징 | `gh` CLI로 대체 가능 — 필요 시 2차 |

---

## 7. 구현 로드맵

### Phase O1 — Run/Task/Dispatch 타입 + Store (예상 1일)
*   `src/fleet/types.ts` — Run/Task/Dispatch/Message/DecisionGate 타입 (Orca 계약 그대로)
*   `src/fleet/store.ts` — `.arena/fleet.json` + `.arena/fleet.log` JSONL, DAG 상태 전이 + 서킷브레이커
*   단위 테스트: Task DAG (pending→ready→dispatched→completed), deps unblock
*   완료 조건: `npm run build && npm test` 통과

### Phase O2 — Fleet Worktree + Dispatch (예상 1.5일)
*   `src/fleet/worktreeFleet.ts` — `FleetWorktreeManager.createFleet(n)` — 기존 WorktreeManager 확장
*   `src/fleet/dispatch.ts` — preamble 주입 + `runWorker()` — queryLoop()를 worker로 재활용
*   완료 조건: `arena-code --fleet --fanout 2 --dry-run`으로 worktree 2개 생성 확인

### Phase O3 — Coordinator + Worker 계약 + CLI (예상 2일)
*   `src/fleet/coordinator.ts` — `check --wait` 루프, worker_done 검증, DAG unblock
*   `src/fleet/worker.ts` — `worker_done` 1회 보장, --outcome 필수, heartbeat
*   `src/fleet/cli.ts` — `fleet run-create / task-create / check / worker-start` 서브커맨드
*   완료 조건: `arena-code --fleet --fanout 3 --mock -p "hello"`로 3개 worker 병렬 실행 후 worker_done 3개 수집 확인

**총 예상:** 4~5일 (fan-out MVP는 2~3일)

### 이후 (Fleet MVP 후)
*   Harness² composer를 Fleet 승자 선택에 재활용 — 3개 worker 결과 중 Harness² selection이 1개 pick
*   SSH 원격 worktree — `WorktreeManager`에 `sshHost` 옵션 추가
*   인라인 diff 주석 — `git diff` + `worker_done --files-modified`로 `annotate` 스킬과 연동

---

## 8. 라이선스·보안 메모

*   Orca는 MIT — 포팅한 코드에 MIT 헤더 유지, 원본 경로 명시 (`stablyai/orca` skill-guides/orchestration.md 등)
*   포팅 범위: CLI 계약(Run/Task/Dispatch/worker_done)만 — Electron GUI, 모바일, SSH 릴레이 코드는 가져오지 않음
*   Worker 권한: Fleet worker는 `sandbox: workspace-write`를 기본으로 — 각 worktree가 격리되어 있어도 `danger-full-access`는 금지
*   `worker_done` 검증: lifecycle ID 대조 없이 완료를 인정하지 않음 — 복사된 ID, 오래된 DB 행은 권한 아님 (Orca safety floor 그대로)

---

## 9. 참고 자료

1.  `stablyai/orca` — README, `skill-guides/orchestration.md` (202줄), `skill-guides/orca-cli.md` (294줄), `docs/model/worktrees`, package.json (Electron 43.7.0)
2.  Orca 공식 사이트 https://onorca.dev — Features, Supported Agents (30+ CLI), Install, Mobile/SSH
3.  Orca Orchestration 문서 https://www.onorca.dev/docs/cli/orchestration — Run/Task/Dispatch/Message/DecisionGate 정식 계약
4.  GitHub 이슈/PR — Fleet 병렬화, worktree 격리, worker_done 계약 (stablyai/orca, 15,284 커밋)
5.  커뮤니티 분석 — DEV Community, aniketkarneai.com, aridanemartin.dev (Fleet 개념, ADE 패러다임)

---

## 10. 검토 체크리스트 (이 문서가 끝나면)

- [ ] Run/Task/Dispatch 3계층 모델을 우리 플로우에 적용할지
- [ ] 저장소를 `.arena/fleet.json` + JSONL로 할지 (Orca는 SQLite — 우리는 경량 JSON으로)
- [ ] fan-out 수를 `--fleet --fanout N`으로 할지, 아니면 `fleet run-create` + `worker-start` 조합으로 할지
- [ ] worker_done 검증을 엄격히 할지 (lifecycle ID 대조 필수)
- [ ] 다음 단계: Harness² H1 커밋과 함께 갈지, Orca 분석만 먼저 커밋할지

### Fleet O1~O3 구현 완료 (2026-10-20, commit TBD — v2.5.0)

| Phase | 모듈 | 라인수 | 핵심 기능 |
|-------|------|--------|-----------|
| O1 | `src/fleet/types.ts` 99줄 + `store.ts` 393줄 | 타입(Run/Task/Dispatch/Message/Gate/FleetState) + FleetStore(.arena/fleet.json+.arena/fleet.log, DAG pending→ready→dispatched→completed/failed/blocked, circuit-breaker per-task 3회, check/ack) |
| O2 | `src/fleet/worktreeFleet.ts` 70줄 + `dispatch.ts` 170줄 | FleetWorktreeManager.createFleet(N) fan-out + injectPreamble() Orca dispatch --inject 포팅, FleetDispatcher.dispatchTask()+runWorker(queryLoop 재활용)+gh CLI passthrough |
| O3 | `src/fleet/coordinator.ts` 220줄 + `worker.ts` 150줄 + `cli.ts` 250줄 | FleetCoordinator canonical supervised loop (runCreate/taskCreate/workerStart/fanOut/check/ack/workerDone/workerRelease/gatherDiffs/ghCommand), WorkerAgent 5 obligations (preamble/heartbeat/check/worker_done 1회/후대기) + FleetCli `arena-code fleet ...` + `--fleet --fanout N --dry-run` + `--fleet-worker-done` |
| CLI | `src/cli.ts` +150줄 | `arena-code fleet <run-create|run-list|task-create|task-list|worker-start|fan-out|check|ack|worker-done|worker-release|status|gh|diffs>` + `arena-code --fleet --fanout N` + `--fleet-worker-done` + allowUnknownOption pass-through |

증거: `npm test` 63 passed(8 files, fleet 16 tests), `tsc` 0, `node dist/cli.js fleet status/run-create/task-create/worker-start/check/ack` 모두 통과, `node dist/cli.js --fleet --fanout 2 --dry-run` 통과.

### Hybrid HF — Harness²×Fleet 결합 (2026-10-20, v2.6.0)

| 항목 | 내용 |
|------|------|
| **엔진 통합** | `EngineOptions.fleet={enabled, useWorktrees, runId, coordinator}` → `createFleetProbeFn()` Fleet-aware ProbeFn, FleetStore에 Run/Task/Dispatch/worker_done 기록 |
| **Depth 통합** | `RecurrentDepthRunner` Fleet Run 1개를 depth 전체에 재사용, `DepthResult.fleetRunId/fleetTaskIds` + `.arena/harness2/evidence/*-depth-summary.json`에 fleet 정보 포함 |
| **CLI** | `arena-code --harness2 --k 2 --depth 2 --harness2-fleet [--fleet-use-worktrees] --dry-run --mock` (기존 `--fleet` standalone과 구분) |
| **증거** | `node dist/cli.js --harness2 --k 1 --dry-run --mock --harness2-fleet` → fleetRunId run_xxx fleetTasks=3, depth2 시 6 tasks — tsc0 build0 vitest70 |
| **테스트** | `tests/harness2_fleet.test.ts` 7개 — engine no-fleet vs fleet, sequential, depth fleet, batch |

> 이 문서는 `arena-code` 저장소의 일부이며, 브랜치 `arena/f39797b9-rea` v2.9(D1+D2 완료) 시점에 갱신되었다. 다음 질문/수정은 이 문서에 코멘트하거나 D1/D2 코드(`src/tools/browser.ts`, `src/harness2/library.ts` RAG)로 이어가면 된다.
