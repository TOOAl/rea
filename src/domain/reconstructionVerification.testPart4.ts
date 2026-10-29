export const __stub = 1;
//     expect(result.status).toBe("unknown");
//     expect(result.recommended_probes[0]?.operation).toBe("inspect_artifact");
//   });
// });
//
// describe("reconstruction verification integrity", () => {
//   it("accepts evidence closures larger than the former count ceilings", () => {
//     const evidenceIds = Array.from(
//       { length: 20_101 },
//       (_, index) => `ev_${index.toString(16).padStart(64, "0")}`,
//     );
//     const claimLinks = evidenceIds.slice(0, 202);
//     const claim = {
//       claim_id: "claim",
//       kind: "structural-artifact",
//       dimension: "overall",
//       status: "pass",
//       observed_status: "unchanged",
//       comparison_evidence_id: claimLinks[0],
//       left_evidence_ids: [claimLinks[1]],
//       right_evidence_ids: [claimLinks[2]],
//       evidence_links: claimLinks,
//       unknown_ids: [],
//       limitations: [],
//     };
//     const result = {
//       status: "pass",
//       specification_sha256: "a".repeat(64),
//       summary: {
//         total: 1,
//         passed: 1,
//         failed: 0,
//         unknown: 0,
//         behavioral: 0,
//         structural: 1,
//       },
//       claims: { items: [claim] },
//       recommended_probes: [],
//       evidence_links: evidenceIds,
//       limitations: [],
//     };
//
//     expect(reconstructionVerificationResultSchema.parse(result)).toEqual(
//       result,
//     );
//   });
//
//   it("rejects dangling or extra comparison closure", () => {
//     const left = source("1", "controlled-replay");
//     const right = source("2", "controlled-replay");
//     const extra = source("3", "controlled-replay");
//     const comparison = processComparison(left, right, processResult(), [
//       extra.evidence_id,
//     ]);
//     expect(() =>
//       verifyReconstruction(
//         behavioralSpec(comparison),
//         createEvidenceBundle([left, right, extra, comparison]),
//       ),
//     ).toThrow(/closure disagrees/u);
//   });
//
//   it("returns every claim deterministically and gives specification a stable digest", () => {
//     const left = source("1", "controlled-replay");
//     const right = source("2", "controlled-replay");
//     const comparison = processComparison(left, right, processResult());
//     const claims = [
//       {
//         kind: "behavioral" as const,
//         claim_id: "z-exit",
//         title: "Exit remains equal",
//         comparison_evidence_id: comparison.evidence_id,
//         dimension: "exit" as const,
//       },
//       behavioralSpec(comparison).claims[0],
//     ];
//     const bundle = createEvidenceBundle([right, comparison, left]);
//     const first = verifyReconstruction(
//       { name: "Compatibility", claims },
//       bundle,
//     );
//     const repeated = verifyReconstruction(
//       {
//         name: "Compatibility",
//         claims: [...claims].reverse(),
//       },
//       bundle,
//     );
//     expect(first).toEqual(repeated);
//     expect(first.claims.items.map(({ claim_id }) => claim_id)).toEqual([
//       "terminal-output",
//       "z-exit",
//     ]);
//   });
//
//   it("returns all active unknowns while keeping them gating", () => {
//     const left = source("1", "controlled-replay");
//     const right = source("2", "controlled-replay");
//     const comparison = processComparison(left, right, processResult());
//     const mutations = Array.from({ length: 101 }, (_, index) =>
//       createEvidence(
//         undefined,
//         { id: "fixture", name: "Fixture", version: "1" },
//         {
//           predicateType: "rea.residual-unknown-mutation",
//           operation: "record_unknown",
//           parameters: { index },
//           result: { action: "record" },
//           confidence: "derived",
//           authority: "analyst-inference",
//           evidenceLinks: [comparison.evidence_id],
//         },
//       ),
//     );
//     const unknowns = mutations.map((mutation, index) =>
//       createResidualUnknown(
//         {
//           question: `Unresolved replay ${index}`,
//           severity: "high",
//           domain: "reconstruction-verification",
//           supporting_evidence_ids: [comparison.evidence_id],
//           contradicting_evidence_ids: [],
//           required_authority: "controlled-replay",
//           required_confidence: "observed",
//           required_environment: null,
//           recommended_probes: [],
//           relationships: [],
//         },
//         mutation.evidence_id,
//         null,
//       ),
//     );
//     const result = verifyReconstruction(
//       behavioralSpec(comparison),
//       createEvidenceBundle([left, right, comparison, ...mutations], unknowns),
//     );
//     expect(result.status).toBe("unknown");
//     expect(result.claims.items[0]?.unknown_ids).toHaveLength(101);
//   });
// });
export const _l = 140;
