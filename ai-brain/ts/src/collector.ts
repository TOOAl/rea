import { readFileSync } from "node:fs";
import type { EvidenceItem } from "./contracts.ts";

// Delegation boundary: data collection and simple work live OUTSIDE the
// brain. The brain only consumes normalized evidence with provenance.
export interface Collector {
  collect(query: string): Promise<EvidenceItem[]>;
}

// Character bigram containment — overlap over the smaller set,
// robust when a short query is matched against longer documents.
// Mirrors the Python service's retrieval.
function bigrams(s: string): Set<string> {
  const out = new Set<string>();
  for (let i = 0; i < s.length - 1; i++) out.add(s.slice(i, i + 2));
  return out;
}

function similarity(a: string, b: string): number {
  const A = bigrams(a);
  const B = bigrams(b);
  if (A.size === 0 || B.size === 0) return 0;
  let inter = 0;
  for (const x of A) if (B.has(x)) inter += 1;
  return inter / Math.min(A.size, B.size);
}

// Offline retrieval over the shared corpus (single source of truth:
// data/corpus.json, also served by the Python microservice).
export class MockCollector implements Collector {
  private corpus: EvidenceItem[];

  constructor(corpusPath: string) {
    this.corpus = JSON.parse(readFileSync(corpusPath, "utf8")) as EvidenceItem[];
  }

  async collect(query: string): Promise<EvidenceItem[]> {
    return this.corpus
      .map((doc) => ({ doc, score: similarity(query, doc.text) }))
      .filter((x) => x.score >= 0.15)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map((x) => x.doc);
  }
}

// Real delegation: an external data-collection agent (here: the Python
// microservice; later: any MCP server, including REA itself).
export class HttpCollector implements Collector {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  async collect(query: string): Promise<EvidenceItem[]> {
    const res = await fetch(`${this.baseUrl}/collect`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ query }),
    });
    if (!res.ok) throw new Error(`collector failed: ${res.status}`);
    const data = (await res.json()) as { evidence: EvidenceItem[] };
    return data.evidence;
  }
}
