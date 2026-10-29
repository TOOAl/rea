export const __stub = 1;
// import { expect, it } from "vitest";
//
// import {
//   createBoundedProcessTextNormalizer,
//   createProcessTextNormalizer,
//   normalizeProcessSamples,
//   normalizeProcessText,
// } from "./ProcessNormalization.js";
// import { parseProcessScenario } from "../../domain/process/processScenario.js";
//
// const rootPid = 41_010;
// const samples = Object.freeze(
//   [
//     {
//       at_ms: 17,
//       pid: rootPid,
//       parent_pid: 40_000,
//       process_group_id: rootPid,
//       session_id: rootPid,
//       command: " root 41010 ",
//     },
//     {
//       at_ms: 28,
//       pid: 42_020,
//       parent_pid: rootPid,
//       process_group_id: 43_030,
//       session_id: 44_040,
//       command:
//         " /workspace/program child 42020 parent 41010 group 43030 session 44040 listen:8080 marker ",
//     },
//     {
//       at_ms: 39,
//       pid: 45_050,
//       parent_pid: 42_020,
//       process_group_id: 43_030,
//       session_id: 44_040,
//       command: "peer 45050 unrelated 145050",
//     },
//     {
//       at_ms: 41,
//       pid: 46_060,
//       parent_pid: 0,
//       process_group_id: null,
//       session_id: 0,
//       command: "unknown 46060",
//     },
//     {
//       at_ms: 52,
//       pid: 47_070,
//       parent_pid: 0,
//       process_group_id: 0,
//       session_id: null,
//       command: "unavailable 47070",
//     },
//   ].map((sample) =>
//     Object.freeze({ ...sample, runtime_metadata: "must not be serialized" }),
//   ),
// );
//
// const scenario = (normalization: {
//   readonly pids?: boolean;
//   readonly paths?: boolean;
//   readonly ports?: boolean;
//   readonly patterns?: readonly {
//     readonly pattern: string;
//     readonly replacement: string;
//   }[];
// }) =>
//   parseProcessScenario({
//     executable: "/usr/bin/node",
//     working_directory: "/workspace",
//     normalization: {
//       paths: true,
//       time_bucket_ms: 10,
//       patterns: [{ pattern: "marker", replacement: "selected" }],
//       ...normalization,
//     },
//   });
//
// it("replaces caller-declared patterns literally, without expanding replacement patterns", () => {
//   const declared = scenario({
//     paths: false,
//     patterns: [
//       { pattern: "8080", replacement: "$&$&" },
//       { pattern: "READY", replacement: "$$" },
//       { pattern: "NAME", replacement: "$1" },
//     ],
//   });
//   expect(
//     normalizeProcessText(
//       "listening on 8080; READY; NAME=alpha; tail NAME",
//       declared,
//       "/temporary",
//       rootPid,
//     ),
//   ).toBe("listening on $&$&; $$; $1=alpha; tail $1");
// });
//
// it("bounds ordered normalization before replacement expansion and preserves later smaller chunks", () => {
//   const normalize = createBoundedProcessTextNormalizer(
//     scenario({
//       paths: false,
//       ports: false,
//       pids: false,
//       patterns: [{ pattern: "a", replacement: "x".repeat(500) }],
//     }),
//     "/temporary",
//     rootPid,
//   );
//
//   expect(normalize("a".repeat(100), 1_000)).toEqual({ state: "over_budget" });
//   expect(normalize("z", 1_000)).toEqual({
//     state: "normalized",
//     value: "z",
//     utf8Bytes: 1,
//   });
// });
//
// it("keeps ordered intermediate expansion explicit even when a later rule could shrink it", () => {
//   const normalize = createBoundedProcessTextNormalizer(
//     scenario({
//       paths: false,
//       ports: false,
//       pids: false,
//       patterns: [
//         { pattern: "a", replacement: "x".repeat(20) },
//         { pattern: "x", replacement: "y" },
//       ],
//     }),
//     "/temporary",
//     rootPid,
export const _l = 131;
