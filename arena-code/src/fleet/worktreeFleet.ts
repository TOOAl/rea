/**
 * FleetWorktreeManager — WorktreeManager를 Fleet으로 확장 (fan-out)
 * 기존 WorktreeManager.create() 재사용, fan-out만 추가
 */
import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { WorktreeManager, type Worktree } from "../worktree/index.js";

export interface FleetWorktree extends Worktree {
  // fleet-specific metadata
  runId: string;
  dispatchId?: string;
}

export class FleetWorktreeManager extends WorktreeManager {
  constructor(workspaceRoot: string) {
    super(workspaceRoot);
  }

  /**
   * N개 worktree 병렬 생성 (fan-out)
   * 각 worktree는 arena/wt-<run>-<idx>-<rand> 브랜치
   */
  async createFleet(opts: {
    runId: string;
    count: number;
    baseCommit?: string;
    taskNamePrefix?: string;
  }): Promise<{ worktrees: FleetWorktree[]; errors: string[] }> {
    const worktrees: FleetWorktree[] = [];
    const errors: string[] = [];
    const count = Math.max(1, Math.min(16, opts.count)); // clamp 1..16

    // parallel creation
    const results = await Promise.all(
      Array.from({ length: count }, async (_, idx) => {
        const taskName = `${opts.taskNamePrefix ?? "fleet"}-${opts.runId.slice(-4)}-${idx + 1}`;
        const res = await this.create(taskName, opts.baseCommit);
        if (res.error) {
          return { error: res.error, wt: null as unknown as FleetWorktree };
        }
        const fw: FleetWorktree = { ...res.worktree, runId: opts.runId };
        // inject fleet metadata into worktree
        try {
          const metaDir = join(fw.path, ".arena", "fleet");
          mkdirSync(metaDir, { recursive: true });
          writeFileSync(join(metaDir, "RUN_ID"), opts.runId, "utf-8");
          writeFileSync(join(metaDir, "WORKTREE_INDEX"), String(idx + 1), "utf-8");
        } catch {}
        return { wt: fw, error: null as unknown as string };
      })
    );

    for (const r of results) {
      if (r.error) errors.push(r.error);
      else if (r.wt) worktrees.push(r.wt);
    }

    return { worktrees, errors };
  }

  /**
   * 각 worktree에 AGENTS.md preamble 주입 (Dispatch binding)
   * Orca의 dispatch --inject 포팅 — preamble 파일을 worktree에 생성
   */
  injectPreamble(worktreePath: string, dispatchId: string, runId: string, taskId: string, taskSpec: string, extra?: string): string | null {
    const abs = resolve(worktreePath);
    if (!existsSync(abs)) return `worktree path not found: ${abs}`;
    try {
      const fleetDir = join(abs, ".arena", "fleet");
      mkdirSync(fleetDir, { recursive: true });
      const preamble = [
        `# Fleet Dispatch Preamble — DO NOT EDIT`,
        `run_id: ${runId}`,
        `task_id: ${taskId}`,
        `dispatch_id: ${dispatchId}`,
        `task_spec: ${taskSpec}`,
        ``,
        `You are worker ${dispatchId} for task ${taskId} in run ${runId}.`,
        `When done, report EXACTLY ONCE from THIS worktree with:`,
        `  arena-code --fleet-worker-done --task-id ${taskId} --dispatch-id ${dispatchId} --outcome succeeded|failed --files-modified "a,b" --summary "3-line summary"`,
        `Do NOT encode outcome in prose — use --outcome flag. Only worker_done with valid lifecycle IDs counts.`,
        extra ? `\nExtra: ${extra}` : "",
      ].join("\n");
      writeFileSync(join(fleetDir, "PREAMBLE.md"), preamble, "utf-8");
      writeFileSync(join(fleetDir, "DISPATCH_ID"), dispatchId, "utf-8");
      return null;
    } catch (e: unknown) {
      return e instanceof Error ? e.message : String(e);
    }
  }
}

