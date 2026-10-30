export const __stub = 1;
//             partialObservation: await getPartialObservation(),
//           },
//         ),
//       );
//     if (!terminated)
//       return err(
//         new ProviderCleanupError(
//           PROVIDER,
//           await lldbCleanupResources(retained),
//           {
//             reason: "LLDB target process termination could not be verified",
//             ...(lifecycleCleanup === undefined
//               ? {}
//               : { target_cleanup: lifecycleCleanup }),
//           },
//           {
//             operation: OPERATION,
//             partialObservation: await getPartialObservation(),
//           },
//         ),
//       );
//     if (output === undefined)
//       return err(
//         new ProviderAdapterError(PROVIDER, OPERATION, {
//           diagnostics: {
//             reason: "LLDB exited without a tracer result",
//             exit_code: exited.exitCode,
//             lldb_output: exited.output,
//             ...(lifecycleCleanup === undefined
//               ? {}
//               : { target_cleanup: lifecycleCleanup }),
//           },
//           partialObservation: await getPartialObservation(),
//           ...(lifecycleCleanup === undefined
//             ? {}
//             : { cleanup: lifecycleCleanup }),
//         }),
//       );
//     const stdout = await capturedOutput(
//       paths.stdoutCapture,
//       output.target_output.stdout_bytes,
//       output.target_output.stdout_truncated,
//       output.target_output.stdout_complete,
//     );
//     const stderr = await capturedOutput(
//       paths.stderrCapture,
//       output.target_output.stderr_bytes,
//       output.target_output.stderr_truncated,
//       output.target_output.stderr_complete,
//     );
//     if (!stdout.ok || !stderr.ok) {
//       const partial = await getPartialObservation("capture-failure");
//       return err(
//         new ProviderAdapterError(PROVIDER, OPERATION, {
//           partialObservation: partial,
//           diagnostics: {
//             reason: "LLDB target output capture could not be read",
//             ...(stdout.ok ? {} : { stdout_capture_error: stdout.error }),
//             ...(stderr.ok ? {} : { stderr_capture_error: stderr.error }),
//             ...(lifecycleCleanup === undefined
//               ? {}
//               : { target_cleanup: lifecycleCleanup }),
//           },
//           ...(lifecycleCleanup === undefined
//             ? {}
//             : { cleanup: lifecycleCleanup }),
//         }),
//       );
//     }
//     return ok({
//       debugger: { ...lldb, version: output.version },
//       run: output,
//       stdout: stdout.value,
//       stderr: stderr.value,
//       terminated,
//     });
//   }
// }
//
// /** LLDB command arguments are quoted; the bridge path is REA's own install path. */
// const quote = (value: string): string =>
//   `"${value.replaceAll("\\", "\\\\").replaceAll('"', '\\"')}"`;
//
// /** Preserve a decoded bridge failure's type independently of cleanup outcome. */
// const tracerFailure = (
//   output: {
//     readonly status:
//       | "target-error"
//       | "target-integrity-error"
//       | "target-identity-unavailable"
//       | "launch-error"
//       | "tracer-error";
//     readonly error: string | null;
//   },
//   cleanup?: AnalysisCleanupObservation,
//   partialObservation?: NativeCallPartialObservation,
// ): AnalysisError => {
//   const options = {
//     ...(cleanup === undefined ? {} : { cleanup }),
//     ...(partialObservation === undefined ? {} : { partialObservation }),
//   };
//   const message = output.error ?? "no LLDB error text";
//   if (output.status === "target-integrity-error")
//     return new EvidenceIntegrityError(
//       message || "The launched native target did not match its session digest",
//       options,
//     );
//   if (output.status === "target-identity-unavailable")
//     return new ProviderAdapterError(PROVIDER, OPERATION, {
//       ...options,
//       diagnostics: {
//         reason: message,
//         constraint: "target process start identity could not be verified",
//       },
//     });
//   if (output.status === "tracer-error")
//     return new ProviderAdapterError(PROVIDER, OPERATION, {
//       ...options,
//       diagnostics: { reason: `LLDB bridge failed: ${message}` },
//     });
//   if (output.status === "target-error")
//     return new AnalysisCapabilityUnavailableError(
//       PROVIDER,
//       OPERATION,
//       `lldb-target-unloadable: ${message}`,
//       options,
//     );
//   // debugserver reports denied task access as an attach failure.
//   return /attach|not allowed|permission|denied|debugserver/iu.test(message)
//     ? new AnalysisCapabilityUnavailableError(
//         PROVIDER,
//         OPERATION,
//         `debugger-attach-denied: ${message}`,
//         { userMessage: ATTACH_REMEDIATION, ...options },
//       )
//     : new AnalysisCapabilityUnavailableError(
//         PROVIDER,
//         OPERATION,
//         `launch-failed: ${message}`,
//         options,
//       );
// };
//
// const partialNativeObservation = async (options: {
//   readonly request: Parameters<NativeCallTracer["trace"]>[0];
//   readonly pidPath: string;
//   readonly stdoutPath: string;
//   readonly stderrPath: string;
//   readonly observationPath: string;
//   readonly version: string | null;
//   readonly reason: NativeCallPartialObservation["coverage"]["reason"];
// }): Promise<NativeCallPartialObservation> => {
//   const [journal, pid, stdout, stderr] = await Promise.all([
//     readLldbObservationJournal(options.observationPath),
//     readTargetPid(options.pidPath),
//     readPartialCapture(options.stdoutPath),
//     readPartialCapture(options.stderrPath),
//   ]);
//   return projectLldbPartialObservation({
//     target: {
//       path: options.request.executable,
//       sha256: options.request.expectedSha256,
//       architecture: options.request.architecture,
//       arguments: options.request.input.arguments,
//       environment: options.request.input.environment,
//       working_directory: options.request.input.working_directory ?? null,
//     },
//     pid,
//     stdout: stdout?.capture ?? null,
//     stderr: stderr?.capture ?? null,
//     version: options.version,
//     journal: journal.parsed,
//     journalLimitations: journal.limitations,
//     limitations: [
//       ...(stdout?.limitations ?? []),
//       ...(stderr?.limitations ?? []),
//     ],
//     reason: options.reason,
//   });
// };
//
// const partialObservationFromTrace = (
//   request: Parameters<NativeCallTracer["trace"]>[0],
//   trace: NativeCallTrace,
// ): NativeCallPartialObservation =>
//   projectLldbPartialObservation({
//     target: {
//       path: request.executable,
//       sha256: request.expectedSha256,
//       architecture: request.architecture,
//       arguments: request.input.arguments,
//       environment: request.input.environment,
//       working_directory: request.input.working_directory ?? null,
//     },
//     pid: trace.run.pid,
//     stdout: trace.stdout,
//     stderr: trace.stderr,
//     version: trace.run.version,
//     journal: {
//       events: trace.run.events,
//       otherStops: trace.run.other_stops,
//       limitations: [],
//     },
//     reason: "cleanup-failure",
//   });
//
// const lldbRuntimePaths = (directory: string) => ({
//   config: join(directory, "config.json"),
//   result: join(directory, "result.json"),
//   pid: join(directory, "pid"),
//   identityAck: join(directory, "identity.ack"),
//   stdout: join(directory, "stdout"),
//   stderr: join(directory, "stderr"),
//   stdoutCapture: join(directory, "stdout.capture"),
//   stderrCapture: join(directory, "stderr.capture"),
//   observations: join(directory, "observations.jsonl"),
// });
//
// const readTracerOutput = async (
//   path: string,
// ): Promise<z.infer<typeof tracerOutputSchema> | undefined> => {
//   let text: string;
//   try {
//     text = await readFile(path, "utf8");
//   } catch {
//     return undefined;
//   }
//   const parsed = safeParseJson(text);
//   if (!parsed.ok) return undefined;
//   const output = tracerOutputSchema.safeParse(parsed.value);
//   return output.success ? output.data : undefined;
// };
//
// const capturedOutput = async (
//   path: string,
//   observedBytes: number,
//   truncated: boolean,
//   complete: boolean,
// ): Promise<Result<CapturedOutput, string>> => {
//   let handle: Awaited<ReturnType<typeof open>> | undefined;
//   try {
//     handle = await open(path, "r");
//     const { size } = await handle.stat();
//     const captureHandle = handle;
//     const { buffer, bytesRead } = await readBoundedPrefix(
//       Math.min(size, MAX_OUTPUT_BYTES),
//       async (target, offset, length, position) =>
//         (await captureHandle.read(target, offset, length, position)).bytesRead,
//     );
//     const captured = {
//       text: buffer.subarray(0, bytesRead).toString("utf8"),
//       bytes: observedBytes,
//       truncated: truncated || size > MAX_OUTPUT_BYTES,
//       complete:
//         complete && bytesRead >= Math.min(observedBytes, MAX_OUTPUT_BYTES),
export const _l = 255;
