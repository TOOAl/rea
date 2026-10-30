export const __stub = 1;
//     finalizationConsistencyIssue(
//       exit(10, [attempt("SIGTERM", 0), attempt("SIGKILL", 500)]),
//     ),
//     "an exit cannot be observed before the last recorded attempt",
//   ).toContain("elapsed_ms");
//   expect(
//     finalizationConsistencyIssue(
//       exit(600, [attempt("SIGTERM", 0), attempt("SIGTERM", 10)]),
//     ),
//     "SIGTERM is attempted once",
//   ).toContain("finalization");
//   expect(
//     finalizationConsistencyIssue(
//       exit(600, [attempt("SIGTERM", 0), attempt("SIGKILL", 500)]),
//     ),
//     "a consistent record is accepted",
//   ).toBeUndefined();
// });
//
// it("keeps the finalization exit code tied to an observed exit not caused by a signal", () => {
//   const attempt = {
//     signal: "SIGTERM" as const,
//     sent_at_ms: 0,
//     delivery: "signaled" as const,
//   };
//   const record = (
//     elapsed_ms: number | null,
//     exit_code: number | null,
//     signal?: number | null,
//   ) => ({
//     reason: "timeout",
//     ...(signal === undefined ? {} : { signal }),
//     finalization: {
//       requested_ms: 500,
//       elapsed_ms,
//       exit_code,
//       signals: [attempt],
//     },
//   });
//
//   expect(
//     finalizationConsistencyIssue(record(10, 3, 0)),
//     "a code reported for an exit without a signal is accepted",
//   ).toBeUndefined();
//   expect(
//     finalizationConsistencyIssue(record(10, 3, 9)),
//     "a code cannot accompany an exit ended by a signal",
//   ).toContain("exit_code");
//   expect(
//     finalizationConsistencyIssue(record(10, null, 9)),
//     "a signal exit records a null code",
//   ).toBeUndefined();
//
//   const schemaFinalization = {
//     requested_ms: 500,
//     elapsed_ms: null,
//     exit_code: 3,
//     signals: [attempt],
//   };
//   expect(
//     () =>
//       parseProcessCapture(
//         withCommittedFinalization(500, {
//           code: null,
//           signal: null,
//           reason: "timeout",
//           finalization: schemaFinalization,
//         }),
//       ),
//     "an exit code needs an observed exit",
//   ).toThrow("exit_code");
// });
//
// it("accepts the canonical finalized capture example", () => {
//   expect(
//     parseProcessCapture(FINALIZED_PROCESS_CAPTURE_EXAMPLE).exit,
//     "the advertised finalized example is a valid capture",
//   ).toMatchObject({
//     reason: "timeout",
//     finalization: { requested_ms: 1_500, signals: [{ signal: "SIGTERM" }] },
//   });
// });
//
// it("requires an explicit journal and validates complete journals", () => {
//   const capture = emptyCapture();
//   const { event_journal: _eventJournal, ...oldCapture } = capture;
//   expect(() => parseProcessCapture(oldCapture)).toThrow("event_journal");
//
//   const eventJournal = [
//     { capture_order: 0, collection: "filesystem_checkpoints", index: 0 },
//     { capture_order: 1, collection: "lifecycle", index: 0 },
//     { capture_order: 2, collection: "lifecycle", index: 1 },
//     { capture_order: 3, collection: "filesystem_checkpoints", index: 1 },
//   ] as const;
//   expect(
//     processCaptureIssues({ ...capture, event_journal: eventJournal }),
//   ).toEqual([]);
//
//   for (const [candidate, message] of [
//     [
//       eventJournal.map((entry, index) =>
//         index === 1 ? { ...entry, capture_order: 2 } : entry,
//       ),
//       "contiguous",
//     ],
//     [
//       eventJournal.map((entry, index) =>
//         index === 3
//           ? { ...entry, collection: "lifecycle" as const, index: 1 }
//           : entry,
//       ),
//       "unique",
//     ],
//     [eventJournal.slice(0, 3), "every captured observation"],
//     [
//       eventJournal.map((entry, index) =>
//         index === 3 ? { ...entry, index: 2 } : entry,
//       ),
//       "outside",
//     ],
//   ] as const) {
//     expect(
//       processCaptureIssues({ ...capture, event_journal: candidate }),
//     ).toEqual(
//       expect.arrayContaining([
//         expect.objectContaining({
//           message: expect.stringContaining(message),
//         }),
//       ]),
//     );
//   }
// });
//
// it("rejects old executable identity representations without migration", () => {
//   const capture = emptyCapture();
//   const {
//     selected_executable_sha256: _selected,
//     executable_identity: _identity,
//     ...oldManifest
//   } = capture.manifest;
//   expect(() =>
//     parseProcessCapture({ ...capture, manifest: oldManifest }),
//   ).toThrow();
//   expect(() =>
//     parseProcessCapture({
//       ...capture,
//       manifest: {
//         ...capture.manifest,
//         legacy_executable_sha256: capture.manifest.executable_sha256,
//       },
//     }),
//   ).toThrow("legacy_executable_sha256");
// });
//
// it("requires compatible contracts and enforces capture age through a clock seam", () => {
//   const capture = emptyCapture();
//   expect(() =>
//     compareProcessCaptures(capture, {
//       ...capture,
//       manifest: {
//         ...capture.manifest,
//         comparison_contract: { changed: true },
//         comparison_contract_sha256: digestProcessCommitment({
//           changed: true,
//         }),
//       },
//     }),
//   ).toThrow(
//     expect.objectContaining({
//       issues: [
//         expect.objectContaining({
//           path: ["right"],
//           message: expect.stringContaining(
//             "incompatible comparison contracts; these scenario fields differ: changed",
//           ),
//           expected: ["changed"],
//         }),
//       ],
//     }),
//   );
//   expect(() =>
//     compareProcessCaptures(capture, capture, {
//       maxCaptureAgeMs: 1,
//       now: () => Date.parse("2026-01-01T00:00:01.000Z"),
//     }),
//   ).toThrow(
//     expect.objectContaining({
//       issues: [
//         expect.objectContaining({
//           path: ["max_capture_age_ms"],
//           reason: "out_of_range",
//           message: expect.stringContaining("left completed at"),
//         }),
//       ],
//     }),
//   );
// });
//
// it("requires interaction dispatch times to follow their sequence", () => {
//   const capture = emptyCapture();
//   const interaction = (sequence: number, dispatched: number) => ({
//     sequence,
//     scheduled_at_ms: 0,
//     dispatched_at_ms: dispatched,
//     type: "input" as const,
//     data: "x",
//     outcome: "dispatched" as const,
//   });
//   const issues = (dispatched: readonly number[]) =>
//     processCaptureIssues({
//       ...capture,
//       interaction_events: dispatched.map((at, index) => interaction(index, at)),
//     }).filter(({ message }) => message.includes("dispatch timestamps"));
//   expect(issues([5, 5, 10])).toEqual([]);
//   expect(issues([10, 5])).toEqual([
//     {
//       path: "interaction_events",
//       message: expect.stringContaining("dispatch timestamps must be ordered"),
//     },
//   ]);
// });
export const _l = 221;
