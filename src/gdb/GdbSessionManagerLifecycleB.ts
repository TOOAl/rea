import { isUtf8 } from "node:buffer";

import {
  AnalysisCancelledError,
  AnalysisResourceConstraintError,
} from "../domain/analysisErrorCore.js";

const STARTUP_TIMEOUT_MS = 10_000;
import type { GdbSession } from "./GdbSessionManagerCore.js";

// GdbSessionManagerLifecycleB.ts 1224-1450
export async function serialize<Value>(
  session: GdbSession,
  operation: () => Promise<Value>,
  signal?: AbortSignal,
  operationName: "gdb_console" | "close_gdb_session" = "gdb_console",
): Promise<Value> {
  if (session.pendingCommandCount >= MAX_PENDING_GDB_COMMANDS)
    throw new AnalysisResourceConstraintError(
      operationName,
      "transport",
      "GDB command queue capacity reached.",
      {
        max_pending_commands: MAX_PENDING_GDB_COMMANDS,
        active_or_queued_commands: session.pendingCommandCount,
      },
    );
  session.pendingCommandCount += 1;
  const previous = session.commandTail;
  let release: (() => void) | undefined;
  let acquired = false;
  session.commandTail = new Promise<void>((resolve) => {
    release = resolve;
  });
  try {
    await waitForGdbCommandTurn(previous, signal);
    acquired = true;
    return await operation();
  } finally {
    if (acquired) {
      session.pendingCommandCount -= 1;
      release?.();
    } else {
      // The cancelled placeholder still occupies commandTail until its turn.
      // Keep its reservation until then so repeated cancellations cannot
      // bypass the per-session queue bound while an earlier command stalls.
      void previous.then(() => {
        session.pendingCommandCount -= 1;
        release?.();
      });
    }
  }
}

export function receive(session: GdbSession, data: Buffer): void {
  if (session.startupResolve !== undefined) {
    const prompt = session.promptTail + data.toString("utf8");
    if (prompt.includes("(gdb)")) {
      const resolve = session.startupResolve;
      session.startupResolve = undefined;
      resolve();
    }
    session.promptTail = prompt.slice(-4);
  }
  const lines: { readonly value: string; readonly invalidUtf8: boolean }[] = [];
  let offset = 0;
  while (offset < data.byteLength) {
    const newline = data.indexOf(0x0a, offset);
    const piece = data.subarray(
      offset,
      newline < 0 ? data.byteLength : newline,
    );
    session.bufferBytes += piece.byteLength;
    const lineBytes =
      session.bufferBytes - (newline >= 0 && piece.at(-1) === 0x0d ? 1 : 0);
    if (lineBytes > MAX_MI_LINE_BYTES) {
      (this as any)._failProtocol(
        session,
        "GDB emitted an MI line exceeding the 16 MiB protocol limit.",
      );
      return;
    }
    (this as any)._appendLineBytes(session, piece);
    if (newline < 0) break;
    const record = Buffer.concat(
      [
        ...session.bufferChunks,
        ...(session.bufferTail === undefined
          ? []
          : [session.bufferTail.subarray(0, session.bufferTailBytes)]),
      ],
      session.bufferBytes,
    );
    const withoutCarriageReturn =
      record.at(-1) === 0x0d ? record.subarray(0, -1) : record;
    const invalidUtf8 = !isUtf8(withoutCarriageReturn);
    const line = withoutCarriageReturn.toString("utf8");
    session.bufferChunks.length = 0;
    session.bufferTail = undefined;
    session.bufferTailBytes = 0;
    session.bufferBytes = 0;
    if (invalidUtf8) session.invalidUtf8Observed = true;
    if (line.length > 0) lines.push({ value: line, invalidUtf8 });
    offset = newline + 1;
  }
  for (const { value: line } of lines) {
    if (Buffer.byteLength(line, "utf8") > MAX_RECENT_MI_LINE_BYTES) {
      session.lines.push(truncateUtf8RecordPrefix(line));
      session.recentRecordsTruncated = true;
    } else session.lines.push(line);
  }
  if (session.lines.length > 256) {
    session.lines.splice(0, session.lines.length - 256);
    session.recentRecordsTruncated = true;
  }
  for (const { value: line, invalidUtf8 } of lines) {
    for (const pending of session.pending.values()) {
      const lineBytes = Buffer.byteLength(line, "utf8") + 1;
      if (
        pending.outputBytes + lineBytes <= session.maxCommandOutputBytes &&
        pending.outputBytes + lineBytes <= MAX_COMMAND_OUTPUT_BYTES &&
        pending.lines.length < MAX_COMMAND_OUTPUT_RECORDS
      ) {
        pending.lines.push(line);
        pending.outputBytes += lineBytes;
        pending.outputInvalidUtf8 ||= invalidUtf8;
      } else pending.outputTruncated = true;
    }
    if (line.startsWith("*stopped")) {
      for (const [token, pending] of session.pending) {
        if (!pending.awaitingInferiorStop) continue;
        clearTimeout(pending.timer);
        session.pending.delete(token);
        pending.cleanup();
        const records = [...pending.lines];
        pending.resolve({
          command: "",
          mi: pending.terminalRecord ?? "",
          records,
          console: records
            .filter((record) => record.startsWith("~"))
            .join("\n"),
          target: records.filter((record) => record.startsWith("@")).join("\n"),
          log: records.filter((record) => record.startsWith("&")).join("\n"),
          output_truncated: pending.outputTruncated,
          ...(pending.outputInvalidUtf8
            ? { output_invalid_utf8: true as const }
            : {}),
          completion_status: "complete",
        });
      }
      continue;
    }
    const match = /^(\d+)\^(done|running|connected|error|exit)(?:,|$)/u.exec(
      line,
    );
    if (match === null) continue;
    const token = Number(match[1]);
    const pending = session.pending.get(token);
    if (pending === undefined) continue;
    if (match[2] === "running") {
      pending.terminalRecord = line;
      pending.awaitingInferiorStop = true;
      continue;
    }
    clearTimeout(pending.timer);
    session.pending.delete(token);
    pending.cleanup();
    const records = [...pending.lines];
    pending.resolve({
      command: "",
      mi: line,
      records,
      console: records.filter((record) => record.startsWith("~")).join("\n"),
      target: records.filter((record) => record.startsWith("@")).join("\n"),
      log: records.filter((record) => record.startsWith("&")).join("\n"),
      output_truncated: pending.outputTruncated,
      ...(pending.outputInvalidUtf8
        ? { output_invalid_utf8: true as const }
        : {}),
      completion_status: "complete",
    });
  }
}

export function appendLineBytes(session: GdbSession, piece: Buffer): void {
  const slabBytes = 64 * 1024;
  let offset = 0;
  while (offset < piece.length) {
    session.bufferTail ??= Buffer.allocUnsafe(slabBytes);
    const remaining = slabBytes - session.bufferTailBytes;
    const copied = Math.min(remaining, piece.length - offset);
    piece.copy(
      session.bufferTail,
      session.bufferTailBytes,
      offset,
      offset + copied,
    );
    session.bufferTailBytes += copied;
    offset += copied;
    if (session.bufferTailBytes === slabBytes) {
      session.bufferChunks.push(session.bufferTail);
      session.bufferTail = undefined;
      session.bufferTailBytes = 0;
    }
  }
}

export function failProtocol(session: GdbSession, message: string): void {
  if (session.exited || session.protocolError !== undefined) return;
  session.protocolError = message;
  for (const pending of session.pending.values()) {
    clearTimeout(pending.timer);
    pending.cleanup();
    const records = [...pending.lines];
    pending.reject(
      new GdbProtocolFailureError(message, {
        command: pending.command,
        mi: "",
        records,
        console: records.filter((line) => line.startsWith("~")).join("\n"),
        target: records.filter((line) => line.startsWith("@")).join("\n"),
        log: records.filter((line) => line.startsWith("&")).join("\n"),
        output_truncated: pending.outputTruncated,
        ...(pending.outputInvalidUtf8
          ? { output_invalid_utf8: true as const }
          : {}),
        completion_status: "unknown",
      }),
    );
  }
  session.pending.clear();
  session.startupReject?.(new Error(message));
}
