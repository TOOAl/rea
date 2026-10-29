export const __stub = 1;
//   }
//
//   async close(
//     sessionId: string,
//   ): Promise<
//     Result<
//       { readonly target_state: "none_observed" | "unknown" },
//       AnalysisError
//     >
//   > {
//     if (this.#closing)
//       return err(new AnalysisCancelledError("close_gdb_session"));
//     const session = this.#sessions.get(sessionId);
//     if (session === undefined)
//       return err(new AnalysisInputError("close_gdb_session"));
//     if (session.exited) {
//       const stopped = await this.#stopDebuggerOnly(session);
//       if (stopped.status === "incomplete")
//         return err(
//           this.#retainCleanupFailure(
//             session,
//             "close_gdb_session",
//             stopped.reason,
//           ),
//         );
//       this.#sessions.delete(sessionId);
//       return ok({ target_state: "unknown" });
//     }
//     try {
//       return await this.#serialize(
//         session,
//         async () => {
//           if (session.exited) {
//             const stopped = await this.#stopDebuggerOnly(session);
//             if (stopped.status === "incomplete")
//               return err(
//                 this.#retainCleanupFailure(
//                   session,
//                   "close_gdb_session",
//                   stopped.reason,
//                 ),
//               );
//             this.#sessions.delete(sessionId);
//             return ok({ target_state: "unknown" });
//           }
//           let targetState: "none_observed" | "unknown" = "unknown";
//           try {
//             const groups = await this.#request(
//               session,
//               "-list-thread-groups --recurse 1",
//             );
//             if (
//               groups.completion_status !== "complete" ||
//               groups.output_truncated ||
//               !/^\d+\^done(?:,|$)/u.test(groups.mi)
//             )
//               throw new Error(
//                 "GDB could not confirm its complete, untruncated inferior list before shutdown.",
//               );
//             const groupCount = gdbThreadGroupCount(groups.mi);
//             if (groupCount === undefined)
//               throw new Error(
//                 "GDB returned an unknown inferior list before shutdown.",
//               );
//             if (groupCount > 0 && !session.inferiorTtyVerified)
//               return err(
//                 new AnalysisInputError("close_gdb_session", undefined, [
//                   {
//                     path: ["session_id"],
//                     reason: "invalid_value",
//                     message:
//                       "Live GDB thread groups remain and no verified durable inferior TTY is configured. Select a safe disposition through the GDB console or restart with inferior_tty before closing.",
//                   },
//                 ]),
//               );
//             if (groupCount === 0) {
//               session.noInferiorVerified = true;
//               targetState = "none_observed";
//               await this.#request(session, "-gdb-exit");
//             } else {
//               session.noInferiorVerified = false;
//               const disposition = await this.#detachInferior(session);
//               targetState =
//                 disposition.status === "no-inferior"
//                   ? "none_observed"
//                   : "unknown";
//             }
//           } catch {
//             // If MI synchronization is lost, stop only the owned debugger process.
//           }
//           const stopped = await this.#stopDebuggerOnly(session);
//           if (stopped.status === "incomplete")
//             return err(
//               this.#retainCleanupFailure(
//                 session,
//                 "close_gdb_session",
//                 stopped.reason,
//               ),
//             );
//           this.#sessions.delete(sessionId);
//           return ok({ target_state: targetState });
//         },
//         undefined,
//         "close_gdb_session",
//       );
//     } catch (cause) {
//       if (cause instanceof AnalysisError) return err(cause);
//       throw cause;
//     }
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
//               "close_gdb_session",
//               stopped.reason,
//             ),
//         );
//       this.#sessions.delete(session.id);
//     }
//     return ok(null);
//   }
//
//   async closeAll(): Promise<void> {
//     this.#closing = true;
//     this.#closePromise ??= this.#drainStartsAndCloseSessions().catch(
//       (cause: unknown) => {
//         this.#closePromise = undefined;
//         throw cause;
//       },
//     );
//     return this.#closePromise;
//   }
//
//   async #drainStartsAndCloseSessions(): Promise<void> {
//     const active = [...this.#activeStarts.entries()];
//     for (const [controller] of active) controller.abort();
//     await Promise.allSettled(active.map(([, start]) => start));
//     await Promise.all(
//       [...this.#sessions.values()].map((session) => session.commandTail),
//     );
//     await closeOwnedDebuggerSessions(
//       this.#sessions,
//       (session) => this.#stopDebuggerOnly(session),
//       "GDB",
//     );
//   }
//
//   async #serialize<Value>(
//     session: GdbSession,
//     operation: () => Promise<Value>,
//     signal?: AbortSignal,
//     operationName: "gdb_console" | "close_gdb_session" = "gdb_console",
//   ): Promise<Value> {
//     if (session.pendingCommandCount >= MAX_PENDING_GDB_COMMANDS)
//       throw new AnalysisResourceConstraintError(
//         operationName,
//         "transport",
//         "GDB command queue capacity reached.",
//         {
//           max_pending_commands: MAX_PENDING_GDB_COMMANDS,
//           active_or_queued_commands: session.pendingCommandCount,
//         },
//       );
//     session.pendingCommandCount += 1;
//     const previous = session.commandTail;
//     let release: (() => void) | undefined;
//     let acquired = false;
//     session.commandTail = new Promise<void>((resolve) => {
//       release = resolve;
//     });
//     try {
//       await waitForGdbCommandTurn(previous, signal);
//       acquired = true;
//       return await operation();
//     } finally {
//       if (acquired) {
//         session.pendingCommandCount -= 1;
//         release?.();
//       } else {
//         // The cancelled placeholder still occupies commandTail until its turn.
//         // Keep its reservation until then so repeated cancellations cannot
//         // bypass the per-session queue bound while an earlier command stalls.
//         void previous.then(() => {
//           session.pendingCommandCount -= 1;
//           release?.();
//         });
//       }
//     }
//   }
//
//   #receive(session: GdbSession, data: Buffer): void {
//     if (session.startupResolve !== undefined) {
//       const prompt = session.promptTail + data.toString("utf8");
//       if (prompt.includes("(gdb)")) {
//         const resolve = session.startupResolve;
//         session.startupResolve = undefined;
//         resolve();
//       }
//       session.promptTail = prompt.slice(-4);
//     }
//     const lines: { readonly value: string; readonly invalidUtf8: boolean }[] =
//       [];
//     let offset = 0;
//     while (offset < data.byteLength) {
//       const newline = data.indexOf(0x0a, offset);
//       const piece = data.subarray(
//         offset,
//         newline < 0 ? data.byteLength : newline,
//       );
//       session.bufferBytes += piece.byteLength;
//       const lineBytes =
//         session.bufferBytes - (newline >= 0 && piece.at(-1) === 0x0d ? 1 : 0);
//       if (lineBytes > MAX_MI_LINE_BYTES) {
//         this.#failProtocol(
//           session,
//           "GDB emitted an MI line exceeding the 16 MiB protocol limit.",
//         );
//         return;
//       }
//       this.#appendLineBytes(session, piece);
//       if (newline < 0) break;
//       const record = Buffer.concat(
//         [
//           ...session.bufferChunks,
//           ...(session.bufferTail === undefined
//             ? []
//             : [session.bufferTail.subarray(0, session.bufferTailBytes)]),
//         ],
//         session.bufferBytes,
//       );
//       const withoutCarriageReturn =
//         record.at(-1) === 0x0d ? record.subarray(0, -1) : record;
//       const invalidUtf8 = !isUtf8(withoutCarriageReturn);
//       const line = withoutCarriageReturn.toString("utf8");
//       session.bufferChunks.length = 0;
//       session.bufferTail = undefined;
//       session.bufferTailBytes = 0;
//       session.bufferBytes = 0;
//       if (invalidUtf8) session.invalidUtf8Observed = true;
//       if (line.length > 0) lines.push({ value: line, invalidUtf8 });
//       offset = newline + 1;
//     }
//     for (const { value: line } of lines) {
//       if (Buffer.byteLength(line, "utf8") > MAX_RECENT_MI_LINE_BYTES) {
//         session.lines.push(truncateUtf8RecordPrefix(line));
//         session.recentRecordsTruncated = true;
//       } else session.lines.push(line);
//     }
//     if (session.lines.length > 256) {
//       session.lines.splice(0, session.lines.length - 256);
//       session.recentRecordsTruncated = true;
//     }
//     for (const { value: line, invalidUtf8 } of lines) {
//       for (const pending of session.pending.values()) {
//         const lineBytes = Buffer.byteLength(line, "utf8") + 1;
//         if (
//           pending.outputBytes + lineBytes <= session.maxCommandOutputBytes &&
//           pending.outputBytes + lineBytes <= MAX_COMMAND_OUTPUT_BYTES &&
//           pending.lines.length < MAX_COMMAND_OUTPUT_RECORDS
//         ) {
//           pending.lines.push(line);
//           pending.outputBytes += lineBytes;
//           pending.outputInvalidUtf8 ||= invalidUtf8;
//         } else pending.outputTruncated = true;
//       }
//       if (line.startsWith("*stopped")) {
//         for (const [token, pending] of session.pending) {
//           if (!pending.awaitingInferiorStop) continue;
//           clearTimeout(pending.timer);
//           session.pending.delete(token);
//           pending.cleanup();
//           const records = [...pending.lines];
//           pending.resolve({
//             command: "",
//             mi: pending.terminalRecord ?? "",
//             records,
//             console: records
//               .filter((record) => record.startsWith("~"))
//               .join("\n"),
//             target: records
//               .filter((record) => record.startsWith("@"))
//               .join("\n"),
//             log: records.filter((record) => record.startsWith("&")).join("\n"),
//             output_truncated: pending.outputTruncated,
//             ...(pending.outputInvalidUtf8
//               ? { output_invalid_utf8: true as const }
//               : {}),
//             completion_status: "complete",
//           });
//         }
//         continue;
//       }
//       const match = /^(\d+)\^(done|running|connected|error|exit)(?:,|$)/u.exec(
//         line,
//       );
//       if (match === null) continue;
//       const token = Number(match[1]);
//       const pending = session.pending.get(token);
//       if (pending === undefined) continue;
//       if (match[2] === "running") {
//         pending.terminalRecord = line;
//         pending.awaitingInferiorStop = true;
//         continue;
//       }
//       clearTimeout(pending.timer);
//       session.pending.delete(token);
//       pending.cleanup();
//       const records = [...pending.lines];
//       pending.resolve({
//         command: "",
//         mi: line,
//         records,
//         console: records.filter((record) => record.startsWith("~")).join("\n"),
//         target: records.filter((record) => record.startsWith("@")).join("\n"),
//         log: records.filter((record) => record.startsWith("&")).join("\n"),
//         output_truncated: pending.outputTruncated,
//         ...(pending.outputInvalidUtf8
//           ? { output_invalid_utf8: true as const }
//           : {}),
//         completion_status: "complete",
//       });
//     }
//   }
//
//   #appendLineBytes(session: GdbSession, piece: Buffer): void {
//     const slabBytes = 64 * 1024;
//     let offset = 0;
//     while (offset < piece.length) {
//       session.bufferTail ??= Buffer.allocUnsafe(slabBytes);
//       const remaining = slabBytes - session.bufferTailBytes;
//       const copied = Math.min(remaining, piece.length - offset);
//       piece.copy(
//         session.bufferTail,
//         session.bufferTailBytes,
//         offset,
//         offset + copied,
//       );
//       session.bufferTailBytes += copied;
//       offset += copied;
//       if (session.bufferTailBytes === slabBytes) {
//         session.bufferChunks.push(session.bufferTail);
//         session.bufferTail = undefined;
//         session.bufferTailBytes = 0;
//       }
//     }
//   }
//
//   #failProtocol(session: GdbSession, message: string): void {
//     if (session.exited || session.protocolError !== undefined) return;
//     session.protocolError = message;
//     for (const pending of session.pending.values()) {
//       clearTimeout(pending.timer);
//       pending.cleanup();
//       const records = [...pending.lines];
//       pending.reject(
//         new GdbProtocolFailureError(message, {
//           command: pending.command,
//           mi: "",
//           records,
//           console: records.filter((line) => line.startsWith("~")).join("\n"),
//           target: records.filter((line) => line.startsWith("@")).join("\n"),
//           log: records.filter((line) => line.startsWith("&")).join("\n"),
//           output_truncated: pending.outputTruncated,
//           ...(pending.outputInvalidUtf8
//             ? { output_invalid_utf8: true as const }
//             : {}),
//           completion_status: "unknown",
//         }),
//       );
//     }
//     session.pending.clear();
//     session.startupReject?.(new Error(message));
export const _lines = 379;
