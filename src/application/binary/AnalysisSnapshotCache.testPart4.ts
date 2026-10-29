export const __stub = 1;
//   return { cache, operation, parameters, snapshot: exported.value };
// };
//
// describe("relationship coverage snapshot replay", () => {
//   it("authenticates coverage and rejects missing serialized fields", () => {
//     const coverage: RelationshipCoverage = {
//       status: "complete",
//       diagnostics: ["The provider retained an unresolved call target."],
//     };
//     const { cache, operation, parameters, snapshot } =
//       createRelationshipCoverageSnapshot(coverage);
//     expect(
//       cache.lookup(
//         ANALYSIS_SNAPSHOT_TARGET,
//         ANALYSIS_SNAPSHOT_PROFILE,
//         operation,
//         parameters,
//       )?.relationshipCoverage,
//     ).toEqual(coverage);
//
//     const tampered = structuredClone(snapshot);
//     const tamperedEntry = tampered.entries[0];
//     if (tamperedEntry === undefined) throw new Error("snapshot entry missing");
//     tamperedEntry.execution.relationship_coverage = {
//       status: "complete",
//       diagnostics: ["forged coverage"],
//     };
//     expect(
//       new AnalysisSnapshotCache().import(tampered, undefined, () => ok(0)).ok,
//     ).toBe(false);
//
//     const missingCoverage = structuredClone(snapshot);
//     const missingCoverageEntry = missingCoverage.entries[0];
//     if (missingCoverageEntry === undefined)
//       throw new Error("snapshot entry missing");
//     Reflect.deleteProperty(
//       missingCoverageEntry.execution,
//       "relationship_coverage",
//     );
//     const missingCoverageEvidence = missingCoverage.evidence_bundle.records[0];
//     if (missingCoverageEvidence === undefined)
//       throw new Error("snapshot Evidence missing");
//     Reflect.deleteProperty(missingCoverageEvidence, "relationship_coverage");
//     expect(() => parseAnalysisSnapshot(missingCoverage)).toThrow();
//     expect(
//       new AnalysisSnapshotCache().import(missingCoverage, undefined, () =>
//         ok(0),
//       ).ok,
//     ).toBe(false);
//   });
//
//   it("replays absent coverage as explicitly unknown", () => {
//     const { operation, parameters, snapshot } =
//       createRelationshipCoverageSnapshot();
//     expect(snapshot.entries[0]?.execution.relationship_coverage).toBeNull();
//     expect(
//       snapshot.evidence_bundle.records[0]?.relationship_coverage,
//     ).toBeNull();
//
//     const replayCache = new AnalysisSnapshotCache();
//     expect(replayCache.import(snapshot, undefined, () => ok(0)).ok).toBe(true);
//     expect(
//       replayCache.lookup(
//         ANALYSIS_SNAPSHOT_TARGET,
//         ANALYSIS_SNAPSHOT_PROFILE,
//         operation,
//         parameters,
//       )?.relationshipCoverage,
//     ).toEqual({
//       status: "unknown",
//       reason: "Snapshot entry does not report relationship coverage.",
//     });
//   });
// });
//
// it("does not replay pre-envelope call graphs under the revised workflow profile", () => {
//   const cache = new AnalysisSnapshotCache();
//   const target = ANALYSIS_SNAPSHOT_TARGET;
//   const profile = ANALYSIS_SNAPSHOT_PROFILE;
//   const operation = "get_call_graph" as const;
//   const parameters = { address: "0x1000", direction: "forward" };
//   const oldProfile = workflowAnalysisProfile(profile);
//   const revisedProfile = workflowAnalysisProfile(profile, operation);
//   const oldResult = { "0": [] };
//   cache.recordWorkflow({
//     target,
//     profile,
//     operation,
//     parameters,
//     execution: {
//       ...createAnalysisExecution(oldResult, REA_WORKFLOW_PROVIDER, {
//         subject: target,
//         rawResult: oldResult,
//       }),
//       analysisProfile: oldProfile,
//     },
//   });
//   const evidence = createEvidence(target, REA_WORKFLOW_PROVIDER, {
//     operation,
//     confidence: "derived",
//     parameters,
//     result: oldResult,
//     rawResult: oldResult,
//     analysisProfile: oldProfile,
//   });
//   const exported = cache.export(
//     target,
//     profile,
//     createEvidenceBundle([evidence]),
//   );
//   if (!exported.ok) throw exported.error;
//   const snapshot = parseAnalysisSnapshot(exported.value);
//
//   expect(
//     snapshotEvidenceForQuery(snapshot, {
//       target,
//       bindingProfile: profile,
//       operation,
//       parameters,
//       provider: REA_WORKFLOW_PROVIDER,
//       evidenceProfile: revisedProfile,
//     }),
//   ).toBeUndefined();
//   expect(
//     enhancedOutputSchemas.get_call_graph?.safeParse({
//       normalized_result: oldResult,
//     }).success,
//   ).toBe(false);
// });
//
// describe("executions that report truncated references", () => {
//   const record = (referencesTruncated: boolean | undefined) => {
//     const cache = new AnalysisSnapshotCache();
//     const parameters = { address: "0x1000", document: "fixture" };
//     cache.record({
//       target: ANALYSIS_SNAPSHOT_TARGET,
//       profile: ANALYSIS_SNAPSHOT_PROFILE,
//       operation: "xrefs",
//       parameters,
//       execution: createAnalysisExecution(
//         ["0x2000"],
//         ANALYSIS_SNAPSHOT_PROVIDER,
//         {
//           subject: ANALYSIS_SNAPSHOT_TARGET,
//           analysisProfile: ANALYSIS_SNAPSHOT_PROFILE,
//           ...(referencesTruncated === undefined ? {} : { referencesTruncated }),
//         },
//       ),
//     });
//     return cache.lookup(
//       ANALYSIS_SNAPSHOT_TARGET,
//       ANALYSIS_SNAPSHOT_PROFILE,
//       "xrefs",
//       parameters,
//     );
//   };
//
//   it("are not replayed, because a replay would lose the truncation", () => {
//     expect(record(true)).toBeUndefined();
//   });
//
//   it("do not stop an execution that is complete or silent from being replayed", () => {
//     expect(record(false)?.result).toEqual(["0x2000"]);
//     expect(record(undefined)?.result).toEqual(["0x2000"]);
//   });
// });
//
// it("revises the trace_feature workflow profile so earlier results are not replayed", () => {
//   const profile = ANALYSIS_SNAPSHOT_PROFILE;
//
//   expect(workflowAnalysisProfile(profile, "trace_feature")).not.toEqual(
//     workflowAnalysisProfile(profile),
//   );
//   expect(
//     workflowAnalysisProfile(profile, "trace_call_path"),
//     "other workflows keep their profile",
//   ).toEqual(workflowAnalysisProfile(profile));
// });
export const _l = 178;
