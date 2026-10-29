export const __stub = 1;
//             `Right: ${diagnostic}`,
//           ]),
//         });
//     },
//   );
// });
//
// describe("function call relationship coverage", () => {
//   const coverageCases: {
//     readonly label: string;
//     readonly coverage: RelationshipCoverage | null;
//     readonly limitation: string;
//   }[] = [
//     {
//       label: "missing",
//       coverage: null,
//       limitation: "Provider did not report relationship coverage.",
//     },
//     {
//       label: "partial",
//       coverage: {
//         status: "partial",
//         limitations: ["Call graph stopped at the read limit."],
//       },
//       limitation: "Call graph stopped at the read limit.",
//     },
//   ];
//   it.each(coverageCases)(
//     "keeps equal empty calls unknown for $label coverage",
//     ({ coverage, limitation }) => {
//       const left = observe("a", dossier("return 0;", "0x1000"));
//       const right = observe(
//         "b",
//         dossier("return 0;", "0x2000"),
//         "rea-workflow",
//         coverage,
//       );
//       const result = compareFunctions(left, right);
//       const calls = result.dimensions.find(
//         ({ dimension }) => dimension === "calls",
//       );
//       expect(calls).toMatchObject({
//         status: "unknown",
//         conclusion_kind: "unresolved_branch",
//         left_count: 0,
//         right_count: 0,
//         limitations: [`Right: ${limitation}`],
//       });
//       expect(result.status).toBe("unknown");
//     },
//   );
//
//   it("retains complete observations with execution diagnostics as comparable", () => {
//     const coverage = {
//       status: "complete" as const,
//       diagnostics: ["Provider reported a non-call xref warning."],
//     };
//     const left = observe(
//       "c",
//       dossier("return 0;", "0x1000"),
//       "rea-workflow",
//       coverage,
//     );
//     const right = observe(
//       "d",
//       dossier("return 0;", "0x2000"),
//       "rea-workflow",
//       coverage,
//     );
//     expect(
//       compareFunctions(left, right).dimensions.find(
//         ({ dimension }) => dimension === "calls",
//       ),
//     ).toMatchObject({ status: "unchanged", left_count: 0, right_count: 0 });
//   });
//
//   it("keeps unresolved call sites unknown despite complete resolved-set coverage", () => {
//     const left = observe("e", dossier("return 0;", "0x1000"));
//     const rightDossier = functionDossierSchema.parse({
//       ...dossier("return 0;", "0x2000"),
//       unresolved_calls: [
//         {
//           address: "0x2010",
//           reason: "Indirect dispatch target could not be resolved.",
//         },
//       ],
//     });
//     const right = observe("f", rightDossier);
//     expect(
//       compareFunctions(left, right).dimensions.find(
//         ({ dimension }) => dimension === "calls",
//       ),
//     ).toMatchObject({
//       status: "unknown",
//       limitations: [
//         "Right: Unresolved call at 0x2010: Indirect dispatch target could not be resolved.",
//       ],
//     });
//   });
// });
//
// describe("function collection collation ties", () => {
//   const composed = procedure("0x2000", "caf\u00e9");
//   const decomposed = procedure("0x3000", "cafe\u0301");
//   const calling = (callees: readonly ReturnType<typeof procedure>[]) =>
//     functionDossierSchema.parse({
//       ...dossier("return 0;", "0x1000"),
//       callees,
//     });
//
//   it("ignores reordered callees whose distinct names collate equally", () => {
//     const result = compareFunctions(
//       observe("b", calling([composed, decomposed])),
//       observe("c", calling([decomposed, composed])),
//     );
//     expect(result.status).toBe("unchanged");
//     const calls = result.dimensions.find(
//       ({ dimension }) => dimension === "calls",
//     );
//     expect(calls).toMatchObject({
//       status: "unchanged",
//       left_count: 2,
//       right_count: 2,
//     });
//     expect(calls?.left_digest).toBe(calls?.right_digest);
//   });
//
//   it.each([
//     ["remove composed", [decomposed]],
//     ["remove decomposed", [composed]],
//     ["replace composed", [decomposed, decomposed]],
//     ["replace decomposed", [composed, composed]],
//   ] as const)("preserves an exact name change: %s", (_label, changed) => {
//     const result = compareFunctions(
//       observe("b", calling([composed, decomposed])),
//       observe("c", calling(changed)),
//     );
//     expect(result.status).toBe("changed");
//     const calls = result.dimensions.find(
//       ({ dimension }) => dimension === "calls",
//     );
//     expect(calls).toMatchObject({ status: "changed" });
//     expect(calls?.left_digest).not.toBe(calls?.right_digest);
//   });
//
//   it("uses canonical code-point ordering for collection digests", () => {
//     const callees = ["zeta", "Alpha", "alpha", "_helper", "beta"].map(
//       (name, index) => procedure(`0x${(0x2000 + index).toString(16)}`, name),
//     );
//     const canonicalProjection = callees
//       .map(({ name }) => ({ direction: "out", name }))
//       .sort((left, right) =>
//         compareUnicodeCodePoints(canonicalJson(left), canonicalJson(right)),
//       );
//     const result = compareFunctions(
//       observe("b", calling(callees)),
//       observe("c", calling([...callees].reverse())),
//     );
//     const calls = result.dimensions.find(
//       ({ dimension }) => dimension === "calls",
//     );
//     expect(calls).toMatchObject({
//       status: "unchanged",
//       left_digest: digestCanonicalValue(canonicalProjection),
//       right_digest: digestCanonicalValue(canonicalProjection),
//     });
//   });
// });
//
// describe("function comparison ordering controls", () => {
//   const composed = procedure("0x2000", "caf\u00e9");
//   const decomposed = procedure("0x3000", "cafe\u0301");
//
//   it("preserves duplicate Unicode collections and nullable endpoints", () => {
//     const controlled = (base: "0x1000" | "0x2000", reverse: boolean) => {
//       const endpoint = base === "0x1000" ? "0x1010" : "0x2010";
//       const edges = [
//         {
//           source_address: base,
//           target_address: endpoint,
//           source_procedure: null,
//           target_procedure: procedure(endpoint, "caf\u00e9"),
//           kind: {
//             available: true,
//             provenance: "provider-reference-manager",
//             type: "UNCONDITIONAL_CALL",
//             flow: true,
//             call: true,
//             jump: false,
//             data: false,
//             read: false,
//             write: false,
//             indirect: false,
//             computed: false,
//             conditional: false,
//             terminal: false,
//             primary: true,
//             operand_index: 0,
//             external: false,
//           },
//         },
//         {
//           source_address: base,
//           target_address: endpoint,
//           source_procedure: procedure(base, "dispatch"),
//           target_procedure: null,
//           kind: {
//             available: true,
//             provenance: "provider-reference-manager",
//             type: "READ",
//             flow: false,
//             call: false,
//             jump: false,
//             data: true,
//             read: true,
//             write: false,
//             indirect: false,
//             computed: false,
//             conditional: false,
//             terminal: false,
//             primary: true,
//             operand_index: 1,
//             external: false,
//           },
//         },
//       ];
//       const strings = [
//         { address: endpoint, source_address: base, value: "caf\u00e9" },
//         { address: endpoint, source_address: base, value: "cafe\u0301" },
//         { address: endpoint, source_address: base, value: "cafe\u0301" },
//       ];
//       return functionDossierSchema.parse({
//         ...dossier("return 0;", base),
//         callees: [composed, decomposed, composed],
//         incoming_references: reverse ? [...edges].reverse() : edges,
//         outgoing_references: reverse ? [...edges].reverse() : edges,
//         referenced_strings: reverse ? [...strings].reverse() : strings,
//         referenced_names: reverse ? [...strings].reverse() : strings,
//       });
//     };
//     const makeEvidence = (digit: string, result: unknown): Evidence =>
//       createEvidence(
//         {
//           path: `/tmp/function-${digit}`,
//           sha256: digit.repeat(64),
//           format: "mach-o",
//         },
//         { id: "rea-workflow", name: "REA workflow", version: "1" },
//         {
//           operation: "analyze_function",
//           parameters: enhancedInputSchemas.analyze_function.parse({
//             procedure: "dispatch",
//           }),
//           result: jsonValueSchema.parse(result),
//           confidence: "derived",
//           authority: "shipped-artifact",
//           relationshipCoverage: { status: "complete" },
//         },
//       );
//     const left = controlled("0x1000", false);
//     const right = controlled("0x2000", true);
//     const rightWithoutNativeApi = { ...right, native_api: null };
//
//     const comparison = compareFunctions(
//       makeEvidence("d", left),
//       makeEvidence("e", rightWithoutNativeApi),
//     );
//
//     for (const dimension of ["calls", "strings_names"] as const)
//       expect(
//         comparison.dimensions.find((item) => item.dimension === dimension),
//       ).toMatchObject({ status: "unchanged" });
//     // Unnamed endpoints in different artifacts have no stable identity.
//     expect(
//       comparison.dimensions.find((item) => item.dimension === "references"),
//     ).toMatchObject({
//       status: "unknown",
//       limitations: expect.arrayContaining([
//         expect.stringContaining("Unnamed reference endpoints"),
//       ]),
//     });
//     expect(comparison.status).toBe("unknown");
//   });
// });
//
// describe("function comparison CFG address normalization", () => {
//   it("matches CFG successors by numeric address", () => {
//     const make = (base: "0x1000" | "0x2000") =>
//       functionDossierSchema.parse({
//         ...dossier("return 0;", base),
//         basic_blocks: [
//           {
//             start: base,
//             end: base === "0x1000" ? "0x1004" : "0x2004",
//             successors: [base === "0x1000" ? "0X01004" : "0x2004"],
//           },
//           {
//             start: base === "0x1000" ? "0x1004" : "0x2004",
//             end: base === "0x1000" ? "0x1008" : "0x2008",
//             successors: [],
//           },
//         ],
//       });
//     expect(
//       compareFunctions(
//         observe("b", make("0x1000")),
//         observe("c", make("0x2000")),
//       ).dimensions.find(({ dimension }) => dimension === "cfg"),
//     ).toMatchObject({ status: "unchanged" });
//   });
//
//   it("keeps duplicate numeric block starts unknown", () => {
//     const duplicate = functionDossierSchema.parse({
//       ...dossier("return 0;", "0x1000"),
//       basic_blocks: [
//         { start: "0x1000", end: "0x1004", successors: [] },
//         { start: "0X01000", end: "0x1008", successors: [] },
//       ],
//     });
//     expect(
//       compareFunctions(
//         observe("d", duplicate),
//         observe("e", duplicate),
//       ).dimensions.find(({ dimension }) => dimension === "cfg"),
//     ).toMatchObject({ status: "unknown" });
//   });
// });
//
// describe("function comparison unresolved text", () => {
//   it("qualifies exact text changes caused by relocated provider labels", () => {
//     const left = observe(
//       "2",
//       functionDossierSchema.parse({
export const _l = 333;
