export const __stub = 1;
//       {},
//       { incoming_references: null },
//       { incoming_references: [] },
//       { incoming_references: [reference] },
//       { incoming_references: [{ ...reference, primary: null, source: null }] },
//     ]) {
//       const expected = { ...instruction, ...incoming };
//       const parsed = parseFunctionValueFixture(
//         "inspect_native_instruction",
//         expected,
//       );
//       if (!parsed.ok) throw parsed.error;
//       expect(parsed.value).toEqual(expected);
//     }
//     expect(
//       parseFunctionValueFixture("inspect_native_instruction", {
//         ...instruction,
//         incoming_references: [{ ...reference, primary: "false" }],
//       }),
//     ).toMatchObject({ ok: false, error: { _tag: "AnalysisOutputError" } });
//   });
//
//   const operations = [
//     ["inspect_native_instruction", compactInstruction],
//     ["resolve_native_call_targets", compactCallTargets],
//   ] as const;
//
//   it.each(operations)(
//     "preserves complete, legacy and unknown facts in %s",
//     (operation, output) => {
//       const complete = compactReference();
//       const legacy = Object.fromEntries(
//         Object.entries(complete).filter(
//           ([key]) =>
//             ![
//               "source_address",
//               "data",
//               "read",
//               "write",
//               "primary",
//               "provenance",
//               "source",
//             ].includes(key),
//         ),
//       );
//       const unknown = {
//         ...legacy,
//         source_address: null,
//         data: null,
//         read: null,
//         write: null,
//         primary: null,
//         provenance: null,
//         source: null,
//       };
//       for (const reference of [complete, legacy, unknown]) {
//         const expected = output([reference]);
//         const parsed = parseFunctionValueFixture(operation, expected);
//         if (!parsed.ok) throw parsed.error;
//         expect(parsed.value).toEqual(expected);
//       }
//     },
//   );
//
//   it.each(operations)(
//     "rejects malformed present provenance in %s",
//     (operation, output) => {
//       for (const [field, value] of [
//         ["source_address", 1],
//         ["data", "true"],
//         ["read", 1],
//         ["write", 0],
//         ["primary", "false"],
//         ["provenance", ""],
//         ["source", false],
//       ] as const) {
//         expect(
//           parseFunctionValueFixture(
//             operation,
//             output([{ ...compactReference(), [field]: value }]),
//           ),
//         ).toMatchObject({
//           ok: false,
//           error: { _tag: "AnalysisOutputError" },
//         });
//       }
//     },
//   );
// });
//
// describe("Ghidra jump-table mapping contract", () => {
//   it("preserves evidenced defaults separately from cases and unresolved targets", () => {
//     const dossier = functionDossierSchema.parse(ghidraFunctionDossier());
//     const boundary = dossier.native_api;
//     if (boundary?.available !== true)
//       throw new TypeError("Ghidra native API fixture is unavailable");
//     const table = boundary.jump_tables[0];
//     const mapping = table?.mappings[0];
//     if (table === undefined || mapping === undefined)
//       throw new TypeError("Ghidra jump-table fixture is unavailable");
//     const defaults = [
//       {
//         target_address: mapping.target_address,
//         confidence: "high",
//         evidence: [
//           {
//             kind: "jump-table",
//             source: "ghidra-clang-case-token",
//             detail: "Default label reaches this recovered destination.",
//           },
//         ],
//       },
//     ];
//     const parsed = parseFunctionValueFixture("analyze_function", {
//       ...dossier,
//       native_api: {
//         ...boundary,
//         jump_tables: [
//           {
//             ...table,
//             default_targets: defaults,
//             mappings: [
//               mapping,
//               { ...mapping, case_value: null, target_address: "0x401030" },
//             ],
//           },
//         ],
//       },
//     });
//     if (!parsed.ok) throw parsed.error;
//     const output = functionDossierSchema.parse(parsed.value).native_api;
//     if (output?.available !== true)
//       throw new TypeError("Ghidra native API fixture is unavailable");
//     expect(output.jump_tables[0]).toMatchObject({
//       default_targets: defaults,
//       mappings: [
//         { case_value: 0, target_address: "0x401020" },
//         { case_value: null, target_address: "0x401030" },
//       ],
//     });
//   });
//
//   it("rejects omitted default observations instead of repairing obsolete bridge output", () => {
//     const dossier = functionDossierSchema.parse(ghidraFunctionDossier());
//     const boundary = dossier.native_api;
//     if (boundary?.available !== true)
//       throw new TypeError("Ghidra native API fixture is unavailable");
//     const table = boundary.jump_tables[0];
//     const mapping = table?.mappings[0];
//     if (table === undefined || mapping === undefined)
//       throw new TypeError("Ghidra jump-table fixture is unavailable");
//     const { default_targets: omittedDefaults, ...withoutDefaults } = table;
//     expect(omittedDefaults).toHaveLength(1);
//     const parsed = parseFunctionValueFixture("analyze_function", {
//       ...dossier,
//       native_api: {
//         ...boundary,
//         jump_tables: [
//           { ...withoutDefaults, mappings: [{ ...mapping, case_value: null }] },
//         ],
//       },
//     });
//     expect(parsed).toMatchObject({
//       ok: false,
//       error: { _tag: "AnalysisOutputError" },
//     });
//   });
//
//   it("rejects non-canonical default destinations and defaults without evidence", () => {
//     const dossier = functionDossierSchema.parse(ghidraFunctionDossier());
//     const boundary = dossier.native_api;
//     if (boundary?.available !== true)
//       throw new TypeError("Ghidra native API fixture is unavailable");
//     const table = boundary.jump_tables[0];
//     const mapping = table?.mappings[0];
//     if (table === undefined || mapping === undefined)
//       throw new TypeError("Ghidra jump-table fixture is unavailable");
//     for (const destination of [
//       {
//         target_address: "0X401020",
//         confidence: "high",
//         evidence: mapping.evidence,
//       },
//       { target_address: "0x401020", confidence: "high", evidence: [] },
//     ]) {
//       expect(
//         parseFunctionValueFixture("analyze_function", {
//           ...dossier,
//           native_api: {
//             ...boundary,
//             jump_tables: [{ ...table, default_targets: [destination] }],
//           },
//         }),
//       ).toMatchObject({ ok: false, error: { _tag: "AnalysisOutputError" } });
//     }
//   });
// });
//
// describe("Ghidra function-analysis malformed results", () => {
//   it.each(malformedOutputs())(
//     "rejects malformed %s output",
//     (_name, operation, value) => {
//       expect(parseFunctionValueFixture(operation, value)).toMatchObject({
//         ok: false,
//         error: { _tag: "AnalysisOutputError" },
//       });
//     },
//   );
// });
//
// const malformedSwiftStringLiterals = (
//   dossier: Record<string, JsonValue>,
// ): Array<[string, GhidraFunctionOperation, JsonValue]> =>
//   (
//     [
//       ["non-canonical Swift literal address", "large", "402240"],
//       ["small Swift literal with storage", "small", "0x402270"],
//       ["large Swift literal without storage", "large", null],
//     ] as const
//   ).map(([name, representation, address]) => [
//     name,
//     "analyze_function",
//     {
//       ...dossier,
//       swift_string_literal_omissions: [],
//       swift_string_literals: [
//         {
//           source_address: "0x401004",
//           value: "The power setting could not be changed.",
//           representation,
//           address,
//           registers: ["x0", "x1"],
//           words: ["0xd000000000000027", "0x8000000000402220"],
//         },
//       ],
export const _l = 235;
