export const __stub = 1;
//     ).toMatchObject({
//       status: "pass",
//       claims: {
//         items: [
//           expect.objectContaining({
//             dimension: "pseudocode",
//             status: "pass",
//             observed_status: "unchanged",
//           }),
//         ],
//       },
//     });
//   });
//
//   it("keeps a confirmed historical overall change as a failure despite unknown calls", () => {
//     const changedDossier = jsonValueSchema.parse({
//       ...functionDossierSchema.parse(dossier),
//       pseudocode: "return 1;",
//     });
//     const changedComplete = source("8", { result: changedDossier });
//     const incomplete = source("9", {
//       result: changedDossier,
//       relationshipCoverage: {
//         status: "unknown",
//         reason: "Call graph unavailable.",
//       },
//     });
//     const changedResult = compareFunctions(left, changedComplete);
//     const oldChanged = comparison(
//       {
//         left_evidence_id: left.evidence_id,
//         right_evidence_id: incomplete.evidence_id,
//       },
//       {},
//       [left, incomplete],
//       {},
//       changedResult,
//     );
//     expect(oldChanged.normalized_result).toMatchObject({ status: "changed" });
//     expect(
//       admittedVerification(oldChanged, [left, incomplete], "overall")(),
//     ).toMatchObject({
//       status: "fail",
//       summary: { total: 1, passed: 0, failed: 1, unknown: 0 },
//       claims: {
//         items: [
//           expect.objectContaining({
//             status: "fail",
//             observed_status: "changed",
//           }),
//         ],
//       },
//     });
//   });
// });
//
// describe("function reconstruction source aliases", () => {
//   it.each([
//     ["no source declarations", {}],
//     ["missing right singular", { left_evidence_id: left.evidence_id }],
//     ["missing left singular", { right_evidence_id: right.evidence_id }],
//     ["missing right plural", { left_evidence_ids: [left.evidence_id] }],
//     ["missing left plural", { right_evidence_ids: [right.evidence_id] }],
//     [
//       "mixed left singular/right plural",
//       {
//         left_evidence_id: left.evidence_id,
//         right_evidence_ids: [right.evidence_id],
//       },
//     ],
//     [
//       "mixed left plural/right singular",
//       {
//         left_evidence_ids: [left.evidence_id],
//         right_evidence_id: right.evidence_id,
//       },
//     ],
//     [
//       "partial singular alias with plural pair",
//       { ...plural, left_evidence_id: left.evidence_id },
//     ],
//     [
//       "other partial singular alias with plural pair",
//       { ...plural, right_evidence_id: right.evidence_id },
//     ],
//     [
//       "partial plural alias with singular pair",
//       { ...singular, left_evidence_ids: [left.evidence_id] },
//     ],
//     [
//       "other partial plural alias with singular pair",
//       { ...singular, right_evidence_ids: [right.evidence_id] },
//     ],
//     [
//       "contradictory left alias",
//       { ...singular, ...plural, left_evidence_ids: [extra.evidence_id] },
//     ],
//     [
//       "contradictory right alias",
//       { ...singular, ...plural, right_evidence_ids: [extra.evidence_id] },
//     ],
//     [
//       "reversed aliases",
//       {
//         ...singular,
//         left_evidence_ids: [right.evidence_id],
//         right_evidence_ids: [left.evidence_id],
//       },
//     ],
//     [
//       "extra left alias ID",
//       {
//         ...singular,
//         ...plural,
//         left_evidence_ids: [left.evidence_id, extra.evidence_id],
//       },
//     ],
//     [
//       "extra right alias ID",
//       {
//         ...singular,
//         ...plural,
//         right_evidence_ids: [right.evidence_id, extra.evidence_id],
//       },
//     ],
//   ] satisfies [string, Record<string, JsonValue>][])(
//     "rejects %s after valid digest admission",
//     (_name, parameters) => {
//       expect(admittedVerification(comparison(parameters))).toThrow();
//     },
//   );
// });
//
// describe("function reconstruction malformed source IDs", () => {
//   it.each(
//     (
//       [
//         null,
//         false,
//         7,
//         "",
//         "ev_invalid",
//         [],
//         [left.evidence_id],
//         { id: left.evidence_id },
//       ] satisfies JsonValue[]
//     ).map((invalid) => ({ invalid })),
//   )(
//     "rejects malformed singular values $invalid without falling back to plural aliases",
//     ({ invalid }) => {
//       for (const field of ["left_evidence_id", "right_evidence_id"]) {
//         for (const aliases of [{}, plural]) {
//           expect(
//             admittedVerification(
//               comparison({ ...singular, ...aliases, [field]: invalid }),
//             ),
//           ).toThrow();
//         }
//       }
//     },
//   );
//
//   it.each(
//     (
//       [
//         null,
//         false,
//         7,
//         "",
//         left.evidence_id,
//         [],
//         ["ev_invalid"],
//         [null],
//         { id: left.evidence_id },
//       ] satisfies JsonValue[]
//     ).map((invalid) => ({ invalid })),
//   )(
//     "rejects malformed plural values $invalid even with valid singular aliases",
//     ({ invalid }) => {
//       for (const field of ["left_evidence_ids", "right_evidence_ids"]) {
//         for (const aliases of [{}, singular]) {
//           expect(
//             admittedVerification(
//               comparison({ ...plural, ...aliases, [field]: invalid }),
//             ),
//           ).toThrow();
//         }
//       }
//     },
//   );
//
//   it.each([
//     [
//       "duplicate left plural source",
//       { ...plural, left_evidence_ids: [left.evidence_id, left.evidence_id] },
//     ],
//     [
//       "duplicate right plural source",
//       { ...plural, right_evidence_ids: [right.evidence_id, right.evidence_id] },
//     ],
//   ])("rejects %s", (_name, parameters) => {
//     expect(admittedVerification(comparison(parameters))).toThrow(
//       /repeats a source within one side/u,
//     );
//   });
// });
export const _l = 206;
