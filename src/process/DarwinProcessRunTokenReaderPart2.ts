export const __stub = 1;
// const MAX_COMPILER_STDERR_BYTES = 8 * 1024;
//
// const compilerOutcome = (
//   cause: unknown,
//   timeoutMs: number,
// ): DarwinCompilerOutcome | undefined => {
//   const failure = execFileOutputFailure(cause);
//   if (failure === undefined) return undefined;
//   const stderr = boundedUtf8Text(failure.stderr, MAX_COMPILER_STDERR_BYTES);
//   const outcome =
//     failure.code === "ETIMEDOUT"
//       ? "timed_out"
//       : typeof failure.code === "number"
//         ? "exited"
//         : failure.signal !== null
//           ? "signaled"
//           : failure.code === "ENOENT"
//             ? "spawn_failed"
//             : "failed";
//   return {
//     outcome,
//     code: failure.code,
//     signal: failure.signal,
//     stderr: stderr.text,
//     stderrBytes: Buffer.byteLength(failure.stderr, "utf8"),
//     stderrTruncated: stderr.truncated,
//     outputTruncated: failure.outputTruncated,
//     killed: failure.killed,
//     ...(outcome === "timed_out" ? { timeoutMs } : {}),
//   };
// };
//
// const compilerOutcomeDescription = (
//   outcome: DarwinCompilerOutcome | undefined,
//   fallbackCode: string | number,
// ): string => {
//   if (outcome === undefined) return `compiler result: ${String(fallbackCode)}`;
//   if (outcome.outcome === "exited")
//     return `compiler result: exit code ${String(outcome.code)}`;
//   if (outcome.outcome === "timed_out")
//     return `compiler result: timed out after ${String(outcome.timeoutMs)} ms`;
//   if (outcome.outcome === "signaled")
//     return `compiler result: stopped by signal ${outcome.signal ?? "an unknown signal"}`;
//   return `compiler result: ${String(outcome.code)}`;
// };
//
// const compilerInspectionError = (
//   cause: unknown,
//   timeoutMs: number,
//   compiler: DarwinProcessReaderCompiler,
// ): DarwinProcessOwnershipInspectionError => {
//   const outcome = compilerOutcome(cause, timeoutMs);
//   const code = outcome?.code ?? "unknown";
//   const description = compilerOutcomeDescription(outcome, code);
//   const launcher =
//     compiler.kind === "xcrun"
//       ? "xcrun"
//       : "the selected Swift compiler (REA_DARWIN_SWIFTC_PATH)";
//   const prefix =
//     code === "ENOENT"
//       ? `macOS process ownership inspection requires the Apple Swift compiler via ${launcher}`
//       : `macOS process ownership helper compilation failed via ${launcher}`;
//   const stderr = boundedUtf8Text(outcome?.stderr ?? "", STDERR_EXCERPT_LIMIT);
//   const diagnostics = stderr.text.trim();
//   const truncated =
//     stderr.truncated ||
//     outcome?.stderrTruncated === true ||
//     outcome?.outputTruncated === true;
//   const suffix = diagnostics
//     ? `: ${diagnostics}${truncated ? "… [diagnostics truncated]" : ""}`
//     : outcome === undefined
//       ? `: ${cause instanceof Error ? cause.message : String(cause)}`
//       : ": no compiler diagnostics were captured";
//   return new DarwinProcessOwnershipInspectionError(
//     `${prefix} (${description})${suffix}`,
//     {
//       cause,
//       ...(outcome === undefined ? {} : { compilerOutcome: outcome }),
//     },
//   );
// };
//
// interface ProcessReaderCompilation {
//   readonly controller: AbortController;
//   promise: Promise<string>;
//   waiters: number;
//   aborting: boolean;
//   settled: boolean;
// }
//
// const abortReason = (signal: AbortSignal): unknown => {
//   if (signal.reason !== undefined) return signal.reason;
//   const error = new Error("The operation was aborted");
//   error.name = "AbortError";
//   return error;
// };
//
// const isExpectedAbort = (cause: unknown, signal: AbortSignal): boolean =>
//   signal.aborted &&
//   (cause === signal.reason ||
//     (cause instanceof Error && cause.name === "AbortError"));
//
// const waitForCompilation = async (
//   promise: Promise<string>,
//   signal: AbortSignal | undefined,
// ): Promise<string> => {
//   if (signal === undefined) return promise;
//   if (signal.aborted) throw abortReason(signal);
//   return new Promise((resolve, reject) => {
//     let completed = false;
//     const finish = (callback: () => void) => {
//       if (completed) return;
//       completed = true;
//       signal.removeEventListener("abort", onAbort);
//       callback();
//     };
//     const onAbort = () => finish(() => reject(abortReason(signal)));
//     signal.addEventListener("abort", onAbort, { once: true });
//     promise.then(
//       (value) => finish(() => resolve(value)),
//       (cause: unknown) => finish(() => reject(cause)),
//     );
//     if (signal.aborted) onAbort();
//   });
// };
//
// /** Explicit tool selection; direct Swift compilation also needs its matching SDK. */
// export type DarwinProcessReaderCompiler =
//   | { readonly kind: "xcrun"; readonly executable: string }
//   | {
//       readonly kind: "swiftc";
//       readonly executable: string;
//       readonly sdkRoot: string;
//     };
//
// /** Compile and retain the narrow Darwin sysctl reader for this REA process. */
// export const createDarwinProcessRunTokenReader = (
//   options: {
//     readonly compiler?: DarwinProcessReaderCompiler;
export const _l = 139;
