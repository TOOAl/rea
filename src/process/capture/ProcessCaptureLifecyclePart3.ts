export const __stub = 1;
//       for (const timer of timers) timer.cancel();
//       timers.clear();
//       resolveExit({
//         unobserved: true,
//         reason: reason === "exited" ? "timeout" : reason,
//         finalization: snapshot(null),
//       });
//     };
//     // An attempt is recorded before its delivery is awaited, so a hung or
//     // failed delivery still leaves the attempt in the observations.
//     const attempt = (finalizationSignal: FinalizationSignal): void => {
//       if (finalizationStartedAt === undefined) return;
//       const record: (typeof finalizationSignals)[number] = {
//         signal: finalizationSignal,
//         sent_at_ms: Math.max(
//           0,
//           monotonicProcessCaptureClock() - finalizationStartedAt,
//         ),
//         delivery: "unverified" as FinalizationDelivery,
//         reason: "delivery had not settled when the record was published",
//       };
//       finalizationSignals.push(record);
//       recordFinalization(snapshot(null));
//       const deliveryBound = new AbortController();
//       // The wait is bounded by the cleanup verification grace: a delivery that
//       // never settles is recorded as unverified instead of holding the capture.
//       pendingDeliveries.push(
//         Promise.race([
//           signalTarget(finalizationSignal),
//           delay(
//             PROCESS_CLEANUP_VERIFICATION_GRACE_MS,
//             {
//               delivery: "unverified" as const,
//               reason: `delivery did not settle within ${String(PROCESS_CLEANUP_VERIFICATION_GRACE_MS)} ms`,
//             },
//             {
//               ref: false,
//               signal: deliveryBound.signal,
//             },
//           ).catch(() => ({
//             delivery: "unverified" as const,
//             reason: "delivery wait was interrupted",
//           })),
//         ])
//           .finally(() => {
//             deliveryBound.abort();
//           })
//           .then(
//             ({ delivery, reason: deliveryReason }) => {
//               record.delivery = delivery;
//               if (deliveryReason !== undefined) record.reason = deliveryReason;
//               else delete record.reason;
//             },
//             (cause: unknown) => {
//               record.delivery = "unverified";
//               record.reason = describeUnverifiedCause(
//                 cause,
//                 "signal delivery failed without a message",
//               );
//             },
//           )
//           .then(() => {
//             recordFinalization(snapshot(null));
//             // A kill that cannot reach the root leaves no exit to wait for.
//             if (
//               finalizationSignal === "SIGKILL" &&
//               record.delivery !== "signaled" &&
//               record.delivery !== "gone"
//             )
//               unobservedExit();
//           }),
//       );
//     };
//     const forceKill = (): void => {
//       if (finalizationStartedAt !== undefined) {
//         if (escalationSent) return;
//         escalationSent = true;
//         attempt("SIGKILL");
//         return;
//       }
//       terminal.kill("SIGKILL");
//     };
//     const terminateAtDeadline = (): void => {
//       if (scenario.finalization_ms === 0) {
//         terminal.kill("SIGKILL");
//         return;
//       }
//       finalizationStartedAt = monotonicProcessCaptureClock();
//       attempt("SIGTERM");
//     };
//     terminal.onExit((exit) => {
//       if (settled) return;
//       exitObserved = true;
//       // Measures when the exit was observed, not when the operating system
//       // ended the process; the PTY layer can deliver the notification late.
//       const finalizationElapsedMs =
//         finalizationStartedAt === undefined
//           ? undefined
//           : Math.max(0, monotonicProcessCaptureClock() - finalizationStartedAt);
//       recordEvent("lifecycle", 0);
//       for (const [eventIndex, event] of scenario.events.entries()) {
//         if (dispatchedEventIndexes.has(eventIndex)) continue;
//         const sequence = interactions.length;
//         interactions.push({
//           sequence,
//           scheduled_at_ms: event.at_ms,
//           dispatched_at_ms: Math.max(
//             0,
//             monotonicProcessCaptureClock() - started,
//           ),
//           type: event.type,
//           data:
//             event.type === "input"
//               ? "<not-dispatched>"
//               : event.type === "resize"
//                 ? `${String(event.columns)}x${String(event.rows)}`
//                 : event.signal,
//           outcome: "target_exited",
//         });
//         recordEvent("interaction_events", sequence);
//       }
//       for (const timer of timers) {
//         timer.cancel();
//       }
//       timers.clear();
//       const finish = (): void => {
//         if (settled) return;
//         settled = true;
//         resolveExit({
//           ...exit,
//           reason,
//           ...(finalizationElapsedMs === undefined
//             ? {}
//             : {
//                 finalization: snapshot(
//                   finalizationElapsedMs,
//                   exit.exitCode >= 0 && (exit.signal ?? 0) === 0
//                     ? exit.exitCode
//                     : null,
//                 ),
//               }),
//         });
//       };
//       if (pendingDeliveries.length === 0) {
//         finish();
//         return;
//       }
//       // A delivery that never settles must not hold back an observed exit;
//       // its attempt stays recorded as unverified.
//       const grace = new AbortController();
//       void Promise.race([
//         Promise.allSettled(pendingDeliveries),
//         delay(PROCESS_CLEANUP_VERIFICATION_GRACE_MS, undefined, {
//           ref: false,
//           signal: grace.signal,
//         }).catch(() => undefined),
//       ])
//         .finally(() => {
//           grace.abort();
//         })
//         .then(finish);
//     });
//     const timeout = scheduleProcessInterval(() => {
//       onLiveProgress?.();
//       if (signal?.aborted === true) {
//         reason = "cancelled";
//         forceKill();
//       } else if (finalizationStartedAt !== undefined) {
//         if (
//           monotonicProcessCaptureClock() - finalizationStartedAt >=
//           scenario.finalization_ms
//         )
//           forceKill();
//       } else if (
//         monotonicProcessCaptureClock() - started >=
//         scenario.timeout_ms
//       ) {
//         reason = "timeout";
//         terminateAtDeadline();
//       } else if (
//         monotonicProcessCaptureClock() - lastOutput() >=
//         scenario.idle_timeout_ms
//       ) {
//         reason = "idle_timeout";
//         terminateAtDeadline();
//       }
//     }, 20);
//     timers.add(timeout);
//   });
//
// /** Host operations used when releasing one captured process run. */
// export interface ProcessCaptureCleanupHost {
//   readonly platform: NodeJS.Platform;
//   readonly cleanupProcessGroup: typeof cleanupOwnedProcessGroup;
//   readonly verifyTokenOwnedProcesses: typeof verifyNoTokenOwnedProcesses;
//   readonly removeTemporaryRoot: (path: string) => Promise<void>;
// }
//
// const processCaptureCleanupHost: ProcessCaptureCleanupHost = {
//   platform: process.platform,
//   cleanupProcessGroup: cleanupOwnedProcessGroup,
//   verifyTokenOwnedProcesses: verifyNoTokenOwnedProcesses,
//   removeTemporaryRoot: (path) => rm(path, { recursive: true, force: true }),
// };
//
// const PROCESS_CLEANUP_VERIFICATION_GRACE_MS = 1_000;
// const PROCESS_CLEANUP_VERIFICATION_INTERVAL_MS = 25;
//
// const verifyTokenOwnedProcessesUntilSettled = async (
//   verify: () => Promise<ProcessCleanupResult>,
// ): Promise<ProcessCleanupResult> => {
//   const deadline =
//     monotonicProcessCaptureClock() + PROCESS_CLEANUP_VERIFICATION_GRACE_MS;
//   let result = await verify();
//   while (!result.cleaned) {
//     const remaining = deadline - monotonicProcessCaptureClock();
//     if (remaining <= 0) return result;
//     await new Promise<void>((resolve) =>
//       setTimeout(
//         resolve,
//         Math.min(PROCESS_CLEANUP_VERIFICATION_INTERVAL_MS, remaining),
//       ),
//     );
//     result = await verify();
//   }
//   return result;
// };
//
// const releaseCapturedProcessGroup = async (
//   ownership: OwnedProcessGroup,
//   host: ProcessCaptureCleanupHost,
// ): Promise<ProcessCaptureCleanupReport["owned_process_group"]> => {
//   if (host.platform === "win32")
//     return {
//       state: "unverified",
//       reason:
//         "owned process cleanup is unverifiable on Windows without process-job authority",
//     };
//   let outcome: ProcessCaptureCleanupReport["owned_process_group"] = {
//     state: "cleaned",
//     reason: null,
//   };
//   const unverified: Array<{
//     readonly pid: number;
//     readonly diagnostic: string;
//   }> = [];
//   try {
//     const cleaned = await host.cleanupProcessGroup(ownership);
//     unverified.push(...(cleaned.unverified ?? []));
//     if (!cleaned.cleaned) {
//       outcome = { state: "unverified", reason: cleaned.reason };
//     } else {
//       const verified = await verifyTokenOwnedProcessesUntilSettled(() =>
//         host.verifyTokenOwnedProcesses(
//           ownership.runId,
//           undefined,
//           ownership.captureBaseline,
//           ownership,
//         ),
//       );
//       unverified.push(...(verified.unverified ?? []));
//       if (!verified.cleaned)
//         outcome = { state: "unverified", reason: verified.reason };
//     }
//   } catch (cause: unknown) {
//     outcome = {
//       state: "failed",
//       reason:
//         cause instanceof Error
//           ? cause.message || cause.name || "owned process cleanup failed"
//           : "owned process cleanup failed",
//     };
//   }
//   return unverified.length === 0
//     ? outcome
//     : {
//         ...outcome,
//         unverified_processes: [
//           ...new Map(
//             unverified.map(({ pid, diagnostic }) => [
//               `${String(pid)}:${diagnostic}`,
//               { pid, reason: diagnostic },
//             ]),
//           ).values(),
//         ],
//       };
// };
//
// export interface ProcessCaptureResourceCleanupOptions {
//   readonly timers: ReadonlySet<ProcessTimer>;
//   readonly terminal: Pick<IPty, "pid"> | undefined;
//   readonly renderer: TerminalRenderer | undefined;
//   readonly runId: string;
//   readonly temporaryRoot: string;
//   readonly captureBaseline?: ProcessOwnershipBaseline;
//   readonly sampledProcessGroupIds?: readonly number[];
//   readonly host?: ProcessCaptureCleanupHost;
// }
//
// /** One capture's exact resource owner, with completion tracked per resource. */
// class ProcessCaptureResourceOwner {
//   readonly #host: ProcessCaptureCleanupHost;
//   #terminalRenderer:
//     | ProcessCaptureCleanupReport["terminal_renderer"]
//     | undefined;
//   #ownedProcessGroup:
//     | ProcessCaptureCleanupReport["owned_process_group"]
//     | undefined;
//   #temporaryRoot: ProcessCaptureCleanupReport["temporary_root"] | undefined;
//
//   constructor(private readonly options: ProcessCaptureResourceCleanupOptions) {
//     this.#host = options.host ?? processCaptureCleanupHost;
//     if (options.renderer === undefined)
//       this.#terminalRenderer = { state: "not_required", reason: null };
//     if (options.terminal === undefined)
//       this.#ownedProcessGroup = { state: "not_required", reason: null };
//   }
//
//   async close(): Promise<ProcessCaptureCleanupReport> {
//     for (const timer of this.options.timers) timer.cancel();
//     await this.#releaseRenderer();
//     await this.#releaseOwnedProcessGroup();
//     await this.#releaseTemporaryRoot();
//     return {
//       owned_process_group: this.#ownedProcessGroup ?? {
//         state: "unverified",
//         reason: "owned process cleanup was not attempted",
//       },
//       terminal_renderer: this.#terminalRenderer ?? {
//         state: "unverified",
//         reason: "terminal renderer cleanup was not attempted",
//       },
//       temporary_root: this.#temporaryRoot ?? {
//         state: "unverified",
//         reason: "temporary root cleanup was not attempted",
//       },
//     };
//   }
//
//   async #releaseRenderer(): Promise<void> {
//     if (
//       this.options.renderer === undefined ||
//       this.#terminalRenderer?.state === "cleaned" ||
//       this.#terminalRenderer?.state === "not_required"
//     )
//       return;
//     try {
//       await this.options.renderer.dispose();
//       this.#terminalRenderer = { state: "cleaned", reason: null };
//     } catch (cause: unknown) {
//       this.#terminalRenderer = {
//         state: "failed",
//         reason: cleanupFailureMessage(cause, "renderer dispose failed"),
//       };
//     }
//   }
//
//   async #releaseOwnedProcessGroup(): Promise<void> {
//     if (
//       this.options.terminal === undefined ||
//       this.#ownedProcessGroup?.state === "cleaned" ||
//       this.#ownedProcessGroup?.state === "not_required"
//     )
//       return;
//     this.#ownedProcessGroup = await releaseCapturedProcessGroup(
//       {
//         runId: this.options.runId,
//         leaderPid: this.options.terminal.pid,
//         processGroupId: this.options.terminal.pid,
//         sweepTokenOwnedProcesses: true,
//         ...(this.options.sampledProcessGroupIds === undefined
//           ? {}
//           : { sampledProcessGroupIds: this.options.sampledProcessGroupIds }),
//         ...(this.options.captureBaseline === undefined
//           ? {}
//           : { captureBaseline: this.options.captureBaseline }),
//       },
//       this.#host,
//     );
//   }
//
//   async #releaseTemporaryRoot(): Promise<void> {
//     if (this.#temporaryRoot?.state === "cleaned") return;
//     const owned = this.#ownedProcessGroup;
//     if (owned?.state === "failed" || owned?.state === "unverified") {
//       this.#temporaryRoot = {
//         state: "unverified",
//         reason: `temporary root retained because owned process cleanup is ${owned.state}: ${owned.reason ?? "ownership could not be verified"}`,
//       };
//       return;
//     }
//     try {
//       await this.#host.removeTemporaryRoot(this.options.temporaryRoot);
//       this.#temporaryRoot = { state: "cleaned", reason: null };
//     } catch (cause: unknown) {
//       this.#temporaryRoot = {
//         state: "failed",
//         reason: cleanupFailureMessage(cause, "temporary root removal failed"),
//       };
export const _l = 399;
