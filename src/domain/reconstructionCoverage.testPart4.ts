export const __stub = 1;
//     const latestPass = {
//       ...result,
//       observed_at: "2026-07-16T11:30:00.000Z",
//     };
//     const changed = createReconstructionCoverageData({
//       ...workspace,
//       verifier_results: [result, failed, latestPass],
//     });
//
//     expect(
//       evaluateReconstructionClosure(
//         changed,
//         boundary.boundary_id,
//         RECONSTRUCTION_COVERAGE_NOW,
//       ),
//     ).toMatchObject({ status: "ready", reasons: [] });
//   });
//
//   /** Evaluate a workspace whose newest verifier observation fails the closure. */
//   const expectNewestObservationFails = (passedAt: string, failedAt: string) => {
//     const { workspace, result } = completeReconstructionCoverageFixture();
//     const changed = createReconstructionCoverageData({
//       ...workspace,
//       verifier_results: [
//         { ...result, observed_at: passedAt },
//         { ...result, observed_at: failedAt, status: "fail" },
//       ],
//     });
//
//     expect(
//       evaluateReconstructionClosure(
//         changed,
//         "replacement.cli",
//         RECONSTRUCTION_COVERAGE_NOW,
//       ),
//     ).toMatchObject({
//       status: "failed",
//       reasons: [expect.objectContaining({ code: "verifier-failed" })],
//     });
//   };
//
//   it("orders offset-bearing verifier timestamps chronologically", () => {
//     expectNewestObservationFails(
//       "2026-07-16T08:00:00.000Z",
//       "2026-07-16T04:00:00.000-05:00",
//     );
//   });
//
//   it("selects the later result when timestamps differ below millisecond precision", () => {
//     expectNewestObservationFails(
//       "2026-07-16T11:00:00.1231Z",
//       "2026-07-16T11:00:00.1239Z",
//     );
//   });
// });
//
// describe("reconstruction coverage verifier future timestamps", () => {
//   it("treats an observation beyond millisecond-precision now as future", () => {
//     const { workspace, result } = completeReconstructionCoverageFixture();
//     const changed = createReconstructionCoverageData({
//       ...workspace,
//       verifier_results: [
//         { ...result, observed_at: "2026-07-16T12:00:00.1239Z" },
//       ],
//     });
//
//     expect(
//       evaluateReconstructionClosure(
//         changed,
//         "replacement.cli",
//         Date.parse("2026-07-16T12:00:00.123Z") + 0.5,
//       ),
//     ).toMatchObject({
//       status: "unknown",
//       reasons: [expect.objectContaining({ code: "verifier-result-stale" })],
//     });
//   });
//
//   it("rejects a non-finite evaluation clock", () => {
//     const workspace = completeReconstructionCoverageData();
//     expect(() =>
//       evaluateReconstructionClosure(workspace, "replacement.cli", Number.NaN),
//     ).toThrow("Expected finite epoch milliseconds.");
//   });
//
//   it("rejects verifier observations from the future", () => {
//     const { workspace, result } = completeReconstructionCoverageFixture();
//     const semantic = workspace;
//     const changed = createReconstructionCoverageData({
//       ...semantic,
//       verifier_results: [
//         { ...result, observed_at: "2026-07-17T12:00:00.000Z" },
//       ],
//     });
//
//     expect(
//       evaluateReconstructionClosure(
//         changed,
//         "replacement.cli",
//         RECONSTRUCTION_COVERAGE_NOW,
//       ),
//     ).toMatchObject({
//       status: "unknown",
//       reasons: [expect.objectContaining({ code: "verifier-result-stale" })],
//     });
//   });
//
//   it("rejects green results and package proofs that omit current commitments", () => {
//     const workspace = completeReconstructionCoverageData();
//     const semantic = workspace;
//     const incomplete = createReconstructionCoverageData({
//       ...semantic,
//       verifier_results: workspace.verifier_results.map((result) => ({
//         ...result,
//         owner_sha256s: [],
//       })),
//       package_proofs: workspace.package_proofs.map((proof) => ({
//         ...proof,
//         artifact_sha256s: [digest("8")],
//       })),
//     });
//
//     const result = evaluateReconstructionClosure(
//       incomplete,
//       "replacement.cli",
//       RECONSTRUCTION_COVERAGE_NOW,
//     );
//     expect(result.status).toBe("unknown");
//     expect(result.reasons).toEqual(
//       expect.arrayContaining([
//         expect.objectContaining({ code: "verifier-result-incompatible" }),
//         expect.objectContaining({ code: "package-proof-unknown" }),
//       ]),
//     );
//   });
// });
export const _l = 136;
