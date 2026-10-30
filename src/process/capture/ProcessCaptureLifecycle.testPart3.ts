export const __stub = 1;
//     "both delivery results are kept as reported",
//   ).toEqual(["gone", "gone"]);
//   expect(
//     snapshots.map(({ signals }) => signals.length),
//     "the first attempt was published before the escalation existed",
//   ).toContain(1);
//   expect(
//     snapshots.at(-1)?.signals.length,
//     "the last published record holds both attempts",
//   ).toBe(2);
// });
//
// it.each(["identity-changed", "unverified"] as const)(
//   "stops waiting for an exit when the escalation reports %s",
//   async (delivery) => {
//     snapshots.length = 0;
//     const fake = fakeTerminal({ SIGTERM: "signaled", SIGKILL: delivery });
//     const pending = start(fake, { timeout_ms: 100, finalization_ms: 100 });
//
//     const result = await pending;
//
//     expect(result.unobserved, "no exit is invented").toBe(true);
//     expect(result.reason, "the initiating deadline is retained").toBe(
//       "timeout",
//     );
//     expect(
//       result.finalization,
//       "attempts and the undelivered result are kept",
//     ).toMatchObject({
//       elapsed_ms: null,
//       signals: [
//         { signal: "SIGTERM", delivery: "signaled" },
//         { signal: "SIGKILL", delivery },
//       ],
//     });
//     expect(
//       fake.signals.filter((signal) => signal.startsWith("terminal:")),
//       "a failed identity check never falls back to a bare terminal kill",
//     ).toEqual([]);
//   },
// );
//
// it("returns at once when a cancellation kill cannot be delivered", async () => {
//   const fake = fakeTerminal({ SIGKILL: "unverified" });
//   const controller = new AbortController();
//   const pending = start(
//     fake,
//     { timeout_ms: 100, finalization_ms: 60_000 },
//     controller.signal,
//   );
//   await waitFor(() => fake.signals.includes("SIGTERM"));
//   controller.abort();
//
//   const result = await pending;
//
//   expect(result.reason, "cancellation replaces the deadline").toBe("cancelled");
//   expect(result.unobserved, "the capture does not wait for an exit").toBe(true);
// });
//
// it("waits for a pending delivery before reporting an observed exit", async () => {
//   let release: () => void = () => undefined;
//   const hold = new Promise<void>((resolve) => {
//     release = resolve;
//   });
//   const fake = fakeTerminal({ SIGTERM: "signaled" }, hold);
//   const pending = start(fake, { timeout_ms: 100, finalization_ms: 5_000 });
//   await waitFor(() => fake.signals.includes("SIGTERM"));
//   fake.deliverExit({ exitCode: 0, signal: 0 });
//   let settled = false;
//   void pending.then(() => {
//     settled = true;
//   });
//   await new Promise((resolve) => setTimeout(resolve, 40));
//   expect(settled, "the result waits for the outstanding delivery").toBe(false);
//
//   release();
//   const exit = observed(await pending);
//
//   expect(
//     exit.finalization?.signals,
//     "the delivery result is complete in the published record",
//   ).toMatchObject([{ signal: "SIGTERM", delivery: "signaled" }]);
// });
//
// it("keeps the zero-interval deadline as a bare SIGKILL", async () => {
//   const fake = fakeTerminal();
//   const pending = start(fake, { timeout_ms: 60, finalization_ms: 0 });
//   await waitFor(() => fake.signals.includes("terminal:SIGKILL"));
//   fake.deliverExit({ exitCode: 0, signal: 9 });
//
//   const exit = observed(await pending);
//
//   expect(
//     fake.signals.filter((signal) => !signal.startsWith("terminal:")),
//     "the identity-checked signaller is never used without an interval",
//   ).toEqual([]);
//   expect(exit.finalization, "no finalization record exists").toBeUndefined();
// });
//
// it("stops waiting for a hung delivery once the exit is observed", async () => {
//   const fake = fakeTerminal({}, new Promise<void>(() => undefined));
//   const pending = start(fake, { timeout_ms: 100, finalization_ms: 5_000 });
//   await waitFor(() => fake.signals.includes("SIGTERM"));
//   fake.deliverExit({ exitCode: 0, signal: 0 });
//
//   const exit = observed(await pending);
//
//   expect(
//     exit.finalization?.signals,
//     "an undelivered attempt stays recorded as unverified",
//   ).toMatchObject([
//     {
//       signal: "SIGTERM",
//       delivery: "unverified",
//       reason: "delivery did not settle within 1000 ms",
//     },
//   ]);
//   expect(exit.signal, "the observed exit is kept").toBe(0);
// }, 10_000);
//
// it("retains a thrown signal error as an unverified delivery reason", async () => {
//   const fake = fakeTerminal(
//     {},
//     undefined,
//     new Error("signal transport failed"),
//   );
//   const pending = start(fake, { timeout_ms: 100, finalization_ms: 5_000 });
//   await waitFor(() => fake.signals.includes("SIGTERM"));
//   fake.deliverExit({ exitCode: 0, signal: 0 });
//
//   const exit = observed(await pending);
//
//   expect(
//     exit.finalization?.signals,
//     "a rejected signal retains its error message",
//   ).toMatchObject([
//     {
//       signal: "SIGTERM",
export const _l = 138;
