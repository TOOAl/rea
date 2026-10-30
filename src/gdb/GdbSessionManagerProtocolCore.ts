import { constants as fsConstants } from "node:fs";
import { readFile, readlink, realpath, stat } from "node:fs/promises";

import {
  AnalysisCapabilityUnavailableError,
  AnalysisInputError,
  AnalysisTimeoutError,
} from "../domain/analysisErrorCore.js";
import {
  AnalysisError,
  type AnalysisErrorOptions,
} from "../domain/analysisErrorBase.js";
import { createEvidence } from "../domain/evidence.js";
import {
  ProviderProcessSupervisor,
  spawnOwnedProviderProcess,
  type OwnedProviderProcessSpawnOptions,
  type SpawnedOwnedProviderProcess,
} from "../process/ProviderProcess.js";
import {
  stopOwnedDebuggerProcess,
  type OwnedDebuggerDetachResult,
  type ProcessStartTimeReader,
} from "../process/ownedDebuggerSession.js";

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
