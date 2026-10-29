export const __stub = 1;
//     pid: number,
//     signal: AbortSignal,
//   ): Promise<readonly number[] | undefined>;
//   children(
//     pid: number,
//     taskId: number,
//     signal: AbortSignal,
//   ): Promise<string | undefined>;
// }
//
// const systemLinuxChildrenHost: LinuxChildrenHost = {
//   async taskIds(pid, signal) {
//     try {
//       signal.throwIfAborted();
//       const entries = await readdir(`/proc/${String(pid)}/task`);
//       signal.throwIfAborted();
//       return entries
//         .filter((entry) => /^\d+$/.test(entry))
//         .map(Number)
//         .filter((taskId) => Number.isSafeInteger(taskId) && taskId > 0)
//         .sort((left, right) => left - right);
//     } catch (cause: unknown) {
//       return handleProcReadFailure(cause);
//     }
//   },
//   async children(pid, taskId, signal) {
//     try {
//       return await readFile(
//         `/proc/${String(pid)}/task/${String(taskId)}/children`,
//         { encoding: "utf8", signal },
//       );
//     } catch (cause: unknown) {
//       return handleProcReadFailure(cause);
//     }
//   },
// };
//
// /** Read the deduplicated children created by every thread in a Linux process. */
// export const readLinuxChildren = async (
//   pid: number,
//   signal: AbortSignal,
//   host: LinuxChildrenHost = systemLinuxChildrenHost,
// ): Promise<readonly number[] | undefined> => {
//   const taskIds = await host.taskIds(pid, signal);
//   if (taskIds === undefined) return undefined;
//   const children = new Set<number>();
//   let successfulReads = 0;
//   for (
//     let offset = 0;
//     offset < taskIds.length;
//     offset += PROC_READ_CONCURRENCY
//   ) {
//     const texts = await Promise.all(
//       taskIds
//         .slice(offset, offset + PROC_READ_CONCURRENCY)
//         .map((taskId) => host.children(pid, taskId, signal)),
//     );
//     for (const text of texts) {
//       if (text === undefined) continue;
//       successfulReads += 1;
//       for (const value of text.trim().split(/\s+/)) {
//         if (!/^\d+$/.test(value)) continue;
//         const child = Number(value);
//         if (Number.isSafeInteger(child) && child > 0) children.add(child);
//       }
//     }
//   }
//   return successfulReads === 0
//     ? undefined
//     : [...children].sort((left, right) => left - right);
// };
//
// const inspectProcess = async (
//   pid: number,
//   expectedParent: number | undefined,
//   signal: AbortSignal,
//   identities: Map<number, string>,
// ): Promise<ProcessNode | undefined> => {
//   const before = await readProcessStat(pid, signal);
//   if (before === undefined || before.startTime === undefined) return undefined;
//
//   const existing = identities.get(pid);
//   if (existing !== undefined && existing !== before.startTime) return undefined;
//   if (expectedParent !== undefined && before.parent_pid !== expectedParent)
//     return undefined;
//
//   const [commandBuffer, children] = await Promise.all([
//     readProcessCommand(pid, signal),
//     readLinuxChildren(pid, signal),
//   ]);
//
//   const after = await readProcessStat(pid, signal);
//   if (after === undefined || after.startTime === undefined) return undefined;
//   if (
//     before.startTime !== after.startTime ||
//     before.parent_pid !== after.parent_pid
//   )
//     return undefined;
//   if (expectedParent !== undefined && after.parent_pid !== expectedParent)
//     return undefined;
//
//   const command =
//     commandBuffer === undefined
//       ? ""
//       : commandBuffer.toString().replaceAll("\0", " ").trim();
//
//   return {
//     pid: before.pid,
//     parent_pid: before.parent_pid,
//     process_group_id: before.process_group_id,
//     session_id: before.session_id,
//     startTime: before.startTime,
//     command,
//     children: children ?? [],
//   };
// };
//
// const sampleLinux = async (
//   context: SampleProcessContext,
// ): Promise<readonly ProcessRow[]> => {
//   const { rootPid, limit, signal, identities } = context;
//   if (limit <= 0) return [];
//
//   const rootStat = await readProcessStat(rootPid, signal);
//   if (rootStat === undefined) return [];
//   const rootChildren = await readLinuxChildren(rootPid, signal);
//   if (rootChildren === undefined) return samplePs(context);
//
//   const rows: ProcessRow[] = [];
//   const visited = new Set<number>([rootPid]);
//   let level: Array<{
//     readonly pid: number;
//     readonly expectedParent: number | undefined;
//   }> = [{ pid: rootPid, expectedParent: undefined }];
//
//   while (level.length > 0 && rows.length < limit) {
//     const batchSize = Math.min(level.length, PROC_READ_CONCURRENCY);
//     const batch = level.slice(0, batchSize);
//     level = level.slice(batchSize);
//
//     const batchResults = await Promise.all(
export const _l = 141;
