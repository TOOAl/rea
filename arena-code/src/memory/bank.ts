/**
 * Memory Bank — Claude-mem 영속 기억 (phase 2A)
 * Harness Library가 도메인 경험(성공한 harness+교훈)을 저장한다면,
 * Memory Bank는 세션 간 의사결정 로그를 저장 (project/.memory-bank).
 *
 * 구조: .memory-bank/<domain>/<slug>.md
 * - cue: 언제 유용한지
 * - content: 결정/맥락
 * - evidence: 근거
 *
 * 12살 설명: 일기장 — 매일 배운 걸 적어두면 다음 날 더 잘함
 */
import { existsSync, mkdirSync, writeFileSync, readFileSync, readdirSync, statSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";

export interface MemoryEntry {
  id: string;
  cue: string;
  content: string;
  evidence?: string;
  createdAt: string;
  path: string;
}

function slug(s: string): string {
  return s.replace(/\//g, "__").replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 80);
}
function domainSlug(d: string): string {
  return d.replace(/\s*[/\\]\s*/g, "__").trim() || "default";
}

const STOP = new Set(["the","a","an","and","or","but","in","on","at","to","for","of","with","is","are","was","were","be","been","this","that","it","as","by","from","has","have","had","will","would","can","should","could","may","will","you","your","our","we","us","they","them","their","its","if","then","else","when","what","which","how","why","not","no","yes","do","does","did","done","about","into","over","under","after","before","up","down","out","so","such","than","too","very"]);
function tokenize(text: string): string[] {
  return text.toLowerCase().split(/[^a-z0-9]+/g).filter(w => w.length >=2 && w.length<=24 && !STOP.has(w));
}
function tf(tokens: string[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const t of tokens) m.set(t, (m.get(t) ?? 0)+1);
  const len = tokens.length || 1;
  for (const [k,v] of m) m.set(k, v/len);
  return m;
}
function cosine(a: Map<string,number>, b: Map<string,number>): number {
  let dot=0, na=0, nb=0;
  for (const [k,va] of a) { dot+=va*(b.get(k)??0); na+=va*va; }
  for (const [,vb] of b) nb+=vb*vb;
  const denom = Math.sqrt(na)*Math.sqrt(nb) || 1;
  return dot/denom;
}

export class MemoryBank {
  readonly root: string;
  readonly domain: string;
  readonly domainSlug: string;

  constructor(opts: { root?: string; domain: string }) {
    this.domain = opts.domain;
    this.domainSlug = domainSlug(opts.domain);
    this.root = resolve(opts.root ?? join(process.cwd(), ".memory-bank"));
  }

  get dir(): string {
    return join(this.root, this.domainSlug);
  }

  entryPath(id: string): string {
    return join(this.dir, `${slug(id)}.md`);
  }

  exists(): boolean {
    return existsSync(this.dir);
  }

  list(): MemoryEntry[] {
    if (!existsSync(this.dir)) return [];
    try {
      const files = readdirSync(this.dir).filter(f => f.endsWith(".md"));
      return files.map(f => {
        const full = join(this.dir, f);
        const raw = readFileSync(full, "utf-8");
        const cue = /cue:\s*(.+)/.exec(raw)?.[1]?.trim() ?? "";
        const content = /content:\s*([\s\S]*?)(?:\nevidence:|\ncreatedAt:)/.exec(raw)?.[1]?.trim() ?? "";
        const evidence = /evidence:\s*(.+)/.exec(raw)?.[1]?.trim() ?? "";
        const createdAt = /createdAt:\s*(.+)/.exec(raw)?.[1]?.trim() ?? "";
        return { id: f.replace(/\.md$/, "").replace(/__/g, "/"), cue, content, evidence, createdAt, path: full };
      }).sort((a,b) => b.createdAt.localeCompare(a.createdAt));
    } catch { return []; }
  }

  add(opts: { id: string; cue: string; content: string; evidence?: string }): string | null {
    if (!opts.cue.trim() || !opts.content.trim()) return null;
    const d = this.dir;
    mkdirSync(d, { recursive: true });
    const p = this.entryPath(opts.id);
    const now = new Date().toISOString();
    const md = `# ${opts.id}\n\n- cue: ${opts.cue.trim()}\n- content: ${opts.content.trim()}\n- evidence: ${opts.evidence?.trim() ?? ""}\n- createdAt: ${now}\n`;
    writeFileSync(p, md, "utf-8");
    return p;
  }

  get(id: string): MemoryEntry | null {
    const p = this.entryPath(id);
    if (!existsSync(p)) return null;
    const raw = readFileSync(p, "utf-8");
    const cue = /cue:\s*(.+)/.exec(raw)?.[1]?.trim() ?? "";
    const content = /content:\s*([\s\S]*?)(?:\nevidence:|\ncreatedAt:)/.exec(raw)?.[1]?.trim() ?? "";
    const evidence = /evidence:\s*(.+)/.exec(raw)?.[1]?.trim() ?? "";
    const createdAt = /createdAt:\s*(.+)/.exec(raw)?.[1]?.trim() ?? "";
    return { id, cue, content, evidence, createdAt, path: p };
  }

  delete(id: string): void {
    const p = this.entryPath(id);
    if (existsSync(p)) rmSync(p, { force: true });
  }

  clear(): void {
    if (existsSync(this.dir)) rmSync(this.dir, { recursive: true, force: true });
  }

  search(query: string, topK = 5): MemoryEntry[] {
    const entries = this.list();
    if (entries.length===0 || !query.trim()) return [];
    const qTokens = tokenize(query);
    if (qTokens.length===0) return [];
    const qTf = tf(qTokens);
    // df/idf
    const df = new Map<string, number>();
    const docs = entries.map(e => {
      const text = [e.cue, e.content, e.evidence ?? ""].join(" ");
      const tokens = tokenize(text);
      const uniq = new Set(tokens);
      for (const tk of uniq) df.set(tk, (df.get(tk)??0)+1);
      return { entry: e, tokens, tf: tf(tokens) };
    });
    const N = docs.length || 1;
    const idf = new Map<string, number>();
    for (const [tk,cnt] of df) idf.set(tk, Math.log((N+1)/(cnt+1))+1);
    const weigh = (m: Map<string,number>) => {
      const out = new Map<string,number>();
      for (const [tk,w] of m) out.set(tk, w*(idf.get(tk)??1));
      return out;
    };
    const qVec = weigh(qTf);
    const scored = docs.map(d => {
      const dVec = weigh(d.tf);
      let score = cosine(qVec, dVec);
      // cue bonus
      const cueTokens = new Set(tokenize(d.entry.cue));
      for (const qt of qTokens) if (cueTokens.has(qt)) score += 0.1;
      return { entry: d.entry, score };
    });
    scored.sort((a,b) => b.score-a.score);
    return scored.slice(0, topK).map(s=>s.entry);
  }

  static listDomains(root?: string): string[] {
    const base = resolve(root ?? join(process.cwd(), ".memory-bank"));
    if (!existsSync(base)) return [];
    try {
      return readdirSync(base).filter(n => { try { return statSync(join(base,n)).isDirectory(); } catch { return false; }}).sort();
    } catch { return []; }
  }
}
