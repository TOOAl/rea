export const __stub = 1;
// import { describe, expect, it } from "vitest";
//
// import { createEvidence, type Evidence } from "./evidence.js";
// import { createEvidenceBundle } from "./evidenceBundle.js";
// import { reconstructionVerificationResultSchema } from "./reconstructionVerificationSchemas.js";
// import type { JsonValue } from "./jsonValue.js";
// import { EMPTY_PROCESS_CAPTURE_EXAMPLE } from "./process/processCaptureExample.js";
// import { reconstructionSpecificationSchema } from "./reconstructionVerificationSchemas.js";
// import { ARTIFACT_COMPARISON_EXAMPLE } from "../contracts/artifactComparisonExample.js";
// import { createResidualUnknown } from "./residualUnknown.js";
//
// import { verifyReconstruction } from "./reconstructionVerification.js";
// const environment = {
//   id: "fixture-linux",
//   platform: "linux",
//   architecture: "x86_64",
//   isolation: "container" as const,
// };
//
// const source = (
//   digit: string,
//   authority: "controlled-replay" | "shipped-artifact",
//   confidence: "observed" | "derived" = "observed",
//   {
//     captureResult = EMPTY_PROCESS_CAPTURE_EXAMPLE,
//     replayEnvironment = environment,
//   }: {
//     readonly captureResult?: JsonValue;
//     readonly replayEnvironment?: typeof environment | null;
//   } = {},
// ): Evidence =>
//   createEvidence(
//     {
//       path: `/tmp/source-${digit}`,
//       sha256: digit.repeat(64),
//       format: "file",
//     },
//     { id: "fixture", name: "Fixture", version: "1" },
//     {
//       predicateType:
//         authority === "controlled-replay"
//           ? "rea.process-capture"
//           : "rea.analysis",
//       operation:
//         authority === "controlled-replay"
//           ? "capture_process_scenario"
//           : "inventory_artifact",
//       parameters: {},
//       result: authority === "controlled-replay" ? captureResult : { digit },
//       confidence,
//       authority,
//       environment: authority === "controlled-replay" ? replayEnvironment : null,
//     },
//   );
//
// const legacyV3Capture = () => {
//   const {
//     selected_executable_sha256: _selectedDigest,
//     executable_identity: _executableIdentity,
//     executable_sha256,
//     ...legacyManifest
//   } = EMPTY_PROCESS_CAPTURE_EXAMPLE.manifest;
//   return {
//     ...EMPTY_PROCESS_CAPTURE_EXAMPLE,
//     manifest: { ...legacyManifest, executable_sha256 },
//   };
// };
//
// const processResult = (
//   terminal: "unchanged" | "changed" | "unknown" = "unchanged",
// ): JsonValue => ({
//   status: terminal === "changed" ? "changed" : terminal,
//   terminal,
//   interaction: "unchanged",
//   exit: "unchanged",
//   filesystem: "unchanged",
//   process: "unchanged",
//   first_divergence:
//     terminal === "changed"
//       ? {
//           status: "found",
//           dimension: "terminal",
//           index: 0,
//           left_at_ms: 0,
//           right_at_ms: 0,
//           left: "left",
//           right: "right",
//         }
//       : terminal === "unknown"
//         ? { status: "unknown", reason: "Incomplete fixture." }
//         : { status: "none" },
//   limitations: [],
// });
//
// const processComparison = (
//   left: Evidence,
//   right: Evidence,
//   result: JsonValue,
//   extraLinks: readonly string[] = [],
// ): Evidence =>
//   createEvidence(
//     undefined,
//     {
//       id: "rea-process",
//       name: "REA deterministic process harness",
//       version: "3",
//     },
//     {
//       predicateType: "rea.process-comparison",
//       operation: "compare_process_captures",
//       parameters: {
//         left_evidence_id: left.evidence_id,
//         right_evidence_id: right.evidence_id,
//       },
//       result,
//       confidence: "derived",
//       authority: "analyst-inference",
//       evidenceLinks: [left.evidence_id, right.evidence_id, ...extraLinks],
//     },
//   );
//
// const multiSourceProcessComparison = (
//   left: readonly Evidence[],
//   right: readonly Evidence[],
// ): Evidence =>
//   createEvidence(
//     undefined,
//     {
//       id: "rea-process",
//       name: "REA deterministic process harness",
//       version: "3",
//     },
//     {
//       predicateType: "rea.process-comparison",
//       operation: "compare_process_captures",
//       parameters: {
//         left_evidence_ids: left.map(({ evidence_id: id }) => id),
//         right_evidence_ids: right.map(({ evidence_id: id }) => id),
//       },
//       result: processResult(),
//       confidence: "derived",
export const _l = 141;
