export const __stub = 1;
//   readonly runId: string;
//   readonly temporaryRoot: string;
//   readonly before: Awaited<ReturnType<typeof snapshotRoots>>;
//   readonly frames: readonly TerminalFrame[];
//   readonly samples: readonly ProcessSample[];
//   readonly interactions: readonly InteractionEvent[];
//   readonly exit: Extract<
//     Awaited<ReturnType<typeof awaitTerminalExit>>,
//     { readonly unobserved?: false }
//   >;
//   readonly signal?: AbortSignal;
//   readonly captureSnapshot: typeof snapshotRoots;
//   readonly eventJournal: readonly ProcessCaptureEventJournalEntry[];
//   readonly observationBuffer: ProcessCaptureObservationBuffer;
//   readonly recordEvent: RecordProcessCaptureEvent;
//   readonly onLiveProgress?: () => void;
// }): Promise<PendingProcessCapture> => {
//   const unavailableReason = (stage: string, cause: unknown): string =>
//     `${stage} failed: ${cause instanceof Error ? cause.message : "unknown failure"}`;
//   const { runtime, scenario } = options;
//   const { reason } = options.exit;
//   if (reason === "cancelled") throw processCaptureCancelled();
//   let settlement: Awaited<ReturnType<typeof observeSettlement>>;
//   try {
//     settlement = await observeSettlement(
//       options.runId,
//       selectCapturedProcessGroupIds(runtime.terminal.pid, options.samples),
//       scenario.settle_ms,
//       options.recordEvent,
//       options.hostPlatform,
//       options.signal,
//       options.onLiveProgress,
//     );
//   } catch (cause: unknown) {
//     options.observationBuffer.settlement = {
//       state: "unavailable",
//       reason: unavailableReason("Process settlement observation", cause),
//     };
//     throw cause;
//   }
//   options.observationBuffer.settlement = {
//     state: "available",
//     value: settlement,
//   };
//   const sampling = await runtime.stopSampler();
//   const samplingPartial = sampling.partial;
//   await settleProcessCaptureJournal(options.eventJournal);
//   assertNotCancelled(options.signal);
//   let after: Awaited<ReturnType<typeof snapshotRoots>>;
//   try {
//     after = await options.captureSnapshot(
//       scenario,
//       options.signal,
//       options.before,
//     );
//   } catch (cause: unknown) {
//     options.observationBuffer.filesystem_snapshots = {
//       ...options.observationBuffer.filesystem_snapshots,
//       after: {
//         state: "unavailable",
//         reason: unavailableReason("Final filesystem snapshot", cause),
//       },
//     };
//     throw cause;
//   }
//   options.observationBuffer.filesystem_snapshots = {
//     ...options.observationBuffer.filesystem_snapshots,
//     after: {
//       state: "available",
//       value: after,
//     },
//   };
//   options.recordEvent("filesystem_checkpoints", 1);
//   let renderedFrames: Awaited<ReturnType<TerminalRenderer["frames"]>>;
//   try {
//     renderedFrames = await runtime.renderer.frames();
//   } catch (cause: unknown) {
//     options.observationBuffer.rendered_frames = {
//       state: "unavailable",
//       reason: unavailableReason("Rendered terminal frame collection", cause),
//     };
//     throw cause;
//   }
//   options.observationBuffer.rendered_frames = {
//     state: "available",
//     value: renderedFrames,
//   };
//   const checkpoints: UnverifiedProcessCapture["filesystem_checkpoints"] = [
//     {
//       name: "before",
//       at_ms: 0,
//       files: options.before.files,
//       effects: [],
//       truncated: options.before.truncated,
//     },
//     {
//       name: "after_settlement",
//       at_ms: Math.max(0, monotonicProcessCaptureClock() - runtime.started),
//       files: after.files,
//       effects: classifyFilesystemEffects(options.before, after),
//       truncated: after.truncated,
//     },
//   ];
//   let manifest: Awaited<ReturnType<typeof createRunManifest>>;
//   try {
//     manifest = await createRunManifest(
//       scenario,
//       runtime.startedAt,
//       new Date(),
//       runtime.executableIdentity,
//       { platform: options.hostPlatform, architecture: process.arch },
//     );
//   } catch (cause: unknown) {
//     options.observationBuffer.manifest = {
//       state: "unavailable",
//       reason: unavailableReason("Capture manifest creation", cause),
//     };
//     throw cause;
//   }
//   options.observationBuffer.manifest = { state: "available", value: manifest };
//   return buildCaptureResult({
//     frames: options.frames,
//     exit: { ...options.exit, reason },
//     samples: options.samples,
//     before: options.before,
//     after,
//     truncationDetails: {
//       ...runtime.terminalRetention(),
//       rendered_terminal: runtime.renderer.retention(),
//       filesystem_before: options.before.coverage,
//       filesystem_after: after.coverage,
//       process: sampling.coverage,
//     },
//     scenario,
//     rootPid: runtime.terminal.pid,
//     samplingPartial,
//     renderedFrames,
//     interactions: options.interactions,
//     checkpoints,
//     settlement,
//     manifest,
//     eventJournal: options.eventJournal,
//   });
// };
//
// const captureProgressDisposition = (
//   exitReason: string | undefined,
//   executionFailure: unknown,
// ): ProcessCaptureProgressDisposition => {
//   if (
//     exitReason === "exited" ||
//     exitReason === "timeout" ||
//     exitReason === "idle_timeout" ||
//     exitReason === "cancelled"
//   )
//     return exitReason;
//   if (
//     executionFailure instanceof ProcessCaptureError &&
//     executionFailure.reason === "cancelled"
//   )
//     return "cancelled";
//   return "failed";
// };
//
// /** Execute one caller-selected scenario and return bounded observations. */
// const runProcessScenario = async (
//   scenario: ProcessScenario,
//   signal?: AbortSignal,
//   hostEnvironment: Readonly<Record<string, string | undefined>> = process.env,
//   hostPlatform: NodeJS.Platform = process.platform,
//   captureSnapshot: typeof snapshotRoots = snapshotRoots,
//   cleanupHost?: ProcessCaptureCleanupHost,
//   progress?: ProcessCaptureProgress,
//   resourceScope?: ProcessCaptureResourceScope,
//   finalizationHost?: FinalizationHost,
// ): Promise<ProcessCapture> => {
//   const progressTracker = createProcessCaptureProgressTracker(progress);
//   const frames: TerminalFrame[] = [];
//   const samples: ProcessSample[] = [];
//   const interactions: InteractionEvent[] = [];
//   const progressCounts = (): ProcessCaptureProgressCounts => ({
//     frames: frames.length,
//     samples: samples.length,
//     interactions: interactions.length,
//   });
//   const reportRunning = () => {
//     void progressTracker.report({ phase: "running", counts: progressCounts() });
//   };
//   const reportSettling = () => {
//     void progressTracker.report({
//       phase: "settling",
//       counts: progressCounts(),
//     });
//   };
//   let prepared: Awaited<ReturnType<typeof prepareProcessCapture>>;
//   try {
//     await progressTracker.report({
//       phase: "prepare",
//       counts: progressCounts(),
//     });
//     prepared = await prepareProcessCapture(
//       scenario,
//       signal,
//       captureSnapshot,
//       undefined,
//       resourceScope,
//     );
//   } catch (cause: unknown) {
//     progressTracker.closeLive();
//     await progressTracker.report({
//       phase: "cleanup",
//       counts: progressCounts(),
//       terminal: true,
//       disposition: signal?.aborted === true ? "cancelled" : "failed",
//       ...(cause instanceof ProcessCaptureError &&
//       cause.cleanupReport !== undefined
//         ? { cleanup: cause.cleanupReport }
//         : {}),
//     });
//     throw cause;
//   }
//   const { temporaryRoot, runId, ownershipBaseline, before } = prepared;
//   const journal = createProcessCaptureJournal();
//   const { entries: eventJournal, recordEvent } = journal;
//   recordEvent("filesystem_checkpoints", 0);
//   const observations = createProcessCaptureObservationBuffer({
//     frames,
//     interactions,
//     samples,
//     eventJournal,
export const _l = 230;
