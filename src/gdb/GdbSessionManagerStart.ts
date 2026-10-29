export const __stub = 1;
//
//   async start(
//     signal?: AbortSignal,
//     options: { readonly inferiorTty?: string } = {},
//   ): Promise<
//     Result<
//       { readonly session_id: string; readonly mi_version: "mi3" | "mi2" },
//       AnalysisError
//     >
//   > {
//     if (
//       options.inferiorTty !== undefined &&
//       (options.inferiorTty.length === 0 || options.inferiorTty.includes("\0"))
//     )
//       return err(
//         new AnalysisInputError("start_gdb_session", undefined, [
//           {
//             path: ["inferior_tty"],
//             reason: "invalid_value",
//             message:
//               "The inferior TTY path must be non-empty and must not contain NUL.",
//           },
//         ]),
//       );
//     if (this.#closing || signal?.aborted)
//       return err(new AnalysisCancelledError("start_gdb_session"));
//     if (this.#platform !== "linux")
//       return err(
//         new AnalysisCapabilityUnavailableError(
//           "gdb",
//           "start_gdb_session",
//           this.#platform === "win32"
//             ? "Persistent Windows GDB sessions are unavailable because owned Job Object cleanup can terminate debugger inferiors."
//             : "Persistent GDB sessions are available only on Linux because REA verifies live inferior output descriptors through /proc.",
//         ),
//       );
//     const controller = new AbortController();
//     const relayAbort = (): void => controller.abort(signal?.reason);
//     signal?.addEventListener("abort", relayAbort, { once: true });
//     if (signal?.aborted) relayAbort();
//     const tracked = Promise.resolve()
//       .then(() => this.#startWithReservation(controller.signal, options))
//       .finally(() => {
//         signal?.removeEventListener("abort", relayAbort);
//         this.#activeStarts.delete(controller);
//       });
//     this.#activeStarts.set(controller, tracked);
//     return tracked;
//   }
//
//   async #startWithReservation(
//     signal: AbortSignal,
//     options: { readonly inferiorTty?: string } = {},
//   ): Promise<
//     Result<
//       { readonly session_id: string; readonly mi_version: "mi3" | "mi2" },
//       AnalysisError
//     >
//   > {
//     if (signal?.aborted)
//       return err(new AnalysisCancelledError("start_gdb_session"));
//     const occupied = this.#sessions.size + this.#sessionReservations;
//     if (occupied >= this.#maxSessions)
//       return err(
//         new AnalysisResourceConstraintError(
//           "start_gdb_session",
//           "memory",
//           "GDB session capacity reached.",
//           {
//             max_sessions: this.#maxSessions,
//             active_or_reserved_sessions: occupied,
//           },
//         ),
//       );
//     this.#sessionReservations += 1;
//     let reservationHeld = true;
//     const releaseReservation = (): void => {
//       if (!reservationHeld) return;
//       reservationHeld = false;
//       this.#sessionReservations -= 1;
//     };
//     try {
//       return await this.#startReserved(releaseReservation, signal, options);
//     } finally {
//       releaseReservation();
//     }
//   }
//
//   async #startReserved(
//     releaseReservation: () => void,
//     signal: AbortSignal,
//     options: { readonly inferiorTty?: string } = {},
//   ): Promise<
//     Result<
//       { readonly session_id: string; readonly mi_version: "mi3" | "mi2" },
//       AnalysisError
//     >
//   > {
//     const id = randomUUID();
//     const mi3 = await this.#startProtocol(
//       id,
//       "mi3",
//       releaseReservation,
//       signal,
//       options.inferiorTty,
//     );
//     return mi3.ok || signal.aborted || this.#sessions.has(id)
//       ? mi3
//       : this.#startProtocol(
//           id,
//           "mi2",
//           releaseReservation,
//           signal,
//           options.inferiorTty,
//         );
//   }
//
//   async #startProtocol(
//     id: string,
//     miVersion: "mi3" | "mi2",
//     releaseReservation: () => void,
//     signal: AbortSignal,
//     inferiorTty?: string,
//   ): Promise<
//     Result<
//       { readonly session_id: string; readonly mi_version: "mi3" | "mi2" },
//       AnalysisError
//     >
//   > {
//     let launched: SpawnedOwnedProviderProcess;
//     try {
//       const spawnOptions: OwnedProviderProcessSpawnOptions = {
//         command: this.#command,
//         arguments: ["--nx", "--quiet", `--interpreter=${miVersion}`],
//         runId: randomUUID(),
//         stdin: "pipe",
//         hostEnvironment: this.#environment,
//         signal,
//       };
//       launched = await this.#spawnProcess(spawnOptions);
//     } catch (cause) {
//       if (signal?.aborted || cause instanceof AnalysisCancelledError)
//         return err(new AnalysisCancelledError("start_gdb_session", { cause }));
//       return err(
//         new AnalysisCapabilityUnavailableError(
//           "gdb",
//           "start_gdb_session",
//           cause instanceof Error ? cause.message : "Unable to start GDB",
//         ),
//       );
//     }
//     const supervisor = new ProviderProcessSupervisor(
//       { process: launched.process, ownsProcessLifetime: false },
//       { captureStdout: false, maxDiagnosticBytes: MAX_DIAGNOSTIC_BYTES },
//     );
//     let settleStdout!: () => void;
//     const stdoutSettled = new Promise<void>((resolve) => {
//       settleStdout = resolve;
//     });
//     const session: GdbSession = {
//       id,
//       miVersion,
//       launched,
//       supervisor,
//       detachInferior: () => this.#detachInferior(session),
//       inferiorStateUnknown: () => !session.noInferiorVerified,
//       verifyInferiorsEndedAfterExit: async () => {
//         const ended = await verifyOwnedInferiorsEnded(
//           session.knownInferiorIdentities.values(),
//           this.#readInferiorProcessStartTime,
//         );
//         if (ended) session.knownInferiorIdentities.clear();
//         return ended;
//       },
//       knownInferiorIdentities: new Map(),
//       inferiorTty,
//       maxCommandOutputBytes: this.#maxCommandOutputBytes,
//       stdoutSettled,
//       settleStdout,
//       inferiorTtyVerified: false,
//       // GDB is launched with --nx and receives no target-execution commands
//       // during startup, so no inferior can exist until execute() is called.
//       noInferiorVerified: true,
//       stopAttempt: undefined,
//       pending: new Map(),
//       cleanupFailures: new Set(),
//       lines: [],
//       bufferChunks: [],
//       bufferTail: undefined,
//       bufferTailBytes: 0,
//       bufferBytes: 0,
//       invalidUtf8Observed: false,
//       promptTail: "",
//       ready: false,
//       exited: false,
//       exitCode: null,
//       exitSignal: null,
//       nextToken: 1,
//       startupResolve: undefined,
//       startupReject: undefined,
//       commandTail: Promise.resolve(),
//       pendingCommandCount: 0,
//       protocolError: undefined,
//       recentRecordsTruncated: false,
//     };
//     launched.process.stdout?.on("data", (chunk: string | Buffer) =>
//       this.#receive(
//         session,
//         typeof chunk === "string" ? Buffer.from(chunk, "utf8") : chunk,
//       ),
//     );
//     if (launched.process.stdout === null) settleStdout();
//     else launched.process.stdout.once("end", settleStdout);
//     launched.process.stdin?.on("error", (cause: Error) =>
//       this.#failProtocol(session, `GDB stdin stream failed: ${cause.message}`),
//     );
//     launched.process.stdin?.once("close", () =>
//       this.#failProtocol(session, "GDB stdin stream closed unexpectedly."),
//     );
//     launched.process.once("exit", (code, signalCode) => {
//       session.exited = true;
//       session.exitCode = code;
//       session.exitSignal = signalCode;
//       void this.#waitForStdoutSettlement(session).then(() =>
//         session.startupReject?.(
//           new Error(
//             `GDB exited during startup (exit code ${String(code)}, signal ${String(signalCode)}).`,
//           ),
//         ),
//       );
//       void this.#settleExitedCommands(session, code, signalCode);
//     });
//     let startupTimer!: ReturnType<typeof setTimeout>;
//     let startupAbortListener!: () => void;
//     try {
//       await new Promise<void>((resolve, reject) => {
//         session.startupResolve = resolve;
//         session.startupReject = reject;
//         startupAbortListener = () =>
//           reject(new AnalysisCancelledError("start_gdb_session"));
//         signal?.addEventListener("abort", startupAbortListener, {
//           once: true,
//         });
//         if (signal?.aborted) startupAbortListener();
//         startupTimer = setTimeout(
//           () =>
//             reject(
//               new AnalysisTimeoutError(
//                 "start_gdb_session",
//                 this.#startupTimeoutMs,
//                 {
//                   cause: new Error(
//                     "GDB did not emit the MI prompt before the startup deadline",
//                   ),
//                 },
//               ),
//             ),
//           this.#startupTimeoutMs,
//         );
//         startupTimer.unref();
//       });
//       session.ready = true;
//       if (signal?.aborted)
//         throw new AnalysisCancelledError("start_gdb_session");
//       const autoLoad = await this.#request(
//         session,
//         "-gdb-set auto-load off",
//         signal,
//         "start_gdb_session",
//       );
//       if (!/^\d+\^done(?:,|$)/u.test(autoLoad.mi)) {
//         throw new AnalysisCapabilityUnavailableError(
//           "gdb",
//           "start_gdb_session",
//           `GDB rejected the required automatic-loading disable command (${autoLoad.mi}); the session was not started.`,
//         );
//       }
//       if (inferiorTty !== undefined) {
//         const configured = await this.#request(
//           session,
//           `-inferior-tty-set ${miQuote(inferiorTty)}`,
//           signal,
//           "start_gdb_session",
//         );
//         if (
//           configured.completion_status !== "complete" ||
//           configured.output_truncated ||
//           !/^\d+\^done(?:,|$)/u.test(configured.mi)
//         )
//           throw new AnalysisCapabilityUnavailableError(
//             "gdb",
//             "start_gdb_session",
//             "GDB did not confirm the inferior TTY configuration.",
//           );
//         const observed = await this.#request(
//           session,
//           "-inferior-tty-show",
//           signal,
//           "start_gdb_session",
//         );
//         const reportedTty =
//           observed.completion_status === "complete" &&
//           !observed.output_truncated
//             ? miStringField(observed.mi, "inferior_tty_terminal")
//             : undefined;
//         if (
//           !/^\d+\^done(?:,|$)/u.test(observed.mi) ||
//           reportedTty !== inferiorTty
//         )
//           throw new AnalysisCapabilityUnavailableError(
//             "gdb",
//             "start_gdb_session",
//             "GDB did not report the exact caller-selected inferior TTY after configuration.",
//           );
//         session.inferiorTtyVerified = true;
//       }
//       if (signal?.aborted)
//         throw new AnalysisCancelledError("start_gdb_session");
export const _lines = 318;
