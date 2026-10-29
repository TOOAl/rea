export const __stub = 1;
// ): AnalysisErrorProjection["code"] => {
//   if (error.reason === "integrity" && error.artifactDetails !== undefined)
//     return "artifact_integrity_mismatch";
//   if (error.reason === "limit") return "truncated";
//   if (error.reason === "cancelled") return "cancelled";
//   return "artifact_operation_failed";
// };
//
// const evidenceFileCode = (
//   reason: EvidenceFileError["reason"],
// ): AnalysisErrorProjection["code"] => {
//   if (reason === "invalid-json") return "evidence_integrity_mismatch";
//   // A missing, non-file or already-existing path is the caller's selection.
//   if (reason === "io") return "execution_failure";
//   return "invalid_request";
// };
//
// const unknownRegistryCode = (
//   reason: UnknownRegistryError["reason"],
// ): AnalysisErrorProjection["code"] => {
//   if (reason === "revision-conflict" || reason === "already-exists")
//     return "revision_conflict";
//   if (reason === "limit") return "truncated";
//   if (reason === "integrity") return "evidence_integrity_mismatch";
//   return "execution_failure";
// };
//
// const processCaptureCode = (
//   error: AnalysisError,
// ): AnalysisErrorProjection["code"] => {
//   if (error.cleanupIncomplete) return "cleanup_incomplete";
//   if (error.userCategory === "cancelled") return "cancelled";
//   return "process_capture_failed";
// };
//
// type SpecializedErrorTag =
//   | "ArtifactOperationError"
//   | "BinaryTargetError"
//   | "BrowserObservationError"
//   | "EvidenceFileError"
//   | "ProcessCaptureError"
//   | "ProviderSelectionError"
//   | "UnknownRegistryError";
//
// const STATIC_ERROR_CODES = {
//   AnalysisProtocolError: "unreadable_output",
//   AnalysisOutputError: "unreadable_output",
//   HopperProtocolError: "unreadable_output",
//   AnalysisInputError: "invalid_request",
//   AnalysisAccessDeniedError: "access_denied",
//   AnalysisArtifactChangedError: "artifact_changed",
//   AnalysisCapabilityUnavailableError: "capability_unavailable",
//   AnalysisUnsupportedTargetError: "unsupported_target",
//   AnalysisCancelledError: "cancelled",
//   HopperCancelledError: "cancelled",
//   AnalysisTimeoutError: "provider_timeout",
//   AnalysisResourceConstraintError: "resource_constraint",
//   HopperTimeoutError: "provider_timeout",
//   HopperProcessError: "provider_unavailable",
//   HopperStartError: "provider_unavailable",
//   ConfigurationError: "configuration_invalid",
//   NoBinaryOpenError: "target_unavailable",
//   EvidenceIntegrityError: "evidence_integrity_mismatch",
//   ProviderAdapterError: "execution_failure",
//   HopperRemoteError: "execution_failure",
// } as const satisfies Readonly<
//   Record<
//     Exclude<AnalysisErrorTag, SpecializedErrorTag>,
//     AnalysisErrorProjection["code"]
//   >
// >;
//
// const staticErrorCode = (
//   tag: AnalysisErrorTag,
// ): AnalysisErrorProjection["code"] => {
//   switch (tag) {
//     case "ArtifactOperationError":
//     case "BinaryTargetError":
//     case "BrowserObservationError":
//     case "EvidenceFileError":
//     case "ProcessCaptureError":
//     case "ProviderSelectionError":
//     case "UnknownRegistryError":
//       throw new TypeError(`Unhandled specialized analysis error: ${tag}`);
//     default:
//       return STATIC_ERROR_CODES[tag];
//   }
// };
//
// const errorDetails = (
//   error: AnalysisError,
// ): Readonly<Record<string, JsonValue>> | undefined =>
//   requestErrorDetails(error) ??
//   artifactStateErrorDetails(error) ??
//   providerErrorDetails(error) ??
//   lifecycleErrorDetails(error);
//
// const requestErrorDetails = (
//   error: AnalysisError,
// ): Readonly<Record<string, JsonValue>> | undefined => {
//   if (error instanceof AnalysisUnsupportedTargetError)
//     return {
//       operation: error.operation,
//       path: error.path,
//       reason: error.reason,
//     };
//   if (error instanceof AnalysisResourceConstraintError)
//     return {
//       operation: error.operation,
//       resource: error.resource,
//       reason: error.reason,
//       reported_limits: error.reportedLimits,
//     };
//   if (error instanceof AnalysisArtifactChangedError)
//     return {
//       operation: error.operation,
//       path: error.path,
//       reason: error.reason,
//       boundary: "stable-artifact-read",
//     };
//   if (error instanceof AnalysisAccessDeniedError)
//     return {
//       operation: error.operation,
//       path: error.path,
//       system_code: error.systemCode,
//       boundary: "filesystem-read",
//     };
//   if (error instanceof AnalysisOutputError)
//     return {
//       operation: error.operation,
//       reason: error.reason,
//       ...(error.diagnostics === undefined
//         ? {}
//         : { diagnostics: error.diagnostics }),
//     };
//   if (error instanceof AnalysisInputError && error.issues.length > 0)
//     return {
//       operation: error.operation,
//       issues: error.issues.map((issue) => ({
//         path: [...issue.path],
//         reason: issue.reason,
//         ...(issue.message === undefined ? {} : { message: issue.message }),
//         ...(issue.expected === undefined ? {} : { expected: issue.expected }),
//         ...(issue.minimum === undefined ? {} : { minimum: issue.minimum }),
//         ...(issue.maximum === undefined ? {} : { maximum: issue.maximum }),
//       })),
//     };
//   if (error instanceof EvidenceReferenceError)
export const _l = 148;
