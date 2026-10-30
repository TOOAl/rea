export const __stub = 1;
//     () => parseProcessCapture(withCommittedFinalization(700, exit)),
//     "a different committed interval contradicts the record",
//   ).toThrow("finalization");
//   expect(
//     () => parseProcessCapture(withCommittedFinalization(undefined, exit)),
//     "a scenario that committed no interval cannot have finalized",
//   ).toThrow("finalization");
//   expect(
//     () =>
//       parseProcessCapture(
//         withCommittedFinalization(500, {
//           ...exit,
//           finalization: { ...finalization, elapsed_ms: null },
//         }),
//       ),
//     "a complete capture requires an observed finalization exit time",
//   ).toThrow("finalization");
// });
//
// it("validates finalization signal observations", () => {
//   const finalization = {
//     requested_ms: 500,
//     exit_code: null,
//     signals: [
//       {
//         signal: "SIGTERM" as const,
//         sent_at_ms: 0,
//         delivery: "signaled" as const,
//       },
//     ],
//     elapsed_ms: 10,
//   };
//   expect(
//     finalizationConsistencyIssue({
//       reason: "exited",
//       finalization,
//     }),
//     "an exited reason cannot carry finalization",
//   ).toContain("finalization");
//   expect(
//     finalizationConsistencyIssue({
//       reason: "timeout",
//       finalization: {
//         ...finalization,
//         signals: [{ signal: "SIGKILL", sent_at_ms: 500 }],
//       },
//     }),
//     "the first attempt is SIGTERM",
//   ).toContain("SIGTERM");
//   expect(
//     finalizationConsistencyIssue({
//       reason: "timeout",
//       finalization: {
//         ...finalization,
//         signals: [
//           { signal: "SIGTERM", sent_at_ms: 0 },
//           { signal: "SIGKILL", sent_at_ms: 500 },
//           { signal: "SIGKILL", sent_at_ms: 600 },
//         ],
//       },
//     }),
//     "only one SIGKILL is allowed",
//   ).toContain("one final SIGKILL");
//   expect(
//     finalizationConsistencyIssue({
//       reason: "timeout",
//       finalization: {
//         ...finalization,
//         signals: [
//           { signal: "SIGTERM", sent_at_ms: 10 },
//           { signal: "SIGKILL", sent_at_ms: 5 },
//         ],
//       },
//     }),
//     "attempt times stay ordered",
//   ).toContain("must not decrease");
//   expect(
//     finalizationConsistencyIssue({
//       reason: "timeout",
//       finalization: {
//         ...finalization,
//         signals: [
//           { signal: "SIGTERM", sent_at_ms: 0 },
//           { signal: "SIGKILL", sent_at_ms: 499 },
//         ],
//       },
//     }),
//     "a non-cancelled early SIGKILL is rejected",
//   ).toContain("requested interval");
//   expect(
//     finalizationConsistencyIssue({
//       reason: "cancelled",
//       finalization: {
//         ...finalization,
//         signals: [
//           { signal: "SIGTERM", sent_at_ms: 0 },
//           { signal: "SIGKILL", sent_at_ms: 1 },
//         ],
//       },
//     }),
//     "a cancelled early SIGKILL is accepted",
//   ).toBeUndefined();
//   expect(
//     finalizationConsistencyIssue({
//       reason: "timeout",
//       finalization: {
//         ...finalization,
//         signals: [{ signal: "SIGTERM", sent_at_ms: 1 }],
//         elapsed_ms: 0,
//       },
//     }),
//     "the observed exit cannot precede the first attempt",
//   ).toContain("elapsed_ms");
//   expect(
//     finalizationConsistencyIssue({
//       reason: "timeout",
//       finalization: { ...finalization, elapsed_ms: null },
//     }),
//     "an observed exit requires elapsed time",
//   ).toContain("elapsed_ms");
//   expect(
//     finalizationConsistencyIssue(
//       { reason: "timeout" },
//       { finalization_ms: 500 },
//     ),
//     "a deadline exit with a committed interval must carry the record",
//   ).toContain("finalization evidence");
// });
//
// it("validates finalization evidence in partial captures and rejects malformed records", () => {
//   const { cleanup: _cleanup, ...completed } = emptyCapture();
//   const partial = (exit: Record<string, unknown>) =>
//     partialProcessCaptureObservationSchema.safeParse({
//       capture: { ...completed, exit },
//       cleanup: {
//         owned_process_group: { state: "cleaned", reason: null },
//         terminal_renderer: { state: "cleaned", reason: null },
//         temporary_root: { state: "cleaned", reason: null },
//       },
//       execution_failure: "capture ended after a fixture error",
//     });
//   const partialWithCommittedFinalization = (exit: Record<string, unknown>) => {
//     const { cleanup: _cleanup, ...completed } = withCommittedFinalization(500, {
//       code: null,
//       signal: null,
//       reason: "timeout",
//     });
//     return partialProcessCaptureObservationSchema.safeParse({
//       capture: { ...completed, exit },
//       cleanup: {
//         owned_process_group: { state: "cleaned", reason: null },
//         terminal_renderer: { state: "cleaned", reason: null },
//         temporary_root: { state: "cleaned", reason: null },
//       },
//       execution_failure: "capture ended after a fixture error",
//     });
//   };
//   const finalization = {
//     requested_ms: 500,
//     exit_code: null,
//     signals: [
//       {
//         signal: "SIGTERM" as const,
//         sent_at_ms: 0,
//         delivery: "signaled" as const,
//       },
//     ],
//     elapsed_ms: 10,
//   };
//
//   expect(
//     partial({ code: null, signal: null, reason: "timeout" }).success,
//     "a partial exit without finalization stays valid",
//   ).toBe(true);
//   expect(
//     partial({ code: 0, signal: null, reason: "exited", finalization }).success,
//     "a partial exit cannot finalize without a deadline",
//   ).toBe(false);
//   expect(
//     partial({
//       code: null,
//       signal: null,
//       reason: "timeout",
//       finalization: { ...finalization, requested_ms: 700 },
//     }).success,
//     "a partial record must match the committed interval",
//   ).toBe(false);
//   expect(
//     partialWithCommittedFinalization({
//       code: null,
//       signal: null,
//       reason: "timeout",
//       finalization: { ...finalization, elapsed_ms: null },
//     })
//       .error?.issues.map(({ message }) => message)
//       .join("; "),
//     "a capture variant requires an observed finalization exit time",
//   ).toContain("elapsed_ms");
//   expect(
//     () =>
//       parseProcessCapture(
//         withCommittedFinalization(500, {
//           code: null,
//           signal: null,
//           reason: "timeout",
//           finalization: {
//             ...finalization,
//             signals: [
//               { signal: "SIGINT", sent_at_ms: 0, delivery: "signaled" },
//             ],
//           },
//         }),
//       ),
//     "only SIGTERM can start finalization",
//   ).toThrow();
//   expect(
//     () =>
//       parseProcessCapture(
//         withCommittedFinalization(500, {
//           code: null,
//           signal: null,
//           reason: "timeout",
//           finalization: { ...finalization, elapsed_ms: -1 },
//         }),
//       ),
export const _l = 225;
