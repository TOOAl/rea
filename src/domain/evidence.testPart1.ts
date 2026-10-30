export const __stub = 1;
// import { fc, it } from "@fast-check/vitest";
// import { describe, expect } from "vitest";
//
// import { createAnalysisProfile } from "./analysisProfile.js";
// import type { BinaryTarget } from "./binaryTargetTypes.js";
// import { createEvidence, evidenceSchema, parseEvidence } from "./evidence.js";
// import { MAX_JSON_DEPTH, type JsonValue } from "./jsonValue.js";
// import { createEvidenceBundle } from "./evidenceBundle.js";
// import { freezeJsonSnapshot } from "./immutableJson.js";
//
// const TARGET: BinaryTarget = {
//   path: "/tmp/fixture",
//   sha256: "a".repeat(64),
//   kind: "executable",
//   format: "mach-o",
//   architecture: "arm64",
//   availableArchitectures: ["arm64"],
// };
// const PROVIDER = { id: "fixture", name: "Fixture provider", version: "1" };
// const PROFILE = createAnalysisProfile(PROVIDER, { loader: "default" });
//
// it("rejects a detected Evidence subject with the raw-only 6502 architecture", () => {
//   const selected = {
//     path: TARGET.path,
//     sha256: TARGET.sha256,
//     format: "raw-binary" as const,
//     architecture: "6502" as const,
//   };
//   expect(
//     createEvidence(selected, PROVIDER, {
//       operation: "inspect",
//       parameters: {},
//       result: null,
//     }).subject,
//   ).toMatchObject({ format: "raw-binary", architecture: "6502" });
//   const malformed = {
//     ...selected,
//     format: "pe" as const,
//   };
//   expect(() =>
//     createEvidence(malformed, PROVIDER, {
//       operation: "inspect",
//       parameters: {},
//       result: null,
//     }),
//   ).toThrow();
// });
//
// it("preserves omitted relationship diagnostics and authenticates reported diagnostics", () => {
//   const observation = {
//     operation: "procedure_callees",
//     parameters: { procedure: "0x1000" },
//     result: ["0x2000"],
//   };
//   const historical = createEvidence(TARGET, PROVIDER, {
//     ...observation,
//     relationshipCoverage: { status: "complete" },
//   });
//   expect(historical.relationship_coverage).toEqual({ status: "complete" });
//   expect(parseEvidence(JSON.parse(JSON.stringify(historical)))).toEqual(
//     historical,
//   );
//   const diagnosed = createEvidence(TARGET, PROVIDER, {
//     ...observation,
//     relationshipCoverage: {
//       status: "complete",
//       diagnostics: ["Only resolved direct call references are observed."],
//     },
//   });
//   expect(parseEvidence(JSON.parse(JSON.stringify(diagnosed)))).toEqual(
//     diagnosed,
//   );
//   expect(diagnosed.evidence_id).not.toBe(historical.evidence_id);
//   expect(() =>
//     parseEvidence({
//       ...historical,
//       relationship_coverage: diagnosed.relationship_coverage,
//     }),
//   ).toThrow("semantic identifier");
// });
//
// it("requires explicit coverage in serialized Evidence while producers encode omission as unknown", () => {
//   const evidence = createEvidence(TARGET, PROVIDER, {
//     operation: "procedure_callees",
//     parameters: { procedure: "0x1000" },
//     result: ["0x2000"],
//   });
//
//   expect(evidence.relationship_coverage).toBeNull();
//   expect(parseEvidence(JSON.parse(JSON.stringify(evidence)))).toEqual(evidence);
//   const oldEnvelope = { ...evidence } as Record<string, unknown>;
//   delete oldEnvelope.relationship_coverage;
//   expect(evidenceSchema.safeParse(oldEnvelope).success).toBe(false);
//   expect(() => parseEvidence(oldEnvelope)).toThrow();
// });
//
// it("projects known provider fields and preserves open JSON payloads", () => {
//   const liveProvider = { ...PROVIDER, transient_status: "starting" };
//   const evidence = createEvidence(TARGET, liveProvider, {
//     operation: "inspect",
//     parameters: { caller_metadata: { note: "kept" } },
//     result: { producer_extension: { value: "kept" } },
//     analysisProfile: PROFILE,
//     environment: {
//       id: "fixture",
//       platform: "linux",
//       architecture: "x86_64",
//       isolation: "process",
//     },
//     locations: [{ kind: "address", address: "0x1000" }],
//   });
//
//   expect(evidence.provider).toEqual(PROVIDER);
//   expect(evidence.parameters).toEqual({ caller_metadata: { note: "kept" } });
//   expect(evidence.normalized_result).toEqual({
//     producer_extension: { value: "kept" },
//   });
//   expect(parseEvidence(evidence)).toEqual(evidence);
// });
//
// it("preserves identity and bytes when reusing an owned immutable result", () => {
//   const value = { nested: { values: ["observed", 1] } };
//   const mutable = createEvidence(TARGET, PROVIDER, {
//     operation: "inspect",
//     parameters: {},
//     result: value,
//   });
//   const frozen = createEvidence(TARGET, PROVIDER, {
//     operation: "inspect",
//     parameters: {},
//     result: freezeJsonSnapshot(value),
//   });
//   expect(JSON.stringify(frozen)).toBe(JSON.stringify(mutable));
//   expect(frozen.normalized_result).toBe(value);
//   expect(Object.isFrozen(frozen)).toBe(true);
//   expect(parseEvidence(frozen)).toEqual(mutable);
//   const wire: unknown = JSON.parse(JSON.stringify(frozen));
//   expect(parseEvidence(wire)).toEqual(mutable);
//   expect(() =>
//     parseEvidence({ ...frozen, normalized_result: { changed: true } }),
//   ).toThrow("semantic identifier");
// });
//
// it("applies the JSON depth boundary to owned immutable results", () => {
//   let result: JsonValue = 1;
//   for (let index = 0; index <= MAX_JSON_DEPTH; index += 1)
//     result = { nested: result };
//   const observe = () =>
//     createEvidence(TARGET, PROVIDER, {
//       operation: "inspect",
//       parameters: {},
export const _l = 151;
