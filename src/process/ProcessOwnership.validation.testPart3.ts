export const __stub = 1;
//                   : "run-token",
//             }),
//           signalGroup,
//         };
//         const result = await cleanupOwnedProcessGroup(
//           { ...ownership, expectedCommand: "fixture" },
//           adapter,
//         );
//         if (remaining === "foreign")
//           expect(result).toMatchObject({
//             cleaned: false,
//             reason: "process ownership token mismatch for PID(s): 101",
//           });
//         else
//           expect(result).toEqual({
//             cleaned: true,
//             signaled: remaining === "owned",
//           });
//         if (remaining === "owned")
//           expect(signalGroup).toHaveBeenCalledWith(100, "SIGKILL");
//         else expect(signalGroup).not.toHaveBeenCalled();
//       }
//     },
//   );
//   it("fails closed when a mismatched launcher's exit cannot be inspected", async () => {
//     const { adapter, signalGroup } = host({
//       100: { REA_PROCESS_RUN_ID: "run-token" },
//     });
//     const listProcesses = vi
//       .fn<ProcessOwnershipHost["listProcesses"]>()
//       .mockResolvedValueOnce(await adapter.listProcesses())
//       .mockRejectedValue(new Error("process table unavailable"));
//     await expect(
//       cleanupOwnedProcessGroup(
//         { ...ownership, expectedCommand: "/owned/hopper" },
//         { ...adapter, listProcesses },
//       ),
//     ).resolves.toMatchObject({
//       cleaned: false,
//       reason: expect.stringContaining("command identity did not match"),
//     });
//     expect(signalGroup).not.toHaveBeenCalled();
//   });
//   it.each(["planning", "signaling"])(
//     "rejects a surviving launcher PID in another group during %s",
//     async (phase) => {
//       let reads = 0;
//       const signalGroup = vi.fn();
//       const adapter: ProcessOwnershipHost = {
//         listProcesses: () => {
//           reads += 1;
//           return Promise.resolve([
//             phase === "signaling" && reads === 1
//               ? launcher
//               : reads === (phase === "planning" ? 1 : 2)
//                 ? { ...launcher, command: "[MainThread]" }
//                 : { ...launcher, processGroupId: 999 },
//           ]);
//         },
//         environment: () => Promise.resolve({ REA_PROCESS_RUN_ID: "run-token" }),
//         signalGroup,
//       };
//       await expect(
//         cleanupOwnedProcessGroup(
//           { ...ownership, expectedCommand: "fixture" },
//           adapter,
//         ),
//       ).resolves.toMatchObject({
//         cleaned: false,
//         reason: expect.stringContaining("command identity did not match"),
//       });
//       expect(signalGroup).not.toHaveBeenCalled();
//     },
//   );
// });
//
// describe("owned process-group cleanup validation: exited members", () => {
//   it("preserves cancellation during process-table observation instead of reporting unverifiable ownership", async () => {
//     const controller = new AbortController();
//     const reason = new Error("cancelled process observation");
//     const adapter: ProcessOwnershipHost = {
//       listProcesses: async (signal) => {
//         controller.abort(reason);
//         signal?.throwIfAborted();
//         return [];
//       },
//       environment: () => Promise.resolve({}),
//       signalGroup: () => {
//         throw new Error("Observation must never signal processes");
//       },
//     };
//     await expect(
//       observeOwnedProcessGroups(
//         ownership.runId,
//         [ownership.processGroupId],
//         adapter,
//         controller.signal,
//       ),
//     ).rejects.toBe(reason);
//   });
//   it("does not inspect a process group after observation was cancelled", async () => {
//     const controller = new AbortController();
//     const reason = new Error("already cancelled observation");
//     controller.abort(reason);
//     const adapter: ProcessOwnershipHost = {
//       listProcesses: () => {
//         throw new Error("Cancelled observation must not inspect processes");
//       },
//       environment: () => Promise.resolve({}),
//       signalGroup: () => {
//         throw new Error("Observation must never signal processes");
//       },
//     };
//     await expect(
//       observeOwnedProcessGroups(
//         ownership.runId,
//         [ownership.processGroupId],
//         adapter,
//         controller.signal,
//       ),
//     ).rejects.toBe(reason);
//   });
//   it("ignores exited zombie members during live ownership checks", async () => {
//     const environment = vi.fn((pid: number) =>
//       Promise.resolve(pid === 101 ? {} : { REA_PROCESS_RUN_ID: "run-token" }),
//     );
//     const signalGroup = vi.fn();
//     const adapter: ProcessOwnershipHost = {
//       listProcesses: () =>
//         Promise.resolve([
//           launcher,
//           {
//             pid: 101,
//             parentPid: 100,
//             processGroupId: 100,
//             state: "Z",
//             command: "[node] <defunct>",
//           },
//         ]),
//       environment,
//       signalGroup,
//     };
//     expect(await cleanupOwnedProcessGroup(ownership, adapter)).toEqual({
//       cleaned: true,
//       signaled: true,
//     });
//     expect(environment.mock.calls).toEqual([[100], [100]]);
//     expect(signalGroup).toHaveBeenCalledWith(100, "SIGKILL");
//   });
//   it("observes a zombie-only group as settled", async () => {
//     const environment = vi.fn(() => Promise.resolve({}));
//     const adapter: ProcessOwnershipHost = {
//       listProcesses: () =>
//         Promise.resolve([
//           {
//             pid: 101,
//             parentPid: 1,
//             processGroupId: 100,
//             state: "Z+",
//             command: "[node] <defunct>",
//           },
//         ]),
//       environment,
//       signalGroup: vi.fn(),
//     };
//     expect(
//       await observeOwnedProcessGroups(
//         ownership.runId,
//         [ownership.processGroupId],
//         adapter,
//       ),
//     ).toEqual(new Map([[ownership.processGroupId, { state: "empty" }]]));
//     expect(environment).not.toHaveBeenCalled();
//   });
//   it("is idempotent when the owned group has already exited", async () => {
//     const { adapter } = host({});
//     expect(await cleanupOwnedProcessGroup(ownership, adapter)).toEqual({
//       cleaned: true,
//       signaled: false,
//     });
//   });
//   it("fails closed when the launcher command identity changes", async () => {
//     const { adapter, signalGroup } = host({
//       100: { REA_PROCESS_RUN_ID: "run-token" },
//     });
export const _l = 185;
