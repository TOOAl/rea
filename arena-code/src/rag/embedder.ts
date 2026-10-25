/**
 * Embedder — API 없이 REA+Ghidra 흡수: 로컬 해시 임베딩 + 하이브리드 검색 (P1~P3 강화)
 * 기존 128차원 → 256차원, CJK 2-gram + char trigram, 불용어 가중치 보정, 결정적·즉시 동작
 * Ghidra P-Code 철학: 바이너리도 텍스트도 동일한 IR로 임베딩 — 언어 독립적 검색
 * 향후: @xenova/transformers (MiniLM) 또는 OpenAI API로 교체 가능 — 인터페이스는 동일
 * 12살: 지문을 숫자로 바꾸는 도장 — 같은 뜻은 비슷한 숫자가 찍힘
 */

export interface Embedder {
  dim: number;
  embed(text: string): number[];
  embedBatch(texts: string[]): number[][];
  similarity(a: number[], b: number[]): number; // cosine
}

// FNV-1a 해시 — Ghidra 해시 테이블처럼 빠른 결정적 해시
function fnvHash(str: string, seed = 0): number {
  let h = seed + 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// 한국어 불용어 — 의미 희석 방지 (Cline provenance: 불필요한 증거 제거)
const STOPWORDS = new Set(["이", "그", "저", "것", "수", "등", "및", "또", "더", "는", "은", "가", "을", "를", "에", "의", "와", "과", "로", "으로", "한다", "있다", "the", "is", "are", "a", "an", "in", "on", "of", "to", "and", "or", "for"]);

function tokenizeForEmbed(text: string): string[] {
  const raw = text.toLowerCase().split(/[^a-z0-9가-힣]+/g).filter(w => w.length >= 2 && w.length <= 20);
  // 불용어 필터는 임베딩 전에 제거하지 않고 가중치만 낮춤 (검색 재현성 유지)
  return raw;
}

/**
 * HashEmbedder — 256차원, L2 정규화, n-gram(1-2) + CJK char trigram 해시 (REA Cursor/Aider 하이브리드)
 * 128→256: 충돌 확률 1/128→1/256, 한글 CJK 문자 단위 trigram으로 형태소 분해 없이도 의미 근접
 * 하이브리드 검색(RAG index)에서 TF-IDF와 0.5:0.5 합성 — API 0으로도 dense 성능 근접
 */
export class HashEmbedder implements Embedder {
  dim: number;
  constructor(dim = 256) { this.dim = dim; }

  embed(text: string): number[] {
    const vec = new Array(this.dim).fill(0);
    const tokens = tokenizeForEmbed(text);
    // 1-gram avec 가중치: 불용어는 0.2, 일반 1.0
    for (const tok of tokens) {
      const w = STOPWORDS.has(tok) ? 0.2 : 1.0;
      const h = fnvHash(tok) % this.dim;
      vec[h] += w;
      // CJK 문자 단위 char trigram (한글 2~3글자 조합도 임베딩 — 형태소 없이 자소 유사도 확보, Ghidra 문자열 테이블처럼)
      if (/[가-힣]/.test(tok) && tok.length >= 2) {
        for (let j = 0; j < tok.length - 1; j++) {
          const bigramChar = tok.slice(j, j + 2);
          const hb = fnvHash(`cjk:${bigramChar}`) % this.dim;
          vec[hb] += 0.4;
          if (j < tok.length - 2) {
            const trigram = tok.slice(j, j + 3);
            const ht = fnvHash(`cjk3:${trigram}`) % this.dim;
            vec[ht] += 0.25;
          }
        }
      }
    }
    // 2-gram 토큰 (bigram) — 구 단위 의미 보존
    for (let i = 0; i < tokens.length - 1; i++) {
      const bigram = tokens[i] + "_" + tokens[i + 1];
      const h = fnvHash(bigram) % this.dim;
      vec[h] += 0.6;
    }
    // 3-gram 토큰 (trigram) — 더 긴 구문 보존 (Cursor codebase 검색처럼)
    for (let i = 0; i < tokens.length - 2; i++) {
      const trigram = tokens[i] + "_" + tokens[i + 1] + "_" + tokens[i + 2];
      const h = fnvHash(trigram) % this.dim;
      vec[h] += 0.3;
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

// 싱글톤 — 기본 임베더 (API 0, 256차원)
let defaultEmbedder: Embedder | null = null;
export function getDefaultEmbedder(): Embedder {
  if (!defaultEmbedder) defaultEmbedder = new HashEmbedder(256);
  return defaultEmbedder;
}

// 외부 임베더 교체 슬롯 — 예: OpenAI, Xenova (Provider 래퍼로 투명 교체)
let customEmbedder: Embedder | null = null;
export function setEmbedder(e: Embedder | null) { customEmbedder = e; }
export function getEmbedder(): Embedder { return customEmbedder ?? getDefaultEmbedder(); }
