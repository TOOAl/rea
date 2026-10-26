# 2회 자동화 가이드 — 08:00(美→韓) + 15:30(韓 마감)

> **너 할 일: 0초 (자동) / 실패 시 30초 (수동) — 한국은 미국 영향을 받는다**

## 왜 2번인가

- **08:00 KST (23:00 UTC) — 韓 개장 전**: 미국 전일 마감(EST 16:00 = KST 06:00)이 모두 반영된 시각. S&P500·NASDAQ·SOX(필라델피아 반도체) 등락으로 **오늘 한국 반도체 심리**를 선행 판단.
  - SOX와 삼성전자는 상관계수 0.7~0.8 (2023-2025). SOX -1% → 삼성 -0.7% 경향, 그러나 HBM 호황기에는 디커플링 발생 (2025 Q3 증명)
- **15:30 KST (06:30 UTC) — 韓 마감 직후**: 한국 결과가 확정된 시각. 미국 개장(EST 09:30 = KST 23:30) 8시간 전이라 **S&P 선물/프리마켓과 비교해 오버나이트 리스크** 판단.

두 파일을 하루 2개씩 쌓으면 두뇌가 `美→韓` vs `韓→美` 전이확률을 학습합니다. 예: “SOX +2%일 때 삼성 다음날 +1.5% 확률 68%” 같은 EXPERIENCE가 7일(14개 파일) 뒤 생성.

## 자동 (권장) — GitHub Actions가 0초로 수집

```bash
# 로컬에서도 수동 테스트 가능
node scripts/fetch_samsung.mjs           # 현재 시각(KST)으로 슬롯 자동 판정
node scripts/fetch_samsung.mjs --morning  # 08:00 슬롯 강제
node scripts/fetch_samsung.mjs --afternoon # 15:30 슬롯 강제
# 결과: data/stock-evolution/samsung-YYYY-MM-DD-08-00.json (美 반영)
#      data/stock-evolution/samsung-YYYY-MM-DD-15-30.json (韓 마감)
```

**GitHub Actions 자동화**는 이 브랜치에 이미 포함됨: `.github/workflows/stock-evolution-daily.yml`

- 스케줄: `0 23 * * *` (=08:00 KST) + `30 6 * * *` (=15:30 KST), 매일 자동
- 수동 실행: GitHub → Actions → `stock-evolution-daily` → Run workflow → morning/afternoon 선택
- 권한: Settings → Actions → General → **Workflow permissions → Read and write** 체크 필요
- 기존 퓨쳐켐(`fetch_futurechem.mjs`)도 호환 유지 — 같이 수집됨

## 수동 (네트워크 차단 시 폴백) — 30초

샌드박스에서는 `api.stock.naver.com`이 차단되어 자동 수집이 실패하는 것이 정상입니다.

```bash
# 삼성전자 5개 숫자 직접 입력 (m.stock.naver.com/domestic/stock/005930/total 에서 복사)
node scripts/fetch_samsung.mjs --manual 82000 84500 81500 83000 15200000
# 시가 고가 저가 종가 거래량 순
# 동일하게 퓨쳐켐도 가능:
node scripts/fetch_futurechem.mjs  # 또는
node scripts/verify_futurechem.mjs 9300 10500 8900 9300 3800000
```

## 오늘 보정 (2026-10-26 기준)

- 삼성 기준가: 2025 Q4 93.8조/20.07조 사상 최대 이후 2026 Q1 57.2조 분기 최대 경신 — 이제는 **HBM이 전사 이익의 40% 이상**을 설명
- 퓨쳐켐 기준가: **9230** (Npay 최종 20:09, 기존 9210→20원 보정) — 시가 9470→10200, 고가 10770→10200 보정, A/B/C 구간 동일

## 파일 구조

```
data/stock-evolution/
  samsung-2026-10-27-08-00.json  # 美 마감 반영, 韓 개장 전 심리
  samsung-2026-10-27-15-30.json  # 韓 마감 확정, 美 선물 비교
  futurechem-2026-10-27.json     # 호환 유지
```

각 파일은 `ohlcv` + `us_market` + `cross_market_read` 3개 섹션으로 구성되어 두뇌의 추론 향상에 직접 사용됩니다.
