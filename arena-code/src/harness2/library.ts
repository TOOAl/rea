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
