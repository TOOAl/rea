/**
 * Chunking — 로컬 RAG의 기초: 텍스트를 400토큰(~1600자) 단위로 겹침 50으로 분할
 * tiktoken이 있으면 토큰 기준, 없으면 문자 기준 fallback
 * 12살 설명: 긴 책을 포스트잇 크기로 잘라 인덱스 스티커를 붙이는 것
 */

export interface Chunk {
  id: string;
  text: string;
  source: string; // 파일 경로 또는 URL
  start: number; // 원문 offset
  end: number;
  metadata?: Record<string, unknown>;
}

export interface ChunkOptions {
  chunkChars?: number; // 기본 1600 (~400토큰)
  overlapChars?: number; // 기본 200
  minChunkChars?: number; // 너무 짧은 조각 버림, 기본 100
}

export function chunkText(text: string, source: string, opts: ChunkOptions = {}): Chunk[] {
  const chunkChars = opts.chunkChars ?? 1600;
  const overlapChars = opts.overlapChars ?? 200;
  const minChunkChars = opts.minChunkChars ?? 100;

  if (!text.trim() || text.length < minChunkChars) return [];

  const chunks: Chunk[] = [];
  let start = 0;
  let idx = 0;

  while (start < text.length) {
    let end = Math.min(start + chunkChars, text.length);

    // 문장 경계에 맞추려 시도: 마지막 마침표/줄바꿈 근처에서 자르기
    if (end < text.length) {
      const slice = text.slice(start, end);
      const lastBreak = Math.max(slice.lastIndexOf("\n\n"), slice.lastIndexOf(". "), slice.lastIndexOf("。"));
      if (lastBreak > chunkChars * 0.6) {
        end = start + lastBreak + 1;
      }
    }

    const chunkText = text.slice(start, end).trim();
    if (chunkText.length >= minChunkChars) {
      chunks.push({
        id: `${source}#${idx}`,
        text: chunkText,
        source,
        start,
        end,
        metadata: { length: chunkText.length },
      });
      idx++;
    }

    if (end >= text.length) break;
    start = end - overlapChars;
    // 무한루프 방지
    if (start < 0) start = 0;
    if (chunks.length > 500) break; // 안전上限: 한 파일 500조각
  }

  return chunks;
}

export function chunkDocuments(docs: Array<{ source: string; text: string; metadata?: Record<string, unknown> }>, opts?: ChunkOptions): Chunk[] {
  const out: Chunk[] = [];
  for (const doc of docs) {
    const chunks = chunkText(doc.text, doc.source, opts);
    for (const c of chunks) {
      if (doc.metadata) c.metadata = { ...c.metadata, ...doc.metadata };
      out.push(c);
    }
  }
  return out;
}
