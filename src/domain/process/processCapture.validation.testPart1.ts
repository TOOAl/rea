export const __stub = 1;
// import { expect, it } from "vitest";
//
// import { digestProcessCommitment } from "./processScenario.js";
// import { parseProcessCapture } from "./processCaptureParsing.js";
// import { partialProcessCaptureObservationSchema } from "./processCapture.js";
// import { FINALIZED_PROCESS_CAPTURE_EXAMPLE } from "./processCaptureExample.js";
// import { finalizationConsistencyIssue } from "./processCaptureValidation.js";
// import {
//   compareUnverifiedProcessCaptures as compareProcessCaptures,
//   emptyUnverifiedProcessCapture as emptyCapture,
//   processCaptureIssues,
// } from "./processCapture.fixture.js";
//
// it("never considers truncated captures equivalent", () => {
//   const complete = emptyCapture();
//   const capture = {
//     ...complete,
//     truncated: true,
//     truncation_details: {
//       ...complete.truncation_details,
//       raw_terminal: {
//         ...complete.truncation_details.raw_terminal,
//         observed_bytes: 1,
//         observed_frames: 1,
//       },
//     },
//   };
//   expect(compareProcessCaptures(capture, capture).status).toBe("unknown");
// });
//
// it("rejects altered v4 commitments and accepts canonical key reordering", () => {
//   const capture = emptyCapture();
//   expect(parseProcessCapture(capture)).toEqual(capture);
//   expect(digestProcessCommitment({ second: 2, first: 1 })).toBe(
//     digestProcessCommitment({ first: 1, second: 2 }),
//   );
//   expect(() =>
//     parseProcessCapture({
//       ...capture,
//       manifest: {
//         ...capture.manifest,
//         normalization_sha256: "f".repeat(64),
//       },
//     }),
//   ).toThrow("normalization_sha256");
//   expect(() =>
//     parseProcessCapture({
//       ...capture,
//       manifest: {
//         ...capture.manifest,
//         executable_sha256: "f".repeat(64),
//       },
//     }),
//   ).toThrow("executable_identity");
// });
//
// it("requires producer coverage accounting in every parsed capture", () => {
//   const capture = emptyCapture();
//   const { truncation_details: _details, ...missingCoverage } = capture;
//   expect(() => parseProcessCapture(missingCoverage)).toThrow(
//     "truncation_details",
//   );
// });
//
// it("does not infer normalized retention budget from missing scenario defaults", () => {
//   const capture = emptyCapture();
//   const scenario = {
//     ...capture.manifest.scenario,
//     limits: {
//       files: 10_000,
//       file_bytes: 10_000_000,
//       processes: 1_000,
//       filesystem_depth: 16,
//     },
//   };
//   expect(() =>
//     parseProcessCapture({
//       ...capture,
//       manifest: {
//         ...capture.manifest,
//         scenario,
//         full_scenario_sha256: digestProcessCommitment(scenario),
//       },
//       truncation_details: {
//         ...capture.truncation_details,
//         normalized_terminal: {
//           budget_bytes: 1_000_000,
//           retained_bytes: 0,
//           omitted_frames: 0,
//         },
//       },
//     }),
//   ).toThrow("manifest.scenario.limits.output_bytes");
// });
//
// it("rejects settlement and cleanup combinations that cannot occur", () => {
//   const capture = emptyCapture();
//   expect(() =>
//     parseProcessCapture({
//       ...capture,
//       settlement: {
//         state: "quiesced",
//         elapsed_ms: 0,
//         cleanup_outcome: "cleaned",
//       },
//     }),
//   ).toThrow("cleanup_outcome");
//   expect(() =>
//     parseProcessCapture({
//       ...capture,
//       settlement: {
//         state: "alive_at_deadline",
//         elapsed_ms: 1,
//         cleanup_outcome: "not_required",
//       },
//     }),
//   ).toThrow("cleanup_outcome");
// });
//
// it("rejects finalization evidence that no deadline could have produced", () => {
//   const capture = emptyCapture();
//   const finalization = {
//     requested_ms: 500,
//     exit_code: null,
//     signals: [
//       {
//         signal: "SIGTERM" as const,
//         sent_at_ms: 0,
//         delivery: "signaled" as const,
//       },
//     ],
//     elapsed_ms: 10,
//   };
//   expect(
//     () =>
//       parseProcessCapture({
//         ...capture,
//         exit: { code: 0, signal: null, reason: "exited", finalization },
//       }),
//     "an exit without a deadline cannot carry a finalization record",
//   ).toThrow("finalization");
// });
//
// it("rejects a finalization reason on a verified delivery", () => {
//   const finalization = {
//     requested_ms: 500,
//     exit_code: null,
//     elapsed_ms: 10,
//     signals: [
//       {
//         signal: "SIGTERM" as const,
//         sent_at_ms: 0,
//         delivery: "signaled" as const,
//         reason: "should not be retained",
//       },
//     ],
//   };
//
//   expect(
//     () =>
//       parseProcessCapture({
//         ...withCommittedFinalization(500, {
//           code: null,
//           signal: null,
//           reason: "timeout",
//           finalization,
//         }),
//       }),
//     "a finalization reason is reserved for unverified delivery",
//   ).toThrow("finalization");
// });
//
// const withCommittedFinalization = (
//   committed: number | undefined,
//   exit: Record<string, unknown>,
//   comparisonCommitted: number | "same" | "absent" = "same",
// ) => {
//   const capture = emptyCapture();
//   const scenario = {
//     ...capture.manifest.scenario,
//     ...(committed === undefined ? {} : { finalization_ms: committed }),
//   };
//   const comparisonContract = {
//     ...capture.manifest.comparison_contract,
//     ...(comparisonCommitted === "absent"
//       ? {}
//       : comparisonCommitted === "same"
//         ? committed === undefined
//           ? {}
//           : { finalization_ms: committed }
//         : { finalization_ms: comparisonCommitted }),
//   };
//   return {
//     ...capture,
//     manifest: {
//       ...capture.manifest,
//       scenario,
//       comparison_contract: comparisonContract,
//       full_scenario_sha256: digestProcessCommitment(scenario),
//       comparison_contract_sha256: digestProcessCommitment(comparisonContract),
//     },
//     exit,
//   };
// };
//
// it("binds finalization evidence to the committed finalization interval", () => {
//   const finalization = {
//     requested_ms: 500,
//     exit_code: null,
//     signals: [
//       {
//         signal: "SIGTERM" as const,
//         sent_at_ms: 0,
//         delivery: "signaled" as const,
//       },
//     ],
//     elapsed_ms: 10,
//   };
//   const exit = { code: null, signal: null, reason: "timeout", finalization };
//
//   expect(
//     parseProcessCapture(withCommittedFinalization(500, exit)).exit,
//     "a record matching the committed interval is accepted",
//   ).toMatchObject({ finalization });
//   expect(
export const _l = 225;
