export const __stub = 1;
// import { expect, it } from "vitest";
// import type { IPty } from "@lydell/node-pty";
//
// import { parseProcessScenario } from "../../domain/process/processScenario.js";
// import type { ProcessCaptureFinalization } from "../../domain/process/processCapture.js";
// import { awaitTerminalExit } from "./ProcessCaptureLifecycle.js";
// import type { ProcessTimer } from "./ProcessTimer.js";
// import { monotonicProcessCaptureClock } from "./ProcessCaptureClock.js";
//
// type Delivery = ProcessCaptureFinalization["signals"][number]["delivery"];
//
// interface FakeExit {
//   readonly exitCode: number;
//   readonly signal?: number;
// }
//
// /**
//  * Terminal whose exit notification the test delivers when it chooses, plus
//  * the identity-checked signaller that finalization uses instead of a bare
//  * terminal kill. Both record into `signals`.
//  */
// const fakeTerminal = (
//   deliveries: Partial<Record<"SIGTERM" | "SIGKILL", Delivery>> = {},
//   hold?: Promise<void>,
//   signalFailure?: Error,
// ) => {
//   let listener: ((exit: FakeExit) => void) | undefined;
//   const signals: string[] = [];
//   const terminal: Pick<IPty, "onExit" | "kill"> = {
//     onExit: (next) => {
//       listener = next;
//       return { dispose: () => undefined };
//     },
//     kill: (signal) => {
//       signals.push(`terminal:${signal ?? "SIGHUP"}`);
//     },
//   };
//   const signalTarget = async (
//     signal: "SIGTERM" | "SIGKILL",
//   ): Promise<{ readonly delivery: Delivery }> => {
//     signals.push(signal);
//     await hold;
//     if (signalFailure !== undefined) throw signalFailure;
//     return { delivery: deliveries[signal] ?? "signaled" };
//   };
//   return {
//     signals,
//     terminal,
//     signalTarget,
//     deliverExit: (exit: FakeExit) => listener?.(exit),
//   };
// };
//
// const waitFor = async (condition: () => boolean): Promise<void> => {
//   const deadline = Date.now() + 3_000;
//   while (!condition()) {
//     if (Date.now() > deadline) throw new Error("condition not reached");
//     await new Promise((resolve) => setTimeout(resolve, 5));
//   }
// };
//
// const snapshots: ProcessCaptureFinalization[] = [];
//
// const observed = <Result extends { readonly unobserved?: boolean }>(
//   result: Result,
// ): Exclude<Result, { readonly unobserved: true }> => {
//   if (result.unobserved === true) throw new Error("exit was not observed");
//   return result as Exclude<Result, { readonly unobserved: true }>;
// };
//
// const start = (
//   fake: ReturnType<typeof fakeTerminal>,
//   scenario: Readonly<Record<string, unknown>>,
//   signal?: AbortSignal,
// ) =>
//   awaitTerminalExit({
//     terminal: fake.terminal,
//     scenario: parseProcessScenario({
//       executable: "unused",
//       idle_timeout_ms: 10_000,
//       ...scenario,
//     }),
//     started: monotonicProcessCaptureClock(),
//     lastOutput: monotonicProcessCaptureClock,
//     signal,
//     signalTarget: fake.signalTarget,
//     recordFinalization: (snapshot) => {
//       snapshots.push(snapshot);
//     },
//     timers: new Set<ProcessTimer>(),
//     interactions: [],
//     dispatchedEventIndexes: new Set<number>(),
//     recordEvent: () => undefined,
//   });
//
// it("records attempts when a self-exit notification arrives after escalation", async () => {
//   const fake = fakeTerminal();
//   const pending = start(fake, { timeout_ms: 100, finalization_ms: 100 });
//   await waitFor(() => fake.signals.includes("SIGKILL"));
//   await new Promise((resolve) => setTimeout(resolve, 150));
//   fake.deliverExit({ exitCode: 0, signal: 0 });
//
//   const exit = observed(await pending);
//
//   expect(
//     exit.finalization?.signals.map(({ signal }) => signal),
//     "both attempts are observed in order",
//   ).toEqual(["SIGTERM", "SIGKILL"]);
//   expect(exit.signal, "the observed exit remains independent of attempts").toBe(
//     0,
//   );
//   expect(
//     fake.signals.filter((signal) => signal === "SIGKILL"),
//     "the escalation is sent once, not on every poll",
//   ).toHaveLength(1);
//   expect(
//     fake.signals.filter((signal) => signal === "SIGTERM"),
//     "the finalization signal is sent once, not on every poll",
//   ).toHaveLength(1);
// });
//
// it("kills at once when cancelled during the finalization interval", async () => {
//   const fake = fakeTerminal();
//   const controller = new AbortController();
//   const pending = start(
//     fake,
//     { timeout_ms: 100, finalization_ms: 60_000 },
//     controller.signal,
//   );
//   await waitFor(() => fake.signals.includes("SIGTERM"));
//   controller.abort();
//   await waitFor(() => fake.signals.includes("SIGKILL"));
//   fake.deliverExit({ exitCode: 0, signal: 9 });
//
//   const exit = observed(await pending);
//
//   expect(exit.reason, "cancellation replaces the initiating deadline").toBe(
//     "cancelled",
export const _l = 138;
