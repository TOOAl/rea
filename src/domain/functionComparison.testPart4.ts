export const __stub = 1;
//   });
// });
//
// describe("function comparison partial Swift literal coverage", () => {
//   it("keeps literal comparisons unknown at unresolved jump candidates", () => {
//     const unresolved = functionDossierSchema.parse({
//       ...withLiterals("0x2000", []),
//       swift_string_literal_omissions: [
//         {
//           source_address: "0x2004",
//           representation: "small",
//           address: null,
//           byte_length: 4,
//           reason: "unresolved_jump",
//           registers: ["x0", "x1"],
//           words: ["0x732f4220", "0xe400000000000000"],
//         },
//       ],
//     });
//     expect(
//       stringsDimension(
//         "8",
//         withLiterals("0x1000", ["SleepDisabled"]),
//         "9",
//         unresolved,
//       ),
//     ).toMatchObject({ status: "unknown" });
//   });
//
//   it("does not equate a partial literal record with a complete one", () => {
//     const partial = functionDossierSchema.parse({
//       ...withLiterals("0x2000", ["SleepDisabled"]),
//       swift_string_literal_omissions: [
//         {
//           source_address: "0x2000",
//           representation: "large",
//           address: "0x3000",
//           byte_length: 64,
//           reason: "capacity",
//           registers: ["x0", "x1"],
//           words: ["0xd000000000000040", "0x8000000000002fe0"],
//         },
//       ],
//     });
//     expect(
//       stringsDimension(
//         "9",
//         withLiterals("0x1000", ["SleepDisabled"]),
//         "a",
//         partial,
//       ),
//     ).toMatchObject({ status: "unknown" });
//   });
//
//   it("reports a literal that a complete dossier shows absent at a site the partial one decoded", () => {
//     const partial = functionDossierSchema.parse({
//       ...withLiterals("0x2000", ["SleepDisabled"]),
//       swift_string_literal_omissions: [
//         {
//           source_address: "0x2004",
//           representation: "small",
//           address: null,
//           byte_length: 4,
//           reason: "capacity",
//           registers: ["x0", "x1"],
//           words: ["0x732f4220", "0xe400000000000000"],
//         },
//       ],
//     });
//     expect(
//       stringsDimension("d", withLiterals("0x1000", []), "e", partial),
//     ).toMatchObject({ status: "changed" });
//   });
// });
//
// describe("function comparison partial Swift literal omission interpretation", () => {
//   it("does not interpret an unexamined path as a missing literal at a retained site", () => {
//     const partial = functionDossierSchema.parse({
//       ...withLiterals("0x2000", ["A"]),
//       swift_string_literal_omissions: [
//         {
//           source_address: "0x2004",
//           representation: "small",
//           address: null,
//           byte_length: 0,
//           reason: "capacity",
//           registers: ["x0", "x1"],
//           words: ["0x0", "0xe000000000000000"],
//         },
//       ],
//     });
//     const complete = withLiterals("0x1000", ["A", "B"]);
//     expect(stringsDimension("1", complete, "2", partial)).toMatchObject({
//       status: "unknown",
//     });
//     expect(stringsDimension("3", partial, "4", complete)).toMatchObject({
//       status: "unknown",
//     });
//     expect(
//       stringsDimension("5", withLiterals("0x1000", []), "6", partial),
//     ).toMatchObject({ status: "changed" });
//   });
//
//   it("treats an omission record without decoded literals as partial coverage", () => {
//     const omissionOnly = functionDossierSchema.parse({
//       ...dossier("return 0;", "0x2000"),
//       swift_string_literal_omissions: [
//         {
//           source_address: "0x2004",
//           representation: "small",
//           address: null,
//           byte_length: 4,
//           reason: "capacity",
//           registers: ["x0", "x1"],
//           words: ["0x732f4220", "0xe400000000000000"],
//         },
//       ],
//     });
//     expect(
//       stringsDimension("f", dossier("return 0;", "0x1000"), "0", omissionOnly),
//     ).toMatchObject({ status: "unknown" });
//   });
//
//   it("keeps different retained representations unknown when both dossiers are partial", () => {
//     const omission = {
//       source_address: "0x1004",
//       representation: "small",
//       address: null,
//       byte_length: 4,
//       reason: "capacity",
//       registers: ["x0", "x1"],
//       words: ["0x732f4220", "0xe400000000000000"],
//     } as const;
//     const small = functionDossierSchema.parse({
//       ...withLiterals("0x1000", ["SleepDisabled"]),
//       swift_string_literal_omissions: [omission],
//     });
//     const large = functionDossierSchema.parse({
//       ...dossier("return 0;", "0x2000"),
//       swift_string_literals: [
//         {
//           source_address: "0x2000",
//           value: "SleepDisabled",
//           representation: "large",
//           address: "0x3000",
//           registers: ["x0", "x1"],
//           words: ["0xd00000000000000d", "0x8000000000002fe0"],
//         },
//       ],
//       swift_string_literal_omissions: [
//         { ...omission, source_address: "0x2004" },
//       ],
//     });
//     expect(stringsDimension("1", small, "2", large)).toMatchObject({
//       status: "unknown",
//     });
//   });
//
//   it("keeps different retained literals unknown when both dossiers are partial", () => {
//     const partial = (base: "0x1000" | "0x2000", value: string) =>
//       functionDossierSchema.parse({
//         ...withLiterals(base, [value]),
//         swift_string_literal_omissions: [
//           {
//             source_address: base === "0x1000" ? "0x1004" : "0x2004",
//             representation: "large",
//             address: "0x3000",
//             byte_length: 64,
//             reason: "capacity",
//             registers: ["x0", "x1"],
//             words: ["0xd000000000000040", "0x8000000000002fe0"],
//           },
//         ],
//       });
//     expect(
//       stringsDimension(
//         "b",
//         partial("0x1000", "SleepDisabled"),
//         "c",
//         partial("0x2000", "Holding awake"),
//       ),
//     ).toMatchObject({ status: "unknown" });
//   });
// });
//
// const expectInlineComparisonEvidence = (
//   result: ReturnType<typeof compareFunctions>,
// ): void => {
//   for (const dimension of result.dimensions)
//     expect(dimension.evidence_links).toEqual([
//       FUNCTION_COMPARISON_EXAMPLE.left.evidence_id,
//       FUNCTION_COMPARISON_EXAMPLE.right.evidence_id,
//     ]);
//   const firstDimension = result.dimensions[0];
//   expect(firstDimension).toBeDefined();
//   if (firstDimension === undefined) return;
//   expect(
//     functionComparisonResultSchema.safeParse({
//       ...result,
//       dimensions: result.dimensions.map((dimension, index) =>
//         index === 0
//           ? {
//               ...dimension,
//               evidence_links: Array.from(
//                 { length: 201 },
//                 () => FUNCTION_COMPARISON_EXAMPLE.left.evidence_id,
//               ),
//             }
//           : dimension,
//       ),
//     }).success,
//   ).toBe(true);
// };
//
// const expectFunctionDimensionAlgebra = (
//   result: ReturnType<typeof compareFunctions>,
// ): void => {
//   const observed = result.dimensions.find(
//     ({ status }) => status === "unchanged" || status === "changed",
//   );
//   expect(observed).toBeDefined();
//   if (observed === undefined) return;
//   expect(
//     functionComparisonResultSchema.safeParse({
//       ...result,
//       dimensions: [
//         { ...observed, left_digest: null, right_digest: null },
//         ...result.dimensions.slice(1),
//       ],
//     }).success,
//   ).toBe(false);
//   expect(
//     functionComparisonResultSchema.safeParse({
//       ...result,
//       function_match: { ...result.function_match, method: "explicit" },
//     }).success,
//   ).toBe(false);
// };
//
// it.each([
//   { match: "mismatched", changedDimensions: false, expected: "changed" },
//   { match: "ambiguous", changedDimensions: false, expected: "unknown" },
//   { match: "ambiguous", changedDimensions: true, expected: "unknown" },
// ] as const)(
//   "validates $match match precedence with changed dimensions=$changedDimensions",
//   ({ match, changedDimensions, expected }) => {
//     const result = compareFunctions(
//       FUNCTION_COMPARISON_EXAMPLE.left,
//       changedDimensions
//         ? FUNCTION_COMPARISON_EXAMPLE.right
//         : FUNCTION_COMPARISON_EXAMPLE.left,
//     );
//     const candidate = {
//       ...result,
//       function_match: {
//         status: match,
//         method: "explicit",
//         left_name: "main",
//         right_name: "other",
//       },
//     };
//     expect(
//       functionComparisonResultSchema.safeParse({
//         ...candidate,
//         status: expected,
//       }).success,
//     ).toBe(true);
//     for (const status of ["unchanged", "changed", "unknown"] as const) {
//       if (status === expected) continue;
//       const parsed = functionComparisonResultSchema.safeParse({
//         ...candidate,
//         status,
//       });
//       expect(parsed.success).toBe(false);
//       if (!parsed.success)
//         expect(parsed.error.issues).toMatchObject([
//           {
//             path: ["status"],
//             code: "custom",
//             message:
//               "Function comparison status contradicts its dimensions or function match.",
//           },
//         ]);
//     }
//   },
// );
//
// describe("function comparison unnamed reference endpoints", () => {
//   it("distinguishes unnamed reference targets by address within one artifact", () => {
//     const unnamedTarget = (target: string) =>
//       functionDossierSchema.parse({
//         ...dossierWithReference("0x1000", "call"),
//         outgoing_references: [
//           {
//             ...dossierWithReference("0x1000", "call").outgoing_references[0],
//             target_address: target,
//             target_procedure: null,
//           },
//         ],
//       });
//     const reference = (left: string, right: string, digits = ["a", "a"]) =>
//       compareFunctions(
//         observe(digits[0] ?? "a", unnamedTarget(left)),
//         observe(digits[1] ?? "a", unnamedTarget(right)),
//       ).dimensions.find(({ dimension }) => dimension === "references");
//     expect(reference("0x1010", "0x1020")).toMatchObject({ status: "changed" });
//     expect(reference("0x1010", "0x1010")).toMatchObject({
//       status: "unchanged",
//     });
//     // Across artifacts the same address does not identify the same target.
//     expect(reference("0x1010", "0x1010", ["a", "b"])).toMatchObject({
//       status: "unknown",
//     });
//   });
//
//   it("keeps known reference-kind changes beside unnamed endpoints", () => {
//     const unnamed = (kind: "call" | "data") => {
//       const edge = dossierWithReference("0x1000", kind).outgoing_references[0];
//       return functionDossierSchema.parse({
//         ...dossierWithReference("0x1000", kind),
//         outgoing_references: [{ ...edge, target_procedure: null }],
//       });
//     };
//     expect(
//       compareFunctions(
//         observe("a", unnamed("call")),
//         observe("b", unnamed("data")),
//       ).dimensions.find(({ dimension }) => dimension === "references"),
//     ).toMatchObject({ status: "changed" });
//   });
// });
export const _l = 331;
