/**
 * Shared Text Utilities — RAG + MemoryBank 중복 제거
 * 단일 진실 원천: STOP, tokenize, tf, cosine
 * 이전: memory/bank.ts와 rag/index.ts에 각각 복붙 → 분산 → 한글 STOP 불일치
 */

export const STOP = new Set([
  "the",
  "a",
  "an",
  "and",
  "or",
  "but",
  "in",
  "on",
  "at",
  "to",
  "for",
  "of",
  "with",
  "is",
  "are",
  "was",
  "were",
  "be",
  "been",
  "this",
  "that",
  "it",
  "as",
  "by",
  "from",
  "has",
  "have",
  "had",
  "will",
  "would",
  "can",
  "should",
  "could",
  "may",
  "you",
  "your",
  "our",
  "we",
  "us",
  "they",
  "them",
  "their",
  "its",
  "if",
  "then",
  "else",
  "when",
  "what",
  "which",
  "how",
  "why",
  "not",
  "no",
  "yes",
  "do",
  "does",
  "did",
  "done",
  "about",
  "into",
  "over",
  "under",
  "after",
  "before",
  "up",
  "down",
  "out",
  "so",
  "such",
  "than",
  "too",
  "very",
  "는",
  "이",
  "가",
  "을",
  "를",
  "의",
  "에",
  "에서",
  "으로",
  "와",
  "과",
  "도",
  "은",
  "는",
  "다",
  "요",
  "까",
  "네",
  "고",
  "한",
  "하다",
]);

export function tokenize(text: string): string[] {
  const out: string[] = [];
  for (const w of text.toLowerCase().split(/[^a-z0-9가-힣]+/g)) {
    if (w.length >= 2 && w.length <= 24 && !STOP.has(w)) out.push(w);
  }
  return out;
}

export function tf(tokens: string[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const t of tokens) m.set(t, (m.get(t) ?? 0) + 1);
  const len = tokens.length || 1;
  for (const [k, v] of m) m.set(k, v / len);
  return m;
}

export function cosine(a: Map<string, number>, b: Map<string, number>): number {
  let dot = 0,
    na = 0,
    nb = 0;
  for (const [k, va] of a) {
    dot += va * (b.get(k) ?? 0);
    na += va * va;
  }
  for (const [, vb] of b) nb += vb * vb;
  const denom = Math.sqrt(na) * Math.sqrt(nb) || 1;
  return dot / denom;
}
