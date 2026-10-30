export const __stub = 1;
//       if (code !== "ESRCH")
//         return withUnverifiedObservations(
//           {
//             cleaned: false,
//             reason: `owned process group signal failed: ${errorMessage(cause)}`,
//           },
//           plan.unverified,
//         );
//     }
//   }
//   if (plan.unresolved.length > 0)
//     return cleanupValidationFailure(plan.unresolved, plan.unverified);
//   return {
//     cleaned: true,
//     signaled,
//     ...(plan.unverified.length === 0 ? {} : { unverified: plan.unverified }),
//   };
// };
//
// /** Verify that no live process still carries an owned capture run token. */
// export const verifyNoTokenOwnedProcesses = async (
//   runId: string,
//   host: ProcessOwnershipHost = systemHost,
//   captureBaseline?: ProcessOwnershipBaseline,
//   relation?: OwnershipSweepRelation,
// ): Promise<ProcessCleanupResult> => {
//   const processTable = await readLiveProcessTable(host);
//   if (!processTable.available)
//     return {
//       cleaned: false,
//       reason: `process table could not be inspected: ${processTable.reason}`,
//     };
//   const scan = await scanTokenOwnedProcesses(
//     processTable.processes,
//     runId,
//     host,
//     captureBaseline,
//     relation,
//   );
//   if (scan.failures.length > 0)
//     return cleanupValidationFailure(scan.failures, scan.unverified);
//   if (scan.owned.length > 0)
//     return {
//       cleaned: false,
//       reason: "token-owned process remained after cleanup",
//       ...(scan.unverified.length === 0 ? {} : { unverified: scan.unverified }),
//     };
//   return {
//     cleaned: true,
//     signaled: false,
//     ...(scan.unverified.length === 0 ? {} : { unverified: scan.unverified }),
//   };
// };
//
// const readLiveProcessTable = async (
//   host: ProcessOwnershipHost,
// ): Promise<
//   | {
//       readonly available: true;
//       readonly processes: readonly ProcessTableEntry[];
//     }
//   | { readonly available: false; readonly reason: string }
// > => {
//   try {
//     return {
//       available: true,
//       processes: liveProcesses(await host.listProcesses()),
//     };
//   } catch (cause: unknown) {
//     return { available: false, reason: errorMessage(cause) };
//   }
// };
//
// interface OwnedCleanupPlan {
//   readonly signalOrder: readonly number[];
//   readonly tokenOwnedIdentities: ReadonlyMap<number, string | null>;
//   readonly unresolved: readonly ProcessOwnershipValidationFailure[];
//   readonly unverified: readonly OwnershipSweepUnverifiedProcess[];
// }
//
// // A process-table read can race exit and retain the old state with an altered
// // command. Only a fresh table proving that PID is no longer live can settle
// // that mismatch; surviving group members still require normal token checks.
// const settleLauncherExit = async (
//   ownership: OwnedProcessGroup,
//   processes: readonly ProcessTableEntry[],
//   host: ProcessOwnershipHost,
// ): Promise<
//   | readonly ProcessTableEntry[]
//   | Extract<ProcessCleanupResult, { readonly cleaned: false }>
// > => {
//   const launcher = processes.find(({ pid }) => pid === ownership.leaderPid);
//   if (launcher === undefined) return processes;
//   const reason = launcherIdentityFailure(launcher, ownership);
//   if (reason === null) return processes;
//   const refreshed = await readLiveProcessTable(host);
//   if (
//     refreshed.available &&
//     !refreshed.processes.some(({ pid }) => pid === launcher.pid)
//   ) {
//     // Refreshing must not discard a surviving detached descendant's lineage,
//     // including a child that changed groups while the launcher exited.
//     const descendants = descendantsOf([launcher.pid], processes);
//     const descendantPids = new Set(descendants.map(({ pid }) => pid));
//     const descendantGroupIds = new Set(
//       descendants.map(({ processGroupId }) => processGroupId),
//     );
//     const refreshedDescendantPids = new Set(
//       descendantsOf(
//         descendants.map(({ pid }) => pid),
//         refreshed.processes,
//       ).map(({ pid }) => pid),
//     );
//     if (
//       refreshed.processes.some(
//         (process) =>
//           process.processGroupId !== ownership.processGroupId &&
//           (refreshedDescendantPids.has(process.pid) ||
//             descendantPids.has(process.pid) ||
//             descendantGroupIds.has(process.processGroupId)),
//       )
//     )
//       return { cleaned: false, reason };
//     return refreshed.processes;
//   }
//   return { cleaned: false, reason };
// };
//
// const createOwnedCleanupPlan = async (
//   ownership: OwnedProcessGroup,
//   initialProcesses: readonly ProcessTableEntry[],
//   host: ProcessOwnershipHost,
// ): Promise<OwnedCleanupPlan | ProcessCleanupResult> => {
//   const processes = await settleLauncherExit(ownership, initialProcesses, host);
//   if ("cleaned" in processes) return processes;
//   const sampledProcessGroupIds = new Set(
//     (ownership.sampledProcessGroupIds ?? []).filter(
//       (processGroupId) =>
//         Number.isSafeInteger(processGroupId) && processGroupId > 0,
//     ),
//   );
//   const tokenOwned =
//     ownership.sweepTokenOwnedProcesses === true
//       ? await scanTokenOwnedProcesses(
//           processes,
//           ownership.runId,
//           host,
//           ownership.captureBaseline,
//           {
//             leaderPid: ownership.leaderPid,
//             processGroupId: ownership.processGroupId,
//             ...(sampledProcessGroupIds.size === 0
//               ? {}
//               : { sampledProcessGroupIds: [...sampledProcessGroupIds] }),
//           },
//         )
//       : { owned: [], failures: [], unverified: [], identities: new Map() };
//   const tokenOwnedGroupIds = new Set(
//     tokenOwned.owned.map(({ processGroupId }) => processGroupId),
//   );
//   const launcher = processes.find(({ pid }) => pid === ownership.leaderPid);
//   const rootMembers = processes.filter(
//     ({ processGroupId }) => processGroupId === ownership.processGroupId,
//   );
//   if (
//     launcher === undefined &&
//     rootMembers.length === 0 &&
//     tokenOwned.owned.length === 0 &&
//     !processes.some(({ processGroupId }) =>
//       sampledProcessGroupIds.has(processGroupId),
//     )
//   )
//     return tokenOwned.failures.length > 0
//       ? {
//           signalOrder: [],
//           tokenOwnedIdentities: tokenOwned.identities,
//           unresolved: tokenOwned.failures,
//           unverified: tokenOwned.unverified,
//         }
//       : {
//           cleaned: true,
//           signaled: false,
//           ...(tokenOwned.unverified.length === 0
//             ? {}
//             : { unverified: tokenOwned.unverified }),
//         };
//   let descendants: readonly ProcessTableEntry[] = [];
//   if (launcher !== undefined) {
//     descendants = descendantsOf([launcher.pid], processes);
//   }
//   const descendantPids = new Set(descendants.map(({ pid }) => pid));
//   const processGroupIds = new Set<number>([ownership.processGroupId]);
//   for (const descendant of descendants)
//     processGroupIds.add(descendant.processGroupId);
//   for (const process of tokenOwned.owned)
//     processGroupIds.add(process.processGroupId);
//   for (const processGroupId of sampledProcessGroupIds)
//     processGroupIds.add(processGroupId);
//   const signalableGroups = new Set<number>();
//   const unresolved = [...tokenOwned.failures];
//   const unverifiableSampledGroups = new Set<number>();
//   for (const processGroupId of processGroupIds) {
//     if (processGroupId === ownership.processGroupId) continue;
//     const groupLeader = processes.find(
//       ({ pid, processGroupId: observedGroupId }) =>
//         pid === processGroupId && observedGroupId === processGroupId,
//     );
//     if (
//       (groupLeader === undefined || !descendantPids.has(groupLeader.pid)) &&
//       !tokenOwnedGroupIds.has(processGroupId) &&
//       !sampledProcessGroupIds.has(processGroupId)
//     )
//       return {
//         cleaned: false,
//         reason:
//           "descendant process-group leader identity could not be verified",
//       };
//     if (
//       (groupLeader === undefined || !descendantPids.has(groupLeader.pid)) &&
//       !tokenOwnedGroupIds.has(processGroupId)
//     )
//       unverifiableSampledGroups.add(processGroupId);
//   }
//   const liveMembers = processes.filter(({ processGroupId }) =>
//     processGroupIds.has(processGroupId),
//   );
//   for (const processGroupId of processGroupIds) {
//     const members = liveMembers.filter(
//       ({ processGroupId: observedGroupId }) =>
//         observedGroupId === processGroupId,
//     );
//     if (members.length === 0) continue;
//     const failures = await processOwnershipFailures(
//       members,
//       ownership.runId,
//       host,
//       tokenOwned.identities,
//     );
//     if (failures.length === 0 && unverifiableSampledGroups.has(processGroupId))
//       unresolved.push(
//         ...members.map(({ pid }) => ({
//           pid,
//           reason: "process-identity-unavailable" as const,
//           diagnostic:
//             "sampled process-group leader identity could not be verified",
//         })),
//       );
//     const scanFailures = tokenOwned.failures.filter(({ pid }) =>
//       members.some((member) => member.pid === pid),
//     );
//     for (const failure of failures)
//       mergeProcessOwnershipFailure(unresolved, failure);
//     if (
//       failures.length === 0 &&
//       scanFailures.length === 0 &&
//       !unverifiableSampledGroups.has(processGroupId)
//     )
//       signalableGroups.add(processGroupId);
//   }
//   if (ownership.sweepTokenOwnedProcesses !== true && unresolved.length > 0)
//     return cleanupValidationFailure(unresolved, tokenOwned.unverified);
//   return {
//     signalOrder: [...signalableGroups]
//       .filter((groupId) => processGroupIds.has(groupId))
//       .sort((left, right) =>
//         left === ownership.processGroupId
//           ? -1
//           : right === ownership.processGroupId
//             ? 1
//             : left - right,
//       ),
//     tokenOwnedIdentities: tokenOwned.identities,
//     unresolved,
//     unverified: tokenOwned.unverified,
//   };
// };
//
// /** Keep one current, most useful ownership diagnosis for each live PID. */
// const mergeProcessOwnershipFailure = (
//   failures: ProcessOwnershipValidationFailure[],
export const _l = 280;
