export const __stub = 1;
//         ownership,
//         `process ownership could not be revalidated for PID ${member.pid}: ${observation.reason}`,
//       );
//     }
//   }
//   return {
//     status: "verified",
//     observedAt: new Date().toISOString(),
//     lineage: {
//       runId: ownership.runId,
//       launcherPid: launcher.pid,
//       launcherParentPid: launcher.parentPid,
//       processGroupId: launcher.processGroupId,
//       descendants: verifiedDescendants
//         .sort((left, right) => left.pid - right.pid)
//         .map(({ pid, parentPid, processGroupId }) => ({
//           pid,
//           parentPid,
//           processGroupId,
//         })),
//     },
//   };
// };
//
// const unavailableLineage = (
//   ownership: OwnedProcessGroup,
//   reason: string,
// ): Extract<ProcessLineageObservation, { readonly status: "unavailable" }> => ({
//   status: "unavailable",
//   observedAt: new Date().toISOString(),
//   runId: ownership.runId,
//   launcherPid: ownership.leaderPid,
//   processGroupId: ownership.processGroupId,
//   reason,
// });
//
// /** Parse the NUL-delimited Linux process environment without nameless keys. */
// export const parseProcessEnvironment = (
//   value: string,
// ): Readonly<Record<string, string>> =>
//   Object.fromEntries(
//     value
//       .split("\0")
//       .filter((entry) => entry.indexOf("=") > 0)
//       .map((entry) => {
//         const separator = entry.indexOf("=");
//         return [entry.slice(0, separator), entry.slice(separator + 1)];
//       }),
//   );
//
// /** Read Linux stat field 22, tolerating spaces and closing parentheses in comm. */
// export const parseLinuxProcessStartTime = (
//   value: string,
// ): string | undefined => {
//   const commandEnd = value.lastIndexOf(")");
//   if (commandEnd < 0) return undefined;
//   const fields = value
//     .slice(commandEnd + 1)
//     .trim()
//     .split(/\s+/u);
//   const startTime = fields[19];
//   return startTime !== undefined && /^\d+$/u.test(startTime)
//     ? startTime
//     : undefined;
// };
//
// const isExpectedAbort = (
//   cause: unknown,
//   signal: AbortSignal | undefined,
// ): boolean =>
//   signal?.aborted === true &&
//   (cause === signal.reason ||
//     (cause instanceof Error && cause.name === "AbortError"));
//
// /** Create the operating-system process inspector for an explicit host context. */
// export const createSystemProcessOwnershipHost = (
//   platform: NodeJS.Platform = process.platform,
//   hostEnvironment: NodeJS.ProcessEnv = process.env,
//   options: {
//     /** Override the compiler executable used by the Darwin native reader. */
//     readonly darwinCompiler?: DarwinProcessReaderCompiler;
//     /** Override the caller-owned module cache used compiling that helper. */
//     readonly darwinModuleCachePath?: string;
//     /** Deadline for Darwin ownership-helper compilation. */
//     readonly compileTimeoutMs?: number;
//   } = {},
// ): ProcessOwnershipHost => {
//   const darwinModuleCachePath =
//     options.darwinModuleCachePath ??
//     hostEnvironment.REA_DARWIN_MODULE_CACHE_PATH;
//   const swiftcPath = hostEnvironment.REA_DARWIN_SWIFTC_PATH;
//   const darwinCompiler =
//     options.darwinCompiler ??
//     (swiftcPath === undefined || swiftcPath === ""
//       ? undefined
//       : {
//           kind: "swiftc" as const,
//           executable: swiftcPath,
//           sdkRoot: hostEnvironment.SDKROOT ?? "",
//         });
//   const darwinTokens =
//     platform === "darwin"
//       ? createDarwinProcessRunTokenReader({
//           ...(darwinCompiler === undefined ? {} : { compiler: darwinCompiler }),
//           ...(darwinModuleCachePath === undefined
//             ? {}
//             : { moduleCachePath: darwinModuleCachePath }),
//           ...(options.compileTimeoutMs === undefined
//             ? { environment: hostEnvironment }
//             : { compileTimeoutMs: options.compileTimeoutMs }),
//         })
//       : undefined;
//   const listProcesses = async (signal?: AbortSignal) => {
//     if (platform === "win32") return [];
//     const { stdout } = await execFileOutput(
//       "ps",
//       ["-axo", "pid=,ppid=,pgid=,uid=,stat=,command="],
//       { env: hostEnvironment, ...(signal === undefined ? {} : { signal }) },
//     );
//     return stdout
//       .split("\n")
//       .map((line) =>
//         /\s*(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\S+)\s+(.*)/u.exec(line),
//       )
//       .filter((match): match is RegExpExecArray => match !== null)
//       .map((match) => ({
//         pid: Number(match[1]),
//         parentPid: Number(match[2]),
//         processGroupId: Number(match[3]),
//         uid: Number(match[4]),
//         state: match[5] ?? "",
//         command: match[6] ?? "",
//       }));
//   };
//   const processIdentities: NonNullable<
//     ProcessOwnershipHost["processIdentities"]
//   > = async (processes, signal) => {
//     if (processes.length === 0) return new Map();
//     if (platform === "linux")
//       return new Map<number, ProcessIdentityObservation>(
//         await Promise.all(
//           processes.map(async ({ pid }) => {
//             try {
//               const stat = await readFile(`/proc/${String(pid)}/stat`, {
export const _l = 144;
