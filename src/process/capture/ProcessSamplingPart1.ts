export const __stub = 1;
// import { readFile, readdir } from "node:fs/promises";
// import type { ProcessSamplingCoverage } from "../../domain/process/processCaptureCoverage.js";
// import type {
//   ProcessSample,
//   RecordProcessCaptureEvent,
// } from "../../domain/process/processCapture.js";
// import { execFileOutput } from "../ExecFileOutput.js";
// import { readProcessRunId } from "../ProcessOwnership.js";
// import { monotonicProcessCaptureClock } from "./ProcessCaptureClock.js";
// const PROC_READ_CONCURRENCY = 64;
//
// interface ProcessRow {
//   readonly pid: number;
//   readonly parent_pid: number;
//   readonly process_group_id: number | null;
//   readonly session_id: number | null;
//   readonly command: string;
//   readonly startTime: string | undefined;
// }
//
// interface ProcessNode extends ProcessRow {
//   readonly children: readonly number[];
// }
//
// interface SampleProcessContext {
//   readonly rootPid: number;
//   readonly elapsedMs: number;
//   readonly limit: number;
//   readonly identities: Map<number, string>;
//   readonly signal: AbortSignal;
// }
//
// type ProcessIdentitySnapshot = Pick<
//   ProcessRow,
//   "pid" | "parent_pid" | "process_group_id" | "session_id" | "startTime"
// >;
//
// /** Prove that forkpty completed session setup and installed the run token. */
// export const isInitializedPtyRoot = (options: {
//   readonly rootPid: number;
//   readonly expectedRunId: string;
//   readonly before: ProcessIdentitySnapshot;
//   readonly observedRunId: string | undefined;
//   readonly after: ProcessIdentitySnapshot;
// }): boolean => {
//   const sessionIdentityMatches =
//     (options.before.session_id === options.rootPid &&
//       options.after.session_id === options.rootPid) ||
//     (options.before.session_id === null && options.after.session_id === null);
//   return (
//     options.before.pid === options.rootPid &&
//     options.before.process_group_id === options.rootPid &&
//     sessionIdentityMatches &&
//     options.after.pid === options.rootPid &&
//     options.after.parent_pid === options.before.parent_pid &&
//     options.after.process_group_id === options.rootPid &&
//     options.after.startTime === options.before.startTime &&
//     options.observedRunId === options.expectedRunId
//   );
// };
//
// const isExpectedProcReadFailure = (cause: unknown): boolean =>
//   cause instanceof Error &&
//   "code" in cause &&
//   (cause.code === "ENOENT" ||
//     cause.code === "ESRCH" ||
//     cause.code === "EACCES" ||
//     cause.code === "EPERM");
//
// const handleProcReadFailure = (cause: unknown): undefined => {
//   if (isExpectedProcReadFailure(cause)) return undefined;
//   throw cause;
// };
//
// const parseProcStat = (
//   identifier: string,
//   stat: string,
// ): ProcessRow | undefined => {
//   const commandEnd = stat.lastIndexOf(")");
//   if (commandEnd < 0) return undefined;
//   const fields = stat
//     .slice(commandEnd + 2)
//     .trim()
//     .split(/\s+/);
//   const pid = Number(identifier);
//   const parentPid = Number(fields[1]);
//   const processGroupId = Number(fields[2]);
//   const sessionId = Number(fields[3]);
//   const startTime = fields[19];
//   if (
//     !Number.isSafeInteger(pid) ||
//     pid <= 0 ||
//     !Number.isSafeInteger(parentPid) ||
//     parentPid < 0 ||
//     !Number.isSafeInteger(processGroupId) ||
//     processGroupId <= 0 ||
//     !Number.isSafeInteger(sessionId) ||
//     sessionId <= 0 ||
//     startTime === undefined ||
//     !/^\d+$/.test(startTime)
//   )
//     return undefined;
//   return {
//     pid,
//     parent_pid: parentPid,
//     process_group_id: processGroupId,
//     session_id: sessionId,
//     command: "",
//     startTime,
//   };
// };
//
// const readProcessStat = async (
//   pid: number,
//   signal: AbortSignal,
// ): Promise<ProcessRow | undefined> => {
//   try {
//     const stat = await readFile(`/proc/${String(pid)}/stat`, {
//       encoding: "utf8",
//       signal,
//     });
//     return parseProcStat(String(pid), stat);
//   } catch (cause: unknown) {
//     return handleProcReadFailure(cause);
//   }
// };
//
// const readProcessCommand = async (
//   pid: number,
//   signal: AbortSignal,
// ): Promise<Buffer | undefined> => {
//   try {
//     return await readFile(`/proc/${String(pid)}/cmdline`, { signal });
//   } catch (cause: unknown) {
//     return handleProcReadFailure(cause);
//   }
// };
//
// /** Procfs reads used to enumerate children created by every process thread. */
// export interface LinuxChildrenHost {
//   taskIds(
export const _l = 141;
