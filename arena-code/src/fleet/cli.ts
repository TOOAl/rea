/**
 * Fleet CLI — arena-code fleet subcommands
 * Orca CLI 포팅: run-create / task-create / worker-start / check / worker-done 등
 */
import { resolve } from "node:path";
import { FleetCoordinator } from "./coordinator.js";
import { WorkerAgent } from "./worker.js";
// removed unused import: // removed unused import: import { FleetStore } from "./store.js";  // FleetStore unused  // FleetStore unused

export interface FleetCliOptions {
  cwd?: string;
  json?: boolean;
}

function out(obj: unknown, asJson: boolean): void {
  if (asJson) console.log(JSON.stringify(obj, null, 2));
  else console.log(typeof obj === "string" ? obj : JSON.stringify(obj, null, 2));
}

export async function handleFleetCommand(sub: string, args: string[], opts: FleetCliOptions & Record<string, unknown>): Promise<void> {
  const cwd = resolve((opts.cwd as string) ?? process.cwd());
  const asJson = !!opts.json;
  const coordinator = new FleetCoordinator({ workspaceRoot: cwd });
  const store = coordinator.store;

  switch (sub) {
    case "run-create": {
      // --objective "..." [--github-issue N] [--json]
      const objective = (opts.objective as string) ?? args.join(" ");
      if (!objective) {
        console.error("Usage: arena-code fleet run-create --objective \"<objective>\" [--github-issue N]");
        process.exit(1);
      }
      const githubIssue = opts.githubIssue ? parseInt(String(opts.githubIssue), 10) : undefined;
      const run = coordinator.runCreate(objective, { githubIssue });
      out({ run }, asJson);
      break;
    }
    case "run-list": {
      const runs = coordinator.runList();
      out({ runs }, asJson);
      break;
    }
    case "task-create": {
      // --run <runId> --spec "..." [--deps '["task_1"]'] [--github-issue N]
      const runId = (opts.run as string) ?? (opts.runId as string);
      const spec = (opts.spec as string) ?? args.join(" ");
      if (!runId || !spec) {
        console.error("Usage: arena-code fleet task-create --run <runId> --spec \"<spec>\" [--deps '[\"task_1\"]'] [--github-issue N]");
        process.exit(1);
      }
      let deps: string[] | undefined;
      if (opts.deps) {
        try {
          let rawDeps = String(opts.deps).trim();
          // strip surrounding single quotes added by shell
          if ((rawDeps.startsWith("'") && rawDeps.endsWith("'")) || (rawDeps.startsWith('"') && rawDeps.endsWith('"'))) rawDeps = rawDeps.slice(1,-1);
          deps = JSON.parse(rawDeps);
          if (!Array.isArray(deps)) throw new Error("deps must be array");
        } catch {
          console.error(`--deps parse failed: ${opts.deps} — expected JSON array e.g. '["task_xxx"]'`);
          process.exit(1);
        }
      }
      const githubIssue = opts.githubIssue ? parseInt(String(opts.githubIssue), 10) : undefined;
      const task = coordinator.taskCreate(runId, spec, deps, { githubIssue });
      out({ task }, asJson);
      break;
    }
    case "task-list": {
      const runId = (opts.run as string) ?? (opts.runId as string) ?? undefined;
      const tasks = coordinator.taskList(runId);
      out({ tasks }, asJson);
      break;
    }
    case "worker-start": {
      // --task <taskId> [--worktree <path>] [--agent <id>] [--provider <name>]
      const taskId = (opts.task as string) ?? (opts.taskId as string);
      if (!taskId) {
        console.error("Usage: arena-code fleet worker-start --task <taskId> [--worktree <path>] [--agent <id>]");
        process.exit(1);
      }
      const { dispatch, error } = await coordinator.workerStart({
        taskId,
        worktreePath: (opts.worktree as string) ?? null,
        agentId: (opts.agent as string) ?? null,
        provider: (opts.provider as string) ?? null,
      });
      if (error) {
        console.error(`worker-start failed: ${error}`);
        process.exit(1);
      }
      out({ dispatch }, asJson);
      break;
    }
    case "fan-out": {
      // --task <taskId> --count N [--dry-run]
      const taskId = (opts.task as string) ?? (opts.taskId as string);
      const count = parseInt(String(opts.count ?? opts.fanout ?? "3"), 10) || 3;
      if (!taskId) {
        console.error("Usage: arena-code fleet fan-out --task <taskId> --count N");
        process.exit(1);
      }
      const { dispatches, errors, worktrees } = await coordinator.fanOut({ taskId, count, dryRun: !!opts.dryRun });
      out({ dispatches, worktrees, errors }, asJson);
      if (errors.length) console.error(`fan-out errors: ${errors.join("; ")}`);
      break;
    }
    case "check": {
      // --run <runId> [--types worker_done,escalation,question] [--timeout 30000] [--wait]
      const runId = (opts.run as string) ?? (opts.runId as string);
      if (!runId) {
        console.error("Usage: arena-code fleet check --run <runId> [--types worker_done,escalation,question] [--wait]");
        process.exit(1);
      }
      const typesRaw = (opts.types as string) ?? "worker_done,escalation,question,decision_gate";
      const types = typesRaw.split(",").map(s => s.trim()).filter(Boolean) as import("./types.js").MessageType[];
      const timeoutMs = parseInt(String(opts.timeout ?? opts.timeoutMs ?? "30000"), 10) || 30000;
      const wait = !!opts.wait;
      const { messages, timedOut } = await coordinator.check({ runId, types, timeoutMs, wait });
      out({ messages, timedOut, count: messages.length }, asJson);
      break;
    }
    case "ack": {
      // --message <msgId> or --run <runId>
      const msgId = (opts.message as string) ?? (opts.messageId as string);
      const runId = (opts.run as string) ?? (opts.runId as string);
      if (msgId) {
        const m = coordinator.ack(msgId);
        out({ acked: !!m, message: m }, asJson);
      } else if (runId) {
        const n = coordinator.ackAll(runId);
        out({ acked: n }, asJson);
      } else {
        console.error("Usage: arena-code fleet ack --message <msgId>  OR  arena-code fleet ack --run <runId>");
        process.exit(1);
      }
      break;
    }
    case "worker-done": {
      // --task-id <id> --dispatch-id <id> --outcome succeeded|failed [--files-modified "a,b"] [--summary "..."]
      const taskId = (opts.taskId as string) ?? (opts.task as string);
      const dispatchId = (opts.dispatchId as string) ?? (opts.dispatch as string);
      const outcome = (opts.outcome as string) as "succeeded" | "failed";
      if (!taskId || !dispatchId || !outcome) {
        console.error("Usage: arena-code fleet worker-done --task-id <taskId> --dispatch-id <dispatchId> --outcome succeeded|failed [--files-modified \"a,b\"] [--summary \"...\"]");
        process.exit(1);
      }
      const filesModified = WorkerAgent.parseFilesModified((opts.filesModified as string) ?? (opts.files as string) ?? null);
      const summary = (opts.summary as string) ?? args.join(" ");
      const worker = new WorkerAgent(cwd, store);
      const { ok, messageId, error } = worker.workerDone({ taskId, dispatchId, outcome, filesModified, summary, cwd });
      if (!ok) {
        console.error(`worker-done failed: ${error}`);
        process.exit(1);
      }
      out({ ok, messageId, taskId, dispatchId, outcome }, asJson);
      break;
    }
    case "worker-release": {
      const dispatchId = (opts.dispatch as string) ?? (opts.dispatchId as string);
      if (!dispatchId) {
        console.error("Usage: arena-code fleet worker-release --dispatch <dispatchId>");
        process.exit(1);
      }
      const r = coordinator.workerRelease(dispatchId);
      out(r, asJson);
      break;
    }
    case "status": {
      const s = coordinator.status();
      out(s, asJson);
      break;
    }
    case "gh": {
      // gh passthrough — fleet gh issue view ... etc
      // Usage: arena-code fleet gh issue view 123 --json title,state
      const ghArgs = args;
      if (ghArgs.length === 0) {
        console.error("Usage: arena-code fleet gh <gh args>  e.g. arena-code fleet gh issue view 123 --json title,state");
        process.exit(1);
      }
      const r = await coordinator.ghCommand(ghArgs, cwd);
      if (asJson) out(r, asJson);
      else {
        if (r.stdout) console.log(r.stdout);
        if (r.stderr) console.error(r.stderr);
        if (r.exitCode !== 0) process.exit(r.exitCode);
      }
      break;
    }
    case "diffs": {
      // --dispatch-ids "d1,d2,d3" or --run <runId>
      const runId = (opts.run as string) ?? (opts.runId as string);
      let ids: string[] = [];
      if (opts.dispatchIds) ids = String(opts.dispatchIds).split(",").map(s => s.trim()).filter(Boolean);
      else if (opts.dispatchId) ids = [String(opts.dispatchId)];
      else if (runId) {
        const ds = store.listDispatches({ runId });
        ids = ds.map(d => d.id);
      } else {
        console.error("Usage: arena-code fleet diffs --run <runId>  OR  --dispatch-ids d1,d2");
        process.exit(1);
      }
      const diffs = await coordinator.collectDiffs(ids);
      out({ diffs }, asJson);
      break;
    }
    default: {
      console.error(`Unknown fleet subcommand: ${sub}
Available: run-create, run-list, task-create, task-list, worker-start, fan-out, check, ack, worker-done, worker-release, status, gh, diffs`);
      process.exit(1);
    }
  }
}

