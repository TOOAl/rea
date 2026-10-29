export const __stub = 1;
//           });
//         if (
//           cause instanceof OwnedOutputFailure &&
//           cause.cleanup !== undefined
//         ) {
//           cleanupIncomplete = true;
//           if (failure === undefined) {
//             cleanupOnlyFailure =
//               !capture.collectionFailure &&
//               !capture.outputTruncated &&
//               !capture.killed &&
//               capture.signal === null &&
//               typeof capture.code === "number" &&
//               !signal?.aborted;
//             failure = new AnalysisOutputError(
//               operation,
//               "Provider process cleanup remains incomplete.",
//               {
//                 cause,
//                 capturedOutput,
//                 cleanup: cause.cleanup,
//                 cleanupOnly: cleanupOnlyFailure,
//               },
//             );
//           }
//         }
//         if (
//           failure === undefined &&
//           cause instanceof OwnedOutputFailure &&
//           cause.collectionFailure
//         )
//           failure = new AnalysisOutputError(
//             operation,
//             "Provider output collection failed.",
//             { cause, capturedOutput },
//           );
//         if (
//           capture.killed ||
//           capture.signal !== null ||
//           typeof capture.code !== "number"
//         ) {
//           exitCode = null;
//           completionStatus = "unknown";
//         }
//         if (cause instanceof OwnedOutputFailure) {
//           stdoutInvalidUtf8 = cause.stdoutInvalidUtf8;
//           stderrInvalidUtf8 = cause.stderrInvalidUtf8;
//         }
//       }
//     }
//     if (earlyFailure !== undefined)
//       return err(this.#registerCleanupFailure(earlyFailure, cleanupOwner));
//     if (failure !== undefined && cleanupOwner !== undefined)
//       failure = this.#registerCleanupFailure(failure, cleanupOwner);
//     let digestAfter: string | null = null;
//     if (absolutePath === undefined) {
//       digestAfter = null;
//     } else if (cleanupIncomplete) {
//       if (!cleanupOnlyFailure) completionStatus = "unknown";
//     } else {
//       try {
//         digestAfter = await this.#digest(absolutePath, signal, this.#stat);
//       } catch {
//         // Preserve the provider's collected observations if the artifact vanished or became unreadable.
//       }
//     }
//     if (signal?.aborted && failure === undefined) {
//       failure = new AnalysisCancelledError(operation, {
//         capturedOutput: {
//           stdout,
//           stderr,
//           truncated: outputTruncated,
//           stdout_bytes: stdoutBytes,
//           stderr_bytes: stderrBytes,
//           exit_code: typeof exitCode === "number" ? exitCode : null,
//           signal: signalName,
//         },
//       });
//       exitCode = null;
//       completionStatus = "unknown";
//     }
//     const artifactChanged =
//       absolutePath === undefined
//         ? null
//         : digestAfter === null || digest === undefined
//           ? null
//           : digestAfter !== digest;
//     const result = {
//       stdout,
//       stderr,
//       exit_code: exitCode,
//       signal: signalName,
//       output_truncated: outputTruncated,
//       completion_status: completionStatus,
//       artifact_sha256_after: absolutePath === undefined ? null : digestAfter,
//       artifact_changed: absolutePath === undefined ? null : artifactChanged,
//     };
//     const limitations = [
//       ...(absolutePath === undefined
//         ? [
//             "The objdump version is not reported; the output lists BFD targets advertised by the installed tool and does not establish support for the selected artifact.",
//           ]
//         : [
//             "The executable version and supported formats are reported as unknown because no reliable version probe was performed.",
//           ]),
//       "A non-zero process exit is preserved as an observed command result.",
//       ...(operation === "inspect_with_objdump" &&
//       parameters.follow_debug_links === true
//         ? [
//             "DWARF output may include local debug-link files whose identities are not bound to Evidence.",
//           ]
//         : []),
//       ...(operation === "execute_rizin_command"
//         ? [
//             "Rizin commands and retained plugins may read files or access network resources outside the selected artifact; those external inputs are not bound to Evidence.",
//           ]
//         : []),
//       ...(stdoutInvalidUtf8 || stderrInvalidUtf8
//         ? [
//             `Captured ${[
//               ...(stdoutInvalidUtf8 ? ["stdout"] : []),
//               ...(stderrInvalidUtf8 ? ["stderr"] : []),
//             ].join(
//               " and ",
//             )} bytes contain invalid or incomplete UTF-8; replacement characters in the text capture do not preserve the original bytes.`,
//           ]
//         : []),
//       ...(outputTruncated
//         ? [
//             "The provider command ended before completion could be confirmed; captured output is partial.",
//           ]
//         : []),
//       ...(signalName === null
//         ? []
//         : [
//             `The provider process terminated by signal ${signalName}; captured output may be partial and command completion is unknown.`,
//           ]),
//       ...(failure === undefined ||
//       (failure instanceof AnalysisOutputError && failure.cleanupOnly)
//         ? []
//         : [
//             `Command completion is unknown because the operation failed with ${failure._tag}: ${failure.message}`,
//           ]),
//       ...(absolutePath === undefined
//         ? [
//             "This output lists BFD targets advertised by the installed objdump and is independent of the selected artifact.",
//           ]
//         : [
//             "When both are available, pre-run and post-run digests detect artifact changes across the provider call but cannot prove the exact bytes consumed during the call.",
//           ]),
//       ...(artifactChanged === true
//         ? [
//             "The provider command may have changed the artifact while analysis was running; pre-run and post-run digests are both reported.",
//           ]
//         : []),
//       ...(absolutePath !== undefined && digestAfter === null
//         ? [
//             cleanupIncomplete
//               ? "The post-run artifact digest was not captured because owned provider cleanup was incomplete at observation time; artifact changes during the command remain unquantified."
//               : signal?.aborted
//                 ? "The post-run artifact digest is unknown because cancellation interrupted the digest."
//                 : "The post-run artifact digest is unknown because the artifact could not be read after the provider call.",
//           ]
//         : []),
//     ];
//     const evidence = createEvidence(
//       absolutePath === undefined || digest === undefined
//         ? undefined
//         : { path: absolutePath, sha256: digest, format: "unknown" },
//       profile.identity,
//       {
//         predicateType: "rea.reverse-engineering.command-observation",
//         operation,
//         parameters: {
//           ...(absolutePath === undefined
//             ? { operation: "architectures" }
//             : parameters),
//           provider_executable: command,
//           command_arguments: [...args],
//         },
//         rawResult: result,
//         result,
//         limitations,
//         ...(absolutePath === undefined
//           ? {}
//           : {
//               locations: [
//                 { kind: "artifact-path" as const, path: absolutePath },
//               ],
//             }),
//       },
//     );
//     return failure === undefined
//       ? ok(evidence)
//       : err(failure.retainPartialObservation(evidence));
//   }
//
//   #registerCleanupFailure(
//     failure: AnalysisError,
//     cleanupOwner: ProviderProcessSupervisor | undefined,
//   ): AnalysisError {
//     if (cleanupOwner !== undefined && failure.cleanupIncomplete)
//       this.#pendingCleanup.get(cleanupOwner)?.failures.add(failure);
//     return failure;
//   }
// }
//
// interface OwnedOutputFailureOptions {
//   readonly stdout: string;
//   readonly stderr: string;
//   readonly code: number | string | null;
//   readonly signal: string | null;
//   readonly outputTruncated: boolean;
//   readonly stdoutInvalidUtf8: boolean;
//   readonly stderrInvalidUtf8: boolean;
//   readonly stdoutBytes: number;
//   readonly stderrBytes: number;
//   readonly capabilityError?: AnalysisCapabilityUnavailableError;
//   readonly collectionFailure?: boolean;
//   readonly cleanup?: AnalysisCleanupObservation;
//   readonly cleanupOwner?: ProviderProcessSupervisor;
//   readonly cause?: unknown;
// }
//
// class OwnedOutputFailure extends Error {
//   readonly stdout: string;
//   readonly stderr: string;
//   readonly code: number | string | null;
//   readonly signal: string | null;
//   readonly outputTruncated: boolean;
//   readonly stdoutInvalidUtf8: boolean;
//   readonly stderrInvalidUtf8: boolean;
//   readonly stdoutBytes: number;
//   readonly stderrBytes: number;
//   readonly capabilityError: AnalysisCapabilityUnavailableError | undefined;
//   readonly collectionFailure: boolean;
//   readonly cleanup: AnalysisCleanupObservation | undefined;
//   readonly cleanupOwner: ProviderProcessSupervisor | undefined;
export const _l = 238;
