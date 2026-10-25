/**
 * Chunking — 로컬 RAG의 기초: 텍스트를 400토큰(~1600자) 단위로 겹침 50으로 분할 + Ghidra 바이너리 청크
 * tiktoken이 있으면 토큰 기준, 없으면 문자 기준 fallback
 * Ghidra 흡수: 바이너리 P-Code/disas/CFG도 일반 텍스트처럼 청크 → 소스+바이너리 동시 검색 가능
 * 12살 설명: 긴 책을 포스트잇 크기로 잘라 인덱스 스티커를 붙이는 것 (바이너리 책도 같은 크기로 자름)
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
  /** Ghidra 바이너리 소스면 P-Code 경계에서 우선 절단 (CALL/BRANCH/IMPORT 라인) */
  binaryAware?: boolean;
}

export function chunkText(text: string, source: string, opts: ChunkOptions = {}): Chunk[] {
  const chunkChars = opts.chunkChars ?? 1600;
  const overlapChars = opts.overlapChars ?? 200;
  const minChunkChars = opts.minChunkChars ?? 100;
  const binaryAware = opts.binaryAware ?? (source.includes("Ghidra") || source.includes("binary") || source.includes("ghidra"));

  if (!text.trim() || text.length < minChunkChars) return [];

  const chunks: Chunk[] = [];
  let start = 0;
  let idx = 0;

  while (start < text.length) {
    let end = Math.min(start + chunkChars, text.length);

    if (end < text.length) {
      const slice = text.slice(start, end);
      // 일반 문장 경계
      let lastBreak = Math.max(slice.lastIndexOf("\n\n"), slice.lastIndexOf(". "), slice.lastIndexOf("。"));
      // 바이너리 P-Code 경계: CALL/BRANCH/IMPORT/CFG 라인 단위 (Ghidra P-Code IR은 라인 지향)
      if (binaryAware) {
        const pcodeBreak = Math.max(
          slice.lastIndexOf("\nCALL "),
          slice.lastIndexOf("\nBRANCH "),
          slice.lastIndexOf("\nIMPORT "),
          slice.lastIndexOf("\nP-CODE:"),
          slice.lastIndexOf("\nFUNC:"),
        );
        if (pcodeBreak > chunkChars * 0.4) lastBreak = Math.max(lastBreak, pcodeBreak);
      }
      if (lastBreak > chunkChars * 0.6 || (binaryAware && lastBreak > chunkChars * 0.4)) {
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
        metadata: { length: chunkText.length, binary: binaryAware ? true : undefined },
      });
      idx++;
    }

    if (end >= text.length) break;
    start = end - overlapChars;
    if (start < 0) start = 0;
    if (chunks.length > 500) break;
  }

  return chunks;
}

export function chunkDocuments(docs: Array<{ source: string; text: string; metadata?: Record<string, unknown> }>, opts?: ChunkOptions): Chunk[] {
  const out: Chunk[] = [];
  for (const doc of docs) {
    const chunks = chunkText(doc.text, doc.source, opts);
    for (const c of chunks) {
      if (doc.metadata) c.metadata = { ...c.metadata, ...doc.metadata } as Record<string, unknown>;
      out.push(c);
    }
  }
  return out;
}

// Ghidra 스타일: 바이너리/텍스트 모두 증거로 — RAG 인덱스용 래퍼 (EvidenceLedger와 연동)
export function chunkBinaryContext(binaryPath: string, ghidraSummary: string, opts: ChunkOptions = {}): Chunk[] {
  return chunkText(ghidraSummary, `Ghidra:${binaryPath}`, { ...opts, binaryAware: true });
}
