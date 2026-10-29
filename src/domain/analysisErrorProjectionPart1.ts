export const __stub = 1;
// import { jsonValueSchema, type JsonValue } from "./jsonValue.js";
// import { isImmutableJsonSnapshot } from "./immutableJson.js";
//
// import {
//   analysisErrorCategory,
//   analysisErrorRemediationAction,
//   analysisErrorUserMessage,
//   assertKnownAnalysisErrorTag,
// } from "./analysisErrorPresentation.js";
// import {
//   AnalysisAccessDeniedError,
//   AnalysisArtifactChangedError,
//   AnalysisCancelledError,
//   AnalysisCapabilityUnavailableError,
//   AnalysisUnsupportedTargetError,
//   AnalysisInputError,
//   AnalysisOutputError,
//   AnalysisTimeoutError,
//   AnalysisResourceConstraintError,
// } from "./analysisErrorCore.js";
// import { ArtifactOperationError } from "./artifactOperationError.js";
// import {
//   BinaryTargetError,
//   ConfigurationError,
// } from "./configurationErrors.js";
// import { BrowserObservationError } from "./browserObservationError.js";
// import {
//   EvidenceFileError,
//   EvidenceIntegrityError,
//   EvidenceReferenceError,
// } from "./evidenceErrors.js";
// import {
//   HopperCancelledError,
//   HopperProcessError,
//   HopperRemoteError,
//   HopperStartError,
//   HopperTimeoutError,
// } from "./hopperErrors.js";
// import { ProviderAdapterError } from "./providerAdapterError.js";
// import { ProviderSelectionError } from "./providerSelectionError.js";
// import { UnknownRegistryError } from "./unknownRegistryError.js";
// import { providerRetryAction } from "./providerOperationHealth.js";
// import type { AnalysisError, AnalysisErrorTag } from "./analysisErrorBase.js";
//
// /** Project expected failures into exhaustive, secret-safe caller fields. */
// export const projectAnalysisError = (
//   error: AnalysisError,
// ): AnalysisErrorProjection => {
//   assertKnownAnalysisErrorTag(error._tag);
//   const underlyingCode = underlyingErrorCode(error);
//   const code = error.cleanupIncomplete ? "cleanup_incomplete" : underlyingCode;
//   const primaryDetails = errorDetails(error);
//   const details = {
//     ...primaryDetails,
//     ...(error.diagnostics === undefined
//       ? {}
//       : { diagnostics: error.diagnostics }),
//     ...(error.cleanupIncomplete
//       ? {
//           cleanup: "incomplete",
//           resources: [...error.cleanupResources],
//           ...(error.cleanup === undefined
//             ? {}
//             : { cleanup_reason: error.cleanup.reason }),
//           execution_failure:
//             primaryDetails?.execution_failure ?? underlyingCode,
//         }
//       : {}),
//     ...(error.capturedOutput === undefined
//       ? {}
//       : { captured_output: { ...error.capturedOutput } }),
//     ...(error.partialObservation === undefined
//       ? {}
//       : {
//           partial_observation: isImmutableJsonSnapshot(error.partialObservation)
//             ? error.partialObservation
//             : jsonValueSchema.parse(error.partialObservation),
//         }),
//   };
//   return {
//     code,
//     category: analysisErrorCategory(error),
//     message: analysisErrorUserMessage(error),
//     retryable:
//       RETRYABLE_CODES.has(code) ||
//       (error instanceof AnalysisCapabilityUnavailableError &&
//         error.retryable) ||
//       (code === "resource_constraint" &&
//         error instanceof AnalysisResourceConstraintError &&
//         error.resource === "capacity"),
//     remediation: {
//       action: analysisErrorRemediationAction(error),
//     },
//     ...(Object.keys(details).length === 0 ? {} : { details }),
//   };
// };
//
// const underlyingErrorCode = (
//   error: AnalysisError,
// ): AnalysisErrorProjection["code"] => {
//   if (
//     error instanceof HopperRemoteError &&
//     error.diagnosticType === "invalid_request"
//   )
//     return "invalid_request";
//   if (error instanceof ProviderSelectionError)
//     return error.reason === "provider_unavailable"
//       ? "provider_unavailable"
//       : "capability_unavailable";
//   if (error instanceof BrowserObservationError)
//     return error.userCategory === "cancelled"
//       ? "cancelled"
//       : browserErrorCode(error.reason);
//   if (error instanceof ArtifactOperationError)
//     return artifactOperationCode(error);
//   if (error instanceof BinaryTargetError)
//     return error.constraint === "load_selection_rejected"
//       ? "invalid_request"
//       : error.systemCode === undefined
//         ? "target_unavailable"
//         : "access_denied";
//   if (error instanceof EvidenceFileError) return evidenceFileCode(error.reason);
//   if (error instanceof UnknownRegistryError)
//     return unknownRegistryCode(error.reason);
//   if (error._tag === "ProcessCaptureError") return processCaptureCode(error);
//   return staticErrorCode(error._tag);
// };
//
// const browserErrorCode = (
//   reason: BrowserObservationError["reason"],
// ): AnalysisErrorProjection["code"] => {
//   if (reason === "cancelled") return "cancelled";
//   if (reason === "timeout") return "provider_timeout";
//   if (reason === "payload_limit") return "truncated";
//   if (
//     reason === "target_not_found" ||
//     reason === "target_not_allowed" ||
//     reason === "service_worker_blocked" ||
//     reason === "target_changed"
//   )
//     return "target_unavailable";
//   if (reason === "endpoint_unreachable" || reason === "disconnected")
//     return "provider_unavailable";
//   return "unreadable_output";
// };
//
// const artifactOperationCode = (
//   error: ArtifactOperationError,
export const _l = 148;
