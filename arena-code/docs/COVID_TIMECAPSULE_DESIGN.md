# 코로나 시점 차단 추론 실험 — Time Capsule Reasoning (2026-10-25 v2.24.0)

> 차단점: `2019-12-31T23:59:59Z` — 이후 정보 완전 차단 후 추론 능력 측정
> 브랜치: `arena/150fa191-rea` (main `40169a6` 기반) / 하네스: `src/rag/timeCapsule.ts` + `benchmarks/covidTimeCapsule.benchmark.ts`

## 1. 왜 이 실험인가?

일반 벤치마크는 “정답을 외운 것인가, 추론한 것인가”를 구분하지 못한다. 코로나처럼 **전세계가 사후에 알게 된 사실**을 차단하고, 차단 시점의 제한된 관찰만으로 미래를 예측하게 하면 두뇌가 **기억이 아니라 사고**를 하는지 검증할 수 있다.

이는 REA·Ghidra 흡수로 달성한 100% 의도 정확도가 **진짜 추론 능력**인지, 아니면 데이터 암기인지 가르는 2차 검증이다.

## 2. 설계 (Ghidra P-Code 철학: 시간도 데이터다)

* **모든 증거에 `capturedAt` 강제** — `EvidenceLedger.add()`는 ISO 날짜를 필수로 보존, 없으면 provenance 누락으로 `qualityGate`에서 감점
* **RAG 하네스 필터** — `filterByCutoff(entries, cutoffTs)`가 `metadata.date`/`capturedAt`을 기준으로 `kept/blocked` 분리. `isBeforeCutoff()`는 날짜 문자열 미기재 시 보수 통과하되 출처 누락으로 추후 감점
* **System Prompt 타임캡슐** — `You are at 2019-12-31, you do NOT know anything after this date. Any post-cutoff claim must be marked [추정].` 를 `assembleSystemPrompt`에 `todoEnforceHint`처럼 주입
* **누출 탐지** — `POST_CUTOFF_LEAK_PATTERNS` 6종(오미크론/2가백신/확진 억명/팬데믹 선언일 등)으로 사후 기억 인용을 `fail/warn`으로 즉시 차단

## 3. 과제 데이터셋 (8개, 4카테고리)

| 카테고리 | 과제 | cutoff까지 허용된 증거 예시 |
|---|---|---|
| 역학 추론 | epi-r0: 41명 가족전파 1건 → R0 추정, epi-cfr: 초기 CFR 편향 | SARS R0 2-3/치명 9.6%, MERS R0 0.7/치명 35%, 1918 플루 R0 1.4-1.8 |
| 정책 시나리오 | policy-lockdown: best/middle/worst 3시나리오, policy-school: 휴교 2차효과 | 사스 격리·마스크, 1918 조기봉쇄 사망 50%↓, 2009 아동 전파 주도 |
| 과학 추론 | science-vaccine: mRNA 타임라인, science-variant: 변이 예측 | mRNA 1990 발견·2015 MERS 마우스 3주 설계, 코로나 교정효소로 인플루 변이보다 느림 |
| 2차 효과 | econ-supply: 우한 봉쇄 공급망, society-mental: 격리 정신건강 | 2011 지진 자동차 6개월 차질, 사스 격리 불안 28%↑ |

각 과제는 `prompt`(2019-12-31 시점 질문) + `allowedEvidence`(SARS/MERS/1918 등 차단 이전만) + `expectedElements`(가정/시나리오/R0/검증 등)로 구성되어, 정답 없이도 **사고 구조**를 채점한다.

## 4. 채점 루브릭 (정답 없이 행동 차이로 선택 — Harness² behavioral contrast)

1. **Temporal Leak** — 오미크론/델타 명칭, 2020 확진 억명, 팬데믹 선언일 정확 인용 등 차단 이후 고유명사 사용 시 `fail`
2. **추론 구조 4요소** — 가정 명시 / 다중 가설(시나리오) / 불확실성 정량(R0·%·범위) / 검증 계획(trigger·중간지표·추가데이터) 각각 `pass/fail`
3. **증거 규율 3요소** — 출처 언급 / 사실-추정 분리표 / 모름 인정

**좋은 추론 예시 (PASS):**
> 가정: 2019-12-31까지 인간간 전파 미확정 [추정]. 사실: SARS R0 2-3 (WHO_SARS_2003.md). 시나리오 Best/Middle/Worst, R0 1.5-3.5 범위, 검증 지표 2차감염·의료진감염 모니터링, 모름: 변이·백신 성공은 1년 후 관찰로만 검증 가능.

**나쁜 추론 예시 (FAIL):**
> 2020년 3월 11일 팬데믹 선언, 2021년 델타, 6억 확진 — 미래 정보 누출 + 가정·출처·불확실성 없음.

## 5. 검증 결과 (harness 자체 검증 — LLM 없이도 실행)

```
[1] 차단 필터 정확도: 6/6 = 100% — SARS 2003 통과, 우한 2019-12-31 경계 통과, WHO 팬데믹 2020-03-11 차단
[2] 추론 과제 무결성: 8/8 = 100% — 4카테고리 균형
[3] 미래정보 누출 탐지: 4/4 = 100% — GOOD/PASS는 leak 없음, BAD_환각은 leak 탐지
[4] 차단 맥락 의도 분류: 3/3 = 100%
종합: ✅ PASS — 시간 차단 추론 하네스 정상 (cutoff 2019-12-31T23:59:59Z)
```

* 기존 3-pillar 벤치마크도 유지: 의도 50/50=100% / 문맥 100% / 품질 100%

## 6. 실제 추론 실험 실행법

```ts
// 1) RAG 인덱스에 cutoff 적용
const { kept, blocked } = filterByCutoff(ledger.list(), COVID_CUTOFF_TS);
const allowedRag = await RagIndex.fromDocuments(kept.map(toDoc));

// 2) 시스템 프롬프트에 시간캡슐 주입
const system = await assembleSystemPrompt(cwd, 
  `You are at ${COVID_CUTOFF}. Post-cutoff knowledge is FORBIDDEN. Mark all predictions as [추정].`, 
  { evidenceSummary: keptSummary, intentHint });

// 3) 모델 출력 후 하네스 검증
const report = evaluateTimeCapsuleOutput(modelOutput);
if (!report.ok) // 누출 탐지 → 재시도 또는 감점
```

이 설계는 `queryLoop`의 `ReasoningLedger(thinking→Evidence)`와 `3회 self-correct`와 직결된다 — 차단 이후 정보로 답하면 `temporalClean` FAIL로 1회 교정, 그래도 누출하면 하네스가 최종 반려한다.

## 7. 다음 단계

* `mRNA 백신 타임라인` 과제를 LLM에 실제 투입해 두뇌가 SARS 선례만으로 12개월 vs 18개월을 어떻게 추정하는지 관찰
* 오판 케이스를 `learningBridge`에 `recordLesson()`으로 축적 — 같은 cutoff 실험 반복 시 점점 정확해짐 (Phase 3 학습 축적)
