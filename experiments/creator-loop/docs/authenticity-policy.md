# 진정성 정책 엔진 (2025-07-15 "inauthentic content" 대응)

YouTube는 2025년 7월 15일 YPP(YouTube Partner Program) 정책에서 기존의
**"repetitious content"(반복 콘텐츠)** 조항을 **"inauthentic content"(진정성 없는 콘텐츠)**
로 이름을 바꾸고 범위를 명확히 했습니다. 핵심은 두 가지입니다.

1. **대량 생산(mass-produced) · 반복(repetitive) 콘텐츠**는 수익화가 제한됩니다.
2. **AI 사용 자체는 금지가 아닙니다.** 독창적 해설, 의미 있는 변형,
   교육적·창작적 가치가 있으면 여전히 수익화됩니다. 다만 **사실처럼 보이는
   합성/변형 미디어는 공개(disclosure)** 해야 합니다.

이 프로젝트의 설계 원칙은 그 문장에서 그대로 나옵니다:

> **"무엇을 만들지는 사람이 전략적으로 결정하고, 만드는 과정은 AI가 자동화한다."**

엔진은 `creatorloop/policy.py` 에 있으며 **fail-closed**(막히면 멈춤)로 동작합니다.

---

## 1. 정책이 실제로 금지하는 것 (엔진이 막는 것)

| YouTube가 지목한 패턴 | 우리 엔진의 대응 |
| --- | --- |
| 템플릿으로 찍어낸, 변형이 거의 없는 영상 | `TEMPLATE_REPETITION` / `TEMPLATE_DRIFT_LOW` — 채널 카탈로그와 구조 시그니처를 비교 |
| 규모로 쉽게 복제 가능한 콘텐츠 | `MASS_PRODUCTION_CADENCE`, `HIGH_CADENCE` — 24시간 4편 / 7일 14편 임계 |
| 서사가 피상적으로만 다른 영상 | `NARRATION_REPETITION` — 내레이션 텍스트 유사도 |
| 같은 내레이션의 슬라이드쇼 | `SLIDESHOW_LOW_NARRATIVE`, `LOW_VISUAL_CHANGE` — 프레임 dHash + 컷 수/초 |
| 본인이 만들지 않은 자료의 낭독 | `REUSED_WITHOUT_TRANSFORM` — 재사용 소스 + value-add 0개 |
| 거의 동일한 영상의 대량 업로드 | `VISUAL_REPETITION`, `AUDIO_REPETITION` — 프레임/오디오 시그니처 |
| 제목·메타데이터가 내용과 다름 | `MISLEADING_METADATA` — 제목↔내용 정합도(congruence) 0.25 미만이면 BLOCK |

## 2. 정책이 요구하는 것 (엔진이 점수로 보상하는 것)

| 요구 | 우리 엔진의 대응 |
| --- | --- |
| 사람의 창작적 기여 | `HUMAN_DECISION_MISSING`(결정 3개 미만 BLOCK), `LOW_HUMAN_SHARE`(기여율 35% 미만 WARN) |
| 본인 육성/촬영/데이터 같은 고유 기여 | `VALUE_ADD_MISSING` — `ValueAddKind` 7종 중 2개 미만이면 BLOCK |
| AI가 쓴 대본을 사람이 실제로 고쳤는가 | `SCRIPT_UNEDITED` — 편집 거리 + 사람 소스 비율로 판정 |
| 합성·변형 콘텐츠 공개 | `DISCLOSURE_SET`(INFO, 통과) / `DISCLOSURE_MISSING`(BLOCK) |
| 배치 자동화의 무분별한 실행 | `BATCH_WITHOUT_GATES` — 승인 게이트 없이 배치 모드면 BLOCK |

`ValueAddKind` 7종: `personal_experience`, `original_data`, `expert_commentary`,
`original_research`, `custom_visual`, `human_voice`, `unique_format`.

## 3. 판정 수치

```
score = 100 − 30·(BLOCK 개수) − 12·(WARN 개수) + bonus(사람 기여)
pass  = score ≥ 60  AND  BLOCK == 0
```

유사도 임계값 (`policy.py` 상단 상수):

| 상수 | 값 | 의미 |
| --- | --- | --- |
| `WARN_SIMILARITY` | 0.62 | 구조 시그니처 유사도 — 경고 |
| `BLOCK_SIMILARITY` | 0.82 | 구조 시그니처 유사도 — 차단 |
| `TITLE_WARN_SIMILARITY` | 0.72 | 제목 유사도 — 경고 |
| `TITLE_BLOCK_SIMILARITY` | 0.86 | 제목 유사도 — 차단 |
| 내레이션 텍스트 | 0.75 | 초과 시 BLOCK |
| 사람 기여율 | 0.35 | 미만이면 WARN |

**구조 시그니처**는 `structure_signature()`가 훅 종류 · 씬 수 · 비트 계획 ·
러닝타임 밴드 · 내레이션 길이 프로필에서 만든 벡터이고, 카탈로그(`catalog.jsonl`)의
과거 영상들과 비교합니다. 즉 *"같은 템플릿으로 또 찍었나?"*를 수치로 답합니다.

**텍스트 유사도**는 shingle(4-gram Jaccard)과 토큰 코사인을 섞습니다
(`0.65·shingle + 0.35·token`, 짧은 문장은 토큰 가중치 상승). 어순만 바꾼 제목도 잡힙니다.
한국어는 조사(`은/는/이/가/을/를/…`)를 벗겨내어 형태소 차이로 유사도가
떨어지는 오탐을 막습니다 (`strip_korean_particle`).

**시각/오디오 지문**은 `image_dhash`(프레임 4장)와 `audio_signature`(내레이션 스펙트럼)로,
`produce` 단계가 자동으로 저장합니다.

## 4. 사람 판정(personal judgement)을 기계가 대신하지 않는 부분

엔진은 **"충분히 다른가"** 만 측정합니다. **"이 주제가 시청자에게 가치가 있는가"** 는
측정하지 못하며, 그래서 강제로 사람에게 되돌립니다:

- `loop.script()`는 `edits`가 없고 `article` 경로도 아니면 **스크립트 게이트에서 멈춥니다.**
- `loop.policy_report()`의 `approved_gates`가 비어 있으면 `HUMAN_DECISION_MISSING` BLOCK.
- `cli approve`로 사람이 명시적으로 승인한 기록만 `decisions.jsonl`에 남습니다.
- Studio UI는 ①리서치 → 편집 → ③패키징 선택 → 승인 → ④분석 순서로만 진행됩니다.

## 5. 실제로 통과시킨 사례 (데모 로그)

```
③ POLICY — fail-closed 진정성 감사
   score=100.0/100 pass=True blocking=0 warnings=1 decisions=11 variation=1.00
   [WARN ] SYNTHETIC_VOICE_GENERIC_VISUAL: 합성 음성 + 일반 비주얼 조합은
           정책 집행에서 주요 트리거로 지목된 패턴입니다.
   [INFO ] DISCLOSURE_SET: 합성·변형 콘텐츠 공개가 설정되었습니다.
```

`human_ratio 77%`, 사람 결정 11개, 카탈로그 대비 variation 1.00 (첫 영상이라 비교 대상 없음)
→ 통과. 다만 **espeak-ng 합성 음성 + 생성 비주얼** 조합은 정책 리스크가 있다는
경고를 일부러 남깁니다. 실전에서는 이 경고를 없애는 것(본인 육성 일부 구간,
직접 촬영 컷 삽입)이 최우선 과제입니다.

## 6. 이 엔진이 보장하지 **않는** 것 (정직한 한계)

1. YouTube의 집행 로직은 비공개입니다. 우리 임계값은 **공개된 정책 문언 + 관측된
   집행 사례**에서 역산한 근사치이며, YouTube의 판정과 동일하지 않습니다.
2. 점수가 높다고 수익화가 보장되지 않습니다. `score`는 *차단 사유가 없는가*를
   보기 위한 내부 지표입니다.
3. 채널 단위(channel-wide) 집행을 fully 시뮬레이션하지는 못합니다. 우리는
   `catalog.jsonl` 기반의 **자기 채널 기억**만 봅니다 — 업로드 전에 자신이 만든
   과거 영상과 비교하는 것이 우리가 통제할 수 있는 유일한 범위입니다.
4. 합성 음성 품질(현지화·자연스러움)은 정책 점수와 별개이며, 실전에서는
   상용 TTS 또는 본인 녹음을 권장합니다.
