/**
 * RagIndex — 로컬 하이브리드 검색 (TF-IDF + 미래 벡터 슬롯)
 * 현재: BM25 유사 TF-IDF + cue bonus (MemoryBank와 동일 철학, 재사용)
 * 미래: dense vector 추가 시 `vectorSearch` 슬롯에 주입
 *
 * 저장: 메모리 + 선택적 디스크 persist (.arena/rag-index/<domain>.json)
 * 12살 설명: 도서관 카드목록 — 제목·내용 키워드로 책을 찾는 카드통
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { chunkText, type Chunk } from "./chunker.js";

// MemoryBank와 동일한 토크나이저 재사용 철학 (영문/숫자 중심)
const STOP = new Set([
  "the","a","an","and","or","but","in","on","at","to","for","of","with","is","are","was","were","be","been","this","that","it","as","by","from","has","have","had","will","would","can","should","could","may","you","your","our","we","us","they","them","their","its","if","then","else","when","what","which","how","why","not","no","yes","do","does","did","done","about","into","over","under","after","before","up","down","out","so","such","than","too","very","는","이","가","을","를","의","에","에서","으로","와","과","도","은","는","다","요","까","네"
]);

function tokenize(text: string): string[] {
  // 한글은 2자 이상 연속 한글도 토큰으로 인정 (한국어 로그 지원)
  const tokens: string[] = [];
  // 영문/숫자
  for (const w of text.toLowerCase().split(/[^a-z0-9가-힣]+/g)) {
    if (w.length >= 2 && w.length <= 24 && !STOP.has(w)) tokens.push(w);
  }
  return tokens;
}

function tf(tokens: string[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const t of tokens) m.set(t, (m.get(t) ?? 0) + 1);
  const len = tokens.length || 1;
  for (const [k, v] of m) m.set(k, v / len);
  return m;
}

function cosine(a: Map<string, number>, b: Map<string, number>): number {
  let dot = 0, na = 0, nb = 0;
  for (const [k, va] of a) { dot += va * (b.get(k) ?? 0); na += va * va; }
  for (const [, vb] of b) nb += vb * vb;
  const denom = Math.sqrt(na) * Math.sqrt(nb) || 1;
  return dot / denom;
}

export interface RagDocument {
  source: string;
  text: string;
  metadata?: Record<string, unknown>;
}

export interface RagSearchHit {
  chunk: Chunk;
  score: number;
  // 미래: vectorScore, bm25Score 분리 가능
}

export interface RagIndexOptions {
  domain?: string;
  persistDir?: string; // 예: .arena/rag-index
}

export class RagIndex {
  private chunks: Chunk[] = [];
  private domain: string;
  private persistDir: string | null;

  constructor(opts: RagIndexOptions = {}) {
    this.domain = opts.domain ?? "default";
    this.persistDir = opts.persistDir ? resolve(opts.persistDir) : null;
  }

  get size(): number { return this.chunks.length; }

  addDocuments(docs: RagDocument[]): number {
    let added = 0;
    for (const doc of docs) {
      const cs = chunkText(doc.text, doc.source);
      for (const c of cs) {
        if (doc.metadata) c.metadata = { ...c.metadata, ...doc.metadata };
        this.chunks.push(c);
        added++;
      }
    }
    return added;
  }

  addChunks(chunks: Chunk[]): void {
    this.chunks.push(...chunks);
  }

  clear(): void { this.chunks = []; }

  /**
   * 하이브리드 검색: TF-IDF cosine + source cue bonus + recency bonus(선택)
   * 현재는 sparse만, dense vector는 opts.vectorSearch로 주입 가능 (미래 슬롯)
   */
  search(query: string, topK = 5, opts?: { vectorScores?: Map<string, number>; recencyBoost?: Map<string, number> }): RagSearchHit[] {
    if (this.chunks.length === 0 || !query.trim()) return [];
    const qTokens = tokenize(query);
    if (qTokens.length === 0) return [];
    const qTf = tf(qTokens);

    // IDF 계산
    const df = new Map<string, number>();
    const docInfos = this.chunks.map(c => {
      const text = `${c.source} ${c.text}`;
      const tokens = tokenize(text);
      const uniq = new Set(tokens);
      for (const tk of uniq) df.set(tk, (df.get(tk) ?? 0) + 1);
      return { chunk: c, tokens, tf: tf(tokens) };
    });

    const N = docInfos.length || 1;
    const idf = new Map<string, number>();
    for (const [tk, cnt] of df) idf.set(tk, Math.log((N + 1) / (cnt + 1)) + 1);

    const weigh = (m: Map<string, number>) => {
      const out = new Map<string, number>();
      for (const [tk, w] of m) out.set(tk, w * (idf.get(tk) ?? 1));
      return out;
    };

    const qVec = weigh(qTf);
    const scored = docInfos.map(d => {
      const dVec = weigh(d.tf);
      let score = cosine(qVec, dVec);

      // source cue bonus: 쿼리 토큰이 source 경로에 있으면 가산
      const sourceTokens = new Set(tokenize(d.chunk.source));
      for (const qt of qTokens) if (sourceTokens.has(qt)) score += 0.08;

      // 미래 슬롯: dense vector 점수 합성 (0.5 가중)
      if (opts?.vectorScores?.has(d.chunk.id)) {
        score = score * 0.5 + (opts.vectorScores.get(d.chunk.id)! * 0.5);
      }
      // recency boost
      if (opts?.recencyBoost?.has(d.chunk.id)) {
        score += opts.recencyBoost.get(d.chunk.id)! * 0.1;
      }

      return { chunk: d.chunk, score };
    });

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, topK);
  }

  // --- Persist (선택) ---
  persist(): string | null {
    if (!this.persistDir) return null;
    try {
      mkdirSync(this.persistDir, { recursive: true });
      const p = join(this.persistDir, `${this.domain}.json`);
      writeFileSync(p, JSON.stringify(this.chunks, null, 2), "utf-8");
      return p;
    } catch { return null; }
  }

  load(): boolean {
    if (!this.persistDir) return false;
    const p = join(this.persistDir, `${this.domain}.json`);
    if (!existsSync(p)) return false;
    try {
      const raw = readFileSync(p, "utf-8");
      const arr = JSON.parse(raw) as Chunk[];
      this.chunks = arr;
      return true;
    } catch { return false; }
  }

  static async fromFiles(files: Array<{ path: string; content: string }>, opts?: RagIndexOptions): Promise<RagIndex> {
    const idx = new RagIndex(opts);
    idx.addDocuments(files.map(f => ({ source: f.path, text: f.content })));
    return idx;
  }
}

export { chunkText } from "./chunker.js";
export type { Chunk } from "./chunker.js";
