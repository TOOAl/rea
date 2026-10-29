export const __stub = 1;
//         processStopped: true,
//         targetStopped: true,
//       };
//       const partialObservation = result.ok
//         ? partialObservationFromTrace(request, result.value)
//         : result.error.partialObservation;
//       return err(
//         new ProviderCleanupError(
//           PROVIDER,
//           [root.path],
//           {
//             reason: cause instanceof Error ? cause.message : String(cause),
//             ...(result.ok
//               ? {}
//               : {
//                   execution_failure: projectAnalysisError(result.error).code,
//                   primary_failure: result.error.message,
//                 }),
//           },
//           {
//             operation: OPERATION,
//             cause: result.ok
//               ? cause
//               : new AggregateError(
//                   [result.error, cause],
//                   "LLDB trace and runtime cleanup both failed",
//                 ),
//             ...(partialObservation === undefined ? {} : { partialObservation }),
//           },
//         ),
//       );
//     }
//     return result;
//   }
//
//   /** Retry retained LLDB cleanup without abandoning its process or runtime owner. */
//   async close(): Promise<Result<null, AnalysisError>> {
//     return this.#serialize(() => this.#close());
//   }
//
//   async #close(): Promise<Result<null, AnalysisError>> {
//     const failure = await this.#retryPendingCleanup();
//     return failure === undefined ? ok(null) : err(failure);
//   }
//
//   #serialize<T>(operation: () => Promise<T>): Promise<T> {
//     const call = this.#tail.then(operation, operation);
//     this.#tail = call.then(
//       () => undefined,
//       () => undefined,
//     );
//     return call;
//   }
//
//   async #retryPendingCleanup(): Promise<ProviderCleanupError | undefined> {
//     const owner = this.#pendingCleanup;
//     if (owner === undefined) return undefined;
//     let firstFailure: string | undefined;
//     if (!owner.processStopped) {
//       const stopped = await owner.supervisor?.stop();
//       if (stopped?.status === "incomplete") firstFailure = stopped.reason;
//       else {
//         owner.supervisor?.dispose();
//         owner.processStopped = true;
//       }
//     }
//     if (firstFailure === undefined && !owner.targetStopped) {
//       const targetTermination = await ensureTerminated(
//         owner.pidPath,
//         owner.targetIdentity,
//         true,
//       );
//       if (targetTermination !== "terminated")
//         firstFailure = targetTerminationReason(targetTermination);
//       else owner.targetStopped = true;
//     }
//     if (firstFailure === undefined) {
//       try {
//         await owner.root.close();
//         this.#pendingCleanup = undefined;
//         return undefined;
//       } catch (cause: unknown) {
//         firstFailure = cause instanceof Error ? cause.message : String(cause);
//       }
//     }
//     const resources = await lldbCleanupResources(owner);
//     return new ProviderCleanupError(
//       PROVIDER,
//       resources,
//       {
//         reason: firstFailure ?? "LLDB cleanup remains incomplete",
//         resources,
//       },
//       { operation: OPERATION },
//     );
//   }
//
//   async #run(
//     lldb: ResolvedTool,
//     root: PrivateRuntimeRoot,
//     request: Parameters<NativeCallTracer["trace"]>[0],
//     signal?: AbortSignal,
//   ): Promise<Result<NativeCallTrace, AnalysisError>> {
//     const directory = root.path;
//     const paths = lldbRuntimePaths(directory);
//     const { input } = request;
//     await writeFile(
//       paths.config,
//       JSON.stringify({
//         executable: request.executable,
//         architecture: request.architecture,
//         expected_sha256: request.expectedSha256,
//         arguments: input.arguments,
//         environment: input.environment,
//         working_directory: input.working_directory ?? null,
//         breakpoints: input.breakpoints.map((breakpoint) =>
//           breakpoint.kind === "function"
//             ? { ...breakpoint, module: breakpoint.module ?? null }
//             : { ...breakpoint, class_name: breakpoint.class_name ?? null },
//         ),
//         duration_ms: input.duration_ms,
//         max_events: input.max_events,
//         argument_registers: input.argument_registers,
//         backtrace_frames: input.backtrace_frames,
//         max_output_bytes: MAX_OUTPUT_BYTES,
//         stdout_path: paths.stdout,
//         stderr_path: paths.stderr,
//         stdout_capture_path: paths.stdoutCapture,
//         stderr_capture_path: paths.stderrCapture,
//         result_path: paths.result,
//         pid_path: paths.pid,
//         identity_ack_path: paths.identityAck,
//         observation_path: paths.observations,
//       }),
//       { mode: 0o600 },
//     );
//     const exited = await this.launch(
//       lldb.path,
//       [
//         "--batch",
//         "--no-lldbinit",
//         "--no-use-colors",
//         "-o",
//         `command script import ${quote(BRIDGE)}`,
//         "-o",
//         `rea_trace ${paths.config}`,
//       ],
//       {
//         deadlineMs: input.duration_ms + DEADLINE_GRACE_MS,
//         pidPath: paths.pid,
//         identityAckPath: paths.identityAck,
//         environment: this.environment,
//         ...(signal === undefined ? {} : { signal }),
//       },
//     );
//     const retained: RetainedLldbResources = {
//       root,
//       supervisor: exited.cleanupOwner,
//       pidPath: paths.pid,
//       targetIdentity: exited.targetIdentity,
//       processStopped: exited.cleanupOwner === undefined,
//       targetStopped: !exited.targetLaunched,
//     };
//     this.#pendingCleanup = retained;
//     const output =
//       exited.kind === "exited"
//         ? await readTracerOutput(paths.result)
//         : undefined;
//     let targetTermination: TargetTermination = exited.targetLaunched
//       ? await ensureTerminated(paths.pid, exited.targetIdentity, true)
//       : "terminated";
//     // Only an explicit bridge phase fact may prove that no target process was
//     // created. A missing PID or an integrity-error status alone is ambiguous.
//     if (
//       output !== undefined &&
//       output.status !== "traced" &&
//       output.target_process_created === false &&
//       (await readTargetPid(paths.pid)) === undefined
//     )
//       targetTermination = "terminated";
//     retained.targetStopped = targetTermination === "terminated";
//     if (retained.processStopped && retained.targetStopped)
//       this.#pendingCleanup = undefined;
//     const terminated = targetTermination === "terminated";
//     const cleanupDetails = [
//       exited.cleanupFailure,
//       ...(terminated ? [] : [targetTerminationReason(targetTermination)]),
//     ].filter((detail): detail is string => detail !== undefined);
//     const lifecycleCleanup =
//       cleanupDetails.length === 0
//         ? undefined
//         : {
//             reason: cleanupDetails.join("; "),
//             resources: await lldbCleanupResources(retained),
//           };
//     const partialReason =
//       exited.kind === "cancelled"
//         ? "cancelled"
//         : exited.kind === "timeout"
//           ? "timeout"
//           : exited.cleanupFailure !== undefined
//             ? "cleanup-failure"
//             : "tracer-failure";
//     const getPartialObservation = (
//       reason: NativeCallPartialObservation["coverage"]["reason"] = partialReason,
//     ): Promise<NativeCallPartialObservation> =>
//       partialNativeObservation({
//         request,
//         pidPath: paths.pid,
//         stdoutPath: paths.stdoutCapture,
//         stderrPath: paths.stderrCapture,
//         observationPath: paths.observations,
//         version: output?.status === "traced" ? output.version : null,
//         reason,
//       });
//     if (exited.kind === "cancelled")
//       return err(
//         new AnalysisCancelledError(OPERATION, {
//           ...(lifecycleCleanup === undefined
//             ? {}
//             : { cleanup: lifecycleCleanup }),
//           partialObservation: await getPartialObservation(),
//         }),
//       );
//     if (exited.kind === "timeout")
//       return err(
//         new AnalysisTimeoutError(
//           OPERATION,
//           input.duration_ms + DEADLINE_GRACE_MS,
//           {
//             ...(lifecycleCleanup === undefined
//               ? {}
//               : { cleanup: lifecycleCleanup }),
//             partialObservation: await getPartialObservation(),
//           },
//         ),
//       );
//     if (output !== undefined && output.status !== "traced")
//       return err(
//         tracerFailure(output, lifecycleCleanup, await getPartialObservation()),
//       );
//     if (exited.cleanupFailure !== undefined)
//       return err(
//         new ProviderCleanupError(
//           PROVIDER,
//           await lldbCleanupResources(retained),
//           {
//             reason: "LLDB process-group cleanup could not be verified",
//             cleanup_failure: exited.cleanupFailure,
//             ...(lifecycleCleanup === undefined
//               ? {}
//               : { target_cleanup: lifecycleCleanup }),
//           },
//           {
//             operation: OPERATION,
export const _l = 255;
