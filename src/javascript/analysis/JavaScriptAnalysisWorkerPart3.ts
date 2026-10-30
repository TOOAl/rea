export const __stub = 1;
//           javascript,
//           module,
//           projection,
//           error: this.#cleanupError(message(cause)),
//         });
//       }
//     }
//     if (this.#applicationProjectionFailure !== undefined)
//       return result.ok
//         ? ok({
//             ...result.value,
//             applicationProjectionFailure: this.#applicationProjectionFailure,
//           })
//         : err({
//             ...result.error,
//             applicationProjectionFailure: this.#applicationProjectionFailure,
//           });
//     return result;
//   }
//
//   /** Verify process cleanup, then release the private runtime; failed close is retryable. */
//   async close(): Promise<void> {
//     const failure = await this.#stop();
//     if (failure !== undefined) throw failure;
//     if (this.#root !== undefined) {
//       try {
//         await this.#root.close();
//         this.#root = undefined;
//       } catch (cause: unknown) {
//         pendingCleanup.add(this);
//         throw this.#cleanupError(message(cause));
//       }
//     }
//     pendingCleanup.delete(this);
//   }
//
//   async #start(deadline: ProviderStartupDeadline): Promise<void> {
//     if (this.#supervisor !== undefined && this.#ready) return;
//     this.#phase = "startup";
//     this.#heapLimitBytes = 0;
//     this.#root ??= await PrivateRuntimeRoot.create({
//       prefix: "rea-javascript-analysis-",
//     });
//     const environment: NodeJS.ProcessEnv = {
//       ...process.env,
//       UV_THREADPOOL_SIZE: "1",
//     };
//     delete environment.NODE_OPTIONS;
//     const spawned = await this.launcher({
//       command: process.execPath,
//       arguments: [
//         `--max-old-space-size=${String(this.limits.heapMb)}`,
//         "--max-semi-space-size=8",
//         "--v8-pool-size=1",
//         "--expose-gc",
//         "--stack_size=2048",
//         fileURLToPath(import.meta.resolve("#javascript-analysis-worker")),
//       ],
//       runId: `${this.#runId}-${randomUUID()}`,
//       cwd: this.#root.path,
//       hostEnvironment: environment,
//       stdin: "pipe",
//       ...(this.#processMemoryLimitBytes === null
//         ? {}
//         : { memoryLimitBytes: this.#processMemoryLimitBytes }),
//       signal: deadline.signal,
//     });
//     this.#supervisor = new ProviderProcessSupervisor(
//       {
//         ...spawned,
//         ownsProcessLifetime: true,
//         cleanup:
//           spawned.cleanup ??
//           (() => cleanupOwnedProcessGroup(spawned.ownership)),
//       },
//       { captureStdout: false, maxDiagnosticBytes: 256 * 1024 },
//     );
//     spawned.process.stdout?.on("data", this.#onStdout);
//     const ready = await this.#next(deadline, "worker startup");
//     if (ready.kind !== "ready")
//       throw new AnalysisOutputError(
//         OPERATION,
//         "JavaScript worker emitted facts before its startup handshake",
//       );
//     if ((ready.heap_limit_bytes === null) === WORKER_HEAP_FLAGS_ENFORCED)
//       throw new AnalysisOutputError(
//         OPERATION,
//         "JavaScript worker heap limit does not match the runtime that launched it",
//       );
//     this.#heapLimitBytes = ready.heap_limit_bytes ?? 0;
//     this.#ready = true;
//   }
//
//   async #next(
//     deadline: ProviderStartupDeadline,
//     path: string,
//   ): Promise<JavaScriptWorkerMessage> {
//     for (;;) {
//       if (deadline.interruption === "cancelled")
//         throw new AnalysisCancelledError(OPERATION);
//       if (deadline.interruption === "timeout")
//         throw new AnalysisTimeoutError(OPERATION, this.limits.timeoutMs);
//       if (this.#protocolFailure !== undefined)
//         throw new AnalysisOutputError(OPERATION, this.#protocolFailure);
//       const frame = this.#frames.shift();
//       if (frame !== undefined) return frame;
//       const snapshot = this.#supervisor?.snapshot();
//       if (
//         snapshot !== undefined &&
//         (snapshot.exitCode !== undefined || snapshot.signal !== undefined)
//       ) {
//         // Exit is not complete output: let any final control frame drain first.
//         if (!(await this.#supervisor?.waitForOutputClose(10))) continue;
//         if (this.#frames.length !== 0) continue;
//         const drained = this.#supervisor?.snapshot() ?? snapshot;
//         throw this.#memoryLimitReached()
//           ? this.#memoryFailure(path)
//           : /heap out of memory|heap limit|allocation failed/iu.test(
//                 drained.stderr.text,
//               )
//             ? new AnalysisResourceConstraintError(
//                 OPERATION,
//                 "memory",
//                 `Owned JavaScript worker exhausted its heap while analyzing ${path} during ${this.#phase}`,
//                 this.#limits(),
//                 { capturedOutput: this.#captured() },
//               )
//             : new ProviderAdapterError(PROVIDER, OPERATION, {
//                 capturedOutput: this.#captured(),
//                 diagnostics: {
//                   source_path: path,
//                   phase: this.#phase,
//                   exit_code: drained.exitCode ?? null,
//                   signal: drained.signal ?? null,
//                 },
//               });
//       }
//       await waitForAbortableDelay(10, deadline.signal);
//     }
//   }
//
//   async #readCheckpoint(
//     id: string,
//     sourcePath: string,
//     expected?: { readonly bytes: number; readonly sha256: string },
//   ): Promise<JavaScriptStaticAnalysis> {
//     if (this.#root === undefined)
//       throw new TypeError("JavaScript checkpoint has no owned runtime");
//     const path = join(this.#root.path, `${id}.static.json`);
//     const bytes = (await stat(path)).size;
//     if (
//       bytes > DEFAULTS.checkpointBytes ||
//       (expected !== undefined && expected.bytes !== bytes)
//     )
//       throw new AnalysisOutputError(
//         OPERATION,
//         "JavaScript static checkpoint byte count exceeds or differs from its declared budget",
//       );
//     if (
//       bytes * 16 + 4 * MIB >
//       getHeapStatistics().heap_size_limit -
//         process.memoryUsage().heapUsed -
//         64 * MIB
//     )
//       throw new AnalysisResourceConstraintError(
//         OPERATION,
//         "memory",
//         "The parent's remaining heap cannot safely decode the completed JavaScript static checkpoint",
//         { ...this.#limits(), checkpoint_bytes: bytes },
//       );
//     const text = await readFile(path, "utf8");
//     if (
//       expected !== undefined &&
//       createHash("sha256").update(text).digest("hex") !== expected.sha256
//     )
//       throw new AnalysisOutputError(
//         OPERATION,
//         "JavaScript static checkpoint digest does not match",
//       );
//     const value: unknown = JSON.parse(text);
//     const facts = javaScriptWorkerStaticAnalysisSchema.parse(value);
//     const remaining = this.#remainingTotalResultBudget();
//     const retainedBytes = bytes * STATIC_CHECKPOINT_RETENTION_EXPANSION;
//     this.#parentCapacityExhausted = retainedBytes > remaining;
//     this.#estimatedRetainedBytes += retainedBytes;
//     const expandedBytes = estimateJavaScriptStaticApplicationProjection(
//       facts,
//       bytes,
//       sourcePath,
//     );
//     const availableResultBudget = this.#remainingResultBudget();
//     if (expandedBytes <= availableResultBudget)
//       this.#estimatedRetainedBytes += expandedBytes;
//     else
//       this.#applicationProjectionFailure = new AnalysisResourceConstraintError(
//         OPERATION,
//         "memory",
//         `Expanded application relationships for ${sourcePath} exceed the parent's result budget; complete static facts were retained on the file node`,
//         {
//           parent_result_budget_bytes: this.#resultBudgetBytes,
//           parent_available_result_budget_bytes: availableResultBudget,
//           application_projection_required_bytes: expandedBytes,
//         },
//         {
//           remediationAction:
//             "Read the complete static facts on the file node or analyze fewer source files. Expanded application relationships exceed the parent result budget; increasing the worker heap alone does not increase it.",
//         },
export const _l = 207;
