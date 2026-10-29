export const __stub = 1;
//       processes.map(({ pid }) => [
//         pid,
//         { state: "readable" as const, identity: `start-${String(pid)}` },
//       ]),
//     );
//     const adapter: ProcessOwnershipHost = {
//       platform: "darwin",
//       listProcesses: () => Promise.resolve(processes),
//       environment: (pid) =>
//         Promise.resolve({
//           REA_PROCESS_RUN_ID: pid === 900 ? "unowned" : "run-token",
//         }),
//       processIdentities: () => Promise.resolve(identities),
//       runTokens: (members) =>
//         Promise.resolve(
//           new Map(
//             members.map(({ pid }) => [
//               pid,
//               pid === 900
//                 ? {
//                     state: "unavailable" as const,
//                     reason: diagnostic,
//                   }
//                 : { state: "readable" as const, runId: "run-token" },
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
//         captureBaseline: [],
//       },
//       adapter,
//     );
//
//     expect(result).toMatchObject({
//       cleaned: false,
//       reason: expect.stringContaining(`${diagnostic}=1`),
//     });
//     if (result.cleaned)
//       throw new Error("Expected unknown ownership to fail closed");
//     expect(result.reason).toContain(`live candidates 900=${diagnostic}`);
//     expect(result.reason).not.toContain("unowned");
//     expect(result.reason).not.toContain("run-token");
//     expect(signalGroup.mock.calls).toEqual([[100, "SIGKILL"]]);
//     expect(signalGroup).not.toHaveBeenCalledWith(900, "SIGKILL");
//   });
// });
//
// describe("related sweep candidates during cleanup", () => {
//   it("counts each unreadable live member once", async () => {
//     const processes = [
//       {
//         pid: 100,
//         parentPid: 1,
//         processGroupId: 100,
//         state: "S",
//         command: "capture",
//       },
//       {
//         pid: 101,
//         parentPid: 100,
//         processGroupId: 100,
//         state: "S",
//         command: "child-a",
//       },
//       {
//         pid: 102,
//         parentPid: 100,
//         processGroupId: 100,
//         state: "S",
//         command: "child-b",
//       },
//     ];
//     const signalGroup = vi.fn();
//     const adapter: ProcessOwnershipHost = {
//       listProcesses: async () => processes,
//       environment: async () => ({}),
//       runTokens: async (members) =>
//         new Map(
//           members.map(({ pid }) => [
//             pid,
//             pid === 100
//               ? { state: "readable" as const, runId: ownership.runId }
//               : {
//                   state: "unavailable" as const,
//                   reason: "environment_unavailable",
//                 },
//           ]),
//         ),
//       signalGroup,
//     };
//     const result = await cleanupOwnedProcessGroup(
//       { ...ownership, sweepTokenOwnedProcesses: true, captureBaseline: [] },
//       adapter,
//     );
//     if (result.cleaned) throw new Error("expected cleanup failure");
//     expect(signalGroup).not.toHaveBeenCalled();
//     expect(result.failures?.map(({ pid }) => pid).sort()).toEqual([101, 102]);
//     expect(result.reason).toContain("2 live process(es)");
//   });
//
//   it("upgrades unreadable evidence when later group validation finds a foreign token", async () => {
//     const processes = [
//       {
//         pid: 100,
//         parentPid: 1,
//         processGroupId: 100,
//         state: "S",
//         command: "capture",
//       },
//       {
//         pid: 200,
//         parentPid: 100,
//         processGroupId: 200,
//         state: "S",
//         command: "detached-child",
//       },
//     ];
//     const signalGroup = vi.fn();
//     let childReads = 0;
//     const adapter: ProcessOwnershipHost = {
//       listProcesses: async () => processes,
//       processIdentities: async (members) =>
//         new Map(
//           members.map(({ pid }) => [
//             pid,
//             { state: "readable" as const, identity: `start-${String(pid)}` },
//           ]),
//         ),
//       environment: async () => ({}),
//       runTokens: async (members) =>
//         new Map(
//           members.map(({ pid }) => [
//             pid,
//             pid === 100
//               ? { state: "readable" as const, runId: ownership.runId }
//               : ++childReads <= 4
//                 ? {
//                     state: "unavailable" as const,
//                     reason: "environment_unavailable",
//                   }
//                 : { state: "readable" as const, runId: "foreign-token" },
//           ]),
//         ),
//       signalGroup,
//     };
//     const result = await cleanupOwnedProcessGroup(
//       { ...ownership, sweepTokenOwnedProcesses: true, captureBaseline: [] },
//       adapter,
//     );
//     expect(result).toMatchObject({
//       cleaned: false,
export const _l = 157;
