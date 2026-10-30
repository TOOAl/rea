export const __stub = 1;
//       );
//     if (
//       this.#activeOperations.size >=
//       MAX_CONCURRENT_REVERSE_ENGINEERING_OPERATIONS
//     )
//       return Promise.resolve(
//         err(
//           new AnalysisResourceConstraintError(
//             operation,
//             "transport",
//             "Concurrent reverse-engineering operation capacity reached.",
//             {
//               max_concurrent_operations:
//                 MAX_CONCURRENT_REVERSE_ENGINEERING_OPERATIONS,
//               active_operations: this.#activeOperations.size,
//             },
//           ),
//         ),
//       );
//     const controller = new AbortController();
//     const relayAbort = (): void => controller.abort(signal?.reason);
//     if (signal instanceof AbortSignal) {
//       if (signal.aborted) relayAbort();
//       else signal.addEventListener("abort", relayAbort, { once: true });
//     }
//     const operationSignal =
//       signal === undefined || signal instanceof AbortSignal
//         ? controller.signal
//         : signal;
//     const running = this.#observeProvider(
//       operation,
//       profile,
//       path,
//       parameters,
//       operationSignal,
//     );
//     const tracked = running.finally(() => {
//       signal?.removeEventListener("abort", relayAbort);
//       this.#activeOperations.delete(controller);
//     });
//     this.#activeOperations.set(controller, tracked);
//     return tracked;
//   }
//
//   async #observeProvider(
//     operation: ReverseEngineeringOperation,
//     profile: ReverseEngineeringProviderCommand,
//     path: string | undefined,
//     parameters: Readonly<Record<string, JsonValue>>,
//     signal?: AbortSignal,
//   ): Promise<Result<Evidence, AnalysisError>> {
//     const { executable: command, arguments: args } = profile;
//     if (signal?.aborted) return err(new AnalysisCancelledError(operation));
//     const cleanup = await this.retryCleanup(operation);
//     if (!cleanup.ok) return cleanup;
//     const absolutePath =
//       path === undefined ? undefined : absoluteCallerPath(path);
//     let digest: string | undefined;
//     try {
//       if (absolutePath !== undefined)
//         digest = await this.#digest(absolutePath, signal, this.#stat);
//     } catch (cause) {
//       const code = (cause as NodeJS.ErrnoException).code;
//       if (signal?.aborted)
//         return err(new AnalysisCancelledError(operation, { cause }));
//       if (code === "EACCES" || code === "EPERM") {
//         const deniedPath = absolutePath === undefined ? command : absolutePath;
//         return err(
//           new AnalysisAccessDeniedError(operation, deniedPath, code, {
//             cause,
//           }),
//         );
//       }
//       if (code === "ETIMEDOUT")
//         return err(
//           new AnalysisTimeoutError(operation, DEFAULT_TIMEOUT_MS, { cause }),
//         );
//       return err(new AnalysisInputError(operation, { cause }));
//     }
//     let stdout = "";
//     let stderr = "";
//     let stdoutBytes = 0;
//     let stderrBytes = 0;
//     let exitCode: number | string | null = 0;
//     let signalName: string | null = null;
//     let outputTruncated = false;
//     let stdoutInvalidUtf8 = false;
//     let stderrInvalidUtf8 = false;
//     let cleanupIncomplete = false;
//     let cleanupOnlyFailure = false;
//     let completionStatus: "complete" | "unknown" = "complete";
//     let failure: AnalysisError | undefined;
//     let cleanupOwner: ProviderProcessSupervisor | undefined;
//     let earlyFailure: AnalysisError | undefined;
//     try {
//       const output = await this.#run(command, args, {
//         env: {
//           ...this.#environment,
//           ...profile.environmentOverrides,
//         },
//         signal,
//         timeout: DEFAULT_TIMEOUT_MS,
//         stopSignal: "SIGTERM",
//         maxBuffer: MAX_COMBINED_OUTPUT_BYTES,
//       });
//       stdout = output.stdout;
//       stderr = output.stderr;
//       stdoutBytes = output.stdoutBytes ?? Buffer.byteLength(stdout);
//       stderrBytes = output.stderrBytes ?? Buffer.byteLength(stderr);
//       stdoutInvalidUtf8 = output.stdoutInvalidUtf8 === true;
//       stderrInvalidUtf8 = output.stderrInvalidUtf8 === true;
//     } catch (cause) {
//       cleanupOwner =
//         cause instanceof OwnedOutputFailure ? cause.cleanupOwner : undefined;
//       if (
//         cause instanceof OwnedOutputFailure &&
//         cause.capabilityError !== undefined
//       )
//         earlyFailure = new AnalysisCapabilityUnavailableError(
//           cause.capabilityError.providerId,
//           cause.capabilityError.operation,
//           cause.capabilityError.reason,
//           {
//             cause: cause.capabilityError,
//             ...(cause.capabilityError.diagnostics === undefined
//               ? {}
//               : { diagnostics: cause.capabilityError.diagnostics }),
//             ...(cause.capabilityError.capturedOutput === undefined
//               ? {}
//               : { capturedOutput: cause.capabilityError.capturedOutput }),
//             ...(cause.capabilityError.partialObservation === undefined
//               ? {}
//               : {
//                   partialObservation: cause.capabilityError.partialObservation,
//                 }),
//             ...(cause.capabilityError.userMessage === undefined
//               ? {}
//               : { userMessage: cause.capabilityError.userMessage }),
//             retryable: cause.capabilityError.retryable,
//             ...ownedCleanupOptions(cause),
//           },
//         );
//       const capture = execFileOutputFailure(cause);
//       const code =
//         capture?.code ?? (cause as NodeJS.ErrnoException).code ?? undefined;
//       if (earlyFailure === undefined && code === "E2BIG")
//         earlyFailure = new AnalysisResourceConstraintError(
//           operation,
//           "transport",
//           "The host rejected the provider command because its argument list exceeds the process launch limit.",
//           {
//             argument_bytes: args.reduce(
//               (bytes, argument, index) =>
//                 bytes + Buffer.byteLength(argument) + (index === 0 ? 0 : 1),
//               0,
//             ),
//           },
//           { cause, ...ownedCleanupOptions(cause) },
//         );
//       if (
//         earlyFailure === undefined &&
//         (capture === undefined ||
//           code === "ENOENT" ||
//           code === "ERR_PROVIDER_LAUNCH")
//       ) {
//         if (signal?.aborted || code === "ABORT_ERR")
//           earlyFailure = new AnalysisCancelledError(operation, {
//             cause,
//             ...ownedCleanupOptions(cause),
//           });
//         else if (code === "ETIMEDOUT")
//           earlyFailure = new AnalysisTimeoutError(
//             operation,
//             DEFAULT_TIMEOUT_MS,
//             {
//               cause,
//               ...ownedCleanupOptions(cause),
//             },
//           );
//         else if (code === "EACCES" || code === "EPERM")
//           earlyFailure = new AnalysisAccessDeniedError(
//             operation,
//             command,
//             code,
//             {
//               cause,
//               ...ownedCleanupOptions(cause),
//             },
//           );
//         else
//           earlyFailure = new AnalysisCapabilityUnavailableError(
//             operation === "inspect_with_objdump" ? "objdump" : "rizin",
//             operation,
//             `Unable to run configured command (${String(code ?? "unknown error")})`,
//             { cause, ...ownedCleanupOptions(cause) },
//           );
//       }
//       if (earlyFailure === undefined && capture !== undefined) {
//         stdout = capture.stdout;
//         stderr = capture.stderr;
//         stdoutBytes = capture.stdoutBytes ?? Buffer.byteLength(stdout);
//         stderrBytes = capture.stderrBytes ?? Buffer.byteLength(stderr);
//         exitCode = capture.code;
//         signalName = capture.signal;
//         outputTruncated = capture.outputTruncated;
//         if (capture.collectionFailure) {
//           exitCode = null;
//           completionStatus = "unknown";
//         }
//         const capturedOutput = {
//           stdout,
//           stderr,
//           truncated: outputTruncated,
//           stdout_bytes: stdoutBytes,
//           stderr_bytes: stderrBytes,
//           exit_code:
//             !capture.collectionFailure && typeof capture.code === "number"
//               ? capture.code
//               : null,
//           signal: capture.signal,
//         };
//         if (signal?.aborted || code === "ABORT_ERR")
//           failure = new AnalysisCancelledError(operation, {
//             cause,
//             capturedOutput,
//             ...ownedCleanupOptions(cause),
//           });
//         else if (code === "ETIMEDOUT")
//           failure = new AnalysisTimeoutError(operation, DEFAULT_TIMEOUT_MS, {
//             cause,
//             capturedOutput,
//             ...ownedCleanupOptions(cause),
//           });
//         else if (code === "EACCES" || code === "EPERM")
//           failure = new AnalysisAccessDeniedError(operation, command, code, {
//             cause,
//             capturedOutput,
//             ...ownedCleanupOptions(cause),
export const _l = 238;
