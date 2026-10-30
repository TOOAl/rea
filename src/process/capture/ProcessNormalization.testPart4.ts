export const __stub = 1;
//   expect(normalized).toEqual([
//     {
//       at_ms: 10,
//       pid: 1,
//       parent_pid: 2,
//       process_group_id: 1,
//       session_id: 1,
//       command: "root <pid>",
//     },
//     {
//       at_ms: 20,
//       pid: 3,
//       parent_pid: 1,
//       process_group_id: 4,
//       session_id: 5,
//       command:
//         "<working-directory>/program child <pid> parent <pid> group <pid> session <pid> listen:<port> selected",
//     },
//     {
//       at_ms: 30,
//       pid: 6,
//       parent_pid: 3,
//       process_group_id: 4,
//       session_id: 5,
//       command: "peer <pid> unrelated 145050",
//     },
//     {
//       at_ms: 40,
//       pid: 7,
//       parent_pid: 0,
//       process_group_id: null,
//       session_id: 0,
//       command: "unknown <pid>",
//     },
//     {
//       at_ms: 50,
//       pid: 8,
//       parent_pid: 0,
//       process_group_id: 0,
//       session_id: null,
//       command: "unavailable <pid>",
//     },
//   ]);
//   expect(JSON.stringify(samples)).toBe(before);
//   expect(normalized.every((sample) => !("runtime_metadata" in sample))).toBe(
//     true,
//   );
//
//   const pathAndPortPreserved = normalizeProcessSamples(
//     samples,
//     scenario({ paths: false, ports: false }),
//     rootPid,
//   );
//   expect(pathAndPortPreserved[1]).toMatchObject({
//     pid: 3,
//     parent_pid: 1,
//     command:
//       "/workspace/program child <pid> parent <pid> group <pid> session <pid> listen:8080 selected",
//   });
//
//   const identifiersPreserved = normalizeProcessSamples(
//     samples,
//     scenario({ pids: false }),
//     rootPid,
//   );
//   expect(
//     identifiersPreserved.map(
//       ({ pid, parent_pid, process_group_id, session_id }) => [
//         pid,
//         parent_pid,
//         process_group_id,
//         session_id,
//       ],
//     ),
//   ).toEqual([
//     [rootPid, 40_000, rootPid, rootPid],
//     [42_020, rootPid, 43_030, 44_040],
//     [45_050, 42_020, 43_030, 44_040],
//     [46_060, 0, null, 0],
//     [47_070, 0, 0, null],
//   ]);
//   expect(identifiersPreserved[1]?.command).toBe(
//     "<working-directory>/program child 42020 parent 41010 group 43030 session 44040 listen:<port> selected",
//   );
// });
//
// it("normalizes nested paths once using the most specific selected identity", () => {
//   const declared = parseProcessScenario({
//     executable: "/workspace/project/bin/program",
//     working_directory: "/workspace/project",
//     filesystem_observation_paths: [
//       "/workspace/project/data",
//       "/workspace/project/data/cache",
//     ],
//     normalization: { paths: true, pids: false, ports: false, patterns: [] },
//   });
//   expect(
//     normalizeProcessText(
//       "/workspace/project/bin/program /workspace/project/data/cache/item /workspace/project/data/result /workspace/project/log /workspace/tmp",
//       declared,
//       "/workspace",
//       rootPid,
//     ),
//   ).toBe(
//     "<executable> <filesystem-root-1>/item <filesystem-root-0>/result <working-directory>/log <temporary-root>/tmp",
//   );
// });
//
// it("treats path metacharacters literally while preferring nested observed roots", () => {
//   const declared = parseProcessScenario({
//     executable: "/selected/[tool]+",
//     working_directory: "/selected",
//     filesystem_observation_paths: [
//       "/selected/(data)",
//       "/selected/(data)/cache",
//     ],
//     normalization: { paths: true, pids: false, ports: false, patterns: [] },
//   });
//   expect(
//     normalizeProcessText(
//       "/selected/[tool]+ /selected/(data)/cache/item /selected/(data)/file /selected/log /selected/toolll",
//       declared,
//       "/tmp",
//       rootPid,
//     ),
//   ).toBe(
//     "<executable> <filesystem-root-1>/item <filesystem-root-0>/file <working-directory>/log <working-directory>/toolll",
//   );
// });
export const _l = 129;
