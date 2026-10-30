export const __stub = 1;
//       authority: "analyst-inference",
//       evidenceLinks: [...left, ...right].map(({ evidence_id: id }) => id),
//     },
//   );
//
// const behavioralSpec = (comparison: Evidence) => ({
//   name: "CLI compatibility",
//   claims: [
//     {
//       kind: "behavioral" as const,
//       claim_id: "terminal-output",
//       title: "Terminal output remains equal",
//       comparison_evidence_id: comparison.evidence_id,
//       dimension: "terminal" as const,
//     },
//   ],
// });
//
// const artifactResult = (
//   partial = false,
//   evidenceLinks: readonly string[] = [],
// ): JsonValue => ({
//   status: partial ? "truncated" : "unchanged",
//   left_manifest_id: `agm_${"3".repeat(64)}`,
//   right_manifest_id: `agm_${"4".repeat(64)}`,
//   summary: {
//     unchanged: partial ? 0 : 1,
//     added: 0,
//     removed: 0,
//     changed: 0,
//     unknown: partial ? 1 : 0,
//   },
//   changes: partial
//     ? [
//         {
//           classification: "unknown",
//           logical_path: "unavailable",
//           dimensions: ["availability"],
//           left_occurrence_id: null,
//           right_occurrence_id: null,
//           left_artifact_id: null,
//           right_artifact_id: null,
//           evidence_links: [...evidenceLinks],
//         },
//       ]
//     : [],
//   limitations: partial ? ["Inventory evidence is incomplete."] : [],
// });
//
// const artifactComparison = (
//   left: Evidence,
//   right: Evidence,
//   partial = false,
// ): Evidence =>
//   createEvidence(
//     undefined,
//     {
//       id: "rea-artifact-comparison",
//       name: "REA artifact comparison",
//       version: "1",
//     },
//     {
//       predicateType: "rea.artifact-comparison",
//       operation: "compare_artifacts",
//       parameters: {
//         left_evidence_ids: [left.evidence_id],
//         right_evidence_ids: [right.evidence_id],
//       },
//       result: artifactResult(partial, [left.evidence_id, right.evidence_id]),
//       confidence: "derived",
//       authority: "analyst-inference",
//       evidenceLinks: [left.evidence_id, right.evidence_id],
//     },
//   );
//
// describe("reconstruction verification", () => {
//   it("accepts real process dimensions and rejects removed protocol dimensions", () => {
//     const left = source("1", "controlled-replay");
//     const right = source("2", "controlled-replay");
//     const result = {
//       status: "changed",
//       terminal: "unchanged",
//       interaction: "changed",
//       exit: "unchanged",
//       filesystem: "unchanged",
//       process: "unchanged",
//       first_divergence: {
//         status: "found",
//         dimension: "interaction",
//         index: 0,
//         left_at_ms: 0,
//         right_at_ms: 0,
//         left: "left",
//         right: "right",
//       },
//       limitations: [],
//     } satisfies JsonValue;
//     const comparison = processComparison(left, right, result);
//
//     expect(
//       verifyReconstruction(
//         {
//           name: "Interaction reconstruction",
//           claims: [
//             {
//               kind: "behavioral",
//               claim_id: "interaction",
//               title: "Interaction remains equivalent",
//               comparison_evidence_id: comparison.evidence_id,
//               dimension: "interaction",
//             },
//             {
//               kind: "behavioral",
//               claim_id: "process",
//               title: "Process behavior remains equivalent",
//               comparison_evidence_id: comparison.evidence_id,
//               dimension: "process",
//             },
//           ],
//         },
//         createEvidenceBundle([comparison, right, left]),
//       ),
//     ).toMatchObject({
//       summary: { total: 2, passed: 1, failed: 1, unknown: 0 },
//     });
//     for (const dimension of ["protocol", "shim"] as const) {
//       expect(
//         reconstructionSpecificationSchema.safeParse({
//           name: "Removed process dimension",
//           claims: [
//             {
//               kind: "behavioral",
//               claim_id: dimension,
//               title: "Unsupported dimension",
//               comparison_evidence_id: comparison.evidence_id,
//               dimension,
//             },
//           ],
//         }).success,
//       ).toBe(false);
//     }
export const _l = 141;
