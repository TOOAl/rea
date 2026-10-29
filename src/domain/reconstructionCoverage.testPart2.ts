export const __stub = 1;
//             ...owner.ownership,
//             owner_sha256: digest("9"),
//             path_state: "present",
//             package_state: "distributed",
//             authority_route: "detected",
//           },
//         },
//       ],
//     });
//
//     const result = evaluateReconstructionClosure(
//       changed,
//       "replacement.cli",
//       RECONSTRUCTION_COVERAGE_NOW,
//     );
//     expect(result.status).toBe("failed");
//     expect(result.reasons).toEqual(
//       expect.arrayContaining([
//         expect.objectContaining({ code: "authority-routing-detected" }),
//         expect.objectContaining({ code: "verifier-result-incompatible" }),
//       ]),
//     );
//   });
//
//   it("does not let stale verifier results satisfy current claims", () => {
//     const workspace = completeReconstructionCoverageData();
//     const semantic = workspace;
//     const stale = createReconstructionCoverageData({
//       ...semantic,
//       verifier_results: workspace.verifier_results.map((result) => ({
//         ...result,
//         observed_at: "2026-07-01T00:00:00.000Z",
//       })),
//     });
//
//     expect(
//       evaluateReconstructionClosure(
//         stale,
//         "replacement.cli",
//         RECONSTRUCTION_COVERAGE_NOW,
//       ),
//     ).toMatchObject({
//       status: "unknown",
//       reasons: [expect.objectContaining({ code: "verifier-result-stale" })],
//     });
//   });
// });
//
// describe("reconstruction coverage verifier observations", () => {
//   it("uses one contract and result for each claim covered by a shared verifier", () => {
//     const workspace = completeReconstructionCoverageData();
//     const contract = workspace.verifier_contracts[0];
//     const result = workspace.verifier_results[0];
//     const claim = workspace.claims[0];
//     const boundary = workspace.boundaries[0];
//     if (
//       contract === undefined ||
//       result === undefined ||
//       claim === undefined ||
//       boundary === undefined
//     )
//       throw new Error("Expected complete reconstruction coverage fixture");
//     const secondClaimId = "claim.cli.version";
//     const sharedContract = createReconstructionVerifierContract({
//       verifier_id: contract.verifier_id,
//       claim_ids: [...contract.claim_ids, secondClaimId],
//       dimensions: contract.dimensions,
//       authority: contract.authority,
//       max_age_ms: contract.max_age_ms,
//       minimum_repeats: contract.minimum_repeats,
//       normalization_sha256: contract.normalization_sha256,
//       normalization_removes_dimensions:
//         contract.normalization_removes_dimensions,
//     });
//     const sharedResult = {
//       ...result,
//       contract_sha256: sharedContract.contract_sha256,
//       covered_claim_ids: [...result.covered_claim_ids, secondClaimId],
//     };
//     const shared = createReconstructionCoverageData({
//       ...workspace,
//       claims: [
//         ...workspace.claims,
//         { ...claim, claim_id: secondClaimId, title: "Version output matches" },
//       ],
//       verifier_contracts: [sharedContract],
//       verifier_results: [sharedResult],
//       boundaries: [
//         {
//           ...boundary,
//           required_claim_ids: [...boundary.required_claim_ids, secondClaimId],
//         },
//       ],
//     });
//
//     expect(
//       evaluateReconstructionClosure(
//         shared,
//         boundary.boundary_id,
//         RECONSTRUCTION_COVERAGE_NOW,
//       ),
//     ).toMatchObject({
//       status: "ready",
//       summary: { required_claims: 2, reasons: 0 },
//     });
//   });
// });
//
// describe("reconstruction coverage verifier selection", () => {
//   it("keeps ambiguous verifier contracts and missing results actionable", () => {
//     const workspace = completeReconstructionCoverageData();
//     const contract = workspace.verifier_contracts[0];
//     const result = workspace.verifier_results[0];
//     const boundary = workspace.boundaries[0];
//     if (
//       contract === undefined ||
//       result === undefined ||
//       boundary === undefined
//     )
//       throw new Error("Expected complete reconstruction coverage fixture");
//     const alternateContract = createReconstructionVerifierContract({
//       verifier_id: "verify.cli.help.alternate",
//       claim_ids: contract.claim_ids,
//       dimensions: contract.dimensions,
//       authority: contract.authority,
//       max_age_ms: contract.max_age_ms,
//       minimum_repeats: contract.minimum_repeats,
//       normalization_sha256: contract.normalization_sha256,
//       normalization_removes_dimensions:
//         contract.normalization_removes_dimensions,
//     });
//     const ambiguous = createReconstructionCoverageData({
//       ...workspace,
//       verifier_contracts: [...workspace.verifier_contracts, alternateContract],
//       verifier_results: [
//         ...workspace.verifier_results,
//         {
export const _l = 137;
