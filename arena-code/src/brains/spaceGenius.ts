/**
 * Space Genius 3형제 — 해마 Place/Grid 세포를 모티브로 한 공간 기억 두뇌
 * - space-palace: 기억궁전 건축가 (Method of Loci)
 * - space-navigator: 격자 항법사 (Grid cell path integration)
 * - space-grapher: 장면 그래퍼 (Scene graph + spatial edges)
 *
 * REA 흡수: O'Keefe Place cell(1971) + Moser Grid cell(2005) + Yates Art of Memory(1966)
 * Ghidra 철학: 좌표 = 주소, loci = 세그먼트, path = 제어흐름 추적
 *
 * 12살 설명: 기억을 방에 놓으면 "현관→거실→서재" 걸어가며 다 꺼낼 수 있어.
 *            가까운 방끼리는 같이 떠오르고, 멀리 가려면 길잡이가 안내해.
 */

import { Brain, BrainInput, BrainOutput, BrainFeedback, BrainRole, BrainLayer } from "./types.js";
import { BrainMemory } from "./memory.js";
import { MemoryBank } from "../memory/bank.js";
import { PALACE_LOCI, coordForText, palaceWalkOrder, buildSpatialEdges } from "../memory/space.js";

function mk(input: BrainInput, brain: Brain, idea: string, confidence: number, tags: string[]): BrainOutput {
  return { brainId: brain.id, role: brain.role, layer: brain.layer, idea, confidence, tags, costMs: 0 };
}

// ── 1) 기억궁전 건축가 — Method of Loci ──────────────────────────────
export class SpacePalaceBrain implements Brain {
  id = "space-palace";
  role: BrainRole = "memory";
  layer: BrainLayer = 1;
  name = "기억궁전 건축가";
  description = "기억을 5방 25위치 궁전에 배치하고 순서대로 순회(MoL) — 방을 걸으며 떠올리는 해마 Place cell";
  version = "1.0.0";
  private bank: MemoryBank;
  constructor(private memory: BrainMemory, root?: string, private domain = "arena-brain") {
    this.bank = new MemoryBank({ root, domain });
  }
  async learn(feedback: BrainFeedback): Promise<void> {
    if (feedback.lesson) this.memory.rememberError(feedback.targetId, feedback.note, feedback.lesson);
  }
  async think(input: BrainInput): Promise<BrainOutput> {
    const all = this.bank.list({ includeExpired: false });
    const withSpace = all.filter(e => e.spaceMeta);
    // loci 점유율
    const occupied = new Map<number, number>();
    for (const e of withSpace) {
      occupied.set(e.spaceMeta!.locusId, (occupied.get(e.spaceMeta!.locusId) ?? 0) + 1);
    }
    const emptyLoci = PALACE_LOCI.filter(l => !occupied.has(l.id)).slice(0, 3);
    // zone 분포
    const zoneCount = new Map<string, number>();
    for (const e of withSpace) zoneCount.set(e.spaceMeta!.zone, (zoneCount.get(e.spaceMeta!.zone) ?? 0) + 1);
    const zones = [...zoneCount.entries()].sort((a, b) => b[1] - a[1]);

    // palaceWalk 순서
    const walk = withSpace.length ? palaceWalkOrder(withSpace).slice(0, 6) : [];

    const lines: string[] = [];
    lines.push(`🏛️ 기억궁전 — 5방×5위치 25 loci (Place cell)`);
    lines.push(`→ 총 ${all.length}기억 중 ${withSpace.length}개 공간 배치 (${withSpace.length ? Math.round(withSpace.length / all.length * 100) : 0}%)`);
    if (zones.length) lines.push(`→ 구역 분포: ${zones.map(([z, n]) => `${z}:${n}`).join(" | ")}`);
    else lines.push(`→ 구역: 아직 없음 — 첫 기억 저장 시 자동 zone 분류(math/history/code…)`);
    if (emptyLoci.length) lines.push(`→ 빈 자리 Top3: ${emptyLoci.map(l => l.label).join(" | ")} — 다음 기억은 여기로`);
    else if (withSpace.length) lines.push(`→ 궁전 만실 — 가장 붐비는 locus ${[...occupied.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "?"}번 (${[...occupied.entries()].sort((a, b) => b[1] - a[1])[0]?.[1]}개) 분산 고려`);
    if (walk.length) {
      lines.push(`→ 궁전 산책 (locusId 순 Walk 6):`);
      for (const w of walk) lines.push(`   ${w.spaceMeta!.locusLabel} [${w.spaceMeta!.zone}] ${w.cue} → ${w.content.slice(0, 32)}`);
    } else {
      lines.push(`→ 산책: 아직 기억이 없어 빈 궁전 — "${input.task.slice(0, 28)}"를 cue로 addWithSpace({cue,content}) 해보세요`);
      // 예시 좌표 미리보기
      const preview = coordForText(input.task, this.domain);
      lines.push(`   ↳ 예시: "${input.task.slice(0, 24)}" → ${preview.locusLabel} (${preview.zone}) grid ${preview.gridKey.slice(0, 24)}`);
    }
    lines.push(`→ 원칙: 같은 방 기억은 함께 떠오름(near), 다른 방은 길잡이가 연결 — navigator/grapher와 협업`);

    return mk(input, this, lines.join("\n"), withSpace.length ? 0.86 : 0.80, ["palace", "place-cell", "method-of-loci", `loci:${PALACE_LOCI.length}`, `stored:${withSpace.length}`]);
  }
  /** 외부 API: 궁전 배치 미리보기 */
  previewPlacement(text: string): ReturnType<typeof coordForText> {
    return coordForText(text, this.domain);
  }
  walk(): ReturnType<MemoryBank["palaceWalk"]> { return this.bank.palaceWalk(); }
}

// ── 2) 격자 항법사 — Grid cell navigation ─────────────────────────────
export class SpaceNavigatorBrain implements Brain {
  id = "space-navigator";
  role: BrainRole = "memory";
  layer: BrainLayer = 1;
  name = "격자 항법사";
  description = "Grid cell 다해상도 타일로 경로를 계획 — ‘A에서 B로 가려면 어떤 기억을 거쳐야 하는가’ 벡터 항법";
  version = "1.0.0";
  private bank: MemoryBank;
  constructor(private memory: BrainMemory, root?: string, private domain = "arena-brain") {
    this.bank = new MemoryBank({ root, domain });
  }
  async learn(f: BrainFeedback): Promise<void> { if (f.lesson) this.memory.rememberError(f.targetId, f.note, f.lesson); }
  async think(input: BrainInput): Promise<BrainOutput> {
    const all = this.bank.list({ includeExpired: false }).filter(e => e.spaceMeta);
    const lines: string[] = [];
    lines.push(`🧭 격자 항법사 — Grid cell 2해상도(L1 4×4×2 + L2 8×8×4) 경로 계획`);
    if (all.length < 2) {
      lines.push(`→ 기억 ${all.length}개 — 경로 계획은 2개 이상 필요`);
      if (input.task.length > 6) {
        // 질의 → 가상 좌표로 nearby 시연
        const qCoord = coordForText(input.task, this.domain);
        const near = this.bank.searchNearby(input.task, 0.30, 3);
        lines.push(`→ 질의 "${input.task.slice(0, 30)}" → grid ${qCoord.gridKey}`);
        lines.push(`→ → 가상 좌표 (${qCoord.x.toFixed(2)},${qCoord.y.toFixed(2)},${qCoord.z.toFixed(2)}) ${qCoord.locusLabel}`);
        if (near.length) lines.push(`→ 근처 기억 ${near.length}개: ${near.map(n => n.cue).join(" | ")}`);
        else lines.push(`→ 근처: 없음 — 반경 0.30 안에 기억 없음 (더 넓은 0.50 시도 가능)`);
      }
      lines.push(`→ 타일 통계: ${all.length ? [...new Set(all.map(a => a.spaceMeta!.gridKey.split("/")[0]))].length : 0}개 L1 타일 점유`);
      return mk(input, this, lines.join("\n"), 0.78, ["navigator", "grid-cell", "path", `mem:${all.length}`]);
    }

    // 임의 2개 기억으로 경로 시연
    const from = all[0], to = all[all.length - 1];
    const plan = this.bank.planPath(from.id, to.id);
    lines.push(`→ 총 ${all.length}개 공간 기억, ${new Set(all.map(a => a.spaceMeta!.zone)).size}개 zone, ${new Set(all.map(a => a.spaceMeta!.locusLabel.split("-")[0])).size}개 방 사용`);
    lines.push(`→ L1 타일 ${new Set(all.map(a => a.spaceMeta!.gridKey.split("/")[0])).size}개 / L2 타일 ${new Set(all.map(a => a.spaceMeta!.gridKey)).size}개`);
    if (plan) {
      lines.push(`→ 경로 시연: "${from.cue.slice(0, 18)}" → "${to.cue.slice(0, 18)}" (직선 ${plan.totalDist.toFixed(2)})`);
      for (let i = 0; i < plan.steps.length; i++) {
        const s = plan.steps[i] as any;
        const v = plan.vectors[i];
        lines.push(`   ${i + 1}. ${s.spaceMeta!.locusLabel} ${(s.cue ?? s.id).slice(0, 20)}${v ? ` — ${v.heading} ${v.dist.toFixed(2)} →` : " (목적지)"}`);
      }
      if (plan.steps.length === 2) lines.push(`   ↳ 중간 랜드마크 없음 — 두 기억 사이가 비어 있음 (중간 기억 추가 시 경로가 풍부해짐)`);
    } else {
      lines.push(`→ 경로 불가 — spaceMeta 없는 기억 포함`);
    }
    // 질의 기반 nearby도 함께
    if (input.task.length > 8) {
      const near = this.bank.searchNearby(input.task, 0.30, 3);
      if (near.length) lines.push(`→ 질의 근처: ${near.map(n => `${n.cue}(${n.spaceMeta!.zone})`).join(" | ")}`);
    }

    return mk(input, this, lines.join("\n"), plan ? 0.87 : 0.80, ["navigator", "grid-cell", "vector", `plan:${plan?.steps.length ?? 0}`]);
  }
  nearby(query: string, radius = 0.30, topK = 5) { return this.bank.searchNearby(query, radius, topK); }
  planPath(fromId: string, toId: string) { return this.bank.planPath(fromId, toId); }
}

// ── 3) 장면 그래퍼 — Scene graph + spatial edges ─────────────────────
export class SpaceGrapherBrain implements Brain {
  id = "space-grapher";
  role: BrainRole = "memory";
  layer: BrainLayer = 1;
  name = "장면 그래퍼";
  description = "기억들을 장면 그래프로 엮음 — near/adjacent/contains 공간 간선 + 사실 triple 2-hop 탐색";
  version = "1.0.0";
  private bank: MemoryBank;
  constructor(private memory: BrainMemory, root?: string, private domain = "arena-brain") {
    this.bank = new MemoryBank({ root, domain });
  }
  async learn(f: BrainFeedback): Promise<void> { if (f.lesson) this.memory.rememberError(f.targetId, f.note, f.lesson); }
  async think(input: BrainInput): Promise<BrainOutput> {
    const all = this.bank.list({ includeExpired: false });
    const withSpace = all.filter(e => e.spaceMeta);
    const triples = this.bank.toGraph();
    const spatialEdges = this.bank.spatialEdges();

    const lines: string[] = [];
    lines.push(`🕸️ 장면 그래퍼 — 사실 triple + 공간 간선(near/adjacent/contains)`);
    lines.push(`→ 총 ${all.length}기억 · 공간 ${withSpace.length}개 · 사실 triple ${triples.length}개 · 공간 간선 ${spatialEdges.length}개`);
    if (triples.length) {
      lines.push(`→ 사실 Top3: ${triples.slice(0, 3).map(t => `${t.subject}—${t.relation}→${t.object}`).join(" | ")}`);
    } else {
      lines.push(`→ 사실: 없음 — "세종은 자격루를 만들었다" 형태 저장 시 triple 추출`);
    }
    if (spatialEdges.length) {
      const near = spatialEdges.filter(e => e.relation === "near").length;
      const adj = spatialEdges.filter(e => e.relation === "adjacent").length;
      const cont = spatialEdges.filter(e => e.relation === "contains").length;
      lines.push(`→ 공간 간선: near ${near} · adjacent ${adj} · contains ${cont} (가장 가까운 쌍 ${spatialEdges[0].distance.toFixed(2)})`);
      lines.push(`   예: ${spatialEdges.slice(0, 2).map(e => `${e.from.slice(0, 12)} —${e.relation}(${e.distance.toFixed(2)})→ ${e.to.slice(0, 12)}`).join(" | ")}`);
    } else {
      lines.push(`→ 공간 간선: 없음 — 2개 이상 공간 기억 필요 (현재 ${withSpace.length}개)`);
    }
    // 장면 예시: 같은 방에 있는 기억들을 "장면"으로 묶기
    if (withSpace.length >= 2) {
      const byRoom = new Map<string, typeof withSpace>();
      for (const e of withSpace) {
        const room = e.spaceMeta!.locusLabel.split("-")[0];
        const arr = byRoom.get(room) ?? [];
        arr.push(e);
        byRoom.set(room, arr);
      }
      const biggest = [...byRoom.entries()].sort((a, b) => b[1].length - a[1].length)[0];
      if (biggest && biggest[1].length >= 2) {
        lines.push(`→ 장면(같은 방): "${biggest[0]}" 방에 ${biggest[1].length}개 — ${biggest[1].slice(0, 3).map(e => e.cue).join(", ")}가 한 장면에`);
      }
    }
    // 질의 → 공간+사실 혼합 탐색 시연
    if (input.task.length > 8) {
      const hits = this.bank.searchNearby(input.task, 0.35, 2);
      if (hits.length) lines.push(`→ 질의 장면: "${input.task.slice(0, 28)}" 근처 ${hits.map(h => `${h.cue}@${h.spaceMeta!.locusLabel}`).join(" | ")}`);
    }
    lines.push(`→ 궁전·항법·장면 3형제 협업: palace가 배치, navigator가 길, grapher가 연결을 담당`);

    return mk(input, this, lines.join("\n"), spatialEdges.length || triples.length ? 0.86 : 0.79, ["grapher", "scene-graph", "spatial-edge", `triples:${triples.length}`, `edges:${spatialEdges.length}`]);
  }
  spatialEdges() { return this.bank.spatialEdges(); }
  toGraph() { return this.bank.toGraph(); }
}

export const SPACE_BRAINS = [SpacePalaceBrain, SpaceNavigatorBrain, SpaceGrapherBrain] as const;
