export const __stub = 1;
//     },
//   ]);
//
// const malformedOutputs = (): Array<
//   [string, GhidraFunctionOperation, JsonValue]
// > => {
//   const dossier = ghidraFunctionDossier();
//   if (typeof dossier !== "object" || dossier === null || Array.isArray(dossier))
//     throw new TypeError("Ghidra dossier fixture is invalid");
//   const edge = ghidraReferenceEdge();
//   const nativeApi = ghidraNativeApiBoundary();
//   const jumpTable = nativeApi.jump_tables[0];
//   const mapping = jumpTable?.mappings[0];
//   if (jumpTable === undefined || mapping === undefined)
//     throw new TypeError("Ghidra native API fixture is invalid");
//   return [
//     ["non-canonical address", "procedure_callers", ["401000"]],
//     [
//       "Swift literals without their omission record",
//       "analyze_function",
//       { ...dossier, swift_string_literals: [] },
//     ],
//     [
//       "missing classification",
//       "procedure_info",
//       {
//         name: "main",
//         entrypoint: "0x401000",
//         basicblock_count: 1,
//         length: 1,
//         signature: null,
//         locals: [],
//       },
//     ],
//     [
//       "unavailable Ghidra reference kind",
//       "procedure_references",
//       {
//         procedure: ghidraFunctionIdentity(),
//         direction: "outgoing",
//         references: [
//           { ...edge, kind: { available: false, reason: "unknown" } },
//         ],
//       },
//     ],
//     [
//       "missing native API boundary",
//       "analyze_function",
//       Object.fromEntries(
//         Object.entries(dossier).filter(([key]) => key !== "native_api"),
//       ),
//     ],
//     ...malformedSwiftStringLiterals(dossier),
//     [
//       "non-canonical Swift literal omission address",
//       "analyze_function",
//       {
//         ...dossier,
//         swift_string_literals: [],
//         swift_string_literal_omissions: [
//           {
//             source_address: "0x401004",
//             representation: "large",
//             address: "402240",
//             byte_length: 39,
//             reason: "capacity",
//             registers: ["x0", "x1"],
//             words: ["0xd000000000000027", "0x8000000000402220"],
//           },
//         ],
//       },
//     ],
//     [
//       "non-canonical native API target",
//       "analyze_function",
//       {
//         ...dossier,
//         native_api: {
//           ...nativeApi,
//           jump_tables: [
//             {
//               ...jumpTable,
//               mappings: [
//                 {
//                   ...mapping,
//                   target_address: "401020",
//                 },
//               ],
//             },
//           ],
//         },
//       },
//     ],
//     [
//       "Hopper local provenance",
//       "analyze_function",
//       {
//         ...dossier,
//         procedure: {
//           ...ghidraFunctionIdentity(),
//           signature: null,
//           locals: [
//             {
//               description: "opaque",
//               provenance: "hopper-public-python-api",
//             },
//           ],
//         },
//       },
//     ],
//     [
//       "inconsistent dossier bound",
//       "analyze_function",
//       {
//         ...dossier,
//         instruction_scan: { scanned: -1, truncated: false },
//       },
//     ],
//     [
//       "missing uncertainty limitations",
//       "analyze_function",
//       {
//         ...dossier,
//         limitations: [],
//       },
//     ],
//   ];
// };
//
// // Inclusive ranges are a wire-boundary fixture, not a claim of real-provider acceptance.
// describe("complete Ghidra function body range evidence", () => {
//   const body = () => ({
//     available: true,
//     provenance: "ghidra-function-body-address-set",
//     ranges: [
//       { start: "0x401000", end: "0x401002" },
//       { start: "0x401010", end: "0x401011" },
//     ],
//     total_bytes: 5,
//     span_bytes: 18,
//     non_contiguous: true,
//     contains_entry: true,
//   });
//   const info = () => ({
//     name: "fixture_main",
//     entrypoint: "0x401000",
//     basicblock_count: 2,
//     length: 5,
//     signature: null,
//     locals: [],
//     classification: ghidraFunctionClassification(),
//     body: body(),
//   });
//   it("preserves inclusive disjoint ranges and distinguishes owned bytes from enclosing span", () => {
//     expect(parseFunctionValueFixture("procedure_info", info())).toMatchObject({
//       ok: true,
//       value: { body: body(), length: 5 },
//     });
//   });
//   it("rejects omitted body evidence instead of accepting a length as complete coverage", () => {
//     const { body: omitted, ...withoutBody } = info();
//     expect(omitted.total_bytes).toBe(5);
//     expect(parseFunctionValueFixture("procedure_info", withoutBody).ok).toBe(
//       false,
//     );
//   });
//   it("requires local entry coverage but permits an observed empty external body", () => {
//     const empty = {
//       ...body(),
//       ranges: [],
//       total_bytes: 0,
//       span_bytes: 0,
//       non_contiguous: false,
//       contains_entry: false,
//     };
//     expect(
//       parseFunctionValueFixture("procedure_info", {
//         ...info(),
//         body: empty,
//         length: 0,
//       }).ok,
//     ).toBe(false);
//     expect(
//       parseFunctionValueFixture("procedure_info", {
//         ...info(),
//         classification: { ...ghidraFunctionClassification(), external: true },
//         body: empty,
//         length: 0,
//       }).ok,
//     ).toBe(true);
//   });
//   it("rejects a missing body on nested dossier identities", () => {
//     const dossier = functionDossierSchema.parse(ghidraFunctionDossier());
//     const { body: omitted, ...identity } = ghidraFunctionIdentity();
//     expect(omitted.total_bytes).toBe(6);
//     expect(
//       parseFunctionValueFixture("analyze_function", {
//         ...dossier,
//         callers: [identity],
//       }).ok,
//     ).toBe(false);
//   });
//   it("requires body length and Ghidra-specific body provenance", () => {
//     expect(
//       parseFunctionValueFixture("procedure_info", { ...info(), length: 18 }).ok,
//     ).toBe(false);
//     expect(
//       parseFunctionValueFixture("procedure_info", {
//         ...info(),
//         body: { ...body(), provenance: "unreviewed" },
//       }).ok,
//     ).toBe(false);
//   });
//   it.each([
//     { total_bytes: 18 },
//     { span_bytes: 5 },
//     { non_contiguous: false },
//     { contains_entry: false },
//     {
//       ranges: [
//         { start: "0x401000", end: "0x401002" },
//         { start: "0x401002", end: "0x401004" },
//       ],
//     },
//     { ranges: [{ start: "0x401002", end: "0x401000" }] },
//   ])("rejects contradictory complete body facts %j", (change) => {
//     expect(
//       parseFunctionValueFixture("procedure_info", {
//         ...info(),
//         body: { ...body(), ...change },
//       }).ok,
//     ).toBe(false);
//   });
// });
export const _l = 234;
