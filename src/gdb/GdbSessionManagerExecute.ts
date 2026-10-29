export const __stub = 1;
//       // Give queued exit notifications a turn before publishing startup.
//       await new Promise<void>((resolve) => setImmediate(resolve));
//       if (signal?.aborted)
//         throw new AnalysisCancelledError("start_gdb_session");
//       if (session.exited || session.protocolError !== undefined)
//         throw new Error(
//           session.protocolError ?? "GDB exited during startup readiness.",
//         );
//       // Before this point no target command can run. Once a usable session is
//       // published, the inferior state is no longer inferred from startup phase.
//       session.noInferiorVerified = false;
//       this.#sessions.set(id, session);
//       releaseReservation();
//       return ok({ session_id: id, mi_version: miVersion });
//     } catch (cause) {
//       const startupExited =
//         cause instanceof GdbCommandProcessExitError || session.exited;
//       const processExit =
//         cause instanceof GdbCommandProcessExitError
//           ? cause.partial
//           : startupExited
//             ? {
//                 command: "GDB startup",
//                 mi: "",
//                 records: [...session.lines],
//                 console: session.lines
//                   .filter((line) => line.startsWith("~"))
//                   .join("\n"),
//                 target: session.lines
//                   .filter((line) => line.startsWith("@"))
//                   .join("\n"),
//                 log: session.lines
//                   .filter((line) => line.startsWith("&"))
//                   .join("\n"),
//                 process_exit_observed: true,
//                 process_exit_code: session.exitCode,
//                 process_exit_signal: session.exitSignal,
//                 output_truncated: session.recentRecordsTruncated,
//                 completion_status: "unknown" as const,
//               }
//             : undefined;
//       const startupEvidenceResult =
//         processExit ??
//         (session.lines.length > 0
//           ? {
//               command: "GDB startup",
//               mi: "",
//               records: [...session.lines],
//               console: session.lines
//                 .filter((line) => line.startsWith("~"))
//                 .join("\n"),
//               target: session.lines
//                 .filter((line) => line.startsWith("@"))
//                 .join("\n"),
//               log: session.lines
//                 .filter((line) => line.startsWith("&"))
//                 .join("\n"),
//               output_truncated: session.recentRecordsTruncated,
//               completion_status: "unknown" as const,
//             }
//           : undefined);
//       const startupEvidencePayload =
//         startupEvidenceResult === undefined
//           ? undefined
//           : {
//               ...startupEvidenceResult,
//               ...(session.invalidUtf8Observed
//                 ? { output_invalid_utf8: true as const }
//                 : {}),
//             };
//       const startupEvidence =
//         startupEvidencePayload === undefined
//           ? undefined
//           : createEvidence(undefined, GDB_PROVIDER_IDENTITY, {
//               predicateType: "rea.debugger.startup-observation",
//               operation: "start_gdb_session",
//               parameters: {
//                 mi_version: miVersion,
//                 command: startupEvidencePayload.command,
//               },
//               result: {
//                 ...startupEvidencePayload,
//                 records: [...startupEvidencePayload.records],
//               },
//               rawResult: {
//                 ...startupEvidencePayload,
//                 records: [...startupEvidencePayload.records],
//               },
//               subjectUnavailableReason:
//                 "No usable debugger session became ready during GDB startup.",
//               limitations: [
//                 "GDB startup failed before a usable session could be established; captured startup records are incomplete.",
//                 ...(session.invalidUtf8Observed
//                   ? [
//                       "GDB startup output contained invalid UTF-8 bytes; decoded records contain replacement characters.",
//                     ]
//                   : []),
//               ],
//             });
//       const processOutput = session.supervisor.snapshot();
//       const capturedOutput = {
//         stdout: processOutput.stdout.text,
//         stderr: processOutput.stderr.text,
//         truncated:
//           processOutput.diagnosticTruncated === true ||
//           processOutput.stdout.observedBytes > processOutput.stdout.bytes ||
//           processOutput.stderr.observedBytes > processOutput.stderr.bytes,
//         stdout_bytes: processOutput.stdout.observedBytes,
//         stderr_bytes: processOutput.stderr.observedBytes,
//         exit_code: processOutput.exitCode ?? null,
//         signal: processOutput.signal ?? null,
//       };
//       const stopped = await this.#stopDebuggerOnly(session);
//       if (stopped.status === "incomplete") {
//         this.#sessions.set(id, session);
//         releaseReservation();
//         const cleanup = { reason: stopped.reason, resources: [session.id] };
//         const details = {
//           cause,
//           capturedOutput,
//           cleanup,
//           ...(startupEvidence === undefined
//             ? {}
//             : { partialObservation: startupEvidence }),
//         };
//         if (cause instanceof AnalysisTimeoutError)
//           return err(
//             new AnalysisTimeoutError(cause.operation, cause.timeoutMs, details),
//           );
//         if (cause instanceof AnalysisCancelledError)
//           return err(new AnalysisCancelledError(cause.operation, details));
//         const startupFailureMessage = gdbErrorMessage(cause);
//         return err(
//           new AnalysisCapabilityUnavailableError(
//             "gdb",
//             "start_gdb_session",
//             `GDB startup failed (${startupFailureMessage}) and its owned process could not be confirmed stopped: ${stopped.reason}`,
//             details,
//           ),
//         );
//       }
//       const errorDetails = {
//         cause,
//         capturedOutput,
//         ...(startupEvidence === undefined
//           ? {}
//           : { partialObservation: startupEvidence }),
//       };
//       const error =
//         signal?.aborted || cause instanceof AnalysisCancelledError
//           ? new AnalysisCancelledError("start_gdb_session", errorDetails)
//           : cause instanceof AnalysisTimeoutError
//             ? new AnalysisTimeoutError(
//                 cause instanceof GdbCommandTimeoutError
//                   ? "start_gdb_session"
//                   : cause.operation,
//                 cause.timeoutMs,
//                 errorDetails,
//               )
//             : cause instanceof AnalysisCapabilityUnavailableError
//               ? new AnalysisCapabilityUnavailableError(
//                   "gdb",
//                   "start_gdb_session",
//                   cause.message,
//                   errorDetails,
//                 )
//               : session.protocolError !== undefined
//                 ? new AnalysisCapabilityUnavailableError(
//                     "gdb",
//                     "start_gdb_session",
//                     session.protocolError,
//                     errorDetails,
//                   )
//                 : new AnalysisCapabilityUnavailableError(
//                     "gdb",
//                     "start_gdb_session",
//                     `GDB startup failed (${gdbErrorMessage(cause)}).`,
//                     errorDetails,
//                   );
//       return err(error);
//     } finally {
//       clearTimeout(startupTimer);
//       signal?.removeEventListener("abort", startupAbortListener);
//     }
//   }
//
//   async execute(
//     sessionId: string,
//     command: string,
//     signal?: AbortSignal,
//   ): Promise<
//     Result<
//       { readonly result: GdbCommandResult; readonly evidence: Evidence },
//       AnalysisError
//     >
//   > {
//     const session = this.#sessions.get(sessionId);
//     if (
//       this.#closing ||
//       session === undefined ||
//       !session.ready ||
//       session.exited ||
//       session.protocolError !== undefined
//     )
//       return err(
//         new AnalysisInputError("gdb_console", undefined, [
//           {
//             path: ["session_id"],
//             reason: "invalid_value",
//             message: "GDB session is unavailable or closed.",
//           },
//         ]),
//       );
//     if (signal?.aborted) return err(new AnalysisCancelledError("gdb_console"));
//     try {
//       const completed = await this.#serialize(
//         session,
//         async () => {
//           if (session.exited || session.protocolError !== undefined)
//             return err(new AnalysisInputError("gdb_console"));
//           session.noInferiorVerified = false;
//           session.knownInferiorIdentities.clear();
//           if (commandMayChangeInferiorOutput(command))
//             session.inferiorTtyVerified = false;
//           try {
//             const result = await this.#request(
//               session,
//               `-interpreter-exec console ${miQuote(command)}`,
//               signal,
//               "gdb_console",
//               command,
//             );
//             const evidence = createEvidence(
//               undefined,
//               { id: "gnu.gdb", name: "GNU GDB", version: null },
//               {
//                 predicateType: "rea.debugger.console-observation",
//                 operation: "gdb_console",
//                 parameters: { session_id: sessionId, command },
//                 result: {
//                   command,
//                   mi: result.mi,
//                   records: [...result.records],
//                   console: result.console,
//                   target: result.target,
//                   log: result.log,
//                   output_truncated: result.output_truncated,
//                   ...(result.output_invalid_utf8
//                     ? { output_invalid_utf8: true as const }
//                     : {}),
//                   completion_status: result.completion_status,
//                 },
//                 rawResult: {
//                   command,
//                   mi: result.mi,
//                   records: [...result.records],
//                   console: result.console,
//                   target: result.target,
//                   log: result.log,
//                   output_truncated: result.output_truncated,
//                   ...(result.output_invalid_utf8
//                     ? { output_invalid_utf8: true as const }
//                     : {}),
//                   completion_status: result.completion_status,
//                 },
//                 subjectUnavailableReason:
//                   "The active GDB inferior identity is not established by the debugger session identifier.",
//                 limitations: [
//                   "MI records are returned as decoded text; their semantics depend on GDB version and target.",
//                   ...(result.output_invalid_utf8
//                     ? [
//                         "MI stream bytes were not valid UTF-8; returned text contains replacement characters.",
//                       ]
//                     : []),
//                   "The unrestricted GDB console can access local shell, filesystem, network, and target controls.",
//                 ],
//               },
//             );
//             return ok({ result, evidence });
//           } catch (cause) {
//             if (cause instanceof AnalysisCancelledError) return err(cause);
//             if (cause instanceof AnalysisCapabilityUnavailableError)
//               return err(cause as AnalysisError);
//             if (cause instanceof GdbCommandTimeoutError) {
//               const result = cause.partial;
//               return ok({ result, evidence: cause.evidence });
//             }
//             if (session.protocolError !== undefined)
//               return err(await this.#stopAfterProtocolFailure(session, cause));
//             if (cause instanceof GdbCommandProcessExitError) {
//               const processExit = cause as GdbCommandProcessExitError;
//               const result: GdbCommandResult = {
//                 ...processExit.partial,
//                 command,
//               };
//               const evidence = createEvidence(
//                 undefined,
//                 { id: "gnu.gdb", name: "GNU GDB", version: null },
//                 {
//                   predicateType: "rea.debugger.console-observation",
//                   operation: "gdb_console",
//                   parameters: { session_id: sessionId, command },
//                   result: { ...result, records: [...result.records] },
//                   rawResult: { ...result, records: [...result.records] },
//                   subjectUnavailableReason:
//                     "The active GDB inferior identity is not established by the debugger session identifier.",
//                   limitations: [
//                     "GDB exited before returning a correlated MI result record; only records retained for the active command are returned raw.",
//                     ...(result.output_truncated
//                       ? [
//                           "Retained MI records are a truncated prefix; output completeness is unknown.",
//                         ]
//                       : []),
//                   ],
//                 },
//               );
//               const stopped = await this.#stopDebuggerOnly(session);
//               if (stopped.status === "incomplete")
//                 return err(
//                   this.#retainCleanupFailure(
//                     session,
//                     "gdb_console",
//                     stopped.reason,
//                     { cause, partialObservation: evidence },
//                   ),
//                 );
//               return ok({ result, evidence });
//             }
//             return err(
//               new AnalysisTimeoutError("gdb_console", this.#commandTimeoutMs, {
//                 cause,
//               }),
//             );
//           }
//         },
//         signal,
//         "gdb_console",
//       );
//       if (!completed.ok && completed.error.cleanupIncomplete)
//         session.cleanupFailures.add(completed.error);
//       return completed;
//     } catch (cause) {
//       const error =
//         cause instanceof AnalysisError
//           ? cause
//           : new AnalysisCancelledError("gdb_console", { cause });
//       if (error.cleanupIncomplete) session.cleanupFailures.add(error);
//       return err(error);
//     }
//   }
//
//   status(sessionId: string):
//     | {
//         readonly session_id: string;
//         readonly mi_version: "mi3" | "mi2";
//         readonly state: "ready" | "closed";
//         readonly recent_mi_records: readonly string[];
//         readonly recent_mi_records_truncated: boolean;
//         readonly mi_invalid_utf8: boolean;
//         readonly stderr: string;
//         readonly stderr_observed_bytes: number;
//         readonly stderr_truncated: boolean;
//         readonly stderr_invalid_utf8: boolean;
//         readonly diagnostics_truncated: boolean;
//         readonly inferior_tty: string | null;
//         readonly inferior_tty_verified: boolean;
//       }
//     | undefined {
//     const session = this.#sessions.get(sessionId);
//     if (session === undefined) return undefined;
//     const diagnostics = session.supervisor.snapshot();
//     return {
//       session_id: session.id,
//       mi_version: session.miVersion,
//       state:
//         session.exited || session.protocolError !== undefined || !session.ready
//           ? "closed"
//           : "ready",
//       recent_mi_records: [...session.lines],
//       recent_mi_records_truncated: session.recentRecordsTruncated,
//       mi_invalid_utf8: session.invalidUtf8Observed,
//       stderr: diagnostics.stderr.text,
//       stderr_observed_bytes: diagnostics.stderr.observedBytes,
//       stderr_truncated:
//         diagnostics.stderr.observedBytes > diagnostics.stderr.bytes,
//       stderr_invalid_utf8: diagnostics.stderr.invalidUtf8 === true,
//       diagnostics_truncated: diagnostics.diagnosticTruncated === true,
//       inferior_tty: session.inferiorTty ?? null,
//       inferior_tty_verified: session.inferiorTtyVerified,
//     };
export const _lines = 390;
