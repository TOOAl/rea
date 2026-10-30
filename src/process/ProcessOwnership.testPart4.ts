export const __stub = 1;
//         pid: 100,
//         parentPid: 1,
//         processGroupId: 100,
//         state: "S",
//         command: "capture",
//       },
//       {
//         pid: 200,
//         parentPid: 1,
//         processGroupId: 200,
//         state: "S",
//         command: "sanitized-detached-child",
//       },
//     ];
//     const signalGroup = vi.fn();
//     const identities = new Map([
//       [100, { state: "readable" as const, identity: "start-100" }],
//       [200, { state: "readable" as const, identity: "start-200" }],
//     ]);
//     const adapter: ProcessOwnershipHost = {
//       listProcesses: () => Promise.resolve(processes),
//       environment: (pid) =>
//         Promise.resolve(pid === 100 ? { REA_PROCESS_RUN_ID: "run-token" } : {}),
//       processIdentities: () => Promise.resolve(identities),
//       runTokens: (members) =>
//         Promise.resolve(
//           new Map(
//             members.map(({ pid }) => [
//               pid,
//               {
//                 state: "readable" as const,
//                 runId: pid === 100 ? "run-token" : undefined,
//               },
//             ]),
//           ),
//         ),
//       signalGroup,
//     };
//
//     const result = await cleanupOwnedProcessGroup(
//       {
//         ...ownership,
//         sweepTokenOwnedProcesses: true,
//         sampledProcessGroupIds: [200],
//       },
//       adapter,
//     );
//
//     expect(result).toMatchObject({
//       cleaned: false,
//       reason: "process ownership token mismatch for PID(s): 200",
//       failures: [{ pid: 200, reason: "run-token-mismatch" }],
//     });
//     expect(signalGroup).toHaveBeenCalledTimes(1);
//     expect(signalGroup).toHaveBeenCalledWith(100, "SIGKILL");
//     expect(signalGroup).not.toHaveBeenCalledWith(200, "SIGKILL");
//   });
//
//   it("reports a live sampled group after the launcher has exited without signaling it", async () => {
//     const process = {
//       pid: 200,
//       parentPid: 1,
//       processGroupId: 200,
//       state: "S",
//       command: "sanitized-detached-child",
//     };
//     const signalGroup = vi.fn();
//     const adapter: ProcessOwnershipHost = {
//       listProcesses: () => Promise.resolve([process]),
//       environment: () => Promise.resolve({}),
//       runTokens: () =>
//         Promise.resolve(
//           new Map([[200, { state: "readable" as const, runId: undefined }]]),
//         ),
//       signalGroup,
//     };
//
//     const result = await cleanupOwnedProcessGroup(
//       {
//         ...ownership,
//         sweepTokenOwnedProcesses: true,
//         sampledProcessGroupIds: [200],
//       },
//       adapter,
//     );
//
//     expect(result).toMatchObject({
//       cleaned: false,
//       reason: "process ownership token mismatch for PID(s): 200",
//       failures: [{ pid: 200, reason: "run-token-mismatch" }],
//     });
//     expect(signalGroup).not.toHaveBeenCalled();
//   });
// });
//
// describe("rooted process-group cleanup", () => {
//   it("validates and signals rooted descendant groups once, root first", async () => {
//     const processes = [
//       { pid: 100, parentPid: 1, processGroupId: 100 },
//       { pid: 110, parentPid: 100, processGroupId: 100 },
//       { pid: 101, parentPid: 100, processGroupId: 101 },
//       { pid: 102, parentPid: 101, processGroupId: 102 },
//       { pid: 103, parentPid: 102, processGroupId: 102 },
//     ].map((process) => ({
//       ...process,
//       state: "S",
//       command: "fixture",
//     }));
//     const signalGroup = vi.fn();
//     const adapter: ProcessOwnershipHost = {
//       listProcesses: () => Promise.resolve(processes),
//       environment: () => Promise.resolve({ REA_PROCESS_RUN_ID: "run-token" }),
//       signalGroup,
//     };
//     await expect(cleanupOwnedProcessGroup(ownership, adapter)).resolves.toEqual(
//       { cleaned: true, signaled: true },
//     );
//     expect(signalGroup.mock.calls).toEqual([
//       [100, "SIGKILL"],
//       [101, "SIGKILL"],
//       [102, "SIGKILL"],
//     ]);
//   });
//   it("leaves an unrelated Hopper process group outside the rooted tree untouched", async () => {
//     const processes = [
//       { pid: 100, parentPid: 1, processGroupId: 100, command: "rea-hopper" },
//       { pid: 101, parentPid: 100, processGroupId: 101, command: "owned-child" },
//       {
//         pid: 900,
//         parentPid: 1,
//         processGroupId: 900,
//         command:
//           "/Applications/Hopper Disassembler.app/Contents/MacOS/Hopper Disassembler",
//       },
//     ].map((process) => ({ ...process, state: "S" }));
//     const environment = vi.fn((pid: number) =>
//       Promise.resolve({
//         REA_PROCESS_RUN_ID: pid === 900 ? "unrelated-run" : "run-token",
//       }),
//     );
//     const signalGroup = vi.fn();
//     const adapter: ProcessOwnershipHost = {
//       listProcesses: () => Promise.resolve(processes),
//       environment,
//       signalGroup,
//     };
//     await expect(cleanupOwnedProcessGroup(ownership, adapter)).resolves.toEqual(
//       { cleaned: true, signaled: true },
//     );
//     expect(signalGroup.mock.calls).toEqual([
//       [100, "SIGKILL"],
//       [101, "SIGKILL"],
//     ]);
//     expect(environment.mock.calls.some(([pid]) => pid === 900)).toBe(false);
//   });
// });
export const _l = 156;
