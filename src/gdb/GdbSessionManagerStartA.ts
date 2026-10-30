import { randomUUID } from "node:crypto";

import {
  AnalysisCapabilityUnavailableError,
  AnalysisCancelledError,
  AnalysisInputError,
  AnalysisResourceConstraintError,
} from "../domain/analysisErrorCore.js";
import { AnalysisError } from "../domain/analysisErrorBase.js";
import { err, type Result } from "../domain/result.js";

const STARTUP_TIMEOUT_MS = 10_000;

// GdbSessionManagerStartA.ts 363-478
export async function start(
  signal?: AbortSignal,
  options: { readonly inferiorTty?: string } = {},
): Promise<
  Result<
    { readonly session_id: string; readonly mi_version: "mi3" | "mi2" },
    AnalysisError
  >
> {
  if (
    options.inferiorTty !== undefined &&
    (options.inferiorTty.length === 0 || options.inferiorTty.includes("\0"))
  )
    return err(
      new AnalysisInputError("start_gdb_session", undefined, [
        {
          path: ["inferior_tty"],
          reason: "invalid_value",
          message:
            "The inferior TTY path must be non-empty and must not contain NUL.",
        },
      ]),
    );
  if ((this as any)._closing || signal?.aborted)
    return err(new AnalysisCancelledError("start_gdb_session"));
  if ((this as any)._platform !== "linux")
    return err(
      new AnalysisCapabilityUnavailableError(
        "gdb",
        "start_gdb_session",
        (this as any)._platform === "win32"
          ? "Persistent Windows GDB sessions are unavailable because owned Job Object cleanup can terminate debugger inferiors."
          : "Persistent GDB sessions are available only on Linux because REA verifies live inferior output descriptors through /proc.",
      ),
    );
  const controller = new AbortController();
  const relayAbort = (): void => controller.abort(signal?.reason);
  signal?.addEventListener("abort", relayAbort, { once: true });
  if (signal?.aborted) relayAbort();
  const tracked = Promise.resolve()
    .then(() => (this as any)._startWithReservation(controller.signal, options))
    .finally(() => {
      signal?.removeEventListener("abort", relayAbort);
      (this as any)._activeStarts.delete(controller);
    });
  (this as any)._activeStarts.set(controller, tracked);
  return tracked;
}

export async function startWithReservation(
  signal: AbortSignal,
  options: { readonly inferiorTty?: string } = {},
): Promise<
  Result<
    { readonly session_id: string; readonly mi_version: "mi3" | "mi2" },
    AnalysisError
  >
> {
  if (signal?.aborted)
    return err(new AnalysisCancelledError("start_gdb_session"));
  const occupied =
    (this as any)._sessions.size + (this as any)._sessionReservations;
  if (occupied >= (this as any)._maxSessions)
    return err(
      new AnalysisResourceConstraintError(
        "start_gdb_session",
        "memory",
        "GDB session capacity reached.",
        {
          max_sessions: (this as any)._maxSessions,
          active_or_reserved_sessions: occupied,
        },
      ),
    );
  (this as any)._sessionReservations += 1;
  let reservationHeld = true;
  const releaseReservation = (): void => {
    if (!reservationHeld) return;
    reservationHeld = false;
    (this as any)._sessionReservations -= 1;
  };
  try {
    return await (this as any)._startReserved(
      releaseReservation,
      signal,
      options,
    );
  } finally {
    releaseReservation();
  }
}

export async function startReserved(
  releaseReservation: () => void,
  signal: AbortSignal,
  options: { readonly inferiorTty?: string } = {},
): Promise<
  Result<
    { readonly session_id: string; readonly mi_version: "mi3" | "mi2" },
    AnalysisError
  >
> {
  const id = randomUUID();
  const mi3 = await (this as any)._startProtocol(
    id,
    "mi3",
    releaseReservation,
    signal,
    options.inferiorTty,
  );
  return mi3.ok || signal.aborted || (this as any)._sessions.has(id)
    ? mi3
    : (this as any)._startProtocol(
        id,
        "mi2",
        releaseReservation,
        signal,
        options.inferiorTty,
      );
}
