export const __stub = 1;
// };
//
// const captureCoverageUnknowns = (
//   details: ProcessCaptureTruncationDetails,
// ): UnverifiedProcessCapture["residual_unknowns"] => {
//   const unknowns: Array<UnverifiedProcessCapture["residual_unknowns"][number]> =
//     [];
//   if (
//     details.raw_terminal.observed_frames > details.raw_terminal.retained_frames
//   )
//     unknowns.push({
//       scope: "terminal",
//       reason:
//         (details.normalized_terminal?.omitted_frames ?? 0) > 0
//           ? "Raw PTY chunks were omitted because original input exceeded output_bytes or an ordered normalization stage exceeded its remaining bound; final normalized sizes for the latter omissions are unknown. Rendered states also lack those inputs. See raw_terminal and normalized_terminal retention details, including the normalized omission count."
//           : "Raw PTY chunks exceeded output_bytes and were omitted; rendered states also lack those inputs. See truncation_details.raw_terminal.",
//     });
//   if (
//     details.rendered_terminal.observed_frames >
//     details.rendered_terminal.retained_frames
//   )
//     unknowns.push({
//       scope: "terminal",
//       reason:
//         (details.rendered_terminal.unknown_size_frames ?? 0) > 0
//           ? "Rendered frames were omitted because a normalization stage exceeded the remaining output_bytes budget; final rendered byte totals are unknown for those frames. See truncation_details.rendered_terminal."
//           : "Cumulative rendered state and visible-line bytes exceeded output_bytes; whole rendered frames were omitted. Raw PTY coverage is reported separately. See truncation_details.rendered_terminal.",
//     });
//   for (const [name, coverage] of [
//     ["before", details.filesystem_before],
//     ["after_settlement", details.filesystem_after],
//   ] as const) {
//     if (coverage.enumeration_truncated)
//       unknowns.push({
//         scope: "filesystem",
//         reason: `Filesystem ${name} path enumeration was incomplete: ${coverage.enumeration_reasons.join(", ")}. See truncation_details.`,
//       });
//     if (coverage.hash_omissions.length > 0)
//       unknowns.push({
//         scope: "filesystem",
//         reason: `Filesystem ${name} omitted ${String(coverage.hash_omissions.length)} whole-file digests; per-path reasons and remaining file_bytes budget are in truncation_details.`,
//       });
//   }
//   if (details.process.sampling_partial)
//     unknowns.push({
//       scope: "process",
//       reason:
//         "Process sampling stopped with incomplete observations; sample_limit is reported in truncation_details.process.",
//     });
//   return unknowns;
// };
//
// interface ExecutableFileIdentity {
//   readonly dev: bigint;
//   readonly ino: bigint;
//   readonly mode: bigint;
//   readonly size: bigint;
//   readonly mtimeNs: bigint;
//   readonly ctimeNs: bigint;
// }
//
// export interface SelectedExecutableObservation {
//   readonly sha256: string | null;
//   readonly identity: ExecutableFileIdentity | null;
//   readonly reason: string | null;
// }
//
// export interface LaunchedExecutableObservation {
//   readonly selectedSha256: string | null;
//   readonly sha256: string | null;
//   readonly state: "path_metadata_unchanged" | "unknown";
//   readonly reason: string | null;
// }
//
// const identityFromStats = (stats: BigIntStats): ExecutableFileIdentity => ({
//   dev: stats.dev,
//   ino: stats.ino,
//   mode: stats.mode,
//   size: stats.size,
//   mtimeNs: stats.mtimeNs,
//   ctimeNs: stats.ctimeNs,
// });
//
// const sameExecutableIdentity = (
//   left: ExecutableFileIdentity,
//   right: ExecutableFileIdentity,
// ): boolean =>
//   left.dev === right.dev &&
//   left.ino === right.ino &&
//   left.mode === right.mode &&
//   left.size === right.size &&
//   left.mtimeNs === right.mtimeNs &&
//   left.ctimeNs === right.ctimeNs;
//
// const filesystemFailure = (cause: unknown): string | undefined => {
//   if (!(cause instanceof Error) || !("code" in cause) || !("syscall" in cause))
//     return undefined;
//   return `Executable file observation failed: ${cause.message}`;
// };
//
// /** Metadata IO seam for deterministic prelaunch cancellation and identity checks. */
// export interface SelectedExecutableFileSystem {
//   open(path: string, flags: number): ReturnType<typeof open>;
//   stat(path: string): Promise<BigIntStats>;
// }
//
// const selectedExecutableFileSystem: SelectedExecutableFileSystem = {
//   open,
//   stat: (path) => stat(path, { bigint: true }),
// };
//
// /** Sample the selected file without launching it; retain cancellation and file identity. */
// export const observeSelectedExecutable = async (
//   path: string,
//   signal?: AbortSignal,
//   fileSystem: SelectedExecutableFileSystem = selectedExecutableFileSystem,
// ): Promise<SelectedExecutableObservation> => {
//   assertNotCancelled(signal);
//   let handle: Awaited<ReturnType<typeof open>> | undefined;
//   try {
//     handle = await fileSystem.open(
//       path,
//       constants.O_RDONLY | constants.O_NONBLOCK,
//     );
//     const openedStats = await handle.stat({ bigint: true });
//     if (!openedStats.isFile())
//       return {
//         sha256: null,
//         identity: null,
//         reason: "Selected executable is not a regular file.",
//       };
//     const openedIdentity = identityFromStats(openedStats);
//     const selectedPathIdentity = identityFromStats(await fileSystem.stat(path));
//     if (!sameExecutableIdentity(openedIdentity, selectedPathIdentity))
//       return {
//         sha256: null,
//         identity: null,
//         reason: "Selected executable path changed while it was being opened.",
//       };
//
//     // IO above can settle after cancellation. Do not construct a stream with an
//     // already-aborted signal: Node can emit a second, unhandled AbortError.
//     assertNotCancelled(signal);
//     const hash = createHash("sha256");
//     for await (const chunk of handle.createReadStream({
//       autoClose: false,
//       signal,
//     })) {
//       assertNotCancelled(signal);
//       hash.update(chunk);
//     }
//     assertNotCancelled(signal);
//     const finalIdentity = identityFromStats(
//       await handle.stat({ bigint: true }),
//     );
//     if (!sameExecutableIdentity(openedIdentity, finalIdentity))
//       return {
//         sha256: null,
//         identity: null,
//         reason: "Selected executable changed while its contents were sampled.",
//       };
//     return {
//       sha256: hash.digest("hex"),
//       identity: openedIdentity,
//       reason: null,
//     };
//   } catch (cause: unknown) {
//     assertNotCancelled(signal);
//     const reason = filesystemFailure(cause);
//     if (reason !== undefined) return { sha256: null, identity: null, reason };
//     throw cause;
//   } finally {
//     await handle?.close();
//   }
// };
//
// /** Compare the selected file metadata with the path immediately after PTY spawn. */
// export const observeLaunchedExecutable = (
//   path: string,
//   selected: SelectedExecutableObservation,
// ): LaunchedExecutableObservation => {
//   if (selected.identity === null || selected.sha256 === null)
//     return {
//       selectedSha256: selected.sha256,
//       sha256: null,
//       state: "unknown",
//       reason: selected.reason ?? "Selected executable identity is unavailable.",
//     };
//   try {
//     const currentStats = statSync(path, { bigint: true });
//     const currentIdentity = identityFromStats(currentStats);
//     if (
//       currentStats.isFile() &&
//       sameExecutableIdentity(selected.identity, currentIdentity)
//     )
//       return {
//         selectedSha256: selected.sha256,
//         sha256: selected.sha256,
//         state: "path_metadata_unchanged",
//         reason: null,
//       };
//     return {
//       selectedSha256: selected.sha256,
//       sha256: null,
//       state: "unknown",
//       reason: "Executable path metadata changed between sampling and spawn.",
//     };
//   } catch (cause: unknown) {
//     const reason = filesystemFailure(cause);
//     if (reason !== undefined)
//       return {
//         selectedSha256: selected.sha256,
//         sha256: null,
//         state: "unknown",
//         reason,
//       };
//     throw cause;
//   }
// };
//
// export const createRunManifest = async (
//   scenario: ProcessScenario,
//   startedAt: Date,
//   completedAt: Date,
//   executable: LaunchedExecutableObservation,
//   host: {
//     readonly platform: NodeJS.Platform;
//     readonly architecture: NodeJS.Architecture;
//   } = {
//     platform: process.platform,
//     architecture: process.arch,
//   },
// ): Promise<UnverifiedProcessCapture["manifest"]> => {
//   const scenarioCommitment = processScenarioCommitment(
//     scenario,
//     executable.selectedSha256 ?? undefined,
//   );
//   const comparisonContract = processComparisonContract(scenario);
//   return {
//     rea_version: PRODUCT_IDENTITY.packageVersion,
//     provider_version: PROCESS_PROVIDER.version,
//     platform: host.platform,
//     architecture: host.architecture,
//     pty_backend: "node-pty",
//     started_at: startedAt.toISOString(),
//     completed_at: completedAt.toISOString(),
//     scenario: scenarioCommitment,
//     comparison_contract: comparisonContract,
//     full_scenario_sha256: digestProcessCommitment(scenarioCommitment),
//     comparison_contract_sha256: digestProcessCommitment(comparisonContract),
//     selected_executable_sha256: executable.selectedSha256,
//     executable_sha256: executable.sha256,
//     executable_identity: {
//       state: executable.state,
//       reason: executable.reason,
//     },
//     normalization_sha256: digestProcessCommitment(scenario.normalization),
//   };
// };
//
// export const observeSettlement = async (
//   runId: string,
//   processGroupIds: readonly number[],
//   settleMs: number,
//   recordEvent: RecordProcessCaptureEvent = () => undefined,
//   platform: NodeJS.Platform = process.platform,
//   signal?: AbortSignal,
//   onLiveProgress?: () => void,
// ): Promise<ObservedProcessSettlement> => {
//   assertNotCancelled(signal);
//   onLiveProgress?.();
//   if (platform === "win32") {
//     recordEvent("lifecycle", 1);
//     return { state: "unverifiable", elapsed_ms: 0 };
//   }
//   const started = monotonicProcessCaptureClock();
//   let consecutiveEmpty = 0;
//   let sawLive = false;
//   let deadlineReached = false;
//   while (!deadlineReached) {
//     onLiveProgress?.();
//     assertNotCancelled(signal);
//     const observations = await observeOwnedProcessGroups(
//       runId,
//       processGroupIds,
//       undefined,
//       signal,
//     );
//     assertNotCancelled(signal);
//     if (
//       [...observations.values()].some(({ state }) => state === "unverifiable")
//     ) {
//       recordEvent("lifecycle", 1);
//       return {
//         state: "unverifiable",
//         elapsed_ms: monotonicProcessCaptureClock() - started,
//       };
//     }
//     if ([...observations.values()].every(({ state }) => state === "empty")) {
//       consecutiveEmpty += 1;
//       if (consecutiveEmpty >= 2) {
//         recordEvent("lifecycle", 1);
//         return {
//           state: "quiesced",
//           elapsed_ms: monotonicProcessCaptureClock() - started,
//         };
//       }
//     } else {
//       consecutiveEmpty = 0;
//       sawLive = true;
//     }
//     deadlineReached = monotonicProcessCaptureClock() - started >= settleMs;
//     if (deadlineReached) break;
//     await delay(50, undefined, { signal });
//   }
//   recordEvent("lifecycle", 1);
//   // A lone empty observation proves neither liveness nor quiescence; only an
//   // observed live member justifies alive_at_deadline.
//   return sawLive
//     ? {
//         state: "alive_at_deadline",
//         elapsed_ms: monotonicProcessCaptureClock() - started,
//       }
//     : {
//         state: "unverifiable",
//         elapsed_ms: monotonicProcessCaptureClock() - started,
//       };
// };
//
// /** Name why an attempt is unverified; a blank message never reaches the capture schema. */
// export const describeUnverifiedCause = (
//   cause: unknown,
//   fallback: string,
// ): string => {
//   const message = cause instanceof Error ? cause.message : String(cause);
//   return message.trim() === "" ? fallback : message;
// };
//
// /**
//  * Wait for the captured terminal to exit and report how it ended.
//  *
//  * A timeout or idle deadline kills the root at once when `finalization_ms` is
//  * 0. With a positive interval it sends SIGTERM through `signalTarget`, keeps
//  * observing, and sends SIGKILL once if the interval ends first; cancellation
//  * during the interval sends that SIGKILL at once. Every attempt is recorded
//  * with its delivery result before the delivery is awaited, and each wait is
//  * bounded by the cleanup verification grace. If the SIGKILL cannot be
//  * delivered the wait ends with `unobserved: true` and no invented exit, so the
//  * caller can keep its observations and release the run through cleanup.
//  */
// export const awaitTerminalExit = async ({
//   terminal,
//   scenario,
//   started,
//   lastOutput,
//   signal,
//   signalTarget,
//   recordFinalization,
//   timers,
//   interactions,
//   dispatchedEventIndexes,
//   recordEvent,
//   onLiveProgress,
// }: TerminalExitOptions): Promise<TerminalExitResult> =>
//   new Promise((resolveExit) => {
//     // The kill caused by a deadline is observed later as an ordinary PTY exit.
//     // Keep the initiating lifecycle reason so comparisons distinguish a target
//     // exit from harness-owned timeout, idle-timeout, and cancellation cleanup.
//     let reason: "exited" | "timeout" | "idle_timeout" | "cancelled" = "exited";
//     onLiveProgress?.();
//     // A deadline with a finalization interval sends SIGTERM first and keeps
//     // observing; SIGKILL follows only when the interval elapses or the request
//     // is cancelled. Both go through the identity-checked signaller.
//     // The interval is measured on the monotonic clock so a wall-clock change
//     // cannot shorten it or produce a negative elapsed time.
//     let finalizationStartedAt: number | undefined;
//     let escalationSent = false;
//     let settled = false;
//     let exitObserved = false;
//     const finalizationSignals: {
//       signal: FinalizationSignal;
//       sent_at_ms: number;
//       delivery: FinalizationDelivery;
//       reason?: string | undefined;
//     }[] = [];
//     const pendingDeliveries: Promise<void>[] = [];
//     const snapshot = (
//       elapsed: number | null,
//       exitCode: number | null = null,
//     ): ProcessCaptureFinalization => ({
//       requested_ms: scenario.finalization_ms,
//       elapsed_ms: elapsed,
//       exit_code: exitCode,
//       signals: finalizationSignals.map((attempt) => ({ ...attempt })),
//     });
//     const unobservedExit = (): void => {
//       if (settled || exitObserved || finalizationStartedAt === undefined)
//         return;
//       settled = true;
export const _l = 399;
