export const __stub = 1;
//
//   constructor(options: OwnedOutputFailureOptions) {
//     super("Owned provider command did not produce a complete result.", {
//       cause: options.cause,
//     });
//     this.stdout = options.stdout;
//     this.stderr = options.stderr;
//     this.code = options.code;
//     this.signal = options.signal;
//     this.outputTruncated = options.outputTruncated;
//     this.stdoutInvalidUtf8 = options.stdoutInvalidUtf8;
//     this.stderrInvalidUtf8 = options.stderrInvalidUtf8;
//     this.stdoutBytes = options.stdoutBytes;
//     this.stderrBytes = options.stderrBytes;
//     this.capabilityError = options.capabilityError;
//     this.collectionFailure = options.collectionFailure ?? false;
//     this.cleanup = options.cleanup;
//     this.cleanupOwner = options.cleanupOwner;
//   }
// }
//
// const runOwnedCommandOutput =
//   (
//     runOwned: typeof runOwnedCommand,
//     onCleanupOwner: (
//       owner: ProviderProcessSupervisor,
//       cleanup: AnalysisCleanupObservation,
//     ) => void,
//   ): ReverseEngineeringCommandRunner =>
//   async (command, args, options = {}) => {
//     const spawnEnv = { ...options.env };
//     try {
//       const snapshot = await runOwned(
//         {
//           command,
//           arguments: [...args],
//           runId: randomUUID(),
//           expectedCommand: null,
//           env: spawnEnv,
//           hostEnvironment: {},
//           sweepTokenOwnedProcesses: true,
//         },
//         {
//           timeoutMs: DEFAULT_TIMEOUT_MS,
//           diagnosticBytes: MAX_COMBINED_OUTPUT_BYTES,
//           acceptNonZeroExit: true,
//         },
//         { signal: options.signal },
//       );
//       if (snapshot.signal !== null && snapshot.signal !== undefined)
//         throw new OwnedOutputFailure({
//           stdout: snapshot.stdout.text,
//           stderr: snapshot.stderr.text,
//           code: snapshot.exitCode ?? null,
//           signal: snapshot.signal,
//           outputTruncated: snapshot.diagnosticTruncated === true,
//           stdoutInvalidUtf8: snapshot.stdout.invalidUtf8 === true,
//           stderrInvalidUtf8: snapshot.stderr.invalidUtf8 === true,
//           stdoutBytes: snapshot.stdout.bytes,
//           stderrBytes: snapshot.stderr.bytes,
//         });
//       if (snapshot.exitCode !== 0)
//         throw new OwnedOutputFailure({
//           stdout: snapshot.stdout.text,
//           stderr: snapshot.stderr.text,
//           code: snapshot.exitCode ?? null,
//           signal: null,
//           outputTruncated: snapshot.diagnosticTruncated === true,
//           stdoutInvalidUtf8: snapshot.stdout.invalidUtf8 === true,
//           stderrInvalidUtf8: snapshot.stderr.invalidUtf8 === true,
//           stdoutBytes: snapshot.stdout.bytes,
//           stderrBytes: snapshot.stderr.bytes,
//         });
//       return {
//         stdout: snapshot.stdout.text,
//         stderr: snapshot.stderr.text,
//         stdoutInvalidUtf8: snapshot.stdout.invalidUtf8 === true,
//         stderrInvalidUtf8: snapshot.stderr.invalidUtf8 === true,
//         stdoutBytes: snapshot.stdout.bytes,
//         stderrBytes: snapshot.stderr.bytes,
//       };
//     } catch (cause) {
//       if (!(cause instanceof OwnedCommandFailure)) throw cause;
//       if (cause.cleanupOwner !== undefined && cause.cleanupFailure !== null)
//         onCleanupOwner(cause.cleanupOwner, {
//           reason: cause.cleanupFailure,
//           resources: cause.resources,
//         });
//       const snapshot = cause.snapshot;
//       const launchErrorCode =
//         cause.cause instanceof Error
//           ? Reflect.get(cause.cause, "code")
//           : undefined;
//       const code =
//         cause.reason === "cancelled"
//           ? "ABORT_ERR"
//           : cause.reason === "timeout"
//             ? "ETIMEDOUT"
//             : cause.reason === "output-limit"
//               ? "ERR_CHILD_PROCESS_STDIO_MAXBUFFER"
//               : launchErrorCode === "E2BIG"
//                 ? "E2BIG"
//                 : snapshot === null
//                   ? "ERR_PROVIDER_LAUNCH"
//                   : (snapshot.exitCode ?? null);
//       throw new OwnedOutputFailure({
//         stdout: snapshot?.stdout.text ?? "",
//         stderr: snapshot?.stderr.text ?? "",
//         code,
//         signal: snapshot?.signal ?? null,
//         outputTruncated: snapshot?.diagnosticTruncated === true,
//         stdoutInvalidUtf8: snapshot?.stdout.invalidUtf8 === true,
//         stderrInvalidUtf8: snapshot?.stderr.invalidUtf8 === true,
//         stdoutBytes: snapshot?.stdout.bytes ?? 0,
//         stderrBytes: snapshot?.stderr.bytes ?? 0,
//         ...(cause.cause instanceof AnalysisCapabilityUnavailableError
//           ? { capabilityError: cause.cause }
//           : {}),
//         ...(cause.collectionFailure ? { collectionFailure: true } : {}),
//         ...(cause.cleanupFailure === null
//           ? {}
//           : {
//               cleanup: {
//                 reason: cause.cleanupFailure,
//                 resources: cause.resources,
//               },
//             }),
//         ...(cause.cleanupOwner === undefined
//           ? {}
//           : { cleanupOwner: cause.cleanupOwner }),
//         cause,
//       });
//     }
//   };
//
// const ownedCleanupOptions = (
//   cause: unknown,
// ): { readonly cleanup?: AnalysisCleanupObservation } =>
//   cause instanceof OwnedOutputFailure && cause.cleanup !== undefined
//     ? { cleanup: cause.cleanup }
//     : {};
//
// const digestFile = async (
//   path: string,
//   signal?: AbortSignal,
//   stat: (path: string) => Promise<Stats> = statPath,
// ): Promise<string> => {
//   const info = await statWithDeadline(path, signal, stat);
//   if (!info.isFile())
//     throw Object.assign(new Error("Artifact digest requires a regular file"), {
//       code: "EINVAL",
//     });
//   return new Promise<string>((resolveDigest, rejectDigest) => {
//     const hash = createHash("sha256");
//     const stream = createReadStream(path);
//     const timer = setTimeout(
//       () =>
//         stream.destroy(
//           Object.assign(new Error("Artifact digest timed out"), {
//             code: "ETIMEDOUT",
//           }),
//         ),
//       DEFAULT_TIMEOUT_MS,
//     );
//     const abort = (): void => {
//       stream.destroy(new AnalysisCancelledError("artifact_digest"));
//     };
//     const cleanup = (): void => {
//       clearTimeout(timer);
//       signal?.removeEventListener("abort", abort);
//     };
//     if (signal?.aborted) {
//       cleanup();
//       stream.destroy();
//       rejectDigest(new AnalysisCancelledError("artifact_digest"));
//       return;
//     }
//     signal?.addEventListener("abort", abort, { once: true });
//     stream.on("data", (chunk: Buffer | string) => hash.update(chunk));
//     stream.once("error", (cause: Error) => {
//       cleanup();
//       rejectDigest(cause);
//     });
//     stream.once("end", () => {
//       cleanup();
//       resolveDigest(hash.digest("hex"));
//     });
//   });
// };
//
// const statWithDeadline = (
//   path: string,
//   signal: AbortSignal | undefined,
//   stat: (path: string) => Promise<Stats>,
// ): Promise<Stats> => {
//   if (signal?.aborted)
//     return Promise.reject(new AnalysisCancelledError("artifact_digest"));
//   return new Promise<Stats>((resolveStat, rejectStat) => {
//     let settled = false;
//     const finish = (cause?: unknown, value?: Stats): void => {
//       if (settled) return;
//       settled = true;
//       clearTimeout(timer);
//       signal?.removeEventListener("abort", abort);
//       if (cause !== undefined) rejectStat(cause);
//       else resolveStat(value!);
//     };
//     const abort = (): void =>
//       finish(new AnalysisCancelledError("artifact_digest"));
//     const timer = setTimeout(
//       () =>
//         finish(
//           Object.assign(new Error("Artifact stat timed out"), {
//             code: "ETIMEDOUT",
//           }),
//         ),
//       DEFAULT_TIMEOUT_MS,
//     );
//     signal?.addEventListener("abort", abort, { once: true });
//     if (signal?.aborted) {
//       abort();
//       return;
//     }
//     // Promise handlers stay attached after timeout/cancellation so a delayed
//     // stat rejection is observed and cannot become an unhandled rejection.
//     try {
//       void stat(path).then(
//         (info) => finish(undefined, info),
//         (cause: unknown) => finish(cause),
//       );
//     } catch (cause) {
//       finish(cause);
//     }
//   });
// };
export const _l = 235;
