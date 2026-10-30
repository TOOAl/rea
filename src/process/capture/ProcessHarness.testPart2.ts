export const __stub = 1;
//   const journal: Array<{
//     capture_order: number;
//     collection: "frames";
//     index: number;
//   }> = [{ capture_order: 0, collection: "frames", index: 0 }];
//   const lateFrame = new Promise<void>((resolve) => {
//     setTimeout(() => {
//       journal.push({ capture_order: 1, collection: "frames", index: 1 });
//       resolve();
//     }, 12);
//   });
//
//   let settled = false;
//   const wait = settleProcessCaptureJournal(journal, 20, 200).then(() => {
//     settled = true;
//   });
//   await lateFrame;
//   expect(settled).toBe(false);
//   await wait;
//
//   expect(journal).toHaveLength(2);
//   expect(journal[1]).toMatchObject({ collection: "frames", index: 1 });
// });
//
// it("does not settle while a trailing observation is already due behind a stalled event loop", async () => {
//   const journal: Array<{
//     capture_order: number;
//     collection: "frames";
//     index: number;
//   }> = [{ capture_order: 0, collection: "frames", index: 0 }];
//   const lateFrame = new Promise<void>((resolve) => {
//     setTimeout(() => {
//       journal.push({ capture_order: 1, collection: "frames", index: 1 });
//       resolve();
//     }, 12);
//   });
//
//   const wait = settleProcessCaptureJournal(journal, 20, 200);
//   // Stall the event loop past the quiet window so the settle wake-up and the
//   // trailing observation are both already due when timer callbacks resume.
//   const stalledUntil = Date.now() + 40;
//   while (Date.now() < stalledUntil) {
//     // Deliberately occupy the loop; no timer can run until this returns.
//   }
//   await wait;
//
//   expect(journal).toHaveLength(2);
//   expect(journal[1]).toMatchObject({ collection: "frames", index: 1 });
//   await lateFrame;
// });
//
// it("keeps empty cleanup exception messages actionable in the report", async () => {
//   const host: ProcessCaptureCleanupHost = {
//     platform: process.platform,
//     cleanupProcessGroup: async () => ({
//       cleaned: false,
//       reason: "unused process cleanup",
//     }),
//     verifyTokenOwnedProcesses: async () => ({
//       cleaned: false,
//       reason: "unused process cleanup",
//     }),
//     removeTemporaryRoot: async () => {
//       throw new Error("");
//     },
//   };
//   const report = await releaseProcessResources({
//     timers: new Set(),
//     terminal: undefined,
//     renderer: undefined,
//     runId: "fixture-run",
//     temporaryRoot: "/fixture/root",
//     host,
//   });
//
//   expect(report.temporary_root).toEqual({ state: "failed", reason: "Error" });
// });
//
// it.each(["termination", "verification"] as const)(
//   "retains observations and retries the temporary root when process %s throws",
//   async (stage) => {
//     const cleanupFailure = new Error(`${stage} inspection failed`);
//     const removeTemporaryRoot = vi.fn(async () => undefined);
//     let failing = true;
//     const scope = new ProcessCaptureResourceScope();
//     const host: ProcessCaptureCleanupHost = {
//       platform: "linux",
//       cleanupProcessGroup: async () => {
//         if (failing && stage === "termination") throw cleanupFailure;
//         return {
//           cleaned: true,
//           signaled: true,
//           unverified: failing
//             ? [{ pid: 900, diagnostic: "environment unavailable" }]
//             : [],
//         };
//       },
//       verifyTokenOwnedProcesses: async () => {
//         if (failing) throw cleanupFailure;
//         return { cleaned: true, signaled: false };
//       },
//       removeTemporaryRoot,
//     };
//     const cleanup = await scope.release({
//       timers: new Set(),
//       terminal: { pid: 321 },
//       renderer: undefined,
//       runId: "fixture-run",
//       temporaryRoot: "/fixture/root",
//       host,
//     });
//
//     expect(removeTemporaryRoot).not.toHaveBeenCalled();
//     expect(cleanup.temporary_root).toEqual({
//       state: "unverified",
//       reason: `temporary root retained because owned process cleanup is failed: ${cleanupFailure.message}`,
//     });
//     expect(cleanup.owned_process_group).toMatchObject({
//       state: "failed",
//       reason: cleanupFailure.message,
//     });
//     if (stage === "verification")
//       expect(cleanup.owned_process_group.unverified_processes).toEqual([
//         { pid: 900, reason: "environment unavailable" },
//       ]);
//
//     const executionFailure = new Error("capture snapshot failed");
//     const capture = parseProcessCapture({
//       ...accountFullyObservedProcessCapture({
//         ...emptyProcessCapture(),
//         frames: [{ sequence: 0, at_ms: 0, data: "collected before failure" }],
//       }),
//       event_journal: [],
//     });
//     try {
//       resolveProcessResult(capture, executionFailure, cleanup);
//       throw new Error("expected cleanup failure");
//     } catch (cause: unknown) {
//       if (!(cause instanceof ProcessCaptureError)) throw cause;
//       expect(cause.cause).toBe(executionFailure);
//       expect(
//         analysisErrorProjectionSchema.parse(projectAnalysisError(cause)),
//       ).toMatchObject({
//         code: "cleanup_incomplete",
//         details: {
//           cleanup_report: cleanup,
//           execution_failure: "capture snapshot failed",
//           partial_observation: {
//             capture: { frames: [{ data: "collected before failure" }] },
//           },
//         },
//       });
//     }
//     failing = false;
//     await scope.retryCleanup();
//     expect(removeTemporaryRoot).toHaveBeenCalledExactlyOnceWith(
//       "/fixture/root",
//     );
//     await scope.close();
//     expect(removeTemporaryRoot).toHaveBeenCalledTimes(1);
//   },
// );
//
// it("waits for token-owned processes to exit after one cleanup signal", async () => {
//   vi.useFakeTimers();
//   try {
//     let verificationCalls = 0;
//     const exitsAt = Date.now() + 50;
//     let cleanupCalls = 0;
//     const host: ProcessCaptureCleanupHost = {
//       platform: "linux",
//       cleanupProcessGroup: async () => {
//         cleanupCalls += 1;
//         return { cleaned: true, signaled: true };
//       },
//       verifyTokenOwnedProcesses: async () => {
//         verificationCalls += 1;
//         return Date.now() < exitsAt
//           ? { cleaned: false, reason: "owned process is exiting" }
//           : { cleaned: true, signaled: false };
//       },
//       removeTemporaryRoot: async () => undefined,
//     };
//     const result = releaseProcessResources({
//       timers: new Set(),
//       terminal: { pid: 321 },
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
//       state: "cleaned",
//       reason: null,
//     });
//     expect(cleanupCalls).toBe(1);
//     expect(verificationCalls).toBeGreaterThan(1);
//   } finally {
//     vi.useRealTimers();
//   }
// });
//
// it("retains unrelated withheld processes through cleanup, capture, and JSON", async () => {
//   const host: ProcessCaptureCleanupHost = {
//     platform: "darwin",
//     cleanupProcessGroup: async () => ({
//       cleaned: true,
//       signaled: true,
//       unverified: [
//         { pid: 900, diagnostic: "platform_binary_environment_withheld" },
//       ],
//     }),
//     verifyTokenOwnedProcesses: async () => ({
//       cleaned: true,
//       signaled: false,
//       unverified: [{ pid: 901, diagnostic: "foreign uid: EINVAL" }],
//     }),
//     removeTemporaryRoot: async () => undefined,
//   };
//   const report = await releaseProcessResources({
//     timers: new Set(),
//     terminal: { pid: 321 },
//     renderer: undefined,
//     runId: "fixture-run",
//     temporaryRoot: "/fixture/root",
//     host,
//   });
//   const unverified = [
//     { pid: 900, reason: "platform_binary_environment_withheld" },
//     { pid: 901, reason: "foreign uid: EINVAL" },
//   ];
//   expect(report.owned_process_group).toEqual({
//     state: "cleaned",
//     reason: null,
//     unverified_processes: unverified,
//   });
//   const original = emptyProcessCapture();
//   const { cleanup: previousCleanup, ...pending } = original;
//   for (const input of [pending, original]) {
//     const resolved = resolveProcessResult(input, undefined, report);
//     const serialized: unknown = JSON.parse(JSON.stringify(resolved));
//     const capture = parseProcessCapture(serialized);
//     expect(capture.cleanup).toEqual({
//       ...previousCleanup,
//       unverified_processes: unverified,
//     });
//     expect(capture.residual_unknowns).toEqual([
//       ...original.residual_unknowns,
export const _l = 252;
