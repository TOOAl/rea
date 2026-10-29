export const __stub = 1;
//         right_evidence_ids: [fourth.evidence_id, right.evidence_id],
//       },
//     ]);
//   });
// });
//
// describe("historical calls-only reconstruction changes", () => {
//   it.each(["missing", "unknown", "partial", "unresolved"] as const)(
//     "keeps historical calls-only changes unknown with %s call coverage",
//     (coverage) => {
//       const changedDossier = functionDossierSchema.parse({
//         ...functionDossierSchema.parse(dossier),
//         callees: [
//           {
//             address: "0x2000",
//             name: "puts",
//             classification: null,
//             body: { available: false, reason: "External function." },
//           },
//         ],
//       });
//       const complete = source("8", {
//         result: jsonValueSchema.parse(changedDossier),
//       });
//       const incomplete = source(
//         "9",
//         {
//           result: jsonValueSchema.parse({
//             ...changedDossier,
//             ...(coverage === "unresolved"
//               ? {
//                   unresolved_calls: [
//                     {
//                       address: "0x1004",
//                       reason: "Computed target unresolved.",
//                     },
//                   ],
//                 }
//               : {}),
//           }),
//           ...(coverage === "missing"
//             ? {}
//             : {
//                 relationshipCoverage:
//                   coverage === "unknown"
//                     ? { status: "unknown", reason: "Call graph unavailable." }
//                     : coverage === "partial"
//                       ? {
//                           status: "partial",
//                           limitations: ["Additional edges omitted."],
//                         }
//                       : { status: "complete" },
//               }),
//         },
//         true,
//         coverage !== "missing",
//       );
//       const historicalResult = compareFunctions(left, complete);
//       expect(historicalResult).toMatchObject({
//         status: "changed",
//         summary: { changed: 1 },
//       });
//       expect(historicalResult.changes).toMatchObject([
//         { dimension: "calls", status: "changed" },
//       ]);
//       const completeComparison = comparison(
//         {
//           left_evidence_id: left.evidence_id,
//           right_evidence_id: complete.evidence_id,
//         },
//         {},
//         [left, complete],
//         {},
//         historicalResult,
//       );
//       expect(
//         admittedVerification(completeComparison, [left, complete], "overall")()
//           .status,
//       ).toBe("fail");
//       const evidence = comparison(
//         {
//           left_evidence_id: left.evidence_id,
//           right_evidence_id: incomplete.evidence_id,
//         },
//         {},
//         [left, incomplete],
//         {},
//         historicalResult,
//       );
//       const before = JSON.stringify(evidence);
//       for (const dimension of ["calls", "overall"] as const) {
//         expect(
//           admittedVerification(evidence, [left, incomplete], dimension)(),
//         ).toMatchObject({
//           status: "unknown",
//           summary: { total: 1, passed: 0, failed: 0, unknown: 1 },
//           claims: {
//             items: [
//               expect.objectContaining({
//                 status: "unknown",
//                 observed_status: "changed",
//                 limitations: expect.arrayContaining([
//                   expect.stringContaining(`Source ${incomplete.evidence_id}:`),
//                 ]),
//               }),
//             ],
//           },
//         });
//       }
//       expect(
//         admittedVerification(evidence, [left, incomplete], "pseudocode")()
//           .status,
//       ).toBe("pass");
//       expect(JSON.stringify(evidence)).toBe(before);
//     },
//   );
// });
//
// describe("function reconstruction call coverage", () => {
//   it("preserves complete call diagnostics while passing equal call claims", () => {
//     const diagnostic = "Indirect calls remain unresolved.";
//     const leftWithDiagnostic = source("a", {
//       relationshipCoverage: { status: "complete", diagnostics: [diagnostic] },
//     });
//     const rightWithDiagnostic = source("b", {
//       relationshipCoverage: { status: "complete", diagnostics: [diagnostic] },
//     });
//     const observed = compareFunctions(leftWithDiagnostic, rightWithDiagnostic);
//     expect(
//       observed.dimensions.find(({ dimension }) => dimension === "calls"),
//     ).toMatchObject({
//       status: "unchanged",
//       limitations: [`Left: ${diagnostic}`, `Right: ${diagnostic}`],
//     });
//     const evidence = comparison(
//       {
//         left_evidence_id: leftWithDiagnostic.evidence_id,
//         right_evidence_id: rightWithDiagnostic.evidence_id,
//       },
//       {},
//       [leftWithDiagnostic, rightWithDiagnostic],
//       {},
//       observed,
//     );
//     expect(
//       admittedVerification(
//         evidence,
//         [leftWithDiagnostic, rightWithDiagnostic],
//         "calls",
//       )(),
//     ).toMatchObject({
//       status: "pass",
//       claims: {
//         items: [
//           expect.objectContaining({
//             status: "pass",
//             observed_status: "unchanged",
//             limitations: expect.arrayContaining([
//               `Source ${leftWithDiagnostic.evidence_id}: ${diagnostic}`,
//               `Source ${rightWithDiagnostic.evidence_id}: ${diagnostic}`,
//             ]),
//           }),
//         ],
//       },
//     });
//   });
//
//   it("rechecks old unchanged comparisons without affecting unrelated finite dimensions", () => {
//     const incomplete = source("7", {
//       relationshipCoverage: {
//         status: "unknown",
//         reason: "Call graph unavailable.",
//         diagnostics: ["Indirect calls remain unresolved."],
//       },
//     });
//     const incompleteSides = {
//       left_evidence_id: left.evidence_id,
//       right_evidence_id: incomplete.evidence_id,
//     };
//     const oldUnchanged = comparison(incompleteSides, {}, [left, incomplete]);
//     for (const dimension of ["calls", "overall"] as const) {
//       const result = admittedVerification(
//         oldUnchanged,
//         [left, incomplete],
//         dimension,
//       )();
//       expect(result).toMatchObject({
//         status: "unknown",
//         summary: { total: 1, passed: 0, failed: 0, unknown: 1 },
//         claims: {
//           items: [
//             expect.objectContaining({
//               dimension,
//               status: "unknown",
//               observed_status: "unchanged",
//               limitations: expect.arrayContaining([
//                 `Source ${incomplete.evidence_id}: Call graph unavailable.`,
//                 `Source ${incomplete.evidence_id}: Indirect calls remain unresolved.`,
//               ]),
//             }),
//           ],
//         },
//       });
//     }
//     expect(
//       admittedVerification(oldUnchanged, [left, incomplete], "pseudocode")(),
export const _l = 206;
