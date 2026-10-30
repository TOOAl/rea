export const __stub = 1;
//           ...result,
//           verifier_id: alternateContract.verifier_id,
//           contract_sha256: alternateContract.contract_sha256,
//         },
//       ],
//     });
//     expect(
//       evaluateReconstructionClosure(
//         ambiguous,
//         boundary.boundary_id,
//         RECONSTRUCTION_COVERAGE_NOW,
//       ).reasons,
//     ).toEqual([
//       expect.objectContaining({
//         code: "verifier-duplicate",
//         subject_id: "claim.cli.help",
//       }),
//     ]);
//
//     const missing = createReconstructionCoverageData({
//       ...workspace,
//       verifier_results: [],
//     });
//     expect(
//       evaluateReconstructionClosure(
//         missing,
//         boundary.boundary_id,
//         RECONSTRUCTION_COVERAGE_NOW,
//       ).reasons,
//     ).toEqual([
//       expect.objectContaining({
//         code: "verifier-result-missing",
//         subject_id: "claim.cli.help",
//       }),
//     ]);
//   });
// });
//
// describe("reconstruction coverage conflicting latest verifier observations", () => {
//   it("keeps conflicting tied assessments unknown regardless of input order", () => {
//     const { workspace, result, boundary } =
//       completeReconstructionCoverageFixture();
//     const failed = {
//       ...result,
//       status: "fail" as const,
//       evidence_ids: [reconstructionCoverageEvidenceId("1")],
//     };
//     const firstPass = createReconstructionCoverageData({
//       ...workspace,
//       verifier_results: [result, failed],
//     });
//     const firstFail = createReconstructionCoverageData({
//       ...workspace,
//       verifier_results: [failed, result],
//     });
//
//     const firstPassResult = evaluateReconstructionClosure(
//       firstPass,
//       boundary.boundary_id,
//       RECONSTRUCTION_COVERAGE_NOW,
//     );
//     const firstFailResult = evaluateReconstructionClosure(
//       firstFail,
//       boundary.boundary_id,
//       RECONSTRUCTION_COVERAGE_NOW,
//     );
//     expect(firstPassResult).toEqual(firstFailResult);
//     expect(firstPassResult).toMatchObject({
//       status: "unknown",
//       reasons: [
//         expect.objectContaining({
//           code: "verifier-result-ambiguous",
//           subject_id: "claim.cli.help",
//         }),
//       ],
//     });
//     expect(firstPassResult.evidence_ids).toEqual(
//       expect.arrayContaining([
//         reconstructionCoverageEvidenceId("3"),
//         reconstructionCoverageEvidenceId("1"),
//       ]),
//     );
//   });
// });
//
// describe("reconstruction coverage equivalent latest verifier observations", () => {
//   it("coalesces equivalent equal-instant observations and retains all evidence", () => {
//     const { workspace, result, boundary } =
//       completeReconstructionCoverageFixture();
//     const first = {
//       ...result,
//       observed_at: "2026-07-16T11:00:00.123456789012345678900Z",
//     };
//     const equivalent = {
//       ...first,
//       observed_at: "2026-07-16T06:00:00.1234567890123456789-05:00",
//       covered_claim_ids: [...result.covered_claim_ids].reverse(),
//       covered_dimensions: [...result.covered_dimensions].reverse(),
//       artifact_sha256s: [...result.artifact_sha256s].reverse(),
//       owner_sha256s: [...result.owner_sha256s].reverse(),
//       evidence_ids: [reconstructionCoverageEvidenceId("1")],
//     };
//     const forward = createReconstructionCoverageData({
//       ...workspace,
//       verifier_results: [first, equivalent],
//     });
//     const reversed = createReconstructionCoverageData({
//       ...workspace,
//       verifier_results: [equivalent, first],
//     });
//     const forwardResult = evaluateReconstructionClosure(
//       forward,
//       boundary.boundary_id,
//       RECONSTRUCTION_COVERAGE_NOW,
//     );
//     const reversedResult = evaluateReconstructionClosure(
//       reversed,
//       boundary.boundary_id,
//       RECONSTRUCTION_COVERAGE_NOW,
//     );
//
//     expect(forwardResult).toEqual(reversedResult);
//     expect(forwardResult.status).toBe("ready");
//     expect(forwardResult.evidence_ids).toEqual(
//       expect.arrayContaining([
//         reconstructionCoverageEvidenceId("3"),
//         reconstructionCoverageEvidenceId("1"),
//       ]),
//     );
//   });
// });
//
// describe("reconstruction coverage verifier timestamp selection", () => {
//   it("lets a later unambiguous observation supersede an older tie", () => {
//     const { workspace, result, boundary } =
//       completeReconstructionCoverageFixture();
//     const failed = { ...result, status: "fail" as const };
export const _l = 137;
