export const __stub = 1;
//     expect(snapshotTarget(ANALYSIS_SNAPSHOT_TARGET)).not.toHaveProperty(
//       "entry_point",
//     );
//   });
// });
//
// describe("analysis snapshot nested subject contract", () => {
//   it("rejects raw-only 6502 in nested detected execution subjects", () => {
//     const { snapshot } = snapshotWithHistoricalEvidence();
//     const entry = snapshot.entries[0];
//     if (entry === undefined) throw new Error("Fixture has no snapshot entry");
//     const malformedSubject = {
//       ...entry.execution.subject,
//       format: "pe",
//       architecture: "6502",
//     };
//     expect(
//       analysisSnapshotSchema.safeParse({
//         ...snapshot,
//         entries: [
//           {
//             ...entry,
//             execution: {
//               ...entry.execution,
//               subject: malformedSubject,
//             },
//           },
//         ],
//       }).success,
//     ).toBe(false);
//     expect(
//       analysisSnapshotSchema.safeParse({
//         ...snapshot,
//         workflow_entries: [
//           {
//             ...entry,
//             execution: {
//               ...entry.execution,
//               analysis_profile: snapshot.binding.analysis_profile,
//               subject: malformedSubject,
//             },
//           },
//         ],
//       }).success,
//     ).toBe(false);
//   });
// });
//
// describe("analysis snapshot contract", () => {
//   it.each([
//     ["dos-mz", "x86"],
//     ["mach-o-universal", "arm64"],
//   ] as const)(
//     "preserves %s target and subject formats",
//     (format, architecture) => {
//       const target: BinaryTarget =
//         format === "mach-o-universal"
//           ? {
//               path: ANALYSIS_SNAPSHOT_TARGET.path,
//               sha256: ANALYSIS_SNAPSHOT_TARGET.sha256,
//               kind: "executable",
//               format,
//               architecture,
//               availableArchitectures: [architecture],
//               universalSlice: { offset: 0, size: 32 },
//             }
//           : {
//               path: ANALYSIS_SNAPSHOT_TARGET.path,
//               sha256: ANALYSIS_SNAPSHOT_TARGET.sha256,
//               kind: "executable",
//               format,
//               architecture,
//               availableArchitectures: [architecture],
//             };
//       const evidence = createEvidence(target, ANALYSIS_SNAPSHOT_PROVIDER, {
//         operation: "analyze_function",
//         parameters: {},
//         result: null,
//         analysisProfile: ANALYSIS_SNAPSHOT_PROFILE,
//       });
//       const binding = snapshotBinding(ANALYSIS_SNAPSHOT_PROFILE);
//       const parsed = parseAnalysisSnapshot({
//         target: snapshotTarget(target),
//         binding,
//         entries: [
//           {
//             query_id: analysisQueryId(
//               snapshotTarget(target),
//               binding,
//               "analyze_function",
//               {},
//             ),
//             operation: "analyze_function",
//             parameters: {},
//             execution: {
//               result: null,
//               raw_result: null,
//               provider: binding.provider,
//               limitations: [],
//               relationship_coverage: null,
//               locations: [],
//               subject: target,
//             },
//           },
//         ],
//         workflow_entries: [],
//         evidence_bundle: createEvidenceBundle([evidence]),
//       });
//       expect(parsed.target).toMatchObject({
//         format,
//         architecture,
//       });
//       expect(parsed.entries[0]?.execution.subject?.format).toBe(format);
//       expect(parsed.evidence_bundle.records[0]?.subject?.format).toBe(format);
//     },
//   );
//
//   it("rejects a snapshot subject path containing NUL", () => {
//     const binding = snapshotBinding(ANALYSIS_SNAPSHOT_PROFILE);
//     const entry = {
//       query_id: `query_${"0".repeat(64)}`,
//       operation: "analyze_function",
//       parameters: {},
//       execution: {
//         result: null,
//         raw_result: null,
//         provider: binding.provider,
//         limitations: [],
//         relationship_coverage: null,
//         locations: [],
//         subject: {
//           path: "a\u0000b",
//           sha256: "a".repeat(64),
//           format: "elf" as const,
//           architecture: null,
//         },
//       },
export const _l = 137;
