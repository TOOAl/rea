export const __stub = 1;
//       {
//         scope: "process",
//         reason: expect.stringContaining("900 could not be verified"),
//       },
//       {
//         scope: "process",
//         reason: expect.stringContaining("901 could not be verified"),
//       },
//     ]);
//   }
// });
//
// it("retains the last ownership failure when the verification grace expires", async () => {
//   vi.useFakeTimers();
//   try {
//     let verificationCalls = 0;
//     let cleanupCalls = 0;
//     const host: ProcessCaptureCleanupHost = {
//       platform: "linux",
//       cleanupProcessGroup: async () => {
//         cleanupCalls += 1;
//         return { cleaned: true, signaled: true };
//       },
//       verifyTokenOwnedProcesses: async () => {
//         verificationCalls += 1;
//         return {
//           cleaned: false,
//           reason:
//             verificationCalls === 1
//               ? "owned process has not exited yet"
//               : "owned process remained after identity recheck",
//         };
//       },
//       removeTemporaryRoot: async () => undefined,
//     };
//     const result = releaseProcessResources({
//       timers: new Set(),
//       terminal: { pid: 322 },
//       renderer: undefined,
//       runId: "fixture-run",
//       temporaryRoot: "/fixture/root",
//       host,
//     });
//
//     await vi.runAllTimersAsync();
//     const report = await result;
//
//     expect(report.owned_process_group).toEqual({
//       state: "unverified",
//       reason: "owned process remained after identity recheck",
//     });
//     expect(cleanupCalls).toBe(1);
//     expect(verificationCalls).toBeGreaterThan(1);
//   } finally {
//     vi.useRealTimers();
//   }
// });
//
// it("passes sampled detached groups into cleanup even when their token is unknown", async () => {
//   let sampledGroups: readonly number[] | undefined;
//   const host: ProcessCaptureCleanupHost = {
//     platform: "linux",
//     cleanupProcessGroup: async (ownership) => {
//       sampledGroups = ownership.sampledProcessGroupIds;
//       return {
//         cleaned: false,
//         reason: "sampled group has no verifiable run token",
//       };
//     },
//     verifyTokenOwnedProcesses: async () => ({
//       cleaned: true,
//       signaled: false,
//     }),
//     removeTemporaryRoot: async () => undefined,
//   };
//
//   const report = await releaseProcessResources({
//     timers: new Set(),
//     terminal: { pid: 321 },
//     renderer: undefined,
//     runId: "fixture-run",
//     temporaryRoot: "/fixture/root",
//     sampledProcessGroupIds: [654],
//     host,
//   });
//
//   expect(sampledGroups).toEqual([654]);
//   expect(report.owned_process_group).toEqual({
//     state: "unverified",
//     reason: "sampled group has no verifiable run token",
//   });
// });
//
// it("retains observations and both causes when process cleanup is unverifiable", () => {
//   const verified = emptyProcessCapture();
//   const capture = parseProcessCapture({
//     ...accountFullyObservedProcessCapture({
//       ...verified,
//       frames: [{ sequence: 0, at_ms: 0, data: "observed output" }],
//       process_samples: [
//         {
//           at_ms: 1,
//           pid: 654,
//           parent_pid: 321,
//           command: "sanitized-detached-child",
//           process_group_id: 654,
//           session_id: 654,
//         },
//       ],
//     }),
//     event_journal: [],
//   });
//   const executionFailure = new Error("capture ended after a fixture error");
//   const cleanup = {
//     owned_process_group: {
//       state: "unverified" as const,
//       reason:
//         "process ownership token could not be read for 1 live process(es): environment_unavailable=1; live candidates 900=environment_unavailable",
//       unverified_processes: [
//         { pid: 900, reason: "platform_binary_environment_withheld" },
//       ],
//     },
//     terminal_renderer: { state: "cleaned" as const, reason: null },
//     temporary_root: { state: "cleaned" as const, reason: null },
//   };
//
//   let error: ProcessCaptureError | undefined;
//   try {
//     resolveProcessResult(capture, executionFailure, cleanup);
//   } catch (cause: unknown) {
//     if (!(cause instanceof ProcessCaptureError)) throw cause;
//     error = cause;
//   }
//   if (error === undefined) throw new Error("expected cleanup-incomplete error");
//
//   const projection = projectAnalysisError(error);
//   const parsedProjection = analysisErrorProjectionSchema.parse(projection);
//   expect(parsedProjection).toMatchObject({
//     code: "cleanup_incomplete",
//     details: {
//       cleanup_report: cleanup,
//       execution_failure: "capture ended after a fixture error",
//       partial_observation: {
//         capture: {
//           frames: [{ data: "observed output" }],
//           process_samples: [{ pid: 654, process_group_id: 654 }],
//           settlement: { cleanup_outcome: "failed" },
//         },
//         execution_failure: "capture ended after a fixture error",
//       },
//     },
//   });
//   expect(error.cause).toBe(executionFailure);
//   const partialObservation = error.partialObservation;
//   expect(partialObservation).toBeDefined();
//   if (partialObservation === undefined)
//     throw new Error("expected validated partial observation");
//   expect(
//     partialProcessCaptureObservationSchema.safeParse({
//       ...partialObservation,
//       cleanup: {
//         owned_process_group: { state: "cleaned", reason: null },
//         terminal_renderer: { state: "cleaned", reason: null },
//         temporary_root: { state: "cleaned", reason: null },
//       },
//       execution_failure: null,
//     }).success,
//   ).toBe(false);
//   expect(
//     partialProcessCaptureObservationSchema.safeParse({
//       ...partialObservation,
//       cleanup: {
//         owned_process_group: { state: "cleaned", reason: null },
//         terminal_renderer: { state: "cleaned", reason: null },
//         temporary_root: { state: "cleaned", reason: null },
//       },
//       execution_failure: "capture ended after a fixture error",
//     }).success,
//   ).toBe(true);
//   if (!("capture" in partialObservation))
//     throw new Error("expected completed partial capture observations");
//   const partialCapture = partialObservation.capture;
//   expect(() => parseProcessCapture(partialCapture)).toThrow();
// });
//
// it("projects execution and cleanup failures when capture never completed", () => {
//   const executionFailure = new Error("terminal startup failed");
//   const cleanup = {
//     owned_process_group: {
//       state: "unverified" as const,
//       reason: "process ownership token could not be read",
//     },
//     terminal_renderer: { state: "cleaned" as const, reason: null },
//     temporary_root: { state: "cleaned" as const, reason: null },
//   };
//
//   let error: ProcessCaptureError | undefined;
//   try {
//     resolveProcessResult(undefined, executionFailure, cleanup);
//   } catch (cause: unknown) {
//     if (!(cause instanceof ProcessCaptureError)) throw cause;
//     error = cause;
//   }
//   if (error === undefined) throw new Error("expected cleanup-incomplete error");
//
//   expect(error.partialObservation).toBeUndefined();
//   expect(error.cause).toBe(executionFailure);
//   expect(projectAnalysisError(error)).toMatchObject({
//     code: "cleanup_incomplete",
//     details: {
//       cleanup_report: cleanup,
//       execution_failure: "terminal startup failed",
//     },
//   });
// });
//
// it("retains completed observations when finalization fails after clean cleanup", () => {
//   const capture = parseProcessCapture({
//     ...accountFullyObservedProcessCapture({
//       ...emptyProcessCapture(),
//       frames: [{ sequence: 0, at_ms: 0, data: "observed before finalization" }],
//     }),
//     event_journal: [],
//   });
//   const executionFailure = new Error("final filesystem snapshot failed");
//   const cleanup = {
//     owned_process_group: { state: "cleaned" as const, reason: null },
//     terminal_renderer: { state: "cleaned" as const, reason: null },
//     temporary_root: { state: "cleaned" as const, reason: null },
//   };
//
//   let error: ProcessCaptureError | undefined;
//   try {
//     resolveProcessResult(capture, executionFailure, cleanup);
//   } catch (cause: unknown) {
//     if (!(cause instanceof ProcessCaptureError)) throw cause;
//     error = cause;
//   }
//   if (error === undefined) throw new Error("expected capture failure");
//
//   expect(error).toMatchObject({
//     reason: "capture_failed",
//     cleanupIncomplete: false,
//     executionFailure: "final filesystem snapshot failed",
//     cleanupReport: cleanup,
//   });
//   expect(error.cause).toBe(executionFailure);
//   expect(error.partialObservation).toMatchObject({
//     capture: {
//       frames: [{ data: "observed before finalization" }],
//       settlement: { cleanup_outcome: "not_required" },
//     },
export const _l = 252;
