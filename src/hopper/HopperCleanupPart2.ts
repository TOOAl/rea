import type { ProgressReporter } from "../application/ProgressReporter.js";
import type { AnalysisError } from "../domain/analysisErrorBase.js";
import type { HopperError } from "../domain/hopperErrors.js";
import { HopperProcessError } from "../domain/hopperErrors.js";

import type { JsonValue } from "../domain/jsonValue.js";
import { ProviderCleanupError } from "../domain/providerCleanupError.js";
import { err, ok, type Result } from "../domain/result.js";
import type { PrivateRuntimeRoot } from "../process/PrivateRuntimeRoot.js";
import type { ProviderProcessSupervisor } from "../process/ProviderProcess.js";
import type { BridgeLaunch } from "./BridgeLauncher.js";
import {
  createOwnedHopperShutdownDiagnostic,
  providerCleanupFailure,
} from "./HopperDiagnostics.js";
import type { HopperRequestActivity } from "./HopperRequestQueue.js";
import { isHopperShutdownAcknowledgement } from "./HopperSessionValues.js";

const fallbackDocumentShutdown = async (
  input: HopperCleanupInput,
): Promise<boolean> => {
  const fallback = await input
    .request("shutdown_document")
    .catch((cause: unknown) =>
      err(shutdownRequestFailure("shutdown_document", cause)),
    );
  const confirmed =
    fallback.ok && isHopperShutdownAcknowledgement(fallback.value);
  if (!confirmed)
    input.logger.warn(
      {
        status: fallback.ok ? "invalid-acknowledgement" : "failed",
        ...(fallback.ok ? {} : shutdownFailureDetails(fallback.error)),
      },
      "Hopper document shutdown fallback was not confirmed",
    );
  return confirmed;
};

const shutdownRequestFailure = (
  operation: "shutdown" | "shutdown_document",
  cause: unknown,
): HopperProcessError => {
  return new HopperProcessError(null, { operation, cause });
};

const shutdownFailureDetails = (
  error: HopperError,
): Record<string, JsonValue> => ({
  errorTag: error._tag,
  ...(error instanceof HopperProcessError && error.operation !== undefined
    ? { operation: error.operation }
    : {}),
  ...(error instanceof HopperProcessError && error.requestId !== undefined
    ? { requestId: error.requestId }
    : {}),
  ...(error.cause === undefined
    ? {}
    : { failure_cause: describeFailureCause(error.cause) }),
});

const describeFailureCause = (cause: unknown): JsonValue => {
  if (cause instanceof Error) {
    const code = "code" in cause ? cause.code : undefined;
    return {
      name: cause.name,
      message: cause.message,
      ...(typeof code === "string" ||
      (typeof code === "number" && Number.isFinite(code))
        ? { code }
        : {}),
    };
  }
  if (typeof cause === "string") return { type: "string", message: cause };
  if (
    cause === null ||
    typeof cause === "boolean" ||
    (typeof cause === "number" && Number.isFinite(cause))
  )
    return { type: cause === null ? "null" : typeof cause, value: cause };
  return { type: typeof cause };
};

const stopProcess = async (
  input: HopperCleanupInput,
  state: CleanupState,
): Promise<void> => {
  const supervisor = input.resources.processSupervisor;
  if (supervisor === undefined) return;
  const stopped = await supervisor.stop(
    state.cleanupResult === undefined
      ? {}
      : { cleanupResult: state.cleanupResult },
  );
  const diagnostic = createOwnedHopperShutdownDiagnostic(
    supervisor.launch,
    stopped,
    state.cleanupResult,
  );
  try {
    input.onDiagnostic?.(diagnostic);
  } catch (cause: unknown) {
    // Diagnostic consumers cannot change the already-observed cleanup result.
    void cause;
  }
  input.logger.info(diagnostic, "Owned Hopper launcher shutdown completed");
  if (stopped.status !== "incomplete") {
    if (
      input.resources.launch?.providerLifetime === "launcher-process" &&
      stopped.status !== "not-owned"
    )
      input.resources.shutdownConfirmed = true;
    state.processStopped = true;
    input.resources.processSupervisor = undefined;
    return;
  }
  const processGroupId = supervisor.launch.ownership?.processGroupId;
  const resource =
    processGroupId === undefined
      ? "hopper-process"
      : `process-group:${String(processGroupId)}`;
  state.resources.add(resource);
  state.issues.push({ resource, reason: stopped.reason });
  input.logger.warn(
    { reason: stopped.reason },
    "Owned launcher cleanup failed closed",
  );
};

const recordUnconfirmedDocument = (
  input: HopperCleanupInput,
  state: CleanupState,
): void => {
  if (
    input.socket === undefined &&
    state.processStopped &&
    input.resources.launch?.providerLifetime === "launcher-process"
  ) {
    // Startup never connected a document; the verified provider lifetime ended.
    input.resources.shutdownConfirmed = true;
  }
  if (
    (input.socket === undefined && input.resources.launch === undefined) ||
    input.resources.shutdownConfirmed
  )
    return;
  state.resources.add("hopper-document");
  state.issues.push({
    resource: "hopper-document",
    reason:
      input.activeRequest === null
        ? "authenticated shutdown acknowledgement was not observed"
        : `bridge operation ${input.activeRequest.operation} remained active after caller ${input.activeRequest.callerState}`,
  });
};

const closeRuntimeRoot = async (
  input: HopperCleanupInput,
  state: CleanupState,
): Promise<void> => {
  const runtimeRoot = input.resources.runtimeRoot;
  try {
    await runtimeRoot?.close();
    input.resources.runtimeRoot = undefined;
  } catch (cause: unknown) {
    const resource = runtimeRoot?.path ?? "hopper-runtime-root";
    state.resources.add(resource);
    state.issues.push({
      resource,
      reason:
        cause instanceof Error
          ? cause.message
          : "private runtime root cleanup failed",
    });
  }
};

const cleanupOutcome = (
  input: HopperCleanupInput,
  state: CleanupState,
): Result<null, AnalysisError> => {
  if (state.issues.length === 0) return ok(null);
  return err(
    new ProviderCleanupError("hopper", [...state.resources], {
      issues: cleanupIssueDetails(state.issues),
      ...(input.resources.runtimeRoot === undefined
        ? {}
        : { runtime_root: input.resources.runtimeRoot.path }),
      ...(input.activeRequest === null
        ? {}
        : { active_request: activityDetails(input.activeRequest) }),
    }),
  );
};

const cleanupIssueDetails = (issues: readonly CleanupIssue[]): JsonValue =>
  issues.map((issue) => ({
    resource: issue.resource,
    reason: issue.reason,
  }));

const activityDetails = (activity: HopperRequestActivity): JsonValue => ({
  request_id: activity.requestId,
  operation: activity.operation,
  elapsed_ms: activity.elapsedMs,
  caller_state: activity.callerState,
  queued_requests: activity.queuedRequests,
});

const report = async (
  progress: ProgressReporter | undefined,
  completed: number,
  message: string,
): Promise<void> => {
  // best-effort cleanup: progress reporting must not fail session cleanup.
  await progress
    ?.report({
      phase: "hopper_cleanup",
      completed,
      total: 1,
      message,
    })
    .catch(() => undefined);
};
