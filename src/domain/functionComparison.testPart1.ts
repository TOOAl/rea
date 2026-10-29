export const __stub = 1;
// import { describe, expect, it } from "vitest";
//
// import { FUNCTION_COMPARISON_EXAMPLE } from "../contracts/functionComparisonExample.js";
// import { enhancedInputSchemas } from "../contracts/enhancedInputs.js";
// import { functionComparisonResultSchema } from "./functionComparisonSchemas.js";
// import { createEvidence, type Evidence } from "./evidence.js";
// import { functionDossierSchema } from "./hopperValues.js";
// import { canonicalJson } from "./comparisonSemantics.js";
// import { digestCanonicalValue } from "./canonicalDigest.js";
// import { compareUnicodeCodePoints } from "./unicodeCodePointOrder.js";
// import { jsonValueSchema } from "./jsonValue.js";
//
// import { compareFunctions } from "./functionComparison.js";
// import type { RelationshipCoverage } from "./relationshipCoverage.js";
// const procedure = (address: string, name: string) => ({
//   address,
//   name,
//   classification: null,
//   body: {
//     available: false as const,
//     reason:
//       "Hopper's public Python API does not expose complete function body ranges",
//   },
// });
// const dossier = (
//   text: string,
//   base: "0x1000" | "0x2000",
//   successors: readonly string[] = [],
// ) =>
//   functionDossierSchema.parse({
//     procedure: {
//       ...procedure(base, "main"),
//       signature: "int main(void)",
//       locals: [],
//     },
//     pseudocode: text,
//     assembly: ["ret"],
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
//     basic_blocks: [
//       {
//         start: base,
//         end: base === "0x1000" ? "0x1001" : "0x2001",
//         successors,
//       },
//     ],
//     limitations: [],
//   });
//
// const dossierWithReference = (
//   base: "0x1000" | "0x2000",
//   kind: "call" | "data" | "unavailable",
// ) => {
//   const target = base === "0x1000" ? "0x1010" : "0x2010";
//   return functionDossierSchema.parse({
//     ...dossier("return helper();", base),
//     outgoing_references: [
//       {
//         source_address: base,
//         target_address: target,
//         source_procedure: procedure(base, "main"),
//         target_procedure: procedure(target, "helper"),
//         kind:
//           kind === "unavailable"
//             ? { available: false, reason: "provider has no kind authority" }
//             : {
//                 available: true,
//                 provenance: "ghidra-reference-manager",
//                 type: kind === "call" ? "UNCONDITIONAL_CALL" : "READ",
//                 flow: kind === "call",
//                 call: kind === "call",
//                 jump: false,
//                 data: kind === "data",
//                 read: kind === "data",
//                 write: false,
//                 indirect: false,
//                 computed: false,
//                 conditional: false,
//                 terminal: false,
//                 primary: true,
//                 operand_index: 0,
//                 external: false,
//               },
//       },
//     ],
//   });
// };
//
// const observe = (
//   digit: string,
//   value: ReturnType<typeof dossier>,
//   providerId = "rea-workflow",
//   relationshipCoverage: RelationshipCoverage | null = { status: "complete" },
// ): Evidence =>
//   createEvidence(
//     {
//       path: `/tmp/function-${digit}`,
//       sha256: digit.repeat(64),
//       format: "mach-o",
//     },
//     { id: providerId, name: providerId, version: "1" },
//     {
//       operation: "analyze_function",
//       parameters: enhancedInputSchemas.analyze_function.parse({
//         procedure: "main",
//       }),
//       result: jsonValueSchema.parse(value),
//       confidence: "derived",
//       authority: "shipped-artifact",
//       ...(relationshipCoverage === null ? {} : { relationshipCoverage }),
//     },
//   );
//
// const rejectsMalformedFacetAvailability = (): void => {
//   expect(
//     functionDossierSchema.safeParse({
//       ...dossier("return 0;", "0x1000"),
//       facet_availability: { cfg: { available: false, reason: "" } },
//     }).success,
//   ).toBe(false);
//   expect(
//     functionDossierSchema.safeParse({
//       ...dossier("return 0;", "0x1000"),
//       facet_availability: { cfg: undefined },
//     }).success,
//   ).toBe(false);
// };
//
// const keepsGeneratedNamesAmbiguous = (): void => {
//   const named = (base: "0x1000" | "0x2000", name: string) =>
//     functionDossierSchema.parse({
//       ...dossier("return 0;", base),
//       procedure: {
//         ...procedure(base, name),
//         signature: "int helper(void)",
//         locals: [],
//       },
//     });
//   const generated = compareFunctions(
//     observe("1", named("0x1000", "sub_1000")),
//     observe("2", named("0x2000", "sub_2000")),
//   );
//   expect(generated.function_match.status).toBe("ambiguous");
//   expect(generated.status).toBe("unknown");
//   expect(
//     generated.dimensions.find(({ dimension }) => dimension === "identity"),
//   ).toMatchObject({ status: "unknown" });
//
//   const stable = compareFunctions(
//     observe("3", named("0x1000", "firstFunction")),
//     observe("4", named("0x2000", "secondFunction")),
//   );
//   expect(stable.function_match.status).toBe("mismatched");
//   expect(stable.status).toBe("changed");
// };
//
// describe("function comparison normalized identity", () => {
//   it("retains unresolved call details alongside missing facet coverage", () => {
//     const value: Record<string, unknown> = {
//       ...dossier("return 0;", "0x1000"),
//       unresolved_calls: [
//         { address: "0x1010", reason: "Unknown indirect target" },
//       ],
//     };
//     delete value.facet_availability;
//     const legacy = observe("a", functionDossierSchema.parse(value), "ida");
//     const calls = compareFunctions(legacy, legacy).dimensions.find(
//       ({ dimension }) => dimension === "calls",
//     );
//     expect(calls).toMatchObject({
//       status: "unknown",
//       limitations: expect.arrayContaining([
//         "Left: Unresolved call at 0x1010: Unknown indirect target",
//         "Left: callers: Provider did not declare coverage for this empty facet.",
//       ]),
//     });
//   });
//   it("keeps empty legacy facets without coverage declarations unknown", () => {
//     const value: Record<string, unknown> = {
//       ...dossier("return 0;", "0x1000"),
//       basic_blocks: [],
//     };
//     delete value.facet_availability;
//     const legacy = observe("a", functionDossierSchema.parse(value), "ida");
//     const result = compareFunctions(legacy, legacy);
//     for (const dimension of [
//       "comments",
//       "references",
//       "strings_names",
//       "cfg",
//       "calls",
//     ]) {
//       expect(
//         result.dimensions.find((item) => item.dimension === dimension),
//       ).toMatchObject({ status: "unknown" });
//     }
//   });
//   it("keeps unavailable facets unknown even when one side supplies values", () => {
//     const left = observe(
//       "a",
//       functionDossierSchema.parse({
//         ...dossier("return 0;", "0x1000"),
//         facet_availability: {
//           comments: { available: false, reason: "Not collected" },
//         },
//         comments: [
//           { address: "0x1000", kind: "comment", text: "partial record" },
//         ],
//       }),
//     );
//     const right = observe("b", dossier("return 0;", "0x2000"));
//     expect(
//       compareFunctions(left, right).dimensions.find(
//         ({ dimension }) => dimension === "comments",
//       ),
//     ).toMatchObject({ status: "unknown", left_count: null, right_count: null });
//   });
//   it(
//     "rejects malformed facet availability instead of treating it as absence",
//     rejectsMalformedFacetAvailability,
//   );
//   it(
//     "keeps differing generated names ambiguous and stable names mismatched",
//     keepsGeneratedNamesAmbiguous,
//   );
//
//   it.each(["sub_deallocate", "sub_deadbeef_handler", "fcn.dispatch"])(
//     "recognizes the explicit symbol %s without a generated-name prefix false positive",
//     (name) => {
//       const named = (base: "0x1000" | "0x2000") =>
//         functionDossierSchema.parse({
//           ...dossier("return 0;", base),
//           procedure: {
//             ...procedure(base, name),
//             name,
//             signature: "int helper(void)",
//             locals: [],
//           },
//         });
//       const result = compareFunctions(
//         observe("b", named("0x1000")),
//         observe("c", named("0x2000")),
//       );
//       expect(result.function_match).toMatchObject({
//         status: "matched",
//         method: "symbol",
//       });
//       expect(
//         result.dimensions.find(({ dimension }) => dimension === "identity"),
//       ).toMatchObject({ status: "unchanged" });
//     },
//   );
//
//   it.each(["sub_deadbeef", "fcn.00401000", "FUN_deadBEEF"])(
//     "keeps %s as an address-derived name",
//     (name) => {
//       const generated = (base: "0x1000" | "0x2000") =>
//         functionDossierSchema.parse({
//           ...dossier("return 0;", base),
//           procedure: {
//             ...procedure(base, name),
//             name,
//             signature: "int helper(void)",
//             locals: [],
//           },
//         });
//       const result = compareFunctions(
//         observe("d", generated("0x1000")),
//         observe("e", generated("0x2000")),
//       );
//       expect(result.function_match.status).toBe("ambiguous");
//       expect(
//         result.dimensions.find(({ dimension }) => dimension === "identity"),
//       ).toMatchObject({ status: "unknown" });
//     },
//   );
// });
//
// describe("function comparison address-derived call names", () => {
//   it.each([
//     { name: "sub_deallocate", status: "unchanged", diagnostic: undefined },
//     {
//       name: "sub_deadbeef",
//       status: "unknown",
//       diagnostic: "Provider retained an unresolved call target.",
//     },
//     { name: "FUN_00401000", status: "unknown", diagnostic: undefined },
//     { name: "FUN_initialize", status: "unchanged", diagnostic: undefined },
//   ])(
//     "preserves the calls dimension for callee $name",
//     ({ name, status, diagnostic }) => {
//       const calling = (base: "0x1000" | "0x2000") =>
//         functionDossierSchema.parse({
//           ...dossier("return helper();", base),
//           callees: [procedure(base === "0x1000" ? "0x1010" : "0x2010", name)],
//         });
//       const result = compareFunctions(
//         observe("6", calling("0x1000")),
//         observe(
//           "7",
//           calling("0x2000"),
//           "rea-workflow",
//           diagnostic === undefined
//             ? { status: "complete" }
//             : { status: "complete", diagnostics: [diagnostic] },
//         ),
//       );
//       const calls = result.dimensions.find(
//         ({ dimension }) => dimension === "calls",
//       );
//       expect(calls).toMatchObject({ status });
//       if (diagnostic !== undefined)
//         expect(calls).toMatchObject({
//           status: "unknown",
//           limitations: expect.arrayContaining([
//             "Address-derived callee or caller names cannot be matched safely.",
export const _l = 333;
