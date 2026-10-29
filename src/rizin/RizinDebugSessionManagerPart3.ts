export const __stub = 1;
//           output: cause.partialOutput,
//           output_scope: "command_and_interleaved_session_output",
//           output_truncated: true,
//           completion_status: "unknown",
//           backend: session.backend,
//           ...(cause.outputInvalidUtf8
//             ? { output_invalid_utf8: true as const }
//             : {}),
//         };
//         const evidence = createRizinCommandTimeoutEvidence({
//           sessionId,
//           command,
//           result,
//           inferiorTty: session.inferiorTty,
//           cleanupFailure:
//             stopped.status === "incomplete" ? stopped.reason : undefined,
//           launchProvenance: session.launchProvenance,
//         });
//         if (stopped.status === "incomplete")
//           return err(
//             this.#retainCleanupFailure(
//               session,
//               "rizin_debug_command",
//               stopped.reason,
//               {
//                 cause,
//                 partialObservation: evidence,
//               },
//             ),
//           );
//         return ok({ result, evidence });
//       }
//       if (cause instanceof RizinProcessExitError) {
//         const result: RizinDebugCommandResult = {
//           command,
//           output: cause.partialOutput,
//           output_scope: "command_and_interleaved_session_output",
//           output_truncated: false,
//           completion_status: "unknown",
//           backend: session.backend,
//           ...(cause.outputInvalidUtf8
//             ? { output_invalid_utf8: true as const }
//             : {}),
//         };
//         const evidence = createRizinCommandEvidence({
//           sessionId,
//           command,
//           result,
//           inferiorTty: session.inferiorTty,
//           launchProvenance: session.launchProvenance,
//           limitations: [
//             "Rizin exited before the command-completion marker; retained frame output is partial and command completion is unknown.",
//             "The command is unrestricted and may access local files, the shell, network, or mutate the target.",
//           ],
//         });
//         const stopped = await this.#stopDebuggerOnly(session, true);
//         if (stopped.status === "incomplete")
//           return err(
//             this.#retainCleanupFailure(
//               session,
//               "rizin_debug_command",
//               stopped.reason,
//               { cause, partialObservation: evidence },
//             ),
//           );
//         return ok({ result, evidence });
//       }
//       session.protocolError =
//         "Rizin did not return the current command-completion marker; the session was stopped to prevent late output from being attributed to a later command.";
//       const stopped = await this.#stopDebuggerOnly(session, true);
//       if (stopped.status === "incomplete")
//         return err(
//           this.#retainCleanupFailure(
//             session,
//             "rizin_debug_command",
//             stopped.reason,
//             { cause },
//           ),
//         );
//       return err(
//         new AnalysisTimeoutError("rizin_debug_command", this.#frameTimeoutMs, {
//           cause,
//         }),
//       );
//     } finally {
//       if (acquired) {
//         session.commandCaptureActive = false;
//         session.pendingCommandCount -= 1;
//         release?.();
//       } else
//         void previous.then(() => {
//           session.pendingCommandCount -= 1;
//           release?.();
//         });
//     }
//   }
//
//   status(sessionId: string):
//     | {
//         readonly session_id: string;
//         readonly state: "ready" | "closed";
//         readonly inferior_tty: string;
//         readonly recent_output: readonly string[];
//         readonly recent_output_truncated: boolean;
//         readonly diagnostics_truncated: boolean;
//         readonly output_invalid_utf8: boolean;
//       }
//     | undefined {
//     const session = this.#sessions.get(sessionId);
//     return session === undefined
//       ? undefined
//       : {
//           session_id: session.id,
//           state:
//             session.exited ||
//             session.protocolError !== undefined ||
//             session.closing ||
//             !session.ready
//               ? "closed"
//               : "ready",
//           inferior_tty: session.inferiorTty,
//           recent_output: [...session.history],
//           recent_output_truncated: session.historyTruncated,
//           diagnostics_truncated:
//             session.supervisor.snapshot().diagnosticTruncated === true,
//           output_invalid_utf8: session.invalidUtf8Observed,
//         };
//   }
//
//   async close(
//     sessionId: string,
//   ): Promise<Result<{ readonly target_state: "unknown" }, AnalysisError>> {
//     if (this.#closingAll)
//       return err(new AnalysisInputError("close_rizin_debug_session"));
//     const session = this.#sessions.get(sessionId);
//     if (session === undefined)
//       return err(new AnalysisInputError("close_rizin_debug_session"));
//     session.closing = true;
//     const stopped = await this.#stopDebuggerOnly(session);
//     if (stopped.status === "incomplete")
//       return err(
//         this.#retainCleanupFailure(
//           session,
//           "close_rizin_debug_session",
//           stopped.reason,
//         ),
//       );
//     this.#sessions.delete(sessionId);
//     return ok({ target_state: "unknown" });
//   }
//
//   async retryCleanupFailures(): Promise<Result<null, AnalysisError>> {
//     for (const session of this.#sessions.values()) {
//       if (session.cleanupFailures.size === 0) continue;
//       const stopped = await this.#stopDebuggerOnly(session);
//       if (stopped.status === "incomplete")
//         return err(
//           [...session.cleanupFailures].at(-1) ??
//             this.#retainCleanupFailure(
//               session,
//               "close_rizin_debug_session",
//               stopped.reason,
//             ),
//         );
//       this.#sessions.delete(session.id);
//     }
//     return ok(null);
//   }
//
//   async closeAll(): Promise<void> {
//     this.#closingAll = true;
//     if (this.#activeStarts > 0)
//       await new Promise<void>((resolve) =>
//         this.#startDrainWaiters.push(resolve),
//       );
//     for (const session of this.#sessions.values()) session.closing = true;
//     return closeOwnedDebuggerSessions(
//       this.#sessions,
//       (session) => this.#stopDebuggerOnly(session),
//       "Rizin",
//     );
//   }
//
//   #receive(session: RizinDebugSession, chunk: Buffer): void {
//     let offset = 0;
//     while (offset < chunk.length) {
//       const boundary = chunk.indexOf(0, offset);
//       const end = boundary < 0 ? chunk.length : boundary;
//       const nextOffset = boundary + 1;
//       if (boundary >= 0 && nextOffset <= offset) {
//         this.#failProtocol(
//           session,
//           "Rizin frame parser failed to advance past a NUL delimiter.",
//         );
//         return;
//       }
//       const piece = chunk.subarray(offset, end);
//       if (session.discardingOversizedFrame) {
//         if (boundary < 0) return;
//         session.discardingOversizedFrame = false;
//         this.#deliverBufferedFrame(session, true);
//         offset = nextOffset;
//         continue;
//       }
//       if (session.bufferedFrameBytes + piece.length > MAX_FRAME_BYTES) {
//         const message =
//           "Rizin emitted an NUL frame exceeding the 16 MiB protocol limit.";
//         if (!session.commandCaptureActive) {
//           this.#failProtocol(session, message);
//           return;
//         }
//         session.protocolError = message;
//         session.historyTruncated = true;
//         const remainingBytes = MAX_FRAME_BYTES - session.bufferedFrameBytes;
//         if (remainingBytes > 0) {
//           session.frameChunks.push(
//             Buffer.from(piece.subarray(0, remainingBytes)),
//           );
//           session.bufferedFrameBytes += remainingBytes;
//         }
//         if (boundary < 0) {
//           session.discardingOversizedFrame = true;
//           return;
//         }
//         this.#deliverBufferedFrame(session, true);
//         offset = nextOffset;
//         continue;
//       }
//       if (piece.length > 0) {
//         session.frameChunks.push(Buffer.from(piece));
//         session.bufferedFrameBytes += piece.length;
//       }
//       if (boundary < 0) return;
//       this.#deliverBufferedFrame(session, false);
//       offset = nextOffset;
//     }
//   }
//
//   #deliverBufferedFrame(session: RizinDebugSession, truncated: boolean): void {
//     const frameBytes = Buffer.concat(
//       session.frameChunks,
//       session.bufferedFrameBytes,
//     );
//     session.frameChunks = [];
//     session.bufferedFrameBytes = 0;
//     const invalidUtf8 = !isUtf8(frameBytes);
//     session.invalidUtf8Observed ||= invalidUtf8;
//     this.#deliverFrame(
//       session,
//       { text: frameBytes.toString("utf8"), truncated, invalidUtf8 },
//       frameBytes.length,
//     );
//   }
//
//   #startupCapturedOutput(session: RizinDebugSession) {
//     const output = session.supervisor.snapshot();
//     const partialFrame =
//       session.bufferedFrameBytes === 0
//         ? ""
//         : Buffer.concat(
//             session.frameChunks,
//             session.bufferedFrameBytes,
//           ).toString("utf8");
//     const protocolOutput = [...session.history, partialFrame]
//       .filter((frame) => frame.length > 0)
//       .join("\n");
//     const protocolBytes = Buffer.from(protocolOutput, "utf8");
//     let stdoutBytes = Math.min(protocolBytes.length, MAX_DIAGNOSTIC_BYTES);
//     while (
//       stdoutBytes > 0 &&
//       stdoutBytes < protocolBytes.length &&
//       (protocolBytes[stdoutBytes]! & 0xc0) === 0x80
//     )
//       stdoutBytes -= 1;
//     return {
//       stdout: protocolBytes.subarray(0, stdoutBytes).toString("utf8"),
//       stderr: output.stderr.text,
//       truncated:
//         session.historyTruncated ||
//         protocolBytes.length > stdoutBytes ||
//         output.diagnosticTruncated === true ||
//         output.stdout.observedBytes > output.stdout.bytes ||
//         output.stderr.observedBytes > output.stderr.bytes,
//     };
//   }
//
//   #deliverFrame(
//     session: RizinDebugSession,
//     frame: RizinFrame,
//     frameBytes: number,
//   ): void {
//     const historyFrame =
//       frameBytes > MAX_RECENT_FRAME_BYTES || frame.truncated
//         ? `${frame.text.slice(0, MAX_RECENT_FRAME_BYTES)}[recent frame truncated]`
//         : frame.text;
//     if (frameBytes > MAX_RECENT_FRAME_BYTES || frame.truncated)
//       session.historyTruncated = true;
//     session.history.push(historyFrame);
//     if (session.history.length > 64) {
//       session.history.splice(0, session.history.length - 64);
//       session.historyTruncated = true;
//     }
//     const waiter = session.frameWaiters.shift();
//     if (waiter !== undefined) {
//       waiter.resolve(frame);
//       return;
//     }
//     const queueChargeBytes = Math.max(
//       frameBytes,
//       MIN_QUEUED_FRAME_CHARGE_BYTES,
//     );
//     if (
//       session.frames.length >= MAX_QUEUED_FRAMES ||
//       session.queuedFrameBytes + queueChargeBytes > MAX_QUEUED_FRAME_BYTES
//     ) {
//       this.#failProtocol(
//         session,
//         "Rizin produced unsolicited frames exceeding the bounded queue limit.",
//       );
//       return;
//     }
//     session.frames.push({ frame, queueChargeBytes });
//     session.queuedFrameBytes += queueChargeBytes;
//   }
//
//   #failProtocol(session: RizinDebugSession, message: string): void {
//     session.protocolError = message;
//     session.frameChunks = [];
//     session.bufferedFrameBytes = 0;
//     for (const waiter of session.frameWaiters)
//       waiter.reject(new Error(message));
//     session.frameWaiters.length = 0;
//   }
//
//   #stopDebuggerOnly(session: RizinDebugSession, commandTurnHeld = false) {
//     session.closing = true;
//     if (session.stopAttempt !== undefined) return session.stopAttempt;
//     session.cleanupCommandTurnHeld = commandTurnHeld;
//     session.stopAttempt = Promise.resolve()
//       .then(() =>
//         this.#stopProcess(session, "Rizin debugger", {
//           platform: this.#platform,
//         }),
//       )
//       .then((stopped) => {
//         if (stopped.status !== "incomplete") {
//           for (const failure of session.cleanupFailures)
//             failure.resolveCleanup();
//           session.cleanupFailures.clear();
//         }
//         return stopped;
//       })
//       .finally(() => {
//         session.stopAttempt = undefined;
//       });
//     return session.stopAttempt;
//   }
//
//   async #detachInferior(
//     session: RizinDebugSession,
//   ): Promise<
//     | { readonly status: "no-inferior" }
//     | { readonly status: "detached"; readonly outputSink: "durable" }
//   > {
//     if (session.exited || session.protocolError !== undefined)
//       throw new Error(
//         "Rizin protocol state is ambiguous; inferior detach is unverified.",
//       );
//     const previous = session.commandTail;
//     let release!: () => void;
//     session.commandTail = new Promise<void>((resolve) => (release = resolve));
//     await previous;
//     try {
//       return await this.#detachInferiorUnlocked(session);
//     } finally {
//       release();
//     }
//   }
//
//   async #detachInferiorUnlocked(
//     session: RizinDebugSession,
//   ): Promise<
//     | { readonly status: "no-inferior" }
//     | { readonly status: "detached"; readonly outputSink: "durable" }
//   > {
//     if (session.exited || session.protocolError !== undefined)
//       throw new Error(
//         "Rizin protocol state is ambiguous; inferior detach is unverified.",
//       );
//     {
//       session.inferiorInventoryComplete = false;
//       session.knownInferiorIdentities.clear();
//       const initial = parseRizinPtraceRows(
//         await this.#runInternalCommand(session, "olj"),
//       );
//       const inferior = initial;
//       if (inferior.length === 0) {
//         session.knownInferiorIdentities.clear();
export const _l = 398;
