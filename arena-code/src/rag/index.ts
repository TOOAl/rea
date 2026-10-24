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
import { getEmbedder, type Embedder } from "./embedder.js";
import { VectorStore } from "./store.js";

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
  embedder?: Embedder;
  vectorStoreDir?: string; // .vectors.json 저장 위치 — 없으면 persistDir 사용
}

export class RagIndex {
  private chunks: Chunk[] = [];
  private vectors: Map<string, number[]> = new Map(); // chunkId -> vector (하이브리드용)
  private domain: string;
  private persistDir: string | null;
  private embedder: Embedder | null;
  private vectorStore: VectorStore | null;

  constructor(opts: RagIndexOptions = {}) {
    this.domain = opts.domain ?? "default";
    this.persistDir = opts.persistDir ? resolve(opts.persistDir) : null;
    this.embedder = opts.embedder ?? null; // null이면 getEmbedder() lazy 사용 (API 0 HashEmbedder)
    this.vectorStore = this.persistDir ? new VectorStore(opts.vectorStoreDir ?? this.persistDir) : null;
  }

  get size(): number { return this.chunks.length; }
  get hasVectors(): boolean { return this.vectors.size > 0; }

  /** 청크 추가 시 벡터도 함께 생성 (API 0 — 해시 임베딩) */
  private ensureVector(chunk: Chunk): void {
    if (!this.embedder && !this.vectors.has(chunk.id)) {
      // lazy: 기본 임베더 사용하지만 벡터는 buildVectors()에서 일괄 생성하는 것이 효율적
      return;
    }
    if (this.embedder && !this.vectors.has(chunk.id)) {
      this.vectors.set(chunk.id, this.embedder.embed(chunk.text));
    }
  }

  addDocuments(docs: RagDocument[]): number {
    let added = 0;
    for (const doc of docs) {
      const cs = chunkText(doc.text, doc.source);
      for (const c of cs) {
        if (doc.metadata) c.metadata = { ...c.metadata, ...doc.metadata };
        this.chunks.push(c);
        this.ensureVector(c);
        added++;
      }
    }
    return added;
  }

  addChunks(chunks: Chunk[]): void {
    this.chunks.push(...chunks);
    for (const c of chunks) this.ensureVector(c);
  }

  clear(): void { this.chunks = []; this.vectors.clear(); }

  /** 벡터 일괄 구축 + 영속화 — js-tiktoken 하이브리드의 핵심 (외부 API 0) */
  async buildVectors(embedder?: Embedder): Promise<number> {
    const emb = embedder ?? this.embedder ?? getEmbedder();
    let count = 0;
    for (const c of this.chunks) {
      if (!this.vectors.has(c.id)) {
        this.vectors.set(c.id, emb.embed(`${c.source} ${c.text}`));
        count++;
      }
    }
    if (this.vectorStore) this.vectorStore.save(this.domain, this.vectors);
    return count;
  }

  /** 벡터 로드 (persist된 .vectors.json) */
  loadVectors(): boolean {
    if (!this.vectorStore) return false;
    const loaded = this.vectorStore.load(this.domain);
    if (!loaded) return false;
    this.vectors = loaded;
    return true;
  }

  /** 하이브리드 검색: TF-IDF + dense vector(해시 임베딩, API 0) 자동 합성 */
  async searchHybrid(query: string, topK = 5, opts?: { recencyBoost?: Map<string, number>; wSparse?: number; wDense?: number }): Promise<RagSearchHit[]> {
    // 벡터가 있으면 자동 하이브리드, 없으면 sparse만
    if (this.vectors.size === 0 && this.vectorStore) this.loadVectors();
    if (this.vectors.size > 0) {
      const emb = getEmbedder();
      const qVec = emb.embed(query);
      const vectorScores = new Map<string, number>();
      for (const [id, vec] of this.vectors) {
        vectorScores.set(id, emb.similarity(qVec, vec));
      }
      return this.search(query, topK, { vectorScores, recencyBoost: opts?.recencyBoost, wSparse: opts?.wSparse, wDense: opts?.wDense } as any);
    }
    return this.search(query, topK, opts);
  }

  /**
   * 하이브리드 검색: TF-IDF cosine + dense vector(0.5:0.5) + source cue bonus
   */
  search(query: string, topK = 5, opts?: { vectorScores?: Map<string, number>; recencyBoost?: Map<string, number>; wSparse?: number; wDense?: number }): RagSearchHit[] {
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

      // 하이브리드: dense vector 점수 합성 (wSparse:wDense 기본 0.5:0.5 — 외부 API 0 해시 임베딩)
      const wSparse = opts?.wSparse ?? 0.5;
      const wDense = opts?.wDense ?? 0.5;
      if (opts?.vectorScores?.has(d.chunk.id)) {
        const vScore = opts.vectorScores.get(d.chunk.id)!;
        score = score * wSparse + vScore * wDense;
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

  // --- Persist (청크 + 벡터 함께 영속화 — 벡터는 .vectors.json) ---
  persist(): string | null {
    if (!this.persistDir) return null;
    try {
      mkdirSync(this.persistDir, { recursive: true });
      const p = join(this.persistDir, `${this.domain}.json`);
      writeFileSync(p, JSON.stringify(this.chunks, null, 2), "utf-8");
      if (this.vectors.size > 0 && this.vectorStore) this.vectorStore.save(this.domain, this.vectors);
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
      if (this.vectorStore) this.loadVectors();
      return true;
    } catch { return false; }
  }

  static async fromFiles(files: Array<{ path: string; content: string }>, opts?: RagIndexOptions): Promise<RagIndex> {
    const idx = new RagIndex(opts);
    idx.addDocuments(files.map(f => ({ source: f.path, text: f.content })));
    return idx;
  }

  /** workspace 자동 색인: .memory-bank + .arena/harness2/library + docs — API 0으로 rea 흡수 */
  static async fromWorkspace(cwd: string, opts?: RagIndexOptions): Promise<RagIndex> {
    const { readFile } = await import("node:fs/promises");
    const { existsSync, readdirSync, statSync } = await import("node:fs");
    const fg = (await import("fast-glob")).default;
    const idx = new RagIndex(opts);
    const patterns = [
      ".memory-bank/**/*.md",
      ".arena/harness2/library/**/EXPERIENCE.md",
      ".arena/harness2/library/**/INDEX.md",
      "arena-code/.memory-bank/**/*.md",
      "arena-code/docs/**/*.md",
      "docs/**/*.md",
    ];
    const files: string[] = [];
    for (const pat of patterns) {
      try {
        const found = await fg(pat, { cwd, absolute: false, ignore: ["**/node_modules/**", "**/.git/**", "**/dist/**"], dot: false });
        files.push(...found);
      } catch {}
    }
    const uniq = [...new Set(files)].slice(0, 120);
    for (const rel of uniq) {
      try {
        const abs = `${cwd}/${rel}`;
        if (!existsSync(abs) || statSync(abs).isDirectory()) continue;
        const text = await readFile(abs, "utf-8");
        if (text.trim().length < 80) continue;
        idx.addDocuments([{ source: rel, text: text.slice(0, 12000) }]);
      } catch {}
    }
    return idx;
  }
}

export { chunkText } from "./chunker.js";
export type { Chunk } from "./chunker.js";
