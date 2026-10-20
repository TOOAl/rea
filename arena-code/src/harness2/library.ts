/**
 * Library — Harnessing-level recursion (Phase H4)
 * Google Harness² (google-research/harness2, Apache 2.0)
 * → Arena Code 포팅: harness2/core/library.py (222줄) 핵심 TS 재구현
 *
 * 개념: 같은 도메인의 이전 작업에서 성공한 하네스 + 교훈을 모아
 * 다음 작업의 Evidence Tree에 context/library로 전달 → 점점 똑똑해짐
 *
 * 구조 (Arena 간소화):
 *   .arena/harness2/library/<domain>/
 *     INDEX.md                              ← 도메인 내 모든 작업 cue 요약
 *     harnesses/<taskId>/harness/<rel>      ← 전체 트리 원본
 *     harnesses/<taskId>/EXPERIENCE.md      ← why + edits + lesson
 *
 * 12살 설명: 요리 도서관!
 *   - 매번 요리하고 나서 "이 요리는 이렇게 하니 잘 됐다"를 책으로 적어 도서관에 꽂음
 *   - 다음에 비슷한 요리를 할 때 도서관에서 책을 꺼내 보면 더 잘 할 수 있음
 */

import { existsSync, mkdirSync, writeFileSync, readFileSync, readdirSync, statSync, rmSync } from "node:fs";
import { resolveLibraryId as ctxResolveLibraryId, queryDocs as ctxQueryDocs, type ResolvedLibrary } from "./context7.js";
import { join, resolve, dirname } from "node:path";
import type { Tree } from "./harness.js";
import { writeTree, readTree, ARENA_SURFACE } from "./harness.js";
import { assertNoGraderVerdictsInTree } from "./context.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Experience {
  cue: string;            // 언제 이 교훈이 유용한지 (예: "인증 관련 작업")
  lesson: string;         // 교훈 본문
  evidence: string;       // 근거 (어떤 궤적에서 배웠는지)
  confidence?: string;    // 확신도 (선택)
  edits?: string;         // 각 edit이 한 일 (선택)
}

export interface LibraryEntry {
  taskId: string;
  label: string;          // 예: "compose-1"
  runId?: string;
  why?: string;            // 왜 채택됐는지
  harness: Tree;
  experience: Experience;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function slug(taskId: string): string {
  return taskId.replace(/\//g, "__").replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 80);
}

function domainDir(domain: string): string {
  return domain.replace(/\s*[/\\]\s*/g, "__").trim() || "unknown";
}

export function hasExperience(exp: unknown): boolean {
  if (typeof exp !== "object" || exp === null) return false;
  const e = exp as Record<string, unknown>;
  return ["cue", "lesson", "evidence"].every(k => typeof e[k] === "string" && (e[k] as string).trim().length > 0);
}

function inventory(harness: Tree): string {
  const keys = Object.keys(harness).sort();
  if (keys.length === 0) return "(empty)";
  return keys.slice(0, 6).join(", ") + (keys.length > 6 ? ` +${keys.length - 6} more` : "");
}

function field(path: string, key: string): string {
  if (!existsSync(path)) return "";
  try {
    const text = readFileSync(path, "utf-8");
    const re = new RegExp(`^- \\*\\*${key}\\*\\*: (.+)$`, "m");
    const m = re.exec(text);
    return m ? m[1].trim() : "";
  } catch { return ""; }
}

// ---------------------------------------------------------------------------
// Library — 도메인별 도서관
// ---------------------------------------------------------------------------

const STOP = new Set(["the","a","an","and","or","but","in","on","at","to","for","of","with","is","are","was","were","be","been","this","that","it","as","by","from","are","has","have","had","will","would","can","should","could","may","will","you","your","our","we","us","they","them","their","its","if","then","else","when","what","which","how","why","not","no","yes","do","does","did","done","about","into","over","under","after","before","up","down","out","so","such","than","too","very"]);

function tokenize(text: string): string[] {
  return text.toLowerCase().split(/[^a-z0-9]+/g).filter(w => w.length >= 2 && w.length <= 24 && !STOP.has(w));
}
function tf(tokens: string[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const tt of tokens) m.set(tt, (m.get(tt) ?? 0) + 1);
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
export interface RagHit {
  slug: string; taskId: string; score: number; cue: string; lesson: string; evidence: string; why: string; harnessKeys: string; path: string;
}

export class HarnessLibrary {
  readonly root: string;     // 예: .arena/harness2/library
  readonly domain: string;
  readonly domainSlug: string;

  constructor(opts: { root?: string; domain: string }) {
    this.domain = opts.domain;
    this.domainSlug = domainDir(opts.domain);
    this.root = resolve(opts.root ?? join(process.cwd(), ".arena", "harness2", "library"));
  }

  get dir(): string {
    return join(this.root, this.domainSlug);
  }

  get indexPath(): string {
    return join(this.dir, "INDEX.md");
  }

  entryDir(taskId: string): string {
    return join(this.dir, "harnesses", slug(taskId));
  }

  exists(): boolean {
    return existsSync(this.indexPath);
  }

  /** Evidence Tree에 넣을 디렉토리 (없으면 null) */
  contextDir(): string | null {
    if (!this.exists()) return null;
    try {
      const entries = readdirSync(this.dir);
      if (!entries.includes("harnesses")) return null;
      const harnesses = readdirSync(join(this.dir, "harnesses"));
      if (harnesses.length === 0) return null;
      // EXPERIENCE.md가 하나라도 있으면 있음
      for (const h of harnesses) {
        if (existsSync(join(this.dir, "harnesses", h, "EXPERIENCE.md"))) return this.dir;
      }
      return null;
    } catch { return null; }
  }

  entries(): string[] {
    const d = join(this.dir, "harnesses");
    if (!existsSync(d)) return [];
    try {
      return readdirSync(d).filter(n => {
        try { return statSync(join(d, n)).isDirectory(); } catch { return false; }
      }).sort();
    } catch { return []; }
  }

  treeOf(taskId: string): Tree {
    return readTree(ARENA_SURFACE, join(this.entryDir(taskId), "harness"));
  }

  /** 한 건 추가 — experience가 없으면 저장 안 함 (원본과 동일) */
  add(opts: {
    taskId: string;
    harness: Tree;
    label: string;
    runId?: string;
    why?: string;
    experience: Experience;
  }): string | null {
    if (!hasExperience(opts.experience)) return null;

    // 유출 검사
    assertNoGraderVerdictsInTree(opts.harness);
    const expStr = JSON.stringify(opts.experience) + (opts.why ?? "");
    assertNoGraderVerdictsInTree({ "EXPERIENCE.md": expStr });

    const d = this.entryDir(opts.taskId);
    // 기존 제거 후 재생성
    if (existsSync(join(d, "harness"))) rmSync(join(d, "harness"), { recursive: true, force: true });
    mkdirSync(join(d, "harness"), { recursive: true });
    writeTree(ARENA_SURFACE, opts.harness, join(d, "harness"), { stubs: false });

    const lines: string[] = [
      `# ${opts.taskId}`,
      "",
      `- adopted: \`${opts.label}\`` + (opts.runId ? `  (run \`${opts.runId}\`)` : ""),
      `- components: ${inventory(opts.harness)}`,
      "",
    ];
    if (opts.why?.trim()) {
      lines.push("## Why this was chosen", opts.why.trim(), "");
    }
    if (opts.experience.edits) {
      lines.push("## What each edit did", opts.experience.edits.trim(), "");
    }
    if (opts.experience.lesson) {
      lines.push("## Transferable lesson");
      for (const f of ["cue", "lesson", "evidence", "confidence"] as const) {
        const v = (opts.experience as unknown as Record<string, string>)[f];
        if (v) lines.push(`- **${f}**: ${v.trim()}`);
      }
      lines.push("");
    }

    writeFileSync(join(d, "EXPERIENCE.md"), lines.join("\n"), "utf-8");
    this.rebuildIndex();
    return d;
  }

  /** 특정 task들 제거 */
  forget(taskIds: string[]): void {
    let removed = false;
    for (const tid of taskIds) {
      const d = this.entryDir(tid);
      if (existsSync(d)) {
        rmSync(d, { recursive: true, force: true });
        removed = true;
      }
    }
    if (removed) this.rebuildIndex();
  }

  /** 현재 stream 이전 것들만 남기기 */
  retain(taskIds: string[]): void {
    const keep = new Set(taskIds.map(slug));
    const all = this.entries();
    const toRemove = all.filter(e => !keep.has(e));
    if (toRemove.length > 0) {
      const taskIdsToRemove = toRemove.map(e => e.replace(/__/g, "/"));
      this.forget(taskIdsToRemove);
    }
  }

  private docText(slugName: string): { cue: string; lesson: string; evidence: string; why: string; harnessKeys: string } {
    const ed = join(this.dir, "harnesses", slugName);
    const expPath = join(ed, "EXPERIENCE.md");
    const cue = field(expPath, "cue");
    const lesson = field(expPath, "lesson");
    const evidence = field(expPath, "evidence");
    let why = "";
    try {
      const full = readFileSync(expPath, "utf-8");
      const m = /## Why this was chosen\n([\s\S]*?)(\n## |\n?$)/.exec(full);
      if (m) why = m[1].trim().slice(0, 500);
    } catch {}
    let harnessKeys = "";
    try {
      const tree = readTree(ARENA_SURFACE, join(ed, "harness"));
      harnessKeys = Object.keys(tree).join(", ");
    } catch {}
    return { cue, lesson, evidence, why, harnessKeys };
  }
  search(query: string, topK: number = 5): RagHit[] {
    const slugs = this.entries();
    if (slugs.length === 0 || !query.trim()) return [];
    const qTokens = tokenize(query);
    if (qTokens.length === 0) return [];
    const qTf = tf(qTokens);
    const docs: Array<{ slug: string; tokens: string[]; tf: Map<string, number>; doc: ReturnType<HarnessLibrary["docText"]> }> = [];
    const df = new Map<string, number>();
    for (const slugName of slugs) {
      const doc = this.docText(slugName);
      const text = [doc.cue, doc.lesson, doc.evidence, doc.why, doc.harnessKeys].filter(Boolean).join(" ");
      const tokens = tokenize(text);
      docs.push({ slug: slugName, tokens, tf: tf(tokens), doc });
      const uniq = new Set(tokens);
      for (const tk of uniq) df.set(tk, (df.get(tk) ?? 0) + 1);
    }
    const N = docs.length || 1;
    const idf = new Map<string, number>();
    for (const [tk, cnt] of df) idf.set(tk, Math.log((N + 1) / (cnt + 1)) + 1);
    const weigh = (m: Map<string, number>): Map<string, number> => {
      const out = new Map<string, number>();
      for (const [tk, w] of m) out.set(tk, w * (idf.get(tk) ?? 1));
      return out;
    };
    const qVec = weigh(qTf);
    const scored: RagHit[] = [];
    for (const d of docs) {
      const dVec = weigh(d.tf);
      let score = cosine(qVec, dVec);
      const cueTokens = new Set(tokenize(d.doc.cue));
      let cueBonus = 0;
      for (const qt of qTokens) if (cueTokens.has(qt)) cueBonus += 0.08;
      scored.push({ slug: d.slug, taskId: d.slug.replace(/__/g, "/"), score: score + cueBonus, cue: d.doc.cue, lesson: d.doc.lesson, evidence: d.doc.evidence, why: d.doc.why, harnessKeys: d.doc.harnessKeys, path: join(this.dir, "harnesses", d.slug) });
    }
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, Math.max(1, Math.min(topK, scored.length)));
  }
  buildRagSnapshot(query: string, topK: number = 5): string | null {
    const hits = this.search(query, topK);
    if (hits.length === 0) return null;
    const { mkdtempSync } = require("node:fs") as typeof import("node:fs");
    const { tmpdir } = require("node:os") as typeof import("node:os");
    const tmp = mkdtempSync(join(tmpdir(), "arena-rag-"));
    const dstDomain = join(tmp, this.domainSlug);
    mkdirSync(join(dstDomain, "harnesses"), { recursive: true });
    for (const h of hits) {
      const src = join(this.dir, "harnesses", h.slug);
      const dst = join(dstDomain, "harnesses", h.slug);
      try {
        const { copyFileSync: _cp, readdirSync: _rd, statSync: _st, mkdirSync: _mk } = require("node:fs") as typeof import("node:fs");
        const stack: Array<[string, string]> = [[src, dst]];
        while (stack.length) {
          const [s, d] = stack.pop()!;
          _mk(d, { recursive: true });
          for (const e of _rd(s)) {
            const se = join(s, e); const de = join(d, e);
            const st = _st(se);
            if (st.isDirectory()) stack.push([se, de]);
            else if (st.isFile()) _cp(se, de);
          }
        }
      } catch {}
    }
    const rows: string[] = [`# Library — ${this.domain} (RAG filtered: top ${hits.length} for "${query.slice(0,60)}")`, ""];
    for (const h of hits) rows.push(`## \`harnesses/${h.slug}/\``, `- score: ${h.score.toFixed(3)}`, `- cue: ${h.cue || "(none)"}`, `- harness: ${h.harnessKeys}`, "");
    writeFileSync(join(dstDomain, "INDEX.md"), rows.join("\n"), "utf-8");
    return tmp;
  }
  /** INDEX.md 재생성 */
  rebuildIndex(): string {
    const rows: string[] = [
      `# Library — ${this.domain}`,
      "",
      "Each entry is an earlier task in THIS domain whose harness was chosen, stored with its FULL component tree and why it was picked. Browse this index, then open the entries that look relevant.",
      "",
    ];
    const names = this.entries();
    if (names.length === 0) {
      rows.push("_(empty — this is the first task in this domain)_");
    }
    for (const name of names) {
      const ed = join(this.dir, "harnesses", name);
      const cue = field(join(ed, "EXPERIENCE.md"), "cue");
      const tree = readTree(ARENA_SURFACE, join(ed, "harness"));
      rows.push(
        `## \`harnesses/${name}/\``,
        `- harness: \`harnesses/${name}/harness/\` — ${inventory(tree)}`,
        `- why:     \`harnesses/${name}/EXPERIENCE.md\``,
      );
      if (cue) rows.push(`- cue:     ${cue}`);
      rows.push("");
    }
    mkdirSync(this.dir, { recursive: true });
    writeFileSync(this.indexPath, rows.join("\n"), "utf-8");
    return this.indexPath;
  }

  // --- Context7 2-tool adapter (docs/CODING_TOOLS_REA_ANALYSIS.md 3.1) ---
  async resolveLibraryId(libraryName: string, query?: string): Promise<ResolvedLibrary[]> {
    return ctxResolveLibraryId(libraryName, query);
  }
  async queryDocs(libraryId: string, query: string): Promise<{ libraryId: string; query: string; snippets: string[]; source: "context7" | "fallback" }> {
    return ctxQueryDocs(libraryId, query);
  }
  /** Context7 문서를 RAG 이전에 주입 — query → snippets를 별도 tmp로 저장 후 Evidence에 첨부 가능 */
  async buildContext7Snapshot(libraryId: string, query: string): Promise<string | null> {
    const docs = await this.queryDocs(libraryId, query);
    if (!docs.snippets.length) return null;
    const { mkdtempSync } = require("node:fs") as typeof import("node:fs");
    const { tmpdir } = require("node:os") as typeof import("node:os");
    const tmp = mkdtempSync(join(tmpdir(), "arena-ctx7-"));
    writeFileSync(join(tmp, "CTX7.md"), `# Context7 — ${libraryId}\n\nQuery: ${query}\n\n${docs.snippets.join("\n\n---\n\n")}\n`, "utf-8");
    return tmp;
  }

  /** 전체 도메인 목록 (root 하위) */
  static listDomains(root?: string): string[] {
    const base = resolve(root ?? join(process.cwd(), ".arena", "harness2", "library"));
    if (!existsSync(base)) return [];
    try {
      return readdirSync(base).filter(n => {
        try { return statSync(join(base, n)).isDirectory(); } catch { return false; }
      }).sort();
    } catch { return []; }
  }
}
