export const __stub = 1;
//   });
//
//   it("passes a complete authoritative claim with two-sided citations", () => {
//     const left = source("1", "controlled-replay");
//     const right = source("2", "controlled-replay");
//     const comparison = processComparison(left, right, processResult());
//     const result = verifyReconstruction(
//       behavioralSpec(comparison),
//       createEvidenceBundle([comparison, right, left]),
//     );
//     expect(reconstructionVerificationResultSchema.parse(result)).toMatchObject({
//       status: "pass",
//       summary: { total: 1, passed: 1, failed: 0, unknown: 0 },
//       claims: { items: expect.any(Array) },
//     });
//     expect(
//       reconstructionVerificationResultSchema.safeParse({
//         ...result,
//         summary: { ...result.summary, passed: 0 },
//       }).success,
//     ).toBe(false);
//     expect(
//       reconstructionVerificationResultSchema.safeParse({
//         ...result,
//         status: "unknown",
//       }).success,
//     ).toBe(false);
//     expect(result.claims.items[0]?.evidence_links).toEqual(
//       expect.arrayContaining([
//         comparison.evidence_id,
//         left.evidence_id,
//         right.evidence_id,
//       ]),
//     );
//   });
// });
//
// describe("reconstruction process capture input", () => {
//   it("rejects saved captures without explicit executable identity", () => {
//     const left = source("1", "controlled-replay", "observed", {
//       captureResult: legacyV3Capture(),
//     });
//     const right = source("2", "controlled-replay");
//     const comparison = processComparison(left, right, processResult());
//     expect(() =>
//       verifyReconstruction(
//         behavioralSpec(comparison),
//         createEvidenceBundle([comparison, left, right]),
//       ),
//     ).toThrow();
//   });
// });
//
// describe("reconstruction verification outcomes", () => {
//   it("requires every selected behavioral source to share a replay environment", () => {
//     const replay = (digit: string, id: string | null) =>
//       source(digit, "controlled-replay", "observed", {
//         replayEnvironment: id === null ? null : { ...environment, id },
//       });
//     const verify = (left: readonly Evidence[], right: readonly Evidence[]) => {
//       const comparison = multiSourceProcessComparison(left, right);
//       return verifyReconstruction(
//         behavioralSpec(comparison),
//         createEvidenceBundle([...left, ...right, comparison]),
//       );
//     };
//     const limitation =
//       "Controlled replay environments are unavailable or incompatible.";
//     const differentOnLeft = verify(
//       [replay("1", "env-a"), replay("2", "env-b")],
//       [replay("3", "env-a"), replay("4", "env-a")],
//     );
//     expect(differentOnLeft.status).toBe("unknown");
//     expect(differentOnLeft.claims.items[0]?.limitations).toContain(limitation);
//
//     const differentOnRight = verify(
//       [replay("5", "env-a"), replay("6", "env-a")],
//       [replay("7", "env-a"), replay("8", "env-b")],
//     );
//     expect(differentOnRight.status).toBe("unknown");
//     expect(differentOnRight.claims.items[0]?.limitations).toContain(limitation);
//
//     const unavailable = verify(
//       [replay("9", "env-a"), replay("a", "env-a")],
//       [replay("b", "env-a"), replay("c", null)],
//     );
//     expect(unavailable.status).toBe("unknown");
//     expect(unavailable.claims.items[0]?.limitations).toContain(limitation);
//
//     expect(
//       verify(
//         [replay("d", "env-a"), replay("e", "env-a")],
//         [replay("f", "env-a"), replay("0", "env-a")],
//       ).status,
//     ).toBe("pass");
//   });
//
//   it("fails an authoritative observed disagreement", () => {
//     const left = source("1", "controlled-replay");
//     const right = source("2", "controlled-replay");
//     const comparison = processComparison(left, right, processResult("changed"));
//     const result = verifyReconstruction(
//       behavioralSpec(comparison),
//       createEvidenceBundle([left, right, comparison]),
//     );
//     expect(result).toMatchObject({
//       status: "fail",
//       summary: { failed: 1 },
//       claims: { items: [{ status: "fail", observed_status: "changed" }] },
//     });
//   });
//
//   it("keeps insufficient authority and partial structural evidence unknown", () => {
//     const weakLeft = source("1", "controlled-replay", "derived");
//     const replayRight = source("2", "controlled-replay");
//     const runtime = processComparison(weakLeft, replayRight, processResult());
//     expect(
//       verifyReconstruction(
//         behavioralSpec(runtime),
//         createEvidenceBundle([weakLeft, replayRight, runtime]),
//       ).status,
//     ).toBe("unknown");
//
//     const left = ARTIFACT_COMPARISON_EXAMPLE.left;
//     const right = ARTIFACT_COMPARISON_EXAMPLE.right;
//     const comparison = artifactComparison(left, right, true);
//     const result = verifyReconstruction(
//       {
//         name: "Artifact structure",
//         claims: [
//           {
//             kind: "structural-artifact",
//             claim_id: "artifact-graph",
//             title: "Artifact graph remains equal",
//             comparison_evidence_id: comparison.evidence_id,
//             dimension: "overall",
//           },
//         ],
//       },
//       createEvidenceBundle([left, comparison, right]),
//     );
export const _l = 141;
