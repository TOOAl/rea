# AI 두뇌 — Stage 3 (하이브리드)

TypeScript 오케스트레이터 + Python 외부 에이전트 마이크로서비스.

구현된 핵심:
1. **신뢰도 모델 + 상충 adjudicator (L3b)** — 상충 근거를 차단하는 대신 어느 쪽이 더 옳은지 판단
2. **추론 실패 사례 저장·학습** — 신뢰도 낮은 쪽이 실제로 옳았다면 사례를 저장하고 정확도 향상 자료로 활용
3. **전략 레지스트리(사고 회로 흡수)** — direct/cot/reflect/consistency 플러그인 + 평가셋 A/B
4. **L3c 전제-결론 논리 모순** — 과잉 주장(유보 근거→단정) 차단 + 인과 전제의 근거 존재 검증
5. **L3d 과거 결론 불일치** — 장기 기억과 대조, 실증/신뢰도 우위로만 대체(감사 기록), 아니면 보류

## 구조

```
ts/src/
  orchestrator.ts   판단 루프 (전략 선택 → 추론 → 다층 검증 → 보류/학습)
  credibility.ts    신뢰도 점수 = prior(출처) x level(근거 등급) x learned(검증 이력)
  verifier.ts       L1 → L3a → L3b → L3c → L3d → L2 (최단 비용 우선, 실패 시 상위 생략)
  conclusions.ts    장기 결론 기억 (감사 가능한 supersede 이력)
  strategies.ts     전략 레지스트리 (epsilon-greedy, 승률 기반 선택)
  failures.ts       추론 실패 사례 저장소 ([실패사례] 주입 + 실증 우선 판정)
  adjudications.ts  상충 판정 감사 로그
  ground-truth.ts   실측 피드백 CLI — 판단 확인/반박 시 학습 반영
py/app.py           외부 에이전트: /collect /score /reflect
data/corpus.json    근거 코퍼스 (TS/Python 공유 단일 진실 원천)
```

## 검증 레이어

| 레이어 | 내용 | 비용 |
|---|---|---|
| L1 | 스키마·인용 해결·신뢰도 범위 결정적 게이트 | 무료 |
| L3a | 주장별 근거 지지 판정 (judge) | 유료 |
| L3b | 상충 adjudication — 신뢰도 점수/실패사례/판단 근거로 승자 결정 | 무료+판단 |
| L3c | 전제-결론 논리 — 과잉 주장(유보→단정) + 인과 전제 근거 검증 | 무료+판단 |
| L3d | 과거 결론과의 정합 — 주장 단위 연도 충돌 감지, 실증/우위로만 대체 | 무료 |
| L2 | 독립 judge의 전체 판정 | 유료 |

미구현 검사(임베딩 근거 대조, 다중 에이전트 토론)는 `skipped`에 명시해 누락을 은폐하지 않습니다.

## 실행

```bash
python3 py/app.py   # 터미널 1 (포트 8787)

# 터미널 2 (mock provider — Ollama 불필요)
node --experimental-strip-types ts/src/run.ts "대공황은 1939년경에 끝났다고 보는데, 뉴딜 때문인가요?" direct
node --experimental-strip-types ts/src/run.ts "대공황이 끝났다는 견해의 시점을 확정해서 알려줘" direct
node --experimental-strip-types ts/src/eval.ts --ab

# 실측 피드백 (판정 반박 → 실패 사례 학습)
node --experimental-strip-types ts/src/ground-truth.ts "제로 프로젝트는 언제 종료되었나요?" ev-zp-2 "내부 기록상 2024년 종료 확인"
```

## 시연 시나리오

### E1. L3c 인과 전제 (대공황 종료 원인)
초안: "뉴딜 정책 덕분에 대공황이 끝났습니다" → 인과 전제가 근거에 없음 → 차단 →
재시도: "종료 원인은 수집된 근거로 확인할 수 없습니다" + unknown 선언 → 통과.

### E2. L3c 과잉 주장 (종료 시점 확정)
유보적 근거("~라고 본다")를 "1939년에 끝났습니다"로 단정 → 차단 →
"1939년경에 끝났다고 보는 견해가 있습니다" + 학설 차이 unknown → 통과.

### E3. L3d 결론 대체 (제로 프로젝트)
1) 2021년 종료 결론 → 장기 기억 저장  2) ground-truth 반박 → 실패 사례 기록
3) 재실행 → 2024년 결론이 과거 결론과 불일치 감지 → 실패사례 실증으로 **감사 가능한 대체**.

### E4. L3d 해소 불가 → 보류
가상의 과거 결론(1935년, 동일 강도 근거)과 새 결론(1929년) 충돌 —
우위 근거 부족 → **fail-closed 보류** ("무음 전환 금지").

## Ollama 실사용

```bash
ollama pull llama3.1 llama3.2:1b
BRAIN_PROVIDER=ollama node --experimental-strip-types ts/src/run.ts "..."
```
