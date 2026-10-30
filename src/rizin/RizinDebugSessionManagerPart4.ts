export const __stub = 1;
//         session.inferiorInventoryComplete = true;
//         return { status: "no-inferior" };
//       }
//       session.knownInferiorIdentities.clear();
//       for (const [, pid] of inferior) {
//         if (session.knownInferiorIdentities.has(pid)) continue;
//         const startTime = await readProcStartTime(pid);
//         session.knownInferiorIdentities.set(pid, {
//           pid,
//           startTime,
//         });
//       }
//       session.inferiorInventoryComplete = true;
//       if (inferior.length !== 1)
//         throw new Error(
//           "Rizin reported multiple or ambiguous ptrace inferiors.",
//         );
//       const [fd, pid] = inferior[0]!;
//       const processStartTime = await readProcStartTime(pid);
//       await this.#verifyInferiorOutputConfiguration(session, pid);
//       await this.#runInternalCommand(session, `o- ${fd}`);
//       const after = parseRizinPtraceRows(
//         await this.#runInternalCommand(session, "olj"),
//       );
//       if (
//         after.some(
//           ([activeFd, activePid]) => activeFd === fd || activePid === pid,
//         ) ||
//         after.length !== 0
//       )
//         throw new Error(
//           "Rizin did not confirm that the selected inferior FD was detached.",
//         );
//       assertRizinProcessStartTimeStable(
//         processStartTime,
//         await readProcStartTime(pid),
//       );
//       await this.#verifyInferiorOutputConfiguration(session, pid);
//       return { status: "detached", outputSink: "durable" };
//     }
//   }
//
//   async #verifyInferiorOutputConfiguration(
//     session: RizinDebugSession,
//     pid: string,
//   ): Promise<void> {
//     const exitKills = (
//       await this.#runInternalCommand(session, "e dbg.exitkills")
//     ).trim();
//     if (exitKills !== "false")
//       throw new Error("Rizin dbg.exitkills readback did not confirm false.");
//     for (const descriptor of ["1", "2"]) {
//       const descriptorPath = `/proc/${pid}/fd/${descriptor}`;
//       const destination = await readlink(descriptorPath);
//       const destinationStat = await stat(descriptorPath);
//       if (
//         destinationStat.dev !== session.inferiorTtyDevice ||
//         destinationStat.ino !== session.inferiorTtyInode ||
//         (destinationStat.mode & fsConstants.S_IFMT) !== fsConstants.S_IFCHR ||
//         (await realpath(destination)) !== session.inferiorTty
//       )
//         throw new Error(
//           `Inferior descriptor ${descriptor} is not routed to the selected TTY.`,
//         );
//     }
//   }
//
//   async #runInternalCommand(
//     session: RizinDebugSession,
//     command: string,
//   ): Promise<string> {
//     const marker = `__REA_CLEANUP_COMPLETE_${randomUUID().replaceAll("-", "")}__`;
//     const stdin = session.launched.process.stdin;
//     if (
//       stdin === null ||
//       stdin === undefined ||
//       stdin.destroyed ||
//       !stdin.writable
//     )
//       throw new Error("Rizin stdin is unavailable during cleanup.");
//     stdin.write(`${command}\n!echo ${marker}\n`);
//     const captured = await waitForCommandFrames(
//       session,
//       marker,
//       CLEANUP_COMMAND_TIMEOUT_MS,
//       undefined,
//       this.#maxCommandOutputBytes,
//     );
//     if (captured.outputTruncated)
//       throw new Error("Rizin cleanup readback was truncated.");
//     return captured.output;
//   }
//
//   #retainCleanupFailure(
//     session: RizinDebugSession,
//     operation: string,
//     reason: string,
//     options: AnalysisErrorOptions = {},
//   ): AnalysisError {
//     const failure = new AnalysisCapabilityUnavailableError(
//       "rizin",
//       operation,
//       `The owned Rizin process could not be confirmed stopped: ${reason}`,
//       { ...options, cleanup: { reason, resources: [session.id] } },
//     );
//     session.cleanupFailures.add(failure);
//     return failure;
//   }
//
//   async #stopAfterProtocolFailure(
//     session: RizinDebugSession,
//     cause: unknown,
//     commandTurnHeld = false,
//   ): Promise<AnalysisError> {
//     const stopped = await this.#stopDebuggerOnly(session, commandTurnHeld);
//     return stopped.status === "incomplete"
//       ? this.#retainCleanupFailure(
//           session,
//           "rizin_debug_command",
//           stopped.reason,
//           { cause },
//         )
//       : new AnalysisCapabilityUnavailableError(
//           "rizin",
//           "rizin_debug_command",
//           session.protocolError!,
//           { cause },
//         );
//   }
// }
//
// export interface RizinDebugCommandResult {
//   readonly command: string;
//   readonly output: string;
//   readonly output_scope: "command_and_interleaved_session_output";
//   readonly output_truncated: boolean;
//   readonly output_invalid_utf8?: true;
//   readonly completion_status: "complete" | "unknown";
//   readonly backend: string | null;
// }
//
// const parseRizinPtraceRows = (output: string): Array<[string, string]> => {
//   let parsed: unknown;
//   try {
//     parsed = JSON.parse(output);
//   } catch (cause) {
//     throw new Error("Rizin returned malformed JSON for `olj`.", { cause });
//   }
//   if (!Array.isArray(parsed))
//     throw new Error("Rizin `olj` response is not an array.");
//   const rows: Array<[string, string]> = [];
//   for (const row of parsed) {
//     if (
//       typeof row !== "object" ||
//       row === null ||
//       typeof (row as { fd?: unknown }).fd !== "number" ||
//       !Number.isSafeInteger((row as { fd: number }).fd) ||
//       (row as { fd: number }).fd < 0 ||
//       typeof (row as { raised?: unknown }).raised !== "boolean" ||
//       typeof (row as { uri?: unknown }).uri !== "string"
//     )
//       throw new Error(
//         "Rizin `olj` response contains a malformed descriptor row.",
//       );
//     const uri = (row as { uri: string }).uri;
//     const match = /^ptrace:\/\/(\d+)$/u.exec(uri);
//     if (match !== null) {
//       if ((row as { raised: boolean }).raised !== true)
//         throw new Error("Rizin `olj` ptrace descriptor is not active.");
//       rows.push([String((row as { fd: number }).fd), match[1]!]);
//     } else if (uri.startsWith("ptrace://"))
//       throw new Error("Rizin `olj` returned a malformed ptrace URI.");
//   }
//   return rows;
// };
//
// /** @internal Pure parser kept separately testable from live `/proc` access. */
// export const parseRizinProcStartTime = (statContents: string): string => {
//   const commandEnd = statContents.lastIndexOf(")");
//   if (commandEnd < 0)
//     throw new Error("Inferior process identity is malformed.");
//   const fieldsAfterCommand = statContents
//     .slice(commandEnd + 1)
//     .trim()
//     .split(/\s+/u);
//   const startTime = fieldsAfterCommand[19];
//   if (startTime === undefined || !/^\d+$/u.test(startTime))
//     throw new Error("Inferior process start time could not be verified.");
//   return startTime;
// };
//
// /** @internal Reject a PID that changed identity during inferior detach. */
// export const assertRizinProcessStartTimeStable = (
//   before: string,
//   after: string,
// ): void => {
//   if (after !== before)
//     throw new Error(
//       "The inferior PID disappeared or was reused during detach verification.",
//     );
// };
//
// const readProcStartTime = async (pid: string): Promise<string> =>
//   parseRizinProcStartTime(await readFile(`/proc/${pid}/stat`, "utf8"));
//
// const waitForCommandFrames = async (
//   session: RizinDebugSession,
//   marker: string,
//   timeoutMs: number,
//   signal?: AbortSignal,
//   maxCommandOutputBytes = MAX_COMMAND_OUTPUT_BYTES,
// ): Promise<{
//   readonly output: string;
//   readonly outputTruncated: boolean;
//   readonly outputInvalidUtf8: boolean;
// }> => {
//   const deadline = Date.now() + timeoutMs;
//   const output: string[] = [];
//   let outputInvalidUtf8 = false;
//   const commandTimeoutError = (): RizinCommandTimeoutError =>
//     createRizinCommandTimeoutError(output, outputInvalidUtf8);
//   let outputBytes = 0;
//   let frameCount = 0;
//   for (;;) {
//     const remaining = deadline - Date.now();
//     if (isRizinCommandDeadlineExpired(remaining)) throw commandTimeoutError();
//     let received: RizinFrame;
//     try {
//       received = await waitForFrame(
//         session,
//         remaining,
//         signal,
//         commandTimeoutError,
//       );
//     } catch (cause) {
//       if (cause instanceof AnalysisCancelledError)
//         throw new RizinCommandCancelledError(
//           output.join("\n"),
//           outputInvalidUtf8,
//           cause,
//         );
//       if (cause instanceof RizinProcessExitError)
//         throw new RizinProcessExitError(output.join("\n"), outputInvalidUtf8);
//       throw cause;
//     }
//     outputInvalidUtf8 ||= received.invalidUtf8;
//     frameCount += 1;
//     if (frameCount > MAX_COMMAND_FRAMES) {
//       const message =
//         "Rizin emitted more than 4096 frames for one command; the session was stopped because output correlation is ambiguous.";
//       session.protocolError = message;
//       return {
//         output: output.join("\n"),
//         outputTruncated: true,
//         outputInvalidUtf8,
//       };
//     }
//     if (received.truncated) {
//       const separatorBytes = output.length > 0 ? 1 : 0;
//       output.push(
//         truncateUtf8(
//           received.text,
//           maxCommandOutputBytes - outputBytes - separatorBytes,
//         ),
//       );
//       return {
//         output: output.join("\n"),
//         outputTruncated: true,
//         outputInvalidUtf8,
//       };
//     }
//     const frame = received.text;
//     const markerIndex = frame.indexOf(marker);
//     if (markerIndex >= 0) {
//       const beforeMarker = frame.slice(0, markerIndex).trimEnd();
//       if (beforeMarker.length > 0) {
//         const beforeMarkerBytes = Buffer.byteLength(beforeMarker, "utf8");
//         const separatorBytes = output.length > 0 ? 1 : 0;
//         if (
//           outputBytes + separatorBytes + beforeMarkerBytes >
//           maxCommandOutputBytes
//         ) {
//           const message =
//             "Rizin command output exceeded the 16 MiB command limit.";
//           session.protocolError = message;
//           const retained = truncateUtf8(
//             beforeMarker,
//             maxCommandOutputBytes - outputBytes - separatorBytes,
//           );
//           if (retained.length > 0) output.push(retained);
//           return {
//             output: output.join("\n"),
//             outputTruncated: true,
//             outputInvalidUtf8,
//           };
//         }
//         outputBytes += separatorBytes + beforeMarkerBytes;
//         output.push(beforeMarker);
//       }
//       return {
//         output: output.join("\n"),
//         outputTruncated: false,
//         outputInvalidUtf8,
//       };
//     }
//     const frameBytes = Buffer.byteLength(frame, "utf8");
//     const separatorBytes = output.length > 0 ? 1 : 0;
//     if (outputBytes + separatorBytes + frameBytes > maxCommandOutputBytes) {
//       const message = "Rizin command output exceeded the 16 MiB command limit.";
//       session.protocolError = message;
//       output.push(
//         truncateUtf8(
//           frame,
//           maxCommandOutputBytes - outputBytes - separatorBytes,
//         ),
//       );
//       return {
//         output: output.join("\n"),
//         outputTruncated: true,
//         outputInvalidUtf8,
//       };
//     }
//     outputBytes += separatorBytes + frameBytes;
//     output.push(frame);
//   }
// };
//
// const truncateUtf8 = (value: string, maximumBytes: number): string => {
//   if (maximumBytes <= 0) return "";
//   const bytes = Buffer.from(value, "utf8").subarray(0, maximumBytes);
//   return bytes.toString("utf8").replace(/\uFFFD$/u, "");
// };
//
// const waitForFrame = (
//   session: RizinDebugSession,
//   timeoutMs: number,
//   signal?: AbortSignal,
//   timeoutError?: () => Error,
// ): Promise<RizinFrame> => {
//   if (signal?.aborted)
//     return Promise.reject(new AnalysisCancelledError("rizin_debug_command"));
//   const queued = session.frames.shift();
//   if (queued !== undefined) {
//     session.queuedFrameBytes -= queued.queueChargeBytes;
//     return Promise.resolve(queued.frame);
//   }
//   if (session.exited) return Promise.reject(new RizinProcessExitError(""));
//   return new Promise((resolve, reject) => {
//     // Settlement removes all three trigger paths before resolving or rejecting.
//     const cleanup = (): void => {
//       clearTimeout(timer);
//       signal?.removeEventListener("abort", onAbort);
//       const index = session.frameWaiters.indexOf(waiter);
//       if (index >= 0) session.frameWaiters.splice(index, 1);
//     };
//     const onAbort = (): void => {
//       cleanup();
//       reject(new AnalysisCancelledError("rizin_debug_command"));
//     };
//     const timer = setTimeout(() => {
//       cleanup();
//       reject(timeoutError?.() ?? new RizinFrameTimeoutError());
//     }, timeoutMs);
//     const waiter = {
//       resolve: (frame: RizinFrame): void => {
//         cleanup();
//         resolve(frame);
//       },
//       reject: (cause: Error): void => {
//         cleanup();
//         reject(cause);
//       },
//     };
//     session.frameWaiters.push(waiter);
//     signal?.addEventListener("abort", onAbort, { once: true });
//     if (signal?.aborted) onAbort();
//   });
// };
//
// const waitForTurn = (
//   previous: Promise<void>,
//   signal?: AbortSignal,
// ): Promise<void> => {
//   if (signal === undefined) return previous;
//   if (signal.aborted)
//     return Promise.reject(new AnalysisCancelledError("rizin_debug_command"));
//   return new Promise<void>((resolve, reject) => {
//     const onAbort = (): void =>
//       reject(new AnalysisCancelledError("rizin_debug_command"));
//     signal.addEventListener("abort", onAbort, { once: true });
//     previous.then(() => {
//       signal.removeEventListener("abort", onAbort);
//       resolve();
//     });
//   });
// };
export const _l = 396;
