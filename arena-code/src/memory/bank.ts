/**
 * Memory Bank — Claude-mem 영속 기억 (phase 2A) + Smart v2 (2026-10-27)
 * Harness Library가 도메인 경험(성공한 harness+교훈)을 저장한다면,
 * Memory Bank는 세션 간 의사결정 로그를 저장 (project/.memory-bank).
 *
 * v2 확장: 스코프4축/TTL/신뢰도/중복병합/하이브리드/그래프/자가편집 (REA mem0/letta/zep)
 *
 * 구조: .memory-bank/<domain>/<slug>.md
 * - cue: 언제 유용한지
 * - content: 결정/맥락
 * - evidence: 근거
 * - confidence / sourceType / referenceTime / validUntil / scope / event
 *
 * 12살 설명: 일기장 — 매일 배운 걸 적어두면 다음 날 더 잘함
 */
import {
  existsSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  readdirSync,
  statSync,
  rmSync,
} from "node:fs";
import { join, resolve } from "node:path";

export interface MemoryEntry {
  id: string;
  cue: string;
  content: string;
  evidence?: string;
  createdAt: string;
  path: string;
  // --- v2 확장: 7대 처방 ---
  scope?: MemoryScope; // D1
  confidence?: number; // D7 0..1
  sourceType?: "user" | "tool" | "llm" | string; // D7
  referenceTime?: string; // D4 Zep: 언제의 사실인가 (ISO)
  validFrom?: string; // D4
  validUntil?: string; // D4 TTL 만료 시점
  ttlDays?: number; // D4
  event?: MemoryEvent; // D2
}

export type MemoryEvent = "ADD" | "UPDATE" | "DELETE" | "NOOP";
export interface MemoryScope {
  user?: string;
  agent?: string;
  session?: string;
}
export interface FactTriple {
  subject: string;
  relation: string;
  object: string;
  sourceId: string;
}
export interface SmartScope {
  user?: string;
  agent?: string;
  session?: string;
}

import { STOP, tokenize, tf, cosine } from "../rag/text.js";

function slug(s: string): string {
  return s
    .replace(/\//g, "__")
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .slice(0, 80);
}
function domainSlug(d: string): string {
  return d.replace(/\s*[/\\]\s*/g, "__").trim() || "default";
}
function scopeToSlug(scope?: MemoryScope): string {
  if (!scope || (!scope.user && !scope.agent && !scope.session)) return "";
  const parts: string[] = [];
  if (scope.user) parts.push(`u:${slug(scope.user)}`);
  if (scope.agent) parts.push(`a:${slug(scope.agent)}`);
  if (scope.session) parts.push(`s:${slug(scope.session)}`);
  return parts.join("__");
}
function scopeFromString(s?: string): MemoryScope | undefined {
  if (!s) return undefined;
  const out: MemoryScope = {};
  for (const p of s.split("__")) {
    if (p.startsWith("u:")) out.user = p.slice(2);
    else if (p.startsWith("a:")) out.agent = p.slice(2);
    else if (p.startsWith("s:")) out.session = p.slice(2);
  }
  return Object.keys(out).length ? out : undefined;
}
// --- 파싱 헬퍼: v2 필드 ---
function parseExtras(raw: string): Partial<MemoryEntry> {
  const o: Partial<MemoryEntry> = {};
  const get = (k: string) => new RegExp(`^- ${k}:\\s*(.+)$`, "m").exec(raw)?.[1]?.trim();
  const scopeStr = get("scope");
  if (scopeStr) o.scope = scopeFromString(scopeStr);
  const conf = get("confidence");
  if (conf) {
    const n = Number(conf);
    if (!Number.isNaN(n)) o.confidence = Math.max(0, Math.min(1, n));
  }
  const st = get("sourceType");
  if (st) o.sourceType = st;
  const rt = get("referenceTime");
  if (rt) o.referenceTime = rt;
  const vf = get("validFrom");
  if (vf) o.validFrom = vf;
  const vu = get("validUntil");
  if (vu) o.validUntil = vu;
  const ttl = get("ttlDays");
  if (ttl) {
    const n = Number(ttl);
    if (!Number.isNaN(n)) o.ttlDays = n;
  }
  const ev = get("event");
  if (ev && ["ADD","UPDATE","DELETE","NOOP"].includes(ev)) o.event = ev as MemoryEvent;
  return o;
}
function isExpired(e: MemoryEntry): boolean {
  if (!e.validUntil) return false;
  const t = Date.parse(e.validUntil);
  if (Number.isNaN(t)) return false;
  return Date.now() > t;
}
function recencyScore(createdAt: string): number {
  const t = Date.parse(createdAt);
  if (Number.isNaN(t)) return 0;
  const days = (Date.now() - t) / 86400000;
  // 0일=1.0, 7일=0.7, 30일=0.4, 90일=0.1
  if (days <= 1) return 1;
  if (days <= 7) return 0.9 - (days-1)*0.03;
  if (days <= 30) return 0.7 - (days-7)*0.013;
  if (days <= 90) return 0.4 - (days-30)*0.005;
  return 0.05;
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

  // 스코프가 있으면 하위 디렉토리
  dirForScope(scope?: MemoryScope): string {
    const base = this.dir;
    const part = scopeToSlug(scope);
    return part ? join(base, part) : base;
  }

  entryPath(id: string, scope?: MemoryScope): string {
    return join(this.dirForScope(scope), `${slug(id)}.md`);
  }

  // 레거시 호환: scope 없이도 찾음 (하위 디렉토리까지 탐색)
  private findEntryPath(id: string): string | null {
    const direct = this.entryPath(id);
    if (existsSync(direct)) return direct;
    // scoped 탐색: domain 하위 모든 디렉토리 스캔
    if (!existsSync(this.dir)) return null;
    try {
      const subs = readdirSync(this.dir, { withFileTypes: true }).filter(d=>d.isDirectory());
      for (const sub of subs) {
        const p = join(this.dir, sub.name, `${slug(id)}.md`);
        if (existsSync(p)) return p;
      }
    } catch {}
    return null;
  }

  exists(): boolean {
    return existsSync(this.dir);
  }

  list(opts?: { includeExpired?: boolean; scope?: MemoryScope }): MemoryEntry[] {
    const roots: string[] = [];
    if (opts?.scope) {
      roots.push(this.dirForScope(opts.scope));
    } else {
      // domain 전체: 루트 + 스코프 하위
      roots.push(this.dir);
      if (existsSync(this.dir)) {
        try {
          for (const e of readdirSync(this.dir, { withFileTypes: true })) {
            if (e.isDirectory()) roots.push(join(this.dir, e.name));
          }
        } catch {}
      }
    }
    const files: { full: string }[] = [];
    for (const r of roots) {
      if (!existsSync(r)) continue;
      try {
        for (const f of readdirSync(r).filter(f=>f.endsWith(".md") && !f.startsWith("_graph"))) {
          files.push({ full: join(r, f) });
        }
      } catch {}
    }
    // 중복 제거 (같은 id가 스코프에 중복될 수 있음 → 최신 우선, dedup by id)
    const seen = new Set<string>();
    const entries: MemoryEntry[] = [];
    for (const { full } of files) {
      try {
        const raw = readFileSync(full, "utf-8");
        const cue = /cue:\s*(.+)/.exec(raw)?.[1]?.trim() ?? "";
        const content =
          /content:\s*([\s\S]*?)(?:\nevidence:|\ncreatedAt:)/.exec(raw)?.[1]?.trim() ?? "";
        const evidence = /evidence:\s*(.+)/.exec(raw)?.[1]?.trim() ?? "";
        const createdAt = /createdAt:\s*(.+)/.exec(raw)?.[1]?.trim() ?? "";
        const extras = parseExtras(raw);
        const id = full.split("/").pop()!.replace(/\.md$/, "").replace(/__/g, "/");
        if (seen.has(id)) continue;
        seen.add(id);
        const e: MemoryEntry = {
          id,
          cue,
          content,
          evidence,
          createdAt,
          path: full,
          ...extras,
          confidence: extras.confidence ?? 0.7,
          sourceType: extras.sourceType ?? "llm",
        };
        if (!opts?.includeExpired && isExpired(e)) continue;
        entries.push(e);
      } catch {}
    }
    return entries.sort((a,b)=> b.createdAt.localeCompare(a.createdAt));
  }

  add(opts: {
    id: string;
    cue: string;
    content: string;
    evidence?: string;
    scope?: MemoryScope;
    confidence?: number;
    sourceType?: string;
    referenceTime?: string;
    validFrom?: string;
    validUntil?: string;
    ttlDays?: number;
    event?: MemoryEvent;
  }): string | null {
    if (!opts.cue.trim() || !opts.content.trim()) return null;
    const d = this.dirForScope(opts.scope);
    mkdirSync(d, { recursive: true });
    const p = join(d, `${slug(opts.id)}.md`);
    const now = new Date().toISOString();
    const conf = opts.confidence !== undefined ? `confidence: ${opts.confidence}\n` : "";
    const st = opts.sourceType ? `sourceType: ${opts.sourceType}\n` : "";
    const rt = opts.referenceTime ? `referenceTime: ${opts.referenceTime}\n` : "";
    const vf = opts.validFrom ? `validFrom: ${opts.validFrom}\n` : "";
    const vu = opts.validUntil ? `validUntil: ${opts.validUntil}\n` : opts.ttlDays ? `validUntil: ${new Date(Date.now()+ opts.ttlDays*86400000).toISOString()}\n` : "";
    const ttl = opts.ttlDays !== undefined ? `ttlDays: ${opts.ttlDays}\n` : "";
    const scopeStr = opts.scope && (opts.scope.user||opts.scope.agent||opts.scope.session) ? `scope: ${scopeToSlug(opts.scope)}\n` : "";
    const ev = opts.event ? `event: ${opts.event}\n` : "";
    const md = `# ${opts.id}\n\n- cue: ${opts.cue.trim()}\n- content: ${opts.content.trim()}\n- evidence: ${opts.evidence?.trim() ?? ""}\n- createdAt: ${now}\n${conf}${st}${rt}${vf}${vu}${ttl}${scopeStr}${ev}`;
    writeFileSync(p, md, "utf-8");
    return p;
  }

  // D2: ADD/UPDATE/DELETE/NOOP 분류 — 간단 휴리스틱 (Mem0 경량)
  classifyEvent(cue: string, content: string): { event: MemoryEvent; targetId?: string; reason: string } {
    const entries = this.list({ includeExpired: true });
    if (entries.length===0) return { event: "ADD", reason: "empty bank" };
    // 가장 유사한 기존 항목 찾기 (TF-IDF 코사인)
    const q = `${cue} ${content}`;
    const qT = tokenize(q);
    if (qT.length===0) return { event: "NOOP", reason: "no tokens" };
    const qTf = tf(qT);
    let best: { e: MemoryEntry; score: number } | null = null;
    // idf 간이: 전체 어휘 빈도로 근사
    for (const e of entries) {
      const dT = tokenize(`${e.cue} ${e.content}`);
      const dTf = tf(dT);
      // 간이 코사인 (idf 없이, 속도)
      let dot=0, na=0, nb=0;
      for (const [k,v] of qTf) { dot+= v*(dTf.get(k)??0); na+=v*v; }
      for (const [,v] of dTf) nb+=v*v;
      const score = dot / (Math.sqrt(na)*Math.sqrt(nb) ||1);
      if (!best || score > best.score) best = { e, score };
    }
    if (!best) return { event: "ADD", reason: "no match" };
    const s = best.score;
    const hasNeg = /(아니|틀렸|취소|삭제|반대|not\s+true|incorrect)/i.test(content);
    if (s >= 0.88 && hasNeg) return { event: "DELETE", targetId: best.e.id, reason: `high sim ${s.toFixed(2)} + negation` };
    if (s >= 0.78) return { event: "UPDATE", targetId: best.e.id, reason: `high sim ${s.toFixed(2)}` };
    if (s < 0.18) {
      // 무의미 짧음은 NOOP
      if (content.trim().length < 12) return { event: "NOOP", reason: `low relevance ${s.toFixed(2)} too short` };
      return { event: "ADD", reason: `low sim ${s.toFixed(2)}` };
    }
    return { event: "ADD", reason: `mid sim ${s.toFixed(2)}` };
  }

  // D2 고수준: addScoped — 분류 후 ADD/UPDATE/DELETE 자동 라우팅
  addScoped(opts: {
    id: string;
    cue: string;
    content: string;
    evidence?: string;
    scope?: MemoryScope;
    confidence?: number;
    sourceType?: string;
    ttlDays?: number;
  }): { path: string | null; event: MemoryEvent; reason: string } {
    const cls = this.classifyEvent(opts.cue, opts.content);
    if (cls.event === "NOOP") return { path: null, event: "NOOP", reason: cls.reason };
    if (cls.event === "DELETE" && cls.targetId) {
      this.delete(cls.targetId);
      return { path: null, event: "DELETE", reason: cls.reason };
    }
    if (cls.event === "UPDATE" && cls.targetId) {
      // 기존 내용에 병합 요약
      const prev = this.get(cls.targetId);
      const merged = prev ? `${prev.content} | 업데이트: ${opts.content}` : opts.content;
      const p = this.add({ ...opts, id: cls.targetId, content: merged, event: "UPDATE" });
      return { path: p, event: "UPDATE", reason: cls.reason };
    }
    const p = this.add({ ...opts, event: "ADD" });
    return { path: p, event: "ADD", reason: cls.reason };
  }

  get(id: string): MemoryEntry | null {
    const p = this.findEntryPath(id);
    if (!p || !existsSync(p)) return null;
    const raw = readFileSync(p, "utf-8");
    const cue = /cue:\s*(.+)/.exec(raw)?.[1]?.trim() ?? "";
    const content =
      /content:\s*([\s\S]*?)(?:\nevidence:|\ncreatedAt:)/.exec(raw)?.[1]?.trim() ?? "";
    const evidence = /evidence:\s*(.+)/.exec(raw)?.[1]?.trim() ?? "";
    const createdAt = /createdAt:\s*(.+)/.exec(raw)?.[1]?.trim() ?? "";
    const extras = parseExtras(raw);
    return { id, cue, content, evidence, createdAt, path: p, ...extras, confidence: extras.confidence ?? 0.7, sourceType: extras.sourceType ?? "llm" } as MemoryEntry;
  }

  // update: 기존 entry를 유지하며 패치 — Letta self-edit
  update(id: string, patch: Partial<Pick<MemoryEntry,"cue"|"content"|"evidence"|"confidence"|"validUntil">>, reason?: string): string | null {
    const cur = this.get(id);
    if (!cur) return null;
    const next = { ...cur, ...patch } as MemoryEntry;
    // 기존 scope 유지
    const d = cur.path ? cur.path.substring(0, cur.path.lastIndexOf("/")) : this.dir;
    mkdirSync(d, { recursive: true });
    const now = cur.createdAt; // createdAt 유지, evidence에 reason 추가
    const evStr = reason ? `${cur.evidence ?? ""} | update: ${reason}`.trim() : cur.evidence ?? "";
    const md = `# ${id}\n\n- cue: ${next.cue.trim()}\n- content: ${next.content.trim()}\n- evidence: ${evStr}\n- createdAt: ${now}\n- confidence: ${next.confidence ?? cur.confidence ?? 0.7}\n${next.referenceTime ? `- referenceTime: ${next.referenceTime}\n`: ""}${next.validUntil ? `- validUntil: ${next.validUntil}\n`: ""}${next.ttlDays ? `- ttlDays: ${next.ttlDays}\n`: ""}${cur.scope ? `- scope: ${scopeToSlug(cur.scope)}\n`: ""}- event: UPDATE\n`;
    writeFileSync(cur.path, md, "utf-8");
    return cur.path;
  }

  delete(id: string): void {
    const p = this.findEntryPath(id);
    if (p && existsSync(p)) rmSync(p, { force: true });
  }

  clear(): void {
    if (existsSync(this.dir))
      rmSync(this.dir, { recursive: true, force: true });
    // 스코프 하위도 정리
    try {
      for (const e of readdirSync(this.root, { withFileTypes: true })) {
        if (e.isDirectory() && e.name.startsWith(this.domainSlug)) {
          const full = join(this.root, e.name);
          if (existsSync(full)) for (const sub of readdirSync(full, { withFileTypes: true })) {
            if (sub.isDirectory()) {
              const sp = join(full, sub.name);
              if (existsSync(sp) && sp !== this.dir) rmSync(sp, { recursive: true, force: true });
            }
          }
        }
      }
    } catch {}
  }

  // --- D3: 하이브리드 + 최신성 + 신뢰도 가중 ---
  search(query: string, topK = 5, opts?: { minConfidence?: number; timeWindowDays?: number }): MemoryEntry[] {
    return this.searchHybrid(query, topK, opts);
  }

  searchHybrid(query: string, topK = 5, opts?: { minConfidence?: number; timeWindowDays?: number }): MemoryEntry[] {
    const entries = this.list({ includeExpired: false });
    let filtered = entries;
    if (opts?.minConfidence !== undefined) filtered = filtered.filter(e=> (e.confidence ?? 0.7) >= opts.minConfidence!);
    if (opts?.timeWindowDays !== undefined) {
      const cutoff = Date.now() - opts.timeWindowDays!*86400000;
      filtered = filtered.filter(e=> {
        const t = Date.parse(e.referenceTime ?? e.createdAt);
        return !Number.isNaN(t) && t >= cutoff;
      });
    }
    if (filtered.length === 0 || !query.trim()) return [];
    const qTokens = tokenize(query);
    if (qTokens.length === 0) return [];
    const qTf = tf(qTokens);
    const df = new Map<string, number>();
    const docs = filtered.map((e) => {
      const text = [e.cue, e.content, e.evidence ?? ""].join(" ");
      const tokens = tokenize(text);
      const uniq = new Set(tokens);
      for (const tk of uniq) df.set(tk, (df.get(tk) ?? 0) + 1);
      return { entry: e, tokens, tf: tf(tokens) };
    });
    const N = docs.length || 1;
    const idf = new Map<string, number>();
    for (const [tk, cnt] of df) idf.set(tk, Math.log((N + 1) / (cnt + 1)) + 1);
    const weigh = (m: Map<string, number>) => {
      const out = new Map<string, number>();
      for (const [tk, w] of m) out.set(tk, w * (idf.get(tk) ?? 1));
      return out;
    };
    const qVec = weigh(qTf);
    const scored = docs.map((d) => {
      const dVec = weigh(d.tf);
      let score = cosine(qVec, dVec);
      // cue bonus
      const cueTokens = new Set(tokenize(d.entry.cue));
      for (const qt of qTokens) if (cueTokens.has(qt)) score += 0.1;
      // recency
      score += recencyScore(d.entry.createdAt) * 0.2;
      // confidence
      score += ((d.entry.confidence ?? 0.7) - 0.5) * 0.15;
      return { entry: d.entry, score };
    });
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, topK).map((s) => s.entry);
  }

  // D6: 사실 그래프 — content에서 간단 triple 추출 (주체-관계-대상)
  toGraph(): FactTriple[] {
    const entries = this.list();
    const triples: FactTriple[] = [];
    for (const e of entries) {
      const t = `${e.cue} ${e.content}`;
      // 패턴: "A는 B를 C한다" / "A — 관계 — B"
      const patterns: RegExp[] = [
        /(\S{2,12})\s*는\s*(\S{2,12})\s*을\s*(\S{2,20}?)(?:다|\s|\.)/,
        /(\S+)\s*—\s*(\S+)\s*—\s*(\S+)/,
        /(\S+)\s*:\s*(\S+)\s*->\s*(\S+)/,
      ];
      for (const re of patterns) {
        const m = re.exec(t);
        if (m) {
          triples.push({ subject: m[1], relation: m[2], object: m[3], sourceId: e.id });
          break;
        }
      }
    }
    return triples;
  }

  // 그래프를 파일로 저장: .memory-bank/<domain>/_graph.jsonl
  persistGraph(): string {
    const triples = this.toGraph();
    const p = join(this.dir, "_graph.jsonl");
    mkdirSync(this.dir, { recursive: true });
    const lines = triples.map(t=> JSON.stringify(t)).join("\n");
    writeFileSync(p, lines, "utf-8");
    return p;
  }

  // D4+D2: 야간 배치 — TTL 만료 삭제 + 고유사도 병합
  consolidate(threshold = 0.88): { merged: number; expired: number; total: number } {
    let expired = 0, merged = 0;
    const all = this.list({ includeExpired: true });
    for (const e of all) if (isExpired(e)) { this.delete(e.id); expired++; }
    // 고유사도 병합: 0.88 이상 쌍은 최신 유지, 오래된 삭제
    const remaining = this.list({ includeExpired: false });
    const seen = new Map<string, MemoryEntry>();
    for (const e of remaining) {
      let dup = false;
      for (const [k, prev] of seen) {
        const a = tokenize(`${e.cue} ${e.content}`);
        const b = tokenize(`${prev.cue} ${prev.content}`);
        const at = tf(a), bt = tf(b);
        let dot=0, na=0, nb=0;
        for (const [kk,v] of at) { dot+= v*(bt.get(kk)??0); na+=v*v; }
        for (const [,v] of bt) nb+=v*v;
        const s = dot/(Math.sqrt(na)*Math.sqrt(nb)||1);
        if (s >= threshold) {
          // 오래된 쪽 삭제 (createdAt 작은 쪽)
          const older = e.createdAt < prev.createdAt ? e : prev;
          this.delete(older.id);
          seen.delete(older.id === e.id ? k : older.id);
          merged++;
          dup = true;
          break;
        }
      }
      if (!dup) seen.set(e.id, e);
    }
    return { merged, expired, total: this.list().length };
  }

  static listDomains(root?: string): string[] {
    const base = resolve(root ?? join(process.cwd(), ".memory-bank"));
    if (!existsSync(base)) return [];
    try {
      return readdirSync(base)
        .filter((n) => {
          try {
            return statSync(join(base, n)).isDirectory();
          } catch {
            return false;
          }
        })
        .sort();
    } catch {
      return [];
    }
  }
}
