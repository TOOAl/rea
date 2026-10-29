export const __stub = 1;
//     return {
//       evidence_id: error.evidenceId,
//       reason: error.reason,
//       expected: error.expected,
//       actual: error.actual,
//     };
//   if (error instanceof EvidenceIntegrityError) return { reason: error.message };
//   return undefined;
// };
//
// const artifactStateErrorDetails = (
//   error: AnalysisError,
// ): Readonly<Record<string, JsonValue>> | undefined => {
//   if (error instanceof ArtifactOperationError && error.artifactDetails)
//     return {
//       logical_path: error.artifactDetails.logicalPath,
//       declared_sha256: error.artifactDetails.declaredSha256,
//       calculated_sha256: error.artifactDetails.calculatedSha256,
//       unpacked: error.artifactDetails.unpacked,
//     };
//   if (error instanceof ArtifactOperationError)
//     return {
//       operation: error.operation,
//       reason: error.reason,
//       ...(error.reason === "limit" ? { truncated: true } : {}),
//       ...(error.detail === undefined ? {} : { detail: error.detail }),
//     };
//   if (error instanceof UnknownRegistryError) return { reason: error.reason };
//   if (error instanceof EvidenceFileError)
//     return {
//       operation: error.operation,
//       reason: error.reason,
//       ...(error.path === undefined ? {} : { path: error.path }),
//       ...(error.published === undefined
//         ? {}
//         : {
//             published: true,
//             bytes: error.published.bytes,
//             published_path: error.published.path,
//           }),
//     };
//   return undefined;
// };
//
// const providerErrorDetails = (
//   error: AnalysisError,
// ): Readonly<Record<string, JsonValue>> | undefined => {
//   if (error instanceof AnalysisCapabilityUnavailableError)
//     return {
//       provider_id: error.providerId,
//       operation: error.operation,
//       reason: error.reason,
//     };
//   if (error instanceof ProviderSelectionError)
//     return {
//       operation: error.operation,
//       selection_reason: error.reason,
//       requested_provider_id: error.requestedProviderId,
//       candidate_ids: [...error.candidateIds],
//       rejections: error.rejections.map((rejection) => ({
//         provider_id: rejection.providerId,
//         code: rejection.code,
//         reason: rejection.reason,
//         diagnostics: rejection.diagnostics,
//       })),
//     };
//   if (error instanceof ProviderAdapterError)
//     return {
//       provider_id: error.providerId,
//       operation: error.operation,
//       ...(error.cleanupIncomplete
//         ? {
//             cleanup: "incomplete",
//             resources: [...error.cleanupResources],
//           }
//         : {}),
//     };
//   if (error instanceof BrowserObservationError) {
//     const primaryReason = primaryBrowserFailureReason(error);
//     return {
//       operation: error.operation,
//       reason: error.reason,
//       ...(error.cleanupIncomplete
//         ? {
//             cleanup: "incomplete",
//             resources: [...error.cleanupResources],
//             ...(primaryReason === undefined
//               ? {}
//               : { primary_reason: primaryReason }),
//           }
//         : {}),
//     };
//   }
//   if (error instanceof HopperRemoteError)
//     return {
//       stage: "analysis",
//       provider_code: error.code,
//       diagnostic_type: error.diagnosticType,
//       ...(error.operation === undefined ? {} : { operation: error.operation }),
//       ...(error.requestId === undefined ? {} : { request_id: error.requestId }),
//     };
//   if (error instanceof HopperProcessError) {
//     const stage = error.stage;
//     return {
//       exit_code: error.exitCode,
//       stage,
//       provider_state: error.providerState,
//       retry_action: providerRetryAction(
//         error.providerState,
//         error.failureCode !== undefined || error.stage === "launch",
//       ),
//       ...(error.failureCode === undefined
//         ? {}
//         : { failure_code: error.failureCode }),
//       ...(error.operation === undefined ? {} : { operation: error.operation }),
//       ...(error.requestId === undefined ? {} : { request_id: error.requestId }),
//       ...(error.diagnostic === undefined
//         ? {}
//         : { diagnostics: { ...error.diagnostic } }),
//       ...(error.launcherFailure === undefined
//         ? {}
//         : { launcher: error.launcherFailure }),
//     };
//   }
//   if (error instanceof HopperStartError)
//     return {
//       stage: "launch",
//       provider_state: "unknown",
//       ...(error.launchRejection === undefined
//         ? {}
//         : { launch_rejection: { ...error.launchRejection } }),
//       retry_action: error.ownerRunId === undefined ? "retry" : "unknown",
//       ...(error.ownerRunId === undefined
//         ? {}
//         : { owner_run_id: error.ownerRunId }),
//       ...(error.launcherFailure === undefined
//         ? {}
//         : { launcher: error.launcherFailure }),
//     };
//   return undefined;
// };
//
// const primaryBrowserFailureReason = (
//   error: BrowserObservationError,
// ): string | undefined => {
//   if (!(error.cause instanceof AggregateError)) return undefined;
//   const primary = error.cause.errors[0];
//   if (primary instanceof BrowserObservationError) return primary.reason;
export const _l = 148;
