import { randomUUID } from "node:crypto";
import { isUtf8 } from "node:buffer";

import {
  AnalysisCapabilityUnavailableError,
  AnalysisCancelledError,
  AnalysisResourceConstraintError,
  AnalysisTimeoutError,
} from "../domain/analysisErrorCore.js";
import { AnalysisError } from "../domain/analysisErrorBase.js";
import { createEvidence } from "../domain/evidence.js";
import { err, ok, type Result } from "../domain/result.js";
import {
  ProviderProcessSupervisor,
  type OwnedProviderProcessSpawnOptions,
  type SpawnedOwnedProviderProcess,
} from "../process/ProviderProcess.js";
import {
  stopOwnedDebuggerProcess,
  type OwnedInferiorIdentity,
  verifyOwnedInferiorsEnded,
} from "../process/ownedDebuggerSession.js";

const STARTUP_TIMEOUT_MS = 10_000;
import type { GdbSession } from "./GdbSessionManagerCore.js";

// GdbSessionManagerStartB.ts 479-865
export async function startProtocol(
  id: string,
  miVersion: "mi3" | "mi2",
  releaseReservation: () => void,
  signal: AbortSignal,
  inferiorTty?: string,
): Promise<
  Result<
    { readonly session_id: string; readonly mi_version: "mi3" | "mi2" },
    AnalysisError
  >
> {
  let launched: SpawnedOwnedProviderProcess;
  try {
    const spawnOptions: OwnedProviderProcessSpawnOptions = {
      command: (this as any)._command,
      arguments: ["--nx", "--quiet", `--interpreter=${miVersion}`],
      runId: randomUUID(),
      stdin: "pipe",
      hostEnvironment: (this as any)._environment,
      signal,
    };
    launched = await (this as any)._spawnProcess(spawnOptions);
  } catch (cause) {
    if (signal?.aborted || cause instanceof AnalysisCancelledError)
      return err(new AnalysisCancelledError("start_gdb_session", { cause }));
    return err(
      new AnalysisCapabilityUnavailableError(
        "gdb",
        "start_gdb_session",
        cause instanceof Error ? cause.message : "Unable to start GDB",
      ),
    );
  }
  const supervisor = new ProviderProcessSupervisor(
    { process: launched.process, ownsProcessLifetime: false },
    { captureStdout: false, maxDiagnosticBytes: MAX_DIAGNOSTIC_BYTES },
  );
  let settleStdout!: () => void;
  const stdoutSettled = new Promise<void>((resolve) => {
    settleStdout = resolve;
  });
  const session: GdbSession = {
    id,
    miVersion,
    launched,
    supervisor,
    detachInferior: () => (this as any)._detachInferior(session),
    inferiorStateUnknown: () => !session.noInferiorVerified,
    verifyInferiorsEndedAfterExit: async () => {
      const ended = await verifyOwnedInferiorsEnded(
        session.knownInferiorIdentities.values(),
        (this as any)._readInferiorProcessStartTime,
      );
      if (ended) session.knownInferiorIdentities.clear();
      return ended;
    },
    knownInferiorIdentities: new Map(),
    inferiorTty,
    maxCommandOutputBytes: (this as any)._maxCommandOutputBytes,
    stdoutSettled,
    settleStdout,
    inferiorTtyVerified: false,
    // GDB is launched with --nx and receives no target-execution commands
    // during startup, so no inferior can exist until execute() is called.
    noInferiorVerified: true,
    stopAttempt: undefined,
    pending: new Map(),
    cleanupFailures: new Set(),
    lines: [],
    bufferChunks: [],
    bufferTail: undefined,
    bufferTailBytes: 0,
    bufferBytes: 0,
    invalidUtf8Observed: false,
    promptTail: "",
    ready: false,
    exited: false,
    exitCode: null,
    exitSignal: null,
    nextToken: 1,
    startupResolve: undefined,
    startupReject: undefined,
    commandTail: Promise.resolve(),
    pendingCommandCount: 0,
    protocolError: undefined,
    recentRecordsTruncated: false,
  };
  launched.process.stdout?.on("data", (chunk: string | Buffer) =>
    (this as any)._receive(
      session,
      typeof chunk === "string" ? Buffer.from(chunk, "utf8") : chunk,
    ),
  );
  if (launched.process.stdout === null) settleStdout();
  else launched.process.stdout.once("end", settleStdout);
  launched.process.stdin?.on("error", (cause: Error) =>
    (this as any)._failProtocol(
      session,
      `GDB stdin stream failed: ${cause.message}`,
    ),
  );
  launched.process.stdin?.once("close", () =>
    (this as any)._failProtocol(
      session,
      "GDB stdin stream closed unexpectedly.",
    ),
  );
  launched.process.once("exit", (code, signalCode) => {
    session.exited = true;
    session.exitCode = code;
    session.exitSignal = signalCode;
    void (this as any)
      ._waitForStdoutSettlement(session)
      .then(() =>
        session.startupReject?.(
          new Error(
            `GDB exited during startup (exit code ${String(code)}, signal ${String(signalCode)}).`,
          ),
        ),
      );
    void (this as any)._settleExitedCommands(session, code, signalCode);
  });
  let startupTimer!: ReturnType<typeof setTimeout>;
  let startupAbortListener!: () => void;
  try {
    await new Promise<void>((resolve, reject) => {
      session.startupResolve = resolve;
      session.startupReject = reject;
      startupAbortListener = () =>
        reject(new AnalysisCancelledError("start_gdb_session"));
      signal?.addEventListener("abort", startupAbortListener, {
        once: true,
      });
      if (signal?.aborted) startupAbortListener();
      startupTimer = setTimeout(
        () =>
          reject(
            new AnalysisTimeoutError(
              "start_gdb_session",
              (this as any)._startupTimeoutMs,
              {
                cause: new Error(
                  "GDB did not emit the MI prompt before the startup deadline",
                ),
              },
            ),
          ),
        (this as any)._startupTimeoutMs,
      );
      startupTimer.unref();
    });
    session.ready = true;
    if (signal?.aborted) throw new AnalysisCancelledError("start_gdb_session");
    const autoLoad = await (this as any)._request(
      session,
      "-gdb-set auto-load off",
      signal,
      "start_gdb_session",
    );
    if (!/^\d+\^done(?:,|$)/u.test(autoLoad.mi)) {
      throw new AnalysisCapabilityUnavailableError(
        "gdb",
        "start_gdb_session",
        `GDB rejected the required automatic-loading disable command (${autoLoad.mi}); the session was not started.`,
      );
    }
    if (inferiorTty !== undefined) {
      const configured = await (this as any)._request(
        session,
        `-inferior-tty-set ${miQuote(inferiorTty)}`,
        signal,
        "start_gdb_session",
      );
      if (
        configured.completion_status !== "complete" ||
        configured.output_truncated ||
        !/^\d+\^done(?:,|$)/u.test(configured.mi)
      )
        throw new AnalysisCapabilityUnavailableError(
          "gdb",
          "start_gdb_session",
          "GDB did not confirm the inferior TTY configuration.",
        );
      const observed = await (this as any)._request(
        session,
        "-inferior-tty-show",
        signal,
        "start_gdb_session",
      );
      const reportedTty =
        observed.completion_status === "complete" && !observed.output_truncated
          ? miStringField(observed.mi, "inferior_tty_terminal")
          : undefined;
      if (
        !/^\d+\^done(?:,|$)/u.test(observed.mi) ||
        reportedTty !== inferiorTty
      )
        throw new AnalysisCapabilityUnavailableError(
          "gdb",
          "start_gdb_session",
          "GDB did not report the exact caller-selected inferior TTY after configuration.",
        );
      session.inferiorTtyVerified = true;
    }
    if (signal?.aborted) throw new AnalysisCancelledError("start_gdb_session");
    // Give queued exit notifications a turn before publishing startup.
    await new Promise<void>((resolve) => setImmediate(resolve));
    if (signal?.aborted) throw new AnalysisCancelledError("start_gdb_session");
    if (session.exited || session.protocolError !== undefined)
      throw new Error(
        session.protocolError ?? "GDB exited during startup readiness.",
      );
    // Before this point no target command can run. Once a usable session is
    // published, the inferior state is no longer inferred from startup phase.
    session.noInferiorVerified = false;
    (this as any)._sessions.set(id, session);
    releaseReservation();
    return ok({ session_id: id, mi_version: miVersion });
  } catch (cause) {
    const startupExited =
      cause instanceof GdbCommandProcessExitError || session.exited;
    const processExit =
      cause instanceof GdbCommandProcessExitError
        ? cause.partial
        : startupExited
          ? {
              command: "GDB startup",
              mi: "",
              records: [...session.lines],
              console: session.lines
                .filter((line) => line.startsWith("~"))
                .join("\n"),
              target: session.lines
                .filter((line) => line.startsWith("@"))
                .join("\n"),
              log: session.lines
                .filter((line) => line.startsWith("&"))
                .join("\n"),
              process_exit_observed: true,
              process_exit_code: session.exitCode,
              process_exit_signal: session.exitSignal,
              output_truncated: session.recentRecordsTruncated,
              completion_status: "unknown" as const,
            }
          : undefined;
    const startupEvidenceResult =
      processExit ??
      (session.lines.length > 0
        ? {
            command: "GDB startup",
            mi: "",
            records: [...session.lines],
            console: session.lines
              .filter((line) => line.startsWith("~"))
              .join("\n"),
            target: session.lines
              .filter((line) => line.startsWith("@"))
              .join("\n"),
            log: session.lines
              .filter((line) => line.startsWith("&"))
              .join("\n"),
            output_truncated: session.recentRecordsTruncated,
            completion_status: "unknown" as const,
          }
        : undefined);
    const startupEvidencePayload =
      startupEvidenceResult === undefined
        ? undefined
        : {
            ...startupEvidenceResult,
            ...(session.invalidUtf8Observed
              ? { output_invalid_utf8: true as const }
              : {}),
          };
    const startupEvidence =
      startupEvidencePayload === undefined
        ? undefined
        : createEvidence(undefined, GDB_PROVIDER_IDENTITY, {
            predicateType: "rea.debugger.startup-observation",
            operation: "start_gdb_session",
            parameters: {
              mi_version: miVersion,
              command: startupEvidencePayload.command,
            },
            result: {
              ...startupEvidencePayload,
              records: [...startupEvidencePayload.records],
            },
            rawResult: {
              ...startupEvidencePayload,
              records: [...startupEvidencePayload.records],
            },
            subjectUnavailableReason:
              "No usable debugger session became ready during GDB startup.",
            limitations: [
              "GDB startup failed before a usable session could be established; captured startup records are incomplete.",
              ...(session.invalidUtf8Observed
                ? [
                    "GDB startup output contained invalid UTF-8 bytes; decoded records contain replacement characters.",
                  ]
                : []),
            ],
          });
    const processOutput = session.supervisor.snapshot();
    const capturedOutput = {
      stdout: processOutput.stdout.text,
      stderr: processOutput.stderr.text,
      truncated:
        processOutput.diagnosticTruncated === true ||
        processOutput.stdout.observedBytes > processOutput.stdout.bytes ||
        processOutput.stderr.observedBytes > processOutput.stderr.bytes,
      stdout_bytes: processOutput.stdout.observedBytes,
      stderr_bytes: processOutput.stderr.observedBytes,
      exit_code: processOutput.exitCode ?? null,
      signal: processOutput.signal ?? null,
    };
    const stopped = await (this as any)._stopDebuggerOnly(session);
    if (stopped.status === "incomplete") {
      (this as any)._sessions.set(id, session);
      releaseReservation();
      const cleanup = { reason: stopped.reason, resources: [session.id] };
      const details = {
        cause,
        capturedOutput,
        cleanup,
        ...(startupEvidence === undefined
          ? {}
          : { partialObservation: startupEvidence }),
      };
      if (cause instanceof AnalysisTimeoutError)
        return err(
          new AnalysisTimeoutError(cause.operation, cause.timeoutMs, details),
        );
      if (cause instanceof AnalysisCancelledError)
        return err(new AnalysisCancelledError(cause.operation, details));
      const startupFailureMessage = gdbErrorMessage(cause);
      return err(
        new AnalysisCapabilityUnavailableError(
          "gdb",
          "start_gdb_session",
          `GDB startup failed (${startupFailureMessage}) and its owned process could not be confirmed stopped: ${stopped.reason}`,
          details,
        ),
      );
    }
    const errorDetails = {
      cause,
      capturedOutput,
      ...(startupEvidence === undefined
        ? {}
        : { partialObservation: startupEvidence }),
    };
    const error =
      signal?.aborted || cause instanceof AnalysisCancelledError
        ? new AnalysisCancelledError("start_gdb_session", errorDetails)
        : cause instanceof AnalysisTimeoutError
          ? new AnalysisTimeoutError(
              cause instanceof GdbCommandTimeoutError
                ? "start_gdb_session"
                : cause.operation,
              cause.timeoutMs,
              errorDetails,
            )
          : cause instanceof AnalysisCapabilityUnavailableError
            ? new AnalysisCapabilityUnavailableError(
                "gdb",
                "start_gdb_session",
                cause.message,
                errorDetails,
              )
            : session.protocolError !== undefined
              ? new AnalysisCapabilityUnavailableError(
                  "gdb",
                  "start_gdb_session",
                  session.protocolError,
                  errorDetails,
                )
              : new AnalysisCapabilityUnavailableError(
                  "gdb",
                  "start_gdb_session",
                  `GDB startup failed (${gdbErrorMessage(cause)}).`,
                  errorDetails,
                );
    return err(error);
  } finally {
    clearTimeout(startupTimer);
    signal?.removeEventListener("abort", startupAbortListener);
  }
}
