export const __stub = 1;
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
//     if (cause instanceof DecoderDiscoveryBudgetError)
//       return new AnalysisResourceConstraintError(
//         operation,
//         "memory",
//         cause.message,
//         { line_budget: 65536 },
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
//         LIMITS,
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
//       return new ProviderAdapterError(SIGROK_PROVIDER_IDENTITY.id, operation, {
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
//       return new ProviderAdapterError(SIGROK_PROVIDER_IDENTITY.id, operation, {
//         ...detail,
//         diagnostics: { stage: "integrity", resource_path: path, reason },
//       });
//     }
//     if (phase === "configuration")
//       return new AnalysisCapabilityUnavailableError(
//         SIGROK_PROVIDER_IDENTITY.id,
//         operation,
//         reason,
//         {
//           cause,
//           ...(observedOutput === undefined
//             ? {}
//             : { capturedOutput: observedOutput }),
//           userMessage: `${reason} On Linux, configure sigrok-cli 0.7.2 through REA_SIGROK_COMMAND and util-linux prlimit through REA_SIGROK_PRLIMIT_COMMAND (default /usr/bin/prlimit).`,
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
export const _l = 131;
