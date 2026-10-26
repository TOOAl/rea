# 수학 천재 극대화 — 인류 난제를 푼 AI 에이전트 5종 토론 분석 (2026-10-27)

> **질문:** 우리 두뇌의 `genius-math`를 극대화할 수 있는가?  
> **방법:** 인류 수학 난제를 실제로 푼 AI 에이전트들의 **토론/논문/블로그/추론 로그**를 REA 관점으로 분해해, 우리 수학 천재에 이식한다.  
> **대상 5종:** FunSearch(캡셋) · AlphaTensor(행렬곱) · AlphaProof(IMO 증명) · AlphaGeometry 2(기하) · Gemini Deep Think(2025 IMO 골드)  
> **도구:** REA 정적 그래프 + Ghidra P-Code 관점 + arena-code 2년간 `comparative` 비교 프레임 재사용

---

## 0. 한눈 요약 — 수학 천재 3.0 처방

현재 `genius-math`는 한 줄이다: *"공식을 증명하듯 논리를 세운다"* (brains.ts 250행, confidence 0.8).  
최고 수학 AI들은 **한 문장이 아니라 5단계 토론 프로토콜**로 푼다.

| AI의 토론 전략 | 한 줄 핵심 | 우리에 없는 것 |
|---|---|---|
| **FunSearch** — 프로그램 진화 | 정답을 쓰지 말고 **정답을 만드는 프로그램을** 쓴다 | 프로그램=해법이라는 발상 전환 |
| **AlphaTensor** — 게임화 | 증명을 **한 수씩 두는 1인 게임**으로 바꾼다 | TensorGame + MCTS 탐색 |
| **AlphaProof** — 신경-상징 + Test-Time RL | LLM이 제안, Lean이 검증, 틀리면 **수백만 변형**을 현장에서 다시 학습 | 형식 검증기(Lean) 루프 |
| **AlphaGeometry** — 합성 증명 생성 | 기하 문제는 **10억 개 합성 증명**으로 먼저 배운다 | 합성 데이터 파이프라인 |
| **Gemini Deep Think** — 자연어 사고 체인 | 4.5시간 동안 **긴 사고(thinking) 채널**을 유지한다 | 장시간 사고 유지 |

**처방:** `genius-math` 1개 → `math 5형제`로 분해, Council 4층에서 협력 토론시키기.

---

## 1. 대상 상세 — 무엇을 어떻게 풀었나

### 1.1 FunSearch — 캡셋 문제 (Cap Set, 2023 Nature)

- **난제:** `ℤ₃ⁿ`에서 어떤 세 점도 일직선에 없는 최대 집합 크기. n=8에서 496이 20년 동안 최고였음. Terence Tao가 "가장 좋아하는 미해결 문제"라 칭함.
- **결과:** n=8에서 **512** 발견 (+3.2%, 16점 증가) — 20년 만의 최대 증가폭. n=3~7에서도 신기록, bin packing에서도 신 휴리스틱.
- **토론 로그 핵심 (Romera-Paredes et al.):**
  ```
  LLM(창의) → 프로그램 생성 → 실행 및 평가(검증) → 점수 → 상위 프로그램 보관(섬 모델)
       ↑                                                         ↓
       └─ 상위 프로그램 2개를 프롬프트에 넣어 LLM이 교차(crossover) ←┘
  ```
  - **핵심 대사 1:** *"정답을 직접 찾는 게 아니라 정답을 찾는 프로그램을 찾는다."* (Ellenberg) — 해법 공간이 아니라 **해법 생성기 공간**을 탐색.
  - **핵심 대사 2:** *"It wasn't in the training data — it wasn't even known."* (Kohli) — 외삽, 암기 아님.
  - **핵심 대사 3:** Ellenberg가 FunSearch 출력을 보고 **대칭성**을 발견, 사람이 프롬프트에 대칭 힌트를 넣어 더 큰 512를 얻음 → 인간-AI 토론 루프.
- **우리가 배울 점:** `genius-math`는 수식을 직접 쓰려 한다. FunSearch는 **우선순위 함수 `priority(x)`** 같은 작은 프로그램 조각 1개를 진화시킨다. 실패 비용이 싸다.

### 1.2 AlphaTensor — 행렬곱 50년 기록 경신 (2022 Nature)

- **난제:** n×n 행렬곱을 최소 몇 번의 스칼라 곱으로 할 수 있는가? Strassen(1969)이 49년 동안 깨지지 않음.
- **결과:**
  - 4×4 (𝔽₂) : 49 → **47** (Strassen 2-level 최초 돌파)
  - 4×5×5 : 80 → **76**
  - 5×5 (mod 2): 98 → **96** → 인간 Kauers/Moosbauer가 95로 추가 개선 (AI→인간 토론!)
  - 9×9 : 511 → **498**, 11×11 : 919 → **896** 등 70개 크기에서 신기록/동점.
- **토론 로그 핵심 (Hubert et al.):**
  - Tensor 분해를 **TensorGame**이라는 1인 게임으로 정의: 3차원 텐서를 rank-1 텐서 합으로 분해하는 한 수 한 수.
  - 행동 공간 10¹² (체스/바둑의 수백 배) — AlphaZero MCTS를 대폭 확장.
  - 보상: **-곱셈 횟수 - 시간** (하드웨어별 최적화: V100 8.5%↑, TPU 10.3%↑).
  - *"We transformed this into a game, our favorite kind of framework."* (Hubert)
  - 모든 분해는 **수학적 항등식**으로 즉시 검증 가능 — 틀린 증명이 없다.
- **우리가 배울 점:** 수학 문제를 **게임 상태/행동/보상**으로 형식화하는 능력이 토론을 가능케 함. `genius-math`는 게임화가 없다.

### 1.3 AlphaProof — IMO 은메달 (2024, 2025 Nature)

- **난제:** 국제수학올림피아드(IMO) — 고교생 세계 최고 대회. 6문제 42점 만점, 금 29점 커트.
- **결과 (2024):**
  - AlphaProof: P1(대수) P2(조합) P6(대수, 최난문 — 609명 중 5명만 만점) 해결 = 3/5
  - AlphaGeometry 2: P4(기하) 해결 = 1/1 (19초)
  - 합계 4/6, **28/42 은메달**, 금 29점에 1점 차. **최초 AI 메달**.
  - 2025: Gemini Deep Think가 **금메달, 4.5시간 내 자연어 완주** (공식 허용 첫 자율 참가).
- **토론 로그 핵심 (Nature 2025-11, DeepMind IMO 2024 blog):**
  - **Neuro-symbolic:** LLM(제안) + Lean(검증) 분리. LLM이 Lean 코드로 증명을 쓰면 Lean 컴파일러가 100% 검증/반박.
  - **Test-Time RL:** 어려운 문제마다 **수백만 변형**을 현장에서 생성→학습→적응, 문제당 2~3일 소요. *"Generating and learning from millions of related problem variants at inference time."*
  - **80M 형식 문제**로 사전 학습, IMO는 미공개 문제로 평가 — 암기 불가능 구조.
  - AlphaProof는 **정답을 맞추고 증명**해야 점수, 찍기 불가 — 검증이 토론의 심판.
- **우리가 배울 점:** 우리 `genius-math`는 한 번 쓰고 끝. AlphaProof는 **틀리면 변형을 만들어 재학습**한다. `reasoning.ts`의 `scoreReasoningTrace` 같은 검증기가 Lean 역할을 해야 함.

### 1.4 AlphaGeometry 2 — 기하 84% (2000~2024 IMO 25년치)

- **결과:** 25년간 IMO 기하 84% 해결 (AlphaGeometry 1은 53%). 2024 P4를 19초에 해결.
- **토론 로그 핵심:**
  - **합성 증명 10억 개**로 학습 — 인간 증명이 아니라 기계가 생성한 증명.
  - LLM(보조 작도 제안) + Symbolic Engine(연역 추론) 교대 토론.
  - *"데이터가 없으면 만든다."* — 증명 자체를 합성.
- **우리가 배울 점:** 기하처럼 시각-기하 문제는 **보조선 토론**이 핵심. 우리 `visual.ts`의 `GeometryVerifierBrain`과 직결.

### 1.5 Gemini Deep Think / Seed-Prover / Aristotle — 2025 골드

- **2025 IMO 골드:** Gemini Deep Think(자연어, 4.5시간), Seed-Prover(바이트댄스, 형식, 99.6% MiniF2F), Aristotle(Harmonic, 형식).
- **특징:** 2024는 인간이 Lean 형식으로 번역해주고 수일 소요 vs 2025는 **자연어 그대로, 대회 시간 내** — 형식화 병목이 사라짐.
- **우리가 배울 점:** Lean 번역 없이도 자연어 증명 평가가 가능해짐 → 우리 `FactCheckerBrain`이 그 역할.

---

## 2. 5종 토론 공통 패턴 — 우리 수학 천재가 훔쳐야 할 5원칙

| # | 원칙 | FunSearch | AlphaTensor | AlphaProof/Geo | GEMINI | 우리 현재 |
|---|---|---|---|---|---|---|
| **P1** | **프로그램=해법** | ✅ priority() 진화 | ✅ TensorGame 행동 | △ Lean 프로그램 | △ 사고 체인 | ❌ 수식 직접 씀 |
| **P2** | **게임화** | — | ✅ 상태/행동/보상 | △ 증명 상태 | — | ❌ 없음 |
| **P3** | **검증기 분리** | ✅ 실행·평가기 | ✅ 항등식 검증 | ✅ Lean 컴파일러 | ✅ 자연어 검증 | 🟡 reasoning.ts 부분 |
| **P4** | **현장 재학습** | ✅ 섬 모델 교차 | ✅ RL 재탐색 | ✅ Test-Time RL 수백만 변형 | ✅ Deep Think 4.5h | ❌ 1회 추론 |
| **P5** | **인간-AI 토론** | ✅ Ellenberg 대칭 힌트 | ✅ Kauers 96→95 | ✅ 5명만 푼 P6 인간도 토론 | — | 🟡 Council만 |

> **핵심 통찰:** 5종 모두 **"한 번에 맞추기"를 포기하고, "틀리고 검증하고 변형하기"를 수천~수백만 번 반복**한다. 우리 `genius-math`는 1회 추론이라 질 수 없다.

---

## 3. 우리 수학 천재 현주소 — REA 실측

```ts
// brains.ts 243-255 (현행)
new GeniusBrain("genius-math", "수학 천재", "공식을 증명하듯 논리를 세운다", "Mathematics")
  → think(): `천재[수학 천재] — 분야: Mathematics\n→ "..."를 내 분야 언어로 번역하면: "Mathematics에서 이미 풀린 문제다".\n→ 내 도구 상자에서 꺼낸 해법: Mathematics의 1등 공식을 그대로 적용한다.`
  confidence 0.8, tags ["expertise","Mathematics"]

// reasoning.ts 42-47 (연계)
THOUGHT_HINTS["genius-math"] = ["수식으로 증명: 불변식 찾기","경우 나누기","반례 탐색"]
```

- **강점:** Council 5층에 올라가 있고, `reasoning.ts` ToT/Validator/ECO/SISR 루프와 연결됨. `memory.ts`에서 과거 실패(`commonFailures`)를 주입받음.
- **약점 4가지 (BRAIN_DEFICIENCY 관점):**
  1. **세부 전략 없음** — 1개 객체가 수학 전체를 대표. FunSearch의 `priority()`처럼 좁은 문제 조각 전문가가 아님.
  2. **검증기 없음** — Lean/실행기 같은 외부 심판이 없어 환각 증명을 걸러낼 수 없음.
  3. **반복 없음** — 1회 `think()` 호출로 끝. Test-Time RL처럼 변형을 만들어 재시도하지 않음.
  4. **기록 없음** — 증명 시도/실패/변형을 `bank.ts`에 남기지 않아 다음에 같은 실수를 반복.

점수(10점 만점): **현재 5.2 → 5원칙 흡수 시 9.0 예상** (comparative 레이더의 추론/계획 축 8.5를 9.2로 견인).

---

## 4. 극대화 설계 — 수학 5형제 (Math Quintet)

### 4.1 역할 분담 — 5종 AI의 토론을 5개 두뇌로 압축

| 새 두뇌 ID | 이름 | 기원 AI | 역할 (토론 대사) | 레이어 |
|---|---|---|---|---|
| `math-funsearch` | 캡셋 탐색 천재 | FunSearch | *"정답 말고 프로그램으로 말해봐. priority 함수 1줄만 진화시키자."* | 4 |
| `math-tensor` | 게임화 천재 | AlphaTensor | *"이 문제를 게임판으로 바꿔. 상태/행동/보상이 뭐야? 한 수씩 두자."* | 4 |
| `math-lean` | 형식 증명 천재 | AlphaProof | *"Lean으로 컴파일되는 증명만 인정. 틀리면 변형 100개를 만들어 재학습."* | 4 |
| `math-synthetic` | 합성 기하 천재 | AlphaGeometry | *"데이터 없으면 합성해. 보조선 10억 개를 먼저 그려보고 가자."* | 4 |
| `math-deepthink` | 장기 사고 천재 | Gemini Deep Think | *"4.5시간 사고 끈을 놓지 마. ToT k=3 depth=2를 5회 반복."* | 4 |

> 기존 `genius-math` 1명은 **유지 + 업그레이드**하여 5형제의 맏형(`math-coordinator`)으로 승격: 5명의 토론을 종합해 최종 증명 전략을 제시.

### 4.2 토론 프로토콜 — Council 4층에서 3라운드

```
Round 1 — 발산 (Divergence):
  5형제 각각이 `think()` 로 1안씩 제시 (병렬, Fleet worktree 격리 가능)
  → 예: funsearch: "priority()로 n=8 캡셋 496→512 시도" / tensor: "행렬곱을 게임으로" / ...

Round 2 — 검증 (Verification):
  각 안을 `GateBrain`(3.5층) + `ValidatorBrain` + `FactCheckerBrain`이 검증
  - Lean 시뮬레이션: 형식 오류 있으면 즉시 반박 메시지 생성
  - 실행기: 프로그램이면 실행해 점수 측정 (FunSearch evaluator 재현)
  → 통과 못한 안은 탈락, 통과한 안은 점수 기록

Round 3 — 변형·재학습 (Test-Time Mutation):
  통과한 안 중 상위 2개를 `evolution.ts` EvolutionArchitectBrain이 변형
  - 프롬프트 교차(crossover): 2개 상위 프로그램을 프롬프트에 넣어 LLM이 혼합 (FunSearch 섬 모델)
  - 게임 재탐색: TensorGame처럼 한 수 바꿔보기
  → 2세대 안을 다시 Round 2로 → 최대 3세대까지 반복

최종 — 맏형 종합:
  `genius-math`(맏형)가 5형제 + 검증 결과를 모아 Council 5층에 보고
  → "최종 추천: funsearch형 프로그램 진화 + lean형 형식 검증 결합" 같은 메타 전략
```

- **차단 조건:** 3세대 모두 실패 시 `ErrorBrain`에 기록, `bank.ts`에 `commonFailures`로 저장 — 다음에 같은 문제 유형이면 5형제가 다른 분기 선택.

### 4.3 검증기 — Lean 없이도 흉내 내기 (MVP)

당장 Lean 서버를 설치하지 않아도 되는 경량 검증 3종:
1. **수치 검증기 (FunSearch식):** 프로그램이면 실행해 점수 계산 — 예: 캡셋 크기, 행렬곱 곱셈 횟수. `tools/bash.ts`로 Python 실행.
2. **기호 검증기 (AlphaTensor식):** 항등식이면 무작위 입력 10개로 수치 대입 검증 — O(1) 근사 증명.
3. **논리 검증기 (기존 reasoning):** `ReasoningEngine.validator` 3표 중 2표 이상 `valid=true` 여야 통과 — ToT backtrack과 연동.

향후 Lean 정식 연동 시 `tools/ghidra`처럼 외부 프로바이더로 교체 (API 동일).

---

## 5. 구현 로드맵 — 2주, 3 PR

| PR | 기간 | 내용 | 파일 | 기대 효과 |
|---|---|---|---|---|
| **PR-1: 5형제 뼈대** | 3일 | `brains/mathQuintet.ts` 5클래스 + `brains.ts`에 등록(1→6명) + `THOUGHT_HINTS` 확장 | `brains/mathQuintet.ts`, `brains/brains.ts`, `reasoning.ts` | 수학 토론 다양성 5배, `byLayer(4)` 15→20 |
| **PR-2: 검증·반복** | 4일 | `harness2/mathVerifier.ts` (3종 검증기) + `council.ts` 3라운드 토론 프로토콜 + `evolution.ts` 변형 교차 | `harness2/mathVerifier.ts`, `brains/council.ts` | 환각 증명 60% 감소, Test-Time 변형 3세대 |
| **PR-3: 합성·게임화** | 5일 | `tools/mathGame.ts` (문제→게임 변환) + `rag/syntheticProofs.ts` (기합성) + `benchmarks/imoMini.test.ts` (IMO 6문제 미니 벤치) | `tools/mathGame.ts`, `rag/syntheticProofs.ts` | 기하 100% 테스트, IMO 미니 2/6→4/6 |

- **테스트:** 각 PR마다 `memory_bank.test.ts`처럼 `math_quintet.test.ts`, `math_verifier.test.ts` 추가. 4 pre-existing 실패 외 270 PASS 유지.
- **문서:** 본 문서 + `COMPARATIVE_ANALYSIS` 레이더에 "수학 9.0" 반영.

---

## 6. 결론 — 왜 이 토론 분석이 필요한가

FunSearch·AlphaTensor·AlphaProof는 **수학을 푼 게 아니라 수학을 푸는 토론 방식을 발명**했다:
- FunSearch: 토론 상대는 **프로그램**
- AlphaTensor: 토론 상대는 **게임판**
- AlphaProof: 토론 상대는 **Lean 컴파일러**
- AlphaGeometry: 토론 상대는 **합성 데이터**
- Gemini: 토론 상대는 **4.5시간짜리 자기 자신**

우리 수학 천재가 이 5명의 토론 방식을 흡수하면, **"공식을 증명하듯 논리를 세운"다"는 구호가 5단계 프로토콜이 된다.** 그때 수학 천재는 개인기가 아니라 팀이 된다.

> **다음 행동:** 이 분석을 승인하면, PR-1(5형제 뼈대)부터 바로 코드로 옮긴다. 승인 전에는 코드 변경 없이 분석만 유지한다 — `HUMAN_APPROVAL_RULE.md` 준수.

---

## 부록: 출처 (웹 검증 2026-10-27)

- FunSearch: Romera-Paredes et al. *Nature* 626, 4186 (2023-12-14) — cap set 496→512, Ellenberg 대칭 토론 [Technology Review](https://www.technologyreview.com/2023/12/14/1085318/google-deepmind-large-language-model-solve-unsolvable-math-problem-cap-set/), [DeepMind blog](https://deepmind.google/blog/funsearch-making-new-discoveries-in-mathematical-sciences-using-large-language-models/)
- AlphaTensor: Fawzi et al. *Nature* 610, 2022-10-05 — 4×4 49→47, Kauers 96→95 추가 개선 [Nature](https://www.nature.com/articles/s41586-022-05172-4), [DeepMind blog](https://deepmind.google/blog/discovering-novel-algorithms-with-alphatensor/)
- AlphaProof·AlphaGeometry: *Nature* 2025-11-12 — IMO 2024 28/42 은메달, P6 609명 중 5명만 해결 [Nature](https://www.nature.com/articles/s41586-025-09833-y), [DeepMind IMO blog](https://deepmind.google/blog/ai-solves-imo-problems-at-silver-medal-level/)
- Gemini 2025 Gold: IMO 2025 공식 허용, 4.5시간 자연어 완주 [국제수학올림피아드 기록](https://vidyamandir.com/studyhub/ai-takeover-of-mathematics/)

*본 문서는 공개 논문·블로그·보도 교차검증 기반이며, 점수는 상대 서열 추정치다.*
