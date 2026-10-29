export const __stub = 1;
// import { describe, expect, it } from "vitest";
//
// import {
//   createEvidence,
//   parseEvidence,
//   type Evidence,
//   type EvidenceObservation,
//   type EvidenceProvider,
//   type EvidenceSubjectTarget,
// } from "./evidence.js";
// import { createEvidenceBundle, parseEvidenceBundle } from "./evidenceBundle.js";
// import { functionDossierSchema } from "./hopperValues.js";
// import {
//   jsonObjectSchema,
//   jsonValueSchema,
//   type JsonValue,
// } from "./jsonValue.js";
// import { createResidualUnknown } from "./residualUnknown.js";
//
// import { compareFunctions } from "./functionComparison.js";
// import { verifyReconstruction } from "./reconstructionVerification.js";
// const dossier = jsonValueSchema.parse(
//   functionDossierSchema.parse({
//     procedure: {
//       address: "0x1000",
//       name: "main",
//       classification: null,
//       body: {
//         available: false,
//         reason:
//           "Hopper's public Python API does not expose complete function body ranges",
//       },
//       signature: "int main(void)",
//       locals: [],
//     },
//     pseudocode: "return 0;",
//     assembly: [],
//     comments: [],
//     callers: [],
//     callees: [],
//     incoming_references: [],
//     outgoing_references: [],
//     referenced_strings: [],
//     referenced_names: [],
//     native_api: null,
//     native_value_flow: null,
//     facet_availability: {
//       pseudocode: { available: true },
//       assembly: { available: true },
//       comments: { available: true },
//       callers: { available: true },
//       callees: { available: true },
//       references: { available: true },
//       strings_names: { available: true },
//       cfg: { available: true },
//     },
//     basic_blocks: [{ start: "0x1000", end: "0x1001", successors: [] }],
//     limitations: [],
//   }),
// );
//
// const source = (
//   digit: string,
//   observation: Partial<EvidenceObservation> = {},
//   hasSubject = true,
//   hasCoverage = true,
// ): Evidence =>
//   createEvidence(
//     hasSubject
//       ? {
//           path: `/fixture/function-${digit}`,
//           sha256: digit.repeat(64),
//           format: "file",
//         }
//       : undefined,
//     { id: "fixture", name: "Fixture function analysis", version: "1" },
//     {
//       operation: "analyze_function",
//       parameters: { procedure: "main" },
//       result: dossier,
//       confidence: "derived",
//       authority: "shipped-artifact",
//       ...(hasCoverage
//         ? { relationshipCoverage: { status: "complete" as const } }
//         : {}),
//       ...observation,
//     },
//   );
//
// const left = source("1");
// const right = source("2");
// const extra = source("3");
// const singular = {
//   left_evidence_id: left.evidence_id,
//   right_evidence_id: right.evidence_id,
// };
// const plural = {
//   left_evidence_ids: [left.evidence_id],
//   right_evidence_ids: [right.evidence_id],
// };
// const provider = {
//   id: "rea-function-comparison",
//   name: "REA function comparison",
//   version: "1",
// };
// const baselineResult = compareFunctions(left, right);
//
// const comparison = (
//   parameters: Record<string, JsonValue>,
//   observation: Partial<EvidenceObservation> = {},
//   sources: readonly Evidence[] = [left, right],
//   identity: {
//     provider?: EvidenceProvider;
//     target?: EvidenceSubjectTarget;
//   } = {},
//   resultInput = baselineResult,
// ): Evidence =>
//   createEvidence(identity.target, identity.provider ?? provider, {
//     predicateType: "rea.function-comparison",
//     operation: "compare_functions",
//     parameters,
//     result: jsonValueSchema.parse({
//       ...resultInput,
//       dimensions: resultInput.dimensions.map((dimension) => ({
//         ...dimension,
//         evidence_links: sources.map(({ evidence_id: id }) => id),
//       })),
//     }),
//     confidence: "derived",
//     authority: "analyst-inference",
//     evidenceLinks: sources.map(({ evidence_id: id }) => id),
//     ...observation,
//   });
//
// const specification = (evidence: Evidence, dimension = "pseudocode") => ({
//   name: "Function reconstruction",
//   claims: [
//     {
//       kind: "structural-function",
//       claim_id: "function",
//       title: "Function agrees",
//       comparison_evidence_id: evidence.evidence_id,
//       dimension,
//     },
//   ],
// });
//
// const admittedVerification = (
//   evidence: Evidence,
//   sources: readonly Evidence[] = [left, right],
//   dimension = "pseudocode",
// ) => {
//   // Admission controls use newly hashed Evidence and a valid bundle, not a stale digest.
//   expect(parseEvidence(evidence)).toEqual(evidence);
//   const bundle = createEvidenceBundle([...sources, evidence]);
//   expect(parseEvidenceBundle(bundle)).toEqual(bundle);
//   return () => verifyReconstruction(specification(evidence, dimension), bundle);
// };
//
// const verify = (
//   evidence: Evidence,
//   sources: readonly Evidence[] = [left, right],
// ) => admittedVerification(evidence, sources)();
//
// describe("function reconstruction source parameters", () => {
//   it.each([
//     ["singular", singular],
//     ["plural", plural],
//     ["coherent aliases", { ...singular, ...plural }],
//   ])(
//     "accepts %s and preserves exact sides and unrelated metadata",
//     (_name, parameters) => {
//       const evidence = comparison({
//         ...parameters,
//         context: { label: "retained", revision: 7 },
//       });
//       const before = JSON.stringify(evidence);
//       const result = verify(evidence);
//       expect(result.status).toBe("pass");
//       expect(result.claims.items).toMatchObject([
//         {
//           observed_status: "unchanged",
//           left_evidence_ids: [left.evidence_id],
//           right_evidence_ids: [right.evidence_id],
//         },
//       ]);
//       expect(JSON.stringify(evidence)).toBe(before);
//     },
//   );
//
//   it("preserves plural-only multi-ID sides and their ordering", () => {
//     const fourth = source("4");
//     const evidence = comparison(
//       {
//         left_evidence_ids: [extra.evidence_id, left.evidence_id],
//         right_evidence_ids: [fourth.evidence_id, right.evidence_id],
//       },
//       {},
//       [left, right, extra, fourth],
//     );
//     expect(
//       verify(evidence, [left, right, extra, fourth]).claims.items,
//     ).toMatchObject([
//       {
//         status: "pass",
//         left_evidence_ids: [extra.evidence_id, left.evidence_id],
export const _l = 206;
