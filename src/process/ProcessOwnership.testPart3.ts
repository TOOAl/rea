export const __stub = 1;
//       reason: "process ownership token mismatch for PID(s): 200",
//       failures: [{ pid: 200, reason: "run-token-mismatch" }],
//     });
//     expect(signalGroup).not.toHaveBeenCalledWith(200, "SIGKILL");
//   });
// });
//
// describe("withheld process evidence during cleanup", () => {
//   it.each(["revalidation", "signal-error"] as const)(
//     "retains withheld-process evidence after %s failure",
//     async (mode) => {
//       const processes = [
//         {
//           pid: 100,
//           parentPid: 1,
//           processGroupId: 100,
//           state: "S",
//           command: "fixture",
//         },
//         {
//           pid: 900,
//           parentPid: 1,
//           processGroupId: 900,
//           state: "S",
//           command: "opaque",
//         },
//       ];
//       let rootReads = 0;
//       const signalGroup = vi.fn(() => {
//         if (mode === "signal-error")
//           throw Object.assign(new Error("signal denied"), { code: "EACCES" });
//       });
//       const adapter: ProcessOwnershipHost = {
//         listProcesses: async () => processes,
//         environment: async () => ({}),
//         runTokens: async (members) =>
//           new Map(
//             members.map(({ pid }) => [
//               pid,
//               pid === 900
//                 ? {
//                     state: "unavailable" as const,
//                     reason: "platform_binary_environment_withheld",
//                   }
//                 : {
//                     state: "readable" as const,
//                     runId:
//                       mode === "revalidation" && ++rootReads > 2
//                         ? "other-run"
//                         : "run-token",
//                   },
//             ]),
//           ),
//         signalGroup,
//       };
//
//       const result = await cleanupOwnedProcessGroup(
//         { ...ownership, sweepTokenOwnedProcesses: true, captureBaseline: [] },
//         adapter,
//       );
//
//       expect(result.unverified).toEqual([
//         { pid: 900, diagnostic: "platform_binary_environment_withheld" },
//       ]);
//       if (result.cleaned) throw new Error("expected cleanup failure");
//       if (mode === "revalidation")
//         expect(result.reason).toBe(
//           "process ownership token mismatch for PID(s): 100",
//         );
//       else
//         expect(result.reason).toBe(
//           "owned process group signal failed: signal denied",
//         );
//     },
//   );
//
//   it.each([
//     "environment_unavailable",
//     "platform_binary_environment_withheld",
//     "restricted_process_environment_withheld",
//   ])("fails closed for a related candidate with %s", async (diagnostic) => {
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
//         uid:
//           diagnostic === "restricted_process_environment_withheld"
//             ? (process.getuid?.() ?? 0)
//             : process.getuid?.() === 0
//               ? 1
//               : 0,
//         command: "ready-hang",
//       },
//     ];
//     const signalGroup = vi.fn();
//     const identities = new Map(
//       processes.map(({ pid }) => [
//         pid,
//         { state: "readable" as const, identity: `start-${String(pid)}` },
//       ]),
//     );
//     const adapter: ProcessOwnershipHost = {
//       listProcesses: () => Promise.resolve(processes),
//       environment: (pid) =>
//         pid === 100
//           ? Promise.resolve({ REA_PROCESS_RUN_ID: "run-token" })
//           : Promise.reject(new Error("EACCES: permission denied")),
//       processIdentities: () => Promise.resolve(identities),
//       runTokens: (members) =>
//         Promise.resolve(
//           new Map(
//             members.map(({ pid }) => [
//               pid,
//               pid === 100
//                 ? { state: "readable" as const, runId: "run-token" }
//                 : {
//                     state: "unavailable" as const,
//                     reason: diagnostic,
//                   },
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
//       reason: expect.stringContaining(
//         "process ownership token could not be read",
//       ),
//     });
//     expect(signalGroup).not.toHaveBeenCalled();
//   });
// });
//
// describe("sampled detached process groups during cleanup", () => {
//   it("signals only token-authenticated sampled groups and reports an unowned sample", async () => {
//     const processes = [
//       {
export const _l = 157;
