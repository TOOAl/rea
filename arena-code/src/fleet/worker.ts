/**
 * Worker — Orca Worker obligations 1~5 포팅
 * WorkerAgent: preamble 파싱, heartbeat, worker_done 1회 보장
 * CLI: arena-code --fleet-worker-done --task-id <id> --dispatch-id <id> --outcome succeeded --files-modified "a,b"
 */
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { FleetStore } from "./store.js";

export interface WorkerDoneInput {
  taskId: string;
  dispatchId: string;
  outcome: "succeeded" | "failed";
  filesModified?: string[];
  summary?: string;
  cwd?: string;
}

export class WorkerAgent {
  private store: FleetStore;
  private doneFired = false;

  constructor(workspaceRoot?: string, store?: FleetStore) {
    this.store = store ?? new FleetStore(workspaceRoot ?? process.cwd());
  }

  /**
   * Preamble 파싱 — .arena/fleet/PREAMBLE.md에서 run/task/dispatch 추출
   * Worker는 이 파일이 없으면 현재 dispatches에서 자신의 것을 찾아야 함 (fallback)
   */
  parsePreamble(cwd?: string): { runId?: string; taskId?: string; dispatchId?: string; error?: string } {
    const base = resolve(cwd ?? process.cwd());
    const preamblePath = join(base, ".arena", "fleet", "PREAMBLE.md");
    const dispatchIdPath = join(base, ".arena", "fleet", "DISPATCH_ID");
    try {
      if (existsSync(dispatchIdPath)) {
        const dispatchId = readFileSync(dispatchIdPath, "utf-8").trim();
        if (dispatchId) {
          const d = this.store.getDispatch(dispatchId);
          if (d) return { runId: d.runId, taskId: d.taskId, dispatchId: d.id };
        }
      }
      if (existsSync(preamblePath)) {
        const text = readFileSync(preamblePath, "utf-8");
        const runM = /run_id:\s*(\S+)/.exec(text);
        const taskM = /task_id:\s*(\S+)/.exec(text);
        const dispatchM = /dispatch_id:\s*(\S+)/.exec(text);
        return {
          runId: runM?.[1],
          taskId: taskM?.[1],
          dispatchId: dispatchM?.[1],
        };
      }
      return { error: "No preamble found — not a fleet worktree? Use --task-id/--dispatch-id explicitly" };
    } catch (e: unknown) {
      return { error: e instanceof Error ? e.message : String(e) };
    }
  }

  /**
   * Heartbeat — preamble cadence대로 liveness 증명 (Orca obligation 2)
   * Arena 경량: .arena/fleet/HEARTBEAT_<dispatchId> 파일 업데이트
   */
  heartbeat(dispatchId: string, cwd?: string): string | null {
    const base = resolve(cwd ?? process.cwd());
    try {
      const dir = join(base, ".arena", "fleet");
      mkdirSync(dir, { recursive: true });
      const hbPath = join(dir, `HEARTBEAT_${dispatchId}`);
      writeFileSync(hbPath, new Date().toISOString(), "utf-8");
      // also create store message
      const d = this.store.getDispatch(dispatchId);
      if (d) {
        this.store.createMessage({
          runId: d.runId,
          taskId: d.taskId,
          dispatchId: d.id,
          type: "heartbeat",
          payload: { at: new Date().toISOString(), cwd: base },
        });
      }
      return null;
    } catch (e: unknown) {
      return e instanceof Error ? e.message : String(e);
    }
  }

  /**
   * Check — 코디네이터 후속 확인 (Orca obligation 3)
   * Worker는 매 체크포인트 + worker_done 직전에 check를 호출해야 함
   * Arena 경량: check 메시지를 store에서 조회하여 decision_gate/escalation이 있는지 확인
   */
  check(dispatchId: string): { hasGate: boolean; gateQuestion?: string; escalation?: string } {
    const dispatch = this.store.getDispatch(dispatchId);
    if (!dispatch) return { hasGate: false };
    const gates = Object.values(this.store.load().gates).filter(g => g.taskId === dispatch.taskId && g.status === "open");
    if (gates.length > 0) {
      return { hasGate: true, gateQuestion: gates[0].question };
    }
    const msgs = this.store.listMessages({ runId: dispatch.runId, type: "escalation" }).filter(m => !m.acked && m.taskId === dispatch.taskId);
    if (msgs.length > 0) {
      return { hasGate: false, escalation: String(msgs[0].payload?.reason ?? msgs[0].payload?.message ?? "escalation") };
    }
    return { hasGate: false };
  }

  /**
   * Worker_done 1회 보장 (Orca obligation 4 & 5)
   * lifecycle ID 대조, --outcome 필수, 산문에만 인코딩 금지, 1회 초과 시 에러
   */
  workerDone(input: WorkerDoneInput): { ok: boolean; messageId?: string; error?: string } {
    if (this.doneFired) {
      return { ok: false, error: `worker_done already fired once for this WorkerAgent instance — Orca obligation 5: worker_done은 정확히 1회만 (이미 ${input.dispatchId}로 보고됨)` };
    }
    if (!input.outcome || !["succeeded", "failed"].includes(input.outcome)) {
      return { ok: false, error: "--outcome must be exactly 'succeeded' or 'failed' — 산문에만 인코딩 금지 (Orca safety floor)" };
    }
    const task = this.store.getTask(input.taskId);
    if (!task) return { ok: false, error: `Task not found: ${input.taskId}` };
    const dispatch = this.store.getDispatch(input.dispatchId);
    if (!dispatch) return { ok: false, error: `Dispatch not found: ${input.dispatchId} — 복사된 ID나 오래된 DB 행은 권한 없음` };
    if (dispatch.taskId !== input.taskId) return { ok: false, error: `Dispatch ${input.dispatchId} does not belong to Task ${input.taskId} — lifecycle mismatch` };

    // delegate to store.createMessage which handles DAG unblock + failureCount
    const msg = this.store.createMessage({
      runId: task.runId,
      taskId: input.taskId,
      dispatchId: input.dispatchId,
      type: "worker_done",
      payload: {
        outcome: input.outcome,
        filesModified: input.filesModified ?? [],
        summary: input.summary ?? "",
        cwd: input.cwd ?? process.cwd(),
      },
      outcome: input.outcome,
      filesModified: input.filesModified,
      summary: input.summary,
    });

    this.doneFired = true;

    // After worker_done, worker must stay idle (obligation 5) — we just mark it, the process should exit after CLI returns
    return { ok: true, messageId: msg.id };
  }

  /** CLI helper: parse --files-modified "a,b" → string[] */
  static parseFilesModified(raw?: string | null): string[] {
    if (!raw) return [];
    return raw.split(",").map(s => s.trim()).filter(Boolean);
  }
}

