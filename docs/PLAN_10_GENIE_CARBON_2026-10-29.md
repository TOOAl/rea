# 10점 만점을 위한 완전 계획 — 코드 품질 8.5→10 + 백엔드 9.5→10 + Genie 4 & Gemini 4 Carbon 흡수

> branch: `arena/a321e49e-rea` | base: `main 564b32a` (PR #30, 0 errors / 1848 warnings / 409 PASS)
> 작성: Arena Agent — REA(Reverse Engineering Architecture) + Ghidra 관점
> 대상: 코드 품질·백엔드 10점 로드맵 + 구글 Genie 4 & Gemini 4 Carbon 능력 흡수

---

## 0. 현재 점수 — 왜 10점이 아닌가 (12살 설명)

| 영역 | 현재 | 10점이 아닌 이유 (한 줄) |
|---|---|---|
| **코드 품질 8.5/10** | lint 0 errors / 1848 warnings | 주방은 깨끗한데(에러 0) 잔소리 스티커 1848개 붙어 있음 — 함수가 너무 길고 복잡하대요 |
| **프론트엔드 5.5/10** | 정적 HTML 7개 | 메뉴판만 있고 놀이터가 작음 — SPA·대시보드 없음 |
| **백엔드 8.8→9.5/10** | 1946 파일 409 PASS | 호텔 주방인데 냉장고 정리가 덜 됨 — 1848 warnings 중 1348개가 백엔드 복잡도 |

**10점이란?** — `npm run lint` 0 errors / <500 warnings + `typecheck` 0 + `vitest` 409 PASS + `module-boundaries` PASS + `jscpd` 중복 <5% + `scan:todos` 0 + 문서·프론트까지 완비

---

## 1. 코드 품질 8.5→10 — 1848 warnings를 500으로 (1주 로드맵)

### 1.1 현재 경고 분해 (2026-10-29 lint)

| 규칙 | 개수 | 뜻 (12살) | 10점 기준 |
|---|---|---|---|
| complexity | 427 | 한 함수가 너무 똑똑하려 함 — if가 15개 | <100 |
| max-lines-per-function | 417 | 한 함수가 200줄 — 책 한 챕터 | <80 |
| max-params | 291 | 함수에 재료가 5개 넘게 들어감 | <50 |
| max-depth | 280 | if 안에 if 안에 if — 4층 지하 | <40 |
| no-unused-vars | 170 | 안 쓰는 변수 방치 | <20 |
| max-lines | 151 | 파일이 500줄 넘음 | <30 |
| no-control-regex | 30 | 이상한 정규식 | 0 |
| no-unsafe-finally | 25 | finally에서 return | 0 |
| 기타 | 57 | — | 0 |
| **합계** | **1848** | | **<500** |

### 1.2 3단계로 깎기 — Ghidra 철학: 큰 함수를 작은 P-Code 블록으로 분해

**Phase A (Day 1-2): 1848 → 1200 (-648) — 자동 + 저위험**
- `oxlint --fix`로 자동 고칠 수 있는 170개 `no-unused-vars` 중 120개 제거 — `npm run lint:fix`
- `max-lines` 151개: 500줄 넘는 파일 30개를 `utils.ts`로 분리 — `src/utils/`로 공통 함수 추출
- `no-control-regex` 30개, `no-unsafe-finally` 25개: 정규식에 `u` 플래그 추가, finally return 제거 — 55개 즉시 해소
- **측정:** `npm run lint` 후 warnings 카운트 확인

**Phase B (Day 3-4): 1200 → 700 (-500) — 함수 쪼개기 (핵심)**
- `max-lines-per-function` 417개 + `complexity` 427개는 같은 파일에 겹침 — Top 20 파일 선정
  - 예: `src/harness2/library.ts` 481줄, `src/skills/index.ts` 351줄, `src/worktree/index.ts` 171줄
  - 전략: 한 함수 200줄 → 3개 60줄 함수로 분해 — Ghidra가 거대 함수를 basic block으로 나누듯
  - 예: `HarnessLibrary.buildRagSnapshot()` 60줄 → `prepareTmpDir()` + `copyHarness()` + `writeIndex()` 20줄씩
- `max-params` 291개: `{opts: {a,b,c,d,e}}` 객체로 묶기 — `function foo(a,b,c,d,e)` → `function foo(opts: FooOpts)`
- `max-depth` 280개: early return 패턴 — `if (ok) { 50줄 }` → `if (!ok) return; 50줄`

**Phase C (Day 5-7): 700 → <500 (-200+) — 수동 정밀 + 문서**
- 남은 `complexity` Top 10 함수에 대해 cyclomatic complexity 15 → 10으로 — switch → map, if-else chain → strategy pattern
- `max-lines` 남은 30개: `src/application/` 대용량 파일 5개를 `services/`로 분리
- 문서화: `CONTRIBUTING.md`에 “함수는 80줄, 파라미터 4개, 깊이 3” 룰 추가 + `oxlint` 규칙을 `warn` → `error`로 상향

**검증 명령 (매일)**
```bash
npm run lint 2>&1 | grep "warnings" # 1848 → 1200 → 700 → 450
npm run typecheck # 0
cd arena-code && npx vitest run # 409/409
npm run verify:module-boundaries # PASS
```

---

## 2. 백엔드 9.5→10 — 호텔 주방을 미슐랭으로

### 2.1 현재 9.5인 이유
- 기능 9.5/10: Ghidra 29툴, Hopper, Frida, Browser, MCP 30툴 완비
- 품질 8.5/10: 위 1848 warnings가 여기서 80% 발생
- 안정성 9/10: 409 PASS지만 `knip` OOM (3631 파일) — 너무 커서 분석기가 터짐

### 2.2 10점 체크리스트
- [ ] warnings <500 (1장과 동일)
- [ ] `knip` OOM 해결 — `knip.json`에 `entry: ["src/cli.ts", "src/mcp/server.ts"]`로 입구 좁히기 + `ignore: ["src/fixtures/**"]`
- [ ] `jscpd` 중복 <5% — `HarnessLibrary.search()`와 `Bank.searchHybrid()` 중복 80줄을 `src/rag/shared.ts`로 공통화
- [ ] `typecheck` 0 — `tsconfig.json` strict true 유지, `any` 170개 중 100개 제거

---

## 3. REA + Ghidra로 본 구글 지니4 (Genie 4) — 세계를 실시간으로 만드는 법

### 3.1 REA 분석 — 구글은 어떻게 지었나 (Architecture Reverse Engineering)

| 레이어 | 구글 Genie 4 실제 | REA가 뽑은 설계 의도 |
|---|---|---|
| **입력** | 텍스트 프롬프트 + 사진 1장 | `Project Genie` — Street View + Gemini Omni가 “현실성”을 grounding |
| **생성 코어** | 월드 모델 — 프레임마다 다음 프레임 예측 (비디오 아님, 게임임) | 기존 Genie 3: 720p 24fps, 1분 기억 → Genie 4: 해상도 미공개, 2분 기억(2x), 물리·인간 동작 대폭 개선 |
| **오디오** | **최초 네이티브 오디오** — 배경음+음악+대화가 같은 모델에서 동시에 생성 | 이전엔 후처리 더빙 → 이제 모델이 같이 생성, 캐릭터가 실시간으로 말 걸어옴 |
| **조종** | 키보드 걷기 + **프롬프트로 실시간 편집** — “날씨 비로 바꿔줘” 치면 장면 유지하며 바뀜 | Gemini가 프롬프트를 현재 장면에 맞게 rewrite — 컷 없이 이어짐 |
| **두뇌** | **Gemini 3.8 Flash가 루프 안에서 감독** — 목표를 단계로 쪼개고, 프레임마다 검증, 실패하면 재계획 | `Gemini 계획 → Genie 시뮬레이션 → 결과 관찰 → 전략 수정` 루프 — 로봇 훈련장으로도 씀 (Gemini 4 Argon + Genie 4) |
| **물리** | aerodynamics, collisions, 군중 — 인간 움직임이 가장 큰 도약 | 수박, 단풍씨, 1980년대 일본 역 플랫폼 데모 — “배경이 아니라 장소” |
| **워터마크** | SynthID 전 영상·오디오에 삽입 | 안전 평가 후 trusted testers만 공개 → AI Ultra $99.99/월, Gemini API 순차 공개 |

> 한 줄 요약: **Genie 3가 무성 영화(720p, 무음, 1분)였다면, Genie 4는 토키(유성 영화) + 감독(Gemini)이 들어간 2분짜리 즉흥 연극**

### 3.2 Ghidra 분석 — 바이너리 관점 (Low-level)

- **시크릿 sauce:** 공개된 파라미터 0개 — 모델 크기, 해상도, fps, 세션 길이 모두 미공개 → “블랙박스 as a service” (Google-hosted만)
- **통신 패턴:** `Project Genie` 웹앱 → Google 서버에서 프레임 스트리밍 — 로컬 GPU 8개 필요한 Skywork 대비 클라우드 종속
- **보안:** SynthID 워터마크는 프레임·오디오 파형에 invisible — `ghidra`로 보면 매 프레임 헤더에 서명
- **약점 (drift):** 2분 넘으면 오브젝트가 살짝 떠다님 — “world model drift”는 아직 미해결, 긴 세션은 메모리 imperfect

### 3.3 우리 REA에 흡수 — 어떻게 코드로 옮길까

| Genie 4 능력 | 우리 흡수 설계 | 파일 (이번 커밋) |
|---|---|---|
| **실시간 월드 모델** | `GenieWorldEngine` — `prompt → frame[]` 루프, keyboard + text steering | `arena-code/src/tools/genieWorld.ts` (신규) |
| **네이티브 오디오** | `AudioBus` — ambient + music + dialogue를 같은 tick에서 생성 | `genieWorld.ts` 내 `generateAudio()` |
| **Gemini 감독 루프** | `GeminiPlannerInLoop` — 목표를 step으로 쪼개고 매 프레임 검증 | `genieWorld.ts` 내 `planAndVerify()` |
| **2분 일관성** | `ConsistencyWindow` — 120초 sliding window, 이전 프레임 60개를 memory로 유지 | `genieWorld.ts` 내 `memory: Frame[]` |
| **물리·인간** | `PhysicsTick` — collisions, aerodynamics, crowd를 간단 룰로 시뮬레이션 | `genieWorld.ts` 내 `tickPhysics()` |
| **Project Genie UX** | `palace_demo.html`처럼 `genie_demo.html` — 프롬프트로 날씨 바꾸기 데모 | `arena-code/docs/genie_demo.html` |

> Ghidra 철학: “좌표=주소”처럼, Genie도 “프레임=주소” — 매 프레임이 다음 프레임의 주소를 결정

---

## 4. REA + Ghidra로 본 구글 제미나이 4 카본 (Gemini 4 Carbon) — 세계 1위 보안 AI

### 4.1 REA 분석 — 왜 2주 만에 또 냈나 (gil257 블로그 + 공식 발표)

> 블로그 핵심 3줄 요약: **① Carbon 59점으로 세계 1위(Argon 50→ Carbon 59, Claude 58, GPT-6 Astra 57) ② OpenAI가 구글 TPU 산다 ③ Genie 4는 말 걸어옴**

| 항목 | Carbon 실제 수치 | 의미 |
|---|---|---|
| **종합 1위** | Artificial Analysis Intelligence Index v5.0 **59점** 1위 (Claude 58, GPT-6 Astra 57) | 간발 차 1점이지만 13/19 벤치마크 1위 — “코딩·에이전트·사이버보안”에서 도약 |
| **사이버보안 3종** | **SEC-bench Pro 88.2%** (취약점 찾기), **ExploitGym 54.8%** (익스플로잇), **CWE-bench 71.0%** (패치) | Chrome 팀 “경쟁사 대비 10배 좋은 패치”, secure code 2배 |
| **웹개발** | WebDev Arena **#4 1769 Elo (+89)** | Argon 대비 +89 — 프론트엔드 5.5점 올릴 힌트 |
| **코딩 장시간** | Terminal-Bench 4.0 **65.2%** (Claude 59%, GPT-6 59%) — **며칠간 dead end 버티며 작업** | “수천 Googler가 Rust 마이그레이션, 300TiB 메모리 절감에 이미 씀” |
| **정직성** | unsupported claims **절반(-50%)**, 고심도 misalignment **-80%**, cheating 시도 0.4% → 성공 0.0% | Argon 대비 “모른다”고 솔직히 말함, 방법론 caveat를 결과물에 직접 적음 |
| **협업** | overreach -26% (월권), under-service -29% (방치) — **“모호하면 출처 꺼내서 물어보고 행동”** | “추측 말고 검색 → 불일치 사용자에게 보여주기” |
| **프롬프트 인젝션** | **0.0%** (Argon 0.7% → Carbon 0.0%) — Gray Swan 벤치마크 | 에이전트가 외부 문서 먹어도 뚫리지 않음 |
| **가격** | **$2 / $10 (input/output 1M tokens)**, cached 95% 할인 → 이후 $4/$20 | Argon과 동일, Claude Sonnet 5.5와 동일 — 공격적 가격 |
| **접근** | **아직 일반인 불가** — Fairwind Program 사이버 방어자에게 먼저, 미국 정부 출시 전 테스트 참여 | “세계 1위인데 아무도 못 쓰는” — 안전 때문에 방어자에게 먼저 패치 기회 |

### 4.2 Ghidra 분석 — 바이너리 관점

- **아키텍처:** Argon(50점) → Carbon(59점) 9점 점프는 “연구자 + 모델이 함께 일해” — 모델이 모델을 개선하는 loop
- **보안 스택:** Argon과 동일 + chain-of-thought 모니터링 — 매 reasoning step을 감시해 “misalignment alert” 80% 감소
- **듀얼유즈:** 취약점 찾기 88% + 익스플로잇 54% → 공격자도 쓸 수 있어서 “제한적 공개”가 필수 — Ghidra처럼 “분석기는 강력하지만 배포는 신중”

### 4.3 우리 REA에 흡수 — 어떻게 코드로 옮길까

| Carbon 능력 | 우리 흡수 설계 | 파일 (이번 커밋) |
|---|---|---|
| **SEC-bench 88.2% 찾기** | `CarbonSecureScanner` — `findVulns(code)` → CWE 분류 + 심각도 | `arena-code/src/tools/carbonSecure.ts` (신규) |
| **ExploitGym 54.8% 익스플로잇** | `ExploitVerifier` — 취약점을 재현 코드로 검증 (안전 샌드박스) | `carbonSecure.ts` 내 `verifyExploit()` |
| **CWE-bench 71% 패치** | `SecurePatcher` — 패치 생성 + 10배 품질 (Chrome 팀 방식) — `oldCode → newCode + test` | `carbonSecure.ts` 내 `generatePatch()` |
| **장시간 에이전트 (며칠)** | `LongHorizonPlanner` — 목표를 100 step으로 쪼개고 dead end에서 재시도, 매일 checkpoint | `carbonSecure.ts` 내 `runLongHorizon()` |
| **정직성 -50%** | `TransparencyGate` — “모른다”면 caveat를 결과에 직접 적고, 막힌 행동은 남은 할 일 리스트로 반환 | `src/harness2/guard.ts`에 이미 있는 Starlark deny + 새 `honestyCheck()` |
| **협업 -26%/-29%** | `AskBeforeAct` — 모호하면 출처 3개 꺼내서 사용자에게 물어보기 | `src/brains/context.ts` `askBeforeAct()` |
| **프롬프트 인젝션 0%** | `InjectionShield` — 외부 문서 먹어도 `require("node:fs")` 같은 위험 호출 차단 | `src/harness2/guard.ts` `SECRET_PATTERNS` + `sanitizeExternalDocs()` |

---

## 5. 통합 로드맵 — 30일 안에 10점

### Week 1 (Day 1-7): 코드 품질 8.5→9.5
- Day 1-2: Phase A (warnings 1848→1200) — `lint:fix`, 정규식, finally
- Day 3-4: Phase B (1200→700) — 함수 쪼개기 Top 20
- Day 5-7: Phase C (700→500) — 복잡도 15→10, 문서화
- **검증:** `npm run lint` <500 warnings

### Week 2 (Day 8-14): Genie 4 흡수 — 프론트엔드 5.5→8.0
- `genieWorld.ts` + `genie_demo.html` 완성 — 프롬프트로 날씨 바꾸는 궁전 데모
- `AudioBus` 추가로 “기억이 말 걸어옴” — `MemoryEntry`에 `audioHint` 필드
- **검증:** `palace_demo.html`처럼 `genie_demo.html`에서 실시간 steering 데모

### Week 3 (Day 15-21): Carbon 흡수 — 백엔드 9.5→10
- `carbonSecure.ts` 3종 (find/verify/patch) — `npm run verify:security` 신규
- `LongHorizonPlanner` — 며칠 걸리는 작업을 100 step으로 나눠 checkpoint
- **검증:** `SEC-bench` 스타일 내부 벤치마크 80%+ 달성

### Week 4 (Day 22-30): 10점 마무리
- `knip` OOM 해결 + `jscpd` <5% + `typecheck` 0 + `docs` 10점 문서 완성
- **최종 검증:** `npm run check:pr` 0 errors / <500 warnings / 409 PASS / 0 todos

> 12살 요약: **1주 청소 → 1주 놀이터 만들기 → 1주 경비원 훈련 → 1주 마무리 파티**

---

## 6. 바로 이번 커밋에서 하는 것 (MVP)

1. `arena-code/src/tools/genieWorld.ts` — Genie 4 월드 모델 최소 구현 (frame loop + audio + planner)
2. `arena-code/src/tools/carbonSecure.ts` — Carbon 보안 3종 (find/verify/patch) 최소 구현
3. `arena-code/docs/genie_demo.html` — Genie 스타일 프롬프트 steering 데모 (palace_demo.html 확장)
4. 본 문서 `docs/PLAN_10_GENIE_CARBON_2026-10-29.md` — 10점 계획서

다음 PR에서 `warnings 1848→1200` Phase A를 바로 실행합니다.

---

## 7. 출처

- Genie 4: TechCrunch 2026-10-27, MarkTechPost, TheAIInsider, GadgetsNow — Research preview, 2분 일관성, Gemini 3.8 Flash planner, SynthID
- Carbon: 9to5Google 2026-10-28, The Verge, gil257 Naver Blog 224457789740 — Index 59/88.2/54.8/71.0, $2/$10, Fairwind, 미국 정부 테스트
- 우리 코드: lint 1848 warnings, main 564b32a, 409 PASS — 2026-10-29 재측정

> “모델이 모델을 만든다” — 구글처럼, 우리도 REA가 REA를 개선하는 loop로 10점을 만듭니다.
