export const __stub = 1;
// import { describe, expect, it, vi } from "vitest";
// import {
//   cleanupOwnedProcessGroup,
//   type ProcessOwnershipHost,
// } from "./ProcessOwnership.js";
// import { parseProcessEnvironment } from "./ProcessOwnershipObservation.js";
// import { selectCapturedProcessGroupIds } from "./ProcessOwnershipProcessTree.js";
// import { matchesOwnedProcessCommand } from "./ProcessCommandIdentity.js";
// import { host, ownership } from "./ProcessOwnership.fixture.js";
// describe("owned process-group cleanup discovery", () => {
//   it("excludes sampled groups whose leader was outside the captured tree", () => {
//     expect(
//       selectCapturedProcessGroupIds(100, [
//         { pid: 100, process_group_id: 42 },
//         { pid: 100, process_group_id: 100 },
//         { pid: 101, process_group_id: 42 },
//         { pid: 102, process_group_id: 102 },
//         { pid: 103, process_group_id: 102 },
//       ]),
//     ).toEqual([100, 102]);
//   });
//   it("drops nameless Linux environment entries", () => {
//     expect(
//       parseProcessEnvironment("=ignored\0REA_PROCESS_RUN_ID=owned\0EMPTY=\0"),
//     ).toEqual({ REA_PROCESS_RUN_ID: "owned", EMPTY: "" });
//   });
//   it("matches macOS executable names after process-table normalization", () => {
//     expect(
//       matchesOwnedProcessCommand(
//         "node /tmp/fake-launcher.mjs",
//         "/opt/node/bin/node",
//         "darwin",
//       ),
//     ).toBe(true);
//     expect(
//       matchesOwnedProcessCommand("(node)", "/opt/node/bin/node", "darwin"),
//     ).toBe(true);
//     expect(
//       matchesOwnedProcessCommand(
//         "node /tmp/fake-launcher.mjs",
//         "/opt/python/bin/python3",
//         "darwin",
//       ),
//     ).toBe(false);
//     expect(
//       matchesOwnedProcessCommand(
//         "node /tmp/fake-launcher.mjs",
//         "/opt/node/bin/node",
//         "linux",
//       ),
//     ).toBe(false);
//     expect(
//       matchesOwnedProcessCommand("(node)", "/opt/node/bin/node", "linux"),
//     ).toBe(false);
//   });
//   it("signals only a group whose every member carries the run token", async () => {
//     const { adapter, signalGroup } = host({
//       100: { REA_PROCESS_RUN_ID: "run-token" },
//       101: { REA_PROCESS_RUN_ID: "run-token" },
//     });
//     expect(await cleanupOwnedProcessGroup(ownership, adapter)).toEqual({
//       cleaned: true,
//       signaled: true,
//     });
//     expect(signalGroup).toHaveBeenCalledWith(100, "SIGKILL");
//   });
// });
//
// describe("opaque process neighbors during cleanup", () => {
//   it.each([
//     "platform_binary_environment_withheld",
//     "restricted_process_environment_withheld",
//   ])(
//     "cleans verified run-owned groups and records an unrelated %s neighbor",
//     async (diagnostic) => {
//       const processes = [
//         { pid: 100, parentPid: 1, processGroupId: 100, command: "capture" },
//         {
//           pid: 200,
//           parentPid: 1,
//           processGroupId: 200,
//           command: "detached-child",
//         },
//         {
//           pid: 900,
//           parentPid: 1,
//           processGroupId: 900,
//           command: "/usr/bin/opaque-neighbor",
//         },
//       ].map((process) => ({ ...process, state: "S" }));
//       const signalGroup = vi.fn();
//       const identities = new Map(
//         processes.map(({ pid }) => [
//           pid,
//           { state: "readable" as const, identity: `start-${String(pid)}` },
//         ]),
//       );
//       const adapter: ProcessOwnershipHost = {
//         platform: "darwin",
//         listProcesses: () => Promise.resolve(processes),
//         environment: (pid) =>
//           Promise.resolve({
//             REA_PROCESS_RUN_ID: pid === 900 ? "unowned" : "run-token",
//           }),
//         processIdentities: () => Promise.resolve(identities),
//         runTokens: (members) =>
//           Promise.resolve(
//             new Map(
//               members.map(({ pid }) => [
//                 pid,
//                 pid === 900
//                   ? {
//                       state: "unavailable" as const,
//                       reason: diagnostic,
//                     }
//                   : { state: "readable" as const, runId: "run-token" },
//               ]),
//             ),
//           ),
//         signalGroup,
//       };
//
//       const result = await cleanupOwnedProcessGroup(
//         {
//           ...ownership,
//           sweepTokenOwnedProcesses: true,
//           captureBaseline: [],
//         },
//         adapter,
//       );
//
//       expect(result).toMatchObject({
//         cleaned: true,
//         signaled: true,
//         unverified: [{ pid: 900, diagnostic }],
//       });
//       expect(signalGroup.mock.calls).toEqual([
//         [100, "SIGKILL"],
//         [200, "SIGKILL"],
//       ]);
//       expect(signalGroup).not.toHaveBeenCalledWith(900, "SIGKILL");
//     },
//   );
//
//   it("fails closed for an unrelated candidate with an ordinary unavailable environment", async () => {
//     const diagnostic = "environment_unavailable";
//     const processes = [
//       { pid: 100, parentPid: 1, processGroupId: 100, command: "capture" },
//       {
//         pid: 900,
//         parentPid: 1,
//         processGroupId: 900,
//         command: "opaque-neighbor",
//       },
//     ].map((process) => ({ ...process, state: "S" }));
//     const signalGroup = vi.fn();
//     const identities = new Map(
export const _l = 157;
