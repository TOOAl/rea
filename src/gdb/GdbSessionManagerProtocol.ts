import { randomUUID } from "node:crypto";
import { constants as fsConstants } from "node:fs";
import { isUtf8 } from "node:buffer";
import { readFile, readlink, realpath, stat } from "node:fs/promises";

import {
  AnalysisCapabilityUnavailableError,
  AnalysisCancelledError,
  AnalysisInputError,
  AnalysisResourceConstraintError,
  AnalysisTimeoutError,
} from "../domain/analysisErrorCore.js";
import {
  AnalysisError,
  type AnalysisErrorOptions,
} from "../domain/analysisErrorBase.js";
import { createEvidence, type Evidence } from "../domain/evidence.js";
import { err, ok, type Result } from "../domain/result.js";
import {
  ProviderProcessSupervisor,
  spawnOwnedProviderProcess,
  type OwnedProviderProcessSpawnOptions,
  type SpawnedOwnedProviderProcess,
} from "../process/ProviderProcess.js";
import {
  closeOwnedDebuggerSessions,
  stopOwnedDebuggerProcess,
  type OwnedDebuggerDetachResult,
  type OwnedInferiorIdentity,
  type ProcessStartTimeReader,
  verifyOwnedInferiorsEnded,
} from "../process/ownedDebuggerSession.js";
import { parseLinuxProcessStartTime } from "../process/ProcessOwnershipObservation.js";

const STARTUP_TIMEOUT_MS = 10_000;
import type { GdbSession } from "./GdbSessionManagerCore.js";

// GdbSessionManagerProtocol.ts 1451-1908
export async function stopAfterProtocolFailure(
  session: GdbSession,
  cause: unknown,
): Promise<AnalysisCapabilityUnavailableError> {
  const stopped = await (this as any)._stopDebuggerOnly(session);
  const partial =
    cause instanceof GdbProtocolFailureError ? cause.partial : undefined;
  const partialObservation =
    partial === undefined
      ? undefined
      : createEvidence(undefined, GDB_PROVIDER_IDENTITY, {
          predicateType: "rea.debugger.console-observation",
          operation: "gdb_console",
          parameters: {
            session_id: session.id,
            command: partial.command,
          },
          result: { ...partial, records: [...partial.records] },
          rawResult: { ...partial, records: [...partial.records] },
          subjectUnavailableReason:
            "The active GDB inferior identity is not established by the debugger session identifier.",
          limitations: [
            "The GDB MI protocol failed; retained records are partial and command completion is unknown.",
            "The unrestricted GDB console can access local shell, filesystem, network, and target controls.",
          ],
        });
  return new AnalysisCapabilityUnavailableError(
    "gdb",
    "gdb_console",
    stopped.status === "incomplete"
      ? `${session.protocolError} The owned process could not be confirmed stopped: ${stopped.reason}`
      : session.protocolError!,
    {
      cause,
      ...(stopped.status === "incomplete"
        ? {
            cleanup: {
              reason: stopped.reason,
              resources: [session.id],
            },
          }
        : {}),
      ...(partialObservation === undefined ? {} : { partialObservation }),
    },
  );
}

export function stopDebuggerOnly(
  session: GdbSession,
): ReturnType<typeof stopOwnedDebuggerProcess> {
  if (session.stopAttempt !== undefined) return session.stopAttempt;
  const attempt = (this as any)
    ._stopProcess(session, "GDB")
    .then((stopped) => {
      if (stopped.status !== "incomplete") {
        for (const failure of session.cleanupFailures) failure.resolveCleanup();
        session.cleanupFailures.clear();
      }
      return stopped;
    })
    .finally(() => {
      if (session.stopAttempt === attempt) session.stopAttempt = undefined;
    });
  session.stopAttempt = attempt;
  return attempt;
}

export function retainCleanupFailure(
  session: GdbSession,
  operation: string,
  reason: string,
  options: AnalysisErrorOptions = {},
): AnalysisError {
  const failure = new AnalysisCapabilityUnavailableError(
    "gdb",
    operation,
    `The owned GDB process could not be confirmed stopped: ${reason}`,
    { ...options, cleanup: { reason, resources: [session.id] } },
  );
  session.cleanupFailures.add(failure);
  return failure;
}

export async function detachInferior(
  session: GdbSession,
): Promise<OwnedDebuggerDetachResult> {
  if (session.noInferiorVerified) return { status: "no-inferior" };
  if (session.exited)
    throw new Error("GDB exited before inferior state could be verified.");
  // A new MI inspection replaces the old snapshot. If this read is
  // incomplete, malformed, or reports multiple inferiors, no earlier PID
  // can stand in for the current unknown inventory.
  session.knownInferiorIdentities.clear();
  if (
    session.protocolError !== undefined ||
    session.pending.size > 0 ||
    session.pendingCommandCount > 1
  )
    throw new Error(
      "GDB MI state is not synchronized; inferior state is unknown.",
    );
  const groups = await (this as any)._request(
    session,
    "-list-thread-groups --recurse 1",
  );
  if (
    groups.completion_status !== "complete" ||
    groups.output_truncated ||
    !/^\d+\^done(?:,|$)/u.test(groups.mi)
  )
    throw new Error("GDB could not confirm its inferior state.");
  const inferiorPids = gdbThreadGroupPids(groups.mi);
  if (inferiorPids?.length === 0) {
    session.knownInferiorIdentities.clear();
    session.noInferiorVerified = true;
    return { status: "no-inferior" };
  }
  session.noInferiorVerified = false;
  if (inferiorPids?.length !== 1)
    throw new Error(
      inferiorPids === undefined
        ? "GDB returned an unknown recursive inferior list."
        : "GDB reports multiple inferiors; automatic detach cannot be confirmed safely.",
    );
  if (!session.inferiorTtyVerified)
    throw new Error(
      "GDB cannot detach the live inferior because no durable output sink was verified at session startup.",
    );
  const observedTty = await (this as any)._request(
    session,
    "-inferior-tty-show",
  );
  if (
    observedTty.completion_status !== "complete" ||
    observedTty.output_truncated ||
    !/^\d+\^done(?:,|$)/u.test(observedTty.mi) ||
    miStringField(observedTty.mi, "inferior_tty_terminal") !==
      session.inferiorTty
  )
    throw new Error(
      "GDB no longer reports the caller-selected inferior TTY; detachment cannot be confirmed safely.",
    );
  await (this as any)._verifyInferiorOutputSink(
    inferiorPids[0]!,
    session.inferiorTty!,
    (identity) =>
      session.knownInferiorIdentities.set(
        `${identity.pid}:${identity.startTime}`,
        identity,
      ),
  );
  const detached = await (this as any)._request(session, "-target-detach");
  if (
    detached.completion_status !== "complete" ||
    detached.output_truncated ||
    !/^\d+\^done(?:,|$)/u.test(detached.mi)
  )
    throw new Error("GDB did not confirm inferior detachment.");
  session.knownInferiorIdentities.clear();
  return { status: "detached", outputSink: "durable" };
}

export async function settleExitedCommands(
  session: GdbSession,
  code: number | null,
  signalCode: NodeJS.Signals | null,
): Promise<void> {
  await (this as any)._waitForStdoutSettlement(session);
  for (const pending of session.pending.values()) {
    clearTimeout(pending.timer);
    pending.reject(
      new GdbCommandProcessExitError({
        command: pending.command,
        mi: "",
        records: [...pending.lines],
        console: pending.lines
          .filter((line) => line.startsWith("~"))
          .join("\n"),
        target: pending.lines.filter((line) => line.startsWith("@")).join("\n"),
        log: pending.lines.filter((line) => line.startsWith("&")).join("\n"),
        process_exit_observed: true,
        process_exit_code: code,
        process_exit_signal: signalCode,
        output_truncated: pending.outputTruncated,
        ...(pending.outputInvalidUtf8
          ? { output_invalid_utf8: true as const }
          : {}),
        completion_status: "unknown",
      }),
    );
  }
  session.pending.clear();
}

export async function waitForStdoutSettlement(
  session: GdbSession,
): Promise<void> {
  let timer!: ReturnType<typeof setTimeout>;
  try {
    await Promise.race([
      session.stdoutSettled,
      new Promise<void>((resolve) => {
        timer = setTimeout(resolve, 1_000);
        timer.unref?.();
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

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
