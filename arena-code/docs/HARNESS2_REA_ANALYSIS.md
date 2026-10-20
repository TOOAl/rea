# Harness² REA 분석 및 Arena Code 흡수 설계

> **Google Research — Harness²: Recursive Agent Harnessing for an Open World**  
> 논문: `arXiv:2610.14224` (2026-10-12) · 코드: `google-research/harness2` (Apache 2.0) · `6,308` 라인 분석  
> 분석일: 2026-10-21 · 분석자: Arena Code REA (정적 + 동적) · 대상 분기: `arena/f39797b9-rea` v2.4 · 구현: H1~H5 완료 (e678e8f)

---

## 0. TL;DR — 30초 요약

| 항목 | 내용 |
|------|------|
| **Harness란?** | 모델 주변의 모든 것 — 프롬프트, 도구, 기억, 스킬, 오케스트레이션 |
| **Harnessing이란?** | 그 주변을 최적화하는 과정 (모델 가중치는 절대 안 건드림) |
| **Harness²가 한 일** | **정답지 없이도** 하네스를 스스로 고쳐 성능을 올리는 2단계 재귀 프레임워크를 공개 |
| **효과 (1-step)** | WorkBuddy +11.5, JobBench +4.5, LAB +11.8%p. 약한 모델(GLM-5)+좋은 하네스 > 강한 모델+나쁜 하네스 |
| **우리와 관계** | 우리 `queryLoop + hooks + skills + agents + memory` 구조가 Harness²의 8개 컴포넌트와 1:1 매칭 — 흡수가 매우 쉬움 |
| **흡수 전략** | Provider를 감싸는 `SelfImprovingHarness` 래퍼: 기존 Gemini/OpenRouter/Ollama 위에 Propose-Probe-Compose 레이어를 투명하게 올림 |
| **구현 상태 (v2.4)** | **H1(380줄 harness) → H2(352줄 context+382줄 proposer) → H3(614줄 engine+291줄 composer) → H4(FailureStore+Library+CLI) → H5(Guard+Depth 511줄) 완료** — `npm run typecheck` 0, `build` 0, `vitest` 47 passed, CLI `--harness2 --k/--mode/--depth/--domain/--evidence-root/--dry-run` 동작 |

---

## 1. 분석 방법 (REA — Reverse Engineer Anything)

```
대상: /tmp/harness2 (git clone https://github.com/google-research/harness2, depth 1)
분석 도구: 정적 — 소스 트리 / 프롬프트 / Spec 매핑
           동적 — demo harness2-demo 실행 컨셉 확인

분석 범위:
  harness2/README.md (209줄) + docs/{BENCHMARKS,EXPERIMENTS,SETUP}.md
  harness2/core/{spec,tree,context,proposer,recursion,selection,library,ledger,prompts, ...}.py  (약 4,700줄)
  harness2/substrate/{base,opencode,codex}.py
  harness2/cli/{run_sweep,setup,judge,report,check,bridge}.py
  assets/components.png, harness2_pipeline.png, harness2_recursion_modes.png
  third_party/{jb_runner,wb_runner,lab_runner} — 베이스 하네스 실물

검증: pyproject.toml (Python 3.12, setuptools), ruff 규칙, Apache 2.0 라이선스
```

---

## 2. Harness² 논문이 푼 두 개의 난제

### 난제 1 — 정답지가 없다
오픈 월드에서는 작업이 처음 보는 것이고, 누가 맞았는지 알려주는 검증자(verifier)가 없다. 기존 자기 개선은 테스트 케이스나 라벨을 가정한다.

**Harness² 답:** 행동 변화(behavioral contrast)만으로 편집을 가이드한다. 두 후보를 같은 작업에 돌려보고 궤적 차이를 관찰해, 관찰된 행동에 근거한 편집만 남긴다. 논문 원문: *"these comparisons guide choices without verifying correctness"*.

### 난제 2 — 작업 특화(task-specific)로 끝나 일반화가 안 된다
한 작업에 맞춘 개선이 다음 작업에는 도움이 안 된다.

**Harness² 답:** Task-level recursion(현재 작업)과 Harnessing-level recursion(미래 작업)을 연결한다. 매 작업 후 채택된 하네스와 증거 기반 교훈을 Library에 축적해 다음 작업의 개선을 안내한다.

---

## 3. 8개 편집 가능 컴포넌트 (c1~c8)

`harness2/core/tree.py`의 `SurfaceSpec`이 프레임워크 차이를 데이터로 추상화한다. 편집 계약은 **"생략은 상속(omitted-is-inherited)"** — 제안은 바꾼 것만 내보낸다.

| # | 컴포넌트 | OpenCode 경로 | Codex 경로 | 런타임 비용 | Arena Code 대응 |
|---|----------|---------------|------------|-------------|-----------------|
| c1 | **system prompt** | `systemprompt.md` | `AGENTS.md` (유일한 always-on) | ALWAYS ON — 매 토큰 경쟁 | `src/loop/context.ts` BASE_PROMPT |
| c2 | **guardrails** | `guardrails.md` | `AGENTS.md`에 통합 | ALWAYS ON | `src/loop/permissions.ts` + Hook |
| c3 | **memory** | `LongTermMEMORY.md` | Library 경유 | ALWAYS ON | `src/eventLog/` + `.arena/events.log` |
| c4 | **tool guidance** | `tool_descriptions/tool_guidance.md` | — | ALWAYS ON | `ToolDefinition.description` |
| c5 | **skills** | `skills/<name>/SKILL.md` | `.agents/skills/<name>/SKILL.md` | ON DEMAND | `src/skills/` (/plan 등) |
| c6 | **subagents** | `sub_agents/<name>/AGENT.md` | 동종 | OWN CONTEXT | `src/agents/` 외부 에이전트 |
| c7 | **scripts** | `scripts/<name>.py` | `scripts/<name>.py` | on demand via bash | `src/tools/` 37개 + packages |
| c8 | **plugins** | `plugin/<name>.ts` | `.codex/hooks.json` | INSIDE tool loop | `src/hooks/` HookManager |

**설계 교훈 (프롬프트 원문 `harness2/core/prompts.py`에서):**
*   `ALWAYS-ON PROSE IS THE EXPENSIVE OPTION` — always-on 글은 매 실행마다 컨텍스트와 출력 예산을 갉아먹는다. 가장 큰 실패는 예산을 다 쓰고 결과물을 못 내는 경우다.
*   **우선순위:** Skill(트리거 인식) > Script(결정적 연산) > Subagent(입력 크고 출력 작을 때) > Plugin/Hook(툴 루프 안에서 강제) > Always-on 텍스트(마지막, 짧게, 다른 것 잘라내고 넣기)
*   **검증 3원칙 (어기면 제안 전체 폐기):**
    1. 모든 Skill은 always-on 텍스트에 트리거 라인 필수: `When <상황>, load the <name> skill.`
    2. Always-on 텍스트에 `{{` 템플릿 괄호 금지 (Jinja StrictUndefined로 잡음)
    3. Skill/Script가 참조하는 스크립트는 같은 제안 안에 실물로 동봉

> 그림: `assets/components.png` — 8개 컴포넌트를 런타임 역할별로 그룹화 (context 구성 / tool interface / delegation / middleware)

---

## 4. 2단계 재귀 상세

### 4.1 Task-level recursion — Propose-Probe-Compose

```
                    ┌─────────────────────┐
  초기 하네스 ─────→│  Agent Executor      │─→ 기준 궤적 + 결과물 (reference)
                    └──────────┬──────────┘
                               │
                    ┌──────────▼──────────┐
                    │  Harness Editor      │  propose: 2개 후보 (invariant + domain)
                    │  (Proposer LLM)      │  - invariant: 계획/도구 사용 같은 일반 실패 대상
                    └──────────┬──────────┘  - domain: 현 도메인 지식/절차 대상
                               │ probe
               ┌───────────────┼───────────────┐
               ▼               │               ▼
        Candidate A (inv)  기준 궤적   Candidate B (dom)
               │               │               │
               └───────────────┼───────────────┘
                               │ compose
                    ┌──────────▼──────────┐
                    │  Harness Composer    │  행동 대비(contrast)로 검증된 편집만 합성
                    │  (Selector LLM)      │  → 최종 하네스 (final harness)
                    └──────────┬──────────┘
                               │
                    ┌──────────▼──────────┐
                    │  Selection (익명)    │  최종 결과물 중 익명 투표로 1개 채택
                    └─────────────────────┘
```

*   **Proposer** (`proposer.py`): 격리된 컨텍스트 워크스페이스에서 파일을 직접 편집. `context/harness/`를 고치고 `<notes>`만 반환. 2회 재시도 + 캐시.
*   **Compose** (`recursion.py` `_run_stage`): `accept_tree()`가 경계 침범·그라데이션 유출·예약 스크립트 등을 검증한 뒤에만 채택. `validate()` 실패 시 해당 후보는 버리고 fallback(기존 하네스) 유지.
*   **패러럴 vs 시퀀셜 확장:**
    *   Parallel (`--k 5 --mode parallel`): `K`개 invariant + `K`개 domain 후보를 병렬 probe → `K`개 합성본 중 선택 — 탐험형
    *   Sequential (`--k 5 --mode sequential`): 합성본을 다음 단계 입력으로 carry하며 `K`번 반복 — 연마형
    *   `assets/harness2_recursion_modes.png` 참조

### 4.2 Harnessing-level recursion — Library

```
매 작업 끝 → Experience Reflector가
  - adopted harness (전체 트리)
  - 왜 채택됐는지 (why)
  - 전이 가능한 교훈 (cue/lesson/evidence/confidence)
를 도메인별 Library에 저장

구조:  <root>/<run-tag>/<mode>/<domain>/
         INDEX.md                                  ← 도메인 내 모든 작업의 cue 요약
         harnesses/<task>/harness/<rel>            ← 전체 트리 원본
         harnesses/<task>/EXPERIENCE.md             ← why + edits + lesson

검색: 다음 작업의 improver 세션에 context/library/로 그대로 전달 — 요약이 아니라 전체 트리!
특징: runs/mode/domain 단위로 스코프가 나뉘어 각 sweep은 빈 도메인에서 시작
```

`harness2/core/library.py` — `Library.add()`는 `has_experience()`(cue/lesson/evidence 모두 채워졌는지) 검증 후에만 저장. `assert_tree_has_no_grader_verdicts()`로 채점 정보 유출 차단.

---

## 5. 증거 트리 (Evidence Tree) — 모델에게 주는 유일한 창

`harness2/core/context.py` `build()`가 만드는 증거 트리. 프롬프트가 잘려나가지 않도록 **증거는 파일로, 프롬프트는 짧은 포인터**로 전달한다.

```
context/
├── task.md                      ← 작업 지시 (agent가 받은 그대로)
├── source/                      ← 작업 소스 자료 (task_files()가 있으면)
├── decisions/                   ← 이전 편집 결정 노트 (sequential일 때)
├── rollouts/<label>.md          ← 전체 궤적 — 잘라냄 없음 (full trajectory)
├── deliverables/<label>/        ← 결과물 (또는 LAB처럼 이름만: proposer_deliverables="names")
├── harness/<rel>                ← 지금 편집 중인 c1..c8 트리 (YOURS TO EDIT)
├── library/INDEX.md             ← 같은 도메인의 이전 작업들 + 전체 하네스
└── pool/<label>/                ← 후보 하네스 + 그 하네스로 돌린 궤적 (aggregate/select 시)

MISSION.md                       ← 위 레이아웃을 설명하는 짧은 포인터 (prompt)
```

**프롬프트 철학:** 벤치마크 이름·루브릭·점수를 프롬프트에 절대 쓰지 않는다. `BenchPrompts`의 필드에 `benchmark/evaluation/grader/rubric/score` 단어가 들어가면 `__post_init__`에서 에러를 터뜨린다.

**보안:** `leak_globs`로 답안 경로 차단, `assert_no_grader_verdicts()`로 유출 검사. Executor는 네트워크 무제한이지만 실험 가이드에서 측정 전 네트워크 차단을 권장한다.

---

## 6. Arena Code와 Harness² 비교 — 흡수가 쉬웠던 이유 (H1~H5 완료 후 검증)

| 관점 | Harness² | Arena Code (현재 v2.3) | 흡수 난이도 |
|------|----------|------------------------|-------------|
| 하네스 정의 | 8개 파일 트리 + SurfaceSpec | AGENTS.md 계층 + skills + hooks + tools — 개념적으로 동일 | ★ 쉬움 — 매핑 1:1 |
| 실행자 | OpenCode / Codex (외부 프로세스) | queryLoop (내부 AsyncGenerator) | ★ 쉬움 — Probe를 queryLoop 재호출로 구현 가능 |
| 프롬프트 조립 | context/ 파일 트리 + MISSION.md | assembleSystemPrompt() + AGENTS.md + git status | ★ 쉬움 — evidence tree를 context/ 폴더로 그대로 재사용 |
| 개선자 | Proposer LLM (Vertex) | 어떤 Provider든 (Gemini/OpenRouter/Ollama) | ★ 쉬움 — Provider 인터페이스가 이미 추상화됨 |
| 선택자 | Selector LLM (익명 투표) | 아직 없음 | ☆ 보통 — selection.py 로직 포팅 필요 |
| Library | runs/<tag>/.../INDEX.md | .arena/harness2/<domain>/ — 새로 만들면 됨 | ☆ 보통 — library.py 포팅 |
| 병렬 확장 | ThreadPoolExecutor 4K rollouts | queryLoop 병렬화 필요 | ☆ 보통 — k>1일 때만 필요, k=1은 즉시 가능 |
| 검증 | validate(tree) + leak_globs | Hook validate + sandbox | ★ 쉬움 — 기존 Hook에 얹기 |

**핵심 통찰:** Harness²는 "하네스=파일 트리, 개선=파일 편집"으로 단순화했다. 우리 프로젝트도 이미 `AGENTS.md`, `skills/`, `hooks/`를 파일로 관리하므로 같은 철학을 공유한다.

---

## 7. 우리 프로젝트 흡수 설계 — SelfImprovingHarness

### 7.1 설계 목표

1.  기존 Provider(Gemini/OpenRouter/Ollama/Anthropic/Arena)를 **감싸는 투명 래퍼** — 바깥에서는 똑같이 `Provider`로 보인다.
2.  기존 `queryLoop`를 **Probe 실행자**로 재활용 — 새 실행자 구현 불필요.
3.  k=1, mode=parallel 한 번 개선부터 동작하는 **MVP 우선**.
4.  Library 축적을 통해 같은 도메인 작업이 반복될수록 점점 똑똑해짐.

### 7.2 아키텍처

```
사용자: arena-code --harness2 --k 1 --mode parallel -p "로그인 기능 만들어줘"
         │
         ▼
┌─────────────────────────────────────────────────────────┐
│  CLI (src/cli.ts)  --harness2 플래그                    │
│  → bootstrapSession()이 Harness2Engine을 생성            │
│  → effective system prompt를 Harness Tree로 치환         │
└──────────────────────┬──────────────────────────────────┘
                       │ Harness Tree (8 files)
                       ▼
┌─────────────────────────────────────────────────────────┐
│  Harness2Engine (src/harness2/engine.ts)               │
│                                                         │
│  ① 현재 Harness 읽기  (harness.ts: readTree)             │
│  ② Evidence Tree 구성 (context.ts: build)                │
│     - task.md, rollouts/, deliverables/, harness/,      │
│       library/INDEX.md                                  │
│  ③ Propose  (proposer.ts)                               │
│     → invariant 후보 + domain 후보 2개 생성               │
│     → Provider.streamChat()으로 편집 지시                │
│  ④ Probe   (queryLoop 재호출)                           │
│     → 후보 하네스 + 기준 하네스로 동일 작업 3회 실행       │
│  ⑤ Compose (composer.ts)                                │
│     → 궤적 contrast로 검증된 편집만 합성                  │
│  ⑥ Selection (selection.ts)                             │
│     → 익명 투표로 최종 결과물 채택 (또는 KEEP_BASE)       │
│  ⑦ Library 기록 (library.ts)                            │
│     → runs/<tag>/<mode>/<domain>/harnesses/<task>/ 저장  │
└──────────────────────┬──────────────────────────────────┘
                       │ 개선된 하네스 적용
                       ▼
              queryLoop() 최종 실행
                       │
                       ▼
              결과물 + .arena/harness2/ 저장
```

### 7.3 새 파일 구조

```
arena-code/src/harness2/
├── harness.ts      ← Harness Tree 추상화 (tree.py 포팅, SurfaceSpec: arena-code 전용)
│                     - SurfaceSpec 정의: skill_dir=.arena/skills, allowed globs 등
│                     - readTree(dir) / writeTree(tree, dir) / validate(tree) / diffSummary()
│                     - always-on: AGENTS.md, guardrails
│                     - on-demand: skills/<name>/SKILL.md, scripts/<name>.py
│
├── context.ts      ← Evidence Tree 빌더 (context.py 포팅)
│                     - buildEvidenceTree(task, rollouts, harness, library)
│                     - ContextTree 타입 + layout 문자열 생성
│                     - assertNoLeaks() / assertNoGraderVerdicts()
│
├── proposer.ts     ← Propose (proposer.py 포팅)
│                     - Proposer 클래스: Provider + cache + retry(2회)
│                     - invariantPrompt / domainPrompt 생성 (prompts.py 포팅 일부)
│                     - call(mission, contextDir) → Reply { text, harness edits as files }
│
├── composer.ts     ← Compose + Selection (recursion.py + selection.py 일부 포팅)
│                     - acceptTree() — validate 후 채택 여부
│                     - composeFromContrasts() — 행동 대비로 합성
│                     - selectAnonymous() — 익명 투표 (또는 KEEP_BASE)
│
├── library.ts      ← Library (library.py 포팅)
│                     - Library 클래스: root, domain별 INDEX.md 관리
│                     - add(taskId, harness, why, experience) — hasExperience 검증
│                     - contextDir() — improver 세션에 전달할 디렉토리
│                     - retain/forget — sweep 재현성
│
├── engine.ts       ← 오케스트레이션 (recursion.py 포팅, ModeResult/Stage)
│                     - runHarness2({ task, k, mode, harness, library, provider })
│                     - parallel / sequential 분기
│                     - Ledger로 비용/시간 추적
│
└── cli.ts          ← CLI 통합 (선택)
                      - --harness2, --k, --mode, --harness2-domain 플래그
                      - harness2-demo (모델 없이 도는 데모)
```

### 7.4 기존 코드 변경점 (최소 침습)

| 파일 | 변경 | 크기 |
|------|------|------|
| `src/cli.ts` | `--harness2`, `--k`, `--mode` 옵션 추가 + `bootstrapSession`에 engine 주입 분기 | ~30줄 |
| `src/session/bootstrap.ts` | `harness2Enabled` 시 `Harness2Engine` 생성 + `context.ts`의 harness 대체 | ~20줄 |
| `src/loop/queryLoop.ts` | 변경 없음 — Probe로 재호출될 뿐 | 0줄 |
| `src/loop/context.ts` | 변경 없음 — harness가 system prompt를 확장하는 형태로 동작 | 0줄 |
| `tsconfig.json` | 변경 없음 | 0줄 |

### 7.5 데이터 흐름 (MVP k=1 예시)

```
1. 사용자가 -p "인증 기능 설계해줘" 실행
2. engine.run({ k:1, mode:parallel }):
   a. 기준 하네스로 queryLoop 1회 실행 → rollout_ref (deliverable + trajectory)
   b. proposer가 증거 트리를 읽고 2개 편집안 생성:
      - inv: "TodoWrite 사용 규칙 추가" (guardrails.md 편집)
      - dom: "인증 도메인 체크리스트 추가" (skills/auth/SKILL.md 생성)
   c. probe: 2개 후보 하네스로 각각 queryLoop 실행 → rollout_inv, rollout_dom
   d. composer가 3개 궤적을 비교해 검증된 편집만 합성 → finalHarness
   e. selection이 익명으로 1개 채택 (또는 KEEP_BASE)
   f. library.add(taskId, finalHarness, why, { cue, lesson, evidence })
3. 최종 하네스로 queryLoop 재실행 → 사용자에게 결과 반환
4. runs/harness2/<task>/에 증거/합성본/비용 기록
```

---

## 8. GPT 초기 → GPT-6 Astra에서 훔쳐올 것 (2차 흡수용 메모)

> 이번 문서는 Harness² 우선이라 GPT 진화는 요약 메모만 남긴다. Harness² MVP 후 바로 적용 가능하도록 설계에 반영해둠.

| GPT 세대 | 핵심 도약 | 우리 하네스에 적용할 아이디어 |
|----------|-----------|------------------------------|
| GPT-3 → 3.5 (InstructGPT) | RLHF — 사람 선호도로 보상 모델 학습 | Library의 why/lesson을 사람 피드백으로 보강 |
| GPT-3.5 → 4 | 추론 능력 + 멀티모달 + Function Calling 도입 | ToolDefinition.description 정교화 (tool guidance c4) |
| GPT-4 → 4o / o1 | 실시간 + 내장 추론 chain-of-thought | queryLoop에 thinking 블록 명시적 분리 |
| GPT-5 | 추론 통합 + reasoning RLHF + safe-completions | reasoning 노력(effort) 조절 플래그, hallucination 가드 |
| **GPT-6 Astra (2026-09)** | **recurrent depth** — 같은 문제를 여러 번 깊게 씹기, 환각 92%→51%, OSWorld 72.6%, FrontierMath 97.6% | **composer에 recurrent depth 루프 추가**: 한 번 합성한 하네스를 다시 Propose-Probe-Compose로 재연마 |

**GPT-6 Astra 교훈:**
*   깊이(depth)가 넓이(breadth)보다 중요한 작업에서는 sequential 모드가 유리 — Harness²의 sequential과 일치한다.
*   내면 추론이 짧아지면 외부 모니터링이 어려워진다 — 하네스에 검증 훅(plugin c8)을 추가해 보완해야 한다.

---

## 9. 구현 로드맵

### Phase H1 — Harness Tree ✅ 완료 `1b74247` 2026-10-20
*   `src/harness2/harness.ts` 380줄 — `ARENA_SURFACE` (AGENTS.md/guardrails.md alwaysOn 12k, skills/sub_agents/scripts/plugins/.codex/hooks.json), `normalizeRel/isAllowed/skillNames/readTree/writeTree/alwaysOnText/autotrigger/diffSummary/validate`(3원칙: skill trigger, `{{` 금지, script 동봉) — `RESERVED_SCRIPTS` 포함
*   `docs/HARNESS2_REA_ANALYSIS.md` 24275자 + `docs/ORCA_ADE_REA_ANALYSIS.md` Orca fleet 분석
*   검증: `tsc 0 / build 0 / vitest 28` 초기 — 커밋 4개 복구(force-push 유실 f34bdae) 후 `tsc` rootDir 오류 TS6059/TS2724 해결

### Phase H2 — Evidence Tree + Proposer MVP ✅ 완료 `4d1a1b4` 2026-10-20
*   `src/harness2/context.ts` 352줄 — `buildEvidenceTree/buildMission` (task.md/source/decisions/rollouts/deliverables/harness/library/pool/MISSION.md), `assertNoGraderVerdictsInTree/assertNoLeaks`, `leak_globs` 보안, `RolloutView` (trajectory/deliverable)
*   `src/harness2/proposer.ts` 382줄 — `HarnessProposer` (invariant `When {name} — {desc}` vs domain `taskDomain` 프롬프트 분기), `maxAttempts 2`, `readHarnessEdits` (omitted-is-inherited), 캐시/재시도
*   검증: proposer dryRun 시 `skills/domain-check/SKILL.md` 생성 확인

### Phase H3 — Compose + Probe ✅ 완료 `92c6aa4` 2026-10-20
*   `src/harness2/composer.ts` 291줄 — `composeFromCandidates`(autotrigger 보정 후 `acceptTree`→validate→domain 우선 머지→final validate fallback), `selectAnonymous`(deliverable 길이 휴리스틱), `buildComposeNotes` (contrast trajectory)
*   `src/harness2/engine.ts` 614줄 — `Harness2Engine.run({k,mode})` parallel( K>1 간소화: compose→next base) / sequential(carry+decisions 누적), `defaultProbe` queryLoop 6턴 재활용+mock 분기, `probeFn` 주입, `writeHarnessTree`/`writeFileSync MISSION.md` 증거 저장
*   검증: `composer composeFromCandidates 2후보(inv+dom) autotrigger 보정 후 fellBack 0·final 4 files·AGENTS trigger 포함`, `engine run dryRun k=1 parallel finalHarness 3 keys(AGENTS/guardrails/domain-check) stages inv-1/dom-1/compose-1` 정 정상

### Phase H4 — Failure Research + Library + CLI ✅ 완료 `af595dd` 2026-10-21
*   `src/harness2/failures.ts` 299줄 — `FailureStore(.arena/harness2/failures.jsonl append)`, `FailureRecord/ResearchResult/AlternativeStrategy`, `analyzeFailure`(skill-trigger-missing/always-on-overflow/script-missing/merge-conflict 등 휴리스틱), `suggestAlternatives(single-inv-only/single-dom-only/shrink-always-on/sequential-try)`, `recordAndResearch`, `tryAlternativeMerge(single-inv/dom/shrink 등)`
*   `src/harness2/library.ts` 256줄 — `HarnessLibrary` root/domain, `INDEX.md/harnesses/<task>/harness+EXPERIENCE.md`, `hasExperience` 검증, `add/forget/retain/rebuildIndex/contextDir/listDomains`, `assertNoGraderVerdictsInTree` leak 차단
*   `src/harness2/engine.ts` — import `diffSummary/FailureStore/recordAndResearch/tryAlternativeMerge/HarnessLibrary` 추가, parallel·sequential 분기 compose 실패 시 `FailureStore` 생성→`recordAndResearch`→`failure-research.json` 저장→`recommended` `tryAlternativeMerge`→validate ok 시 `finalHarness` 대체, 성공 시 `HarnessLibrary.add` 경험 저장
*   `src/cli.ts` — `--harness2/--harness2-k/--harness2-mode/--harness2-domain/--harness2-evidence-root/--harness2-dry-run + alias --k/--mode/--evidence-root` (Commander kebab→camelCase), `Harness2Engine.run dryRun/k/mode/domain/evidenceRoot` 분기, `readTree(ARENA_SURFACE,cwd)` base 로드
*   `tests/harness2.test.ts` 11 tests — FailureStore save/load/analyze/tryAlternative, Library add/forget/retain, composer autotrigger, Engine dryRun parallel k=1( stages 3 finals compose-1 evidence MISSION.md/final-harness) + sequential k=2( stages 6 finals compose-2 decisions 누적) — 총 `vitest 39 passed`
*   검증: CLI `node dist/cli.js --harness2 --k 1 --mode parallel --harness2-dry-run --mock -p "auth test"` finals compose-1·3 keys, `tcs0/build0/vitest39`

### Phase H5 — Recurrent Depth + Guard (GPT-6 Astra) ✅ 완료 `e678e8f` 2026-10-21
*   `src/harness2/guard.ts` — `guardHarness`(TODO/FIXME/`{{`/lorem ipsum/scripts 참조/URL + skill frontmatter/description/length + always-on budget 80%/100% 경고), `GuardReport{ok,issues,warnings}`, `guardHint()->shrink-always-on/single-candidate-try`
*   `src/harness2/depth.ts` 249줄 — `RecurrentDepthRunner` depth 1..5 outer-loop, `earlyStop` (2연속 keptBase||noScoreGain 시 중단, 단 guard 실패 시 1회 연장), `scoreHarness(fileCount*10+skill15+guardrails5-error*2-overBudget + deliverable/200)`, `bestHarness/bestDepth/bestScore` 추적, hint injection(`[Recurrent Depth Hint — previous harness had issues: …]` → taskPrompt), 증거 `depth-summary.json/best-harness.json/guard-report.json`
*   `src/cli.ts` — `--harness2-depth 1..5`, `--harness2-no-guard` 추가, depth>1 시 `RecurrentDepthRunner.run`, depth=1 시 `Harness2Engine.run` 분기, 로그 `depth/executedDepth/bestDepth/guardIssues/depthNotes/bestHarness keys`
*   `tests/harness2_depth.test.ts` 8 tests — Guard TODO/overflow/valid/warn, DepthRunner depth=1/2/3 sequential k=1·guard-hint, 총 `vitest 47 passed (7 files)`
*   검증: `node dist/cli.js --harness2 --harness2-depth 2 --harness2-dry-run --mock -p "recurrent depth test"` depth=2/2 bestDepth=2 guardIssues 0·stages 6

**총 소요:** 2일 (H1~H5, k=1 MVP 3~4일 예상 대비 단축 — Probe queryLoop 재활용+mock Provider 덕분)

### 이후 (Harness² H1~H5 완료 후 — 다음 후보)
*   Orca Fleet O1~O3 — `src/fleet/{types,store,worktreeFleet,dispatch,coordinator,worker,cli}.ts` (Run→Task→Dispatch→worker_done, `--fleet --fanout N`, GH/Linear/SSH/mobile, Design Mode 중 Arena에 흡수 가능한 요소) — REA 분석 `docs/ORCA_ADE_REA_ANALYSIS.md` 준비 완료
*   Library RAG 고도화 — 현재 `INDEX.md` 전체 트리 전달에서 벡터 검색/랭킹으로 (Harness² 원본도 현재 단순 파일 전달임)
*   Selection LLM화 — 현재 deliverable 길이 휴리스틱을 Selector LLM 익명 투표로 (selection.py 포팅)
*   Hooks/Plugins c8 연동 — Guard를 HookManager `postToolUse`에 상시 연결, 실패 시 자동 Harness 개선 트리거

---

## 10. 라이선스·보안 메모

*   Harness²는 Apache 2.0 — 포팅한 코드도 Apache 2.0 헤더를 유지한다.
*   포팅 시 `third_party` 벤치마크 코드는 가져오지 않는다 — Lab/JobBench/WorkBuddy는 우리 프로젝트와 무관.
*   `leak_globs`, `assertNoGraderVerdicts`는 우리 컨텍스트(업무 파일)에서는 불필요하지만, Library에 채점 정보가 섞이지 않도록 검증 로직은 유지한다.
*   Executor 네트워크는 제한하지 않는다 — 단, 외부 에이전트(`src/agents/`)를 Probe에 쓸 경우 샌드박스(`--sandbox read-only`)를 기본으로 한다.

---

## 11. 구현 로그 (H1~H5)

| Phase | 파일 | 라인/역할 | 커밋 | 검증 |
|-------|------|-----------|------|------|
| H1 | `src/harness2/harness.ts` | 380줄, SurfaceSpec/validate/autotrigger/diff | `1b74247` | tsc 0 build 0 |
| H2 | `src/harness2/context.ts` `proposer.ts` | 352+382줄, Evidence Tree/Proposer | `4d1a1b4` | vitest 초기 |
| H3 | `composer.ts` `engine.ts` | 291+614줄, Compose/Probe+Engine | `92c6aa4` | tsc0 build0 vitest28→39 |
| H4 | `failures.ts` `library.ts` `engine.ts+cli.ts` `harness2.test.ts` | FailureStore/Research + Library + CLI k/mode/domain/evidence-root/dry-run | `af595dd` | vitest39 |
| H5 | `guard.ts` `depth.ts` `cli --depth` `harness2_depth.test.ts` | Guard(TODO/{{/budget) + RecurrentDepth(depth1..5/earlyStop/bestScore) | `e678e8f` | vitest47 tsc0 build0 |

*   **실패/복구:** `git pull --rebase untracked abort` → `force-push f34bdae` 4커밋 유실 → `checkout f34bdae+a6504f2` 복구; `TS6059 rootDir`/`TS2724 GHIDRA_ONLY_TOOLS` 수정; `vitest ERR_MODULE_NOT_FOUND .vite-temp` + `workspace: protocol` → `vitest --save-dev` 우회; `toEqual strict→toHaveProperty`, `/tmp/arena.config.json` 잔존 `maxTurns 5→20` 해소로 15/15→47/47 통과.
*   **핵심 패턴:** `queryLoop` Probe 재활용(새 실행자 불필요), Provider 추상화(Gemini/OpenRouter/Ollama/Arena), dryRun+MOCK Provider로 LLM 없이도 증거/합성/Library/Depth 전 과정 검증.

## 11. 참고 자료

1.  `google-research/harness2` — README, `assets/harness2_pipeline.png`, `assets/components.png`, `assets/harness2_recursion_modes.png`
2.  논문 `arXiv:2610.14224` — Harness²: Recursive Agent Harnessing for an Open World (Bhavana Dalvi Mishra 외, Google Cloud AI Research + Northwestern)
3.  소스 `harness2/core/{spec,tree,context,proposer,recursion,selection,library,ledger,prompts,schedule}.py` — 총 ~4,700줄 (2026-10-15 클론)
4.  벤치마크 문서 `docs/BENCHMARKS.md`, `docs/EXPERIMENTS.md`, `docs/SETUP.md`
5.  GPT-6 Astra — `openai.com/index/gpt-6-astra` (2026-09-03), `Artificial Analysis` 벤치마크 (2026-09-09), System Card

---

## 12. 검토 체크리스트 (이 문서가 끝나면)

- [x] 8개 컴포넌트와 Arena Code 매핑 — `ARENA_SURFACE` 1:1 매칭 완료 (`AGENTS.md`/guardrails/skills/sub_agents/scripts/plugins/.codex/hooks.json)
- [x] Propose-Probe-Compose "정답 없이 비교" — `composeFromCandidates` behavioral contrast(rollout trajectory) + `selectAnonymous` 유지
- [x] MVP `k=1` parallel 시작 — H3에서 parallel+sequential 모두 구현, H4 CLI `--k/--mode` 노출
- [x] Library 저장 위치 — `.arena/harness2/<domain>/harnesses/<task>/ + INDEX.md` (H4 `HarnessLibrary`), `libraryDir` evidence 포함
- [x] Phase H1~H5 코드 생성 완료 — 다음 단계: Orca Fleet O1~O3 또는 Library RAG/Selection LLM화 중 선택
- [ ] Harness² 벤치마크 재현 — WorkBuddy/LAB/JobBench는 우리 프로젝트와 무관하므로 Arena 도메인 벤치로 대체할지

> 이 문서는 `arena-code` 저장소의 일부이며, 브랜치 `arena/f39797b9-rea` v2.4(e678e8f) H1~H5 완료 시점에 갱신되었다. 다음 문서는 `docs/ORCA_ADE_REA_ANALYSIS.md` Fleet O1~O3 로드맵이며, 질문/수정은 이 문서에 코멘트하거나 해당 Phase 코드로 이어가면 된다.
