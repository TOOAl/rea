/**
 * Worktree — Muse Code의 git worktree 병렬 기능 포팅
 * 각 subagent가 독립 worktree에서 병렬 작업 → 충돌 없음
 * 
 * Muse Code: .muse/worktrees/<id>에 worktree 생성, detached HEAD
 * Arena Code: .arena/worktrees/<id>에 동일 구현
 */
import { exec } from "node:child_process";
import { promisify } from "node:util";
import { existsSync, mkdirSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";
import { randomBytes } from "node:crypto";

const execAsync = promisify(exec);

export interface Worktree {
  id: string;
  path: string;
  branch: string;
  baseCommit: string;
  createdAt: string;
}

export class WorktreeManager {
  private root: string;
  private worktreesDir: string;

  constructor(workspaceRoot: string) {
    this.root = resolve(workspaceRoot);
    this.worktreesDir = join(this.root, ".arena", "worktrees");
  }

  get dir(): string {
    return this.worktreesDir;
  }

  // git repo인지 확인
  isGitRepo(): boolean {
    return existsSync(join(this.root, ".git"));
  }

  // 현재 HEAD 커밋 해시
  async getHeadCommit(): Promise<string> {
    try {
      const { stdout } = await execAsync("git rev-parse HEAD", { cwd: this.root, timeout: 5000 });
      return stdout.trim();
    } catch {
      return "unknown";
    }
  }

  // worktree 생성 — Muse Code 방식 (detached HEAD from parent HEAD)
  async create(taskName: string, baseCommit?: string): Promise<{ worktree: Worktree; error?: string }> {
    if (!this.isGitRepo()) {
      return {
        worktree: { id: "", path: "", branch: "", baseCommit: "", createdAt: "" },
        error: "Git 저장소가 아닙니다 — worktree는 git repo에서만 동작합니다 (Muse Code도 동일, non-git에서는 무시)",
      };
    }

    const id = `${taskName.replace(/[^a-z0-9_-]/gi, "_").slice(0, 20)}_${randomBytes(3).toString("hex")}`;
    const wtPath = join(this.worktreesDir, id);
    const branch = `arena/wt-${id}`;
    const base = baseCommit || await this.getHeadCommit();

    mkdirSync(this.worktreesDir, { recursive: true });

    try {
      // git worktree add <path> -b <branch> <base> (또는 detached)
      // Muse Code는 detached HEAD로 생성 — 우리는 branch로 생성 (더 안전)
      await execAsync(`git worktree add -b "${branch}" "${wtPath}" ${base}`, {
        cwd: this.root,
        timeout: 15000,
      });

      const wt: Worktree = {
        id,
        path: wtPath,
        branch,
        baseCommit: base,
        createdAt: new Date().toISOString(),
      };
      return { worktree: wt };
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      // 이미 존재하는 브랜치 등 — detached로 재시도
      try {
        await execAsync(`git worktree add --detach "${wtPath}" ${base}`, {
          cwd: this.root,
          timeout: 15000,
        });
        const wt: Worktree = { id, path: wtPath, branch: `detached-${id}`, baseCommit: base, createdAt: new Date().toISOString() };
        return { worktree: wt };
      } catch {
        return {
          worktree: { id, path: wtPath, branch, baseCommit: base, createdAt: new Date().toISOString() },
          error: `worktree 생성 실패: ${msg}`,
        };
      }
    }
  }

  // worktree 목록
  async list(): Promise<{ worktrees: string[]; detail: string }> {
    try {
      const { stdout } = await execAsync("git worktree list --porcelain", { cwd: this.root, timeout: 5000 });
      if (!stdout.trim()) return { worktrees: [], detail: "(worktree 없음)" };
      
      // 파싱: worktree, HEAD, branch 반복
      const worktrees: string[] = [];
      for (const block of stdout.trim().split("\n\n")) {
        const wtLine = block.split("\n").find(l => l.startsWith("worktree "));
        if (wtLine) worktrees.push(wtLine.replace("worktree ", ""));
      }
      
      return { worktrees, detail: stdout.trim() };
    } catch (e: unknown) {
      return { worktrees: [], detail: `worktree list 실패: ${e instanceof Error ? e.message : String(e)}` };
    }
  }

  // worktree 제거
  async remove(worktreePath: string): Promise<{ success: boolean; message: string }> {
    const abs = resolve(worktreePath);
    
    try {
      await execAsync(`git worktree remove "${abs}" --force`, { cwd: this.root, timeout: 15000 });
      return { success: true, message: `worktree 제거됨: ${abs}` };
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      // git worktree remove 실패 시 직접 디렉토리 삭제 시도
      try {
        rmSync(abs, { recursive: true, force: true });
        await execAsync(`git worktree prune`, { cwd: this.root, timeout: 5000 });
        return { success: true, message: `worktree 디렉토리 직접 삭제: ${abs} (prune 완료)` };
      } catch {
        return { success: false, message: `worktree 제거 실패: ${msg}` };
      }
    }
  }

  // 모든 arena worktree 정리
  async pruneAll(): Promise<{ removed: number; message: string }> {
    const { worktrees } = await this.list();
    let removed = 0;
    const arenaWorktrees = worktrees.filter(w => w.includes(".arena/worktrees") || w.includes("arena/wt-"));
    
    for (const wt of arenaWorktrees) {
      const r = await this.remove(wt);
      if (r.success) removed++;
    }
    
    try {
      await execAsync("git worktree prune", { cwd: this.root, timeout: 5000 });
    } catch {}
    
    return { removed, message: `${removed}개 arena worktree 정리 완료` };
  }

  // 병렬도 제한 (Muse Code: core_count - 2, clamped 2~16)
  getMaxConcurrency(): number {
    try {
      const { cpus } = require("node:os") as typeof import("node:os");
      const cores = cpus().length;
      return Math.max(2, Math.min(16, cores - 2));
    } catch {
      return 4; // fallback
    }
  }
}
