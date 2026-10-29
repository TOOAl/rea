export const __stub = 1;
// import { expect, it, vi } from "vitest";
// import { processScenarioSchema } from "../../domain/process/processScenario.js";
// import { AnalysisCapabilityUnavailableError } from "../../domain/analysisErrorCore.js";
// import {
//   captureProcessScenario,
//   retainRootSignaller,
// } from "./ProcessHarness.js";
// import { settleProcessCaptureJournal } from "./ProcessCaptureLifecycle.js";
// import { parseProcessCapture } from "../../domain/process/processCaptureParsing.js";
// import { EMPTY_PROCESS_CAPTURE_EXAMPLE } from "../../domain/process/processCaptureExample.js";
// import { projectAnalysisError } from "../../domain/analysisErrorProjection.js";
// import {
//   accountFullyObservedProcessCapture,
//   emptyProcessCapture,
// } from "../../domain/process/processCapture.fixture.js";
// import { analysisErrorProjectionSchema } from "../../contracts/errorSchemas.js";
// import {
//   ProcessCaptureError,
//   normalizeCaptureFailure,
//   processCaptureCancelled,
// } from "./ProcessCaptureError.js";
// import {
//   releaseProcessResources,
//   ProcessCaptureResourceScope,
//   createProcessCaptureObservationBuffer,
//   prepareProcessCapture,
//   resolveProcessResult,
//   type ProcessCaptureCleanupHost,
// } from "./ProcessCaptureLifecycle.js";
// import { DarwinProcessOwnershipInspectionError } from "../DarwinProcessRunTokenReader.js";
//
// import {
//   partialProcessCaptureObservationSchema,
//   processCaptureSchema,
// } from "../../domain/process/processCapture.js";
// const emptyFilesystemCoverage =
//   emptyProcessCapture().truncation_details.filesystem_before;
// const incompleteFilesystemCoverage = {
//   ...emptyFilesystemCoverage,
//   enumeration_truncated: true,
//   enumeration_reasons: ["identity_changed"],
// } satisfies typeof emptyFilesystemCoverage;
// it("retains cancellation and cleanup facts when ownership baseline inspection aborts", async () => {
//   const controller = new AbortController();
//   const scenario = processScenarioSchema.parse({
//     executable: process.execPath,
//   });
//   await expect(
//     prepareProcessCapture(
//       scenario,
//       controller.signal,
//       async () => ({
//         files: [],
//         truncated: false,
//         completeRoots: [],
//         coverage: emptyFilesystemCoverage,
//       }),
//       {
//         createTemporaryRoot: async () => "/fixture/allocated-root",
//         captureOwnershipBaseline: async () => {
//           controller.abort();
//           controller.signal.throwIfAborted();
//           return [];
//         },
//         cleanup: async () => undefined,
//       },
//     ),
//   ).rejects.toMatchObject({
//     reason: "cancelled",
//     message: "process capture was cancelled",
//     cleanupReport: {
//       temporary_root: { state: "cleaned", reason: null },
//     },
//     partialObservation: {
//       observations: {
//         filesystem_snapshots: {
//           before: {
//             state: "available",
//             value: {
//               files: [],
//               truncated: false,
//               completeRoots: [],
//               coverage: emptyFilesystemCoverage,
//             },
//           },
//         },
//       },
//     },
//   });
// });
//
// it("keeps prelaunch snapshot evidence and the ownership failure when root cleanup throws", async () => {
//   const ownershipFailure = new Error("process identity baseline denied");
//   const scenario = processScenarioSchema.parse({
//     executable: process.execPath,
//     filesystem_observation_paths: ["/fixture/root"],
//   });
//   try {
//     await prepareProcessCapture(
//       scenario,
//       undefined,
//       async () => ({
//         files: [],
//         truncated: true,
//         completeRoots: [],
//         coverage: incompleteFilesystemCoverage,
//       }),
//       {
//         createTemporaryRoot: async () => "/fixture/allocated-root",
//         captureOwnershipBaseline: async () => {
//           throw ownershipFailure;
//         },
//         cleanup: async () => {
//           throw new Error("root removal denied");
//         },
//       },
//     );
//     throw new Error("expected preparation failure");
//   } catch (cause: unknown) {
//     if (!(cause instanceof ProcessCaptureError)) throw cause;
//     expect(cause.cause).toBe(ownershipFailure);
//     const incomplete = cause.partialObservation;
//     if (incomplete === undefined || !("observations" in incomplete))
//       throw new Error("expected incomplete preparation observations");
//     expect(
//       Object.keys(incomplete.observations),
//       "a default scenario keeps the base observation keys through the preparation path",
//     ).not.toContain("finalization");
//     expect(
//       analysisErrorProjectionSchema.parse(projectAnalysisError(cause)),
//     ).toMatchObject({
//       code: "cleanup_incomplete",
//       details: {
//         execution_failure: ownershipFailure.message,
//         cleanup_report: {
//           temporary_root: { state: "failed", reason: "root removal denied" },
//         },
//         partial_observation: {
//           observations: {
//             filesystem_snapshots: {
//               before: {
//                 state: "available",
//                 value: {
//                   files: [],
//                   truncated: true,
//                   completeRoots: [],
//                   coverage: incompleteFilesystemCoverage,
//                 },
//               },
//             },
//           },
//         },
//       },
//     });
//   }
// });
//
// it("projects complete after-snapshot metadata when a later capture stage fails", () => {
//   const scenario = processScenarioSchema.parse({
//     executable: process.execPath,
//     filesystem_observation_paths: ["/fixture/root"],
//   });
//   const observations = createProcessCaptureObservationBuffer({
//     frames: [],
//     interactions: [],
//     samples: [],
//     eventJournal: [],
//     before: {
//       files: [],
//       truncated: false,
//       completeRoots: [],
//       coverage: emptyFilesystemCoverage,
//     },
//   });
//   observations.filesystem_snapshots.after = {
//     state: "available",
//     value: {
//       files: [],
//       truncated: true,
//       completeRoots: [],
//       coverage: incompleteFilesystemCoverage,
//     },
//   };
//   const cleanup = {
//     owned_process_group: { state: "cleaned" as const, reason: null },
//     terminal_renderer: { state: "cleaned" as const, reason: null },
//     temporary_root: { state: "cleaned" as const, reason: null },
//   };
//
//   let error: ProcessCaptureError | undefined;
//   try {
//     resolveProcessResult(
//       undefined,
//       new Error("capture manifest failed after final snapshot"),
//       cleanup,
//       observations,
//       { scenario },
//     );
//   } catch (cause: unknown) {
//     if (!(cause instanceof ProcessCaptureError)) throw cause;
//     error = cause;
//   }
//   if (error === undefined) throw new Error("expected capture failure");
//
//   expect(
//     analysisErrorProjectionSchema.parse(projectAnalysisError(error)),
//   ).toMatchObject({
//     details: {
//       partial_observation: {
//         observations: {
//           filesystem_snapshots: {
//             after: {
//               state: "available",
//               value: {
//                 files: [],
//                 truncated: true,
//                 completeRoots: [],
//                 coverage: incompleteFilesystemCoverage,
//               },
//             },
//           },
//         },
//       },
//     },
//   });
// });
//
// it("rejects legacy replay output instead of silently discarding it", () => {
//   expect(
//     processCaptureSchema.safeParse({
//       ...EMPTY_PROCESS_CAPTURE_EXAMPLE,
//       protocol_events: [],
//     }).success,
//   ).toBe(false);
// });
//
// it("preserves the actionable Darwin ownership compiler prerequisite", () => {
//   const normalized = normalizeCaptureFailure(
//     new DarwinProcessOwnershipInspectionError(
//       "macOS process ownership inspection requires the Apple Swift compiler via xcrun",
//     ),
//     undefined,
//   );
//
//   expect(normalized).toBeInstanceOf(ProcessCaptureError);
//   expect(normalized).toMatchObject({
//     message:
//       "macOS process ownership inspection requires the Apple Swift compiler via xcrun",
//   });
// });
//
// it("waits for terminal observations delivered after the exit callback", async () => {
export const _l = 252;
