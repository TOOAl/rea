export const __stub = 1;
//     let launched: SpawnedOwnedProviderProcess;
//     try {
//       launched = await this.#spawnProcess({
//         command: this.#command,
//         arguments: arguments_,
//         hostEnvironment: this.#environment,
//         runId: id,
//         stdin: "pipe",
//         ...(signal === undefined ? {} : { signal }),
//       });
//     } catch (cause) {
//       if (signal?.aborted)
//         return err(
//           new AnalysisCancelledError("start_rizin_debug_session", { cause }),
//         );
//       return err(
//         new AnalysisCapabilityUnavailableError(
//           "rizin",
//           "start_rizin_debug_session",
//           cause instanceof Error
//             ? cause.message
//             : "Unable to start Rizin debugger",
//         ),
//       );
//     }
//     const session: RizinDebugSession = {
//       id,
//       launched,
//       launchProvenance,
//       backend: input.backend ?? null,
//       inferiorTty: ttyPath,
//       inferiorTtyDevice: ttyDevice,
//       inferiorTtyInode: ttyInode,
//       knownInferiorIdentities: new Map(),
//       inferiorInventoryComplete: false,
//       inferiorStateUnknown: () => !session.inferiorInventoryComplete,
//       verifyInferiorsEndedAfterExit: async () => {
//         if (!session.inferiorInventoryComplete) return false;
//         const ended = await verifyOwnedInferiorsEnded(
//           session.knownInferiorIdentities.values(),
//         );
//         if (ended) session.knownInferiorIdentities.clear();
//         return ended;
//       },
//       detachInferior: () =>
//         session.cleanupCommandTurnHeld
//           ? this.#detachInferiorUnlocked(session)
//           : this.#detachInferior(session),
//       cleanupCommandTurnHeld: false,
//       stopAttempt: undefined,
//       cleanupFailures: new Set(),
//       pendingCommandCount: 0,
//       invalidUtf8Observed: false,
//       closing: false,
//       supervisor: new ProviderProcessSupervisor(
//         { process: launched.process, ownsProcessLifetime: false },
//         {
//           captureStdout: false,
//           maxDiagnosticBytes: MAX_DIAGNOSTIC_BYTES,
//         },
//       ),
//       frames: [],
//       frameWaiters: [],
//       history: [],
//       queuedFrameBytes: 0,
//       historyTruncated: false,
//       frameChunks: [],
//       bufferedFrameBytes: 0,
//       ready: false,
//       exited: false,
//       commandTail: Promise.resolve(),
//       protocolError: undefined,
//       commandCaptureActive: false,
//       discardingOversizedFrame: false,
//     };
//     this.#sessions.set(id, session);
//     releaseReservation();
//     launched.process.stdout?.on("data", (chunk: Buffer | string) =>
//       this.#receive(session, Buffer.from(chunk)),
//     );
//     launched.process.stdin?.on("error", (cause: Error) =>
//       this.#failProtocol(
//         session,
//         `Rizin stdin stream failed: ${cause.message}`,
//       ),
//     );
//     launched.process.stdin?.once("close", () => {
//       if (!session.exited && session.protocolError === undefined)
//         this.#failProtocol(session, "Rizin stdin stream closed unexpectedly.");
//     });
//     launched.process.once("exit", () => {
//       session.exited = true;
//       for (const waiter of session.frameWaiters)
//         waiter.reject(new RizinProcessExitError(""));
//       session.frameWaiters.length = 0;
//     });
//     try {
//       await waitForFrame(session, this.#startupTimeoutMs, signal);
//       // Let process and stream lifecycle notifications queued alongside the
//       // initial frame run before publishing the session as ready.
//       await new Promise<void>((resolve) => setImmediate(resolve));
//       if (signal?.aborted)
//         throw new AnalysisCancelledError("start_rizin_debug_session");
//       if (session.exited)
//         throw new RizinProcessExitError("Rizin exited during startup.");
//       if (session.protocolError !== undefined)
//         throw new Error(session.protocolError);
//       session.ready = true;
//       return ok({ session_id: id, backend: input.backend ?? null });
//     } catch (cause) {
//       const stopped = await this.#stopDebuggerOnly(session);
//       const capturedOutput = this.#startupCapturedOutput(session);
//       if (stopped.status !== "incomplete") this.#sessions.delete(id);
//       if (stopped.status === "incomplete")
//         return err(
//           this.#retainCleanupFailure(
//             session,
//             "start_rizin_debug_session",
//             stopped.reason,
//             { cause, capturedOutput },
//           ),
//         );
//       if (signal?.aborted || cause instanceof AnalysisCancelledError)
//         return err(
//           new AnalysisCancelledError("start_rizin_debug_session", {
//             cause,
//             capturedOutput,
//           }),
//         );
//       if (session.protocolError !== undefined)
//         return err(
//           new AnalysisCapabilityUnavailableError(
//             "rizin",
//             "start_rizin_debug_session",
//             session.protocolError,
//             { cause, capturedOutput },
//           ),
//         );
//       if (cause instanceof RizinProcessExitError) {
//         return err(
//           new AnalysisCapabilityUnavailableError(
//             "rizin",
//             "start_rizin_debug_session",
//             cause.message,
//             {
//               cause,
//               capturedOutput,
//             },
//           ),
//         );
//       }
//       return err(
//         new AnalysisTimeoutError(
//           "start_rizin_debug_session",
//           this.#startupTimeoutMs,
//           { cause, capturedOutput },
//         ),
//       );
//     }
//   }
//
//   async execute(
//     sessionId: string,
//     command: string,
//     signal?: AbortSignal,
//   ): Promise<
//     Result<
//       { readonly result: RizinDebugCommandResult; readonly evidence: Evidence },
//       AnalysisError
//     >
//   > {
//     const session = this.#sessions.get(sessionId);
//     if (
//       session === undefined ||
//       !session.ready ||
//       session.exited ||
//       session.protocolError !== undefined ||
//       session.closing ||
//       this.#closingAll
//     )
//       return err(new AnalysisInputError("rizin_debug_command"));
//     if (signal?.aborted)
//       return err(new AnalysisCancelledError("rizin_debug_command"));
//     if (session.pendingCommandCount >= MAX_PENDING_COMMANDS)
//       return err(
//         new AnalysisResourceConstraintError(
//           "rizin_debug_command",
//           "transport",
//           "Rizin command queue capacity reached.",
//           {
//             max_pending_commands: MAX_PENDING_COMMANDS,
//             active_or_queued_commands: session.pendingCommandCount,
//           },
//         ),
//       );
//     session.pendingCommandCount += 1;
//     let release: (() => void) | undefined;
//     let acquired = false;
//     let commandSent = false;
//     const previous = session.commandTail;
//     session.commandTail = new Promise<void>((resolve) => {
//       release = resolve;
//     });
//     try {
//       await waitForTurn(previous, signal);
//       acquired = true;
//       if (signal?.aborted)
//         return err(new AnalysisCancelledError("rizin_debug_command"));
//       if (
//         !session.ready ||
//         session.exited ||
//         session.closing ||
//         this.#closingAll ||
//         session.protocolError !== undefined
//       )
//         return err(new AnalysisInputError("rizin_debug_command"));
//       if (session.frames.length > 0) {
//         const message =
//           "Unsolicited Rizin frames arrived before a command; command output can no longer be safely correlated.";
//         this.#failProtocol(session, message);
//         return err(
//           await this.#stopAfterProtocolFailure(session, undefined, true),
//         );
//       }
//       const marker = `__REA_COMMAND_COMPLETE_${randomUUID().replaceAll("-", "")}__`;
//       // Arbitrary debugger commands can create or replace inferiors. Discard
//       // the prior inventory before any command bytes reach the provider.
//       session.inferiorInventoryComplete = false;
//       session.knownInferiorIdentities.clear();
//       commandSent = true;
//       const stdin = session.launched.process.stdin;
//       if (
//         stdin === null ||
//         stdin === undefined ||
//         stdin.destroyed ||
//         !stdin.writable
//       ) {
//         this.#failProtocol(session, "Rizin stdin stream is closed.");
//       } else {
//         try {
//           stdin.write(
//             `${command}\n!echo ${marker}\n`,
//             "utf8",
//             (cause?: Error | null) => {
//               if (cause)
//                 this.#failProtocol(
//                   session,
//                   `Rizin stdin write failed: ${cause.message}`,
//                 );
//             },
//           );
//         } catch (cause) {
//           this.#failProtocol(
//             session,
//             `Rizin stdin write failed: ${cause instanceof Error ? cause.message : "unknown error"}`,
//           );
//         }
//       }
//       if (session.protocolError !== undefined)
//         throw new Error(session.protocolError);
//       session.commandCaptureActive = true;
//       const captured = await waitForCommandFrames(
//         session,
//         marker,
//         this.#frameTimeoutMs,
//         signal,
//         this.#maxCommandOutputBytes,
//       );
//       if (signal?.aborted)
//         throw new AnalysisCancelledError("rizin_debug_command");
//       let cleanupFailure: string | undefined;
//       if (captured.outputTruncated) {
//         // Stryker disable next-line BooleanLiteral -- `waitForCommandFrames` sets `protocolError` before reporting truncation; both detach wrappers therefore fail closed before a queued command can be awaited, so the held-tail flag cannot change this public path.
//         const stopped = await this.#stopDebuggerOnly(session, true);
//         if (stopped.status === "incomplete") cleanupFailure = stopped.reason;
//       }
//       const result = {
//         command,
//         output: captured.output,
//         output_scope: "command_and_interleaved_session_output" as const,
//         output_truncated: captured.outputTruncated,
//         completion_status: captured.outputTruncated
//           ? ("unknown" as const)
//           : ("complete" as const),
//         backend: session.backend,
//         ...(captured.outputInvalidUtf8
//           ? { output_invalid_utf8: true as const }
//           : {}),
//       };
//       const evidence = createRizinCommandEvidence({
//         sessionId,
//         command,
//         result,
//         inferiorTty: session.inferiorTty,
//         launchProvenance: session.launchProvenance,
//         limitations: [
//           "Rizin commands and debugger effects depend on the loaded IO plugin and target.",
//           "Output contains all NUL frames through an explicit command-completion marker; backend output interleaved before that marker cannot be distinguished from command output.",
//           ...(captured.outputTruncated
//             ? [
//                 `The Rizin command exceeded the output or frame limit. Retained output is partial and command completion is unknown.${cleanupFailure === undefined ? " The owned debugger session was stopped." : ` The owned debugger session remains retained because cleanup could not be verified: ${cleanupFailure}`}`,
//               ]
//             : []),
//           "The command is unrestricted and may access local files, the shell, network, or mutate the target.",
//         ],
//       });
//       if (cleanupFailure !== undefined)
//         return err(
//           this.#retainCleanupFailure(
//             session,
//             "rizin_debug_command",
//             cleanupFailure,
//             {
//               partialObservation: evidence,
//             },
//           ),
//         );
//       return ok({ result, evidence });
//     } catch (cause) {
//       if (signal?.aborted || cause instanceof AnalysisCancelledError) {
//         if (!commandSent)
//           return err(
//             new AnalysisCancelledError("rizin_debug_command", { cause }),
//           );
//         const partialOutput =
//           cause instanceof RizinCommandCancelledError
//             ? cause.partialOutput
//             : undefined;
//         const commandInvalidUtf8 =
//           cause instanceof RizinCommandCancelledError &&
//           cause.outputInvalidUtf8;
//         const partialEvidence =
//           partialOutput === undefined
//             ? undefined
//             : createRizinCommandEvidence({
//                 sessionId,
//                 command,
//                 result: {
//                   command,
//                   output: partialOutput,
//                   output_scope: "command_and_interleaved_session_output",
//                   output_truncated: false,
//                   completion_status: "unknown",
//                   backend: session.backend,
//                   ...(commandInvalidUtf8
//                     ? { output_invalid_utf8: true as const }
//                     : {}),
//                 },
//                 inferiorTty: session.inferiorTty,
//                 launchProvenance: session.launchProvenance,
//                 limitations: [
//                   "The Rizin command was cancelled; collected frame output is partial and command completion is unknown.",
//                   "The owned debugger session was stopped because command output can no longer be correlated safely.",
//                   "The command is unrestricted and may access local files, the shell, network, or mutate the target.",
//                 ],
//               });
//         session.protocolError =
//           "A Rizin command was cancelled; the owned session was stopped because command output can no longer be correlated safely.";
//         const stopped = await this.#stopDebuggerOnly(session, true);
//         if (stopped.status === "incomplete")
//           return err(
//             this.#retainCleanupFailure(
//               session,
//               "rizin_debug_command",
//               stopped.reason,
//               {
//                 cause: new AnalysisCancelledError("rizin_debug_command", {
//                   cause,
//                   ...(cause instanceof RizinCommandCancelledError
//                     ? { capturedOutput: cause.capturedOutput }
//                     : {}),
//                 }),
//                 ...(partialEvidence === undefined
//                   ? {}
//                   : { partialObservation: partialEvidence }),
//               },
//             ),
//           );
//         return err(
//           new AnalysisCancelledError("rizin_debug_command", {
//             cause,
//             ...(cause instanceof RizinCommandCancelledError
//               ? { capturedOutput: cause.capturedOutput }
//               : {}),
//             ...(partialEvidence === undefined
//               ? {}
//               : { partialObservation: partialEvidence }),
//           }),
//         );
//       }
//       if (session.protocolError !== undefined)
//         return err(await this.#stopAfterProtocolFailure(session, cause, true));
//       if (cause instanceof RizinCommandTimeoutError) {
//         session.protocolError =
//           "Rizin command timed out before its completion marker; output correlation is no longer safe.";
//         const stopped = await this.#stopDebuggerOnly(session, true);
//         const result: RizinDebugCommandResult = {
//           command,
export const _l = 398;
