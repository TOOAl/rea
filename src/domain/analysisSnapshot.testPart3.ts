export const __stub = 1;
//     };
//     expect(
//       analysisSnapshotSchema.safeParse({
//         target: snapshotTarget(ANALYSIS_SNAPSHOT_TARGET),
//         binding,
//         entries: [entry],
//         workflow_entries: [],
//         evidence_bundle: createEvidenceBundle([]),
//       }).success,
//     ).toBe(false);
//   });
//
//   it("accepts snapshots with more than ten thousand analysis entries", () => {
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
//         subject: null,
//       },
//     };
//
//     const parsed = analysisSnapshotSchema.parse({
//       target: snapshotTarget(ANALYSIS_SNAPSHOT_TARGET),
//       binding,
//       entries: Array.from({ length: 10_001 }, () => entry),
//       workflow_entries: [],
//       evidence_bundle: createEvidenceBundle([]),
//     });
//
//     expect(parsed.entries).toHaveLength(10_001);
//   });
// });
//
// describe("analysis snapshot canonical ordering and scope", () => {
//   it("rejects reordered queries and foreign-target records while preserving unprofiled observations", () => {
//     const { snapshot } = snapshotWithHistoricalEvidence();
//     const first = snapshot.entries[0];
//     if (first === undefined) throw new Error("Missing fixture query");
//     const parameters = { procedure: "other" };
//     const second = {
//       ...first,
//       parameters,
//       query_id: analysisQueryId(
//         snapshot.target,
//         snapshot.binding,
//         first.operation,
//         parameters,
//       ),
//     };
//     const entries = [first, second].sort((left, right) =>
//       left.query_id.localeCompare(right.query_id),
//     );
//     const secondEvidence = createEvidence(
//       ANALYSIS_SNAPSHOT_TARGET,
//       ANALYSIS_SNAPSHOT_PROVIDER,
//       {
//         operation: second.operation,
//         parameters,
//         result: second.execution.result,
//         analysisProfile: ANALYSIS_SNAPSHOT_PROFILE,
//       },
//     );
//     const canonical = {
//       ...snapshot,
//       entries,
//       evidence_bundle: createEvidenceBundle([
//         ...snapshot.evidence_bundle.records,
//         secondEvidence,
//       ]),
//     };
//     expect(parseAnalysisSnapshot(canonical).entries).toEqual(entries);
//     expect(() =>
//       parseAnalysisSnapshot({ ...canonical, entries: [...entries].reverse() }),
//     ).toThrow(/entries are not canonical/u);
//     const workflows = entries.map((entry) => ({
//       ...entry,
//       execution: {
//         ...entry.execution,
//         analysis_profile: ANALYSIS_SNAPSHOT_PROFILE,
//       },
//     }));
//     const workflowEvidence = workflows.map((entry) =>
//       createEvidence(ANALYSIS_SNAPSHOT_TARGET, ANALYSIS_SNAPSHOT_PROVIDER, {
//         operation: entry.operation,
//         parameters: entry.parameters,
//         result: entry.execution.result,
//         analysisProfile: ANALYSIS_SNAPSHOT_PROFILE,
//         confidence: "derived",
//       }),
//     );
//     expect(
//       parseAnalysisSnapshot({
//         ...snapshot,
//         entries: [],
//         workflow_entries: workflows,
//         evidence_bundle: createEvidenceBundle(workflowEvidence),
//       }).workflow_entries,
//     ).toEqual(workflows);
//     expect(() =>
//       parseAnalysisSnapshot({
//         ...snapshot,
//         entries: [],
//         workflow_entries: workflows,
//       }),
//     ).toThrow(/no profile-bound Evidence/u);
//     expect(() =>
//       parseAnalysisSnapshot({
//         ...snapshot,
//         entries: [],
//         workflow_entries: [...workflows].reverse(),
//       }),
//     ).toThrow(/workflow entries are not canonical/u);
//     const foreign = createEvidence(
//       { ...ANALYSIS_SNAPSHOT_TARGET, sha256: "b".repeat(64) },
//       ANALYSIS_SNAPSHOT_PROVIDER,
//       {
//         operation: "unprofiled_query",
//         parameters: {},
//         result: null,
//       },
//     );
//     expect(() =>
//       parseAnalysisSnapshot({
//         ...snapshot,
//         evidence_bundle: createEvidenceBundle([
//           ...snapshot.evidence_bundle.records,
//           foreign,
//         ]),
//       }),
export const _l = 137;
