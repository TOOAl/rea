/**
 * Fleet Types — Orca ADE (stablyai/orca, MIT) CLI 계약 포팅
 * Run → Task → Dispatch → Message + DecisionGate
 * 원본: skill-guides/orchestration.md 202줄, orca-cli.md
 */

export type TaskStatus = "pending" | "ready" | "dispatched" | "completed" | "failed" | "blocked";
export type DispatchStatus = "pending" | "running" | "completed" | "failed" | "released";
export type MessageType = "dispatch" | "worker_done" | "escalation" | "question" | "heartbeat" | "decision_gate";
export type DecisionGateStatus = "open" | "approved" | "rejected";
export type RunStatus = "active" | "completed" | "aborted";

export interface Run {
  id: string; // run_<hex>
  objective: string;
  status: RunStatus;
  createdAt: string;
  coordinatorSessionId?: string; // EventLog session_id
  githubIssue?: number; // optional gh integration
  githubPr?: number;
  metadata?: Record<string, unknown>;
}

export interface Task {
  id: string; // task_<hex> or task_1 incremental for readability
  runId: string;
  spec: string; // task description
  deps: string[]; // TaskId[] DAG edges
  status: TaskStatus;
  createdAt: string;
  updatedAt: string;
  // gh integration: linked issue or pr
  githubIssue?: number;
  labels?: string[];
}

export interface Dispatch {
  id: string; // dispatch_<hex> or ctx_* (Orca compatible)
  taskId: string;
  runId: string;
  worktreePath: string | null; // null = current worktree
  agentId: string | null; // provider id or external agent id
  provider: string | null; // provider name
  status: DispatchStatus;
  failureCount: number; // circuit breaker: >=3 => Task blocked
  createdAt: string;
  updatedAt: string;
  // pane identity (optional, for terminal multiplexers)
  paneId?: string;
  // dispatch payload stored for preamble injection
  preamble?: string;
}

export interface Message {
  id: string; // msg_<hex>
  runId: string;
  taskId?: string;
  dispatchId?: string;
  type: MessageType;
  payload: Record<string, unknown>;
  createdAt: string;
  // worker_done specific
  outcome?: "succeeded" | "failed";
  filesModified?: string[];
  summary?: string;
  // ack tracking
  acked?: boolean;
  deliveryId?: string; // Orca compatible delivery id
}

export interface DecisionGate {
  id: string; // gate_<hex>
  runId: string;
  taskId: string;
  question: string;
  status: DecisionGateStatus;
  createdAt: string;
  resolvedAt?: string;
  answer?: string;
}

// Fleet-wide persisted shape (.arena/fleet.json)
export interface FleetState {
  version: 1;
  runs: Record<string, Run>;
  tasks: Record<string, Task>;
  dispatches: Record<string, Dispatch>;
  messages: Record<string, Message>;
  gates: Record<string, DecisionGate>;
  updatedAt: string;
}

// Helper to generate ids
export function genId(prefix: string): string {
  const hex = Math.random().toString(16).slice(2, 8) + Date.now().toString(36).slice(-4);
  return `${prefix}_${hex}`;
}

