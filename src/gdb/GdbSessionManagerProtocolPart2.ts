import { constants as fsConstants } from "node:fs";
import { readFile, readlink, realpath, stat } from "node:fs/promises";

import {
  AnalysisCapabilityUnavailableError,
  AnalysisCancelledError,
  AnalysisResourceConstraintError,
  AnalysisTimeoutError,
} from "../domain/analysisErrorCore.js";
import { createEvidence } from "../domain/evidence.js";
import {
  ProviderProcessSupervisor,
  spawnOwnedProviderProcess,
  type OwnedProviderProcessSpawnOptions,
  type SpawnedOwnedProviderProcess,
} from "../process/ProviderProcess.js";
import { parseLinuxProcessStartTime } from "../process/ProcessOwnershipObservation.js";

export function request(
  session: GdbSession,
  command: string,
  signal?: AbortSignal,
  operation: "gdb_console" | "start_gdb_session" = "gdb_console",
  evidenceCommand: string = command,
): Promise<GdbCommandResult> {
  const stdin = session.launched.process.stdin;
  if (session.exited)
    return Promise.reject(
      new Error(
        `GDB MI process has exited (exit code ${String(session.exitCode)}, signal ${String(session.exitSignal)}).`,
      ),
    );
  if (
    stdin === null ||
    stdin === undefined ||
    stdin.destroyed ||
    !stdin.writable
  ) {
    const message = "GDB MI input stream is closed";
    (this as any)._failProtocol(session, message);
    return Promise.reject(new Error(message));
  }
  const token = session.nextToken++;
  return new Promise<GdbCommandResult>((resolve, reject) => {
    let abortListener!: () => void;
    const cleanup = (): void => {
      signal?.removeEventListener("abort", abortListener);
    };
    let pending!: PendingCommand;
    const timer = setTimeout(
      () => {
        session.pending.delete(token);
        session.protocolError =
          "A GDB MI command timed out; untagged stream output can no longer be safely correlated with later commands.";
        pending.cleanup();
        const partial: GdbCommandResult = {
          command: pending.evidenceCommand,
          mi: "",
          records: [...pending.lines],
          console: pending.lines
            .filter((line) => line.startsWith("~"))
            .join("\n"),
          target: pending.lines
            .filter((line) => line.startsWith("@"))
            .join("\n"),
          log: pending.lines.filter((line) => line.startsWith("&")).join("\n"),
          output_truncated: pending.outputTruncated,
          ...(pending.outputInvalidUtf8
            ? { output_invalid_utf8: true as const }
            : {}),
          completion_status: "unknown",
        };
        const timeout = new AnalysisTimeoutError(
          operation,
          (this as any)._commandTimeoutMs,
          { cause: new Error(`GDB MI command timed out: ${command}`) },
        );
        const evidence = createEvidence(undefined, GDB_PROVIDER_IDENTITY, {
          predicateType:
            operation === "start_gdb_session"
              ? "rea.debugger.startup-observation"
              : "rea.debugger.console-observation",
          operation,
          parameters: {
            session_id: session.id,
            command: pending.evidenceCommand,
          },
          result: { ...partial, records: [...partial.records] },
          rawResult: { ...partial, records: [...partial.records] },
          subjectUnavailableReason:
            "The active GDB inferior identity is not established by the debugger session identifier.",
          limitations: [
            "The GDB command exceeded its deadline; retained MI and stream records are partial and command completion is unknown.",
            "Cleanup of the owned GDB process was requested because output correlation could no longer be guaranteed.",
            "The unrestricted GDB console can access local shell, filesystem, network, and target controls.",
          ],
        });
        void (this as any)._stopDebuggerOnly(session).then(
          (stopped) => {
            if (
              stopped.status === "incomplete" &&
              operation === "start_gdb_session"
            ) {
              pending.reject(
                new AnalysisTimeoutError(
                  operation,
                  (this as any)._commandTimeoutMs,
                  {
                    cause: timeout,
                    cleanup: {
                      reason: stopped.reason,
                      resources: [session.id],
                    },
                    partialObservation: evidence,
                  },
                ),
              );
              return;
            }
            pending.reject(
              stopped.status === "incomplete"
                ? new AnalysisCapabilityUnavailableError(
                    "gdb",
                    "gdb_console",
                    `GDB command output could not be correlated and its owned process could not be confirmed stopped: ${stopped.reason}`,
                    {
                      cause: timeout,
                      cleanup: {
                        reason: stopped.reason,
                        resources: [session.id],
                      },
                      partialObservation: evidence,
                    },
                  )
                : new GdbCommandTimeoutError(
                    partial,
                    evidence,
                    (this as any)._commandTimeoutMs,
                  ),
            );
          },
          (cause: unknown) =>
            pending.reject(
              new AnalysisCapabilityUnavailableError(
                "gdb",
                "gdb_console",
                "GDB command output could not be correlated and owned process shutdown failed.",
                {
                  cause: new AggregateError(
                    [timeout, cause],
                    "GDB timeout and cleanup both failed.",
                  ),
                  cleanup: {
                    reason: gdbErrorMessage(cause),
                    resources: [session.id],
                  },
                  partialObservation: evidence,
                },
              ),
            ),
        );
      },
      (this as any)._commandTimeoutMs,
    );
    pending = {
      token,
      command,
      evidenceCommand,
      lines: [],
      resolve: (result) => {
        cleanup();
        resolve(result);
      },
      reject: (error) => {
        cleanup();
        reject(error);
      },
      cleanup,
      timer,
      outputBytes: 0,
      outputTruncated: false,
      outputInvalidUtf8: false,
      terminalRecord: undefined,
      awaitingInferiorStop: false,
    };
    session.pending.set(token, pending);
    abortListener = (): void => {
      clearTimeout(pending.timer);
      const partial: GdbCommandResult = {
        command: pending.evidenceCommand,
        mi: "",
        records: [...pending.lines],
        console: pending.lines
          .filter((line) => line.startsWith("~"))
          .join("\n"),
        target: pending.lines.filter((line) => line.startsWith("@")).join("\n"),
        log: pending.lines.filter((line) => line.startsWith("&")).join("\n"),
        output_truncated: pending.outputTruncated,
        ...(pending.outputInvalidUtf8
          ? { output_invalid_utf8: true as const }
          : {}),
        completion_status: "unknown",
      };
      const evidence = createEvidence(undefined, GDB_PROVIDER_IDENTITY, {
        predicateType: "rea.debugger.console-observation",
        operation: "gdb_console",
        parameters: {
          session_id: session.id,
          command: pending.evidenceCommand,
        },
        result: { ...partial, records: [...partial.records] },
        rawResult: { ...partial, records: [...partial.records] },
        subjectUnavailableReason:
          "The active GDB inferior identity is not established by the debugger session identifier.",
        limitations: [
          "The GDB command was cancelled; retained MI records are partial and command completion is unknown.",
          "Shutdown of the owned GDB process was requested because output correlation could no longer be guaranteed.",
          "The unrestricted GDB console can access local shell, filesystem, network, and target controls.",
        ],
      });
      session.pending.delete(token);
      session.protocolError =
        "A GDB MI command was cancelled; owned-session shutdown was requested because output correlation can no longer be guaranteed.";
      void (this as any)._stopDebuggerOnly(session).then(
        (stopped) => {
          pending.reject(
            stopped.status === "incomplete"
              ? new AnalysisCancelledError("gdb_console", {
                  cause: new Error(stopped.reason),
                  cleanup: {
                    reason: stopped.reason,
                    resources: [session.id],
                  },
                  partialObservation: evidence,
                })
              : new AnalysisCancelledError("gdb_console", {
                  partialObservation: evidence,
                }),
          );
        },
        (cause: unknown) =>
          pending.reject(
            new AnalysisCancelledError("gdb_console", {
              cause,
              partialObservation: evidence,
            }),
          ),
      );
    };
    signal?.addEventListener("abort", abortListener, { once: true });
    if (signal?.aborted) {
      abortListener();
      return;
    }
    try {
      session.launched.process.stdin?.write(
        `${token}${command}\n`,
        "utf8",
        (cause?: Error | null) => {
          if (cause)
            (this as any)._failProtocol(
              session,
              `GDB stdin write failed: ${cause.message}`,
            );
        },
      );
    } catch (cause) {
      (this as any)._failProtocol(
        session,
        `GDB stdin write failed: ${cause instanceof Error ? cause.message : "unknown error"}`,
      );
    }
  }).then((result) => ({ ...result, command }));
}
