/**
 * Command Provider — command transport
 * 임의 CLI를 Provider로: stdin으로 ChatRequest JSON을 보내고 stdout으로 StreamEvent 라인 수신
 * 프로토콜: 각 줄이 JSON StreamEvent (간단), 마지막에 {"type":"done"}
 * fallback: stdout 전체를 text_delta로 반환
 */
import { spawn } from "node:child_process";
import type { Provider, ChatRequest, StreamEvent } from "../../providers/types.js";

export class CommandProvider implements Provider {
  name: string;
  model: string;
  private command: string;
  private args: string[];
  private cwd: string;
  private timeout: number;

  constructor(opts: { name: string; command: string; args?: string[]; cwd: string; timeout?: number }) {
    this.name = opts.name;
    this.model = opts.name;
    this.command = opts.command;
    this.args = opts.args ?? [];
    this.cwd = opts.cwd;
    this.timeout = opts.timeout ?? 60_000;
  }

  async *streamChat(req: ChatRequest): AsyncGenerator<StreamEvent> {
    const input = JSON.stringify(req);

    const child = spawn(this.command, this.args, {
      cwd: this.cwd,
      env: { ...process.env },
      stdio: ["pipe", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (d: Buffer) => { stdout += d.toString(); });
    child.stderr.on("data", (d: Buffer) => { stderr += d.toString(); });

    const exitPromise = new Promise<number | null>((res) => child.on("close", (c) => res(c)));
    const timeoutId = setTimeout(() => { try { child.kill("SIGTERM"); } catch {} }, this.timeout);

    child.stdin.write(input);
    child.stdin.end();

    const code = await exitPromise;
    clearTimeout(timeoutId);

    if (code !== 0 && !stdout.trim()) {
      yield { type: "error", error: `[${this.name}] command failed (${code}): ${stderr.slice(0, 1000)}` };
      return;
    }

    // 줄 단위 StreamEvent 파싱 시도
    let hasEvents = false;
    for (const line of stdout.split("\n")) {
      const t = line.trim();
      if (!t) continue;
      try {
        const ev = JSON.parse(t) as StreamEvent;
        if (ev.type === "text_delta" || ev.type === "tool_use" || ev.type === "done" || ev.type === "error") {
          hasEvents = true;
          yield ev;
          if (ev.type === "done" || ev.type === "error") return;
        }
      } catch {}
    }
    if (!hasEvents && stdout.trim()) {
      // fallback: 전체를 텍스트로
      yield { type: "text_delta", text: stdout };
      yield { type: "done" };
    } else if (!hasEvents) {
      yield { type: "done" };
    }
  }
}
