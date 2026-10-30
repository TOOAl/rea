export const __stub = 1;
//     expect(
//       await cleanupOwnedProcessGroup(
//         {
//           ...ownership,
//           expectedCommand: "/owned/hopper",
//           expectedParentPid: 1,
//         },
//         adapter,
//       ),
//     ).toEqual({
//       cleaned: false,
//       reason:
//         "owned launcher command identity did not match (observed=fixture; expected=/owned/hopper)",
//     });
//     expect(signalGroup).not.toHaveBeenCalled();
//   });
//   it("fails closed when the launcher parent identity changes", async () => {
//     const { adapter, signalGroup } = host({
//       100: { REA_PROCESS_RUN_ID: "run-token" },
//     });
//     expect(
//       await cleanupOwnedProcessGroup(
//         { ...ownership, expectedCommand: "fixture", expectedParentPid: 999 },
//         adapter,
//       ),
//     ).toEqual({
//       cleaned: false,
//       reason: "owned launcher parent identity did not match",
//     });
//     expect(signalGroup).not.toHaveBeenCalled();
//   });
// });
//
// describe("owned process-group cleanup token batches", () => {
//   const root = {
//     pid: 100,
//     parentPid: 1,
//     processGroupId: 100,
//     state: "S",
//     command: "fixture",
//   };
//
//   it("batches validation and falls back only for a missing member row", async () => {
//     const child = { ...root, pid: 101, parentPid: root.pid };
//     const runTokens = vi.fn(() =>
//       Promise.resolve(
//         new Map([
//           [root.pid, { state: "readable" as const, runId: ownership.runId }],
//         ]),
//       ),
//     );
//     const environment = vi.fn(() =>
//       Promise.resolve({ REA_PROCESS_RUN_ID: ownership.runId }),
//     );
//     const signalGroup = vi.fn();
//     const adapter: ProcessOwnershipHost = {
//       listProcesses: () => Promise.resolve([root, child]),
//       environment,
//       runTokens,
//       signalGroup,
//     };
//
//     await expect(cleanupOwnedProcessGroup(ownership, adapter)).resolves.toEqual(
//       { cleaned: true, signaled: true },
//     );
//     expect(runTokens).toHaveBeenCalledTimes(2);
//     expect(runTokens).toHaveBeenNthCalledWith(1, [root, child]);
//     expect(environment.mock.calls).toEqual([[child.pid], [child.pid]]);
//     expect(signalGroup).toHaveBeenCalledWith(root.processGroupId, "SIGKILL");
//   });
//
//   it("keeps explicit unreadable rows fail-closed without environment fallback", async () => {
//     const environment = vi.fn(() =>
//       Promise.resolve({ REA_PROCESS_RUN_ID: ownership.runId }),
//     );
//     const signalGroup = vi.fn();
//     const adapter: ProcessOwnershipHost = {
//       listProcesses: () => Promise.resolve([root]),
//       environment,
//       runTokens: () =>
//         Promise.resolve(
//           new Map([
//             [
//               root.pid,
//               { state: "unavailable" as const, reason: "fixture unreadable" },
//             ],
//           ]),
//         ),
//       signalGroup,
//     };
//
//     await expect(
//       cleanupOwnedProcessGroup(ownership, adapter),
//     ).resolves.toMatchObject({
//       cleaned: false,
//       failures: [
//         {
//           pid: root.pid,
//           reason: "environment-unreadable",
//           diagnostic: "fixture unreadable",
//         },
//       ],
//     });
//     expect(environment).not.toHaveBeenCalled();
//     expect(signalGroup).not.toHaveBeenCalled();
//   });
//
//   it("falls back to the environment reader when the batch operation throws", async () => {
//     const environment = vi.fn(() =>
//       Promise.resolve({ REA_PROCESS_RUN_ID: ownership.runId }),
//     );
//     const signalGroup = vi.fn();
//     const adapter: ProcessOwnershipHost = {
//       listProcesses: () => Promise.resolve([root]),
//       environment,
//       runTokens: () => Promise.reject(new Error("batch reader unavailable")),
//       signalGroup,
//     };
//
//     await expect(cleanupOwnedProcessGroup(ownership, adapter)).resolves.toEqual(
//       { cleaned: true, signaled: true },
//     );
//     expect(environment).toHaveBeenCalledTimes(2);
//     expect(signalGroup).toHaveBeenCalledWith(root.processGroupId, "SIGKILL");
//   });
//
//   it("retains both failures when batch and individual token reads fail", async () => {
//     const signalGroup = vi.fn();
//     const adapter: ProcessOwnershipHost = {
//       listProcesses: () => Promise.resolve([root]),
//       environment: () => Promise.reject(new Error("individual unreadable")),
//       runTokens: () => Promise.reject(new Error("batch reader unavailable")),
//       signalGroup,
//     };
//
//     await expect(
//       cleanupOwnedProcessGroup(ownership, adapter),
//     ).resolves.toMatchObject({
//       cleaned: false,
//       failures: [
//         {
//           pid: root.pid,
//           reason: "environment-unreadable",
//           diagnostic:
//             "individual unreadable; run-token batch failed: batch reader unavailable",
//         },
//       ],
//     });
//     expect(signalGroup).not.toHaveBeenCalled();
//   });
// });
//
// describe("Windows P0 process-tree cleanup", () => {
//   it("reports whether taskkill signaled or found an exited tree", async () => {
//     const terminated: WindowsProcessTreeHost = {
//       terminateTree: () => Promise.resolve("terminated"),
//     };
//     const missing: WindowsProcessTreeHost = {
//       terminateTree: () => Promise.resolve("missing"),
//     };
//     await expect(cleanupWindowsProcessTree(42, terminated)).resolves.toEqual({
//       cleaned: true,
//       signaled: true,
//     });
//     await expect(cleanupWindowsProcessTree(42, missing)).resolves.toEqual({
//       cleaned: true,
//       signaled: false,
//     });
//   });
//   it("keeps invalid identity and termination failures explicit", async () => {
//     const failing: WindowsProcessTreeHost = {
//       terminateTree: () => Promise.reject(new Error("taskkill failed")),
//     };
//     await expect(cleanupWindowsProcessTree(0, failing)).resolves.toEqual({
//       cleaned: false,
//       reason: "Windows process-tree PID is invalid",
//     });
//     await expect(cleanupWindowsProcessTree(42, failing)).resolves.toEqual({
//       cleaned: false,
//       reason:
//         "Windows process-tree termination failed for PID 42: taskkill failed",
//     });
//   });
// });
export const _l = 184;
