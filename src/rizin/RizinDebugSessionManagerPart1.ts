export const __stub = 1;
// import { randomUUID } from "node:crypto";
// import { isUtf8 } from "node:buffer";
// import { open, readFile, readlink, realpath, stat } from "node:fs/promises";
// import { constants as fsConstants } from "node:fs";
// import { isatty } from "node:tty";
//
// import {
//   AnalysisCancelledError,
//   AnalysisCapabilityUnavailableError,
//   AnalysisInputError,
//   AnalysisResourceConstraintError,
//   AnalysisTimeoutError,
// } from "../domain/analysisErrorCore.js";
// import type {
//   AnalysisError,
//   AnalysisErrorOptions,
// } from "../domain/analysisErrorBase.js";
// import { createEvidence, type Evidence } from "../domain/evidence.js";
// import { err, ok, type Result } from "../domain/result.js";
// import {
//   ProviderProcessSupervisor,
//   spawnOwnedProviderProcess,
//   type SpawnedOwnedProviderProcess,
// } from "../process/ProviderProcess.js";
// import {
//   closeOwnedDebuggerSessions,
//   stopOwnedDebuggerProcess,
//   verifyOwnedInferiorsEnded,
//   type OwnedInferiorIdentity,
//   type OwnedDebuggerDetachResult,
// } from "../process/ownedDebuggerSession.js";
// import { absoluteCallerPath } from "../filesystem/callerPath.js";
//
// const MAX_SESSIONS = 8;
// const MAX_PENDING_COMMANDS = 16;
// const FRAME_TIMEOUT_MS = 120_000;
// const CLEANUP_COMMAND_TIMEOUT_MS = 1_000;
// const STARTUP_TIMEOUT_MS = 30_000;
// const MAX_FRAME_BYTES = 16 * 1024 * 1024;
// const MAX_COMMAND_OUTPUT_BYTES = 16 * 1024 * 1024;
// const MAX_QUEUED_FRAME_BYTES = 4 * 1024 * 1024;
// const MAX_QUEUED_FRAMES = 4096;
// const MIN_QUEUED_FRAME_CHARGE_BYTES = 64;
// const MAX_COMMAND_FRAMES = 4096;
// const MAX_RECENT_FRAME_BYTES = 16 * 1024;
// const MAX_DIAGNOSTIC_BYTES = 64 * 1024;
//
// export const RIZIN_DEBUGGER_PROVIDER_IDENTITY = {
//   id: "rizin.debugger",
//   name: "Rizin debugger",
//   version: null,
// } as const;
//
// interface RizinLaunchProvenance {
//   readonly caller_selected_path: string;
//   readonly resolved_path: string;
// }
//
// const RIZIN_LAUNCH_PROVENANCE_LIMITATION =
//   "Launch provenance records the original and resolved startup paths; it does not establish the current target after unrestricted debugger commands.";
//
// interface RizinCommandEvidenceInput {
//   readonly sessionId: string;
//   readonly command: string;
//   readonly result: RizinDebugCommandResult;
//   readonly inferiorTty: string;
//   readonly launchProvenance: RizinLaunchProvenance;
//   readonly limitations: readonly string[];
// }
//
// const createRizinCommandEvidence = ({
//   sessionId,
//   command,
//   result,
//   inferiorTty,
//   launchProvenance,
//   limitations,
// }: RizinCommandEvidenceInput): Evidence =>
//   createEvidence(undefined, RIZIN_DEBUGGER_PROVIDER_IDENTITY, {
//     predicateType: "rea.debugger.command-observation",
//     operation: "rizin_debug_command",
//     parameters: {
//       session_id: sessionId,
//       command,
//       inferior_tty: inferiorTty,
//       launch_provenance: { ...launchProvenance },
//     },
//     result: { ...result },
//     rawResult: { ...result },
//     subjectUnavailableReason:
//       "The current debugger target identity is not established by the Rizin session identifier.",
//     limitations: [
//       ...limitations,
//       ...(result.output_invalid_utf8
//         ? [
//             "Collected command frames contained invalid UTF-8 bytes; decoded text may contain replacement characters.",
//           ]
//         : []),
//       RIZIN_LAUNCH_PROVENANCE_LIMITATION,
//     ],
//   });
//
// export class RizinCommandTimeoutError extends Error {
//   constructor(
//     readonly partialOutput: string,
//     readonly outputInvalidUtf8 = false,
//   ) {
//     super("Timed out waiting for Rizin's command-completion marker");
//   }
// }
//
// export const isRizinCommandDeadlineExpired = (remainingMs: number): boolean =>
//   remainingMs <= 0;
//
// export const createRizinCommandTimeoutError = (
//   partialFrames: readonly string[],
//   outputInvalidUtf8 = false,
// ): RizinCommandTimeoutError =>
//   new RizinCommandTimeoutError(partialFrames.join("\n"), outputInvalidUtf8);
//
// interface RizinCommandTimeoutEvidenceInput {
//   readonly sessionId: string;
//   readonly command: string;
//   readonly result: RizinDebugCommandResult;
//   readonly inferiorTty: string;
//   readonly cleanupFailure: string | undefined;
//   readonly launchProvenance: RizinLaunchProvenance;
// }
//
// export const createRizinCommandTimeoutEvidence = ({
//   sessionId,
//   command,
//   result,
//   inferiorTty,
//   cleanupFailure,
//   launchProvenance,
// }: RizinCommandTimeoutEvidenceInput): Evidence =>
//   createRizinCommandEvidence({
//     sessionId,
//     command,
//     result,
//     inferiorTty,
//     launchProvenance,
//     limitations: [
//       "The command timed out before its completion marker; retained output is partial and completion is unknown.",
//       ...(result.output_invalid_utf8
//         ? [
//             "Collected command frame bytes did not form valid UTF-8; displayed output contains replacement characters.",
//           ]
//         : []),
//       ...(cleanupFailure === undefined
//         ? [
//             "The owned debugger session was stopped because output correlation could no longer be guaranteed.",
//           ]
//         : [
//             `The owned debugger session remains retained because cleanup could not be verified: ${cleanupFailure}`,
//           ]),
//       "The command is unrestricted and may access local files, the shell, network, or mutate the target.",
//     ],
//   });
//
// interface RizinDebugSession {
//   readonly id: string;
//   readonly launched: SpawnedOwnedProviderProcess;
//   readonly supervisor: ProviderProcessSupervisor;
//   readonly frames: Array<{
//     readonly frame: RizinFrame;
//     readonly queueChargeBytes: number;
//   }>;
//   readonly frameWaiters: Array<{
//     readonly resolve: (frame: RizinFrame) => void;
//     readonly reject: (cause: Error) => void;
//   }>;
//   readonly backend: string | null;
//   readonly launchProvenance: RizinLaunchProvenance;
//   readonly inferiorTty: string;
//   readonly inferiorTtyDevice: number;
//   readonly inferiorTtyInode: number;
//   readonly knownInferiorIdentities: Map<string, OwnedInferiorIdentity>;
//   inferiorInventoryComplete: boolean;
//   inferiorStateUnknown: () => boolean;
//   verifyInferiorsEndedAfterExit: () => Promise<boolean>;
//   readonly detachInferior: () => Promise<OwnedDebuggerDetachResult>;
//   cleanupCommandTurnHeld: boolean;
//   stopAttempt: ReturnType<typeof stopOwnedDebuggerProcess> | undefined;
//   readonly cleanupFailures: Set<AnalysisError>;
//   pendingCommandCount: number;
//   invalidUtf8Observed: boolean;
//   closing: boolean;
//   readonly history: string[];
//   queuedFrameBytes: number;
//   historyTruncated: boolean;
//   frameChunks: Buffer[];
//   bufferedFrameBytes: number;
//   ready: boolean;
//   exited: boolean;
//   commandTail: Promise<void>;
//   protocolError: string | undefined;
//   commandCaptureActive: boolean;
//   discardingOversizedFrame: boolean;
// }
//
// interface RizinFrame {
//   readonly text: string;
//   readonly truncated: boolean;
//   readonly invalidUtf8: boolean;
// }
//
// class RizinProcessExitError extends Error {
//   constructor(
//     readonly partialOutput: string,
//     readonly outputInvalidUtf8 = false,
//   ) {
//     super("Rizin process exited before completing the active command");
//   }
// }
//
// class RizinCommandCancelledError extends AnalysisCancelledError {
//   constructor(
//     readonly partialOutput: string,
//     readonly outputInvalidUtf8: boolean,
//     cause: unknown,
//   ) {
//     super("rizin_debug_command", {
//       cause,
//       capturedOutput: {
//         stdout: partialOutput,
//         stderr: "",
//         truncated: false,
//       },
//     });
//   }
// }
//
// class RizinFrameTimeoutError extends Error {
//   constructor() {
//     super("Timed out waiting for the next Rizin NUL frame");
//   }
// }
//
// /** Owns persistent Rizin debugger processes independently from BinarySession. */
// export class RizinDebugSessionManager {
//   readonly #sessions = new Map<string, RizinDebugSession>();
//   #activeStarts = 0;
//   #sessionReservations = 0;
//   readonly #environment: Readonly<NodeJS.ProcessEnv>;
//   #closingAll = false;
//   readonly #startDrainWaiters: Array<() => void> = [];
//   readonly #command: string;
//   readonly #frameTimeoutMs: number;
//   readonly #startupTimeoutMs: number;
//   readonly #maxCommandOutputBytes: number;
//   readonly #platform: NodeJS.Platform;
//   readonly #stopProcess: typeof stopOwnedDebuggerProcess;
//   readonly #spawnProcess: typeof spawnOwnedProviderProcess;
//
//   constructor(
//     environment: Readonly<NodeJS.ProcessEnv> = process.env,
//     options: {
//       readonly frameTimeoutMs?: number;
//       /** @internal Test seam; production callers should use the 30 s default. */
//       readonly startupTimeoutMs?: number;
//       /** @internal Test seam; production callers should use the 16 MiB default. */
//       readonly maxCommandOutputBytes?: number;
//       readonly platform?: NodeJS.Platform;
//       readonly stopProcess?: typeof stopOwnedDebuggerProcess;
//       readonly spawnProcess?: typeof spawnOwnedProviderProcess;
//     } = {},
//   ) {
//     this.#environment = { ...environment };
//     this.#command = environment.REA_RIZIN_COMMAND ?? "rizin";
//     this.#frameTimeoutMs = options.frameTimeoutMs ?? FRAME_TIMEOUT_MS;
//     this.#startupTimeoutMs = options.startupTimeoutMs ?? STARTUP_TIMEOUT_MS;
//     this.#maxCommandOutputBytes =
//       options.maxCommandOutputBytes ?? MAX_COMMAND_OUTPUT_BYTES;
//     this.#platform = options.platform ?? process.platform;
//     this.#stopProcess = options.stopProcess ?? stopOwnedDebuggerProcess;
//     this.#spawnProcess = options.spawnProcess ?? spawnOwnedProviderProcess;
//   }
//
//   async start(
//     input: {
//       readonly path: string;
//       readonly inferior_tty: string;
//       readonly backend?: string;
//     },
//     signal?: AbortSignal,
//   ): Promise<
//     Result<
//       { readonly session_id: string; readonly backend: string | null },
//       AnalysisError
//     >
//   > {
//     if (this.#closingAll)
//       return err(new AnalysisInputError("start_rizin_debug_session"));
//     const occupied = this.#sessions.size + this.#sessionReservations;
//     if (occupied >= MAX_SESSIONS)
//       return err(
//         new AnalysisResourceConstraintError(
//           "start_rizin_debug_session",
//           "memory",
//           "Rizin session capacity reached.",
//           { max_sessions: MAX_SESSIONS, active_or_reserved_sessions: occupied },
//         ),
//       );
//     this.#activeStarts += 1;
//     this.#sessionReservations += 1;
//     let reserved = true;
//     const releaseReservation = () => {
//       if (!reserved) return;
//       reserved = false;
//       this.#sessionReservations -= 1;
//     };
//     try {
//       return await this.#start(input, signal, releaseReservation);
//     } finally {
//       releaseReservation();
//       this.#activeStarts -= 1;
//       if (this.#activeStarts === 0)
//         for (const resolve of this.#startDrainWaiters.splice(0)) resolve();
//     }
//   }
//
//   async #start(
//     input: {
//       readonly path: string;
//       readonly inferior_tty: string;
//       readonly backend?: string;
//     },
//     signal: AbortSignal | undefined,
//     releaseReservation: () => void,
//   ): Promise<
//     Result<
//       { readonly session_id: string; readonly backend: string | null },
//       AnalysisError
//     >
//   > {
//     if (signal?.aborted)
//       return err(new AnalysisCancelledError("start_rizin_debug_session"));
//     if (this.#platform !== "linux")
//       return err(
//         new AnalysisCapabilityUnavailableError(
//           "rizin",
//           "start_rizin_debug_session",
//           "Persistent Rizin debugger sessions require Linux /proc descriptor readback to verify inferior detachment and output routing.",
//         ),
//       );
//     if (input.inferior_tty === undefined || input.inferior_tty.length === 0)
//       return err(new AnalysisInputError("start_rizin_debug_session"));
//     let ttyPath: string;
//     let ttyDevice: number;
//     let ttyInode: number;
//     try {
//       ttyPath = await realpath(input.inferior_tty);
//       const ttyHandle = await open(
//         ttyPath,
//         fsConstants.O_RDWR | fsConstants.O_NOCTTY | fsConstants.O_NONBLOCK,
//       );
//       try {
//         const ttyStat = await ttyHandle.stat();
//         if (
//           !isatty(ttyHandle.fd) ||
//           (ttyStat.mode & fsConstants.S_IFMT) !== fsConstants.S_IFCHR
//         )
//           throw new Error("The selected inferior_tty is not a character TTY.");
//         ttyDevice = ttyStat.dev;
//         ttyInode = ttyStat.ino;
//       } finally {
//         await ttyHandle.close();
//       }
//     } catch (cause) {
//       return err(
//         new AnalysisInputError("start_rizin_debug_session", { cause }),
//       );
//     }
//     // TTY identity validation is asynchronous. Cancellation may arrive while
//     // realpath/open/stat are pending, and must prevent the debugger spawn.
//     if (signal?.aborted)
//       return err(new AnalysisCancelledError("start_rizin_debug_session"));
//     const id = randomUUID();
//     const resolvedPath = absoluteCallerPath(input.path);
//     const launchProvenance: RizinLaunchProvenance = {
//       caller_selected_path: input.path,
//       resolved_path: resolvedPath,
//     };
//     const arguments_ = [
//       "-N",
//       "-0",
//       "-d",
//       "-R",
//       `stdout=${ttyPath}`,
//       "-R",
//       `stderr=${ttyPath}`,
//       "-e",
//       "dbg.exitkills=false",
//       ...(input.backend === undefined ? [] : ["-D", input.backend]),
//       resolvedPath,
//     ];
export const _l = 398;
