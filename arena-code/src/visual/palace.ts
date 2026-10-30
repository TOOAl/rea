/**
 * Palace Canvas — 기억궁전 시각화 (Method of Loci 25 loci)
 * 12살 설명: 궁전 평면도 — 5개 방마다 5개 자리를 도면으로 그려서, 어디에 어떤 기억이 있는지 한눈에 보임
 * Ghidra P-Code 철학: 좌표=주소 → SVG viewBox가 곧 궁전 주소 공간
 */
import { PALACE_ROOMS, PALACE_POSITIONS } from "../memory/space.js";
import type { MemoryEntry } from "../memory/bank.js";

export interface PalaceRenderOpts {
  title?: string;
  width?: number; // 900
  height?: number; // 700
}

const ZONE_COLOR: Record<string, string> = {
  math: "#3B82F6", history: "#F59E0B", code: "#10B981", science: "#8B5CF6",
  economy: "#EF4444", art: "#EC4899", english: "#06B6D4", general: "#6B7280",
};

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export function generatePalaceHtml(entries: MemoryEntry[], opts: PalaceRenderOpts = {}): string {
  const W = opts.width ?? 1080;
  const H = opts.height ?? 760;
  const title = esc(opts.title ?? "🏛️ 기억궁전 — 25 loci 시각화");

  // 방마다 그룹
  const byRoom = new Map<string, MemoryEntry[]>();
  for (const e of entries) {
    if (!e.spaceMeta) continue;
    const room = e.spaceMeta.locusLabel.split("-")[0];
    const arr = byRoom.get(room) ?? [];
    arr.push(e);
    byRoom.set(room, arr);
  }

  // 레이아웃: 5방을 가로로, 각 방 안 5위치 세로
  const roomW = (W - 80) / PALACE_ROOMS.length;
  const posH = (H - 120) / PALACE_POSITIONS.length;

  // SVG 생성
  let svg = `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="기억궁전 25 loci">\n`;
  svg += `<rect width="${W}" height="${H}" rx="16" fill="#F9FAFB" stroke="#E5E7EB"/>\n`;
  svg += `<text x="${W / 2}" y="32" text-anchor="middle" font-family="Pretendard, Noto Sans KR, sans-serif" font-size="18" font-weight="700" fill="#111827">${title}</text>\n`;
  svg += `<text x="${W / 2}" y="52" text-anchor="middle" font-family="Pretendard, sans-serif" font-size="11" fill="#6B7280">${entries.length}개 기억 · ${byRoom.size}개 방 사용 · 25 loci 중 ${new Set(entries.filter(e=>e.spaceMeta).map(e=>e.spaceMeta!.locusId)).size}곳 점유</text>\n`;

  for (let ri = 0; ri < PALACE_ROOMS.length; ri++) {
    const room = PALACE_ROOMS[ri];
    const x = 40 + ri * roomW;
    const roomEntries = byRoom.get(room) ?? [];
    const occupiedCount = new Set(roomEntries.map(e => e.spaceMeta!.locusId)).size;

    // 방 컨테이너
    svg += `<g>\n`;
    svg += `<rect x="${x}" y="70" width="${roomW - 8}" height="${H - 90}" rx="12" fill="#FFFFFF" stroke="#D1D5DB" stroke-width="1.2"/>\n`;
    svg += `<rect x="${x}" y="70" width="${roomW - 8}" height="28" rx="12" fill="#1F2937"/>\n`;
    svg += `<rect x="${x}" y="84" width="${roomW - 8}" height="14" fill="#1F2937"/>\n`; // 헤더 둥근 보정
    svg += `<text x="${x + (roomW - 8) / 2}" y="88" text-anchor="middle" font-family="Pretendard, sans-serif" font-size="12" font-weight="700" fill="#FFFFFF">${esc(room)} (${occupiedCount}/5)</text>\n`;

    for (let pi = 0; pi < PALACE_POSITIONS.length; pi++) {
      const pos = PALACE_POSITIONS[pi];
      const y = 105 + pi * posH;
      const locusId = ri * PALACE_POSITIONS.length + pi;
      const _locusLabel = `${room}-${pos}`;
      const hits = entries.filter(e => e.spaceMeta?.locusId === locusId);

      // 위치 셀
      const fill = hits.length ? "#EFF6FF" : "#F9FAFB";
      const stroke = hits.length ? "#93C5FD" : "#E5E7EB";
      svg += `<rect x="${x + 6}" y="${y}" width="${roomW - 20}" height="${posH - 8}" rx="8" fill="${fill}" stroke="${stroke}" stroke-width="${hits.length ? 1.6 : 1}"/>\n`;
      svg += `<text x="${x + 14}" y="${y + 14}" font-family="Pretendard, sans-serif" font-size="10" font-weight="600" fill="#4B5563">${esc(pos)}</text>\n`;
      svg += `<text x="${x + roomW - 22}" y="${y + 14}" text-anchor="end" font-family="Pretendard, sans-serif" font-size="8" fill="#9CA3AF">#${locusId}</text>\n`;

      if (hits.length === 0) {
        svg += `<text x="${x + (roomW - 8) / 2}" y="${y + posH / 2 + 6}" text-anchor="middle" font-family="Pretendard, sans-serif" font-size="9" fill="#9CA3AF">○ 빈 자리</text>\n`;
      } else {
        for (let hi = 0; hi < Math.min(hits.length, 3); hi++) {
          const h = hits[hi];
          const color = ZONE_COLOR[h.spaceMeta!.zone] ?? "#6B7280";
          const ty = y + 24 + hi * 16;
          // zone 뱃지
          svg += `<circle cx="${x + 16}" cy="${ty - 3}" r="4" fill="${color}"/>\n`;
          const shortCue = esc(h.cue.slice(0, 10) + (h.cue.length > 10 ? "…" : ""));
          svg += `<text x="${x + 24}" y="${ty}" font-family="Pretendard, Noto Sans KR, sans-serif" font-size="9" font-weight="600" fill="#1F2937">${shortCue}</text>\n`;
          svg += `<text x="${x + 24}" y="${ty + 8}" font-family="Pretendard, sans-serif" font-size="7" fill="#6B7280">${esc(h.spaceMeta!.zone)} · ${Math.round(h.confidence! * 100)}%</text>\n`;
        }
        if (hits.length > 3) {
          svg += `<text x="${x + (roomW - 8) / 2}" y="${y + posH - 6}" text-anchor="middle" font-family="Pretendard, sans-serif" font-size="7" fill="#9CA3AF">+${hits.length - 3} 더</text>\n`;
        }
      }
    }
    svg += `</g>\n`;
  }

  // 범례
  svg += `<g>\n`;
  let lx = 40;
  for (const [zone, col] of Object.entries(ZONE_COLOR)) {
    if (!entries.some(e => e.spaceMeta?.zone === zone)) continue;
    svg += `<circle cx="${lx}" cy="${H - 14}" r="5" fill="${col}"/>\n`;
    svg += `<text x="${lx + 8}" y="${H - 10}" font-family="Pretendard, sans-serif" font-size="9" fill="#374151">${esc(zone)}</text>\n`;
    lx += zone.length * 7 + 22;
  }
  svg += `<text x="${W - 40}" y="${H - 10}" text-anchor="end" font-family="Pretendard, sans-serif" font-size="8" fill="#9CA3AF">격자: L1 4×4×2 + L2 8×8×4 · 궁전: 25 loci</text>\n`;
  svg += `</g>\n`;
  svg += `</svg>`;

  // HTML 래퍼 — 한글 깨짐 0% (Noto Sans KR base64 아님, 구글폰트 + fallback)
  const html = `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>${title}</title>
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;600;700&family=Pretendard:wght@400;600;700&display=swap" rel="stylesheet">
<style>
  *{box-sizing:border-box}
  body{margin:0;background:#F3F4F6;font-family:'Pretendard','Noto Sans KR',sans-serif;-webkit-font-smoothing:antialiased}
  .wrap{max-width:${W + 40}px;margin:20px auto;padding:16px;background:#fff;border-radius:16px;box-shadow:0 4px 24px rgba(0,0,0,.08)}
  .fig{overflow:hidden;border-radius:12px}
  .meta{margin-top:12px;display:flex;gap:8px;flex-wrap:wrap;font-size:12px;color:#6B7280}
  .badge{padding:4px 8px;border-radius:999px;background:#EFF6FF;color:#1E40AF;font-weight:600}
</style>
</head>
<body>
<div class="wrap">
  <div class="fig">${svg}</div>
  <div class="meta">
    <span class="badge">🏛️ ${entries.length} 기억</span>
    <span class="badge">📍 ${new Set(entries.filter(e=>e.spaceMeta).map(e=>e.spaceMeta!.locusId)).size}/25 loci</span>
    <span class="badge">🧭 ${new Set(entries.filter(e=>e.spaceMeta).map(e=>e.spaceMeta!.zone)).size} zones</span>
    <span>좌표=주소 — 같은 문장은 항상 같은 방에 (결정론 해시)</span>
  </div>
  <p style="font-size:11px;color:#9CA3AF;margin:8px 0 0">생성: ${new Date().toISOString().slice(0, 10)} · 렌더: ${W}×${H} · Space v3 (Place/Grid + Method of Loci)</p>
</div>
</body>
</html>`;
  return html;
}
