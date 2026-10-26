/**
 * Space Memory — 해마 공간 세포 기반 기억궁전 (Hippocampus Place/Grid cells → Memory Palace)
 *
 * O'Keefe 1971 Place cell / Moser 2005 Grid cell / Method of Loci(기억 궁전) 3원칙 흡수
 * - Place cell: 특정 기억을 특정 좌표(locus)에 고정 — "세종=궁전 중앙"
 * - Grid cell: 6각 타일링으로 coarse→fine 다해상도 탐색 — "코스피 근처"로 넓게 잡고 좁히기
 * - Palace walk: loci 순서대로 순회하며 recall — "현관→거실→서재" 이야기로 떠올리기
 *
 * REA 철학: 모든 공간은 결정론적 해시로 계산 (API 0, 재현 가능) + Ghidra 추적처럼 좌표=주소
 *
 * 12살 설명: 기억을 방에 하나씩 짐처럼 놓는 것. "수학 공식은 책상 위, 역사 이야기는 침대 위"
 *            그러면 방을 걸어다니며 "책상→침대" 순서로 바로 찾는다.
 */

export interface SpaceCoord {
  /** 3D 공간 좌표 — 정규화 0..1 (해시 결정론) */
  x: number;
  y: number;
  z: number;
  /** 층: 궁전의 방 (place cell) — 0..24 (5방×5위치) */
  locusId: number;
  /** 구역: 의미적 클러스터 (grid cell coarse) — 예: "math", "history", "code" */
  zone: string;
  /** 격자 키: 다해상도 타일 ID — 예: "L2:3,7,1" */
  gridKey: string;
  /** 방 이름 (palace locus label) — Method of Loci */
  locusLabel: string;
}

export interface PalaceLocus {
  id: number;
  room: string;
  position: string;
  label: string;
  coord: { x: number; y: number; z: number };
}

export interface SpatialEdge {
  from: string; // memory id
  to: string;
  relation: "near" | "adjacent" | "contains" | "path";
  distance: number;
  vector: { dx: number; dy: number; dz: number };
}

/** 고전 기억궁전 5방 — Vitruvius + Yates "The Art of Memory" */
export const PALACE_ROOMS: string[] = ["현관", "거실", "서재", "침실", "다락방"];
export const PALACE_POSITIONS: string[] = ["천장", "벽선반", "책상", "의자", "바닥"];

export function buildPalace(): PalaceLocus[] {
  const loci: PalaceLocus[] = [];
  for (let r = 0; r < PALACE_ROOMS.length; r++) {
    for (let p = 0; p < PALACE_POSITIONS.length; p++) {
      const id = r * PALACE_POSITIONS.length + p;
      // 결정론적 3D 배치: 방은 X축, 위치는 Y축, Z는 높이
      const coord = {
        x: (r + 0.5) / PALACE_ROOMS.length,
        y: (p + 0.5) / PALACE_POSITIONS.length,
        z: 0.5 + Math.sin((id * 2.3)) * 0.2, // 약한 Z 변화로 입체감
      };
      loci.push({
        id,
        room: PALACE_ROOMS[r],
        position: PALACE_POSITIONS[p],
        label: `${PALACE_ROOMS[r]}-${PALACE_POSITIONS[p]}`,
        coord,
      });
    }
  }
  return loci;
}
export const PALACE_LOCI: PalaceLocus[] = buildPalace();

/** 간단 해시 → 0..1 float (FNV-1a 경량, API 0) */
function hashToUnit(text: string, seed = 0): number {
  let h = 2166136261 ^ seed;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  // 0..1
  return (h >>> 0) / 0xffffffff;
}

/** cue+content → SpaceCoord 결정론 생성 */
export function coordForText(text: string, domainHint = ""): SpaceCoord {
  const t = `${domainHint}:${text}`.slice(0, 500);
  const x = hashToUnit(t, 11);
  const y = hashToUnit(t, 23);
  const z = hashToUnit(t, 37);
  const locusId = Math.floor(hashToUnit(t, 41) * PALACE_LOCI.length);
  const locus = PALACE_LOCI[locusId];
  // zone: 도메인 힌트 또는 텍스트 키워드로 추론
  const zone = inferZone(text, domainHint);
  // gridKey: 다해상도 타일 (coarse L1 + fine L2)
  const gridKey = gridKeyForCoord({ x, y, z }, zone);
  return {
    x, y, z,
    locusId,
    zone,
    gridKey,
    locusLabel: locus.label,
  };
}

function inferZone(text: string, domainHint: string): string {
  const lower = `${domainHint} ${text}`.toLowerCase();
  if (/수학|math|증명|공식|정리|방정식|기하|미적분|확률|조합/.test(lower)) return "math";
  if (/역사|history|왕|조선|고려|세종|일제|독립|전쟁|혁명/.test(lower)) return "history";
  if (/코드|code|함수|버그|api|서버|프론트|배포|git|npm|테스트/.test(lower)) return "code";
  if (/과학|science|물리|화학|생물|실험|원자|세포/.test(lower)) return "science";
  if (/경제|economy|시장|주식|코스피|투자|수익|손실|거래/.test(lower)) return "economy";
  if (/예술|art|그림|음악|영화|디자인|색|빛|구도/.test(lower)) return "art";
  if (/영어|english|단어|vocab|문법|회화/.test(lower)) return "english";
  if (domainHint) return domainHint.slice(0, 12).toLowerCase().replace(/[^a-z0-9]/g, "") || "general";
  return "general";
}

/** Grid cell 타일링 — coarse L1(4×4×2) + fine L2(8×8×4) 이중 격자 */
export function gridKeyForCoord(c: { x: number; y: number; z: number }, zone: string): string {
  const L1x = Math.floor(c.x * 4);
  const L1y = Math.floor(c.y * 4);
  const L1z = Math.floor(c.z * 2);
  const L2x = Math.floor(c.x * 8);
  const L2y = Math.floor(c.y * 8);
  const L2z = Math.floor(c.z * 4);
  return `${zone}|L1:${L1x},${L1y},${L1z}/L2:${L2x},${L2y},${L2z}`;
}

/** 유클리드 거리 0..√3 */
export function distance(a: { x: number; y: number; z: number }, b: { x: number; y: number; z: number }): number {
  const dx = a.x - b.x, dy = a.y - b.y, dz = a.z - b.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

export function vector(a: { x: number; y: number; z: number }, b: { x: number; y: number; z: number }): { dx: number; dy: number; dz: number; dist: number; heading: string } {
  const dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z;
  const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
  // heading: 8방위 + 상하
  const angle = Math.atan2(dy, dx) * 180 / Math.PI;
  let heading = "동";
  if (angle >= -22.5 && angle < 22.5) heading = "동";
  else if (angle >= 22.5 && angle < 67.5) heading = "북동";
  else if (angle >= 67.5 && angle < 112.5) heading = "북";
  else if (angle >= 112.5 && angle < 157.5) heading = "북서";
  else if (angle >= 157.5 || angle < -157.5) heading = "서";
  else if (angle >= -157.5 && angle < -112.5) heading = "남서";
  else if (angle >= -112.5 && angle < -67.5) heading = "남";
  else heading = "남동";
  if (dz > 0.12) heading += "↑";
  else if (dz < -0.12) heading += "↓";
  return { dx, dy, dz, dist, heading };
}

/** Palace walk: loci 순서대로 인접 기억을 정렬 (Method of Loci) */
export function palaceWalkOrder<T extends { spaceMeta?: SpaceCoord }>(items: T[]): T[] {
  return [...items].sort((a, b) => (a.spaceMeta?.locusId ?? 999) - (b.spaceMeta?.locusId ?? 999));
}

/** 반경 내 이웃 찾기 */
export function nearby<T extends { spaceMeta?: SpaceCoord }>(items: T[], center: SpaceCoord, radius = 0.25): T[] {
  return items
    .filter(it => it.spaceMeta && distance(it.spaceMeta, center) <= radius)
    .sort((a, b) => distance(a.spaceMeta!, center) - distance(b.spaceMeta!, center));
}

export function zoneForCoord(coord: SpaceCoord): string { return coord.zone; }

/** 공간 기반 경로 계획: A→B 직선 상의 랜드마크 기억들을 순서대로 반환 (Grid cell navigation) */
export function planPath<T extends { id: string; spaceMeta?: SpaceCoord }>(
  items: T[],
  fromId: string,
  toId: string,
): { steps: T[]; vectors: ReturnType<typeof vector>[]; totalDist: number } | null {
  const from = items.find(i => i.id === fromId);
  const to = items.find(i => i.id === toId);
  if (!from?.spaceMeta || !to?.spaceMeta) return null;
  const totalDist = distance(from.spaceMeta, to.spaceMeta);
  // 직선 경로 상의 waypoint: 두 점 사이를 3등분한 지점 근처 기억들
  const waypoints: T[] = [from];
  for (let t = 1; t < 3; t++) {
    const ratio = t / 3;
    const mid = {
      x: from.spaceMeta.x + (to.spaceMeta.x - from.spaceMeta.x) * ratio,
      y: from.spaceMeta.y + (to.spaceMeta.y - from.spaceMeta.y) * ratio,
      z: from.spaceMeta.z + (to.spaceMeta.z - from.spaceMeta.z) * ratio,
    };
    // mid 근처 가장 가까운 기억 1개
    let best: T | null = null;
    let bestD = Infinity;
    for (const it of items) {
      if (it.id === fromId || it.id === toId) continue;
      if (!it.spaceMeta) continue;
      const d = distance(it.spaceMeta, mid);
      if (d < bestD && d < 0.4) { bestD = d; best = it; }
    }
    if (best) waypoints.push(best);
  }
  waypoints.push(to);
  const vectors = [];
  for (let i = 0; i < waypoints.length - 1; i++) {
    vectors.push(vector(waypoints[i].spaceMeta!, waypoints[i + 1].spaceMeta!));
  }
  return { steps: waypoints, vectors, totalDist };
}

/** 공간 그래프 간선 생성 — near(반경 0.25) + adjacent(locus 인접) */
export function buildSpatialEdges<T extends { id: string; spaceMeta?: SpaceCoord }>(items: T[]): SpatialEdge[] {
  const edges: SpatialEdge[] = [];
  const withSpace = items.filter(i => i.spaceMeta) as (T & { spaceMeta: SpaceCoord })[];
  for (let i = 0; i < withSpace.length; i++) {
    for (let j = i + 1; j < withSpace.length; j++) {
      const a = withSpace[i], b = withSpace[j];
      const d = distance(a.spaceMeta, b.spaceMeta);
      const v = { dx: b.spaceMeta.x - a.spaceMeta.x, dy: b.spaceMeta.y - a.spaceMeta.y, dz: b.spaceMeta.z - a.spaceMeta.z };
      if (d <= 0.25) {
        edges.push({ from: a.id, to: b.id, relation: "near", distance: d, vector: v });
      } else if (Math.abs(a.spaceMeta.locusId - b.spaceMeta.locusId) === 1) {
        // 인접 locus (방 안 이웃 위치)
        edges.push({ from: a.id, to: b.id, relation: "adjacent", distance: d, vector: v });
      }
      // 같은 room이면 contains (궁전 방이 기억들을 포함)
      if (a.spaceMeta.locusLabel.split("-")[0] === b.spaceMeta.locusLabel.split("-")[0] && d <= 0.45) {
        const exists = edges.some(e => (e.from === a.id && e.to === b.id) || (e.from === b.id && e.to === a.id));
        if (!exists) edges.push({ from: a.id, to: b.id, relation: "contains", distance: d, vector: v });
      }
    }
  }
  return edges.sort((a, b) => a.distance - b.distance);
}
