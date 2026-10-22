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
    if (this.brains.has(brain.id)) throw new Error(`Brain already exists: ${brain.id}`);
    this.brains.set(brain.id, brain);
    return this;
  }

  /** 레고 교체: 기존 두뇌를 같은 id의 새 두뇌로 교체 */
  swap(newBrain: Brain) {
    if (!this.brains.has(newBrain.id)) throw new Error(`No brain to swap: ${newBrain.id}`);
    this.brains.set(newBrain.id, newBrain);
    return this;
  }

  remove(id: BrainId) { return this.brains.delete(id); }
  get(id: BrainId) { return this.brains.get(id); }
  all(): Brain[] { return [...this.brains.values()]; }
  byLayer(layer: BrainLayer): Brain[] { return this.all().filter(b => b.layer === layer); }
  byRole(role: BrainRole): Brain[] { return this.all().filter(b => b.role === role); }

  /** 5층 구조 검증 — 각 층에 최소 1개 이상 있어야 Council 가능 (5층은 토론실) */
  validateFloors(): { ok: boolean; missing: BrainLayer[] } {
    const missing: BrainLayer[] = [];
    for (const l of [1, 2, 3, 4, 5] as BrainLayer[]) if (this.byLayer(l).length === 0) missing.push(l);
    return { ok: missing.length === 0, missing };
  }

  /** 아래층에 요청 (5층 독립 토론실이 필요할 때 호출) — On-Demand Service */
  async request(layer: BrainLayer, task: string, context: string, priorOutputs: import("./types.js").BrainOutput[]): Promise<import("./types.js").BrainOutput[]> {
    const brains = this.byLayer(layer);
    const results: import("./types.js").BrainOutput[] = [];
    for (const b of brains) {
      const t0 = Date.now();
      const out = await b.think({ task, context: context + ` [5층 요청]`, layer, priorOutputs });
      out.costMs = Date.now() - t0;
      results.push(out);
    }
    return results;
  }

  describe(): string {
    const lines = this.all().map(b => `  ${b.layer}층 [${b.role}] ${b.name} (${b.id} v${b.version})`);
    return `BrainRegistry — ${this.brains.size}개 두뇌\n` + lines.join("\n");
  }
}
