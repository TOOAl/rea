export const __stub = 1;
// import { describe, expect, it } from "vitest";
// import {
//   AnalysisCapabilityUnavailableError,
//   AnalysisUnsupportedTargetError,
//   AnalysisInputError,
//   AnalysisOutputError,
//   AnalysisCancelledError,
//   AnalysisTimeoutError,
//   AnalysisResourceConstraintError,
// } from "./analysisErrorCore.js";
// import { ArtifactOperationError } from "./artifactOperationError.js";
// import { BinaryTargetError } from "./configurationErrors.js";
// import { BrowserObservationError } from "./browserObservationError.js";
// import { EvidenceFileError, EvidenceIntegrityError } from "./evidenceErrors.js";
// import {
//   HopperProcessError,
//   HopperRemoteError,
//   HopperStartError,
//   HopperTimeoutError,
// } from "./hopperErrors.js";
// import { ProviderAdapterError } from "./providerAdapterError.js";
// import { UnknownRegistryError } from "./unknownRegistryError.js";
// import { projectAnalysisError } from "./analysisErrorProjection.js";
// import { ProviderSelectionError } from "./providerSelectionError.js";
// import { analysisErrorProjectionSchema } from "../contracts/errorSchemas.js";
// import { nativeCallPartialObservationSchema } from "./native/nativeCallPartialObservation.js";
//
// describe("capability failure retry disposition", () => {
//   it.each([
//     { options: {}, retryable: false, category: "unsupported_provider" },
//     {
//       options: { retryable: false },
//       retryable: false,
//       category: "unsupported_provider",
//     },
//     { options: { retryable: true }, retryable: true, category: "unavailable" },
//   ] as const)(
//     "preserves the producer's $retryable disposition",
//     ({ options, retryable, category }) => {
//       const reason = "Native self-test failed with a sharing violation";
//       const projected = projectAnalysisError(
//         new AnalysisCapabilityUnavailableError(
//           "fixture-provider",
//           "inspect",
//           reason,
//           options,
//         ),
//       );
//       expect(projected).toMatchObject({
//         code: "capability_unavailable",
//         category,
//         retryable,
//         details: { reason },
//       });
//       if (retryable) {
//         expect(projected.message).toBe(
//           "Required runtime controls are unavailable for this attempt.",
//         );
//         expect(projected.remediation.action).toContain(
//           "retry the same analysis",
//         );
//       }
//       expect(analysisErrorProjectionSchema.safeParse(projected).success).toBe(
//         true,
//       );
//     },
//   );
//
//   it("preserves a caller-selected message for a retryable failure", () => {
//     expect(
//       projectAnalysisError(
//         new AnalysisCapabilityUnavailableError(
//           "fixture-provider",
//           "inspect",
//           "temporary failure",
//           {
//             retryable: true,
//             userMessage: "Selected runtime diagnostic",
//           },
//         ),
//       ).message,
//     ).toBe("Selected runtime diagnostic");
//   });
//
//   it("retains cleanup ownership before allowing a transient operation to retry", () => {
//     expect(
//       projectAnalysisError(
//         new AnalysisCapabilityUnavailableError(
//           "fixture-provider",
//           "inspect",
//           "temporary failure",
//           {
//             retryable: true,
//             cleanup: {
//               reason: "owned handle is still live",
//               resources: ["native-owner"],
//             },
//           },
//         ),
//       ),
//     ).toMatchObject({
//       code: "cleanup_incomplete",
//       retryable: false,
//       details: {
//         cleanup: "incomplete",
//         resources: ["native-owner"],
//         execution_failure: "capability_unavailable",
//       },
//     });
//   });
// });
//
// it("projects a published file receipt alongside retained cleanup failure", () => {
//   const projected = projectAnalysisError(
//     new EvidenceFileError("write", "io", {
//       path: "/tmp/evidence.json",
//       published: { path: "/tmp/evidence.json", bytes: 42 },
//       cleanup: {
//         reason: "staging directory is still owned",
//         resources: ["/tmp/.rea-write-abc"],
//       },
//       cause: new Error("cleanup incomplete"),
//     }),
//   );
//   expect(projected).toMatchObject({
//     code: "cleanup_incomplete",
//     message:
//       "The output file was published, but staging cleanup remains incomplete.",
//     remediation: {
//       action:
//         "Use the published file at details.published_path and resolve the reported staging cleanup failure.",
//     },
//     details: {
//       operation: "write",
//       path: "/tmp/evidence.json",
//       published: true,
//       published_path: "/tmp/evidence.json",
//       bytes: 42,
//       resources: ["/tmp/.rea-write-abc"],
//     },
//   });
//   expect(analysisErrorProjectionSchema.safeParse(projected).success).toBe(true);
// });
//
// const nativeCallPartialObservation = nativeCallPartialObservationSchema.parse({
//   kind: "native-call-observation",
//   target: {
//     path: "/tmp/selected-app",
//     sha256: "a".repeat(64),
//     architecture: "arm64",
//     arguments: [],
//     environment: {},
//     working_directory: null,
//   },
//   process: {
//     pid: 4242,
//     stdout: {
//       text: "partial stdout",
//       bytes: 13,
//       truncated: false,
//       complete: false,
//     },
//     stderr: null,
//     other_stops: [],
//   },
//   debugger: { version: null },
//   events: [],
//   coverage: { status: "partial", reason: "cancelled" },
//   limitations: ["Observation ended before the requested window completed."],
// });
//
// const retainedOutput = {
//   stdout: "selected output\u0000",
//   stderr: "upstream warning",
//   truncated: true,
// };
//
// it("distinguishes unsupported target formats from unavailable provider capabilities", () => {
//   const projected = projectAnalysisError(
//     new AnalysisUnsupportedTargetError(
//       "inspect_evm_interface",
//       "/selected/runtime.hex",
//       "EOF-style EF00 container is unsupported.",
//       { capturedOutput: retainedOutput },
//     ),
//   );
//   expect(projected).toMatchObject({
//     code: "unsupported_target",
//     category: "unsupported_target",
//     retryable: false,
//     details: {
//       operation: "inspect_evm_interface",
//       path: "/selected/runtime.hex",
//       reason: "EOF-style EF00 container is unsupported.",
//       captured_output: retainedOutput,
//     },
//   });
//   expect(projected.message).toContain("EF00");
//   expect(projected.remediation.action).toContain("target format");
//   expect(projected.remediation.action).not.toContain("doctor");
//   expect(analysisErrorProjectionSchema.safeParse(projected).success).toBe(true);
// });
//
// it.each([false, true])(
//   "marks occupied capacity retryable only while cleanup is confirmed: %s",
//   (cleanupIncomplete) => {
//     const projected = projectAnalysisError(
//       new AnalysisResourceConstraintError(
//         "inspect_sqlite_database",
//         "capacity",
//         "Inspection slots are occupied",
//         { max_concurrent_inspections: 2 },
//         cleanupIncomplete
//           ? {
//               cleanup: {
//                 reason: "Snapshot removal denied",
//                 resources: ["/private/snapshot"],
//               },
export const _l = 218;
