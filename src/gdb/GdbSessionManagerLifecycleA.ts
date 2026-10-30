import {
  AnalysisCancelledError,
  AnalysisInputError,
  AnalysisTimeoutError,
} from "../domain/analysisErrorCore.js";
import { AnalysisError } from "../domain/analysisErrorBase.js";
import { err, ok, type Result } from "../domain/result.js";
import {
  closeOwnedDebuggerSessions,
  type OwnedDebuggerDetachResult,
  type ProcessStartTimeReader,
} from "../process/ownedDebuggerSession.js";

const STARTUP_TIMEOUT_MS = 10_000;

// GdbSessionManagerLifecycleA.ts 1072-1223
export async function close(
  sessionId: string,
): Promise<
  Result<{ readonly target_state: "none_observed" | "unknown" }, AnalysisError>
> {
  if ((this as any)._closing)
    return err(new AnalysisCancelledError("close_gdb_session"));
  const session = (this as any)._sessions.get(sessionId);
  if (session === undefined)
    return err(new AnalysisInputError("close_gdb_session"));
  if (session.exited) {
    const stopped = await (this as any)._stopDebuggerOnly(session);
    if (stopped.status === "incomplete")
      return err(
        (this as any)._retainCleanupFailure(
          session,
          "close_gdb_session",
          stopped.reason,
        ),
      );
    (this as any)._sessions.delete(sessionId);
    return ok({ target_state: "unknown" });
  }
  try {
    return await (this as any)._serialize(
      session,
      async () => {
        if (session.exited) {
          const stopped = await (this as any)._stopDebuggerOnly(session);
          if (stopped.status === "incomplete")
            return err(
              (this as any)._retainCleanupFailure(
                session,
                "close_gdb_session",
                stopped.reason,
              ),
            );
          (this as any)._sessions.delete(sessionId);
          return ok({ target_state: "unknown" });
        }
        let targetState: "none_observed" | "unknown" = "unknown";
        try {
          const groups = await (this as any)._request(
            session,
            "-list-thread-groups --recurse 1",
          );
          if (
            groups.completion_status !== "complete" ||
            groups.output_truncated ||
            !/^\d+\^done(?:,|$)/u.test(groups.mi)
          )
            throw new Error(
              "GDB could not confirm its complete, untruncated inferior list before shutdown.",
            );
          const groupCount = gdbThreadGroupCount(groups.mi);
          if (groupCount === undefined)
            throw new Error(
              "GDB returned an unknown inferior list before shutdown.",
            );
          if (groupCount > 0 && !session.inferiorTtyVerified)
            return err(
              new AnalysisInputError("close_gdb_session", undefined, [
                {
                  path: ["session_id"],
                  reason: "invalid_value",
                  message:
                    "Live GDB thread groups remain and no verified durable inferior TTY is configured. Select a safe disposition through the GDB console or restart with inferior_tty before closing.",
                },
              ]),
            );
          if (groupCount === 0) {
            session.noInferiorVerified = true;
            targetState = "none_observed";
            await (this as any)._request(session, "-gdb-exit");
          } else {
            session.noInferiorVerified = false;
            const disposition = await (this as any)._detachInferior(session);
            targetState =
              disposition.status === "no-inferior"
                ? "none_observed"
                : "unknown";
          }
        } catch {
          // If MI synchronization is lost, stop only the owned debugger process.
        }
        const stopped = await (this as any)._stopDebuggerOnly(session);
        if (stopped.status === "incomplete")
          return err(
            (this as any)._retainCleanupFailure(
              session,
              "close_gdb_session",
              stopped.reason,
            ),
          );
        (this as any)._sessions.delete(sessionId);
        return ok({ target_state: targetState });
      },
      undefined,
      "close_gdb_session",
    );
  } catch (cause) {
    if (cause instanceof AnalysisError) return err(cause);
    throw cause;
  }
}

export async function retryCleanupFailures(): Promise<
  Result<null, AnalysisError>
> {
  for (const session of (this as any)._sessions.values()) {
    if (session.cleanupFailures.size === 0) continue;
    const stopped = await (this as any)._stopDebuggerOnly(session);
    if (stopped.status === "incomplete")
      return err(
        [...session.cleanupFailures].at(-1) ??
          (this as any)._retainCleanupFailure(
            session,
            "close_gdb_session",
            stopped.reason,
          ),
      );
    (this as any)._sessions.delete(session.id);
  }
  return ok(null);
}

export async function closeAll(): Promise<void> {
  (this as any)._closing = true;
  (this as any)._closePromise ??= (this as any)
    ._drainStartsAndCloseSessions()
    .catch((cause: unknown) => {
      (this as any)._closePromise = undefined;
      throw cause;
    });
  return (this as any)._closePromise;
}

export async function drainStartsAndCloseSessions(): Promise<void> {
  const active = [...(this as any)._activeStarts.entries()];
  for (const [controller] of active) controller.abort();
  await Promise.allSettled(active.map(([, start]) => start));
  await Promise.all(
    [...(this as any)._sessions.values()].map((session) => session.commandTail),
  );
  await closeOwnedDebuggerSessions(
    (this as any)._sessions,
    (session) => (this as any)._stopDebuggerOnly(session),
    "GDB",
  );
}
