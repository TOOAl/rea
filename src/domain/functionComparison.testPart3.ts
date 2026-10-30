export const __stub = 1;
//         ...dossier("return FUN_00001010(DAT_00001020) % 3;", "0x1000"),
//         assembly: ["0x1000 call FUN_00001010", "0x1004 ret"],
//       }),
//     );
//     const right = observe(
//       "3",
//       functionDossierSchema.parse({
//         ...dossier("return FUN_00002010(DAT_00002020) % 3;", "0x2000"),
//         assembly: ["0x2000 call FUN_00002010", "0x2004 ret"],
//       }),
//     );
//     const comparison = compareFunctions(left, right);
//     for (const name of ["pseudocode", "assembly"]) {
//       const dimension = comparison.dimensions.find(
//         ({ dimension }) => dimension === name,
//       );
//       expect(dimension).toMatchObject({
//         status: "changed",
//         limitations: expect.arrayContaining([
//           expect.stringContaining(
//             "layout-only differences do not establish a behavior change",
//           ),
//         ]),
//       });
//     }
//     expect(
//       comparison.dimensions.find(({ dimension }) => dimension === "cfg"),
//     ).toMatchObject({ status: "unchanged" });
//   });
//
//   it("counts Unicode text consistently for unresolved provider comparisons", () => {
//     const left = observe("b", dossier("return '😀';", "0x1000"), "provider-a");
//     const right = observe("c", dossier("return '😀';", "0x2000"), "provider-b");
//     const comparison = compareFunctions(left, right);
//     expect(
//       comparison.dimensions.find(({ dimension }) => dimension === "pseudocode"),
//     ).toMatchObject({ status: "unknown", left_count: 11, right_count: 11 });
//     expect(comparison.summary).toEqual({
//       unchanged: 6,
//       changed: 0,
//       unknown: 2,
//     });
//     expect(
//       functionComparisonResultSchema.safeParse({
//         ...comparison,
//         status: "truncated",
//       }).success,
//     ).toBe(false);
//   });
// });
//
// describe("function comparison", () => {
//   it("retains complete call coverage diagnostics without blocking observed-set equality", () => {
//     const diagnostic = "Indirect calls remain unresolved.";
//     const left = observe("a", dossier("return 0;", "0x1000"), "rea-workflow", {
//       status: "complete",
//       diagnostics: [diagnostic],
//     });
//     const right = observe("b", dossier("return 0;", "0x2000"), "rea-workflow", {
//       status: "complete",
//       diagnostics: [diagnostic],
//     });
//     const comparison = compareFunctions(left, right);
//     expect(
//       comparison.dimensions.find(({ dimension }) => dimension === "calls"),
//     ).toMatchObject({
//       status: "unchanged",
//       limitations: [`Left: ${diagnostic}`, `Right: ${diagnostic}`],
//     });
//   });
//
//   it("retains diagnostics alongside incomplete call coverage blockers", () => {
//     const diagnostic = "Indirect calls remain unresolved.";
//     const left = observe("c", dossier("return 0;", "0x1000"), "rea-workflow", {
//       status: "partial",
//       limitations: ["Provider read limit reached."],
//       diagnostics: [diagnostic],
//     });
//     const right = observe("d", dossier("return 0;", "0x2000"), "rea-workflow", {
//       status: "partial",
//       limitations: ["Provider read limit reached."],
//       diagnostics: [diagnostic],
//     });
//     expect(
//       compareFunctions(left, right).dimensions.find(
//         ({ dimension }) => dimension === "calls",
//       ),
//     ).toMatchObject({
//       status: "unknown",
//       limitations: expect.arrayContaining([
//         "Left: Provider read limit reached.",
//         `Left: ${diagnostic}`,
//         "Right: Provider read limit reached.",
//         `Right: ${diagnostic}`,
//       ]),
//     });
//   });
//
//   it("preserves text changes alongside complete inline dossier facets", () => {
//     const result = compareFunctions(
//       FUNCTION_COMPARISON_EXAMPLE.left,
//       FUNCTION_COMPARISON_EXAMPLE.right,
//     );
//     expect(functionComparisonResultSchema.parse(result)).toMatchObject({
//       status: "changed",
//       function_match: { status: "matched", method: "symbol" },
//     });
//     expect(result.dimensions).toEqual(
//       expect.arrayContaining([
//         expect.objectContaining({ dimension: "pseudocode", status: "changed" }),
//         expect.objectContaining({ dimension: "assembly", status: "unchanged" }),
//         expect.objectContaining({
//           dimension: "references",
//           status: "unchanged",
//         }),
//       ]),
//     );
//     expectInlineComparisonEvidence(result);
//     expectFunctionDimensionAlgebra(result);
//   });
//
//   it("normalizes CFG relocation but preserves changed edges and constants", () => {
//     const left = observe("2", dossier("return 0x10;", "0x1000"));
//     const relocated = observe("3", dossier("return 0x10;", "0x2000"));
//     const same = compareFunctions(left, relocated);
//     expect(
//       same.dimensions.find(({ dimension }) => dimension === "cfg"),
//     ).toMatchObject({
//       status: "unchanged",
//     });
//     expect(
//       same.dimensions.find(({ dimension }) => dimension === "pseudocode"),
//     ).toMatchObject({ status: "unchanged" });
//
//     const changed = observe("4", dossier("return 0x20;", "0x2000", ["0x2000"]));
//     const comparison = compareFunctions(left, changed);
//     expect(
//       comparison.dimensions.find(({ dimension }) => dimension === "cfg"),
//     ).toMatchObject({ status: "changed" });
//     expect(
//       comparison.dimensions.find(({ dimension }) => dimension === "pseudocode"),
//     ).toMatchObject({ status: "changed" });
//   });
//
//   it("treats provider-specific text as unknown and validates Evidence", () => {
//     const left = observe("5", dossier("return 0;", "0x1000"), "provider-a");
//     const right = observe("6", dossier("return 1;", "0x2000"), "provider-b");
//     const comparison = compareFunctions(left, right);
//     expect(
//       comparison.dimensions.find(({ dimension }) => dimension === "pseudocode"),
//     ).toMatchObject({ status: "unknown" });
//     expect(comparison.changes).toHaveLength(2);
//     expect(() =>
//       compareFunctions({ ...left, operation: "binary_overview" }, right),
//     ).toThrow(/identifier/u);
//   });
//
//   it("reports fully observed identical dossiers as unchanged", () => {
//     const left = observe("7", dossier("return 0;\n", "0x1000"));
//     const right = observe("8", dossier("return 0;\n", "0x2000"));
//     const comparison = compareFunctions(left, right);
//     expect(comparison.status).toBe("unchanged");
//     expect(
//       comparison.dimensions.every(({ status }) => status === "unchanged"),
//     ).toBe(true);
//   });
//
//   it("compares exact reference kinds only when both providers expose them", () => {
//     const left = observe("d", dossierWithReference("0x1000", "call"));
//     const same = observe("e", dossierWithReference("0x2000", "call"));
//     expect(
//       compareFunctions(left, same).dimensions.find(
//         ({ dimension }) => dimension === "references",
//       ),
//     ).toMatchObject({ status: "unchanged" });
//
//     const changed = observe("f", dossierWithReference("0x2000", "data"));
//     expect(
//       compareFunctions(left, changed).dimensions.find(
//         ({ dimension }) => dimension === "references",
//       ),
//     ).toMatchObject({ status: "changed" });
//
//     const unavailable = observe(
//       "1",
//       dossierWithReference("0x2000", "unavailable"),
//     );
//     expect(
//       compareFunctions(left, unavailable).dimensions.find(
//         ({ dimension }) => dimension === "references",
//       ),
//     ).toMatchObject({
//       status: "unknown",
//       limitations: [expect.stringContaining("did not expose reference kinds")],
//     });
//   });
// });
//
// describe("function comparison identity and malformed CFG", () => {
//   it("does not promote address-derived names through equal signatures", () => {
//     const autoDossier = (base: "0x1000" | "0x2000") =>
//       functionDossierSchema.parse({
//         ...dossier("return 0;", base),
//         procedure: {
//           ...procedure(base, "sub_1000"),
//           name: "sub_1000",
//           signature: "int helper(void)",
//           locals: [],
//         },
//       });
//     const comparison = compareFunctions(
//       observe("9", autoDossier("0x1000")),
//       observe("a", autoDossier("0x2000")),
//     );
//     expect(comparison.function_match.status).toBe("ambiguous");
//     expect(
//       comparison.dimensions.find(({ dimension }) => dimension === "identity"),
//     ).toMatchObject({ status: "unknown" });
//     expect(comparison.status).toBe("unknown");
//     const changedText = compareFunctions(
//       observe("b", autoDossier("0x1000")),
//       observe(
//         "c",
//         functionDossierSchema.parse({
//           ...autoDossier("0x2000"),
//           pseudocode: "return 1;",
//         }),
//       ),
//     );
//     expect(changedText.dimensions).toEqual(
//       expect.arrayContaining([
//         expect.objectContaining({ dimension: "pseudocode", status: "changed" }),
//       ]),
//     );
//     expect(changedText.status).toBe("unknown");
//   });
//
//   it("rejects invalid CFG normalization and preserves newline differences", () => {
//     const leftDossier = dossier("line\r\n", "0x1000");
//     const invalidCfg = functionDossierSchema.parse({
//       ...dossier("line\n", "0x2000"),
//       basic_blocks: [
//         { start: "0x2000", end: "0x2001", successors: [] },
//         { start: "0x2000", end: "0x2002", successors: [] },
//       ],
//     });
//     const comparison = compareFunctions(
//       observe("b", leftDossier),
//       observe("c", invalidCfg),
//     );
//     expect(
//       comparison.dimensions.find(({ dimension }) => dimension === "cfg"),
//     ).toMatchObject({ status: "unknown" });
//     const pseudocode = comparison.dimensions.find(
//       ({ dimension }) => dimension === "pseudocode",
//     );
//     expect(pseudocode).toMatchObject({ status: "changed" });
//     expect(pseudocode?.left_digest).not.toBe(pseudocode?.right_digest);
//   });
// });
//
// const withLiterals = (base: "0x1000" | "0x2000", values: readonly string[]) =>
//   functionDossierSchema.parse({
//     ...dossier("return 0;", base),
//     swift_string_literals: values.map((value) => ({
//       source_address: base,
//       value,
//       representation: "small" as const,
//       address: null,
//       registers: ["x0", "x1"] as const,
//       words: ["0x0", "0xe"] as const,
//     })),
//   });
// const stringsDimension = (
//   leftDigit: string,
//   left: ReturnType<typeof withLiterals> | ReturnType<typeof dossier>,
//   rightDigit: string,
//   right: ReturnType<typeof withLiterals> | ReturnType<typeof dossier>,
// ) =>
//   compareFunctions(
//     observe(leftDigit, left),
//     observe(rightDigit, right),
//   ).dimensions.find(({ dimension }) => dimension === "strings_names");
//
// describe("function comparison Swift string literals", () => {
//   it("treats differing decoded literals as a strings and names change", () => {
//     expect(
//       stringsDimension(
//         "1",
//         withLiterals("0x1000", ["SleepDisabled"]),
//         "2",
//         withLiterals("0x2000", ["Holding awake"]),
//       ),
//     ).toMatchObject({ status: "changed" });
//   });
//
//   it("matches the same decoded literal after the function is relocated", () => {
//     expect(
//       stringsDimension(
//         "3",
//         withLiterals("0x1000", ["SleepDisabled"]),
//         "4",
//         withLiterals("0x2000", ["SleepDisabled"]),
//       ),
//     ).toMatchObject({ status: "unchanged" });
//   });
//
//   it("keeps strings and names unknown when only one dossier recorded Swift literals", () => {
//     expect(
//       stringsDimension(
//         "5",
//         withLiterals("0x1000", []),
//         "6",
//         dossier("return 0;", "0x2000"),
//       ),
//     ).toMatchObject({
//       status: "unknown",
//       limitations: [
//         "Swift String literal coverage differs or is partial; referenced strings and names match, and complete coverage does not establish a differing literal.",
//       ],
//     });
//   });
//
//   it("reports a referenced name change even when Swift literal coverage differs", () => {
//     const named = functionDossierSchema.parse({
//       ...dossier("return 0;", "0x2000"),
//       referenced_names: [
//         { address: "0x3000", value: "helper", source_address: "0x2000" },
//       ],
//     });
//     expect(
//       stringsDimension("7", withLiterals("0x1000", []), "8", named),
//     ).toMatchObject({ status: "changed" });
export const _l = 333;
