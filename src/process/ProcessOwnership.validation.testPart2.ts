export const __stub = 1;
//         failures: members.map(({ pid }) => ({
//           pid,
//           reason: "environment-unreadable",
//           diagnostic: `unreadable ${pid}`,
//         })),
//       },
//     );
//     expect(listProcesses).toHaveBeenCalledTimes(2);
//     expect(signalGroup).not.toHaveBeenCalled();
//   });
//
//   it.each([false, true])(
//     "retains mismatches and fails closed when the liveness recheck fails: %s",
//     async (recheckFails) => {
//       const members = [100, 101, 102].map((pid) => ({
//         pid,
//         parentPid: pid === 100 ? 1 : 100,
//         processGroupId: 100,
//         state: "S",
//         command: "fixture",
//       }));
//       const listProcesses = vi
//         .fn<ProcessOwnershipHost["listProcesses"]>()
//         .mockResolvedValueOnce(members);
//       if (recheckFails)
//         listProcesses.mockRejectedValue(new Error("process table denied"));
//       else listProcesses.mockResolvedValue([]);
//       const signalGroup = vi.fn();
//       const adapter: ProcessOwnershipHost = {
//         listProcesses,
//         environment: async (pid) => {
//           if (pid === 101) return { REA_PROCESS_RUN_ID: "other-run" };
//           throw new Error(`unreadable ${pid}`);
//         },
//         signalGroup,
//       };
//       await expect(
//         cleanupOwnedProcessGroup(ownership, adapter),
//       ).resolves.toEqual({
//         cleaned: false,
//         reason: "process ownership token mismatch for PID(s): 101",
//         failures: recheckFails
//           ? [
//               {
//                 pid: 100,
//                 reason: "environment-unreadable",
//                 diagnostic:
//                   "unreadable 100; process liveness recheck failed: process table denied",
//               },
//               { pid: 101, reason: "run-token-mismatch" },
//               {
//                 pid: 102,
//                 reason: "environment-unreadable",
//                 diagnostic:
//                   "unreadable 102; process liveness recheck failed: process table denied",
//               },
//             ]
//           : [{ pid: 101, reason: "run-token-mismatch" }],
//       });
//       expect(listProcesses).toHaveBeenCalledTimes(2);
//       expect(signalGroup).not.toHaveBeenCalled();
//     },
//   );
//
//   it("accepts a member that exits during ownership revalidation", async () => {
//     const listProcesses = vi
//       .fn<ProcessOwnershipHost["listProcesses"]>()
//       .mockResolvedValueOnce([launcher])
//       .mockResolvedValue([]);
//     const signalGroup = vi.fn();
//     const adapter: ProcessOwnershipHost = {
//       listProcesses,
//       environment: () =>
//         Promise.reject(new Error("process exited before environment read")),
//       signalGroup,
//     };
//     await expect(cleanupOwnedProcessGroup(ownership, adapter)).resolves.toEqual(
//       {
//         cleaned: true,
//         signaled: false,
//       },
//     );
//     expect(signalGroup).not.toHaveBeenCalled();
//   });
// });
//
// describe("owned process-group cleanup validation: refreshed descendant lineage", () => {
//   it.each(["planning", "signaling"])(
//     "retains cleanup uncertainty for newly detached descendants during %s",
//     async (phase) => {
//       const child = { ...launcher, pid: 101, parentPid: 100 };
//       const stale = { ...launcher, command: "[MainThread]" };
//       const signalGroup = vi.fn();
//       let reads = 0;
//       const adapter: ProcessOwnershipHost = {
//         listProcesses: () => {
//           reads += 1;
//           if (phase === "signaling" && reads === 1)
//             return Promise.resolve([launcher, child]);
//           if (reads === (phase === "planning" ? 1 : 2))
//             return Promise.resolve([stale, child]);
//           return Promise.resolve([
//             { ...child, parentPid: 1 },
//             { ...child, pid: 102, parentPid: 101 },
//             { ...child, pid: 103, parentPid: 102, processGroupId: 103 },
//           ]);
//         },
//         environment: () =>
//           Promise.resolve({ REA_PROCESS_RUN_ID: ownership.runId }),
//         signalGroup,
//       };
//       await expect(
//         cleanupOwnedProcessGroup(
//           { ...ownership, expectedCommand: "fixture" },
//           adapter,
//         ),
//       ).resolves.toMatchObject({ cleaned: false });
//       expect(signalGroup).not.toHaveBeenCalled();
//     },
//   );
// });
//
// describe("owned process-group cleanup validation: launcher exit races", () => {
//   it.each([101, 999])(
//     "retains cleanup uncertainty for a detached descendant in group %s after launcher exit",
//     async (processGroupId) => {
//       const child = {
//         ...launcher,
//         pid: 101,
//         parentPid: 100,
//         processGroupId: 101,
//       };
//       const signalGroup = vi.fn();
//       const listProcesses = vi
//         .fn<ProcessOwnershipHost["listProcesses"]>()
//         .mockResolvedValueOnce([
//           { ...launcher, command: "[MainThread]" },
//           child,
//         ])
//         .mockResolvedValue([{ ...child, parentPid: 1, processGroupId }]);
//       await expect(
//         cleanupOwnedProcessGroup(
//           {
//             ...ownership,
//             expectedCommand: "fixture",
//           },
//           {
//             listProcesses,
//             environment: () =>
//               Promise.resolve({ REA_PROCESS_RUN_ID: "run-token" }),
//             signalGroup,
//           },
//         ),
//       ).resolves.toMatchObject({ cleaned: false });
//       expect(signalGroup).not.toHaveBeenCalled();
//     },
//   );
//   it.each(["planning", "signaling"])(
//     "settles a stale launcher command during %s without skipping surviving group ownership",
//     async (phase) => {
//       for (const remaining of ["absent", "zombie", "owned", "foreign"]) {
//         const stale = { ...launcher, command: "[MainThread]" };
//         const child = { ...launcher, pid: 101, command: "child" };
//         let reads = 0;
//         const signalGroup = vi.fn();
//         const adapter: ProcessOwnershipHost = {
//           listProcesses: () => {
//             reads += 1;
//             if (phase === "signaling" && reads === 1)
//               return Promise.resolve([launcher]);
//             if (reads === (phase === "planning" ? 1 : 2))
//               return Promise.resolve([stale]);
//             return Promise.resolve(
//               remaining === "absent"
//                 ? []
//                 : remaining === "zombie"
//                   ? [{ ...stale, state: "Z" }]
//                   : [child],
//             );
//           },
//           environment: () =>
//             Promise.resolve({
//               REA_PROCESS_RUN_ID:
//                 remaining === "foreign" && reads > 1
//                   ? "other-run"
export const _l = 185;
