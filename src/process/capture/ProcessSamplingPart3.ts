export const __stub = 1;
//       batch.map((item) =>
//         inspectProcess(item.pid, item.expectedParent, signal, identities),
//       ),
//     );
//
//     const nextLevel: typeof batch = [];
//     for (const node of batchResults) {
//       if (node === undefined) continue;
//
//       if (rows.length >= limit) break;
//       rows.push(node);
//       if (rows.length >= limit) break;
//
//       for (const child of node.children) {
//         if (visited.has(child)) continue;
//         visited.add(child);
//         nextLevel.push({ pid: child, expectedParent: node.pid });
//       }
//       if (rows.length >= limit) break;
//     }
//
//     level.push(...nextLevel);
//   }
//
//   return rows;
// };
//
// const readPsRows = async (
//   signal: AbortSignal,
// ): Promise<readonly ProcessRow[]> => {
//   const { stdout } = await execFileOutput(
//     "ps",
//     ["-axo", "pid=,ppid=,pgid=,sess=,command="],
//     { signal },
//   );
//   return stdout
//     .split("\n")
//     .map((line) => /\s*(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s+(.*)/u.exec(line))
//     .filter((match): match is RegExpExecArray => match !== null)
//     .map((match) => ({
//       pid: Number(match[1]),
//       parent_pid: Number(match[2]),
//       process_group_id: Number(match[3]),
//       session_id: Number(match[4]) || null,
//       command: match[5] ?? "",
//       startTime: undefined,
//     }))
//     .filter(
//       (row) =>
//         Number.isSafeInteger(row.pid) &&
//         row.pid > 0 &&
//         Number.isSafeInteger(row.parent_pid) &&
//         row.parent_pid >= 0,
//     )
//     .sort((left, right) => left.pid - right.pid);
// };
//
// const readRootIdentity = async (
//   rootPid: number,
//   signal: AbortSignal,
// ): Promise<ProcessRow | undefined> =>
//   process.platform === "linux"
//     ? readProcessStat(rootPid, signal)
//     : (await readPsRows(signal)).find(({ pid }) => pid === rootPid);
//
// const inspectInitializedPtyRoot = async (
//   rootPid: number,
//   runId: string,
//   signal: AbortSignal,
// ): Promise<{ readonly startTime: string | undefined } | undefined> => {
//   const before = await readRootIdentity(rootPid, signal);
//   if (
//     before === undefined ||
//     before.process_group_id !== rootPid ||
//     (before.session_id !== rootPid && before.session_id !== null)
//   )
//     return undefined;
//   let observedRunId: string | undefined;
//   try {
//     observedRunId = await readProcessRunId(rootPid, undefined, signal);
//   } catch (cause: unknown) {
//     // Unreadable run identity means the root cannot be attributed.
//     void cause;
//     return undefined;
//   }
//   const after = await readRootIdentity(rootPid, signal);
//   if (
//     after === undefined ||
//     !isInitializedPtyRoot({
//       rootPid,
//       expectedRunId: runId,
//       before,
//       observedRunId,
//       after,
//     })
//   )
//     return undefined;
//   return { startTime: after.startTime };
// };
//
// const samplePs = async (
//   context: SampleProcessContext,
// ): Promise<readonly ProcessRow[]> => {
//   const { rootPid, limit, signal } = context;
//   if (limit <= 0) return [];
//
//   const rows = await readPsRows(signal);
//   const rowByPid = new Map(rows.map((row) => [row.pid, row]));
//   const childrenByParent = new Map<number, ProcessRow[]>();
//   for (const row of rows) {
//     const siblings = childrenByParent.get(row.parent_pid) ?? [];
//     siblings.push(row);
//     childrenByParent.set(row.parent_pid, siblings);
//   }
//
//   const result: ProcessRow[] = [];
//   const visited = new Set<number>();
//   const queue: number[] = [rootPid];
//   let index = 0;
//
//   while (index < queue.length && result.length < limit) {
//     const pid = queue[index];
//     if (pid === undefined) break;
//     index += 1;
//     if (visited.has(pid)) continue;
//     visited.add(pid);
//
//     const row = rowByPid.get(pid);
//     if (row !== undefined) result.push(row);
//     if (result.length >= limit) break;
//
//     for (const child of childrenByParent.get(pid) ?? []) {
//       if (!visited.has(child.pid)) queue.push(child.pid);
//     }
//   }
//
//   return result;
// };
//
// const sampleProcesses = async (
//   context: SampleProcessContext,
export const _l = 141;
