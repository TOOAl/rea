export const __stub = 1;
//
// describe("function reconstruction admission controls", () => {
//   it.each([singular, plural, { ...singular, ...plural }])(
//     "requires exact source closure for %j",
//     (parameters) => {
//       expect(
//         admittedVerification(
//           comparison(parameters, { evidenceLinks: [left.evidence_id] }),
//         ),
//       ).toThrow(/closure disagrees/u);
//       expect(
//         admittedVerification(
//           comparison(parameters, {
//             evidenceLinks: [
//               left.evidence_id,
//               right.evidence_id,
//               extra.evidence_id,
//             ],
//           }),
//           [left, right, extra],
//         ),
//       ).toThrow(/closure disagrees/u);
//       expect(admittedVerification(comparison(parameters), [left])).toThrow(
//         /Missing source Evidence/u,
//       );
//     },
//   );
//
//   it.each([
//     { operation: "inventory_artifact" },
//     { predicateType: "rea.process-capture" },
//   ])("rejects source observation type %j", (observation) => {
//     const wrong = source("1", observation);
//     const evidence = comparison(
//       { ...singular, left_evidence_id: wrong.evidence_id },
//       {},
//       [wrong, right],
//     );
//     expect(admittedVerification(evidence, [wrong, right])).toThrow(
//       /unexpected observation type/u,
//     );
//   });
//
//   it.each(["procedure", "pseudocode", "assembly", "basic_blocks"])(
//     "rejects a function dossier missing %s",
//     (field) => {
//       const incomplete = jsonObjectSchema.parse(dossier);
//       delete incomplete[field];
//       const wrong = source("1", { result: incomplete });
//       const evidence = comparison(
//         { ...singular, left_evidence_id: wrong.evidence_id },
//         {},
//         [wrong, right],
//       );
//       expect(admittedVerification(evidence, [wrong, right])).toThrow();
//     },
//   );
//
//   it.each([
//     { authority: "historical-reference" as const },
//     { confidence: "inferred" as const },
//   ])("keeps insufficient source authority unknown: %j", (observation) => {
//     const weak = source("1", observation);
//     const evidence = comparison(
//       { ...singular, left_evidence_id: weak.evidence_id },
//       {},
//       [weak, right],
//     );
//     expect(verify(evidence, [weak, right]).claims.items).toMatchObject([
//       {
//         status: "unknown",
//         observed_status: "unchanged",
//         limitations: expect.arrayContaining([
//           "Source Evidence lacks qualifying shipped-artifact authority.",
//         ]),
//       },
//     ]);
//   });
//
//   it("keeps a source without artifact identity unknown", () => {
//     const unbound = source("1", {}, false);
//     const evidence = comparison(
//       { ...singular, left_evidence_id: unbound.evidence_id },
//       {},
//       [unbound, right],
//     );
//     expect(verify(evidence, [unbound, right]).claims.items).toMatchObject([
//       {
//         status: "unknown",
//         limitations: expect.arrayContaining([
//           "Structural source artifact identity is unavailable.",
//         ]),
//       },
//     ]);
//   });
//
//   it("rejects any comparison finding link outside the top-level closure", () => {
//     const evidence = comparison(singular, {
//       result: jsonValueSchema.parse({
//         ...baselineResult,
//         dimensions: baselineResult.dimensions.map((dimension) =>
//           dimension.dimension === "pseudocode"
//             ? {
//                 ...dimension,
//                 evidence_links: [left.evidence_id, extra.evidence_id],
//               }
//             : dimension,
//         ),
//       }),
//     });
//     expect(admittedVerification(evidence, [left, right, extra])).toThrow(
//       /finding cites Evidence outside its top-level closure/u,
//     );
//   });
// });
//
// describe("function reconstruction evidence integrity", () => {
//   it.each([
//     { operation: "compare_artifacts" },
//     { predicateType: "rea.artifact-comparison" },
//     { confidence: "observed" as const },
//     { authority: "shipped-artifact" as const },
//   ])("rejects changed comparison identity or authority %j", (observation) => {
//     expect(admittedVerification(comparison(singular, observation))).toThrow(
//       /identity or authority disagrees/u,
//     );
//   });
//
//   it.each([
//     { ...provider, id: "other-comparison" },
//     { ...provider, name: "Other comparison" },
//     { ...provider, version: "2" },
//   ])("rejects comparison provider %j", (identity) => {
//     expect(
//       admittedVerification(
//         comparison(singular, {}, [left, right], { provider: identity }),
//       ),
//     ).toThrow(/identity or authority disagrees/u);
//   });
//
//   it("rejects an artifact-bound comparison", () => {
//     const evidence = comparison(singular, {}, [left, right], {
//       target: {
//         path: "/fixture/comparison",
//         sha256: "4".repeat(64),
//         format: "file",
//       },
//     });
//     expect(admittedVerification(evidence)).toThrow(
//       /identity or authority disagrees/u,
//     );
//   });
//
//   it("retains active source unknowns as a gating result", () => {
//     const evidence = comparison(singular);
//     const mutation = createEvidence(undefined, provider, {
//       predicateType: "rea.residual-unknown-mutation",
//       operation: "record_unknown",
//       parameters: {},
//       result: { action: "record" },
//       confidence: "derived",
//       authority: "analyst-inference",
//       evidenceLinks: [left.evidence_id],
//     });
//     const unknown = createResidualUnknown(
//       {
//         question: "Does the source analysis cover this function?",
//         severity: "high",
//         domain: "function-comparison",
//         supporting_evidence_ids: [left.evidence_id],
//         contradicting_evidence_ids: [],
//         required_authority: "shipped-artifact",
//         required_confidence: "observed",
//         required_environment: null,
//         recommended_probes: [],
//         relationships: [],
//       },
//       mutation.evidence_id,
//       null,
//     );
//     const result = verifyReconstruction(
//       specification(evidence),
//       createEvidenceBundle([left, right, evidence, mutation], [unknown]),
//     );
//     expect(result.claims.items).toMatchObject([
//       {
//         status: "unknown",
//         observed_status: "unchanged",
//         unknown_ids: [unknown.unknown_id],
//       },
//     ]);
//   });
//
//   it("separately rejects parameter tampering without a recomputed digest", () => {
//     const evidence = comparison(singular);
//     const tampered = { ...evidence, parameters: plural };
//     expect(() =>
//       verifyReconstruction(
//         specification(evidence),
//         createEvidenceBundle([left, right, tampered]),
//       ),
//     ).toThrow(/semantic identifier does not match/u);
//   });
// });
export const _l = 204;
