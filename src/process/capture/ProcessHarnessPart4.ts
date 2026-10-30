export const __stub = 1;
//     before,
//     finalizationEnabled: scenario.finalization_ms > 0,
//   });
//   let runtime: StartedCaptureRuntime | undefined;
//   let actualRootPid: number | undefined;
//   const timers = new Set<ProcessTimer>();
//   let capture: PendingProcessCapture | undefined;
//   let executionFailure: unknown;
//   let stopSampler = async () => ({ partial: false });
//   const dispatchedEventIndexes = new Set<number>();
//
//   try {
//     runtime = await startCaptureRuntime({
//       scenario,
//       hostEnvironment,
//       temporaryRoot,
//       runId,
//       ownershipBaseline,
//       ...(cleanupHost === undefined ? {} : { cleanupHost }),
//       ...(resourceScope === undefined ? {} : { resourceScope }),
//       observationBuffer: observations,
//       onSpawn: (pid) => {
//         actualRootPid = pid;
//       },
//       frames,
//       samples,
//       interactions,
//       timers,
//       dispatchedEventIndexes,
//       recordEvent,
//       ...(signal === undefined ? {} : { signal }),
//       ...(finalizationHost === undefined ? {} : { finalizationHost }),
//     });
//     stopSampler = runtime.stopSampler;
//     const exit = await awaitTerminalExit({
//       terminal: runtime.terminal,
//       scenario,
//       started: runtime.started,
//       lastOutput: runtime.lastOutput,
//       signal,
//       signalTarget: runtime.signalRoot,
//       recordFinalization: (finalization) => {
//         observations.finalization = { state: "available", value: finalization };
//       },
//       timers,
//       interactions,
//       dispatchedEventIndexes,
//       recordEvent,
//       ...(progress === undefined ? {} : { onLiveProgress: reportRunning }),
//     });
//     if (exit.unobserved === true) {
//       observations.finalization = {
//         state: "available",
//         value: exit.finalization,
//       };
//       observations.exit = {
//         state: "unavailable",
//         reason: `The captured process exit was not observed because the finalization SIGKILL could not be delivered (initiating reason: ${exit.reason}).`,
//       };
//       if (exit.reason === "cancelled") throw processCaptureCancelled();
//       throw new Error(
//         "The captured process exit was not observed because the finalization SIGKILL could not be delivered.",
//       );
//     }
//     if (exit.finalization !== undefined)
//       observations.finalization = {
//         state: "available",
//         value: exit.finalization,
//       };
//     observations.exit = {
//       state: "available",
//       value: {
//         code:
//           exit.reason === "exited" && exit.exitCode >= 0 ? exit.exitCode : null,
//         signal: exit.signal ?? null,
//         reason: exit.reason,
//         ...(exit.finalization === undefined
//           ? {}
//           : { finalization: exit.finalization }),
//       },
//     };
//     capture = await completeCapture({
//       scenario,
//       hostPlatform,
//       runtime,
//       runId,
//       temporaryRoot,
//       before,
//       frames,
//       samples,
//       interactions,
//       exit,
//       eventJournal,
//       observationBuffer: observations,
//       recordEvent,
//       captureSnapshot,
//       ...(signal === undefined ? {} : { signal }),
//       ...(progress === undefined ? {} : { onLiveProgress: reportSettling }),
//     });
//   } catch (cause: unknown) {
//     executionFailure = normalizeCaptureFailure(cause, signal);
//     if (
//       runtime !== undefined &&
//       observations.rendered_frames.state === "unavailable" &&
//       observations.rendered_frames.reason.startsWith(
//         "Rendered terminal frames were not collected",
//       )
//     ) {
//       try {
//         observations.rendered_frames = {
//           state: "available",
//           value: await runtime.renderer.frames(),
//         };
//       } catch (renderCause: unknown) {
//         const renderFailure =
//           renderCause instanceof Error
//             ? renderCause.message
//             : "unknown failure";
//         observations.rendered_frames = {
//           state: "unavailable",
//           reason: `Rendered terminal frame collection failed: ${renderFailure}`,
//         };
//       }
//     }
//   }
//   return finishProcessRun({
//     runtime,
//     timers,
//     runId,
//     captureBaseline: ownershipBaseline,
//     ...(cleanupHost === undefined ? {} : { cleanupHost }),
//     temporaryRoot,
//     scenario,
//     samples,
//     stopSampler,
//     capture,
//     executionFailure,
//     observations,
//     ...(actualRootPid === undefined ? {} : { rootPid: actualRootPid }),
//     progress: progressTracker,
//     progressCounts,
//     ...(resourceScope === undefined ? {} : { resourceScope }),
//   });
// };
//
// /** Execute one scenario through a typed expected-failure channel. */
// export const captureProcessScenario = async (
//   scenario: ProcessScenario,
//   signal?: AbortSignal,
//   platform: NodeJS.Platform = process.platform,
//   environment: Readonly<Record<string, string | undefined>> = process.env,
//   captureSnapshot?: typeof snapshotRoots,
//   cleanupHost?: ProcessCaptureCleanupHost,
//   progress?: ProcessCaptureProgress,
//   resourceScope?: ProcessCaptureResourceScope,
//   finalizationHost?: FinalizationHost,
// ): Promise<Result<ProcessCapture, ProcessCaptureError | AnalysisError>> => {
//   const ownershipReason = processCaptureOwnershipUnavailableReason(platform);
//   if (ownershipReason !== undefined)
//     return err(
//       new AnalysisCapabilityUnavailableError(
//         "rea-process",
//         "capture_process_scenario",
//         ownershipReason,
//         { userMessage: ownershipReason },
//       ),
//     );
//   const runResourceScope = resourceScope ?? new ProcessCaptureResourceScope();
//   const execute = async (): Promise<
//     Result<ProcessCapture, ProcessCaptureError | AnalysisError>
//   > => {
//     try {
//       assertNotCancelled(signal);
//       const resolvedScenario = await resolveProcessScenarioRuntimePaths(
//         scenario,
//         environment,
//       );
//       const capture = await runProcessScenario(
//         resolvedScenario,
//         signal,
//         environment,
//         platform,
//         captureSnapshot ?? snapshotRoots,
//         cleanupHost,
//         progress,
//         runResourceScope,
//         finalizationHost,
//       );
//       return ok(capture);
//     } catch (cause: unknown) {
//       const failure = normalizeCaptureFailure(cause, signal);
//       const executionFailureReason =
//         describeProcessCaptureExecutionFailure(cause);
//       return err(
//         failure instanceof AnalysisError
//           ? failure
//           : new ProcessCaptureError("process capture failed", {
//               cause,
//               ...(executionFailureReason === undefined
//                 ? {}
//                 : { executionFailure: executionFailureReason }),
//             }),
//       );
//     }
//   };
//   if (resourceScope !== undefined) {
//     try {
//       return await resourceScope.run(execute);
//     } catch (cause: unknown) {
//       const failure = normalizeCaptureFailure(cause, signal);
//       const executionFailure = describeProcessCaptureExecutionFailure(cause);
//       return err(
//         failure instanceof AnalysisError
//           ? failure
//           : new ProcessCaptureError("process capture lifecycle failed", {
//               cause,
//               reason: "cleanup_incomplete",
//               cleanupResources: ["process_capture_lifecycle"],
//               ...(executionFailure === undefined ? {} : { executionFailure }),
//             }),
//       );
//     }
//   }
//   const capture = await runResourceScope.run(execute);
//   await runResourceScope.close().catch(() => undefined);
//   return capture;
// };
export const _l = 227;
