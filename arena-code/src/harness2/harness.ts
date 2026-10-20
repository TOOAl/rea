/**
 * Harness Tree — Phase H1
 * Google Harness² (google-research/harness2, Apache 2.0, 6,308 lines)
 * → Arena Code 포팅: harness2/core/tree.py (427줄) 핵심만 TS로 재구현
 *
 * 개념: 하네스 = 파일 트리 (c1..c8)
 *   - 편집 계약: "생략은 상속(omitted-is-inherited)" — 제안은 바꾼 파일만 내보냄
 *   - SurfaceSpec: 허용된 경로의 집합 (프레임워크 차이를 데이터로 추상화)
 *
 * 참조: docs/HARNESS2_REA_ANALYSIS.md §3, §7.3
 * 원본: /tmp/harness2/harness2/core/tree.py (Python 3.12)
 */

import { existsSync, readdirSync, readFileSync, writeFileSync, mkdirSync, rmSync, statSync } from "node:fs";
import { join, relative, dirname } from "node:path";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** rel -> content (UTF-8) */
export type Tree = Record<string, string>;

/**
 * 한 프레임워크의 편집 가능 표면(Editable Surface)
 * Python의 SurfaceSpec과 동일 개념. 프레임워크 차이는 데이터로만 표현한다.
 */
export interface SurfaceSpec {
  /** 식별자 (예: "arena-code") */
  name: string;
  /** 항상 켜져 있는 파일들 — 매 토큰 비용 발생 */
  alwaysOn: readonly string[];
  /** always-on 합본의 최대 길이 (문자 수). 초과 시 autotrigger 스킵 */
  alwaysOnMax: number;
  /** 스킬 디렉토리 (예: "skills") — SKILL.md는 이 아래에만 존재 */
  skillDir: string;
  /** 트리거 라인을 넣을 파일 (보통 alwaysOn 중 하나) */
  autotriggerFile: string;
  /** 트리거 라인 템플릿 — {name}, {desc} 치환 */
  triggerLine: string;
  /** 서브에이전트 디렉토리 */
  subagentDir: string;
  /** 결정적 헬퍼 스크립트 디렉토리 */
  scriptsDir: string;
  /** 플러그인 디렉토리 (툴 루프 안에서 동작) — 없으면 null */
  pluginDir: string | null;
  /** 훅 파일 (툴 루프 미들웨어) — 없으면 null */
  hooksFile: string | null;
  /** 예약된 스크립트 이름 (런타임 제공) — 제안 검증 시 무시 */
  reservedScripts?: ReadonlySet<string>;
  /** 스텁 파일들: 설치 시 빈 파일로 생성하되 편집 대상으로 보지 않음 */
  stubs?: ReadonlyArray<[string, string]>;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const RESERVED_SCRIPTS = new Set<string>(["read_doc.py", "pack.py", "unpack.py"]);

// Arena Code 전용 SurfaceSpec — docs/HARNESS2_REA_ANALYSIS.md §3 매핑 기반
export const ARENA_SURFACE: SurfaceSpec = {
  name: "arena-code",
  alwaysOn: ["AGENTS.md", "CLAUDE.md", "systemprompt.md", "guardrails.md"],
  alwaysOnMax: 12000,
  skillDir: "skills",
  autotriggerFile: "AGENTS.md",
  triggerLine: "When {name} — {desc}, load the `{name}` skill.",
  subagentDir: "sub_agents",
  scriptsDir: "scripts",
  pluginDir: "plugins",
  hooksFile: ".codex/hooks.json",
  reservedScripts: RESERVED_SCRIPTS,
  stubs: [],
};

// ---------------------------------------------------------------------------
// Path helpers
// ---------------------------------------------------------------------------

const _NAME_RE = /^[a-z0-9][a-z0-9_\-]*$/;

/** 상대 경로 정규화 — 탈출 시도면 에러 */
export function normalizeRel(rel: string): string {
  let r = rel.trim().replace(/\\/g, "/");
  if (r.startsWith("/")) throw new Error(`path escapes harness: ${rel}`);
  if (r.split("/").includes("..")) throw new Error(`path escapes harness: ${rel}`);
  while (r.startsWith("./")) r = r.slice(2);
  return r.replace(/^\/+/, "").replace(/\/+$/, "").trim();
}

/** 표면 정규식 캐시 — skill / subagent / script / plugin */
function resFor(surface: SurfaceSpec): Record<string, RegExp> {
  const sd = escapeRegExp(surface.skillDir);
  const sub = escapeRegExp(surface.subagentDir);
  const sc = escapeRegExp(surface.scriptsDir);
  const out: Record<string, RegExp> = {
    skill: new RegExp(`^${sd}/([a-z0-9][a-z0-9_\\-]*)/SKILL\\.md$`),
    skillScript: new RegExp(`^${sd}/[a-z0-9][a-z0-9_\\-]*/scripts/[A-Za-z0-9_.\\-]+$`),
    subagent: new RegExp(`^${sub}/([a-z0-9][a-z0-9_\\-]*)/AGENT\\.md$`),
    script: new RegExp(`^${sc}/[a-z0-9_][a-z0-9_]*\\.py$`),
  };
  if (surface.pluginDir) {
    const pd = escapeRegExp(surface.pluginDir);
    out["plugin"] = new RegExp(`^${pd}/([a-z0-9][a-z0-9_\\-]*)(?:\\.ts|\\.js)$`);
  }
  if (surface.hooksFile) {
    out["hooks"] = new RegExp(`^${escapeRegExp(surface.hooksFile)}$`);
  }
  return out;
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** 이 경로가 편집 가능 표면에 속하는가 — predicate, 절대 throw 안 함 */
export function isAllowed(surface: SurfaceSpec, rel: string): boolean {
  try {
    rel = normalizeRel(rel);
  } catch {
    return false;
  }
  if ((surface.alwaysOn as readonly string[]).includes(rel)) return true;
  if (surface.hooksFile && rel === surface.hooksFile) return true;
  const rx = resFor(surface);
  if (rx.skill.test(rel)) return true;
  if (rx.skillScript.test(rel)) return true;
  if (rx.subagent.test(rel)) return true;
  if (rx.script.test(rel)) return true;
  if (rx.plugin && rx.plugin.test(rel)) return true;
  return false;
}

export function skillNames(surface: SurfaceSpec, tree: Tree): string[] {
  const rx = resFor(surface).skill;
  const names = new Set<string>();
  for (const rel of Object.keys(tree)) {
    const m = rx.exec(rel);
    if (m) names.add(m[1]);
  }
  return [...names].sort();
}

export function subagentNames(surface: SurfaceSpec, tree: Tree): string[] {
  const rx = resFor(surface).subagent;
  const names = new Set<string>();
  for (const rel of Object.keys(tree)) {
    const m = rx.exec(rel);
    if (m) names.add(m[1]);
  }
  return [...names].sort();
}

// ---------------------------------------------------------------------------
// Tree I/O
// ---------------------------------------------------------------------------

/** 허용된 표면에 있는 파일만 읽어 Tree로 */
export function readTree(surface: SurfaceSpec, dir: string, rejected?: string[]): Tree {
  const out: Tree = {};
  if (!existsSync(dir) || !statSync(dir).isDirectory()) return out;
  const stubSet = new Set((surface.stubs ?? []).map(([rel]) => rel));
  const files = collectFiles(dir);
  for (const abs of files) {
    const rel = relative(dir, abs).replace(/\\/g, "/");
    if (stubSet.has(rel)) continue;
    if (!isAllowed(surface, rel)) {
      if (rejected) rejected.push(rel);
      continue;
    }
    try {
      out[rel] = readFileSync(abs, "utf-8");
    } catch {
      // 읽기 실패는 증거 — 무시하되 rejected에 남길 수도 있음
    }
  }
  return out;
}

/** Tree를 디렉토리에 정확히 기록 — 허용된 파일은 먼저 지우고 다시 쓴다 */
export function writeTree(surface: SurfaceSpec, tree: Tree, dest: string, opts: { stubs?: boolean } = {}): string {
  mkdirSync(dest, { recursive: true });
  const stubSet = new Set((surface.stubs ?? []).map(([rel]) => rel));
  // 기존 허용 파일 제거
  const existing = collectFiles(dest);
  for (const abs of existing) {
    const rel = relative(dest, abs).replace(/\\/g, "/");
    if (isAllowed(surface, rel) || stubSet.has(rel)) {
      try { rmSync(abs); } catch {}
    }
  }
  // always-on 보장 — tree에 없어도 빈 파일은 둔다
  for (const a of surface.alwaysOn) {
    const p = join(dest, normalizeRel(a));
    mkdirSync(dirname(p), { recursive: true });
    if (!(a in tree) && !existsSync(p)) writeFileSync(p, "", "utf-8");
  }
  // tree 기록
  for (const [rel, content] of Object.entries(tree)) {
    const norm = normalizeRel(rel);
    const p = join(dest, norm);
    mkdirSync(dirname(p), { recursive: true });
    writeFileSync(p, content, "utf-8");
  }
  // stubs (선택)
  if (opts.stubs !== false && surface.stubs) {
    for (const [rel, body] of surface.stubs) {
      const p = join(dest, rel);
      mkdirSync(dirname(p), { recursive: true });
      if (!existsSync(p)) writeFileSync(p, body, "utf-8");
    }
  }
  return dest;
}

/** 항상 켜진 파일들의 합본 텍스트 */
export function alwaysOnText(surface: SurfaceSpec, tree: Tree): string {
  return surface.alwaysOn.map((a) => tree[a] ?? "").join("\n\n");
}

/** 스킬마다 트리거 라인을 always-on에 보정 — 수정된 스킬 이름 반환 */
export function autotrigger(surface: SurfaceSpec, tree: Tree, opts: { alwaysOnMax?: number } = {}): string[] {
  const cap = opts.alwaysOnMax ?? surface.alwaysOnMax;
  let body = alwaysOnText(surface, tree);
  const fixed: string[] = [];
  for (const name of skillNames(surface, tree)) {
    if (body.includes(name)) continue;
    const fm = (tree[`${surface.skillDir}/${name}/SKILL.md`] ?? "").slice(0, 600);
    const m = /^description:\s*(.+)$/m.exec(fm);
    const desc = m ? m[1].trim().replace(/\.$/, "") : `the ${name} workflow applies`;
    const line = surface.triggerLine.replace("{name}", name).replace("{desc}", desc).replace("{name}", name);
    const cur = tree[surface.autotriggerFile] ?? "";
    if (alwaysOnText(surface, tree).length + line.length + 2 > cap) continue;
    tree[surface.autotriggerFile] = cur.trim() ? `${cur.trimEnd()}\n${line}` : line;
    body = alwaysOnText(surface, tree);
    fixed.push(name);
  }
  return fixed;
}

// ---------------------------------------------------------------------------
// Diff & Validate
// ---------------------------------------------------------------------------

export interface DiffSummary {
  added: string[];
  removed: string[];
  modified: string[];
}

export function diffSummary(surface: SurfaceSpec, base: Tree, next: Tree): DiffSummary {
  // surface는 향후 필터링에 쓰일 수 있음 — 현재는 모든 키를 비교
  void surface;
  const added: string[] = [];
  const removed: string[] = [];
  const modified: string[] = [];
  const all = new Set([...Object.keys(base), ...Object.keys(next)]);
  for (const k of all) {
    if (!(k in base) && k in next) added.push(k);
    else if (k in base && !(k in next)) removed.push(k);
    else if (base[k] !== next[k]) modified.push(k);
  }
  added.sort(); removed.sort(); modified.sort();
  return { added, removed, modified };
}

export interface ValidateResult {
  ok: boolean;
  errors: string[];
}

/**
 * 하네스 트리 검증 — Harness² 3원칙 중 Arena Code에 해당하는 것을 검사
 *  1) 모든 Skill은 always-on에 트리거 라인이 있어야 함
 *  2) always-on 텍스트에 {{ 금지 (Jinja 파손)
 *  3) 참조하는 scripts/<file>.py는 같은 제안 안에 존재해야 함
 */
export function validate(
  surface: SurfaceSpec,
  tree: Tree,
  opts: { allowSubagents?: boolean; reservedScripts?: ReadonlySet<string> } = {},
): ValidateResult {
  const errors: string[] = [];
  const reserved = opts.reservedScripts ?? surface.reservedScripts ?? RESERVED_SCRIPTS;

  // 1) Skill 트리거 라인
  for (const name of skillNames(surface, tree)) {
    const body = alwaysOnText(surface, tree);
    if (!body.includes(name)) {
      errors.push(`skill "${name}" has no trigger line in ${surface.autotriggerFile} (must contain "${name}" verbatim)`);
    }
    // frontmatter name: 검증 (있으면 디렉토리와 일치해야 함)
    const fm = tree[`${surface.skillDir}/${name}/SKILL.md`] ?? "";
    const nameLine = /^name:\s*(.+)$/m.exec(fm);
    if (nameLine && nameLine[1].trim() !== name) {
      errors.push(`skill "${name}" frontmatter name "${nameLine[1].trim()}" must match directory "${name}"`);
    }
  }

  // 2) always-on에 {{ 금지
  for (const a of surface.alwaysOn) {
    const text = tree[a];
    if (text && text.includes("{{")) {
      errors.push(`always-on file "${a}" contains "{{" — would break Jinja rendering (use single brace)`);
    }
  }

  // 3) 참조된 scripts 존재 확인
  const scriptRefRe = /(?:python3?\s+)((?:skills\/[\w\-]+\/)?scripts\/[\w.\-]+\.py)/g;
  // skill 본문 + always-on에서 스크립트 참조 수집
  const searchTexts = [
    ...surface.alwaysOn.map((a) => tree[a] ?? ""),
    ...Object.entries(tree)
      .filter(([k]) => k.startsWith(surface.skillDir + "/"))
      .map(([, v]) => v),
  ];
  for (const text of searchTexts) {
    let m: RegExpExecArray | null;
    // 정규식 lastIndex 리셋을 위해 매 텍스트마다 새로 생성
    const re = new RegExp(scriptRefRe.source, "g");
    while ((m = re.exec(text)) !== null) {
      const ref = m[1];
      // 런타임 제공 예약 스크립트는 예외
      const base = ref.split("/").pop() ?? "";
      if (reserved.has(base)) continue;
      // 트리 안에 해당 rel이 있어야 함
      // rel은 여러 형태로 쓰일 수 있어 — skills/<name>/scripts/ 또는 scripts/
      if (!(ref in tree)) {
        errors.push(`referenced script "${ref}" not found in proposal — must ship alongside the skill`);
      }
    }
  }

  // subagents 허용 여부
  if (opts.allowSubagents === false) {
    const subs = subagentNames(surface, tree);
    if (subs.length) errors.push(`subagents not allowed on this surface: ${subs.join(", ")}`);
  }

  // 경로 탈출 & 허용되지 않은 경로
  for (const rel of Object.keys(tree)) {
    try { normalizeRel(rel); } catch (e) {
      errors.push(`invalid path "${rel}": ${(e as Error).message}`);
    }
    if (!isAllowed(surface, rel)) {
      errors.push(`path "${rel}" is not on the editable surface`);
    }
  }

  return { ok: errors.length === 0, errors };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function collectFiles(dir: string): string[] {
  const out: string[] = [];
  if (!existsSync(dir)) return out;
  const stack = [dir];
  while (stack.length) {
    const cur = stack.pop()!;
    let entries: string[] = [];
    try { entries = readdirSync(cur); } catch { continue; }
    for (const e of entries) {
      const abs = join(cur, e);
      let st: ReturnType<typeof statSync> | null = null;
      try { st = statSync(abs); } catch { continue; }
      if (st.isDirectory()) {
        if (e === "__pycache__" || e === "node_modules" || e === ".git") continue;
        stack.push(abs);
      } else if (st.isFile()) {
        out.push(abs);
      }
    }
  }
  return out.sort();
}
