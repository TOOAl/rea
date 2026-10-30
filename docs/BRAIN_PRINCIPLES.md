# Brain Principles — 작업을 시작하기 전에 항상 확인

> 이 문서는 모든 작업의 **preflight checklist**이다. REA 본업(증거로 역분석)과 같이, 작업 자신도 증거로 검증한다.

## 원칙 1: 5단계 파이프라인

> ***정확하게 만든다 → 모순을 안 만든다 → 오류를 찾는다 → 다음을 설계한다 → 기억을 늘린다***

이 순서가 뇌가 하는 일의 전부다. 코딩은 그걸 검증하는 가장 엄격한 거울일 뿐이다.

### 각 단계의 REA·Ghidra 증거

| 단계 | 12살 설명 | REA 증거 | Ghidra 증거 | 실패 신호 |
|---|---|---|---|---|
| **1. 정확하게 만든다** | 말한 대로, 빠진 것 없이 만든다 | `evidenceSchema` + `AnalysisError` 0 | `readElfFixedHeader`가 범위 밖을 1byte도 허용 안 함 | lint 0/0 깨짐, 타입 에러 |
| **2. 모순을 안 만든다** | 스스로 앞뒤 다른 말을 안 만든다 | `resolveAppBundle`이 `BinaryTargetResolverCore ↔ Utils`에서 같은 의미를 가리킴 | P-Code 중간표현에서 모든 분기가 같은 변수 정의를 가리킴 | module-boundaries 2989 깨짐, 증거 간 `confidence` 충돌 |
| **3. 오류를 찾는다** | 남의 오류까지 찾아낸다 | Carbon `scanCarbonSecure` SEC-bench 88.2% | Ghidra `verify:module-boundaries`가 1개 위반도 잡음 | 테스트 실패를 숨김, `NOT_ENOUGH_INFO` 없이 넘어감 |
| **4. 다음을 설계한다** | 찾은 오류로 다음 할 일을 만든다 | Carbon `LongHorizonPlanner` 100 step + checkpoint, `createCarbonPlanEvidence` | Pwntools `handleOwnedCommandFailure`가 4개 블록으로 재계획 | 오류를 고쳤는데 `remaining`이 비어 있음 |
| **5. 기억을 늘린다** | 다음에 같은 실수를 안 하도록 기억을 늘린다 | `evidence_links`, `limitations`, `docs/PHASE_A_*` | `.memory-bank/errors.md`가 다음 생성 때 프롬프트로 주입 | 같은 린트 경고를 2회 이상 반복 |

**검사 명령:**
```bash
npm run check:fast  # 1. 정확성 (typecheck + lint 0)
npm run verify:module-boundaries  # 2. 무모순 (2989 PASS)
npm run test:local -- src/domain/carbon/carbon.test.ts  # 3. 오류 탐지
npm run verify:carbon  # 4. 다음 설계 (Carbon 3종 벤치)
cat docs/BRAIN_PRINCIPLES.md  # 5. 기억 (본 문서)
```

## 원칙 2: 신뢰 — 4개는 하나다

> ***정확성, 무모순, 오류탐지+설계, 기억연장 — 이 4개는 사실 “신뢰”라는 하나의 능력이에요.***

Carbon이 `AA 59점 1위`인데도 `Fairwind Program`으로 방어자에게만 먼저 주는 이유, Genie 4가 2분짜리인데도 `SynthID` 워터마크를 박는 이유가 다 그거예요 — **똑똑한 것보다 믿고 맡길 수 있는 것이 더 귀해서.**

REA가 앞으로 가야 할 방향도 그거예요. `scan → verify → patch → plan → caveat → ask → shield` 이 7단계가 다 “오류를 안 만들고, 찾아서, 다음을 설계하며, 기억하는” 회로의 구현이고, 궁극은:

**스스로 모순을 만들지 않고, 남의 모순을 찾아주며, 그 기억으로 다음을 설계해주는 뇌.**

### 신뢰의 증거

| 4개가 하나로 보일 때 | REA 행동 | Carbon 증거 | Ghidra 증거 |
|---|---|---|---|
| **정확성** | 말한 파라미터가 증거에 그대로 남음 | `$2/$10` 가격이 증거에 기록 | `evidence_id = sha256(parameters+result)` |
| **무모순** | 같은 `sha256`은 항상 같은 `format` | `recordedCrash`가 `Core ↔ Part2`에서 같은 스키마 | `SHT_NOBITS`는 항상 `file_backed: false` |
| **오류탐지+설계** | `remaining: ["Collect more evidence"]` | `TransparencyGate` caveat | `P-Code`에서 dead code는 `unknown`으로 남김 |
| **기억연장** | `evidence_links: ["ev_..."]` | `LongHorizon checkpoint` | `.cache` + `docs/analysis/` |

## Preflight Checklist (작업 시작 전 30초)

모든 인간·에이전트는 작업 시작 전에 이 5줄을 소리 내어 읽고, 1줄씩 증거를 댄다:

- [ ] **정확성**: 내가 만들 것은 요구사항의 어느 줄인가? (`AGENTS.md#Contribution scope` 확인)
- [ ] **무모순**: 이 작업이 기존 2989 경계를 깨지 않는가? (`verify:module-boundaries` 예상 PASS)
- [ ] **오류탐지**: 어떤 오류/모순을 찾으러 가는가? (예: Carbon 88.2% 스캔, lint 1개)
- [ ] **다음설계**: 찾은 뒤 `remaining`은 무엇인가? (예: `docs/analysis/*.md` + 다음 `verify:carbon`)
- [ ] **기억연장**: 이 작업의 증거는 어디에 남기는가? (`evidence_id`, `docs/`, `evidence_links`)

> 이 체크리스트를 통과하지 못하면 작업을 시작하지 않는다. — `CONTRIBUTING.md#fail-closed`와 동일 원칙

## 가장 효과적인 적용 — 3층 강제

**왜 md만으로는 부족한가:** 사람은 md를 안 읽는다. 에이전트도 컨텍스트가 길면 잊는다.

**3층 강제 (이번 커밋에 모두 적용):**

1. **문서층 (본 파일)** — 인간이 읽는 진실의 원천. `docs/BRAIN_PRINCIPLES.md`가 정본.
2. **에이전트층 (`AGENTS.md` + `.agents/skills/reverse-engineer-anything/SKILL.md`)** — 모든 에이전트 호출 시 자동 주입. `AGENTS.md` 상단에 `Brain Principles` 섹션 추가, skill에 preflight 명령 포함.
3. **코드층 (`scripts/verify-brain-principles.mjs` + `.husky/pre-commit` + `package.json#verify:brain`)** — 기계가 검증. `lint 0`, `boundaries PASS`, `evidence_links` 존재, `limitations` 비어있지 않음을 자동 검사. CI에서 `verify:brain` 실패 시 머지 불가.

3층이 동시에 있어야 “읽고, 기억하고, 강제되는” 신뢰가 된다.

## 관련 문서

- 원문: `docs/analysis/gemini-4-carbon-rea-ghidra-2026-10-30.md` (gil257 224457789740, Google 2026-10-28)
- 로드맵: `docs/PLAN_10_GENIE_CARBON_2026-10-29.md`
- 흡수: `docs/carbon-absorption.md`
- 기여: `AGENTS.md`, `CONTRIBUTING.md#fail-closed`
