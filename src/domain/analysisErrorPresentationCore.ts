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
} from "./configurationErrors.js";
import { BrowserObservationError } from "./browserObservationError.js";
import {
  EvidenceFileError,
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
import type { AnalysisError, AnalysisErrorTag } from "./analysisErrorBase.js";
import type { AnalysisErrorProjection } from "./analysisErrorProjection.js";

export const analysisErrorRemediationAction = (
  error: AnalysisError,
): string => {
  if (
    error instanceof BrowserObservationError &&
    error.reason === "service_worker_blocked"
  )
    return "Set environment.service_workers to allow to permit this capture, or remove the service worker registration through the browser. REA never removes existing registrations.";
  if (error instanceof AnalysisCapabilityUnavailableError && error.retryable)
    return "Review details.reason, then retry the same analysis after the condition clears.";
  if (error instanceof EvidenceFileError && error.published !== undefined)
    return "Use the published file at details.published_path and resolve the reported staging cleanup failure.";
  if (error instanceof AnalysisSnapshotMismatchError)
    return "Run analysis without this snapshot, then save a fresh snapshot using the intended artifact, provider, and analysis profile.";
  if (error instanceof AnalysisUnsupportedTargetError)
    return (
      error.remediationAction ??
      "Select a target supported by this operation or choose an operation supporting the reported target format."
    );
  if (error instanceof AnalysisResourceConstraintError)
    return (
      error.remediationAction ??
      (error.resource === "capacity"
        ? "Wait for an active analysis to complete, then retry within the reported admission limits."
        : error.resource === "transport"
          ? "Discover retained records with get_evidence_bundle and detail: summary, then inspect compatible records through inspect_analysis_view using an exact Evidence reference. Export complete retained session evidence through export_evidence_bundle to a caller-selected path, or use complete CLI JSON output. The connection remains usable."
          : error.resource === "cpu"
            ? "Review the reported worker CPU limits and observed signal. Retry with sufficient CPU time or a smaller artifact; REA retains tighter inherited limits."
            : error.resource === "file-size"
              ? "Review the reported worker file-size limits and write failure. Retry with a sufficient file-size allowance for the evidence reply; REA retains tighter inherited limits."
              : "Review the reported worker memory limits and available host memory. Retry with sufficient memory or a smaller artifact; REA retains tighter inherited limits.")
    );
  if (error instanceof HopperTimeoutError)
    return error.operation === undefined
      ? "Inspect Hopper for a loader or license dialog and review details.launcher. Correct the loader configuration or complete Hopper setup, then open the target again."
      : error.providerState === "busy"
        ? "Check binary_session.analysis_activity, wait for the active Hopper request to finish, then retry."
        : "Check binary_session for Hopper health, then retry the operation.";
  if (error instanceof HopperProcessError)
    return hopperProcessRemediation(error);
  if (error instanceof HopperStartError)
    return error.ownerRunId === undefined
      ? "Check the Hopper launcher and target details, then retry opening the target."
      : `Use the active REA session ${error.ownerRunId} or close it before opening this target again.`;
  if (error instanceof HopperRemoteError)
    return error.diagnosticType === "invalid_request"
      ? "Correct the reported address, document, or arguments and retry."
      : "Review the Hopper diagnostic details and correct the request or target; run `rea doctor` if the provider itself is failing. Repeating the unchanged request is not expected to succeed.";
  if (error instanceof EvidenceReferenceError)
    return "Use an exact Evidence reference retained by this session, supply the complete inline Evidence, re-run its producer, or import its Evidence bundle. close_binary clears retained records.";
  if (
    error instanceof BinaryTargetError &&
    error.constraint === "directory_requires_file"
  )
    return "For a JavaScript/Electron application directory, call analyze_javascript_application with input_path or run `rea analyze <directory>`. For binary analysis, select its executable file.";
  if (
    error instanceof BinaryTargetError &&
    error.constraint === "load_selection_rejected"
  )
    return "Correct the reported load argument (--target-format, --architecture, or --entry-point on the CLI; format, architecture, or entry_point through MCP) and retry.";
  if (
    error instanceof BinaryTargetError &&
    error.constraint === "file_format_rejected"
  )
    return "Review the reported file-format reason and select a supported, well-formed target.";
  if (
    error instanceof BinaryTargetError &&
    error.constraint === "wasm_requires_static_inspection"
  )
    return `For static inspection, call inspect_wasm_artifact with ${JSON.stringify({ path: error.path })} or run \`rea inspect-wasm-artifact <path> --format json\`. This separate lane requires caller-supplied WABT 1.0.42 via absolute REA_WABT_BIN_DIRECTORY; check its availability in binary_session. REA does not execute WASM or install tools, and the header alone does not establish that the complete module is valid.`;
  if (
    error instanceof AnalysisAccessDeniedError ||
    (error instanceof BinaryTargetError && error.systemCode !== undefined)
  )
    return "Check the current process's read access to the selected path. Retry with a readable local file.";
  if (error instanceof AnalysisArtifactChangedError)
    return "Wait until the selected file is stable. For an active binary session, reopen the target with open_binary before retrying so REA acquires its current identity; for a CLI command or target-free tool, rerun the operation.";
  if (error instanceof ConfigurationError && error.settings.length > 0)
    return `Correct ${[...new Set(error.settings.map(({ setting }) => setting))].join(", ")} in the environment that starts REA (your shell or the MCP client's registration), then rerun.`;
  if (error instanceof AnalysisInputError)
    return "Correct the listed arguments and retry.";
  if (
    error instanceof AnalysisOutputError &&
    error.remediationAction !== undefined
  )
    return error.remediationAction;
  if (error instanceof UnknownRegistryError && error.reason === "not-found")
    return "Check that the unknown_id belongs to this session, then retry.";
  return analysisErrorUserMessage(error);
};

export const analysisErrorCategory = (
  error: AnalysisError,
): AnalysisErrorProjection["category"] => {
  if (error instanceof AnalysisCapabilityUnavailableError && error.retryable)
    return "unavailable";
  if (
    error instanceof BinaryTargetError &&
    error.constraint === "load_selection_rejected"
  )
    return "invalid_input";
  if (
    error instanceof BinaryTargetError &&
    (error.constraint === "wasm_requires_static_inspection" ||
      error.constraint === "file_format_rejected")
  )
    return "unsupported_target";
  if (
    error instanceof ProviderSelectionError &&
    error.reason === "provider_unavailable"
  )
    return "unavailable";
  if (error._tag === "ProcessCaptureError")
    return error.userCategory ?? "execution_failure";
  if (error instanceof BrowserObservationError)
    return error.userCategory ?? browserErrorCategory(error.reason);
  if (
    error instanceof HopperRemoteError &&
    error.diagnosticType === "invalid_request"
  )
    return "invalid_input";
  if (
    error instanceof HopperRemoteError &&
    error.diagnosticType === "authorization"
  )
    return "unavailable";
  if (error instanceof HopperProcessError || error instanceof HopperStartError)
    return "unavailable";
  if (error instanceof ArtifactOperationError)
    return artifactErrorCategory(error.reason);
  if (
    error instanceof EvidenceFileError &&
    (error.reason === "missing" ||
      error.reason === "not-file" ||
      error.reason === "wrong-kind" ||
      error.reason === "exists")
  )
    return "invalid_input";
  return STATIC_ERROR_CATEGORIES[error._tag] ?? "execution_failure";
};

const browserErrorCategory = (
  reason: BrowserObservationError["reason"],
): AnalysisErrorProjection["category"] => {
  if (reason === "cancelled") return "cancelled";
  if (reason === "timeout") return "timeout";
  if (reason === "payload_limit") return "truncated";
  if (
    reason === "target_not_found" ||
    reason === "target_not_allowed" ||
    reason === "service_worker_blocked" ||
    reason === "target_changed" ||
    reason === "endpoint_unreachable" ||
    reason === "disconnected"
  )
    return "unavailable";
  return "execution_failure";
};

const artifactErrorCategory = (
  reason: ArtifactOperationError["reason"],
): AnalysisErrorProjection["category"] => {
  if (reason === "integrity") return "integrity_mismatch";
  if (reason === "limit") return "truncated";
  if (reason === "cancelled") return "cancelled";
  if (reason === "unavailable") return "unavailable";
  return "execution_failure";
};

const STATIC_ERROR_CATEGORIES: Readonly<
  Partial<Record<AnalysisErrorTag, AnalysisErrorProjection["category"]>>
> = {
  ConfigurationError: "invalid_input",
  AnalysisInputError: "invalid_input",
  AnalysisAccessDeniedError: "unavailable",
  AnalysisArtifactChangedError: "integrity_mismatch",
  AnalysisCapabilityUnavailableError: "unsupported_provider",
  AnalysisUnsupportedTargetError: "unsupported_target",
  ProviderSelectionError: "unsupported_provider",
  EvidenceIntegrityError: "integrity_mismatch",
  AnalysisCancelledError: "cancelled",
  HopperCancelledError: "cancelled",
  AnalysisTimeoutError: "timeout",
  AnalysisResourceConstraintError: "resource_constraint",
  HopperTimeoutError: "timeout",
  NoBinaryOpenError: "unavailable",
  BinaryTargetError: "unavailable",
};
