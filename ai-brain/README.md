# AI 두뇌 — Stage 2 (하이브리드)

TypeScript 오케스트레이터 + Python 외부 에이전트 마이크로서비스.

Stage 2에서 추가된 핵심:
1. **신뢰도 모델 + 상충 adjudicator** — 상충 근거를 차단하는 대신 어느 쪽이 더 옳은지 판단
2. **추론 실패 사례 저장·학습** — 신뢰도 낮은 쪽이 실제로 옳았다면 사례를 저장하고 정확도 향상 자료로 활용
3. **전략 레지스트리(사고 회로 흡수)** — direct/cot/reflect/consistency 플러그인 + 평가셋 A/B

## 구조

```
ts/src/
  orchestrator.ts   판단 루프 (전략 선택 → 추론 → 다층 검증 → 보류/학습)
  credibility.ts    신뢰도 점수 = prior(출처) x level(근거 등급) x learned(검증 이력)
  verifier.ts       L1 결정적 게이트 → L3a 주장 지지 → L3b 상충 adjudicator → L2 독립 judge
  strategies.ts     전략 레지스트리 (epsilon-greedy, 승률 기반 선택)
  failures.ts       추론 실패 사례 저장소 ([실패사례] 주입 + adjudicator 실증 우선)
  adjudications.ts  상충 판정 감사 로그 (ground-truth 대조용)
  ground-truth.ts   실측 피드백 CLI — 판단 확인/반박 시 학습 반영
py/app.py           외부 에이전트: /collect /score /reflect
data/corpus.json    근거 코퍼스 (TS/Python 공유 단일 진실 원천)
```

## 실행

```bash
python3 py/app.py   # 터미널 1 (포트 8787)

# 터미널 2 (mock provider — Ollama 불필요)
node --experimental-strip-types ts/src/run.ts "미국 대공황에 대해 설명해줘"
node --experimental-strip-types ts/src/run.ts "제로 프로젝트는 언제 종료되었나요?"
node --experimental-strip-types ts/src/eval.ts --ab   # 전략 A/B 비교

# 실측 피드백 (판정 반박 → 실패 사례 학습)
node --experimental-strip-types ts/src/ground-truth.ts "제로 프로젝트는 언제 종료되었나요?" ev-zp-2 "내부 기록상 2024년 종료 확인"
```

## 시연 시나리오

### A. 상충 adjudication (미국 대공황)
1. 초안이 ev-gd-1(1929, encyclopedia)과 ev-gd-3(1935, low-quality-blog)를 동시에 인용
2. L3b가 신뢰도 점수(0.90 vs 0.30)로 승자 ev-gd-1 판정 → 패배 근거 제거를 지시
3. 재시도: 1929년 기준으로 재작성, 1935년 주장은 배제 unknown으로 선언 → 통과 + adjudicated 경고

### B. 실패 사례 학습 (제로 프로젝트 — 가상)
1. ev-zp-1(2021, public-wiki 0.8) vs ev-zp-2(2024, insider-blog 0.4) → 2021 쪽 판정
2. ground-truth: "실제는 2024년, 블로그가 옳았다" → **추론 실패 사례 기록** + 출처 신뢰도 갱신
3. 재실행: [실패사례] 주입 + 실패사례가 adjudicator에 실증 우선 → 2024년으로 수정, 상충 사실 unknown

### C. fail-closed
근거 없는 질문은 2회 시도 후 보류(withheld) — 결론 미반환 + 실패 이유 명시.

## Ollama 실사용

```bash
ollama pull llama3.1 llama3.2:1b
BRAIN_PROVIDER=ollama node --experimental-strip-types ts/src/run.ts "..."
```

## 다음 단계 (Stage 3)

L3c 전제-결론 논리 모순 · L3d 과거 결론과의 불일치 (장기 기억 대조).
