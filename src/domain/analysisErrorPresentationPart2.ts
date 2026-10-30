import {
  AnalysisAccessDeniedError,
  AnalysisArtifactChangedError,
  AnalysisCapabilityUnavailableError,
  AnalysisInputError,
  AnalysisOutputError,
  AnalysisUnsupportedTargetError,
  AnalysisResourceConstraintError,
} from "./analysisErrorCore.js";
import { ArtifactOperationError } from "./artifactOperationError.js";
import {
  BinaryTargetError,
  ConfigurationError,
  NoBinaryOpenError,
} from "./configurationErrors.js";
import { BrowserObservationError } from "./browserObservationError.js";
import {
  EvidenceFileError,
  EvidenceIntegrityError,
  EvidenceReferenceError,
  AnalysisSnapshotMismatchError,
} from "./evidenceErrors.js";
import {
  HopperRemoteError,
  HopperProcessError,
  HopperStartError,
  HopperTimeoutError,
} from "./hopperErrors.js";
import { ProviderSelectionError } from "./providerSelectionError.js";
import { UnknownRegistryError } from "./unknownRegistryError.js";
import { providerRetryAction } from "./providerOperationHealth.js";
import type { AnalysisError, AnalysisErrorTag } from "./analysisErrorBase.js";
import type { AnalysisErrorProjection } from "./analysisErrorProjection.js";

export const analysisErrorUserMessage = (error: AnalysisError): string => {
  if (error instanceof AnalysisSnapshotMismatchError) return error.message;
  if (error instanceof AnalysisUnsupportedTargetError) return error.message;
  if (error instanceof AnalysisResourceConstraintError) return error.reason;
  if (error instanceof AnalysisAccessDeniedError)
    return "Host filesystem permissions denied read access to the selected path.";
  if (error instanceof AnalysisArtifactChangedError)
    return "The selected artifact changed during acquisition; no stable snapshot was decoded.";
  if (error instanceof AnalysisInputError)
    return (
      error.userMessage ??
      "Analysis input is invalid. Check the arguments and try again."
    );
  const hopperMessage = hopperErrorUserMessage(error);
  if (hopperMessage !== undefined) return hopperMessage;
  if (error.userMessage !== undefined) return error.userMessage;
  if (error instanceof AnalysisCapabilityUnavailableError && error.retryable)
    return "Required runtime controls are unavailable for this attempt.";
  const standardMessage = standardErrorMessage(error._tag);
  if (standardMessage !== undefined) return standardMessage;
  if (error instanceof ArtifactOperationError) return artifactMessage(error);
  if (error instanceof EvidenceReferenceError)
    return error.reason === "missing"
      ? `Evidence ${error.evidenceId} is not retained in this session. Supply complete inline Evidence, re-run its producer, or import its bundle before using this reference.`
      : `Evidence ${error.evidenceId} does not match the requested reference (${error.reason}). Check the expected and actual identity in the diagnostic details.`;
  if (error instanceof EvidenceIntegrityError)
    return "Evidence is invalid or has changed. Recreate or re-import it, then try again.";
  if (error instanceof EvidenceFileError) return evidenceFileMessage(error);
  if (error instanceof UnknownRegistryError && error.reason === "not-found")
    return "The requested residual unknown does not exist in this session. Check the unknown_id and try again.";
  if (error instanceof UnknownRegistryError)
    return "Evidence state changed before the update completed. Refresh the current state and try again.";
  if (error instanceof ConfigurationError)
    return error.settings.length === 0
      ? "REA configuration is invalid. Run `rea doctor` and fix the reported setting."
      : `REA configuration is invalid: ${error.settings
          .map(({ setting, constraint }) =>
            constraint.includes(setting)
              ? constraint.replace(/\.$/u, "")
              : `${setting}: ${constraint}`,
          )
          .join("; ")}.`;
  if (error instanceof NoBinaryOpenError) return error.message;
  if (
    error instanceof BinaryTargetError &&
    error.constraint === "wasm_requires_static_inspection"
  )
    return `${error.message}. Static WebAssembly inspection uses a separate optional WABT lane, not a native analysis engine.`;
  if (error instanceof BinaryTargetError)
    return error.constraint === "directory_requires_file"
      ? "open_binary accepts files and macOS app bundles. This target is a directory; JavaScript/Electron application directories can be analyzed directly with analyze_javascript_application or `rea analyze <directory>`."
      : error.constraint === "file_format_rejected" ||
          error.constraint === "load_selection_rejected"
        ? `${error.message}.`
        : `${error.message}. Check that the path exists, is readable, and points to a supported file.`;
  if (error._tag === "ProcessCaptureError")
    return (
      error.userMessage ??
      "Process capture could not complete. Run `rea doctor`, then review capture policy and try again."
    );
  return "Analysis could not complete. Run `rea doctor`, then try again.";
};

const hopperErrorUserMessage = (error: AnalysisError): string | undefined => {
  if (error instanceof HopperTimeoutError) {
    if (error.operation === undefined)
      return "REA timed out waiting for Hopper bridge readiness. Hopper may be waiting for a loader or license dialog; inspect its window and the captured launcher outcome before retrying.";
    const request = error.operation;
    return error.providerState === "busy"
      ? `Hopper timed out during ${request} while the provider remained busy. Check binary_session.analysis_activity, wait for the active request to finish, then retry.`
      : `Hopper timed out during ${request} before it started. Check binary_session for provider health, then retry.`;
  }
  if (error instanceof HopperProcessError) return hopperProcessMessage(error);
  if (error instanceof HopperStartError)
    return (
      error.userMessage ??
      "Hopper could not start. Check the launcher and target details, then retry opening the target."
    );
  if (error instanceof HopperRemoteError)
    return `Hopper ${error.operation ?? "analysis"} failed (${String(error.code)}, ${error.diagnosticType}): ${error.safeMessage}`;
  return undefined;
};

const RESTART_OWNED_PROVIDER =
  "Restart the owned provider by calling close_binary, then open the target again and retry.";
const RESTART_UNREACHABLE_HOPPER = `${RESTART_OWNED_PROVIDER} If Hopper may have exited, call export_evidence_bundle before close_binary; closing clears retained records.`;

const hopperProcessRemediation = (error: HopperProcessError): string => {
  if (error.failureCode !== undefined && error.userMessage !== undefined)
    return error.userMessage;
  if (error.stage === "launch")
    return "Review the captured launcher diagnostics and Hopper setup, then retry opening the target.";
  if (error.providerState === "unreachable") return RESTART_UNREACHABLE_HOPPER;
  if (providerRetryAction(error.providerState) === "restart_provider")
    return RESTART_OWNED_PROVIDER;
  return "Read binary_session.provider_operation_health for this request before retrying or restarting the owned provider.";
};

const hopperProcessMessage = (error: HopperProcessError): string => {
  const stage = error.stage;
  const where = error.operation ?? stage;
  const request =
    error.requestId === undefined
      ? ""
      : ` Request id ${String(error.requestId)}.`;
  const startup =
    error.userMessage === undefined ? "" : ` ${error.userMessage}`;
  if (error.providerState === "exited") {
    const signal = error.launcherFailure?.signal;
    const exit =
      error.exitCode === null
        ? signal === undefined || signal === null
          ? "no exit code was observed"
          : `signal ${signal}`
        : `exit code ${String(error.exitCode)}`;
    const recovery =
      error.failureCode === undefined && stage !== "launch"
        ? ` ${RESTART_OWNED_PROVIDER}`
        : "";
    return `Hopper exited during ${where} (${exit}).${startup}${recovery}${request}`;
  }
  if (error.providerState === "unreachable")
    return `Hopper became unreachable during ${where}; its process exit was not observed. ${RESTART_UNREACHABLE_HOPPER}${startup}${request}`;
  return `Hopper failed during ${where} and REA could not determine whether the provider is busy, exited, or unreachable.${startup} Read binary_session.provider_operation_health for this request before retrying or restarting.${request}`;
};

const standardErrorMessage = (tag: AnalysisErrorTag): string | undefined => {
  if (UNREADABLE_OUTPUT_TAGS.has(tag))
    return "Analysis returned an unreadable result. Run `rea doctor` and review the reported details; repeating the unchanged request is not expected to succeed.";
  if (UNSUPPORTED_PROVIDER_TAGS.has(tag))
    return "This analysis is unavailable for the current target. Choose another analysis or target.";
  if (CANCELLED_TAGS.has(tag))
    return "Analysis was cancelled. Start it again when ready.";
  if (TIMEOUT_TAGS.has(tag))
    return "Analysis took too long. Try a smaller request, then run `rea doctor` if it continues.";
  if (ADAPTER_FAILURE_TAGS.has(tag))
    return "Analysis could not complete. Run `rea doctor` and review the reported details; repeating the unchanged request is not expected to succeed.";
  if (START_FAILURE_TAGS.has(tag))
    return "Analysis could not start or stopped unexpectedly. Run `rea doctor`, then try again.";
  return undefined;
};

const UNREADABLE_OUTPUT_TAGS: ReadonlySet<AnalysisErrorTag> = new Set([
  "AnalysisProtocolError",
  "AnalysisOutputError",
  "HopperProtocolError",
]);
const UNSUPPORTED_PROVIDER_TAGS: ReadonlySet<AnalysisErrorTag> = new Set([
  "AnalysisCapabilityUnavailableError",
  "ProviderSelectionError",
]);
const CANCELLED_TAGS: ReadonlySet<AnalysisErrorTag> = new Set([
  "AnalysisCancelledError",
  "HopperCancelledError",
]);
const TIMEOUT_TAGS: ReadonlySet<AnalysisErrorTag> = new Set([
  "AnalysisTimeoutError",
  "HopperTimeoutError",
]);
const ADAPTER_FAILURE_TAGS: ReadonlySet<AnalysisErrorTag> = new Set([
  "ProviderAdapterError",
  "HopperRemoteError",
]);
const START_FAILURE_TAGS: ReadonlySet<AnalysisErrorTag> = new Set([
  "HopperProcessError",
  "HopperStartError",
]);

/** Operations that accept integrity_policy for declared-integrity mismatches. */
const INTEGRITY_POLICY_OPERATIONS: ReadonlySet<
  ArtifactOperationError["operation"]
> = new Set([
  "inventory_artifact",
  "inspect_artifact",
  "extract_artifact",
  "analyze_javascript_application",
]);

const artifactMessage = ({
  operation,
  reason,
  artifactDetails: details,
  detail,
}: ArtifactOperationError): string => {
  if (reason === "cancelled")
    return "Artifact operation was cancelled. Start it again when ready.";
  if (reason === "limit")
    return "Artifact is too large to process safely. Narrow the requested path or use a smaller artifact.";
  if (reason === "path")
    return (
      detail ??
      "Artifact contains a conflicting internal path. Inspect the reported path before retrying."
    );
  if (reason === "unavailable" && details?.unpacked === true)
    return `ASAR unpacked companion bytes are unavailable for ${details.logicalPath}. Select the archive in place with its .unpacked directory beside it, then retry.`;
  if (reason === "unavailable")
    return "Artifact processing is unavailable for the current target or host. Check artifact support and required tools.";
  if (reason === "integrity" && INTEGRITY_POLICY_OPERATIONS.has(operation))
    return `${
      details?.unpacked === true && details.calculatedSha256 !== null
        ? `Declared ASAR integrity for unpacked entry ${details.logicalPath} contradicts its companion file; packaging tools commonly sign or strip unpacked native binaries after writing the archive.`
        : "Artifact bytes contradict declared integrity."
    } If expected, rerun ${operation === "inventory_artifact" ? "inspect_artifact" : operation} with integrity_policy=record-and-continue (CLI: --integrity-policy record-and-continue) to retain observed bytes as untrusted; otherwise get a fresh copy.`;
  if (reason === "format" || reason === "integrity")
    return "Artifact is invalid or has changed. Get a fresh copy and try again.";
  return "Artifact could not be read or written. Check file access and try again.";
};

const evidenceFileMessage = ({
  operation,
  reason,
  published,
}: EvidenceFileError): string => {
  if (published !== undefined)
    return "The output file was published, but staging cleanup remains incomplete.";
  if (reason === "missing")
    return operation === "read"
      ? "Evidence file does not exist at the selected path. Check the path and try again."
      : "Evidence output directory does not exist. Choose an existing directory and try again.";
  if (reason === "not-file")
    return "Evidence path does not point to a regular file. Choose a file and try again.";
  if (reason === "exists")
    return "Evidence file already exists. Choose another path or allow overwrite.";
  if (reason === "invalid-json")
    return "Evidence file is not valid JSON. Repair or recreate the file and try again.";
  return "Evidence file could not be accessed. Check file permissions and try again.";
};

const KNOWN_ERROR_TAGS = {
  AnalysisProtocolError: true,
  AnalysisInputError: true,
  AnalysisAccessDeniedError: true,
  AnalysisArtifactChangedError: true,
  AnalysisOutputError: true,
  AnalysisCapabilityUnavailableError: true,
  AnalysisUnsupportedTargetError: true,
  AnalysisCancelledError: true,
  AnalysisTimeoutError: true,
  AnalysisResourceConstraintError: true,
  ProviderSelectionError: true,
  ProviderAdapterError: true,
  BrowserObservationError: true,
  ArtifactOperationError: true,
  ProcessCaptureError: true,
  EvidenceIntegrityError: true,
  EvidenceFileError: true,
  UnknownRegistryError: true,
  HopperTimeoutError: true,
  HopperCancelledError: true,
  HopperProtocolError: true,
  HopperRemoteError: true,
  HopperProcessError: true,
  HopperStartError: true,
  ConfigurationError: true,
  NoBinaryOpenError: true,
  BinaryTargetError: true,
} as const satisfies Readonly<Record<AnalysisErrorTag, true>>;

export const assertKnownAnalysisErrorTag = (tag: AnalysisErrorTag): void => {
  if (KNOWN_ERROR_TAGS[tag] !== true)
    throw new TypeError("Unknown analysis error tag");
};
