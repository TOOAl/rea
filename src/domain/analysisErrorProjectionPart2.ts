import { jsonValueSchema, type JsonValue } from "./jsonValue.js";

import {
  AnalysisArtifactChangedError,
  AnalysisCancelledError,
  AnalysisUnsupportedTargetError,
  AnalysisOutputError,
  AnalysisTimeoutError,
} from "./analysisErrorCore.js";

// src/domain/analysisErrorProjectionPart2.ts
const primaryBrowserFailureReason = (
  error: BrowserObservationError,
): string | undefined => {
  if (!(error.cause instanceof AggregateError)) return undefined;
  const primary = error.cause.errors[0];
  if (primary instanceof BrowserObservationError) return primary.reason;
  if (primary instanceof AnalysisCancelledError) return "cancelled";
  if (primary instanceof AnalysisTimeoutError) return "timeout";
  if (typeof primary === "object" && primary !== null && "_tag" in primary)
    return typeof primary._tag === "string"
      ? primary._tag
      : "execution_failure";
  return "execution_failure";
};

const lifecycleErrorDetails = (
  error: AnalysisError,
): Readonly<Record<string, JsonValue>> | undefined => {
  if (error instanceof AnalysisCancelledError)
    return {
      operation: error.operation,
      cleanup: error.cleanupIncomplete ? "incomplete" : "complete",
      ...(error.cleanup === undefined || !error.cleanupIncomplete
        ? {}
        : {
            cleanup_reason: error.cleanup.reason,
            resources: [...error.cleanup.resources],
            execution_failure: "cancelled",
          }),
    };
  if (error instanceof HopperCancelledError)
    return { operation: "hopper", cleanup: "complete" };
  if (error instanceof AnalysisTimeoutError)
    return {
      operation: error.operation,
      timeout_ms: error.timeoutMs,
      ...(error.cleanup === undefined || !error.cleanupIncomplete
        ? {}
        : {
            cleanup: "incomplete",
            cleanup_reason: error.cleanup.reason,
            resources: [...error.cleanup.resources],
          }),
    };
  if (error instanceof HopperTimeoutError)
    return {
      stage: error.operation === undefined ? "startup" : error.stage,
      timeout_ms: error.timeoutMs,
      ...(error.launcherOutcome === undefined
        ? {}
        : { launcher: error.launcherOutcome }),
      provider_state: error.providerState,
      retry_action: error.providerState === "busy" ? "wait" : "retry",
      ...(error.operation === undefined ? {} : { operation: error.operation }),
      ...(error.requestId === undefined ? {} : { request_id: error.requestId }),
    };
  if (error._tag === "ProcessCaptureError" && error.cleanupIncomplete)
    return {
      cleanup: "incomplete",
      resources: [...error.cleanupResources],
      ...(error.cleanupReport === undefined
        ? {}
        : { cleanup_report: jsonValueSchema.parse(error.cleanupReport) }),
      ...(error.executionFailure === undefined
        ? {}
        : { execution_failure: error.executionFailure }),
    };
  if (error._tag === "ProcessCaptureError") {
    const details = {
      ...(error.userCategory === "cancelled"
        ? { operation: "process_capture", cleanup: "complete" }
        : {}),
      ...(error.cleanupReport === undefined
        ? {}
        : { cleanup_report: jsonValueSchema.parse(error.cleanupReport) }),
      ...(error.executionFailure === undefined
        ? {}
        : { execution_failure: error.executionFailure }),
    };
    return Object.keys(details).length === 0 ? undefined : details;
  }
  if (error instanceof ConfigurationError && error.settings.length > 0)
    return {
      settings: error.settings.map(({ setting, constraint }) => ({
        setting,
        constraint,
      })),
    };
  if (error instanceof BinaryTargetError)
    return {
      path: error.path,
      reason: error.reason,
      ...(error.constraint === undefined
        ? {}
        : { constraint: error.constraint }),
      ...(error.systemCode === undefined
        ? {}
        : { system_code: error.systemCode, boundary: "filesystem-read" }),
    };
  return undefined;
};

const RETRYABLE_CODES: ReadonlySet<AnalysisErrorProjection["code"]> = new Set([
  "artifact_changed",
  "invalid_request",
  "provider_timeout",
  "cancelled",
  "revision_conflict",
  "provider_unavailable",
]);

export interface AnalysisErrorProjection extends Readonly<
  Record<string, JsonValue>
> {
  readonly code:
    | "invalid_request"
    | "access_denied"
    | "artifact_changed"
    | "unreadable_output"
    | "capability_unavailable"
    | "unsupported_target"
    | "provider_unavailable"
    | "provider_timeout"
    | "resource_constraint"
    | "cancelled"
    | "artifact_integrity_mismatch"
    | "artifact_operation_failed"
    | "evidence_integrity_mismatch"
    | "truncated"
    | "process_capture_failed"
    | "cleanup_incomplete"
    | "revision_conflict"
    | "configuration_invalid"
    | "target_unavailable"
    | "execution_failure";
  readonly category:
    | "invalid_input"
    | "unsupported_provider"
    | "unsupported_target"
    | "integrity_mismatch"
    | "truncated"
    | "cancelled"
    | "timeout"
    | "resource_constraint"
    | "unavailable"
    | "execution_failure";
  readonly message: string;
  readonly retryable: boolean;
  readonly remediation: Readonly<{
    action: string;
  }>;
  readonly details?: Readonly<Record<string, JsonValue>>;
}
