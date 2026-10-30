export const __stub = 1;
//     workspacePath: string | null,
//     effectiveLimits: LinuxResourceLimits | undefined,
//     observedOutput: AnalysisCapturedOutput | undefined,
//     operation = OPERATION,
//     limits: {
//       readonly output_bytes: number;
//       readonly command_timeout_ms: number;
//     } = LIMITS,
//   ): AnalysisError {
//     if (cause instanceof AnalysisError) return cause;
//     if (cause instanceof ArtifactReaderFailure && cause.cleanup !== undefined)
//       return this.#resources.cleanupFailure(
//         cause.cleanup,
//         cause,
//         observedOutput,
//         operation,
//       );
//     if (
//       (cause instanceof Error && cause.name === "AbortError") ||
//       (cause instanceof ArtifactReaderFailure && cause.reason === "cancelled")
//     )
//       return new AnalysisCancelledError(operation, { cause });
//     if (cause instanceof FieldDiscoveryBudgetError)
//       return new AnalysisResourceConstraintError(
//         operation,
//         "memory",
//         cause.message,
//         { record_budget_bytes: FIELD_RECORD_BUDGET },
//         {
//           cause,
//           ...(observedOutput === undefined
//             ? {}
//             : { capturedOutput: observedOutput }),
//         },
//       );
//     const reason = cause instanceof Error ? cause.message : String(cause);
//     if (cause instanceof OwnedCommandFailure)
//       return this.#resources.commandFailure(
//         cause,
//         limits,
//         effectiveLimits,
//         operation,
//       );
//     if (phase === "workspace") {
//       const code =
//         cause instanceof Error &&
//         "code" in cause &&
//         typeof cause.code === "string"
//           ? cause.code
//           : null;
//       if (code === "ENOSPC" || code === "EDQUOT" || code === "EFBIG")
//         return new AnalysisResourceConstraintError(
//           operation,
//           "file-size",
//           `Private analysis workspace failed (${code}): ${reason}`,
//           { workspace_path: workspacePath, system_code: code },
//           { cause },
//         );
//       return new ProviderAdapterError(TSHARK_PROVIDER_IDENTITY.id, operation, {
//         cause,
//         userMessage: `Cannot prepare the private analysis workspace: ${reason}`,
//         diagnostics: {
//           stage: "workspace",
//           workspace_path: workspacePath,
//           system_code: code,
//           reason,
//         },
//       });
//     }
//     if (phase === "integrity") {
//       const detail = {
//         cause,
//         ...(observedOutput === undefined
//           ? {}
//           : { capturedOutput: observedOutput }),
//       };
//       if (
//         cause instanceof ArtifactReaderFailure &&
//         ["limit", "integrity", "path"].includes(cause.reason)
//       )
//         return new AnalysisArtifactChangedError(
//           operation,
//           path,
//           `Post-run identity verification failed for ${path}: ${reason}`,
//           detail,
//         );
//       return new ProviderAdapterError(TSHARK_PROVIDER_IDENTITY.id, operation, {
//         ...detail,
//         diagnostics: { stage: "integrity", resource_path: path, reason },
//       });
//     }
//     if (phase === "configuration")
//       return new AnalysisCapabilityUnavailableError(
//         TSHARK_PROVIDER_IDENTITY.id,
//         operation,
//         reason,
//         {
//           cause,
//           ...(observedOutput === undefined
//             ? {}
//             : { capturedOutput: observedOutput }),
//           userMessage: `${reason} On Linux, configure TShark 4.x through REA_TSHARK_COMMAND and util-linux prlimit through REA_TSHARK_PRLIMIT_COMMAND (default /usr/bin/prlimit).`,
//         },
//       );
//     if (
//       phase === "artifact" &&
//       cause instanceof ArtifactReaderFailure &&
//       cause.reason === "limit"
//     )
//       return new AnalysisResourceConstraintError(
//         operation,
//         "file-size",
//         reason,
//         { input_bytes: LIMITS.input_bytes },
//         { cause },
//       );
//     if (cause instanceof ArtifactReaderFailure && cause.reason === "integrity")
//       return new AnalysisArtifactChangedError(operation, path, reason, {
//         cause,
//       });
//     if (
//       phase === "artifact" &&
//       cause instanceof Error &&
//       "code" in cause &&
//       (cause.code === "EACCES" || cause.code === "EPERM")
//     )
//       return new AnalysisAccessDeniedError(operation, path, cause.code, {
//         cause,
//       });
//     if (phase === "artifact")
//       return new AnalysisInputError(operation, { cause }, [
//         { path: ["path"], reason: "invalid_value", message: reason },
//       ]);
//     return new AnalysisOutputError(operation, reason, {
//       cause,
//       ...(observedOutput === undefined
//         ? {}
//         : { capturedOutput: observedOutput }),
//     });
//   }
// }
export const _l = 141;
