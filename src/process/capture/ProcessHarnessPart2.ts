export const __stub = 1;
//   ) => BoundedProcessTextNormalization,
//   recordEvent: RecordProcessCaptureEvent,
// ): TerminalRenderer =>
//   new TerminalRenderer({
//     columns: scenario.terminal.columns,
//     rows: scenario.terminal.rows,
//     scrollback: scenario.terminal.scrollback,
//     maxBytes: scenario.limits.output_bytes,
//     normalize: normalizeText,
//     recordEvent,
//   });
//
// interface StartCaptureRuntimeOptions {
//   readonly scenario: ProcessScenario;
//   readonly hostEnvironment: Readonly<Record<string, string | undefined>>;
//   readonly temporaryRoot: string;
//   readonly runId: string;
//   readonly ownershipBaseline: ProcessOwnershipBaseline;
//   readonly cleanupHost?: ProcessCaptureCleanupHost;
//   readonly resourceScope?: ProcessCaptureResourceScope;
//   readonly observationBuffer: ProcessCaptureObservationBuffer;
//   readonly onSpawn: (pid: number) => void;
//   readonly frames: TerminalFrame[];
//   readonly samples: ProcessSample[];
//   readonly interactions: InteractionEvent[];
//   readonly timers: Set<ProcessTimer>;
//   readonly dispatchedEventIndexes: Set<number>;
//   readonly recordEvent: RecordProcessCaptureEvent;
//   readonly signal?: AbortSignal;
//   readonly finalizationHost?: FinalizationHost;
// }
//
// const startCaptureRuntime = async (
//   options: StartCaptureRuntimeOptions,
// ): Promise<StartedCaptureRuntime> => {
//   const { scenario } = options;
//   let renderer: TerminalRenderer | undefined;
//   let terminal: IPty | undefined;
//   try {
//     const { spawn } = await import("@lydell/node-pty");
//     const selectedExecutable = await observeSelectedExecutable(
//       scenario.executable,
//       options.signal,
//     );
//     const startedAt = new Date();
//     const started = monotonicProcessCaptureClock();
//     let lastOutput = started;
//     const normalizeText = createBoundedProcessTextNormalizer(
//       scenario,
//       options.temporaryRoot,
//       () => terminal?.pid ?? -1,
//     );
//     renderer = createTerminalRenderer(
//       scenario,
//       normalizeText,
//       options.recordEvent,
//     );
//     terminal = spawn(scenario.executable, [...scenario.arguments], {
//       cwd: scenario.working_directory,
//       env: makeProcessCaptureEnvironment(options),
//       cols: scenario.terminal.columns,
//       rows: scenario.terminal.rows,
//       name: "xterm-256color",
//     });
//     options.onSpawn(terminal.pid);
//     options.observationBuffer.target_pid = {
//       state: "available",
//       value: scenario.normalization.pids ? 1 : terminal.pid,
//     };
//     const executableIdentity = observeLaunchedExecutable(
//       scenario.executable,
//       selectedExecutable,
//     );
//     const terminalRetention = captureTerminalFrames({
//       ...options,
//       terminal,
//       started,
//       onOutput: () => (lastOutput = monotonicProcessCaptureClock()),
//       renderer,
//       normalizeText,
//     });
//     scheduleScenarioInteractions({
//       ...options,
//       getTerminal: () => terminal,
//       renderer,
//       started,
//     });
//     const stopSampler = startProcessSampler({
//       rootPid: terminal.pid,
//       runId: options.runId,
//       started,
//       limit: scenario.limits.processes,
//       samples: options.samples,
//       recordEvent: options.recordEvent,
//     });
//     return {
//       renderer,
//       terminal,
//       started,
//       startedAt,
//       executableIdentity,
//       lastOutput: () => lastOutput,
//       terminalRetention,
//       stopSampler,
//       signalRoot: retainRootSignaller(
//         terminal.pid,
//         scenario.finalization_ms,
//         options.runId,
//         options.finalizationHost,
//       ),
//     };
//   } catch (cause: unknown) {
//     return cleanupFailedStartup({
//       cause,
//       timers: options.timers,
//       terminal,
//       renderer,
//       runId: options.runId,
//       captureBaseline: options.ownershipBaseline,
//       scenario,
//       ...(options.cleanupHost === undefined
//         ? {}
//         : { cleanupHost: options.cleanupHost }),
//       observations: options.observationBuffer,
//       temporaryRoot: options.temporaryRoot,
//       ...(options.resourceScope === undefined
//         ? {}
//         : { resourceScope: options.resourceScope }),
//     });
//   }
// };
//
// const finishProcessRun = async (options: {
//   readonly runtime: StartedCaptureRuntime | undefined;
//   readonly timers: Set<ProcessTimer>;
//   readonly runId: string;
//   readonly captureBaseline: ProcessOwnershipBaseline;
//   readonly cleanupHost?: ProcessCaptureCleanupHost;
//   readonly temporaryRoot: string;
//   readonly scenario: ProcessScenario;
//   readonly samples: readonly ProcessSample[];
//   readonly stopSampler: () => Promise<{ readonly partial: boolean }>;
//   readonly capture: PendingProcessCapture | undefined;
//   readonly executionFailure: unknown;
//   readonly observations?: ProcessCaptureObservationBuffer;
//   readonly rootPid?: number;
//   readonly progress: ProcessCaptureProgressTracker;
//   readonly progressCounts: () => ProcessCaptureProgressCounts;
//   readonly resourceScope?: ProcessCaptureResourceScope;
// }): Promise<ProcessCapture> => {
//   options.progress.closeLive();
//   await options.stopSampler();
//   const sampledProcessGroupIds =
//     options.runtime === undefined
//       ? undefined
//       : selectCapturedProcessGroupIds(
//           options.runtime.terminal.pid,
//           options.samples,
//         ).filter((groupId) => groupId !== options.runtime?.terminal.pid);
//   const cleanupOptions: ProcessCaptureResourceCleanupOptions = {
//     timers: options.timers,
//     terminal: options.runtime?.terminal,
//     renderer: options.runtime?.renderer,
//     runId: options.runId,
//     captureBaseline: options.captureBaseline,
//     ...(sampledProcessGroupIds === undefined ? {} : { sampledProcessGroupIds }),
//     temporaryRoot: options.temporaryRoot,
//     ...(options.cleanupHost === undefined ? {} : { host: options.cleanupHost }),
//   };
//   const cleanup =
//     options.resourceScope === undefined
//       ? await releaseProcessResources(cleanupOptions)
//       : await options.resourceScope.release(cleanupOptions);
//   const observedExit =
//     options.observations?.exit.state === "available"
//       ? options.observations.exit.value.reason
//       : options.capture?.exit.reason;
//   await options.progress.report({
//     phase: "cleanup",
//     counts: options.progressCounts(),
//     terminal: true,
//     disposition: captureProgressDisposition(
//       observedExit,
//       options.executionFailure,
//     ),
//     cleanup,
//   });
//   const cleanupFailure = cleanupReportFailure(cleanup);
//   let { capture, executionFailure } = options;
//   let verifiedCapture: ProcessCapture | undefined;
//   if (capture !== undefined && cleanupFailure === undefined) {
//     const settlement: UnverifiedProcessCapture["settlement"] =
//       capture.settlement.state === "quiesced"
//         ? { ...capture.settlement, cleanup_outcome: "not_required" }
//         : { ...capture.settlement, cleanup_outcome: "cleaned" };
//     const completedCapture: UnverifiedProcessCapture = {
//       ...capture,
//       settlement,
//       cleanup: {
//         owned_process_group: "verified",
//         temporary_root: "removed",
//       },
//     };
//     try {
//       verifiedCapture = parseProcessCapture(completedCapture);
//     } catch (cause: unknown) {
//       executionFailure = new ProcessCaptureError(
//         `process capture validation failed${cause instanceof Error ? `: ${cause.message}` : ""}`,
//         { cause },
//       );
//     }
//   }
//   const rootPid = options.runtime?.terminal.pid ?? options.rootPid;
//   const partialContext =
//     rootPid === undefined
//       ? { scenario: options.scenario }
//       : { scenario: options.scenario, rootPid };
//   return resolveProcessResult(
//     cleanupFailure === undefined ? verifiedCapture : capture,
//     executionFailure,
//     cleanup,
//     options.observations,
//     partialContext,
//   );
// };
//
// const completeCapture = async (options: {
//   readonly scenario: ProcessScenario;
//   readonly hostPlatform: NodeJS.Platform;
//   readonly runtime: StartedCaptureRuntime;
export const _l = 230;
