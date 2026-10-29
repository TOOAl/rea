export const __stub = 1;
// import { describe, expect, it } from "vitest";
//
// import {
//   type _AnalysisSnapshot,
//   analysisSnapshotSchema,
//   analysisQueryId,
//   parseAnalysisSnapshot,
//   snapshotBinding,
//   snapshotEvidenceForQuery,
//   snapshotTarget,
//   snapshotMatchesTarget,
// } from "./analysisSnapshot.js";
// import {
//   ANALYSIS_SNAPSHOT_PROFILE,
//   ANALYSIS_SNAPSHOT_PROVIDER,
//   ANALYSIS_SNAPSHOT_TARGET,
// } from "./analysisSnapshot.fixture.js";
// import { createEvidence } from "./evidence.js";
// import { createEvidenceBundle } from "./evidenceBundle.js";
// import type { BinaryTarget } from "./binaryTargetTypes.js";
//
// const snapshotWithHistoricalEvidence = () => {
//   const target = snapshotTarget(ANALYSIS_SNAPSHOT_TARGET);
//   const binding = snapshotBinding(ANALYSIS_SNAPSHOT_PROFILE);
//   const parameters = { procedure: "main" };
//   const makeEvidence = (result: string) =>
//     createEvidence(ANALYSIS_SNAPSHOT_TARGET, ANALYSIS_SNAPSHOT_PROVIDER, {
//       operation: "analyze_function",
//       parameters,
//       result: { summary: result },
//       analysisProfile: ANALYSIS_SNAPSHOT_PROFILE,
//     });
//   const current = makeEvidence("cached");
//   const entry = {
//     query_id: analysisQueryId(target, binding, "analyze_function", parameters),
//     operation: "analyze_function",
//     parameters,
//     execution: {
//       result: { summary: "cached" },
//       raw_result: null,
//       provider: binding.provider,
//       limitations: [],
//       relationship_coverage: null,
//       locations: [],
//       subject: {
//         path: ANALYSIS_SNAPSHOT_TARGET.path,
//         sha256: ANALYSIS_SNAPSHOT_TARGET.sha256,
//         format: ANALYSIS_SNAPSHOT_TARGET.format,
//         architecture: ANALYSIS_SNAPSHOT_TARGET.architecture ?? null,
//       },
//     },
//   };
//   return {
//     current,
//     snapshot: analysisSnapshotSchema.parse({
//       target,
//       binding,
//       entries: [entry],
//       workflow_entries: [],
//       evidence_bundle: createEvidenceBundle([
//         makeEvidence("older"),
//         current,
//         createEvidence(ANALYSIS_SNAPSHOT_TARGET, ANALYSIS_SNAPSHOT_PROVIDER, {
//           operation: "unprofiled_query",
//           parameters: {},
//           result: { summary: "unprofiled" },
//         }),
//       ]),
//     }),
//   };
// };
//
// describe("analysis snapshot target identity", () => {
//   it("keeps 6502 confined to executable raw snapshots", () => {
//     const target = {
//       sha256: ANALYSIS_SNAPSHOT_TARGET.sha256,
//       kind: "executable",
//       architecture: "6502",
//     };
//     expect(
//       analysisSnapshotSchema.shape.target.safeParse({
//         ...target,
//         format: "pe",
//       }).success,
//     ).toBe(false);
//     expect(
//       analysisSnapshotSchema.shape.target.safeParse({
//         ...target,
//         format: "raw-binary",
//         entry_point: "0x8001",
//       }).success,
//     ).toBe(true);
//   });
//
//   it("partitions raw snapshots and query identities by the canonical entry", () => {
//     const target: BinaryTarget = {
//       path: "/fixture/image.bin",
//       sha256: ANALYSIS_SNAPSHOT_TARGET.sha256,
//       kind: "executable",
//       format: "raw-binary",
//       architecture: "arm",
//       availableArchitectures: ["arm"],
//       entryPoint: "0x8000000",
//       entryPointSource: "0x08000000",
//     };
//     const snapshot = snapshotTarget(target);
//     const binding = snapshotBinding(ANALYSIS_SNAPSHOT_PROFILE);
//     const changed = {
//       ...target,
//       entryPoint: "0x9000000",
//       entryPointSource: "0x09000000",
//     };
//     expect(
//       snapshotMatchesTarget(snapshot, {
//         ...target,
//         entryPointSource: "0x8000000",
//       }),
//     ).toBe(true);
//     expect(snapshotMatchesTarget(snapshot, changed)).toBe(false);
//     expect(analysisQueryId(snapshot, binding, "list_procedures", {})).not.toBe(
//       analysisQueryId(snapshotTarget(changed), binding, "list_procedures", {}),
//     );
//     const parsed = analysisSnapshotSchema.parse({
//       target: snapshot,
//       binding,
//       entries: [],
//       workflow_entries: [],
//       evidence_bundle: createEvidenceBundle([]),
//     });
//     expect(parsed.target).toHaveProperty("entry_point", target.entryPoint);
//     const { entry_point: _entry, ...legacy } = {
//       ...snapshot,
//       entry_point: target.entryPoint,
//     };
//     expect(
//       analysisSnapshotSchema.safeParse({ ...parsed, target: legacy }).success,
//     ).toBe(false);
export const _l = 137;
