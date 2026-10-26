# Stock Evolution Tracker — 퓨쳐켐으로 배우는 진화

> **원칙: 1개로 확정 금지, 쌓여서 정확해짐.**  
> `REA Evidence` — 사실/애매/추정을 나누고, 증거 ID와 한계를 남긴다.

## 무엇을 쌓나 (종가 x, 움직임 o)

매일 1개 파일: `futurechem-YYYY-MM-DD.json`

```json
{
  "date": "2026-10-27",
  "verified_at": "2026-10-27T15:35:00+09:00",
  "source": "Npay 증권 m.stock.naver.com/domestic/stock/220100/total",
  "ohlcv": { "open": 9470, "high": 10770, "low": 8710, "close": 9210, "volume": 4540007, "amount": 45210810000 },
  "orderbook_snapshot": {
    "note": "선택: 09:55 총매도잔량/총매수잔량, OIB, 체결강도 (가능하면 Level2 10호가 캡처)",
    "oib": 0.32,
    "strength": 184,
    "vi_triggered": false
  },
  "factors": {
    "clinical": { "event": "FC705 추가공시 없음", "impact": "중립", "evidence": "공시 없음" },
    "sector": { "kosdaq_bio": "-1.05%", "note": "업종 하락 속 퓨쳐켐 +2.45% = 상대강세" },
    "flow": { "foreign_rate": "4.10%", "delta": "+0.0%p [추정]" },
    "volume_type": "돌파형 급증 (고가 경신+452억 동반)"
  },
  "our_prediction": {
    "at": "2026-10-26T18:50:00+09:00",
    "close_base": 9210,
    "scenarios": {
      "A_눌림": { "range": [8600, 9100], "prob": 0.45 },
      "B_횡보": { "range": [9100, 9600], "prob": 0.30 },
      "C_상승": { "range": [9600, 10800], "prob": 0.25 }
    },
    "calibration": 0.45,
    "note": "[추정] 구간 예측, 점 예측 아님"
  },
  "result": {
    "actual_close": 9300,
    "hit": "B",
    "high_low_story": "시가 9,300 갭상승→10,500 터치→9,000 눌림→9,300 마감 = 돌파 후 힘겨루기 눌림목",
    "factor_review": "임상 추가 없음에도 거래량 380만 유지 → 추격매수 지속, OIB +0.4가 A 하락 방어"
  },
  "evolution_delta": {
    "before": "premise-error-guardian 93, economics-nobel 88",
    "after": "economics-nobel 88→89 (+1, 유인 지도 적중), volume-maha 보정 +2",
    "lesson": "고가 10,770 찍은 다음날은 종가보다 저가 방어가 중요 — 다음 예측에 ‘저가 8,700 지지’ 가중"
  }
}
```

## 5단계 움직임 추적 (종가 1점 → 움직임 5점)

1. **갭 (전일 애프터 9,210 → 시가)** — 하룻밤 기대가 식었나
2. **초반 추격 (시가 → 10시, 342만주)** — 마하세븐 3기준 중 추격매수 확인
3. **고가 도전 (10,770)** — 돌파형 급증인가, VI 앞인가
4. **눌림 (저가 8,710)** — 4특징(힘겨루기·순체결급증·갭확대·불안) 중 몇 개 해당
5. **종가 합의 (9,210)** — 최종 힘의 균형

→ 이 5점을 매일 찍어야 “어디서 왜 꺾였는지”가 보인다. 종가만 보면 모른다.

## 진화 천재가 배우는 법

- 매일 1파일 쌓임 → `evolve.ts`가 주간에 `accuracy = hit_rate`, `calibration = 우리가 말한 확률과 실제 적중률 차이` 계산
- 예: 우리가 A 45%라 했는데 10번 중 3번만 A면 과신 → 다음엔 45%→35%로 낮춤
- 3주 연속 잘 맞춘 요인은 `EXPERIENCE_*.md`로 승격, 다음 퓨쳐켐 분석 때 먼저 호출

## 오늘(2026-10-26) 기준점

- 기준가: **9,210 (애프터 18:41)** [Npay]
- 예측: A 45% (8,600-9,100) / B 30% (9,100-9,600) / C 25% (9,600-10,800) [추정, cal 0.45]
- 내일 15:35에 위 JSON을 채워 넣고, 진화 천재가 점수를 깎거나 올림

## 다음 종목 확장

같은 스키마로 `samsung-005930-YYYY-MM-DD.json` 추가 가능. 20개 쌓이면 “바이오 임상주 패턴 사전” EXPERIENCE 생성.
