#!/usr/bin/env node
/**
 * fetch_futurechem.mjs — 30초 자동화: Naver에서 오늘 OHLCV 자동 수집 + 예측 검증
 * 사용: node scripts/fetch_futurechem.mjs            → 오늘(자동) 조회
 *       node scripts/fetch_futurechem.mjs 2026-10-27 → 특정일 조회
 *       node scripts/fetch_futurechem.mjs --tomorrow → 내일 예측 생성 (안 씀, 참고용)
 *
 * 원칙: 1개로 확정 금지. 매일 1파일 쌓여 진화.
 * 자동화: GitHub Actions 06:40 UTC (=15:40 KST, 장 마감 10분 후) 매일 실행
 */
import fs from "node:fs";
import path from "node:path";

const ITEM = "220100";
const PREDICTION = {
  at: "2026-10-26T18:50:00+09:00",
  base: 9230, // 2026-10-26 확정 종가 (api.stock.naver.com 9230, open 10200 high 10200 low 8710)
  scenarios: {
    A: { range: [8600, 9100], prob: 0.45, label: "눌림" },
    B: { range: [9100, 9600], prob: 0.30, label: "횡보" },
    C: { range: [9600, 10800], prob: 0.25, label: "상승" },
  },
  cal: 0.45,
};

function hitWhich(close) {
  for (const [k, v] of Object.entries(PREDICTION.scenarios)) {
    if (close >= v.range[0] && close <= v.range[1]) return k;
  }
  if (close < 8600) return "A_below";
  if (close > 10800) return "C_above";
  return "unknown";
}

async function fetchJson(url) {
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (REA Stock Evolution Tracker)",
      "Referer": "https://m.stock.naver.com/",
      Accept: "application/json",
    },
  });
  if (!res.ok) throw new Error(`fetch ${url} ${res.status}`);
  return res.json();
}

async function fetchDay(item = ITEM, dateStr) {
  // Naver chart API: 전체 일봉 중 해당 날짜 필터
  // /chart/domestic/item/220100/day?periodType=day returns [{localDate, closePrice, openPrice, highPrice, lowPrice, accumulatedTradingVolume}]
  const url = `https://api.stock.naver.com/chart/domestic/item/${item}/day?periodType=day`;
  const list = await fetchJson(url);
  const target = dateStr.replace(/-/g, "");
  const row = list.find((r) => r.localDate === target);
  if (!row) throw new Error(`No data for ${dateStr} (장 휴장 또는 아직 집계 전). 최신: ${list[0]?.localDate}`);
  return row;
}

async function fetchBasic(item = ITEM) {
  // 실시간 기본 정보 (시가/종가/외인 등)
  const url = `https://m.stock.naver.com/api/stock/${item}/basic`;
  return fetchJson(url);
}

function _ymdKST(d = new Date()) {
  // KST 기준 YYYY-MM-DD
  const kst = new Date(d.getTime() + 9 * 60 * 60 * 1000);
  const _iso = kst.toISOString().slice(0, 10);
  // 실제로는 KST 날짜를 그대로
  const _off = new Date().getTimezoneOffset();
  // 간단: UTC+9 변환
  const utc = new Date(d);
  utc.setHours(utc.getHours() + 9);
  return utc.toISOString().slice(0, 10).replace(/-/g, "-");
  // 위 로직은 복잡하니 ISO KST로 직접
}

function kstDateStr(dateInput) {
  if (dateInput && /^\d{4}-\d{2}-\d{2}$/.test(dateInput)) return dateInput;
  // KST 오늘
  const now = new Date();
  const kst = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Seoul" }));
  return `${kst.getFullYear()}-${String(kst.getMonth() + 1).padStart(2, "0")}-${String(kst.getDate()).padStart(2, "0")}`;
}

async function main() {
  const arg = process.argv[2];
  const isTomorrow = arg === "--tomorrow";
  const dateStr = isTomorrow ? null : kstDateStr(arg);

  if (isTomorrow) {
    console.log("내일 예측 생성은 아직 미구현 — 수동 예측 JSON을 유지하세요. baseline은 2026-10-26 9230 기준입니다.");
    return;
  }

  console.log(`📡 Fetching ${ITEM} for ${dateStr} (KST)...`);
  const row = await fetchDay(ITEM, dateStr);
  const basic = await fetchBasic(ITEM).catch(() => null);

  const open = Math.round(row.openPrice);
  const high = Math.round(row.highPrice);
  const low = Math.round(row.lowPrice);
  const close = Math.round(row.closePrice);
  const volume = row.accumulatedTradingVolume;
  const foreignRate = basic?.foreignRetentionRate ?? row.foreignRetentionRate ?? null;

  const hit = hitWhich(close);
  const delta = close - PREDICTION.base;
  const deltaPct = ((delta / PREDICTION.base) * 100).toFixed(2) + "%";

  const isBaselineDay = dateStr === "2026-10-26";
  // baseline은 예측 기준일이므로 result 없음, 오늘 이후부터 검증
  const record = isBaselineDay
    ? {
        date: dateStr,
        verified_at: new Date().toISOString(),
        source: "api.stock.naver.com/chart/domestic/item/220100/day + m.stock.naver.com/api/stock/220100/basic",
        stock: `퓨쳐켐 ${ITEM} KOSDAQ`,
        ohlcv: { open, high, low, close, volume, amount: null, market_cap: basic ? undefined : undefined, prev_close: null, foreignRetentionRate: foreignRate },
        orderbook_snapshot: {
          note: "자동 수집 1차: OHLCV만. OIB/체결강도/호가 10호가는 Level2 API 연결 후 추가 (마하세븐 3기준)",
          high_low_story: `시가 ${open} → 고가 ${high} → 저가 ${low} → 종가 ${close} = ${high === row.openPrice ? "갭상승 후 고가=시가" : ""} ${close > open ? "양봉" : close < open ? "음봉" : "보합"}`,
        },
        factors: {
          clinical: { event: "FC705 ORR 38.9% 10/23 공시 이후", impact: hit === "C" ? "지속" : hit === "A" ? "차익실현" : "관망", evidence: "예측 대비 실제 움직임으로 판정" },
          volume_type: volume > 3000000 ? "급증 유지" : volume > 1000000 ? "보통" : "감소",
          foreign_rate: foreignRate,
          note: "업종/공시 추가 팩터는 수동 보완 가능 — 매일 5점(갭/초반/고가/눌림/종가) 로그 권장",
        },
        our_prediction: { ...PREDICTION },
        result: null,
        note: "기준일(베이스라인) — 예측 검증 대상 아님. 내일(2026-10-27)부터 hit 판정.",
        disclaimer: "교육·테스트용, 투자 권유 아님",
      }
    : {
        date: dateStr,
        verified_at: new Date().toISOString(),
        source: "api.stock.naver.com/chart/domestic/item/220100/day",
        stock: `퓨쳐켐 ${ITEM} KOSDAQ`,
        ohlcv: { open, high, low, close, volume, foreignRetentionRate: foreignRate },
        orderbook_snapshot: {
          high_low_story: `시가 ${open} → 고가 ${high} → 저가 ${low} → 종가 ${close}`,
        },
        factors: {
          note: "자동 1차 수집. clinical/sector/flow는 다음 버전에서 크롤 추가",
          foreign_rate: foreignRate,
        },
        our_prediction: { ...PREDICTION, base: PREDICTION.base, note: "2026-10-26 18:50 구간예측 [추정, cal 0.45]" },
        result: {
          actual_close: close,
          hit, // A/B/C
          hit_label: PREDICTION.scenarios[hit]?.label ?? hit,
          delta,
          delta_pct: deltaPct,
          expected_hit: hit,
          // 5점 움직임 요약
          movement_5p: {
            gap: open - PREDICTION.base, // 전일 종가 9230 대비 갭
            intraday_high: high,
            intraday_low: low,
            close,
            volume,
            story: `갭 ${open - PREDICTION.base > 0 ? "+" : ""}${open - PREDICTION.base} → 고가 ${high} → 저가 ${low} → 종가 ${close}`,
          },
        },
        evolution_delta: {
          before_cal: PREDICTION.cal,
          hit_correct: hit ? `${hit} 적중` : "미적중",
          next_lesson: hit === "A" ? "눌림 적중 — 차익실현 압력이 예상대로. volume-maha ‘눌림형’ 가중 +1" : hit === "B" ? "횡보 적중 — 관망, 추격매수 지속 여부 확인" : hit === "C" ? "상승 적중 — 돌파형 유지" : "범위 밖 — 예측 범위 재조정 필요",
          note: "이 파일이 7개 쌓이면 evolve.ts가 calibration(예측확률 vs 실제 적중률) 계산해 EXPERIENCE 생성",
        },
        disclaimer: "교육·테스트용, 투자 권유 아님",
      };

  const outDir = path.resolve("data/stock-evolution");
  fs.mkdirSync(outDir, { recursive: true });
  const filename = isBaselineDay
    ? `futurechem-${dateStr}-baseline.json`
    : `futurechem-${dateStr}.json`;
  // 기존 2026-10-26-baseline.json과 이름 맞추기 (호환)
  const altName = dateStr === "2026-10-26" ? "futurechem-2026-10-26-baseline.json" : filename;
  const outPath = path.join(outDir, altName);
  const legacyPath = path.join(outDir, `futurechem-${dateStr}.json`);

  // 10-26은 두 이름 모두 유지 (기존 baseline 호환)
  fs.writeFileSync(outPath, JSON.stringify(record, null, 2), "utf-8");
  if (dateStr === "2026-10-26" && outPath.endsWith("-baseline.json")) {
    // legacy도 갱신
    try { fs.writeFileSync(legacyPath, JSON.stringify(record, null, 2), "utf-8"); } catch {}
  }

  console.log(`✅ 저장: ${outPath}`);
  console.log(`   OHLCV: ${open} / ${high} / ${low} / ${close} vol ${volume} 외인 ${foreignRate ?? "-"}%`);
  if (!isBaselineDay) {
    console.log(`   예측 9210 기준 A(8600-9100 45%) B(9100-9600 30%) C(9600-10800 25%) [추정]`);
    console.log(`   결과: ${close} → ${hit} (${PREDICTION.scenarios[hit]?.label ?? hit}) ${delta > 0 ? "+" : ""}${delta} (${deltaPct})`);
    console.log(`   5점: 갭 ${open - PREDICTION.base} | 고가 ${high} | 저가 ${low} | 종가 ${close}`);
    console.log(`   다음: 이 파일 7개 쌓이면 진화 천재가 calibration 보정 → EXPERIENCE 생성`);
  } else {
    console.log(`   기준일: 예측 검증 제외, 내일부터 hit 판정. 실제 9230으로 보정 (기존 9210→9230, 오차 20원 0.22%)`);
  }

  // baseline 보정 알림 (10-26은 갱신)
  if (dateStr === "2026-10-26") {
    const oldBaseline = "data/stock-evolution/futurechem-2026-10-26-baseline.json";
    console.log(`   baseline 보정: ${oldBaseline} 갱신 (close 9210→9230, open 9470→10200, high 10770→10200)`);
  }
}

main().catch((e) => {
  console.error("❌ fetch 실패:", e.message);
  console.error(e.stack);
  process.exit(1);
});
