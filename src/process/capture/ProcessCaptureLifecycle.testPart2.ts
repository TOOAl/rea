export const __stub = 1;
//   );
//   expect(
//     fake.signals.filter((signal) => signal === "SIGKILL"),
//     "the abort branch itself sent one SIGKILL, long before the interval ended",
//   ).toHaveLength(1);
//   expect(
//     exit.finalization?.signals.map(({ signal }) => signal),
//     "cancellation records both attempts",
//   ).toEqual(["SIGTERM", "SIGKILL"]);
//   expect(
//     fake.signals.filter((signal) => signal.startsWith("terminal:")),
//     "cancellation during finalization never uses a bare terminal kill",
//   ).toEqual([]);
// });
//
// it("records escalation attempts alongside an observed SIGKILL exit", async () => {
//   const fake = fakeTerminal();
//   const pending = start(fake, { timeout_ms: 100, finalization_ms: 100 });
//   await waitFor(() => fake.signals.includes("SIGKILL"));
//   fake.deliverExit({ exitCode: 0, signal: 9 });
//
//   const exit = observed(await pending);
//
//   expect(
//     exit.finalization?.signals,
//     "both finalization attempts are recorded",
//   ).toMatchObject([
//     { signal: "SIGTERM", delivery: "signaled" },
//     { signal: "SIGKILL", delivery: "signaled" },
//   ]);
//   expect(exit.signal, "the observed exit signal is retained separately").toBe(
//     9,
//   );
//   expect(
//     exit.finalization?.elapsed_ms,
//     "the escalation waited for the whole interval",
//   ).toBeGreaterThanOrEqual(100);
// });
//
// it("records a scripted SIGKILL exit without inferring its cause", async () => {
//   const fake = fakeTerminal();
//   const pending = start(fake, { timeout_ms: 100, finalization_ms: 5_000 });
//   await waitFor(() => fake.signals.includes("SIGTERM"));
//   fake.deliverExit({ exitCode: 0, signal: 9 });
//
//   const exit = observed(await pending);
//
//   expect(
//     fake.signals,
//     "the harness itself never escalated inside the interval",
//   ).not.toContain("SIGKILL");
//   expect(
//     exit.finalization?.signals,
//     "only the SIGTERM attempt was made",
//   ).toMatchObject([{ signal: "SIGTERM", delivery: "signaled" }]);
//   expect(exit.signal, "the observed SIGKILL remains an exit fact").toBe(9);
// });
//
// it.each([
//   [3, 3],
//   [0, 0],
//   [7, 7],
// ] as const)(
//   "records exit code %i of a finalizer that exits on its own as %i",
//   async (exitCode, expected) => {
//     const fake = fakeTerminal();
//     const pending = start(fake, { timeout_ms: 100, finalization_ms: 5_000 });
//     await waitFor(() => fake.signals.includes("SIGTERM"));
//     fake.deliverExit({ exitCode, signal: 0 });
//
//     const exit = observed(await pending);
//
//     expect(
//       exit.finalization?.exit_code,
//       "the PTY-reported code of an exit not caused by a signal is recorded",
//     ).toBe(expected);
//     expect(exit.reason, "the initiating deadline stays the exit reason").toBe(
//       "timeout",
//     );
//   },
// );
//
// it("records no exit code when the finalizing target was ended by a signal", async () => {
//   const fake = fakeTerminal();
//   const pending = start(fake, { timeout_ms: 100, finalization_ms: 100 });
//   await waitFor(() => fake.signals.includes("SIGKILL"));
//   fake.deliverExit({ exitCode: 0, signal: 9 });
//
//   const exit = observed(await pending);
//
//   expect(
//     exit.finalization?.exit_code,
//     "a code reported next to a terminating signal is never recorded",
//   ).toBeNull();
//   expect(exit.signal, "the signal remains the observed exit fact").toBe(9);
// });
//
// it("records no exit code when the PTY reports a negative code without a signal", async () => {
//   const fake = fakeTerminal();
//   const pending = start(fake, { timeout_ms: 100, finalization_ms: 5_000 });
//   await waitFor(() => fake.signals.includes("SIGTERM"));
//   fake.deliverExit({ exitCode: -1, signal: 0 });
//
//   const exit = observed(await pending);
//
//   expect(
//     exit.finalization?.exit_code,
//     "a negative PTY code is not a process exit code and is never recorded",
//   ).toBeNull();
//   expect(exit.reason, "the initiating deadline stays the exit reason").toBe(
//     "timeout",
//   );
// });
//
// it("records no exit code when no exit was observed", async () => {
//   const fake = fakeTerminal({}, new Promise<void>(() => undefined));
//   const pending = start(fake, { timeout_ms: 100, finalization_ms: 100 });
//
//   const result = await pending;
//
//   expect(result.unobserved, "no exit is invented").toBe(true);
//   expect(
//     result.finalization?.exit_code,
//     "an unobserved exit has no code to record",
//   ).toBeNull();
// }, 10_000);
//
// it("records every delivery result and publishes attempts incrementally", async () => {
//   snapshots.length = 0;
//   const fake = fakeTerminal({ SIGTERM: "gone", SIGKILL: "gone" });
//   const pending = start(fake, { timeout_ms: 100, finalization_ms: 100 });
//   await waitFor(() => fake.signals.includes("SIGKILL"));
//   fake.deliverExit({ exitCode: 0, signal: 9 });
//
//   const exit = observed(await pending);
//
//   expect(
//     exit.finalization?.signals.map(({ delivery }) => delivery),
export const _l = 138;
