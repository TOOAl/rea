/**
 * Embedder — API 없이 rea로 흡수: 로컬 해시 임베딩 + 하이브리드 검색
 * 설계: 해시 기반 128차원 정규화 벡터 — 외부 API 0, 결정적, 즉시 동작
 * 향후: @xenova/transformers (MiniLM) 또는 OpenAI API로 교체 가능 — 인터페이스는 동일
 * 12살: 지문을 숫자로 바꾸는 도장 — 같은 뜻은 비슷한 숫자가 찍힘
 */

export interface Embedder {
  dim: number;
  embed(text: string): number[];
  embedBatch(texts: string[]): number[][];
  similarity(a: number[], b: number[]): number; // cosine
}

// FNV-1a 해시
function fnvHash(str: string, seed = 0): number {
  let h = seed + 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function tokenizeForEmbed(text: string): string[] {
  // 한글/영문 2글자 이상
  return text.toLowerCase().split(/[^a-z0-9가-힣]+/g).filter(w => w.length >= 2 && w.length <= 20);
}

/**
 * HashEmbedder — 128차원, L2 정규화, n-gram(1-2) 해시
 * 장점: API 0, 한글 지원, 결정적. 단점: 의미 이해는 TF-IDF보다 약간 나음 — 하이브리드로 보완
 */
export class HashEmbedder implements Embedder {
  dim: number;
  constructor(dim = 128) { this.dim = dim; }

  embed(text: string): number[] {
    const vec = new Array(this.dim).fill(0);
    const tokens = tokenizeForEmbed(text);
    // 1-gram
    for (const tok of tokens) {
      const h = fnvHash(tok) % this.dim;
      vec[h] += 1;
      // 2-gram
    }
    for (let i = 0; i < tokens.length - 1; i++) {
      const bigram = tokens[i] + "_" + tokens[i + 1];
      const h = fnvHash(bigram) % this.dim;
      vec[h] += 0.5;
    }
    // L2 정규화
    const norm = Math.sqrt(vec.reduce((s, v) => s + v * v, 0)) || 1;
    return vec.map(v => v / norm);
  }

  embedBatch(texts: string[]): number[][] {
    return texts.map(t => this.embed(t));
  }

  similarity(a: number[], b: number[]): number {
    let dot = 0, na = 0, nb = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      na += a[i] * a[i];
      nb += b[i] * b[i];
    }
    const denom = Math.sqrt(na) * Math.sqrt(nb) || 1;
    return dot / denom;
  }
}

// 싱글톤 — 기본 임베더 (API 0)
let defaultEmbedder: Embedder | null = null;
export function getDefaultEmbedder(): Embedder {
  if (!defaultEmbedder) defaultEmbedder = new HashEmbedder(128);
  return defaultEmbedder;
}

// 외부 임베더 교체 슬롯 — 예: OpenAI, Xenova
let customEmbedder: Embedder | null = null;
export function setEmbedder(e: Embedder | null) { customEmbedder = e; }
export function getEmbedder(): Embedder { return customEmbedder ?? getDefaultEmbedder(); }
