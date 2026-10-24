/**
 * Store — RagIndex 벡터 영속화 (API 없이 rea 흡수)
 * 설계: JSON 기반 .arena/rag-index/<domain>.vectors.json — sqlite-vss 없이도 동작, 나중에 sqlite-vss로 교체 가능
 * 인터페이스: saveVectors(domain, Map<chunkId, vector>), loadVectors(domain)
 * 12살: 카드목록 옆에 붙은 숫자 스티커 보관함
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

export interface VectorEntry {
  id: string;
  vector: number[];
}

function slugDomain(d: string): string {
  return (
    d
      .replace(/\s*[/\\]\s*/g, "__")
      .trim()
      .replace(/[^a-zA-Z0-9._-]/g, "_")
      .slice(0, 80) || "default"
  );
}

export class VectorStore {
  root: string;
  constructor(root?: string) {
    this.root = resolve(root ?? `${process.cwd()}/.arena/rag-index`);
  }

  pathFor(domain: string): string {
    return join(this.root, `${slugDomain(domain)}.vectors.json`);
  }

  save(domain: string, vectors: Map<string, number[]>): string | null {
    try {
      mkdirSync(this.root, { recursive: true });
      const arr: VectorEntry[] = [...vectors.entries()].map(([id, vector]) => ({
        id,
        vector,
      }));
      const p = this.pathFor(domain);
      writeFileSync(p, JSON.stringify(arr), "utf-8");
      return p;
    } catch {
      return null;
    }
  }

  load(domain: string): Map<string, number[]> | null {
    const p = this.pathFor(domain);
    if (!existsSync(p)) return null;
    try {
      const raw = readFileSync(p, "utf-8");
      const arr = JSON.parse(raw) as VectorEntry[];
      return new Map(arr.map((e) => [e.id, e.vector]));
    } catch {
      return null;
    }
  }

  exists(domain: string): boolean {
    return existsSync(this.pathFor(domain));
  }

  delete(domain: string): void {
    const p = this.pathFor(domain);
    if (existsSync(p)) {
      try {
        writeFileSync(p, "[]", "utf-8");
      } catch {}
    }
  }
}

// sqlite-vss 호환 어댑터 스텁 — 나중에 better-sqlite3로 교체할 때 이 인터페이스만 바꾸면 됨
export interface SqliteVssAdapter {
  save(domain: string, vectors: Map<string, number[]>): Promise<void>;
  search(
    domain: string,
    queryVector: number[],
    topK: number,
  ): Promise<Array<{ id: string; score: number }>>;
}

// 현재는 JSON 기반 어댑터, 향후 sqlite-vss로 교체 가능
export class JsonVssAdapter implements SqliteVssAdapter {
  private store: VectorStore;
  private vectors: Map<string, Map<string, number[]>> = new Map(); // domain -> map

  constructor(store?: VectorStore) {
    this.store = store ?? new VectorStore();
  }

  async save(domain: string, vectors: Map<string, number[]>): Promise<void> {
    this.store.save(domain, vectors);
    this.vectors.set(domain, new Map(vectors));
  }

  async search(
    domain: string,
    queryVector: number[],
    topK: number,
  ): Promise<Array<{ id: string; score: number }>> {
    let map = this.vectors.get(domain);
    if (!map) {
      const loaded = this.store.load(domain);
      if (!loaded) return [];
      map = loaded;
      this.vectors.set(domain, map);
    }
    const scores: Array<{ id: string; score: number }> = [];
    for (const [id, vec] of map) {
      let dot = 0,
        na = 0,
        nb = 0;
      for (let i = 0; i < vec.length; i++) {
        dot += vec[i] * queryVector[i];
        na += vec[i] * vec[i];
        nb += queryVector[i] * queryVector[i];
      }
      const denom = Math.sqrt(na) * Math.sqrt(nb) || 1;
      scores.push({ id, score: dot / denom });
    }
    scores.sort((a, b) => b.score - a.score);
    return scores.slice(0, topK);
  }
}
