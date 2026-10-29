export const __stub = 1;
// import { randomUUID } from "node:crypto";
// import { constants as fsConstants } from "node:fs";
// import { isUtf8 } from "node:buffer";
// import { readFile, readlink, realpath, stat } from "node:fs/promises";
//
// import {
//   AnalysisCapabilityUnavailableError,
//   AnalysisCancelledError,
//   AnalysisInputError,
//   AnalysisResourceConstraintError,
//   AnalysisTimeoutError,
// } from "../domain/analysisErrorCore.js";
// import {
//   AnalysisError,
//   type AnalysisErrorOptions,
// } from "../domain/analysisErrorBase.js";
// import { createEvidence, type Evidence } from "../domain/evidence.js";
// import { err, ok, type Result } from "../domain/result.js";
// import {
//   ProviderProcessSupervisor,
//   spawnOwnedProviderProcess,
//   type OwnedProviderProcessSpawnOptions,
//   type SpawnedOwnedProviderProcess,
// } from "../process/ProviderProcess.js";
// import {
//   closeOwnedDebuggerSessions,
//   stopOwnedDebuggerProcess,
//   type OwnedDebuggerDetachResult,
//   type OwnedInferiorIdentity,
//   type ProcessStartTimeReader,
//   verifyOwnedInferiorsEnded,
// } from "../process/ownedDebuggerSession.js";
// import { parseLinuxProcessStartTime } from "../process/ProcessOwnershipObservation.js";
//
// const STARTUP_TIMEOUT_MS = 10_000;
// const COMMAND_TIMEOUT_MS = 120_000;
// const MAX_COMMAND_OUTPUT_BYTES = 16 * 1024 * 1024;
// const MAX_COMMAND_OUTPUT_RECORDS = 16_384;
// const MAX_MI_LINE_BYTES = 16 * 1024 * 1024;
// const MAX_RECENT_MI_LINE_BYTES = 64 * 1024;
// const MAX_DIAGNOSTIC_BYTES = 64 * 1024;
// const DEFAULT_MAX_SESSIONS = 8;
// const MAX_PENDING_GDB_COMMANDS = 16;
// const RECENT_RECORD_TRUNCATION_MARKER = "[recent record truncated]";
//
// export const GDB_PROVIDER_IDENTITY = {
//   id: "gnu.gdb",
//   name: "GNU GDB",
//   version: null,
// } as const;
//
// interface PendingCommand {
//   readonly token: number;
//   readonly command: string;
//   readonly evidenceCommand: string;
//   readonly lines: string[];
//   outputBytes: number;
//   outputTruncated: boolean;
//   outputInvalidUtf8: boolean;
//   terminalRecord: string | undefined;
//   awaitingInferiorStop: boolean;
//   readonly resolve: (result: GdbCommandResult) => void;
//   readonly reject: (error: Error) => void;
//   readonly cleanup: () => void;
//   timer: ReturnType<typeof setTimeout>;
// }
//
// export interface GdbCommandResult {
//   readonly command: string;
//   readonly mi: string;
//   readonly records: readonly string[];
//   readonly console: string;
//   readonly target: string;
//   readonly log: string;
//   readonly process_exit_observed?: boolean;
//   readonly process_exit_code?: number | null;
//   readonly process_exit_signal?: NodeJS.Signals | null;
//   readonly output_truncated: boolean;
//   readonly completion_status: "complete" | "unknown";
//   readonly output_invalid_utf8?: true;
// }
//
// class GdbCommandTimeoutError extends AnalysisTimeoutError {
//   constructor(
//     readonly partial: GdbCommandResult,
//     readonly evidence: Evidence,
//     timeoutMs: number,
//   ) {
//     super("gdb_console", timeoutMs);
//   }
// }
//
// const truncateUtf8RecordPrefix = (line: string): string => {
//   const budget =
//     MAX_RECENT_MI_LINE_BYTES -
//     Buffer.byteLength(RECENT_RECORD_TRUNCATION_MARKER, "utf8");
//   let prefix = "";
//   let retainedBytes = 0;
//   for (const codePoint of line) {
//     const codePointBytes = Buffer.byteLength(codePoint, "utf8");
//     if (retainedBytes + codePointBytes > budget) break;
//     prefix += codePoint;
//     retainedBytes += codePointBytes;
//   }
//   return `${prefix}${RECENT_RECORD_TRUNCATION_MARKER}`;
// };
//
// /** @internal Pure parser for live PIDs in recursive GDB MI thread groups. */
// export const gdbThreadGroupPids = (
//   mi: string,
// ): readonly string[] | undefined => {
//   const marker = mi.indexOf("groups=[");
//   if (marker < 0) return undefined;
//   const start = marker + "groups=[".length;
//   let squareDepth = 1;
//   let objectDepth = 0;
//   let quoted = false;
//   let escaped = false;
//   const pids: string[] = [];
//   let fieldStart = start;
//   let pidStart: number | undefined;
//   let hasLivePid = false;
//   let currentPid: string | undefined;
//   for (let index = start; index < mi.length; index += 1) {
//     const character = mi[index];
//     if (quoted) {
//       if (escaped) escaped = false;
//       else if (character === "\\") escaped = true;
//       else if (character === '"') {
//         quoted = false;
//         if (pidStart !== undefined) {
//           const pid = mi.slice(pidStart, index);
//           if (!/^[1-9]\d*$/u.test(pid)) return undefined;
//           hasLivePid = true;
//           currentPid = pid;
//           pidStart = undefined;
//         }
//       }
//       continue;
//     }
//     if (character === '"') {
//       if (
//         squareDepth === 1 &&
//         objectDepth === 1 &&
//         mi.slice(fieldStart, index) === "pid="
//       ) {
//         if (hasLivePid) return undefined;
//         pidStart = index + 1;
//       }
//       quoted = true;
//       continue;
//     }
//     if (character === "[") squareDepth += 1;
//     else if (character === "]") {
//       squareDepth -= 1;
//       if (squareDepth === 0) {
//         if (objectDepth !== 0) return undefined;
//         const body = mi.slice(start, index);
//         if (body.includes("groups=[")) return undefined;
//         return pids;
//       }
//     } else if (character === "{") {
//       if (squareDepth === 1 && objectDepth === 0) {
//         hasLivePid = false;
//         currentPid = undefined;
//         fieldStart = index + 1;
//       }
//       objectDepth += 1;
//     } else if (character === "}") {
//       if (squareDepth === 1 && objectDepth === 1) {
//         const field = mi.slice(fieldStart, index);
//         if (field.startsWith("pid=") && !/^pid="[1-9]\d*"$/u.test(field))
//           return undefined;
//       }
//       objectDepth -= 1;
//       if (objectDepth < 0) return undefined;
//       if (squareDepth === 1 && objectDepth === 0 && hasLivePid) {
//         if (currentPid === undefined) return undefined;
//         pids.push(currentPid);
//       }
//     } else if (character === "," && squareDepth === 1 && objectDepth === 1) {
//       const field = mi.slice(fieldStart, index);
//       if (field.startsWith("pid=") && !/^pid="[1-9]\d*"$/u.test(field))
//         return undefined;
//       fieldStart = index + 1;
//     }
//   }
//   return undefined;
// };
//
// /** @internal Pure count of recursive GDB MI groups with live PIDs. */
// export const gdbThreadGroupCount = (mi: string): number | undefined => {
//   const pids = gdbThreadGroupPids(mi);
//   return pids?.length;
// };
//
// const verifyGdbInferiorOutputSink = async (
//   pid: string,
//   selectedTty: string,
//   rememberIdentity: (identity: OwnedInferiorIdentity) => void,
// ): Promise<void> => {
//   if (process.platform !== "linux")
//     throw new Error(
//       "GDB cannot confirm live inferior output descriptors outside Linux /proc.",
//     );
//   const statPath = `/proc/${pid}/stat`;
//   const before = parseLinuxProcessStartTime(await readFile(statPath, "utf8"));
//   if (before === undefined)
//     throw new Error("GDB could not establish the live inferior identity.");
//   const ttyPath = await realpath(selectedTty);
//   const tty = await stat(ttyPath);
//   if ((tty.mode & fsConstants.S_IFMT) !== fsConstants.S_IFCHR)
//     throw new Error("The selected GDB output sink is not a character device.");
//   for (const descriptor of ["1", "2"]) {
//     const descriptorPath = `/proc/${pid}/fd/${descriptor}`;
//     const destination = await readlink(descriptorPath);
//     const observed = await stat(descriptorPath);
//     if (
//       observed.dev !== tty.dev ||
//       observed.ino !== tty.ino ||
//       (observed.mode & fsConstants.S_IFMT) !== fsConstants.S_IFCHR ||
//       (await realpath(destination)) !== ttyPath
//     )
//       throw new Error(
//         `GDB inferior descriptor ${descriptor} no longer points to the selected TTY.`,
//       );
//   }
//   const after = parseLinuxProcessStartTime(await readFile(statPath, "utf8"));
//   if (after !== before)
//     throw new Error(
//       "The GDB inferior identity changed during descriptor readback.",
//     );
//   rememberIdentity({ pid, startTime: before });
// };
//
// class GdbCommandProcessExitError extends Error {
//   constructor(readonly partial: GdbCommandResult) {
//     super(
//       `GDB exited before returning the active MI command result (exit code ${String(partial.process_exit_code)}, signal ${String(partial.process_exit_signal)}).`,
//     );
//   }
// }
//
// class GdbProtocolFailureError extends Error {
//   constructor(
//     message: string,
//     readonly partial: GdbCommandResult,
//   ) {
//     super(message);
//   }
// }
//
// /** @internal Convert an unknown boundary failure without dropping non-Error values. */
// export const gdbErrorMessage = (cause: unknown): string =>
//   cause instanceof Error ? cause.message : String(cause);
//
// interface GdbSession {
//   readonly id: string;
//   readonly miVersion: "mi3" | "mi2";
//   readonly launched: SpawnedOwnedProviderProcess;
//   readonly supervisor: ProviderProcessSupervisor;
//   /** Confirms target disposition and any durable sink before process cleanup. */
//   readonly detachInferior: () => Promise<OwnedDebuggerDetachResult>;
//   readonly inferiorStateUnknown: () => boolean;
//   readonly verifyInferiorsEndedAfterExit: () => Promise<boolean>;
//   readonly knownInferiorIdentities: Map<string, OwnedInferiorIdentity>;
//   readonly inferiorTty: string | undefined;
//   readonly maxCommandOutputBytes: number;
//   readonly stdoutSettled: Promise<void>;
//   readonly settleStdout: () => void;
//   inferiorTtyVerified: boolean;
//   noInferiorVerified: boolean;
//   stopAttempt: ReturnType<typeof stopOwnedDebuggerProcess> | undefined;
//   readonly pending: Map<number, PendingCommand>;
//   readonly cleanupFailures: Set<AnalysisError>;
//   readonly lines: string[];
//   readonly bufferChunks: Buffer[];
//   bufferTail: Buffer | undefined;
//   bufferTailBytes: number;
//   bufferBytes: number;
//   invalidUtf8Observed: boolean;
//   promptTail: string;
//   ready: boolean;
//   exited: boolean;
//   exitCode: number | null;
//   exitSignal: NodeJS.Signals | null;
//   nextToken: number;
//   startupResolve: (() => void) | undefined;
//   startupReject: ((error: Error) => void) | undefined;
//   commandTail: Promise<void>;
//   pendingCommandCount: number;
//   protocolError: string | undefined;
//   recentRecordsTruncated: boolean;
// }
//
// /** Owns persistent GDB/MI sessions independently from the active binary target. */
// export class GdbSessionManager {
//   readonly #sessions = new Map<string, GdbSession>();
//   readonly #activeStarts = new Map<
//     AbortController,
//     Promise<
//       Result<
//         { readonly session_id: string; readonly mi_version: "mi3" | "mi2" },
//         AnalysisError
//       >
//     >
//   >();
//   readonly #command: string;
//   readonly #environment: NodeJS.ProcessEnv;
//   readonly #commandTimeoutMs: number;
//   readonly #startupTimeoutMs: number;
//   readonly #platform: NodeJS.Platform;
//   readonly #stopProcess: typeof stopOwnedDebuggerProcess;
//   readonly #spawnProcess: typeof spawnOwnedProviderProcess;
//   readonly #verifyInferiorOutputSink: (
//     pid: string,
//     selectedTty: string,
//     rememberIdentity: (identity: OwnedInferiorIdentity) => void,
//   ) => Promise<void>;
//   readonly #readInferiorProcessStartTime: ProcessStartTimeReader | undefined;
//   readonly #maxSessions: number;
//   readonly #maxCommandOutputBytes: number;
//   #sessionReservations = 0;
//   #closing = false;
//   #closePromise: Promise<void> | undefined;
//
//   constructor(
//     options: {
//       readonly environment?: Readonly<NodeJS.ProcessEnv>;
//       readonly commandTimeoutMs?: number;
//       readonly startupTimeoutMs?: number;
//       readonly platform?: NodeJS.Platform;
//       readonly stopProcess?: typeof stopOwnedDebuggerProcess;
//       readonly spawnProcess?: typeof spawnOwnedProviderProcess;
//       /** @internal Tests may replace only the /proc and TTY readback boundary. */
//       readonly verifyInferiorOutputSink?: (
//         pid: string,
//         selectedTty: string,
//         rememberIdentity: (identity: OwnedInferiorIdentity) => void,
//       ) => Promise<void>;
//       /** @internal Read-only process identity observer for lifecycle tests. */
//       readonly readInferiorProcessStartTime?: ProcessStartTimeReader;
//       readonly maxSessions?: number;
//       /** @internal Test seam; production callers should use the 16 MiB default. */
//       readonly maxCommandOutputBytes?: number;
//     } = {},
//   ) {
//     this.#environment = { ...(options.environment ?? process.env) };
//     this.#command = this.#environment.REA_GDB_COMMAND ?? "gdb";
//     this.#commandTimeoutMs = options.commandTimeoutMs ?? COMMAND_TIMEOUT_MS;
//     this.#startupTimeoutMs = options.startupTimeoutMs ?? STARTUP_TIMEOUT_MS;
//     this.#platform = options.platform ?? process.platform;
//     this.#stopProcess = options.stopProcess ?? stopOwnedDebuggerProcess;
//     this.#spawnProcess = options.spawnProcess ?? spawnOwnedProviderProcess;
//     this.#verifyInferiorOutputSink =
//       options.verifyInferiorOutputSink ?? verifyGdbInferiorOutputSink;
//     this.#readInferiorProcessStartTime = options.readInferiorProcessStartTime;
//     this.#maxSessions = options.maxSessions ?? DEFAULT_MAX_SESSIONS;
//     this.#maxCommandOutputBytes =
//       options.maxCommandOutputBytes ?? MAX_COMMAND_OUTPUT_BYTES;
//   }
export const _lines = 361;
