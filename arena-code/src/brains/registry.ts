/**
 * BrainRegistry — 두뇌 교체가 쉬운 슬롯 시스템 (레고처럼 끼웠다 뺐다)
 * 각 층(layer)은 여러 두뇌를 담을 수 있고, 언제든 교체 가능
 */
import { Brain, BrainId, BrainLayer, BrainRole } from "./types.js";
import { BrainMemory } from "./memory.js";

export class BrainRegistry {
  private brains = new Map<BrainId, Brain>();
  public memory = new BrainMemory();

  register(brain: Brain) {
    if (this.brains.has(brain.id))
      throw new Error(`Brain already exists: ${brain.id}`);
    this.brains.set(brain.id, brain);
    return this;
  }

  /** 레고 교체: 기존 두뇌를 같은 id의 새 두뇌로 교체 */
  swap(newBrain: Brain) {
    if (!this.brains.has(newBrain.id))
      throw new Error(`No brain to swap: ${newBrain.id}`);
    this.brains.set(newBrain.id, newBrain);
    return this;
  }

  remove(id: BrainId) {
    return this.brains.delete(id);
  }
  get(id: BrainId) {
    return this.brains.get(id);
  }
  all(): Brain[] {
    return [...this.brains.values()];
  }
  byLayer(layer: BrainLayer): Brain[] {
    return this.all().filter((b) => b.layer === layer);
  }
  byRole(role: BrainRole): Brain[] {
    return this.all().filter((b) => b.role === role);
  }

  /** 5층 구조 검증 — 각 층에 최소 1개 이상 있어야 Council 가능 (5층은 토론실) */
  validateFloors(): { ok: boolean; missing: BrainLayer[] } {
    const missing: BrainLayer[] = [];
    for (const l of [1, 2, 3, 4, 5] as BrainLayer[])
      if (this.byLayer(l).length === 0) missing.push(l);
    return { ok: missing.length === 0, missing };
  }

  /** 아래층에 요청 (5층 독립 토론실이 필요할 때 호출) — On-Demand Service */
  async request(
    layer: BrainLayer,
    task: string,
    context: string,
    priorOutputs: import("./types.js").BrainOutput[],
    extra?: import("./types.js").ArticleInput,
  ): Promise<import("./types.js").BrainOutput[]> {
    const brains = this.byLayer(layer);
    const results: import("./types.js").BrainOutput[] = [];
    for (const b of brains) {
      const t0 = Date.now();
      const out = await b.think({
        task,
        context: context + ` [5층 요청]`,
        layer,
        priorOutputs,
        ...extra,
      });
      out.costMs = Date.now() - t0;
      results.push(out);
    }
    return results;
  }

  describe(): string {
    const lines = this.all().map(
      (b) => `  ${b.layer}층 [${b.role}] ${b.name} (${b.id} v${b.version})`,
    );
    return `BrainRegistry — ${this.brains.size}개 두뇌\n` + lines.join("\n");
  }

  // ── M: 성적표 — 기여도 점수 + 랭킹 + 교체 이력 ──
  private scores = new Map<BrainId, number[]>(); // id → 최근 점수들 (0~100)
  private swapHistory: Array<{ from: string; to: string; at: string; reason: string }> = [];

  /** 한 천재의 최근 Council 기여 점수 기록 (accuracy + beauty + gate) */
  recordScore(id: BrainId, score: number): void {
    if (!this.brains.has(id)) return;
    const arr = this.scores.get(id) ?? [];
    arr.push(Math.max(0, Math.min(100, score)));
    if (arr.length > 20) arr.shift(); // 최근 20회만
    this.scores.set(id, arr);
  }
  /** 여러 천재 점수를 한 번에 기록 — Council.deliberate 후 호출 */
  recordScores(scores: Record<string, number>): void {
    for (const [id, s] of Object.entries(scores)) this.recordScore(id as BrainId, s);
  }
  score(id: BrainId): number {
    const arr = this.scores.get(id);
    if (!arr || arr.length === 0) return 50; // 미참여는 50점 (중립)
    return Math.round(arr.reduce((a, b) => a + b, 0) / arr.length);
  }
  /** 전체 랭킹 — 평균 점수 + 참여 횟수 가중 */
  rank(limit?: number): Array<{ id: BrainId; name: string; layer: BrainLayer; avg: number; count: number }> {
    const rows = this.all().map(b => ({
      id: b.id as BrainId,
      name: b.name,
      layer: b.layer,
      avg: this.score(b.id as BrainId),
      count: this.scores.get(b.id as BrainId)?.length ?? 0,
    }));
    rows.sort((a, b) => b.avg - a.avg || b.count - a.count);
    return limit ? rows.slice(0, limit) : rows;
  }
  /** 레고 교체 + 이력 남기기 — L에서 자동 진화 시 사람 승인 전 로그 */
  swapWithHistory(newBrain: Brain, reason = ""): void {
    const old = this.brains.get(newBrain.id);
    if (!old) throw new Error(`No brain to swap: ${newBrain.id}`);
    this.brains.set(newBrain.id, newBrain);
    this.swapHistory.push({ from: `${old.name} v${old.version}`, to: `${newBrain.name} v${newBrain.version}`, at: new Date().toISOString(), reason });
  }
  getSwapHistory(): typeof this.swapHistory {
    return [...this.swapHistory];
  }
  /** 하위 10% 경고 대상 */
  bottomDecile(): Array<{ id: BrainId; avg: number }> {
    const ranked = this.rank();
    const n = Math.max(1, Math.floor(ranked.length * 0.1));
    return ranked.slice(-n).map(r => ({ id: r.id, avg: r.avg }));
  }
}
