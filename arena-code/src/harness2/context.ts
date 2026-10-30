/**
 * Evidence Tree — Phase H2
 * Google Harness² (google-research/harness2, Apache 2.0)
 * → Arena Code 포팅: harness2/core/context.py (546줄) 핵심 TS 재구현
 *
 * 개념: 증거는 파일로, 프롬프트는 짧은 포인터로
 *   - 모델이 잘리 없이 전체 궤적·결과물을 읽을 수 있게 증거 트리를 디스크에 구축
 *   - 프롬프트(MISSION.md)는 "어디에 뭐가 있는지"만 가리킴 — 긴 내용은 파일을 직접 읽게 함
 *
 * 원본 레이아웃:
 *   context/task.md, context/rollouts/<label>.md, context/deliverables/<label>/,
 *   context/harness/<rel>, context/library/INDEX.md, context/pool/<label>/, MISSION.md
 *
 * 참조: docs/HARNESS2_REA_ANALYSIS.md §5, docs/HARNESS2_REA_ANALYSIS.md §4.1
 */

import { existsSync, mkdirSync, writeFileSync, readFileSync, rmSync, readdirSync, statSync, copyFileSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import type { Tree } from "./harness.js";
import { writeTree as writeHarnessTree } from "./harness.js";
import { ARENA_SURFACE } from "./harness.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** 한 번의 실행 결과 (Probe 결과) */
export interface RolloutView {
  label: string;          // 예: "base", "inv-candidate", "dom-candidate"
  runId: string;          // 세션 ID
  ok: boolean;            // 실행 성공 여부
  delivered: boolean;     // 결과물 생성 여부
  trajectory: string;     // 전체 궤적 (tool 호출 로그 등)
  deliverable?: string;   // 결과물 내용 (파일 내용 또는 요약)
  deliverableFiles?: string[]; // 결과물 파일 경로들 (선택)
  costUsd?: number;
  wallS?: number;
  error?: string;
}

/** 증거 트리 구축 옵션 */
export interface BuildOptions {
  taskId: string;                 // 작업 ID (예: "auth-login")
  taskPrompt: string;             // 작업 지시 원문
  rollouts?: RolloutView[];       // 기존 실행 궤적들 (기준 + 후보들)
  harness?: Tree | null;          // 현재 하네스 트리 (편집 대상)
  libraryDir?: string | null;      // Library 도메인 디렉토리 (있으면 context/library로 복사)
  pool?: Array<{ label: string; harness: Tree; rollout: RolloutView | null }>; // 후보 풀 (aggregate/select 시)
  decisions?: Record<string, string>; // 이전 편집 결정 노트 (sequential에서)
  sourceDir?: string | null;      // 작업 소스 자료 디렉토리
}

/** 구축된 증거 트리 정보 — mission()이 참조 */
export interface ContextTree {
  root: string;           // 증거 트리 루트 절대 경로
  taskId: string;
  rollouts: string[];     // 성공적으로 기록된 rollout 라벨들
  deliverables: string[]; // deliverables에 기록된 라벨들
  harnessFiles: number;   // context/harness에 복사된 파일 수
  library: boolean;       // library 유무
  pool: string[];         // pool 라벨들
  failed: string[];       // 기록 실패한 rollout 라벨들
  sourceFiles: number;    // source 파일 수
  decisions: number;      // decisions 수
}

// ---------------------------------------------------------------------------
// Build
// ---------------------------------------------------------------------------

/**
 * 증거 트리를 디스크에 구축 — 원본 context.build() 대응
 * @param dest - 증거 트리를 만들 경로 (예: /tmp/harness2-ctx/task-1)
 * @param opts - BuildOptions
 */
export function buildEvidenceTree(dest: string, opts: BuildOptions): ContextTree {
  const root = resolve(dest);
  if (existsSync(root)) rmSync(root, { recursive: true, force: true });
  mkdirSync(root, { recursive: true });

  // 1) task.md
  writeFileSync(join(root, "task.md"), opts.taskPrompt, "utf-8");

  // 2) source/ (있으면 복사)
  let sourceFiles = 0;
  if (opts.sourceDir && existsSync(opts.sourceDir)) {
    const srcDst = join(root, "source");
    sourceFiles = copyDir(opts.sourceDir, srcDst);
  }

  // 3) decisions/ (sequential 모드)
  let decisions = 0;
  if (opts.decisions) {
    for (const [label, notes] of Object.entries(opts.decisions)) {
      const p = join(root, "decisions", `${sanitize(label)}.md`);
      mkdirSync(dirname(p), { recursive: true });
      writeFileSync(p, notes || "No decision notes.", "utf-8");
      decisions++;
    }
  }

  // 4) rollouts/ + deliverables/
  const gotR: string[] = [];
  const gotD: string[] = [];
  const failedR: string[] = [];
  if (opts.rollouts && opts.rollouts.length > 0) {
    mkdirSync(join(root, "rollouts"), { recursive: true });
    mkdirSync(join(root, "deliverables"), { recursive: true });
    for (const r of opts.rollouts) {
      const ok = writeRollout(root, r);
      if (ok) {
        gotR.push(r.label);
        gotD.push(r.label);
      } else {
        failedR.push(`${r.label}: rollout write failed`);
      }
    }
  }

  // 5) harness/ — 편집 대상 하네스
  let harnessFiles = 0;
  if (opts.harness && Object.keys(opts.harness).length > 0) {
    const harnessDst = join(root, "harness");
    writeHarnessTree(ARENA_SURFACE, opts.harness, harnessDst, { stubs: false });
    harnessFiles = countFiles(harnessDst);
  }

  // 6) pool/ — 후보 하네스 + 궤적 (aggregate/select 시)
  const gotP: string[] = [];
  if (opts.pool && opts.pool.length > 0) {
    for (const p of opts.pool) {
      const poolDir = join(root, "pool", sanitize(p.label));
      mkdirSync(poolDir, { recursive: true });
      if (p.harness && Object.keys(p.harness).length > 0) {
        writeHarnessTree(ARENA_SURFACE, p.harness, join(poolDir, "harness"), { stubs: false });
      }
      if (p.rollout) {
        writeFileSync(join(poolDir, "rollout.md"), p.rollout.trajectory || "(no trajectory)", "utf-8");
        if (p.rollout.deliverable) {
          writeFileSync(join(poolDir, "deliverable.md"), p.rollout.deliverable, "utf-8");
        }
      }
      gotP.push(p.label);
    }
  }

  // 7) library/ — 같은 도메인의 이전 교훈
  let hasLibrary = false;
  if (opts.libraryDir && existsSync(opts.libraryDir)) {
    try {
      const libEntries = readdirSync(opts.libraryDir);
      if (libEntries.length > 0) {
        copyDir(opts.libraryDir, join(root, "library"));
        hasLibrary = true;
      }
    } catch {}
  }

  // 8) 유출 검사 — grader 정답이 섞이지 않았는지
  assertNoLeakPaths(root);
  assertNoGraderVerdicts(root);

  if (opts.rollouts && opts.rollouts.length > 0 && gotR.length === 0) {
    throw new Error(
      `no trajectory could be rendered for ANY rollout — proposer would adapt on nothing: ${failedR.slice(0, 4).join("; ")}`
    );
  }

  return {
    root,
    taskId: opts.taskId,
    rollouts: gotR,
    deliverables: gotD,
    harnessFiles,
    library: hasLibrary,
    pool: gotP,
    failed: failedR,
    sourceFiles,
    decisions,
  };
}

/** 증거 트리 레이아웃 설명 — MISSION.md에 들어갈 목록 */
export function layoutDescription(tree: ContextTree): string {
  const lines = ["context/task.md                  the task as the agent received it"];
  if (tree.sourceFiles) lines.push("context/source/                 task source materials");
  if (tree.decisions) lines.push("context/decisions/              earlier edits and composition decisions");
  if (tree.rollouts.length > 0) {
    const names = tree.rollouts.slice(0, 6).map((r) => `${r}.md`).join(", ");
    const more = tree.rollouts.length > 6 ? ` (+${tree.rollouts.length - 6} more)` : "";
    lines.push(`context/rollouts/               FULL trajectories: ${names}${more}`);
    lines.push("context/deliverables/<label>/    the files each rollout produced");
  }
  if (tree.harnessFiles) {
    lines.push(`context/harness/                the harness you are editing (${tree.harnessFiles} files)`);
  }
  if (tree.pool.length > 0) {
    lines.push(`context/pool/                   ${tree.pool.length} candidates, each with harness + rollout`);
  }
  if (tree.library) {
    lines.push("context/library/                earlier tasks in THIS domain — browse INDEX.md first");
  }
  return lines.join("\n");
}

/**
 * MISSION.md 생성 — 증거 트리를 가리키는 짧은 포인터 + 편집 지시
 * 원본 context.mission() 대응
 */
export function buildMission(tree: ContextTree, opts: { job?: string } = {}): string {
  const job = opts.job ?? "Improve the harness based on trajectory evidence.";
  return `# Mission

${job}

Task: ${tree.taskId}

## Evidence layout

${layoutDescription(tree)}

Evidence is in \`context/\` — open files to inspect, not to execute.
The harness you can edit is in \`context/harness/\`.

## How to edit

- Files you do not touch are inherited unchanged.
- Edit files in place with your normal tools; create new ones for new components.
- Delete a file to remove that component.
- If evidence shows no change needed, reply KEEP_BASE in your notes.

## Reply

After editing, reply with ONE <notes> block describing each change and the trajectory moment that motivated it.
`;
}

// ---------------------------------------------------------------------------
// Security guards (Harness² 원본 그대로 — 우리도 유출 방지)
// ---------------------------------------------------------------------------

const LEAK_PATTERNS = ["*rubric*", "*answer*", "*grader*", "*score*.json"];
const GRADER_PHRASES = ["grading criteria", "answer key", "reference solution", "rubric"];

export function assertNoLeakPaths(root: string): void {
  const files = collectFiles(root);
  for (const f of files) {
    const base = f.split("/").pop() ?? "";
    for (const pat of LEAK_PATTERNS) {
      const re = new RegExp("^" + pat.replace(/\*/g, ".*") + "$", "i");
      if (re.test(base)) {
        throw new Error(`leak glob matched: ${f} (pattern: ${pat}) — task material may contain answer key`);
      }
    }
  }
}

export function assertNoGraderVerdicts(root: string): void {
  for (const f of collectFiles(root)) {
    try {
      const text = readFileSync(f, "utf-8").toLowerCase();
      for (const phrase of GRADER_PHRASES) {
        if (text.includes(phrase)) {
          throw new Error(`grader verdict leak in ${f}: contains "${phrase}" — remove grading material from evidence`);
        }
      }
    } catch (e) {
      if (e instanceof Error && e.message.includes("grader verdict")) throw e;
    }
  }
}

export function assertNoGraderVerdictsInTree(tree: Tree): void {
  for (const [rel, content] of Object.entries(tree)) {
    const low = content.toLowerCase();
    for (const phrase of GRADER_PHRASES) {
      if (low.includes(phrase)) {
        throw new Error(`grader verdict leak in harness file ${rel}: contains "${phrase}"`);
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function writeRollout(root: string, r: RolloutView): boolean {
  try {
    const trajPath = join(root, "rollouts", `${sanitize(r.label)}.md`);
    writeFileSync(trajPath, r.trajectory || "(no trajectory)", "utf-8");
    const delivDir = join(root, "deliverables", sanitize(r.label));
    mkdirSync(delivDir, { recursive: true });
    if (r.deliverable) {
      writeFileSync(join(delivDir, "artifact.md"), r.deliverable, "utf-8");
      writeFileSync(join(delivDir, "INDEX.md"), `- artifact.md (${r.deliverable.length} chars)\n`, "utf-8");
    } else {
      writeFileSync(join(delivDir, "INDEX.md"), "(no deliverable — trajectory only)\n", "utf-8");
    }
    return true;
  } catch {
    return false;
  }
}

function copyDir(src: string, dst: string): number {
  mkdirSync(dst, { recursive: true });
  let count = 0;
  const entries = readdirSync(src);
  for (const e of entries) {
    const s = join(src, e);
    const d = join(dst, e);
    const st = statSync(s);
    if (st.isDirectory()) {
      if (e === "__pycache__" || e === ".git" || e === "node_modules") continue;
      count += copyDir(s, d);
    } else if (st.isFile()) {
      mkdirSync(dirname(d), { recursive: true });
      copyFileSync(s, d);
      count++;
    }
  }
  return count;
}

function countFiles(dir: string): number {
  if (!existsSync(dir)) return 0;
  return collectFiles(dir).length;
}

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
      if (st.isDirectory()) stack.push(abs);
      else if (st.isFile()) out.push(abs);
    }
  }
  return out;
}

function sanitize(label: string): string {
  return label.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 80) || "unnamed";
}
