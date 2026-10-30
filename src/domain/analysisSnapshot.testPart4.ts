export const __stub = 1;
//     ).toThrow(/another target/u);
//   });
// });
//
// describe("analysis snapshot Evidence binding", () => {
//   it("finds only Evidence committed to the exact binding and profile", () => {
//     const { current, snapshot } = snapshotWithHistoricalEvidence();
//     expect(
//       snapshotEvidenceForQuery(snapshot, {
//         target: ANALYSIS_SNAPSHOT_TARGET,
//         bindingProfile: ANALYSIS_SNAPSHOT_PROFILE,
//         operation: "analyze_function",
//         parameters: { procedure: "main" },
//         provider: ANALYSIS_SNAPSHOT_PROVIDER,
//         evidenceProfile: ANALYSIS_SNAPSHOT_PROFILE,
//       }),
//     ).toEqual(current);
//     expect(
//       snapshotEvidenceForQuery(snapshot, {
//         target: ANALYSIS_SNAPSHOT_TARGET,
//         bindingProfile: ANALYSIS_SNAPSHOT_PROFILE,
//         operation: "unprofiled_query",
//         parameters: {},
//         provider: ANALYSIS_SNAPSHOT_PROVIDER,
//         evidenceProfile: ANALYSIS_SNAPSHOT_PROFILE,
//       }),
//     ).toBeUndefined();
//   });
//
//   it("rejects cached execution data that differs from its bundled Evidence", () => {
//     const target = snapshotTarget(ANALYSIS_SNAPSHOT_TARGET);
//     const binding = snapshotBinding(ANALYSIS_SNAPSHOT_PROFILE);
//     const parameters = { address: "0x1000", document: "main" };
//     const result = { name: "main" };
//     const rawResult = { name: "provider-main" };
//     const subject = {
//       path: ANALYSIS_SNAPSHOT_TARGET.path,
//       sha256: ANALYSIS_SNAPSHOT_TARGET.sha256,
//       format: ANALYSIS_SNAPSHOT_TARGET.format,
//       architecture: ANALYSIS_SNAPSHOT_TARGET.architecture ?? null,
//     };
//     const entry = {
//       query_id: analysisQueryId(target, binding, "address_name", parameters),
//       operation: "address_name",
//       parameters,
//       execution: {
//         result,
//         raw_result: rawResult,
//         provider: binding.provider,
//         limitations: ["fixture limitation"],
//         relationship_coverage: null,
//         locations: [{ kind: "address" as const, address: "0x1000" }],
//         subject,
//       },
//     };
//     const evidence = createEvidence(
//       ANALYSIS_SNAPSHOT_TARGET,
//       binding.provider,
//       {
//         operation: entry.operation,
//         parameters,
//         result,
//         rawResult,
//         analysisProfile: ANALYSIS_SNAPSHOT_PROFILE,
//         limitations: entry.execution.limitations,
//         locations: entry.execution.locations,
//       },
//     );
//     const snapshot = {
//       target,
//       binding,
//       entries: [entry],
//       workflow_entries: [],
//       evidence_bundle: createEvidenceBundle([evidence]),
//     };
//     const parsedSnapshot = parseAnalysisSnapshot(snapshot);
//     expect(
//       parsedSnapshot.entries[0]?.execution.relationship_coverage,
//     ).toBeNull();
//
//     const missingCoverage = structuredClone(snapshot);
//     const missingCoverageEntry = missingCoverage.entries[0];
//     if (missingCoverageEntry === undefined)
//       throw new Error("snapshot entry missing");
//     Reflect.deleteProperty(
//       missingCoverageEntry.execution,
//       "relationship_coverage",
//     );
//     expect(() => parseAnalysisSnapshot(missingCoverage)).toThrow();
//
//     expect(() =>
//       parseAnalysisSnapshot({
//         ...snapshot,
//         evidence_bundle: createEvidenceBundle([]),
//       }),
//     ).toThrow(/no profile-bound Evidence/u);
//     const { workflow_entries: _workflows, ...missingWorkflowEntries } =
//       snapshot;
//     expect(() => parseAnalysisSnapshot(missingWorkflowEntries)).toThrow();
//
//     const alterations = [
//       (altered: typeof snapshot) => {
//         const entry = altered.entries[0];
//         if (entry === undefined) throw new TypeError("missing fixture entry");
//         entry.execution.result = { name: "tampered" };
//       },
//       (altered: typeof snapshot) => {
//         const entry = altered.entries[0];
//         if (entry === undefined) throw new TypeError("missing fixture entry");
//         entry.execution.raw_result = { name: "tampered" };
//       },
//       (altered: typeof snapshot) => {
//         const subject = altered.entries[0]?.execution.subject;
//         if (subject !== null && subject !== undefined)
//           subject.path = "/different/path";
//       },
//       (altered: typeof snapshot) => {
//         const entry = altered.entries[0];
//         if (entry === undefined) throw new TypeError("missing fixture entry");
//         Reflect.set(entry.execution, "relationship_coverage", {
//           status: "complete",
//         });
//       },
//     ];
//     for (const alter of alterations) {
//       const altered = structuredClone(snapshot);
//       alter(altered);
//       expect(() => parseAnalysisSnapshot(altered)).toThrow(
//         /differs from its Evidence record/u,
//       );
//     }
//   });
// });
export const _l = 133;
