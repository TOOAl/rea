export const __stub = 1;
//       delivery: "unverified",
//       reason: "signal transport failed",
//     },
//   ]);
// });
//
// it("keeps an observed exit when a late kill delivery reports unverified", async () => {
//   let release: () => void = () => undefined;
//   const hold = new Promise<void>((resolve) => {
//     release = resolve;
//   });
//   const fake = fakeTerminal({ SIGKILL: "unverified" }, hold);
//   const pending = start(fake, { timeout_ms: 100, finalization_ms: 100 });
//   await waitFor(() => fake.signals.includes("SIGKILL"));
//   fake.deliverExit({ exitCode: 0, signal: 9 });
//   release();
//
//   const result = await pending;
//
//   expect(
//     result.unobserved,
//     "an exit that was already observed is never turned into an unobserved one",
//   ).not.toBe(true);
//   expect(observed(result).signal, "the observed exit signal is retained").toBe(
//     9,
//   );
// });
//
// it("stops waiting when the escalation delivery never settles and no exit arrives", async () => {
//   const fake = fakeTerminal({}, new Promise<void>(() => undefined));
//   const waitStarted = Date.now();
//   const pending = start(fake, { timeout_ms: 100, finalization_ms: 100 });
//
//   const result = await pending;
//
//   expect(
//     Date.now() - waitStarted,
//     "the wait is bounded by the one-second cleanup grace after the interval",
//   ).toBeLessThan(2_500);
//   expect(result.unobserved, "no exit is invented").toBe(true);
//   expect(
//     result.finalization?.signals.at(-1),
//     "the undelivered escalation stays recorded as unverified",
//   ).toMatchObject({
//     signal: "SIGKILL",
//     delivery: "unverified",
//     reason: "delivery did not settle within 1000 ms",
//   });
//   expect(result.finalization?.elapsed_ms, "no exit was observed").toBeNull();
// }, 10_000);
//
// const activeTimers = (): number =>
//   process.getActiveResourcesInfo().filter((name) => name === "Timeout").length;
//
// it("leaves no referenced timer behind after a zero-interval exit", async () => {
//   const fake = fakeTerminal();
//   const before = activeTimers();
//   const pending = start(fake, { timeout_ms: 60, finalization_ms: 0 });
//   await waitFor(() => fake.signals.includes("terminal:SIGKILL"));
//   fake.deliverExit({ exitCode: 0, signal: 9 });
//
//   await pending;
//
//   expect(
//     activeTimers(),
//     "the zero path resolves without a bounded-wait timer",
//   ).toBeLessThanOrEqual(before);
// });
//
// it("cancels the bounded-wait timer once deliveries settle after an exit", async () => {
//   const fake = fakeTerminal();
//   const before = activeTimers();
//   const pending = start(fake, { timeout_ms: 100, finalization_ms: 5_000 });
//   await waitFor(() => fake.signals.includes("SIGTERM"));
//   fake.deliverExit({ exitCode: 0, signal: 0 });
//
//   await pending;
//   await new Promise((resolve) => setImmediate(resolve));
//
//   expect(
//     activeTimers(),
//     "no one-second grace timer outlives the finalized exit",
//   ).toBeLessThanOrEqual(before);
// });
//
// it("keeps a non-empty reason when a signal delivery throws without a message", async () => {
//   const fake = fakeTerminal();
//   const throwing = {
//     ...fake,
//     signalTarget: async (): Promise<never> => {
//       throw new Error();
//     },
//   };
//   const pending = start(throwing, { timeout_ms: 100, finalization_ms: 5_000 });
//   await waitFor(() => throwing.signals.length >= 0);
//   await new Promise((resolve) => setTimeout(resolve, 150));
//   throwing.deliverExit({ exitCode: 0, signal: 0 });
//
//   const exit = observed(await pending);
//
//   expect(
//     exit.finalization?.signals[0]?.reason?.length,
//     "a thrown error without a message still leaves a named reason",
//   ).toBeGreaterThan(0);
// });
//
// it("never publishes an unverified attempt without a reason, also while it is in flight", async () => {
//   const fake = fakeTerminal();
//   let calls = 0;
//   const custom = {
//     ...fake,
//     signalTarget: (signal: "SIGTERM" | "SIGKILL") => {
//       calls += 1;
//       fake.signals.push(signal);
//       return calls === 1
//         ? new Promise<never>(() => undefined)
//         : Promise.resolve({ delivery: "identity-changed" as const });
//     },
//   };
//   const pending = start(custom, { timeout_ms: 50, finalization_ms: 20 });
//
//   const result = await pending;
//
//   expect(result.unobserved, "the undeliverable escalation ends the wait").toBe(
//     true,
//   );
//   expect(
//     result.finalization?.signals[0],
//     "the still-undelivered SIGTERM carries a reason, as the capture schema requires",
//   ).toMatchObject({ signal: "SIGTERM", delivery: "unverified" });
//   expect(
//     result.finalization?.signals[0]?.reason?.length,
//     "the in-flight attempt is never published without a reason",
//   ).toBeGreaterThan(0);
// });
export const _l = 135;
