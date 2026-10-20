/**
 * Event Log — Muse Code의 append-only JSONL 이벤트 로그 포팅
 * 모든 model call, tool run, approval, edit을 순차 기록
 * crash-safe, replay-exact, resume 가능
 */
import { mkdirSync, existsSync, appendFileSync, readFileSync, writeFileSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { randomBytes } from "node:crypto";

export type EventType =
  | "session_start"
  | "model_call"
  | "model_response"
  | "tool_request"
  | "tool_result"
  | "approval_request"
  | "approval_result"
  | "file_edit"
  | "sandbox_check"
  | "worktree_create"
  | "worktree_remove"
  | "skill_invoke"
  | "background_spawn"
  | "background_result"
  | "session_end"
  | "error";

export interface LogEvent {
  id: string;
  timestamp: string;
  session_id: string;
  type: EventType;
  data: Record<string, unknown>;
  outcome?: "success" | "failure" | "unknown";
  duration_ms?: number;
}

export class EventLog {
  private path: string;
  private sessionId: string;
  private enabled: boolean;

  constructor(workspaceRoot: string, sessionId?: string) {
    const root = resolve(workspaceRoot);
    this.path = join(root, ".arena", "events.log");
    this.sessionId = sessionId || `sess_${Date.now().toString(36)}_${randomBytes(3).toString("hex")}`;
    this.enabled = true;

    // 디렉토리 생성
    try {
      mkdirSync(dirname(this.path), { recursive: true });
      // 또한 세션별 파일 (Muse Code는 ~/.local/share/muse/sessions/*.jsonl)
      const altDir = join(process.env.HOME || root, ".arena", "sessions");
      mkdirSync(altDir, { recursive: true });
    } catch {
      // 생성 실패해도 계속 (read-only sandbox 등)
      this.enabled = false;
    }

    // 세션 시작 이벤트
    this.append("session_start", {
      workspace: root,
      node_version: process.version,
      platform: `${process.platform} ${process.arch}`,
      argv: process.argv.slice(2),
    });
  }

  get session_id(): string {
    return this.sessionId;
  }

  get logPath(): string {
    return this.path;
  }

  append(type: EventType, data: Record<string, unknown>, opts?: { outcome?: "success" | "failure" | "unknown"; duration_ms?: number }): LogEvent {
    const event: LogEvent = {
      id: `evt_${randomBytes(6).toString("hex")}`,
      timestamp: new Date().toISOString(),
      session_id: this.sessionId,
      type,
      data,
      outcome: opts?.outcome,
      duration_ms: opts?.duration_ms,
    };

    if (this.enabled) {
      try {
        appendFileSync(this.path, JSON.stringify(event) + "\n", "utf-8");
        // 별칭 세션 파일에도 기록
        const altPath = join(dirname(this.path), "sessions", `${this.sessionId}.jsonl`);
        try { mkdirSync(dirname(altPath), { recursive: true }); } catch {}
        appendFileSync(altPath, JSON.stringify(event) + "\n", "utf-8");
      } catch {
        // 로그 실패해도 세션은 계속
      }
    }

    return event;
  }

  // 편의 메서드
  modelCall(data: Record<string, unknown>) { return this.append("model_call", data); }
  modelResponse(data: Record<string, unknown>, outcome?: "success" | "failure") { return this.append("model_response", data, { outcome }); }
  toolRequest(tool: string, input: Record<string, unknown>) { return this.append("tool_request", { tool, input }); }
  toolResult(tool: string, result: string, durationMs?: number, outcome?: "success" | "failure") {
    return this.append("tool_result", { tool, result: result.slice(0, 2000) }, { outcome, duration_ms: durationMs });
  }
  approvalRequest(tool: string, decision: string) { return this.append("approval_request", { tool, decision }); }
  fileEdit(path: string, op: string) { return this.append("file_edit", { path, operation: op }); }
  error(message: string, data?: Record<string, unknown>) { return this.append("error", { message, ...data }, { outcome: "failure" }); }
  sessionEnd(reason: string) { return this.append("session_end", { reason }, { outcome: "success" }); }

  // 로그 읽기 (resume용)
  readAll(): LogEvent[] {
    try {
      if (!existsSync(this.path)) return [];
      const lines = readFileSync(this.path, "utf-8").trim().split("\n").filter(Boolean);
      return lines.map(l => JSON.parse(l) as LogEvent);
    } catch {
      return [];
    }
  }

  // 세션 통계
  stats(): { total: number; byType: Record<string, number>; sessionId: string; path: string } {
    const events = this.readAll();
    const byType: Record<string, number> = {};
    for (const e of events) byType[e.type] = (byType[e.type] || 0) + 1;
    return { total: events.length, byType, sessionId: this.sessionId, path: this.path };
  }

  // 요약 (LLM에게 전달용 — 긴 로그 압축)
  summarize(maxEvents = 20): string {
    const events = this.readAll();
    if (events.length === 0) return "(이벤트 로그 없음)";
    
    const recent = events.slice(-maxEvents);
    const lines = recent.map(e => {
      const time = e.timestamp.slice(11, 19);
      return `${time} [${e.type}] ${JSON.stringify(e.data).slice(0, 200)}`;
    });
    const omitted = events.length > maxEvents ? `\n... ${events.length - maxEvents}개 이전 이벤트 생략` : "";
    return `Event Log (${events.length} events, session ${this.sessionId}):\n${lines.join("\n")}${omitted}`;
  }

  // replay — 이벤트 로그를 순차 재생 (Muse Code의 replay-exact 근사)
  replay(onEvent: (event: LogEvent) => void): void {
    const events = this.readAll();
    for (const e of events) onEvent(e);
  }

  // resume — 마지막 세션 상태 복구
  static findLastSession(workspaceRoot: string): LogEvent[] | null {
    const path = join(resolve(workspaceRoot), ".arena", "events.log");
    if (!existsSync(path)) return null;
    try {
      const lines = readFileSync(path, "utf-8").trim().split("\n").filter(Boolean);
      return lines.map(l => JSON.parse(l) as LogEvent);
    } catch {
      return null;
    }
  }
}
