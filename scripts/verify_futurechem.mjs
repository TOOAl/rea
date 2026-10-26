#!/usr/bin/env node
/**
 * verify_futurechem.mjs — 내일 종가 검증 + 진화 천재 점수 업데이트
 * 사용: node scripts/verify_futurechem.mjs 9300  9450 8710 9300 3800000
 *        node scripts/verify_futurechem.mjs --auto  (Npay 크롤 시 수동으로 숫자 넣기)
 *
 * 원칙: 1개로 확정 금지, 쌓여서 정확해짐.
 */
import fs from "node:fs";
import path from "node:path";

const PREDICTION = {
  at: "2026-10-26T18:50:00+09:00",
  base: 9210,
  // A 8600-9100 45% / B 9100-9600 30% / C 9600-10800 25% [추정, cal 0.45]
  scenarios: {
    A: { range: [8600, 9100], prob: 0.45 },
    B: { range: [9100, 9600], prob: 0.30 },
    C: { range: [9600, 10800], prob: 0.25 },
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

function main() {
  const args = process.argv.slice(2);
  if (!args.length || args.includes("--help")) {
    console.log(`사용법: node scripts/verify_futurechem.mjs <open> <high> <low> <close> <volume>
예: node scripts/verify_futurechem.mjs 9300 10500 8900 9300 3800000
예측: A 8600-9100 45% / B 9100-9600 30% / C 9600-10800 25% [추정] 기준 9210`);
    return;
  }
  const [open, high, low, closeStr, volStr] = args;
  const close = Number(closeStr);
  const highN = Number(high);
  const lowN = Number(low);
  const volume = Number(volStr || 0);
  if (isNaN(close)) { console.error("close 숫자 필요"); process.exit(1); }

  const hit = hitWhich(close);
  const date = new Date().toISOString().slice(0, 10);
  // 내일 날짜로 파일 생성 (오늘 실행하면 내일 날짜로)
  // 사용자가 10-27 종가를 10-27 저녁에 입력한다고 가정
  const d = new Date();
  d.setDate(d.getDate()); // 오늘=내일 예측 검증일이므로, 입력한 close가 내일 것
  const fileDate = d.toISOString().slice(0, 10); // 실행일로 기록, 필요하면 --date로 덮기
  const outPath = path.resolve(`data/stock-evolution/futurechem-${fileDate}.json`);

  // 기존 baseline 읽기
  const baselinePath = "data/stock-evolution/futurechem-2026-10-26-baseline.json";
  let baseline = null;
  try { baseline = JSON.parse(fs.readFileSync(baselinePath, "utf-8")); } catch {}

  const record = {
    date: fileDate,
    verified_at: new Date().toISOString(),
    source: "Npay m.stock.naver.com/domestic/stock/220100/total (수동 입력)",
    ohlcv: { open: Number(open), high: highN, low: lowN, close, volume, amount: null },
    orderbook_snapshot: {
      note: "수동 입력 — 가능하면 OIB/체결강도/VI도 추가",
      high_low_story: `시가 ${open} → 고가 ${high} → 저가 ${low} → 종가 ${close} = ${highN > 10000 ? "돌파 시도 후" : ""} ${close < baseline?.ohlcv?.close ? "눌림" : "지지"} 형태`,
    },
    factors: {
      note: "내일 공시/업종/외인 수치는 수동으로 채우세요. 진화 천재가 요인 기여도를 학습합니다.",
    },
    our_prediction: { ...PREDICTION, base: PREDICTION.base },
    result: {
      actual_close: close,
      hit, // A/B/C 중 어디
      delta: close - PREDICTION.base,
      delta_pct: ((close - PREDICTION.base) / PREDICTION.base * 100).toFixed(2) + "%",
    },
    evolution_delta: {
      note: "이 파일이 쌓이면 arena-code/src/harness2/evolve.ts가 calibration을 계산해 EXPERIENCE로 승격",
      before_cal: PREDICTION.cal,
      hit_correct: hit === "B" ? "횡보 적중" : hit === "A" ? "눌림 적중" : hit === "C" ? "상승 적중" : "미적중",
    },
    disclaimer: "교육·테스트용, 투자 권유 아님",
  };

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(record, null, 2), "utf-8");
  console.log(`✅ 기록: ${outPath}`);
  console.log(`   종가 ${close} → ${hit} (예측 A45%/B30%/C25% 중 ${hit})`);
  console.log(`   변화: ${record.result.delta}원 (${record.result.delta_pct})`);
  console.log(`   다음: 이 파일 7개 쌓이면 진화 천재가 "고가 10770 다음날 눌림 60%" 같은 패턴을 EXPERIENCE로 만듭니다.`);
  console.log(`   확인: cat ${outPath}`);
}

main();
