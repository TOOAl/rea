export const __stub = 1;
// import { describe, expect, it } from "vitest";
//
// import type { JsonValue } from "../domain/jsonValue.js";
// import { jsonValueSchema } from "../domain/jsonValue.js";
// import { functionDossierSchema } from "../domain/hopperValues.js";
// import {
//   compactReference,
//   compactInstruction,
//   compactCallTargets,
// } from "../domain/native/nativeInstruction.fixture.js";
// import {
//   parseGhidraFunctionResult,
//   type GhidraFunctionOperation,
// } from "./GhidraFunctionValues.js";
// import {
//   ghidraFunctionClassification,
//   ghidraFunctionDossier,
//   ghidraFunctionIdentity,
//   ghidraNativeApiBoundary,
//   ghidraReferenceEdge,
// } from "../domain/ghidraValues.fixture.js";
//
// const observationOperations: ReadonlySet<GhidraFunctionOperation> = new Set([
//   "analyze_function",
//   "procedure_assembly",
//   "procedure_callees",
//   "procedure_callers",
//   "procedure_info",
//   "procedure_pseudo_code",
//   "procedure_references",
//   "read_function_instructions",
// ]);
//
// // Existing assertions focus on the value schema; this helper builds the current
// // bridge envelope and returns its normalized value for those assertions.
// const parseFunctionValueFixture = (
//   operation: GhidraFunctionOperation,
//   value: JsonValue,
// ) => {
//   const wireValue = observationOperations.has(operation)
//     ? { value, limitations: [] }
//     : value;
//   const parsed = parseGhidraFunctionResult(operation, wireValue);
//   return parsed.ok ? { ok: true as const, value: parsed.value.value } : parsed;
// };
//
// describe("Ghidra unresolved call locations", () => {
//   it("rejects a noncanonical unresolved call site rather than retaining unverifiable location evidence", () => {
//     expect(
//       parseGhidraFunctionResult("analyze_function", {
//         value: {
//           ...functionDossierSchema.parse(ghidraFunctionDossier()),
//           unresolved_calls: [
//             { address: "not-an-address", reason: "No call destination." },
//           ],
//         },
//         limitations: [],
//         relationship_coverage: {
//           status: "partial",
//           limitations: ["An unresolved call remains."],
//         },
//       }),
//     ).toMatchObject({ ok: false, error: { _tag: "AnalysisOutputError" } });
//   });
// });
//
// describe("Ghidra function-analysis result values", () => {
//   it("preserves unresolved Swift jump omissions", () => {
//     const dossier = {
//       ...functionDossierSchema.parse(ghidraFunctionDossier()),
//       swift_string_literals: [],
//       swift_string_literal_omissions: [
//         {
//           source_address: "0x401004",
//           representation: "small",
//           address: null,
//           byte_length: 5,
//           reason: "unresolved_jump",
//           registers: ["x0", "x1"],
//           words: ["0x5000000000000005", "0x0000000000000000"],
//         },
//       ],
//     };
//     expect(
//       parseGhidraFunctionResult("analyze_function", {
//         value: dossier,
//         limitations: [],
//       }),
//     ).toMatchObject({
//       ok: true,
//       value: {
//         value: {
//           swift_string_literal_omissions:
//             dossier.swift_string_literal_omissions,
//         },
//       },
//     });
//   });
//
//   it("retains unavailable pseudocode instead of treating its empty representation as observed source", () => {
//     const availability = {
//       pseudocode: {
//         available: false,
//         reason: "Ghidra does not decompile external functions.",
//       },
//       comments: { available: true },
//     };
//     const parsed = parseGhidraFunctionResult("analyze_function", {
//       value: {
//         ...functionDossierSchema.parse(ghidraFunctionDossier()),
//         pseudocode: "",
//         facet_availability: availability,
//       },
//       limitations: [],
//     });
//     expect(parsed).toMatchObject({
//       ok: true,
//       value: { value: { pseudocode: "", facet_availability: availability } },
//     });
//   });
//   it.each([
//     { status: "complete", diagnostics: ["Resolved static references only."] },
//     {
//       status: "partial",
//       limitations: ["Only the first instruction range was examined."],
//     },
//     { status: "unknown", reason: "Relationship inventory was unavailable." },
//     {
//       status: "partial",
//       limitations: ["Missing callers."],
//       limited_directions: ["callers"],
//     },
//     {
//       status: "unknown",
//       reason: "Missing callees.",
//       limited_directions: ["callees"],
//     },
//   ])("preserves observed $status relationship coverage", (coverage) => {
//     const parsed = parseGhidraFunctionResult("analyze_function", {
//       value: ghidraFunctionDossier(),
//       limitations: [],
//       relationship_coverage: coverage,
//     });
//     expect(parsed).toMatchObject({
//       ok: true,
//       value: { relationshipCoverage: coverage },
//     });
//   });
//
//   it("preserves omitted relationship coverage for legacy observations", () => {
//     const parsed = parseGhidraFunctionResult("analyze_function", {
//       value: ghidraFunctionDossier(),
//       limitations: [],
//     });
//     if (!parsed.ok) throw parsed.error;
//     expect(parsed.value).not.toHaveProperty("relationshipCoverage");
//   });
// });
//
// describe("Ghidra relationship metadata validation", () => {
//   it.each([
//     { status: "partial", limitations: [] },
//     { status: "unknown", reason: "" },
//     { status: "complete", limitations: ["Truncated."] },
//     { status: "partial", limitations: ["Truncated."], limited_directions: [] },
//     {
//       status: "partial",
//       limitations: ["Truncated."],
//       limited_directions: ["callers", "callers"],
//     },
//     { status: "unknown", reason: "Missing.", limited_directions: ["incoming"] },
//     { status: "complete", limited_directions: ["callers"] },
//   ])("rejects malformed relationship coverage %j", (coverage) => {
//     expect(
//       parseGhidraFunctionResult("analyze_function", {
//         value: ghidraFunctionDossier(),
//         limitations: [],
//         relationship_coverage: coverage,
//       }),
//     ).toMatchObject({ ok: false, error: { _tag: "AnalysisOutputError" } });
//   });
//
//   it("rejects relationship metadata on unrelated function operations", () => {
//     expect(
//       parseGhidraFunctionResult("procedure_assembly", {
//         value: "ret",
//         limitations: [],
//         relationship_coverage: { status: "complete" },
//       }),
//     ).toMatchObject({ ok: false, error: { _tag: "AnalysisOutputError" } });
//   });
//
//   it("preserves file-offset resolution in Evidence locations and rejects inexact offsets", () => {
//     const selection = {
//       file_offset: 0x210,
//       mapped_address: "0x140001010",
//       procedure_address: "0x140001010",
//     };
//     const wire = { value: "return 42;", limitations: [], selection };
//     expect(parseGhidraFunctionResult("procedure_assembly", wire)).toMatchObject(
//       { ok: false, error: { _tag: "AnalysisOutputError" } },
//     );
//     const parsed = parseGhidraFunctionResult("procedure_pseudo_code", wire);
//     if (!parsed.ok) throw parsed.error;
//     expect(parsed.value.locations).toEqual([
//       { kind: "file-offset", offset: 0x210 },
//       { kind: "address", address: "0x140001010" },
//       { kind: "address", address: "0x140001010" },
//     ]);
//     expect(
//       parseGhidraFunctionResult("procedure_pseudo_code", {
//         ...wire,
//         selection: { ...selection, file_offset: Number.MAX_SAFE_INTEGER + 1 },
//       }),
//     ).toMatchObject({ ok: false, error: { _tag: "AnalysisOutputError" } });
//   });
//   it.each([...observationOperations])(
//     "requires the function-observation limitations envelope for %s",
//     (operation) => {
//       expect(parseGhidraFunctionResult(operation, null)).toMatchObject({
//         ok: false,
//         error: { _tag: "AnalysisOutputError" },
//       });
//     },
//   );
//
//   it("preserves a named function-observation limitation", () => {
//     expect(
//       parseGhidraFunctionResult("procedure_pseudo_code", "void f() {}"),
//     ).toMatchObject({ ok: false, error: { _tag: "AnalysisOutputError" } });
//     const limitation =
//       "Ghidra marks a call to external __tls_get_addr terminal; return behavior is not independently verified.";
//     expect(
//       parseGhidraFunctionResult("procedure_pseudo_code", {
//         value: "void f() {}",
export const _l = 235;
