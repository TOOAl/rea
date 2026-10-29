export const __stub = 1;
// import type { IPty } from "@lydell/node-pty";
// import type { ProcessCapture } from "../../domain/process/processCaptureParsing.js";
// import type { ProcessScenario } from "../../domain/process/processScenario.js";
// import { parseProcessCapture } from "../../domain/process/processCaptureParsing.js";
// import { err, ok, type Result } from "../../domain/result.js";
// import { AnalysisCapabilityUnavailableError } from "../../domain/analysisErrorCore.js";
// import { AnalysisError } from "../../domain/analysisErrorBase.js";
// import {
//   describeProcessCaptureExecutionFailure,
//   ProcessCaptureError,
//   normalizeCaptureFailure,
//   processCaptureCancelled,
// } from "./ProcessCaptureError.js";
// import type {
//   InteractionEvent,
//   UnverifiedProcessCapture,
//   ProcessCaptureEventJournalEntry,
//   ProcessSample,
//   RecordProcessCaptureEvent,
//   TerminalFrame,
// } from "../../domain/process/processCapture.js";
// import { startProcessSampler } from "./ProcessSampling.js";
// import { snapshotRoots } from "./FilesystemSnapshot.js";
// import { TerminalRenderer } from "./TerminalRenderer.js";
// import type { ProcessTimer } from "./ProcessTimer.js";
// import {
//   createBoundedProcessTextNormalizer,
//   type BoundedProcessTextNormalization,
// } from "./ProcessNormalization.js";
// import { selectCapturedProcessGroupIds } from "../ProcessOwnershipProcessTree.js";
// import {
//   awaitTerminalExit,
//   buildCaptureResult,
//   cleanupReportFailure,
//   captureTerminalFrames,
//   createProcessCaptureObservationBuffer,
//   createRunManifest,
//   observeLaunchedExecutable,
//   observeSelectedExecutable,
//   observeSettlement,
//   prepareProcessCapture,
//   releaseProcessResources,
//   resolveProcessResult,
//   settleProcessCaptureJournal,
//   type ProcessCaptureCleanupHost,
//   type ProcessCaptureObservationBuffer,
//   type PendingProcessCapture,
//   describeUnverifiedCause,
//   type ProcessCaptureResourceCleanupOptions,
//   ProcessCaptureResourceScope,
//   type TerminalCaptureRetention,
// } from "./ProcessCaptureLifecycle.js";
// import {
//   assertNotCancelled,
//   resolveProcessScenarioRuntimePaths,
// } from "./ProcessScenarioRuntimeValidation.js";
// import {
//   createProcessCaptureJournal,
//   scheduleScenarioInteractions,
// } from "./ProcessCaptureJournal.js";
// import { makeProcessCaptureEnvironment } from "./ProcessCaptureEnvironment.js";
// import { classifyFilesystemEffects } from "./ProcessFilesystemEffects.js";
// import { processCaptureOwnershipUnavailableReason } from "./ProcessCaptureCapability.js";
// import {
//   createProcessCaptureProgressTracker,
//   type ProcessCaptureProgress,
//   type ProcessCaptureProgressCounts,
//   type ProcessCaptureProgressDisposition,
//   type ProcessCaptureProgressTracker,
// } from "./ProcessCaptureProgress.js";
// import type { ProcessOwnershipBaseline } from "../ProcessOwnership.js";
// import {
//   observeProcessStartIdentity,
//   signalProcessWithStartIdentity,
// } from "../ProcessOwnershipObservation.js";
// import { monotonicProcessCaptureClock } from "./ProcessCaptureClock.js";
//
// interface StartedCaptureRuntime {
//   readonly renderer: TerminalRenderer;
//   readonly terminal: IPty;
//   readonly started: number;
//   readonly startedAt: Date;
//   readonly executableIdentity: ReturnType<typeof observeLaunchedExecutable>;
//   readonly lastOutput: () => number;
//   readonly terminalRetention: () => TerminalCaptureRetention;
//   readonly stopSampler: ReturnType<typeof startProcessSampler>;
//   /** Signals the captured root only while its launch-time start identity still matches. */
//   readonly signalRoot: (signal: "SIGTERM" | "SIGKILL") => Promise<{
//     readonly delivery: "signaled" | "gone" | "identity-changed" | "unverified";
//     readonly reason?: string | undefined;
//   }>;
// }
//
// /** Identity observation and signalling used for finalization signals; injectable for tests. */
// export interface FinalizationHost {
//   readonly observe: typeof observeProcessStartIdentity;
//   readonly signal: typeof signalProcessWithStartIdentity;
// }
//
// /** Bind the captured root's initial identity to its run token before retaining it. */
// export const retainRootSignaller = (
//   pid: number,
//   finalizationMs: number,
//   runId: string,
//   host: FinalizationHost = {
//     observe: (rootPid) =>
//       observeProcessStartIdentity(rootPid, undefined, runId),
//     signal: signalProcessWithStartIdentity,
//   },
// ): StartedCaptureRuntime["signalRoot"] => {
//   const retained =
//     finalizationMs > 0
//       ? host.observe(pid).then(
//           (observation) =>
//             observation === undefined
//               ? ({ state: "gone" } as const)
//               : observation.state === "readable"
//                 ? ({
//                     state: "identity",
//                     identity: observation.identity,
//                   } as const)
//                 : ({
//                     state: "unverified",
//                     reason:
//                       observation.reason.trim() === ""
//                         ? "start identity is unavailable without a diagnostic"
//                         : observation.reason,
//                   } as const),
//           (cause: unknown) =>
//             ({
//               state: "unverified",
//               reason: describeUnverifiedCause(
//                 cause,
//                 "start identity inspection failed without a message",
//               ),
//             }) as const,
//         )
//       : undefined;
//   return async (signal) => {
//     const identity = await retained;
//     if (identity === undefined)
//       return {
//         delivery: "unverified",
//         reason: "root identity was not retained",
//       };
//     if (identity.state === "unverified")
//       return { delivery: "unverified", reason: identity.reason };
//     if (identity.state === "gone") return { delivery: "gone" };
//     const delivery = await host.signal(pid, identity.identity, signal);
//     return delivery === "unverified"
//       ? {
//           delivery,
//           reason:
//             "start identity could not be verified or the signal call failed",
//         }
//       : { delivery };
//   };
// };
//
// const cleanupFailedStartup = async (options: {
//   readonly cause: unknown;
//   readonly timers: Set<ProcessTimer>;
//   readonly terminal: IPty | undefined;
//   readonly renderer: TerminalRenderer | undefined;
//   readonly runId: string;
//   readonly captureBaseline: ProcessOwnershipBaseline;
//   readonly scenario: ProcessScenario;
//   readonly cleanupHost?: ProcessCaptureCleanupHost;
//   readonly observations?: ProcessCaptureObservationBuffer;
//   readonly temporaryRoot: string;
//   readonly resourceScope?: ProcessCaptureResourceScope;
// }): Promise<never> => {
//   const sampledProcessGroupIds =
//     options.terminal !== undefined &&
//     options.observations?.process_samples.state === "available"
//       ? selectCapturedProcessGroupIds(
//           options.terminal.pid,
//           options.observations.process_samples.value,
//         ).filter((groupId) => groupId !== options.terminal?.pid)
//       : undefined;
//   if (options.observations !== undefined && options.renderer !== undefined) {
//     try {
//       options.observations.rendered_frames = {
//         state: "available",
//         value: await options.renderer.frames(),
//       };
//     } catch (cause: unknown) {
//       options.observations.rendered_frames = {
//         state: "unavailable",
//         reason: `Rendered terminal frame collection failed: ${cause instanceof Error ? cause.message : "unknown failure"}`,
//       };
//     }
//   }
//   const cleanupOptions: ProcessCaptureResourceCleanupOptions = {
//     timers: options.timers,
//     terminal: options.terminal,
//     renderer: options.renderer,
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
//   const cleanupFailure = cleanupReportFailure(cleanup);
//   if (cleanupFailure !== undefined) {
//     resolveProcessResult(
//       undefined,
//       options.cause,
//       cleanup,
//       options.observations,
//       {
//         scenario: options.scenario,
//         ...(options.terminal === undefined
//           ? {}
//           : { rootPid: options.terminal.pid }),
//       },
//     );
//   }
//   throw options.cause;
// };
//
// const createTerminalRenderer = (
//   scenario: ProcessScenario,
//   normalizeText: (
//     value: string,
//     maxBytes: number,
export const _l = 230;
