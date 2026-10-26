# 내일 30초 자동화 가이드

> **너 할 일: 0초 (자동) / 실패 시 30초 (수동)**

## 자동 (권장)

로컬 또는 GitHub Actions에서 매일 15:40 KST에 1줄:

```bash
node scripts/fetch_futurechem.mjs
# 오늘(2026-10-27)이면 futurechem-2026-10-27.json 생성, A/B/C 적중 + 5점(갭/고가/저가/종가/거래량) 자동 기록
```

GitHub Actions 자동화는 권한 제한으로 이 브랜치에 workflow 파일이 제외됨.  
**수동 추가 방법 (main에 직접):**

1. GitHub 웹 → TOOAl/rea → Settings → Actions → General → **Workflow permissions → Read and write** 체크
2. `.github/workflows/stock-evolution-daily.yml` 파일을 main에 생성 (내용은 `scripts/fetch_futurechem.mjs` 주석 참고)
3. 매일 06:40 UTC (=15:40 KST) 자동 실행, 또는 Actions 탭에서 수동 실행

## 수동 (네트워크 차단 시 폴백)

```bash
# Naver API가 막히면(로컬 샌드박스) 직접 5개 숫자 입력 — 기존 방식과 동일, 30초
node scripts/verify_futurechem.mjs 9300 10500 8900 9300 3800000
# m.stock.naver.com/domestic/stock/220100/total 에서 시가/고가/저가/종가/거래량 5개 복사
```

## 오늘 보정

- 2026-10-26 기준가: **9230** (Npay 최종 20:09, 기존 9210→ 20원 보정)
- 시가 9470→10200, 고가 10770→10200 (장중 속보→최종 확정 차이)
- 예측 A/B/C 구간은 9230 기준으로 동일 (8600-9100 / 9100-9600 / 9600-10800)
