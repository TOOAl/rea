export const __stub = 1;
//     }
//   }
// }
//
// const cleanupFailureMessage = (cause: unknown, fallback: string): string =>
//   cause instanceof Error ? cause.message || cause.name || fallback : fallback;
//
// /** Release one capture's resources, retaining the exact owner for scoped retry. */
// export const releaseProcessResources = async (
//   options: ProcessCaptureResourceCleanupOptions,
// ): Promise<ProcessCaptureCleanupReport> =>
//   new ProcessCaptureResourceOwner(options).close();
//
// /** Run-local owner collection for resources whose first cleanup did not finish. */
// export class ProcessCaptureResourceScope {
//   readonly #pending = new Set<ProcessCaptureResourceOwner>();
//   readonly #active = new Set<Promise<unknown>>();
//   #draining: Promise<void> | undefined;
//   #closed = false;
//
//   /** Admit one capture before it starts acquiring resources. */
//   async run<T>(operation: () => Promise<T>): Promise<T> {
//     while (true) {
//       while (this.#draining !== undefined) await this.#draining;
//       if (this.#closed)
//         throw new ProcessCaptureError(
//           "process capture lifecycle is closing; start a new server session before capturing again",
//         );
//       if (this.#pending.size === 0) break;
//       await this.retryCleanup();
//     }
//     const running = Promise.resolve().then(operation);
//     this.#active.add(running);
//     try {
//       return await running;
//     } finally {
//       this.#active.delete(running);
//     }
//   }
//
//   async release(
//     options: ProcessCaptureResourceCleanupOptions,
//   ): Promise<ProcessCaptureCleanupReport> {
//     const owner = new ProcessCaptureResourceOwner(options);
//     const report = await owner.close();
//     if (cleanupReportFailure(report) !== undefined) {
//       this.#pending.add(owner);
//     }
//     return report;
//   }
//
//   /** Drain active captures, then retry their retained resources without closing admission. */
//   retryCleanup(): Promise<void> {
//     if (this.#draining !== undefined) return this.#draining;
//     this.#draining = this.#drainAndRetry().finally(() => {
//       this.#draining = undefined;
//     });
//     return this.#draining;
//   }
//
//   /** Stop admitting new captures, drain active runs, and retry all retained owners. */
//   close(): Promise<void> {
//     this.#closed = true;
//     return this.retryCleanup();
//   }
//
//   async #drainAndRetry(): Promise<void> {
//     while (this.#active.size > 0) await Promise.allSettled(this.#active);
//     const failures: string[] = [];
//     for (const owner of this.#pending) {
//       try {
//         const report = await owner.close();
//         if (cleanupReportFailure(report) === undefined)
//           this.#pending.delete(owner);
//         else
//           failures.push(cleanupReportFailure(report) ?? "cleanup incomplete");
//       } catch (cause: unknown) {
//         failures.push(
//           cause instanceof Error ? cause.message || cause.name : String(cause),
//         );
//       }
//     }
//     if (failures.length > 0)
//       throw new AggregateError(
//         failures,
//         `Process capture cleanup remains incomplete: ${failures.join("; ")}`,
//       );
//   }
// }
//
// export const cleanupReportFailure = (
//   report: ProcessCaptureCleanupReport,
// ): string | undefined => {
//   const failures = Object.entries(report).filter(
//     ([, outcome]) =>
//       outcome.state === "failed" || outcome.state === "unverified",
//   );
//   return failures.length === 0
//     ? undefined
//     : failures
//         .map(
//           ([resource, outcome]) =>
//             `${resource}: ${outcome.reason ?? outcome.state}`,
//         )
//         .join("; ");
// };
//
// export const captureTerminalFrames = (options: {
//   readonly terminal: IPty;
//   readonly scenario: ProcessScenario;
//   readonly frames: TerminalFrame[];
//   readonly started: number;
//   readonly onOutput: () => void;
//   readonly renderer: TerminalRenderer;
//   readonly normalizeText: (
//     value: string,
//     maxBytes: number,
//   ) => BoundedProcessTextNormalization;
//   readonly recordEvent: RecordProcessCaptureEvent;
// }): (() => TerminalCaptureRetention) => {
//   let rawBytes = 0;
//   let normalizedBytes = 0;
//   let observedBytes = 0;
//   let observedFrames = 0;
//   let normalizedOmittedFrames = 0;
//   options.terminal.onData((data) => {
//     options.onOutput();
//     const bytes = Buffer.byteLength(data);
//     observedBytes += bytes;
//     observedFrames += 1;
//     const budget = options.scenario.limits.output_bytes;
//     if (bytes > budget - rawBytes) {
//       return;
//     }
//     const normalized = options.normalizeText(data, budget - normalizedBytes);
//     if (normalized.state === "over_budget") {
//       normalizedOmittedFrames += 1;
//       return;
//     }
//     rawBytes += bytes;
//     normalizedBytes += normalized.utf8Bytes;
//     const atMs = normalizeProcessElapsedTime(
//       monotonicProcessCaptureClock() - options.started,
//       options.scenario.normalization.time_bucket_ms,
//     );
//     const sequence = options.frames.length;
//     options.frames.push({
//       sequence,
//       at_ms: atMs,
//       data: normalized.value,
//       ...(normalized.value === data ? {} : { raw_data: data }),
//     });
//     options.renderer.write(data, atMs);
//     options.recordEvent("frames", sequence);
//   });
//   return () => ({
//     raw_terminal: {
//       budget_bytes: options.scenario.limits.output_bytes,
//       observed_bytes: observedBytes,
//       retained_bytes: rawBytes,
//       observed_frames: observedFrames,
//       retained_frames: options.frames.length,
//     },
//     normalized_terminal: {
//       budget_bytes: options.scenario.limits.output_bytes,
//       retained_bytes: normalizedBytes,
//       omitted_frames: normalizedOmittedFrames,
//     },
//   });
// };
//
// export interface TerminalCaptureRetention {
//   readonly raw_terminal: TerminalRetention;
//   readonly normalized_terminal: NormalizedTerminalRetention;
// }
//
// export const resolveProcessResult = (
//   capture: PendingProcessCapture | ProcessCapture | undefined,
//   executionFailure: unknown,
//   cleanup: ProcessCaptureCleanupReport,
//   observations?: IncompleteProcessCaptureObservations,
//   partialContext?: {
//     readonly scenario: ProcessScenario;
//     readonly rootPid?: number;
//   },
// ): ProcessCapture => {
//   const cleanupFailure = cleanupReportFailure(cleanup);
//   const executionFailureReason =
//     describeProcessCaptureExecutionFailure(executionFailure);
//   let partialObservation: PartialProcessCaptureObservation | undefined;
//   if (
//     (cleanupFailure !== undefined || executionFailure !== undefined) &&
//     (capture !== undefined || observations !== undefined)
//   ) {
//     const normalizedObservations =
//       observations === undefined || partialContext === undefined
//         ? observations
//         : normalizePartialProcessObservations(observations, partialContext);
//     if (capture === undefined) {
//       if (normalizedObservations !== undefined) {
//         const partialResult = partialProcessCaptureObservationSchema.safeParse({
//           observations: normalizedObservations,
//           cleanup,
//           execution_failure: executionFailureReason ?? null,
//         });
//         if (partialResult.success) partialObservation = partialResult.data;
//       }
//     } else {
//       const captureData =
//         "cleanup" in capture
//           ? (() => {
//               const { cleanup: _cleanup, ...data } = capture;
//               void _cleanup;
//               return data;
//             })()
//           : capture;
//       const settlement =
//         cleanupFailure !== undefined
//           ? { ...capture.settlement, cleanup_outcome: "failed" as const }
//           : capture.settlement.state === "quiesced"
//             ? {
//                 ...capture.settlement,
//                 cleanup_outcome: "not_required" as const,
//               }
//             : { ...capture.settlement, cleanup_outcome: "cleaned" as const };
//       const partialResult = partialProcessCaptureObservationSchema.safeParse({
//         capture: { ...captureData, settlement },
//         cleanup,
//         execution_failure: executionFailureReason ?? null,
//       });
//       if (partialResult.success) partialObservation = partialResult.data;
//     }
//   }
//   if (cleanupFailure !== undefined) {
//     const cleanupResources = Object.entries(cleanup)
//       .filter(
//         ([, outcome]) =>
//           outcome.state === "failed" || outcome.state === "unverified",
//       )
//       .map(([resource]) => resource);
//     throw new ProcessCaptureError(cleanupFailure, {
//       cause: executionFailure,
//       reason: "cleanup_incomplete",
//       cleanupResources,
//       ...(executionFailureReason === undefined
//         ? {}
//         : { executionFailure: executionFailureReason }),
//       ...(partialObservation === undefined ? {} : { partialObservation }),
//       cleanupReport: cleanup,
//     });
//   }
//   if (executionFailure instanceof ProcessCaptureError) {
//     const retainedExecutionFailure =
//       executionFailure.executionFailure ?? executionFailureReason;
//     const retainedPartialObservation =
//       executionFailure.partialObservation ?? partialObservation;
//     throw new ProcessCaptureError(executionFailure.message, {
//       cause: executionFailure,
//       ...(executionFailure.userMessage === undefined
//         ? {}
//         : { userMessage: executionFailure.userMessage }),
//       ...(executionFailure.userCategory === undefined
//         ? {}
//         : { userCategory: executionFailure.userCategory }),
//       reason: executionFailure.reason,
//       cleanupResources: executionFailure.cleanupResources,
//       ...(retainedExecutionFailure === undefined
//         ? {}
//         : { executionFailure: retainedExecutionFailure }),
//       ...(retainedPartialObservation === undefined
//         ? {}
//         : { partialObservation: retainedPartialObservation }),
//       cleanupReport: executionFailure.cleanupReport ?? cleanup,
//     });
//   }
//   if (executionFailure !== undefined) {
//     throw new ProcessCaptureError("process capture failed", {
//       cause: executionFailure,
//       reason: "capture_failed",
//       ...(executionFailureReason === undefined
//         ? {}
//         : { executionFailure: executionFailureReason }),
//       ...(partialObservation === undefined ? {} : { partialObservation }),
//       cleanupReport: cleanup,
//     });
//   }
//   if (capture === undefined)
//     throw new ProcessCaptureError("process capture produced no result");
//   const unverifiedProcesses = cleanup.owned_process_group.unverified_processes;
//   if ("cleanup" in capture && unverifiedProcesses === undefined) return capture;
//
//   const settlement: UnverifiedProcessCapture["settlement"] =
//     capture.settlement.state === "quiesced"
//       ? { ...capture.settlement, cleanup_outcome: "not_required" }
//       : { ...capture.settlement, cleanup_outcome: "cleaned" };
//   try {
//     return parseProcessCapture({
//       ...capture,
//       settlement,
//       residual_unknowns: [
//         ...capture.residual_unknowns,
//         ...(unverifiedProcesses ?? []).map(({ pid, reason }) => ({
//           scope: "process" as const,
//           reason: `Ownership of unrelated process ${String(pid)} could not be verified; it was left untouched: ${reason}`,
//         })),
//       ],
//       cleanup: {
//         ...("cleanup" in capture ? capture.cleanup : {}),
//         owned_process_group: "verified",
//         temporary_root: "removed",
//         ...(unverifiedProcesses === undefined
//           ? {}
//           : { unverified_processes: unverifiedProcesses }),
//       },
//     });
//   } catch (cause: unknown) {
//     throw new ProcessCaptureError(
//       `process capture validation failed${cause instanceof Error ? `: ${cause.message}` : ""}`,
//       { cause },
//     );
//   }
// };
//
// export const prepareProcessCapture = async (
//   scenario: ProcessScenario,
//   signal: AbortSignal | undefined,
//   captureSnapshot: typeof snapshotRoots = snapshotRoots,
//   host: ProcessPreparationHost = systemProcessPreparationHost,
//   resourceScope?: ProcessCaptureResourceScope,
// ): Promise<{
//   readonly temporaryRoot: string;
//   readonly runId: string;
//   readonly ownershipBaseline: ProcessOwnershipBaseline;
//   readonly before: ProcessFilesystemSnapshot;
// }> => {
//   assertNotCancelled(signal);
//   await host.prepareOwnershipInspector?.(signal);
//   assertNotCancelled(signal);
//   const before = await captureSnapshot(scenario, signal);
//   const runId = randomUUID();
//   const temporaryRoot = await host.createTemporaryRoot();
//   try {
//     assertNotCancelled(signal);
//     const ownershipBaseline =
//       (await host.captureOwnershipBaseline?.(signal)) ?? [];
//     assertNotCancelled(signal);
//     return { temporaryRoot, runId, ownershipBaseline, before };
//   } catch (cause: unknown) {
//     const cleanupOptions: ProcessCaptureResourceCleanupOptions = {
//       timers: new Set(),
//       terminal: undefined,
//       renderer: undefined,
//       runId,
//       temporaryRoot,
//       host: { ...processCaptureCleanupHost, removeTemporaryRoot: host.cleanup },
//     };
//     const cleanup =
//       resourceScope === undefined
//         ? await releaseProcessResources(cleanupOptions)
//         : await resourceScope.release(cleanupOptions);
//     resolveProcessResult(
//       undefined,
//       normalizeCaptureFailure(cause, signal),
//       cleanup,
//       createProcessCaptureObservationBuffer({
//         frames: [],
//         interactions: [],
//         samples: [],
//         eventJournal: [],
//         before,
//         finalizationEnabled: scenario.finalization_ms > 0,
//       }),
//       { scenario },
//     );
//     throw cause;
//   }
// };
//
// /** Filesystem seam for allocating and cleaning a capture's temporary root. */
// export interface ProcessPreparationHost {
//   prepareOwnershipInspector?(signal?: AbortSignal): Promise<void>;
//   /** Capture the process baseline with the caller's startup cancellation. */
//   captureOwnershipBaseline?(
//     signal?: AbortSignal,
//   ): Promise<ProcessOwnershipBaseline>;
//   createTemporaryRoot(): Promise<string>;
//   cleanup(path: string): Promise<void>;
// }
//
// const systemProcessPreparationHost: ProcessPreparationHost = {
//   prepareOwnershipInspector: prepareProcessOwnershipInspection,
//   captureOwnershipBaseline: (signal) =>
//     systemProcessOwnershipHost.captureBaseline?.(signal) ?? Promise.resolve([]),
//   createTemporaryRoot: () => mkdtemp(join(tmpdir(), "rea-process-")),
//   cleanup: (path) => rm(path, { recursive: true, force: true }),
// };
export const _l = 396;
