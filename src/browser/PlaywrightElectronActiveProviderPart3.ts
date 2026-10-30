export const __stub = 1;
//             ...(capture !== undefined
//               ? {
//                   partialObservation: {
//                     kind: "electron-active-observation" as const,
//                     capture,
//                   },
//                 }
//               : {}),
//           }),
//         );
//       if (outcome.ok && cleanup.unverified !== undefined)
//         outcome = ok({
//           ...outcome.value,
//           limitations: [
//             ...outcome.value.limitations,
//             ...cleanup.unverified.map(
//               ({ pid, diagnostic }) =>
//                 `Ownership of unrelated process ${String(pid)} could not be verified; it was left untouched: ${diagnostic}`,
//             ),
//           ],
//         });
//     }
//     return outcome;
//   }
// }
//
// /** Clean up an Electron launch. Windows signals a process only after lineage is verified. */
// export const cleanupElectronProcesses = async (
//   ownership: OwnedProcessGroup,
//   lineage: ProcessLineageObservation | undefined,
//   host: {
//     readonly platform: NodeJS.Platform;
//     readonly terminateTree: typeof cleanupWindowsProcessTree;
//   } = {
//     platform: process.platform,
//     terminateTree: cleanupWindowsProcessTree,
//   },
// ): Promise<ProcessCleanupResult> => {
//   if (host.platform === "win32") {
//     // An empty Windows process table is not ownership proof for this PID.
//     if (lineage?.status !== "verified")
//       return {
//         cleaned: false,
//         reason:
//           "owned Electron lineage was unavailable; helper cleanup was not proven",
//       };
//     const root = await host.terminateTree(ownership.leaderPid);
//     if (!root.cleaned) return root;
//     for (const descendant of lineage.lineage.descendants) {
//       const result = await host.terminateTree(descendant.pid);
//       if (!result.cleaned) return result;
//     }
//     return root;
//   }
//   if (lineage?.status !== "verified") {
//     const root = await cleanupOwnedProcessGroup(ownership);
//     return root.cleaned
//       ? {
//           cleaned: false,
//           reason:
//             "owned Electron lineage was unavailable; helper cleanup was not proven",
//         }
//       : root;
//   }
//   const groupIds = selectCapturedProcessGroupIds(
//     ownership.leaderPid,
//     lineage.lineage.descendants.map(({ pid, processGroupId }) => ({
//       pid,
//       process_group_id: processGroupId,
//     })),
//   );
//   let signaled = false;
//   const unverified: OwnershipSweepUnverifiedProcess[] = [];
//   for (const processGroupId of groupIds) {
//     const cleanupOwnership: OwnedProcessGroup =
//       processGroupId === ownership.processGroupId
//         ? { ...ownership, leaderPid: processGroupId, processGroupId }
//         : {
//             runId: ownership.runId,
//             leaderPid: processGroupId,
//             processGroupId,
//           };
//     const result = await cleanupOwnedProcessGroup(cleanupOwnership);
//     if (!result.cleaned) return result;
//     signaled ||= result.signaled;
//     unverified.push(...(result.unverified ?? []));
//   }
//   const remaining = await verifyNoTokenOwnedProcesses(
//     ownership.runId,
//     undefined,
//     ownership.captureBaseline,
//     {
//       leaderPid: ownership.leaderPid,
//       processGroupId: ownership.processGroupId,
//       ...(ownership.sampledProcessGroupIds === undefined
//         ? {}
//         : { sampledProcessGroupIds: ownership.sampledProcessGroupIds }),
//     },
//   );
//   if (!remaining.cleaned) return remaining;
//   unverified.push(...(remaining.unverified ?? []));
//   return {
//     cleaned: true,
//     signaled,
//     ...(unverified.length === 0
//       ? {}
//       : {
//           unverified: [
//             ...new Map(
//               unverified.map((item) => [
//                 `${String(item.pid)}:${item.diagnostic}`,
//                 item,
//               ]),
//             ).values(),
//           ],
//         }),
//   };
// };
//
// export const safeElectronEnvironment = (
//   environment: Readonly<Record<string, string | undefined>>,
//   runId: string,
//   platform = process.platform,
// ): Record<string, string> =>
//   Object.fromEntries([
//     ...[
//       "HOME",
//       "LANG",
export const _l = 128;
