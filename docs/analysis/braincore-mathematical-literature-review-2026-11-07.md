# BrainCore 수학·확률·통계 문헌 검토

- 검토일: 2026-11-07
- 범위: REA의 BrainCore에 직접 연결될 수 있는 불확실성 표현, 증거 평가, 다음 정보 선택, 계획·자기평가
- 성격: 소규모 문헌 검토 및 설계 제안. 체계적 문헌고찰도, 구현 승인도 아님.

## 요약

현 시점에서 가장 실용적인 아이디어는 수학적 모형을 크게 늘리는 것이 아니라, **후보를 구별하는 데 실제로 도움이 되는 다음 질문이나 검사를 고르는 것**이다. Bayesian active learning 연구는 불확실성 자체를 최대한 줄이는 대신, 가능한 가설들을 서로 다른 **의사결정 구역**으로 나누는 정보를 우선할 수 있다고 보인다. 이는 REA의 계획·재계획·증거 검증 목표와 잘 맞으며, 작은 합성 사례로 비교 실험이 가능하다.

두 번째 핵심은 **확률을 말하기 전에 확률의 신뢰도를 검증해야 한다**는 점이다. 신경망 확신도 연구와 확률예측 보정 연구는 높은 정확도나 높은 confidence가 보정된 확률을 보장하지 않음을 보여준다. 현재 BrainCore의 유한 가설 집합 평가는 후보를 분류하지만 확률을 부여하거나 승자를 선택하지 않는다. 이 경계를 유지하는 것이 타당하다.

Probabilistic circuits(확률 회로)는 확률분포와 추론을 DAG 형태로 표현하고, 특정 구조 조건 아래 일부 계산을 정확하고 효율적으로 수행한다. 이것은 향후 REA의 명시적 불확실성 표현을 위한 후보이지만, 지금 도입하기엔 확률적 변수·의존성·사전분포에 대한 검증된 의미 체계가 부족하다. 단순한 독립성 가정으로 증거를 곱하거나, 수학적 회로를 곧바로 ‘뇌’로 간주해서는 안 된다.

**권고 순서:** (1) 의사결정에 중요한 정보 선택을 작은 합성 실험으로 검증, (2) 확률 출력은 보정 가능한 평가 데이터가 생길 때까지 보류, (3) 확률 회로는 명시적 확률모형이 필요한 사용 사례가 생기면 작은 참조 구현으로 검증, (4) 인과 주장은 일반 상관관계 판단과 분리.

## REA BrainCore에 대한 기준선

이 문헌 검토는 REA의 목적을 바꾸지 않는다. 북극성은 REA가 자체 코드와 데이터에서 **인지, 기억, 학습, 계획·재계획, 증거 검증, 자기평가**를 발전시키는 것이다. 독립적인 범용 지능이라는 결론은 여기서 전제하지 않는다.

현재 확인된 코어에는 준비도·계획·사전 판단·판정과, 호출자가 준 유한 후보 집합을 비교하는 `evaluateHypothesisSetAfterPreparation`이 있다. 이 유한 집합 경로는 후보 상태를 분류하되 확률 점수를 내거나 승자를 고르지 않는다. 따라서 아래 제안은 현재 경로를 대체하지 않고, 이후의 제한된 실험 후보로 다룬다.

## 문헌별 검토

### 1. Probabilistic circuits: 구조를 통해 추론 가능성을 보장하기

Vergari 외, “A Compositional Atlas of Tractable Circuit Operations for Probabilistic Inference,” _NeurIPS 2021_.

저자들은 확률 회로 위의 합·곱·몫·거듭제곱·로그·지수 등의 연산을 다루고, 연산이 효율적으로 가능한 조건을 회로 구조의 충분조건으로 명시한다. 조건이 맞지 않을 때의 난해성 결과도 함께 다룬다. 유용한 설계 원칙은 **계산을 할 수 있다고 가정하지 않고, 표현 구조와 질의의 조건을 함께 검증하는 것**이다.

**REA에 적용될 수 있는 점**

- 이후 확률적 기억/가설 모형을 도입한다면, 변수와 의존성을 명시적으로 표현하고 어떤 주변확률·조건부확률 계산이 지원되는지 계약으로 제한할 수 있다.
- 작은 후보 모형에서 정확 추론과 전수 열거 결과를 대조하는 기준 구현을 만들 수 있다.

**한계와 주의점**

- 이 논문은 효율적인 확률 추론 표현에 관한 것이지, 인지·기억·계획 전체를 구현하는 설계도는 아니다.
- tractability는 특정 구조·질의 조건에 달려 있다. 임의의 REA 추론이 정확하거나 효율적이라는 보장은 없다.
- 독립성이나 인과 구조를 데이터 없이 선언하면 계산은 쉬워져도 결론은 틀릴 수 있다.

**판단:** 장기 후보. 지금 전체 코어에 확률 회로 계층을 추가하는 것보다, 실제 요구가 생겼을 때 작은 이산 모형으로 검증하는 편이 안전하다.

### 2. 확률 보정: confidence가 맞는 빈도와 일치하는지 확인하기

Guo 외, “On Calibration of Modern Neural Networks,” _ICML / PMLR 70_, 2017; Dimitriadis, Gneiting, Jordan, “Stable reliability diagrams for probabilistic classifiers,” _PNAS_ 118(8), 2021.

Guo 외는 현대 신경망이 높은 정확도를 보여도 확률 confidence가 잘 보정되지 않을 수 있음을 보고했고, 특정 데이터셋들에서 temperature scaling이 유용한 사후 보정법임을 실험했다. PNAS의 CORP 연구는 예측 확률에 해당하는 사건 빈도를 비교하는 신뢰도 도표를 제시하고, 전통적인 임의 구간 나누기의 불안정성을 줄이는 일관적·재현 가능한 방법 및 불확실성 정량화를 다룬다.

**REA에 적용될 수 있는 점**

- 나중에 REA가 “이 주장이 맞을 확률 0.8” 같은 값을 내기 시작하면, 정확도만으로 그 값을 평가하지 않는다. 결과가 관측된 보류 데이터에서 예측확률 구간별 실제 빈도를 확인한다.
- Brier score 같은 적절한 확률 점수와 보정 진단을 함께 사용하고, 표본 수가 작을 때는 구간별 불확실성도 표시한다.
- 모델/데이터/문제 유형별 보정 상태를 나눠서 평가한다. 한 종류의 문제에서 얻은 보정을 다른 영역에 그대로 일반화하지 않는다.

**한계와 주의점**

- temperature scaling은 특정 분류 모델의 사후 보정 결과다. 이를 REA의 규칙 기반 판단에 그대로 이식할 근거는 없다.
- 소량의 합성 사례만으로 보정되었다고 주장할 수 없다. 반복 가능한 예측-결과 쌍과 독립 평가셋이 필요하다.

**판단:** 바로 적용할 것은 “확률 출력 금지” 자체가 아니라, **확률 출력을 허용하기 위한 평가 관문**이다. 현재의 후보 분류는 확률이 아니므로 그대로 유지하는 편이 좋다.

### 3. Bayesian active learning: 불확실성보다 결정에 필요한 정보 선택

Javdani 외, “Near Optimal Bayesian Active Learning for Decision Making,” _AISTATS / PMLR 33_, 2014.

이 연구는 불확실성을 무조건 줄이는 대신, 가설들이 속하는 겹치는 의사결정 구역을 고려해 관측할 검사를 고르는 문제를 다룬다. 목표는 가능한 가설 전체를 꼭 하나로 식별하는 게 아니라, 관측과 일치하는 가설들이 한 의사결정 구역에 모이도록 정보를 수집하는 것이다. 논문은 HEC 알고리즘과 특정 조건 아래의 이론적 보장을 제시한다.

**REA에 적용될 수 있는 점**

- 다음 질문/검사는 후보 간 차이를 많이 만드는가보다 **답에 따라 REA의 행동·권고가 달라지는가**를 기준으로 우선순위를 정할 수 있다.
- 현재 유한 후보 평가기와 연결되는 가장 작은 실험은 후보 가설→결정 구역 매핑과, 각 질문의 가능한 결과→후보 집합 분할을 입력으로 받는 순수 함수다.
- 처음엔 합성 테스트에서 사전확률·검사 결과 모형·검사 비용을 명시하고, 결정 중심 선택을 엔트로피 감소 기준 및 작은 문제의 전수 최적 정책과 비교한다.

**한계와 주의점**

- 논문은 Bayesian 설정을 가정한다. 사전확률·검사 결과 가능도·결정 구역이 근거 없이 정해지면 이론적 보장은 REA에 이전되지 않는다.
- REA의 현재 코어가 증거를 외부에서 직접 수집한다는 뜻은 아니다. 최초 실험은 이미 주어진 후보 질문/검사들 중 하나를 고르는 시뮬레이션으로 제한한다.

**판단:** 문헌에서 당장 가장 직접적으로 검증할 가치가 있는 설계 아이디어. 단, 논문 알고리즘을 그대로 복제하기보다 작은 유한 문제에서 목표와 기준선을 분명히 하는 것이 우선이다.

### 4. Kahneman·Tversky: 사람의 불확실성 판단은 규범적 확률 계산과 다를 수 있음

Tversky & Kahneman, “Judgment under Uncertainty: Heuristics and Biases,” _Science_ 185(4157), 1974; Kahneman의 2002년 경제과학상 공식 설명.

1974년 논문은 대표성, 가용성, 기준점 조정 등 불확실성 판단의 휴리스틱을 기술한다. 노벨 공식 자료는 Kahneman의 기여를 심리학적 연구를 경제학에 통합하고, 인간의 판단과 결정이 불확실성 아래에서 표준 경제이론 및 기초 확률 원리와 체계적으로 달라질 수 있음을 보인 것으로 요약한다.

**REA에 적용될 수 있는 점**

- 이를 REA의 알고리즘 사양으로 가져오는 대신, 평가 사례의 오류 유형 목록으로 사용한다: 기저율 무시, 표본이 작을 때 과신, 최근/두드러진 사례 과대평가, 첫 수치에 끌리는 앵커링, 그럴듯함을 정확도와 혼동.
- 현재의 합성 known-answer 평가에 각각의 반례를 추가할 수 있다. 예를 들어 같은 설명의 표현만 바꿔 판정이 뒤집히지 않는지, 기저율과 개별 사례가 충돌할 때 근거를 따로 비교하는지 테스트한다.

**한계와 주의점**

- 인간 편향 연구는 어떤 알고리즘이 정답인지 직접 증명하지 않는다.
- 인간의 휴리스틱과 REA 코드의 오류는 같은 현상이라고 가정할 수 없다. 항목은 재현 가능한 테스트로 재구성되어야 한다.

**판단:** 테스트 설계에 유용한 실패 모드 목록. 수학적 추론 엔진의 대체재가 아니다.

### 5. 인과 추론: 연관성과 인과 효과를 분리하고 가정·대상 범위를 밝히기

2021년 경제과학상은 David Card의 노동경제학 실증 연구와 Joshua Angrist·Guido Imbens의 인과관계 분석 방법론 기여를 인정했다. Nobel 공식 배경 자료는 자연실험과 도구변수 설정에서 어떤 인과 결론을 낼 수 있는지, 그리고 Angrist–Imbens 접근의 효과가 조건에 따라 전체 인구 효과가 아닌 순응자 집단의 local average treatment effect일 수 있음을 설명한다.

**REA에 적용될 수 있는 점**

- 향후 REA가 인과 주장을 평가한다면, 현재의 일반 후보 비교와 별도 계약이 필요하다: 처치/결과 정의, 비교·식별 설계, 필요한 가정, 대상 집단, 효과의 범위 및 식별 실패 사유를 기록한다.
- 상관관계 근거만으로 “원인” 판정을 내리지 않으며, 관찰자료로 인과 효과를 주장하는 경우 가정과 적용 모집단을 노출한다.

**한계와 주의점**

- 자연실험/도구변수 방법론은 설계와 가정에 의존한다. 이를 일반적인 사실 검증에 적용할 수 없다.
- 이것은 BrainCore가 현재 인과 추론 기능을 제공한다는 뜻이 아니다.

**판단:** 조건부 장기 요구. 인과 질문을 다루기 전까지는 구체적인 인과 알고리즘을 추가하지 않는다.

## 작은 검증 계획 제안

### 실험 A — 결정 중심 정보 선택 (최우선)

- 입력: 3~5개의 후보 가설, 후보별 의사결정 구역, 가능한 질문/검사, 질문별 결과 분할, 명시적 사전확률·비용.
- 합성 사례: 엔트로피는 크게 낮추지만 권고를 바꾸지 않는 검사와, 불확실성 감소는 작아도 행동 경계를 가르는 검사를 구성한다.
- 기준선: 균등/고정 순서, 엔트로피 감소 우선, 해당 소규모 문제의 전수 탐색 최적 정책.
- 지표: 올바른 결정 구역에 도달하기까지의 검사 수·비용, 최종 결정 오류, 근거가 부족할 때의 보류 여부.
- 통과 기준: 단순 케이스에서 기대한 선택을 하는지만 확인하며, 실사용의 일반 효용이나 외부 증거 탐색 능력을 주장하지 않는다.

### 실험 B — 확률 판단을 위한 보류 평가 자료 준비 (출력 변경은 하지 않음)

- 기록할 항목: 예측 시점의 값, 정확한 타깃/사건 정의, 결과 관측 시점, 출처/버전, 학습·평가 분리 정보.
- 나중에 충분한 실제 결과가 축적된 뒤 calibration diagram, Brier/log score, 표본 불확실성을 비교한다.
- 그 전에는 확률을 사후적으로 만들거나 임의 confidence를 붙이지 않는다. 현재 결과 분류 계약을 유지한다.

### 실험 C — 작은 확률 회로 기준 구현 (실제 사용 사례가 생길 때)

- 2~4개의 이산 변수로 구성한 작은 모형에서 회로 구조·독립성 가정을 명시한다.
- 주변확률/조건부확률 계산을 전수 열거와 대조한다. 지원하지 않는 구조나 질의는 오류 또는 명시적 미지원으로 반환한다.
- 이 실험은 수학적 정확성과 인터페이스 적합성만 평가하며 기억·학습·인지 능력의 증거로 과장하지 않는다.

### 실험 D — 판단 편향 실패모드 사례

- 기저율과 개별 사례 충돌, 동일 정보의 서술 변화, 표본 크기 변화, 앵커 숫자 변화, 가용성/최근성 변화의 최소 짝 사례를 만든다.
- 기대 결과를 고정하고 기존 known-answer harness에서 회귀 테스트한다. 이것은 인간 유사성 평가가 아니라 REA의 특정 오류 방지 테스트로 한정한다.

## 후속 실험 진행 상태

문헌 권고 중 첫 번째 항목을 고립된 합성 파일럿 `REA-BRAINCORE-DTS-0.1`로 구현했다. `selectDecisionFocusedTest`는 호출자가 명시한 가설 사전확률, 의사결정 구역, 검사 결과 가능도와 비용만 사용해 단일 검사를 선택한다. 이는 다단계 Bayesian active-learning 알고리즘을 구현하거나 실증적으로 검증한 것이 아니며, 기존 판단/후보 평가 경로에도 연결하지 않았다.

기본 합성 사례에서 더 많은 결과 엔트로피를 주는 “같은 행동 구역 안의 세부 구분” 검사 대신, 더 적은 엔트로피지만 행동 구역 경계를 가르는 검사를 선택하도록 확인했다. 결정 오류 감소가 비용 페널티보다 작거나 같은 경우에는 검사를 억지로 선택하지 않는다. prior/likelihood 입력은 검증하지만 외부 사실에 대한 확률 보정이나 진실도를 검증하지 않는다.

검증 결과: 코어 직접 테스트 **6개 파일, 31개 통과**; `npm run typecheck` 통과; `REA-BRAINCORE-KA-0.1` 합성 회귀 **12/12 통과**; 변경 파일의 Prettier 검사 통과. 이는 계약·수식의 결정적 합성 테스트이지 실제 정보 수집 효용, 일반 인지 능력, 혹은 probability calibration의 증거가 아니다.

실험 계약: [`arena-code/docs/DECISION_FOCUSED_TEST_SELECTION_EXPERIMENT_V0_1.md`](../../arena-code/docs/DECISION_FOCUSED_TEST_SELECTION_EXPERIMENT_V0_1.md). 코드: [`arena-code/src/brainCore/decisionTests.ts`](../../arena-code/src/brainCore/decisionTests.ts). 테스트: [`arena-code/tests/brainCoreDecisionTests.test.ts`](../../arena-code/tests/brainCoreDecisionTests.test.ts).

## 문헌 적용 범위 메모

“수학적 회로”는 여기서 확률분포와 추론 계산을 위한 **probabilistic circuits**로 해석했다. 이는 일반적인 신경망 회로나 인간 뇌의 물리적 회로를 뜻하지 않는다.

또한 NobelPrize.org의 FAQ에 따르면 수학 분야의 노벨상은 없고, 경제과학상은 1968년에 별도로 제정된 추모상이다. 따라서 Kahneman·Angrist·Imbens는 수학상 수상자가 아니라, 불확실성 판단·인과분석에 참고할 수 있는 경제과학상 수상자다. 문헌 권위는 수상 여부만으로 평가하지 않고, 논문·학술지·명시된 가정 및 재현 가능한 실험을 우선한다.

## 참고 문헌 및 공식 자료

1. Antonio Vergari, YooJung Choi, Anji Liu, Stefano Teso, Guy Van den Broeck. [“A Compositional Atlas of Tractable Circuit Operations for Probabilistic Inference,” NeurIPS 2021](https://proceedings.neurips.cc/paper/2021/hash/6e01383fd96a17ae51cc3e15447e7533-Abstract.html).
2. Chuan Guo, Geoff Pleiss, Yu Sun, Kilian Q. Weinberger. [“On Calibration of Modern Neural Networks,” ICML 2017 / PMLR 70](https://proceedings.mlr.press/v70/guo17a.html).
3. Timo Dimitriadis, Tilmann Gneiting, Alexander I. Jordan. [“Stable reliability diagrams for probabilistic classifiers,” PNAS 118(8), 2021](https://www.pnas.org/doi/10.1073/pnas.2016191118). DOI: 10.1073/pnas.2016191118.
4. Shervin Javdani, Yuxin Chen, Amin Karbasi, Andreas Krause, Drew Bagnell, Siddhartha Srinivasa. [“Near Optimal Bayesian Active Learning for Decision Making,” AISTATS 2014 / PMLR 33:430–438](https://proceedings.mlr.press/v33/javdani14.html).
5. Amos Tversky, Daniel Kahneman. [“Judgment under Uncertainty: Heuristics and Biases,” Science 185(4157), 1124–1131, 1974](https://doi.org/10.1126/science.185.4157.1124). DOI: 10.1126/science.185.4157.1124.
6. The Royal Swedish Academy of Sciences. [The Prize in Economic Sciences 2002: official press release](https://www.nobelprize.org/prizes/economic-sciences/2002/press-release/).
7. Nobel Prize Outreach. [The Prize in Economic Sciences 2021: popular science background](https://www.nobelprize.org/prizes/economic-sciences/2021/popular-information/).
8. Nobel Prize Outreach. [FAQ: prize categories and the absence of a mathematics Nobel Prize](https://www.nobelprize.org/frequently-asked-questions/).
