export const __stub = 1;
//     "elapsed time cannot be negative",
//   ).toThrow();
// });
//
// it("binds the comparison contract to the committed finalization interval", () => {
//   const exit = { code: 0, signal: null, reason: "exited" };
//
//   expect(
//     () => parseProcessCapture(withCommittedFinalization(500, exit, "absent")),
//     "a scenario interval missing from the comparison contract is contradictory",
//   ).toThrow("comparison_contract");
//   expect(
//     () => parseProcessCapture(withCommittedFinalization(500, exit, 900)),
//     "a different comparison interval is contradictory",
//   ).toThrow("comparison_contract");
//   expect(
//     () => parseProcessCapture(withCommittedFinalization(undefined, exit, 500)),
//     "a comparison interval the scenario never committed is contradictory",
//   ).toThrow("comparison_contract");
// });
//
// // This single scenario shares one deliberately complete incomplete-capture fixture.
// // oxlint-disable-next-line max-lines-per-function
// it("validates finalization evidence in incomplete observations", () => {
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
//   const unavailable = { state: "unavailable", reason: "not observed" };
//   const incomplete = (
//     exit: Record<string, unknown> | undefined,
//     manifest: ReturnType<typeof withCommittedFinalization>["manifest"],
//     incompleteFinalization: Record<string, unknown> | undefined = undefined,
//   ) => {
//     const result = partialProcessCaptureObservationSchema.safeParse({
//       observations: {
//         target_pid: unavailable,
//         frames: { state: "available", value: [] },
//         rendered_frames: unavailable,
//         interaction_events: unavailable,
//         exit:
//           exit === undefined
//             ? unavailable
//             : { state: "available", value: exit },
//         finalization:
//           incompleteFinalization === undefined
//             ? unavailable
//             : { state: "available", value: incompleteFinalization },
//         settlement: unavailable,
//         process_samples: unavailable,
//         filesystem_snapshots: { before: unavailable, after: unavailable },
//         event_journal: unavailable,
//         manifest: { state: "available", value: manifest },
//       },
//       cleanup: {
//         owned_process_group: { state: "cleaned", reason: null },
//         terminal_renderer: { state: "cleaned", reason: null },
//         temporary_root: { state: "cleaned", reason: null },
//       },
//       execution_failure: "capture ended after a fixture error",
//     });
//     return {
//       success: result.success,
//       messages: result.success
//         ? ""
//         : result.error.issues.map(({ message }) => message).join("; "),
//     };
//   };
//   const timeout = { code: null, signal: null, reason: "timeout" };
//   const normal = { code: 0, signal: null, reason: "exited" };
//   const committed = withCommittedFinalization(500, timeout).manifest;
//
//   expect(
//     incomplete({ ...timeout, finalization }, committed).success,
//     "a consistent incomplete record is accepted",
//   ).toBe(true);
//   expect(
//     incomplete({ ...timeout, finalization }, committed, { ...finalization })
//       .success,
//     "matching exit and sibling finalization observations are accepted",
//   ).toBe(true);
//   const disagreement = incomplete({ ...timeout, finalization }, committed, {
//     ...finalization,
//     elapsed_ms: 11,
//   });
//   expect(
//     disagreement.success,
//     "conflicting finalization observations are rejected",
//   ).toBe(false);
//   expect(disagreement.messages, "the conflict names finalization").toContain(
//     "finalization observation must agree",
//   );
//   expect(
//     incomplete(undefined, committed, { ...finalization, elapsed_ms: null })
//       .success,
//     "a finalization observed without an exit permits null elapsed time",
//   ).toBe(true);
//   const unavailableExitElapsed = incomplete(undefined, committed, finalization);
//   expect(
//     unavailableExitElapsed.success,
//     "a finalization without an exit rejects a claimed elapsed time",
//   ).toBe(false);
//   expect(
//     unavailableExitElapsed.messages,
//     "the unavailable-exit rule names elapsed_ms",
//   ).toContain("elapsed_ms");
//   const sigkillFirst = incomplete(undefined, committed, {
//     ...finalization,
//     elapsed_ms: null,
//     signals: [{ signal: "SIGKILL", sent_at_ms: 0, delivery: "signaled" }],
//   });
//   expect(
//     sigkillFirst.success,
//     "an incomplete finalization still starts with SIGTERM",
//   ).toBe(false);
//   expect(
//     sigkillFirst.messages,
//     "only the SIGTERM-first rule fires, not the null-elapsed rule",
//   ).toContain("start with SIGTERM");
//   expect(
//     incomplete(normal, withCommittedFinalization(undefined, normal).manifest)
//       .success,
//     "an incomplete capture that never committed an interval is accepted",
//   ).toBe(true);
//   expect(
//     incomplete(
//       { code: 0, signal: null, reason: "exited", finalization },
//       committed,
//     ).success,
//     "an incomplete exit cannot finalize without a deadline",
//   ).toBe(false);
//   expect(
//     incomplete(
//       { ...timeout, finalization: { ...finalization, requested_ms: 700 } },
//       committed,
//     ).success,
//     "an incomplete record must match the committed interval",
//   ).toBe(false);
//   const scenarioOnly = withCommittedFinalization(
//     500,
//     normal,
//     "absent",
//   ).manifest;
//   const comparisonOnly = withCommittedFinalization(
//     undefined,
//     normal,
//     500,
//   ).manifest;
//   const differing = withCommittedFinalization(500, normal, 900).manifest;
//   for (const [label, manifest] of [
//     ["a scenario interval missing from the comparison contract", scenarioOnly],
//     ["a comparison interval the scenario never committed", comparisonOnly],
//     ["differing intervals", differing],
//   ] as const) {
//     const verdict = incomplete(normal, manifest);
//     expect(verdict.success, `${label} is rejected`).toBe(false);
//     expect(
//       verdict.messages,
//       `${label} is rejected for the comparison contract`,
//     ).toContain("comparison_contract");
//   }
//   const earlyKill = {
//     requested_ms: 500,
//     exit_code: null,
//     elapsed_ms: 600,
//     signals: [
//       { signal: "SIGTERM", sent_at_ms: 0, delivery: "signaled" },
//       { signal: "SIGKILL", sent_at_ms: 40, delivery: "unverified" },
//     ],
//   };
//   expect(
//     incomplete(
//       {
//         code: null,
//         signal: null,
//         reason: "cancelled",
//         finalization: earlyKill,
//       },
//       committed,
//       earlyKill,
//     ).success,
//     "a cancellation may keep an early SIGKILL attempt",
//   ).toBe(true);
//   const earlyKillDeadline = incomplete(
//     { ...timeout, finalization: earlyKill },
//     committed,
//     earlyKill,
//   );
//   expect(
//     earlyKillDeadline.success,
//     "a deadline exit cannot carry a SIGKILL before the requested interval",
//   ).toBe(false);
//   expect(
//     earlyKillDeadline.messages,
//     "the early SIGKILL negative isolates the requested interval rule",
//   ).toContain("requested interval");
//   expect(
//     incomplete(undefined, differing).success,
//     "an unavailable exit still cannot hide a contradictory manifest",
//   ).toBe(false);
// });
//
// it("rejects chronologically impossible or repeated finalization attempts", () => {
//   const attempt = (signal: "SIGTERM" | "SIGKILL", sent_at_ms: number) => ({
//     signal,
//     sent_at_ms,
//     delivery: "signaled" as const,
//   });
//   const exit = (
//     elapsed_ms: number | null,
//     signals: ReturnType<typeof attempt>[],
//   ) => ({
//     reason: "timeout",
//     finalization: { requested_ms: 500, elapsed_ms, exit_code: null, signals },
//   });
//
//   expect(
export const _l = 225;
