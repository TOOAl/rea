export const __stub = 1;
//         limitations: [limitation],
//       }),
//     ).toEqual({
//       ok: true,
//       value: { value: "void f() {}", limitations: [limitation] },
//     });
//   });
//
//   it("preserves handler-region limitations on procedure references", () => {
//     const limitation =
//       "Ghidra Listing shows a Borland/Delphi-style SEH frame registration at 0x401008 (push 0x4010a0 followed by fs-segment stack chaining); handler 0x4010a0 lies outside this procedure's body, so callees, strings, and cross-references may omit the handler region.";
//     const parsed = parseGhidraFunctionResult("procedure_references", {
//       value: {
//         procedure: ghidraFunctionIdentity(),
//         direction: "outgoing",
//         references: [ghidraReferenceEdge()],
//         reference_kinds_available: true,
//         unresolved_calls: [],
//       },
//       limitations: [limitation],
//     });
//     expect(parsed).toEqual({
//       ok: true,
//       value: {
//         value: {
//           procedure: ghidraFunctionIdentity(),
//           direction: "outgoing",
//           references: [ghidraReferenceEdge()],
//           reference_kinds_available: true,
//           unresolved_calls: [],
//         },
//         limitations: [limitation],
//       },
//     });
//     expect(
//       parseGhidraFunctionResult("procedure_references", {
//         procedure: ghidraFunctionIdentity(),
//         direction: "outgoing",
//         references: [],
//         reference_kinds_available: true,
//         unresolved_calls: [],
//       }),
//     ).toMatchObject({ ok: false, error: { _tag: "AnalysisOutputError" } });
//   });
//
//   it.each(["procedure_callees", "procedure_callers"] as const)(
//     "requires the function-observation envelope to carry terminal-call limitations for %s",
//     (operation) => {
//       // A bare address list is the pre-fix bridge shape; without the envelope
//       // a truncated function body reports no warning, so it must be rejected.
//       expect(parseGhidraFunctionResult(operation, ["0x2000"])).toMatchObject({
//         ok: false,
//         error: { _tag: "AnalysisOutputError" },
//       });
//       const limitation =
//         "Ghidra Listing reports a terminal call at 0x401000 to 0x402000 abort; fallthrough is excluded by Ghidra's flow model.";
//       expect(
//         parseGhidraFunctionResult(operation, {
//           value: ["0x2000"],
//           limitations: [limitation],
//         }),
//       ).toEqual({
//         ok: true,
//         value: { value: ["0x2000"], limitations: [limitation] },
//       });
//     },
//   );
// });
//
// describe("Ghidra reference and value-flow completeness", () => {
//   it.each(["reference_kinds_available", "unresolved_calls"])(
//     "rejects omitted %s instead of inventing complete reference observations",
//     (field) => {
//       const output = {
//         procedure: ghidraFunctionIdentity(),
//         direction: "outgoing",
//         references: [ghidraReferenceEdge()],
//         reference_kinds_available: true,
//         unresolved_calls: [],
//       };
//       const incomplete = Object.fromEntries(
//         Object.entries(output).filter(([key]) => key !== field),
//       );
//       expect(
//         parseFunctionValueFixture("procedure_references", output),
//       ).toMatchObject({ ok: true });
//       expect(
//         parseFunctionValueFixture("procedure_references", incomplete),
//       ).toMatchObject({ ok: false, error: { _tag: "AnalysisOutputError" } });
//     },
//   );
//
//   it.each(["block_membership", "parameters", "parameter_uses"])(
//     "rejects a value-flow result missing %s",
//     (field) => {
//       const dossier = ghidraFunctionDossier();
//       if (
//         typeof dossier !== "object" ||
//         dossier === null ||
//         Array.isArray(dossier)
//       )
//         throw new TypeError("Ghidra dossier fixture is invalid");
//       const flow = dossier.native_value_flow;
//       if (typeof flow !== "object" || flow === null || Array.isArray(flow))
//         throw new TypeError("Ghidra p-code fixture is invalid");
//       if (!Array.isArray(flow.operations))
//         throw new TypeError("Ghidra operation fixture is invalid");
//       const incompleteFlow =
//         field === "block_membership"
//           ? {
//               ...flow,
//               operations: flow.operations.map((operation, index) =>
//                 index !== 0 ||
//                 typeof operation !== "object" ||
//                 operation === null ||
//                 Array.isArray(operation)
//                   ? operation
//                   : Object.fromEntries(
//                       Object.entries(operation).filter(
//                         ([key]) => key !== field,
//                       ),
//                     ),
//               ),
//             }
//           : Object.fromEntries(
//               Object.entries(flow).filter(([key]) => key !== field),
//             );
//
//       expect(
//         parseFunctionValueFixture(
//           "analyze_function",
//           jsonValueSchema.parse({
//             ...dossier,
//             native_value_flow: incompleteFlow,
//           }),
//         ),
//       ).toMatchObject({ ok: false, error: { _tag: "AnalysisOutputError" } });
//     },
//   );
//
//   it("rejects p-code relationships that refer to omitted operation IDs", () => {
//     const dossier = ghidraFunctionDossier();
//     if (
//       typeof dossier !== "object" ||
//       dossier === null ||
//       Array.isArray(dossier)
//     )
//       throw new TypeError("Ghidra dossier fixture is invalid");
//     const flow = dossier.native_value_flow;
//     if (typeof flow !== "object" || flow === null || Array.isArray(flow))
//       throw new TypeError("Ghidra p-code fixture is invalid");
//     expect(
//       parseFunctionValueFixture("analyze_function", {
//         ...dossier,
//         native_value_flow: {
//           ...flow,
//           def_use: [
//             {
//               definition: "0x401000#missing",
//               use: "0x401000#0",
//               input_index: 0,
//             },
//           ],
//         },
//       }),
//     ).toMatchObject({
//       ok: false,
//       error: { _tag: "AnalysisOutputError" },
//     });
//   });
// });
//
// describe("Ghidra Swift String literals", () => {
//   it("keeps a small Swift literal without storage apart from a large literal's bytes", () => {
//     const dossier = ghidraFunctionDossier();
//     if (
//       typeof dossier !== "object" ||
//       dossier === null ||
//       Array.isArray(dossier)
//     )
//       throw new TypeError("Ghidra dossier fixture is invalid");
//     const literals = [
//       {
//         source_address: "0x401004",
//         value: "The user name ",
//         representation: "small",
//         address: null,
//         registers: ["x0", "x1"],
//         words: ["0x7265737520656854", "0xee0020656d616e20"],
//       },
//       {
//         source_address: "0x401006",
//         value: "",
//         representation: "small",
//         address: null,
//         registers: ["x0", "x1"],
//         words: ["0x0", "0xe000000000000000"],
//       },
//       {
//         source_address: "0x401008",
//         value: " cannot be written into a sudoers rule safely.",
//         representation: "large",
//         address: "0x402270",
//         registers: ["x0", "x1"],
//         words: ["0xd00000000000002e", "0x8000000000402250"],
//       },
//     ];
//     expect(
//       parseFunctionValueFixture("analyze_function", {
//         ...dossier,
//         swift_string_literals: literals,
//         swift_string_literal_omissions: [],
//       }),
//     ).toMatchObject({ ok: true, value: { swift_string_literals: literals } });
//   });
// });
//
// describe("Ghidra compact reference provenance", () => {
//   it("distinguishes incoming references, examined emptiness and unavailable coverage at data addresses", () => {
//     const instruction = {
//       ...compactInstruction(),
//       address: "ram:00402000",
//       status: "data",
//       procedure: null,
//     };
//     const reference = {
//       ...compactReference(),
//       source_address: "ram:00401000",
//       target_address: instruction.address,
//       type: "WRITE",
//       call: false,
//       data: true,
//       write: true,
//     };
//     for (const incoming of [
export const _l = 235;
