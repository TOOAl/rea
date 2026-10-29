export const __stub = 1;
// import { describe, expect, it, vi } from "vitest";
// import {
//   cleanupOwnedProcessGroup,
//   cleanupWindowsProcessTree,
//   type ProcessOwnershipHost,
//   type ProcessTableEntry,
//   type WindowsProcessTreeHost,
// } from "./ProcessOwnership.js";
// import {
//   observeOwnedProcessGroups,
//   observeOwnedProcessLineage,
// } from "./ProcessOwnershipObservation.js";
// import { host, ownership } from "./ProcessOwnership.fixture.js";
//
// const launcher: ProcessTableEntry = {
//   pid: 100,
//   parentPid: 1,
//   processGroupId: 100,
//   state: "S",
//   command: "fixture",
// };
//
// describe("owned process-group cleanup validation: ownership and lineage", () => {
//   it("settles unreadable observations for Darwin processes exiting in the kernel", async () => {
//     let snapshots = 0;
//     const child = {
//       pid: 101,
//       parentPid: 100,
//       processGroupId: 100,
//       state: "?E",
//       command: "fixture-child",
//     };
//     const adapter: ProcessOwnershipHost = {
//       platform: "darwin",
//       listProcesses: () => {
//         snapshots += 1;
//         return Promise.resolve(
//           snapshots === 1
//             ? [launcher, child]
//             : snapshots === 2
//               ? [launcher, child]
//               : [launcher, { ...child, state: "Z" }],
//         );
//       },
//       environment: (pid) =>
//         pid === 100
//           ? Promise.resolve({ REA_PROCESS_RUN_ID: "run-token" })
//           : Promise.reject(new Error("sysctl_errno_22")),
//       signalGroup: vi.fn(),
//     };
//
//     await expect(cleanupOwnedProcessGroup(ownership, adapter)).resolves.toEqual(
//       { cleaned: true, signaled: true },
//     );
//     expect(snapshots).toBeGreaterThanOrEqual(3);
//   });
//
//   it("fails closed when a descendant in another process group lacks the token", async () => {
//     const adapter: ProcessOwnershipHost = {
//       listProcesses: () =>
//         Promise.resolve([
//           launcher,
//           {
//             pid: 101,
//             parentPid: 100,
//             processGroupId: 101,
//             state: "S",
//             command: "child-session",
//           },
//         ]),
//       environment: (pid) =>
//         Promise.resolve({
//           REA_PROCESS_RUN_ID: pid === 100 ? "run-token" : "other-run",
//         }),
//       signalGroup: vi.fn(),
//     };
//     await expect(
//       observeOwnedProcessLineage(ownership, adapter),
//     ).resolves.toEqual({
//       status: "unavailable",
//       observedAt: expect.any(String),
//       runId: "run-token",
//       launcherPid: 100,
//       processGroupId: 100,
//       reason: "process lineage contains an unowned or PID-reused process",
//     });
//   });
//   it("does not publish lineage when any member fails ownership checks", async () => {
//     const { adapter } = host({
//       100: { REA_PROCESS_RUN_ID: "run-token" },
//       101: { REA_PROCESS_RUN_ID: "other-run" },
//     });
//     await expect(
//       observeOwnedProcessLineage(ownership, adapter),
//     ).resolves.toEqual({
//       status: "unavailable",
//       observedAt: expect.any(String),
//       runId: "run-token",
//       launcherPid: 100,
//       processGroupId: 100,
//       reason: "process lineage contains an unowned or PID-reused process",
//     });
//   });
//   it("fails closed for stale metadata or an unrelated concurrent process", async () => {
//     const { adapter, signalGroup } = host({
//       100: { REA_PROCESS_RUN_ID: "run-token" },
//       101: { REA_PROCESS_RUN_ID: "different-run" },
//     });
//     expect(await cleanupOwnedProcessGroup(ownership, adapter)).toEqual({
//       cleaned: false,
//       reason: "process ownership token mismatch for PID(s): 101",
//       failures: [{ pid: 101, reason: "run-token-mismatch" }],
//     });
//     expect(signalGroup).not.toHaveBeenCalled();
//   });
//   it("checks every member and aggregates ownership read failures", async () => {
//     const environment = vi.fn((pid: number) => {
//       if (pid === 100)
//         return Promise.reject(new Error("transient procfs read"));
//       return Promise.resolve(
//         pid === 101
//           ? { REA_PROCESS_RUN_ID: "different-run" }
//           : { REA_PROCESS_RUN_ID: "run-token" },
//       );
//     });
//     const signalGroup = vi.fn();
//     const adapter: ProcessOwnershipHost = {
//       listProcesses: () =>
//         Promise.resolve(
//           [100, 101, 102].map((pid) => ({
//             pid,
//             parentPid: pid === 100 ? 1 : 100,
//             processGroupId: 100,
//             state: "S",
//             command: "fixture",
//           })),
//         ),
//       environment,
//       signalGroup,
//     };
//     expect(await cleanupOwnedProcessGroup(ownership, adapter)).toEqual({
//       cleaned: false,
//       reason: "process ownership token mismatch for PID(s): 101",
//       failures: [
//         expect.objectContaining({
//           pid: 100,
//           reason: "environment-unreadable",
//           diagnostic: "transient procfs read",
//         }),
//         { pid: 101, reason: "run-token-mismatch" },
//       ],
//     });
//     expect(signalGroup).not.toHaveBeenCalled();
//   });
// });
//
// describe("owned process-group cleanup liveness rechecks", () => {
//   it("rechecks all unreadable members after the token phase in one fresh snapshot", async () => {
//     const members = [100, 101, 102, 103].map((pid) => ({
//       pid,
//       parentPid: pid === 100 ? 1 : 100,
//       processGroupId: 100,
//       state: "S",
//       command: "fixture",
//     }));
//     const tokenReads: number[] = [];
//     const listProcesses = vi.fn(async () => {
//       if (tokenReads.length > 0)
//         expect(tokenReads).toEqual([100, 101, 102, 103]);
//       return members;
//     });
//     const signalGroup = vi.fn();
//     const adapter: ProcessOwnershipHost = {
//       listProcesses,
//       environment: async (pid) => {
//         tokenReads.push(pid);
//         throw new Error(`unreadable ${pid}`);
//       },
//       signalGroup,
//     };
//     await expect(cleanupOwnedProcessGroup(ownership, adapter)).resolves.toEqual(
//       {
//         cleaned: false,
//         reason:
//           "process ownership token could not be read for 4 live process(es): other_unavailable=4; live candidates 100=other_unavailable, 101=other_unavailable, 102=other_unavailable, 103=other_unavailable",
export const _l = 185;
