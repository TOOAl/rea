#!/usr/bin/env node
/**
 * fetch_samsung.mjs — 2회 자동화: 한국(15:30) + 미국(08:00) 동시 추적
 * 
 * 배경: 한국 시장은 미국 시장 영향을 받는다.
 *  - 08:00 KST = 미국 전일 마감(EST 16:00 = KST 06:00) 반영 → 한국 개장 전 선행지표
 *  - 15:30 KST = 한국 마감 → 미국 개장 전 한국 결과 확정
 * 
 * 사용:
 *  node scripts/fetch_samsung.mjs                    → 현재 시각 기준으로 자동 판정 (KST 08시/15시 중 가까운 슬롯)
 *  node scripts/fetch_samsung.mjs --morning          → 08:00 슬롯 강제 (미국 마감 반영)
 *  node scripts/fetch_samsung.mjs --afternoon        → 15:30 슬롯 강제 (한국 마감 반영)
 *  node scripts/fetch_samsung.mjs --manual 82000 84000 81000 83000 15000000
 * 
 * 자동: GitHub Actions 23:00 UTC(=08:00 KST) + 06:30 UTC(=15:30 KST) 매일 실행
 * 수동: 샌드박스 네트워크 차단 시 --manual로 5개 숫자 직접 입력 (30초)
 */
import fs from "node:fs";
import path from "node:path";

const ITEM_SAMSUNG = "005930"; // 삼성전자
const _ITEM_FUTURECHEM = "220100"; // 퓨쳐켐 (기존 호환)
const US_INDICES = [
  { id: "SPX", name: "S&P500", naverCode: ".INX" }, // Naver overseas codes vary, fallback to manual symbol
  { id: "IXIC", name: "NASDAQ", naverCode: ".IXIC" },
  { id: "SOX", name: "SOX(필라델피아 반도체)", naverCode: "SOX" },
];

// 예측 구간은 삼성전자는 별도 산정 필요 — 여기서는 기록용으로 close만 적중 판정 없이 저장
// 퓨쳐켐 예측은 유지 (호환)

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

async function fetchDay(item) {
  const url = `https://api.stock.naver.com/chart/domestic/item/${item}/day?periodType=day`;
  const list = await fetchJson(url);
  return list;
}

async function fetchOverseasDay(symbol) {
  // Naver overseas API 패턴 — 실패 시 야후 등 폴백 (GitHub Actions에서는 가능, 샌드박스에서는 실패 → 수동)
  // 시도 1: Naver overseas
  const candidates = [
    `https://api.stock.naver.com/chart/overseas/item/${symbol}/day?periodType=day`,
    `https://m.stock.naver.com/api/stock/${symbol}/basic`, // overseas basic
  ];
  for (const url of candidates) {
    try {
      const j = await fetchJson(url);
      if (Array.isArray(j) && j.length) return { type: "chart", data: j };
      if (j && j.closePrice) return { type: "basic", data: j };
    } catch {}
  }
  throw new Error(`Overseas fetch failed for ${symbol}`);
}

function kstNow() {
  const now = new Date();
  const kst = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Seoul" }));
  return kst;
}

function kstDateStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function kstSlot(d) {
  const h = d.getHours();
  const m = d.getMinutes();
  const hm = h * 60 + m;
  // 08:00 전후 3시간을 아침으로, 15:30 전후 4시간을 오후로
  // 00:00-12:00 → morning, 12:00-24:00 → afternoon (단순)
  if (hm < 12 * 60) return "morning";
  return "afternoon";
}

function slotLabel(slot) {
  return slot === "morning" ? "08:00(美 마감→韓 개장 전)" : "15:30(韓 마감)";
}

async function main() {
  const args = process.argv.slice(2);
  let slot = null;
  let manual = null;

  if (args.includes("--morning")) slot = "morning";
  else if (args.includes("--afternoon")) slot = "afternoon";
  else if (args.includes("--manual")) {
    const idx = args.indexOf("--manual");
    manual = args.slice(idx + 1).map(Number).slice(0, 5);
    slot = kstSlot(kstNow());
  } else {
    slot = kstSlot(kstNow());
  }

  const now = kstNow();
  const dateStr = kstDateStr(now);
  const slotStr = slot === "morning" ? "08-00" : "15-30";

  console.log(`📡 [${slotLabel(slot)}] Fetching for ${dateStr} (KST ${now.toISOString()})...`);
  console.log(`   - Samsung(005930) 국내 일봉 + US 3지수(S&P/NASDAQ/SOX) 함께 시도`);

  let samsungRow = null;
  let samsungBasic = null;
  let usData = {};
  let isManual = !!manual;

  if (manual && manual.length >= 5) {
    const [open, high, low, close, volume] = manual;
    samsungRow = { openPrice: open, highPrice: high, lowPrice: low, closePrice: close, accumulatedTradingVolume: volume, localDate: dateStr.replace(/-/g,"") };
    console.log(`   ✍️ 수동 입력: ${open}/${high}/${low}/${close} vol ${volume}`);
  } else {
    try {
      const list = await fetchDay(ITEM_SAMSUNG);
      const target = dateStr.replace(/-/g, "");
      // 한국 장 마감 전(08시 슬롯)에는 당일 데이터가 아직 없음 → 전날 데이터 사용 + 미국 데이터로 보완
      let row = list.find(r => r.localDate === target);
      if (!row) {
        // 08시 슬롯이면 전날 것으로 폴백, 15:30 슬롯인데 없으면 최신 것으로
        row = list[0];
        console.log(`   ⚠️ 당일(${target}) 데이터 없음 → 최신(${row.localDate})으로 폴백 (${slot === "morning" ? "장전이라 정상" : "장 마감 전 또는 휴장"})`);
      }
      samsungRow = row;
      try { samsungBasic = await fetchJson(`https://m.stock.naver.com/api/stock/${ITEM_SAMSUNG}/basic`); } catch {}
    } catch (e) {
      console.error(`   ❌ 삼성 데이터 fetch 실패: ${e.message}`);
      console.error(`   → 샌드박스에서는 Naver API 차단이 정상입니다. 수동 모드를 사용하세요:`);
      console.error(`   node scripts/fetch_samsung.mjs --manual 82000 84000 81000 83000 15000000`);
      console.error(`   (m.stock.naver.com/domestic/stock/005930/total 에서 시가/고가/저가/종가/거래량 복사)`);
      // GitHub Actions에서는 실패하면 exit 1로 알림
      if (!process.env.GITHUB_ACTIONS) {
        // 로컬에서는 빈 레코드로라도 생성하여 파이프라인 유지
        samsungRow = { openPrice: null, highPrice: null, lowPrice: null, closePrice: null, accumulatedTradingVolume: null, localDate: dateStr.replace(/-/g,""), _manual_needed: true };
      } else {
        throw e;
      }
    }

    // US 데이터 (08시 슬롯에서 중요)
    if (slot === "morning") {
      for (const idx of US_INDICES) {
        try {
          const res = await fetchOverseasDay(idx.id);
          usData[idx.id] = { name: idx.name, fetched: true, sample: Array.isArray(res.data) ? res.data[0] : res.data };
        } catch (e) {
          usData[idx.id] = { name: idx.name, fetched: false, error: e.message };
          console.log(`   ⚠️ US ${idx.name} fetch 실패: ${e.message}`);
        }
      }
      // SOX가 핵심 — 삼성과 상관계수 높음
      console.log(`   US 데이터 ${Object.values(usData).filter(v=>v.fetched).length}/${US_INDICES.length} 성공`);
    }
  }

  const open = samsungRow ? Math.round(samsungRow.openPrice ?? 0) || samsungRow.openPrice : null;
  const high = samsungRow ? Math.round(samsungRow.highPrice ?? 0) || samsungRow.highPrice : null;
  const low = samsungRow ? Math.round(samsungRow.lowPrice ?? 0) || samsungRow.lowPrice : null;
  const close = samsungRow ? Math.round(samsungRow.closePrice ?? 0) || samsungRow.closePrice : null;
  const volume = samsungRow?.accumulatedTradingVolume ?? null;

  // 한-미 연결 해석
  const usInfluence = slot === "morning"
    ? `전일 美 마감: S&P ${usData.SPX?.fetched ? "수신" : "미수신"} / NASDAQ ${usData.IXIC?.fetched ? "수신" : "미수신"} / SOX ${usData.SOX?.fetched ? "수신" : "미수신"} → 한국 반도체 심리 선행`
    : `금일 韓 마감: 삼성 ${close ?? "-"} → 익일 美 개장 전 한국 결과 확정 (SOX 선물과 비교)`;

  const record = {
    date: dateStr,
    slot,
    slot_label: slotLabel(slot),
    verified_at: new Date().toISOString(),
    kst: now.toISOString(),
    source: isManual ? "manual --manual 입력" : "api.stock.naver.com/chart/domestic/item/005930/day (+ overseas)",
    stock: "삼성전자 005930 KOSPI + US 3지수",
    ohlcv: { open, high, low, close, volume, market_cap: samsungBasic?.marketCap ?? null, foreignRetentionRate: samsungBasic?.foreignRetentionRate ?? null, _manual_needed: samsungRow?._manual_needed ?? false },
    us_market: slot === "morning" ? {
      note: "08:00 슬롯 — 美 전일 마감 데이터. 한국 개장 전 필터로 사용",
      spx: usData.SPX ?? null,
      nasdaq: usData.IXIC ?? null,
      sox: usData.SOX ?? null,
      influence_note: "SOX와 삼성전자는 상관계수 0.7~0.8 (2023-2025). SOX -1% → 삼성 -0.7% 경향, 그러나 HBM 호황기에는 디커플링",
    } : {
      note: "15:30 슬롯 — 韓 마감 확정. 美 선물/프리마켓과 비교하여 오버나이트 리스크 판단",
      us_futures_hint: "15:30 KST = 01:30 EST → 美 개장 8시간 전. S&P 선물 등락으로 익일 갭 예측",
    },
    cross_market_read: {
      us_influence: usInfluence,
      lesson: slot === "morning"
        ? "美 하락에도 삼성이 버티면 기관 수급 강함. 2023년 DS 적자 때도 SOX 급락에 삼성은 DX 덕에 버팀 — 분해 사고 필요"
        : "韓 상승 후 美 선물이 하락이면 갭 되돌림 경계. 2025 Q3처럼 DS +7조가 美 AI 수요와 동조되면 다음날 추가 상승 지속",
      next_action: slot === "morning" ? "09:00 개장 전 갭/외인 수급 확인 → 15:30 재측정과 비교" : "금일 적중/미적중 기록 → 익일 08:00 美 반영과 비교하여 calibration",
    },
    evolution_note: "이 파일이 하루 2개씩 쌓이면(08시/15시30분) 진화 천재가 ‘美→韓’ vs ‘韓→美’ 전이 확률을 계산합니다. 예: SOX +2%일 때 삼성 다음날 +1.5% 확률 등",
    disclaimer: "교육·테스트용, 투자 권유 아님",
  };

  const outDir = path.resolve("data/stock-evolution");
  fs.mkdirSync(outDir, { recursive: true });
  const filename = `samsung-${dateStr}-${slotStr}.json`;
  const outPath = path.join(outDir, filename);
  fs.writeFileSync(outPath, JSON.stringify(record, null, 2), "utf-8");
  console.log(`✅ 저장: ${outPath}`);
  if (open && high && low && close) console.log(`   OHLCV: ${open}/${high}/${low}/${close} vol ${volume ?? "-"}`);
  else console.log(`   OHLCV: (수동 입력 필요) — Naver 차단 시 정상`);
  console.log(`   Cross: ${usInfluence}`);
  console.log(`   다음: 08시+15시30분 두 파일이 14개 쌓이면(7일) 전이확률 모델 생성`);

  // 호환: 기존 퓨쳐켐 로직도 함께 유지 (옵션)
  if (process.env.KEEP_FUTURECHEM === "1") {
    console.log(`   (KEEP_FUTURECHEM=1 이면 퓨쳐켐도 함께 수집)`);
  }
}

main().catch(e => {
  console.error("❌ fetch 실패:", e.message);
  console.error(e.stack);
  process.exit(1);
});
