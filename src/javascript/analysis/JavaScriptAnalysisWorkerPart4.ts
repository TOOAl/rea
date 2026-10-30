export const __stub = 1;
//       );
//     return facts;
//   }
//
//   #limits() {
//     return {
//       ...(WORKER_HEAP_FLAGS_ENFORCED
//         ? {
//             worker_old_space_mb: this.limits.heapMb,
//             ...(this.#heapLimitBytes === 0
//               ? {}
//               : { worker_heap_limit_bytes: this.#heapLimitBytes }),
//           }
//         : // Bun enforces no worker heap limit; report it as unavailable.
//           { worker_heap_limit_bytes: null }),
//       ...(this.#processMemoryLimitBytes === null
//         ? {}
//         : {
//             worker_process_memory_limit_bytes: this.#processMemoryLimitBytes,
//           }),
//       worker_timeout_ms: this.limits.timeoutMs,
//     };
//   }
//   #memoryLimitReached(): boolean {
//     return this.#supervisor?.launch.process.memoryLimitReached === true;
//   }
//   #memoryFailure(path: string): AnalysisResourceConstraintError {
//     return new AnalysisResourceConstraintError(
//       OPERATION,
//       "memory",
//       `Owned JavaScript worker reached its ${this.#processMemoryLimitBytes === null ? "" : `${String(this.#processMemoryLimitBytes)}-byte `}process memory limit while analyzing ${path} during ${this.#phase}`,
//       this.#limits(),
//       { capturedOutput: this.#captured() },
//     );
//   }
//   #remainingResultBudget(): number {
//     // One sequential worker produces one next checkpoint at a time. Reserve
//     // its maximum protocol size at the same retained expansion used on receipt;
//     // earlier checkpoints are already charged to estimatedRetainedBytes.
//     // Reserving every unexamined source's maximum would reject useful results
//     // merely because many small files remain. Actual retained growth and live
//     // heap capacity are checked again for every checkpoint and transfer.
//     const checkpointReserve =
//       DEFAULTS.checkpointBytes * STATIC_CHECKPOINT_RETENTION_EXPANSION;
//     const staticReserve =
//       this.#sourcesRemaining !== undefined && this.#sourcesRemaining > 0
//         ? checkpointReserve
//         : 0;
//     return Math.max(0, this.#remainingTotalResultBudget() - staticReserve);
//   }
//   #remainingTotalResultBudget(): number {
//     return Math.max(
//       0,
//       Math.min(
//         this.#resultBudgetBytes - this.#estimatedRetainedBytes,
//         getHeapStatistics().heap_size_limit -
//           process.memoryUsage().heapUsed -
//           24 * JAVASCRIPT_ANALYSIS_TRANSFER_RECORD_BYTES,
//       ),
//     );
//   }
//   #captured() {
//     const snapshot = this.#supervisor?.snapshot();
//     return {
//       stdout: "",
//       stderr: snapshot?.stderr.text ?? "",
//       truncated: snapshot?.diagnosticTruncated ?? false,
//       stderr_bytes: snapshot?.stderr.observedBytes ?? 0,
//       exit_code: snapshot?.exitCode ?? null,
//       signal: snapshot?.signal ?? null,
//     };
//   }
//   #failure(
//     cause: unknown,
//     path: string,
//     deadline: ProviderStartupDeadline | undefined,
//     signal: AbortSignal | undefined,
//   ): AnalysisError {
//     // Ownership preparation is abortable before the worker deadline exists.
//     if (
//       deadline?.interruption === "cancelled" ||
//       (deadline === undefined &&
//         signal?.aborted === true &&
//         !(cause instanceof ProviderCleanupError))
//     )
//       return new AnalysisCancelledError(OPERATION, {
//         capturedOutput: this.#captured(),
//       });
//     if (deadline?.interruption === "timeout")
//       return new AnalysisTimeoutError(OPERATION, this.limits.timeoutMs, {
//         capturedOutput: this.#captured(),
//       });
//     // A reached process limit explains the worker's exit, broken pipe or
//     // truncated frame better than the symptom it produced.
//     if (
//       this.#memoryLimitReached() &&
//       !(cause instanceof AnalysisResourceConstraintError)
//     )
//       return this.#memoryFailure(path);
//     if (cause instanceof AnalysisError) return cause;
//     if (
//       cause instanceof z.ZodError ||
//       cause instanceof TypeError ||
//       cause instanceof SyntaxError
//     )
//       return new AnalysisOutputError(
//         OPERATION,
//         `${path} during ${this.#phase}: ${message(cause)}`,
//         { cause, capturedOutput: this.#captured() },
//       );
//     return cause instanceof PrivateRuntimeRootUnavailableError
//       ? new AnalysisCapabilityUnavailableError(
//           PROVIDER,
//           OPERATION,
//           cause.message,
//           { cause, retryable: cause.retryable },
//         )
//       : new ProviderAdapterError(PROVIDER, OPERATION, {
//           cause,
//           capturedOutput: this.#captured(),
//           diagnostics: {
//             source_path: path,
//             phase: this.#phase,
//             message: message(cause),
//           },
//         });
//   }
//   #cleanupError(
//     reason: string,
//     original: AnalysisError | undefined = this.#lastFailure,
//   ): ProviderCleanupError {
//     return new ProviderCleanupError(
//       PROVIDER,
//       [this.#runId, ...(this.#root === undefined ? [] : [this.#root.path])],
//       {
//         reason,
//         worker_pid: this.#supervisor?.launch.process.pid ?? null,
//         ...(original === undefined
//           ? {}
//           : {
//               execution_failure: {
//                 tag: original._tag,
//                 message: original.message,
//                 captured_output: {
//                   stdout: original.capturedOutput?.stdout ?? "",
//                   stderr: original.capturedOutput?.stderr ?? "",
//                   truncated: original.capturedOutput?.truncated ?? false,
//                 },
//               },
//             }),
//       },
//       {
//         operation: OPERATION,
//         cause: new Error(
//           reason,
//           original === undefined ? undefined : { cause: original },
//         ),
//       },
//     );
//   }
//   async #stop(
//     original: AnalysisError | undefined = this.#lastFailure,
//   ): Promise<ProviderCleanupError | undefined> {
//     if (this.#supervisor !== undefined) {
//       const supervisor = this.#supervisor;
//       const stopped = await supervisor.stop();
//       supervisor.launch.process.stdout?.off("data", this.#onStdout);
//       if (stopped.status === "incomplete") {
//         try {
//           const stdin = supervisor.launch.process.stdin;
//           if (
//             stdin !== undefined &&
//             stdin !== null &&
//             !stdin.destroyed &&
//             !stdin.writableEnded
//           ) {
//             stdin.off("error", this.#onStdinError);
//             stdin.once("error", this.#onStdinError);
//             stdin.end();
//           }
//         } catch {
//           // Cooperative protocol stdin may already be closed or broken.
//         }
//         this.#resetState();
//         pendingCleanup.add(this);
//         return this.#cleanupError(stopped.reason, original);
//       }
//       supervisor.dispose();
//       this.#supervisor = undefined;
//     }
//     this.#resetState();
//     return undefined;
//   }
//
//   #resetState(): void {
//     this.#ready = false;
//     this.#frames = [];
//     this.#pending = "";
//     this.#decoder = new StringDecoder("utf8");
//     this.#protocolFailure = undefined;
//   }
// }
//
// const message = (cause: unknown): string =>
//   cause instanceof Error ? cause.message : String(cause);
export const _l = 205;
