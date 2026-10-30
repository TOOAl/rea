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

// GdbSessionManagerExecute.ts 866-1071
export async function execute(
  sessionId: string,
  command: string,
  signal?: AbortSignal,
): Promise<
  Result<
    { readonly result: GdbCommandResult; readonly evidence: Evidence },
    AnalysisError
  >
> {
  const session = (this as any)._sessions.get(sessionId);
  if (
    (this as any)._closing ||
    session === undefined ||
    !session.ready ||
    session.exited ||
    session.protocolError !== undefined
  )
    return err(
      new AnalysisInputError("gdb_console", undefined, [
        {
          path: ["session_id"],
          reason: "invalid_value",
          message: "GDB session is unavailable or closed.",
        },
      ]),
    );
  if (signal?.aborted) return err(new AnalysisCancelledError("gdb_console"));
  try {
    const completed = await (this as any)._serialize(
      session,
      async () => {
        if (session.exited || session.protocolError !== undefined)
          return err(new AnalysisInputError("gdb_console"));
        session.noInferiorVerified = false;
        session.knownInferiorIdentities.clear();
        if (commandMayChangeInferiorOutput(command))
          session.inferiorTtyVerified = false;
        try {
          const result = await (this as any)._request(
            session,
            `-interpreter-exec console ${miQuote(command)}`,
            signal,
            "gdb_console",
            command,
          );
          const evidence = createEvidence(
            undefined,
            { id: "gnu.gdb", name: "GNU GDB", version: null },
            {
              predicateType: "rea.debugger.console-observation",
              operation: "gdb_console",
              parameters: { session_id: sessionId, command },
              result: {
                command,
                mi: result.mi,
                records: [...result.records],
                console: result.console,
                target: result.target,
                log: result.log,
                output_truncated: result.output_truncated,
                ...(result.output_invalid_utf8
                  ? { output_invalid_utf8: true as const }
                  : {}),
                completion_status: result.completion_status,
              },
              rawResult: {
                command,
                mi: result.mi,
                records: [...result.records],
                console: result.console,
                target: result.target,
                log: result.log,
                output_truncated: result.output_truncated,
                ...(result.output_invalid_utf8
                  ? { output_invalid_utf8: true as const }
                  : {}),
                completion_status: result.completion_status,
              },
              subjectUnavailableReason:
                "The active GDB inferior identity is not established by the debugger session identifier.",
              limitations: [
                "MI records are returned as decoded text; their semantics depend on GDB version and target.",
                ...(result.output_invalid_utf8
                  ? [
                      "MI stream bytes were not valid UTF-8; returned text contains replacement characters.",
                    ]
                  : []),
                "The unrestricted GDB console can access local shell, filesystem, network, and target controls.",
              ],
            },
          );
          return ok({ result, evidence });
        } catch (cause) {
          if (cause instanceof AnalysisCancelledError) return err(cause);
          if (cause instanceof AnalysisCapabilityUnavailableError)
            return err(cause as AnalysisError);
          if (cause instanceof GdbCommandTimeoutError) {
            const result = cause.partial;
            return ok({ result, evidence: cause.evidence });
          }
          if (session.protocolError !== undefined)
            return err(
              await (this as any)._stopAfterProtocolFailure(session, cause),
            );
          if (cause instanceof GdbCommandProcessExitError) {
            const processExit = cause as GdbCommandProcessExitError;
            const result: GdbCommandResult = {
              ...processExit.partial,
              command,
            };
            const evidence = createEvidence(
              undefined,
              { id: "gnu.gdb", name: "GNU GDB", version: null },
              {
                predicateType: "rea.debugger.console-observation",
                operation: "gdb_console",
                parameters: { session_id: sessionId, command },
                result: { ...result, records: [...result.records] },
                rawResult: { ...result, records: [...result.records] },
                subjectUnavailableReason:
                  "The active GDB inferior identity is not established by the debugger session identifier.",
                limitations: [
                  "GDB exited before returning a correlated MI result record; only records retained for the active command are returned raw.",
                  ...(result.output_truncated
                    ? [
                        "Retained MI records are a truncated prefix; output completeness is unknown.",
                      ]
                    : []),
                ],
              },
            );
            const stopped = await (this as any)._stopDebuggerOnly(session);
            if (stopped.status === "incomplete")
              return err(
                (this as any)._retainCleanupFailure(
                  session,
                  "gdb_console",
                  stopped.reason,
                  { cause, partialObservation: evidence },
                ),
              );
            return ok({ result, evidence });
          }
          return err(
            new AnalysisTimeoutError(
              "gdb_console",
              (this as any)._commandTimeoutMs,
              {
                cause,
              },
            ),
          );
        }
      },
      signal,
      "gdb_console",
    );
    if (!completed.ok && completed.error.cleanupIncomplete)
      session.cleanupFailures.add(completed.error);
    return completed;
  } catch (cause) {
    const error =
      cause instanceof AnalysisError
        ? cause
        : new AnalysisCancelledError("gdb_console", { cause });
    if (error.cleanupIncomplete) session.cleanupFailures.add(error);
    return err(error);
  }
}

export function status(sessionId: string):
  | {
      readonly session_id: string;
      readonly mi_version: "mi3" | "mi2";
      readonly state: "ready" | "closed";
      readonly recent_mi_records: readonly string[];
      readonly recent_mi_records_truncated: boolean;
      readonly mi_invalid_utf8: boolean;
      readonly stderr: string;
      readonly stderr_observed_bytes: number;
      readonly stderr_truncated: boolean;
      readonly stderr_invalid_utf8: boolean;
      readonly diagnostics_truncated: boolean;
      readonly inferior_tty: string | null;
      readonly inferior_tty_verified: boolean;
    }
  | undefined {
  const session = (this as any)._sessions.get(sessionId);
  if (session === undefined) return undefined;
  const diagnostics = session.supervisor.snapshot();
  return {
    session_id: session.id,
    mi_version: session.miVersion,
    state:
      session.exited || session.protocolError !== undefined || !session.ready
        ? "closed"
        : "ready",
    recent_mi_records: [...session.lines],
    recent_mi_records_truncated: session.recentRecordsTruncated,
    mi_invalid_utf8: session.invalidUtf8Observed,
    stderr: diagnostics.stderr.text,
    stderr_observed_bytes: diagnostics.stderr.observedBytes,
    stderr_truncated:
      diagnostics.stderr.observedBytes > diagnostics.stderr.bytes,
    stderr_invalid_utf8: diagnostics.stderr.invalidUtf8 === true,
    diagnostics_truncated: diagnostics.diagnosticTruncated === true,
    inferior_tty: session.inferiorTty ?? null,
    inferior_tty_verified: session.inferiorTtyVerified,
  };
}
