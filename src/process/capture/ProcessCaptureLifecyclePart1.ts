export const __stub = 1;
// import { createHash, randomUUID } from "node:crypto";
// import { constants, statSync, type BigIntStats } from "node:fs";
// import { open, mkdtemp, rm, stat } from "node:fs/promises";
// import { tmpdir } from "node:os";
// import { join } from "node:path";
// import { setImmediate, setTimeout as delay } from "node:timers/promises";
// import type { IPty } from "@lydell/node-pty";
//
// import type { ProcessCapture } from "../../domain/process/processCaptureParsing.js";
// import type { ProcessScenario } from "../../domain/process/processScenario.js";
// import {
//   digestProcessCommitment,
//   processComparisonContract,
//   processScenarioCommitment,
// } from "../../domain/process/processScenario.js";
// import { parseProcessCapture } from "../../domain/process/processCaptureParsing.js";
// import { PRODUCT_IDENTITY } from "../../identity.js";
// import { snapshotRoots } from "./FilesystemSnapshot.js";
// import { classifyFilesystemEffects } from "./ProcessFilesystemEffects.js";
// import {
//   cleanupOwnedProcessGroup,
//   verifyNoTokenOwnedProcesses,
//   type OwnedProcessGroup,
//   type ProcessCleanupResult,
//   type ProcessOwnershipBaseline,
// } from "../ProcessOwnership.js";
// import {
//   observeOwnedProcessGroups,
//   prepareProcessOwnershipInspection,
//   systemProcessOwnershipHost,
// } from "../ProcessOwnershipObservation.js";
// import {
//   describeProcessCaptureExecutionFailure,
//   normalizeCaptureFailure,
//   ProcessCaptureError,
// } from "./ProcessCaptureError.js";
// import { assertNotCancelled } from "./ProcessScenarioRuntimeValidation.js";
// import {
//   normalizeProcessElapsedTime,
//   normalizeProcessSamples,
//   type BoundedProcessTextNormalization,
// } from "./ProcessNormalization.js";
// import { PROCESS_PROVIDER } from "../../domain/process/processEvidenceProvider.js";
// import { TerminalRenderer } from "./TerminalRenderer.js";
// import {
//   hasCaptureTruncation,
//   type NormalizedTerminalRetention,
//   type TerminalRetention,
//   type ProcessCaptureTruncationDetails,
// } from "../../domain/process/processCaptureCoverage.js";
// import { scheduleProcessInterval, type ProcessTimer } from "./ProcessTimer.js";
// import { monotonicProcessCaptureClock } from "./ProcessCaptureClock.js";
//
// import type {
//   FilesystemCheckpoint,
//   InteractionEvent,
//   ProcessCaptureFinalization,
//   UnverifiedProcessCapture,
//   ProcessSample,
//   ProcessSettlement,
//   ProcessCaptureCleanupReport,
//   PartialProcessCaptureObservation,
//   IncompleteProcessCaptureObservations,
//   ProcessFilesystemSnapshot,
//   PartialProcessObservationField,
//   ProcessCaptureEventJournalEntry,
//   RecordProcessCaptureEvent,
//   TerminalFrame,
// } from "../../domain/process/processCapture.js";
// import { partialProcessCaptureObservationSchema } from "../../domain/process/processCapture.js";
// interface TerminalExitOptions {
//   readonly terminal: Pick<IPty, "onExit" | "kill">;
//   readonly scenario: ProcessScenario;
//   readonly started: number;
//   readonly lastOutput: () => number;
//   readonly signal: AbortSignal | undefined;
//   /** Identity-checked signal to the captured root, used only during finalization. */
//   readonly signalTarget: (signal: FinalizationSignal) => Promise<{
//     readonly delivery: FinalizationDelivery;
//     readonly reason?: string | undefined;
//   }>;
//   /** Receives the attempts so far, so a later failure keeps them. */
//   readonly recordFinalization: (
//     finalization: ProcessCaptureFinalization,
//   ) => void;
//   readonly timers: Set<ProcessTimer>;
//   readonly interactions: InteractionEvent[];
//   readonly dispatchedEventIndexes: ReadonlySet<number>;
//   readonly recordEvent: RecordProcessCaptureEvent;
//   readonly onLiveProgress?: () => void;
// }
//
// type FinalizationSignal =
//   ProcessCaptureFinalization["signals"][number]["signal"];
// type FinalizationDelivery =
//   ProcessCaptureFinalization["signals"][number]["delivery"];
//
// /** The capture's exit, or the facts known when no exit could be observed. */
// export type TerminalExitResult =
//   | {
//       readonly unobserved?: false;
//       readonly exitCode: number;
//       readonly signal?: number;
//       readonly reason: "exited" | "timeout" | "idle_timeout" | "cancelled";
//       readonly finalization?: ProcessCaptureFinalization;
//     }
//   | {
//       readonly unobserved: true;
//       readonly reason: "timeout" | "idle_timeout" | "cancelled";
//       readonly finalization: ProcessCaptureFinalization;
//     };
//
// interface CaptureResultOptions {
//   readonly frames: readonly TerminalFrame[];
//   readonly exit: {
//     readonly exitCode: number;
//     readonly signal?: number;
//     readonly reason: "exited" | "timeout" | "idle_timeout";
//     readonly finalization?: ProcessCaptureFinalization;
//   };
//   readonly samples: readonly ProcessSample[];
//   readonly before: ProcessFilesystemSnapshot;
//   readonly after: ProcessFilesystemSnapshot;
//   readonly truncationDetails: ProcessCaptureTruncationDetails;
//   readonly scenario: ProcessScenario;
//   readonly rootPid: number;
//   readonly samplingPartial: boolean;
//   readonly renderedFrames: UnverifiedProcessCapture["rendered_frames"];
//   readonly interactions: readonly InteractionEvent[];
//   readonly checkpoints: readonly FilesystemCheckpoint[];
//   readonly settlement: ObservedProcessSettlement;
//   readonly manifest: UnverifiedProcessCapture["manifest"];
//   readonly eventJournal: readonly ProcessCaptureEventJournalEntry[];
// }
//
// /** Settlement observation before process-resource cleanup has completed. */
// export type ObservedProcessSettlement =
//   | Pick<
//       Extract<ProcessSettlement, { readonly state: "quiesced" }>,
//       "state" | "elapsed_ms"
//     >
//   | Pick<
//       Exclude<ProcessSettlement, { readonly state: "quiesced" }>,
//       "state" | "elapsed_ms"
//     >;
//
// /** Capture observations before owned-resource cleanup has been verified. */
// export type PendingProcessCapture = Omit<
//   UnverifiedProcessCapture,
//   "cleanup" | "settlement"
// > & {
//   readonly settlement: ObservedProcessSettlement;
// };
//
// /** Mutable collection of facts available if completion stops before a capture exists. */
// export interface ProcessCaptureObservationBuffer {
//   target_pid: PartialProcessObservationField<number>;
//   frames: PartialProcessObservationField<readonly TerminalFrame[]>;
//   rendered_frames: PartialProcessObservationField<
//     UnverifiedProcessCapture["rendered_frames"]
//   >;
//   interaction_events: PartialProcessObservationField<
//     UnverifiedProcessCapture["interaction_events"]
//   >;
//   exit: IncompleteProcessCaptureObservations["exit"];
//   finalization?: IncompleteProcessCaptureObservations["finalization"];
//   settlement: IncompleteProcessCaptureObservations["settlement"];
//   process_samples: PartialProcessObservationField<readonly ProcessSample[]>;
//   filesystem_snapshots: {
//     before: PartialProcessObservationField<ProcessFilesystemSnapshot>;
//     after: PartialProcessObservationField<ProcessFilesystemSnapshot>;
//   };
//   event_journal: PartialProcessObservationField<
//     readonly ProcessCaptureEventJournalEntry[]
//   >;
//   manifest: IncompleteProcessCaptureObservations["manifest"];
// }
//
// /** Seed explicit observation availability before capture completion begins. */
// export const createProcessCaptureObservationBuffer = (options: {
//   readonly frames: readonly TerminalFrame[];
//   readonly interactions: readonly InteractionEvent[];
//   readonly samples: readonly ProcessSample[];
//   readonly eventJournal: readonly ProcessCaptureEventJournalEntry[];
//   readonly before: ProcessFilesystemSnapshot;
//   /** Seed a finalization observation only for a scenario with an interval. */
//   readonly finalizationEnabled?: boolean;
// }): ProcessCaptureObservationBuffer => ({
//   target_pid: {
//     state: "unavailable",
//     reason: "No PTY process was spawned before the run failed.",
//   },
//   frames: { state: "available", value: options.frames },
//   rendered_frames: {
//     state: "unavailable",
//     reason:
//       "Rendered terminal frames were not collected before capture completion finished.",
//   },
//   interaction_events: { state: "available", value: options.interactions },
//   exit: {
//     state: "unavailable",
//     reason: "Terminal exit was not observed before the run failed.",
//   },
//   ...(options.finalizationEnabled === true
//     ? {
//         finalization: {
//           state: "unavailable" as const,
//           reason:
//             "Finalization was not observed before capture completion finished.",
//         },
//       }
//     : {}),
//   settlement: {
//     state: "unavailable",
//     reason:
//       "Process settlement was not observed before capture completion finished.",
//   },
//   process_samples: { state: "available", value: options.samples },
//   filesystem_snapshots: {
//     before: {
//       state: "available",
//       value: options.before,
//     },
//     after: {
//       state: "unavailable",
//       reason:
//         "Final filesystem snapshot was not collected before capture completion finished.",
//     },
//   },
//   event_journal: { state: "available", value: options.eventJournal },
//   manifest: {
//     state: "unavailable",
//     reason:
//       "Capture manifest was not produced before capture completion finished.",
//   },
// });
//
// const normalizePartialProcessObservations = (
//   observations: IncompleteProcessCaptureObservations,
//   context: { readonly scenario: ProcessScenario; readonly rootPid?: number },
// ): IncompleteProcessCaptureObservations => {
//   const targetPid = observations.target_pid;
//   const target_pid =
//     targetPid.state === "available" && context.rootPid !== undefined
//       ? {
//           state: "available" as const,
//           value: context.scenario.normalization.pids ? 1 : context.rootPid,
//         }
//       : targetPid;
//   const samples = observations.process_samples;
//   const process_samples =
//     samples.state === "available" && context.rootPid !== undefined
//       ? {
//           state: "available" as const,
//           value: normalizeProcessSamples(
//             samples.value,
//             context.scenario,
//             context.rootPid,
//           ),
//         }
//       : samples;
//   return { ...observations, target_pid, process_samples };
// };
//
// /** Wait for trailing PTY callbacks before the capture becomes immutable. */
// export const settleProcessCaptureJournal = async (
//   journal: readonly ProcessCaptureEventJournalEntry[],
//   quietMs = 25,
//   maxWaitMs = 500,
// ): Promise<void> => {
//   const deadline = monotonicProcessCaptureClock() + maxWaitMs;
//   let observed = journal.length;
//   let lastChangeAt = monotonicProcessCaptureClock();
//   while (monotonicProcessCaptureClock() < deadline) {
//     await new Promise<void>((resolve) => setTimeout(resolve, 4));
//     // A stalled event loop can leave timer and poll callbacks that were already
//     // due queued behind this wake-up. Drain them before judging silence so a
//     // trailing observation is not dropped by an early settle.
//     await setImmediate();
//     if (journal.length !== observed) {
//       observed = journal.length;
//       lastChangeAt = monotonicProcessCaptureClock();
//     } else if (monotonicProcessCaptureClock() - lastChangeAt >= quietMs) return;
//   }
// };
//
// export const buildCaptureResult = (
//   options: CaptureResultOptions,
// ): PendingProcessCapture => {
//   const hasSensitiveScriptedInput = options.scenario.events.some(
//     (event) => event.type === "input" && event.sensitive,
//   );
//   const sensitiveInputUnknown =
//     "Sensitive scripted input values are redacted from process capture Evidence.";
//   const filesystemObservationUnknown =
//     "No filesystem observation paths were selected; filesystem effects remain unknown.";
//   const hasFilesystemObservations =
//     options.scenario.filesystem_observation_paths.length > 0;
//   const filesystemEffects = classifyFilesystemEffects(
//     options.before,
//     options.after,
//   );
//   const filesystemUnknowns = [
//     ...new Set(
//       filesystemEffects.flatMap((effect) =>
//         effect.status === "unknown" ? [effect.reason] : [],
//       ),
//     ),
//   ];
//   return {
//     manifest: options.manifest,
//     normalization: options.scenario.normalization,
//     frames: options.frames,
//     rendered_frames: options.renderedFrames,
//     interaction_events: options.interactions,
//     exit: {
//       code:
//         options.exit.reason === "exited" && options.exit.exitCode >= 0
//           ? options.exit.exitCode
//           : null,
//       signal: options.exit.signal ?? null,
//       reason: options.exit.reason,
//       ...(options.exit.finalization === undefined
//         ? {}
//         : { finalization: options.exit.finalization }),
//     },
//     settlement: options.settlement,
//     process_samples: normalizeProcessSamples(
//       options.samples,
//       options.scenario,
//       options.rootPid,
//     ),
//     filesystem_checkpoints: options.checkpoints,
//     event_journal: options.eventJournal,
//     files_before: options.before.files,
//     files_after: options.after.files,
//     filesystem_effects: filesystemEffects,
//     truncated: hasCaptureTruncation(options.truncationDetails),
//     truncation_details: options.truncationDetails,
//     limitations: [
//       "The executable digest is a prelaunch file sample; matching path metadata immediately after spawn does not prove an atomic operating-system image binding.",
//       ...(Date.parse(options.manifest.completed_at) <
//       Date.parse(options.manifest.started_at)
//         ? [
//             "Wall-clock completion time precedes start time; elapsed capture timing is recorded separately and remains monotonic.",
//           ]
//         : []),
//       "Process trees are sampled and may omit short-lived descendants.",
//       ...(options.samplingPartial
//         ? ["Process-tree sampling ended with an incomplete observation."]
//         : []),
//       "Filesystem observations are before/after snapshots, not syscall traces.",
//       "Inherited host environment variables are not recorded and may affect results.",
//       ...(!hasFilesystemObservations ? [filesystemObservationUnknown] : []),
//       ...filesystemUnknowns,
//       ...captureCoverageUnknowns(options.truncationDetails).map(
//         ({ reason }) => reason,
//       ),
//       ...(hasSensitiveScriptedInput ? [sensitiveInputUnknown] : []),
//     ],
//     residual_unknowns: [
//       {
//         scope: "process",
//         reason:
//           "Process trees are sampled and may omit short-lived descendants.",
//       },
//       {
//         scope: "process",
//         reason:
//           "The executable digest is a prelaunch file sample; operating-system image binding is not atomically observed.",
//       },
//       {
//         scope: "environment",
//         reason: "Inherited host environment variables are not recorded.",
//       },
//       {
//         scope: "network",
//         reason: "Network activity is not observed by this capture.",
//       },
//       ...(!hasFilesystemObservations
//         ? [
//             {
//               scope: "filesystem" as const,
//               reason: filesystemObservationUnknown,
//             },
//           ]
//         : []),
//       ...filesystemUnknowns.map((reason) => ({
//         scope: "filesystem" as const,
//         reason,
//       })),
//       ...(hasSensitiveScriptedInput
//         ? [{ scope: "interaction" as const, reason: sensitiveInputUnknown }]
//         : []),
//       ...captureCoverageUnknowns(options.truncationDetails).filter(
//         ({ scope }) => scope !== "terminal",
//       ),
//     ],
//   };
export const _l = 399;
