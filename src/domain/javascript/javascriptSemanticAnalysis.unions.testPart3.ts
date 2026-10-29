export const __stub = 1;
//         `process.env.MODE ?? ${expression};`,
//       );
//       const operation = ir.configurationOperations.find(
//         ({ kind }) => kind === "default",
//       );
//       expect(
//         typeof operation?.value === "string" ? operation.value.length : 0,
//       ).toBeLessThanOrEqual(174_762);
//       expect(operation).toMatchObject({
//         value: null,
//         resolution: "partial",
//         valueResourceLimit: "primitive-bytes",
//       });
//       expect(ir.coverage).toMatchObject({
//         status: "partial",
//         resourceLimits: ["primitive-bytes"],
//       });
//     },
//   );
//
//   it.each([null, false, 0, ""])(
//     "keeps an exact bounded configuration default %j",
//     (value) => {
//       const ir = analyzeJavaScriptSemantics(
//         `process.env.MODE ?? ${JSON.stringify(value)};`,
//       );
//       expect(
//         ir.configurationOperations.find(({ kind }) => kind === "default"),
//       ).toMatchObject({ value, resolution: "complete" });
//       expect(ir.coverage.resourceLimits ?? []).toEqual([]);
//     },
//   );
// });
//
// describe("semantic primitive allocation and binding reuse", () => {
//   it.each(["quoted", "template"])(
//     "applies the normalized byte boundary to %s literals",
//     (syntax) => {
//       // Six estimated JSON bytes per UTF-16 code unit plus two quotes:
//       // 174762 code units fit; one more exceeds the 1 MiB bound.
//       for (const length of [174_762, 174_763]) {
//         const text = "x".repeat(length);
//         const expression =
//           syntax === "quoted" ? JSON.stringify(text) : `\`${text}\``;
//         const ir = analyzeJavaScriptSemantics(`const answer = ${expression};`);
//         const value = topLevelBinding(ir, "answer").value;
//         if (length === 174_762) {
//           expect(value.status).toBe("literal");
//           if (value.status !== "literal")
//             throw new Error("Expected exact value");
//           expect(typeof value.value === "string" && value.value.length).toBe(
//             length,
//           );
//           expect(ir.coverage.resourceLimits ?? []).toEqual([]);
//         } else {
//           expect(value.status).toBe("unknown");
//           expect(value).toMatchObject({ resourceLimit: "primitive-bytes" });
//           expect(ir.coverage).toMatchObject({
//             status: "partial",
//             omittedCount: null,
//             resourceLimits: ["primitive-bytes"],
//           });
//         }
//       }
//     },
//   );
//
//   it("returns an explicit unknown before expanding a large addition product", () => {
//     const term = '(choice ? "a" : "b")';
//     const expression = Array.from({ length: 20 }, () => term).join(" + ");
//     const value = valueOf(expression);
//     expect(value).toMatchObject({
//       status: "unknown",
//       resourceLimit: "primitive-candidates",
//       reason: expect.stringMatching(/primitive candidate budget exceeded/i),
//     });
//     expect(
//       analyzeJavaScriptSemantics(`const answer = ${expression};`).coverage,
//     ).toMatchObject({
//       status: "partial",
//       omittedCount: null,
//       resourceLimits: ["primitive-candidates"],
//     });
//   });
//
//   it("bounds derived single-string growth before concatenation or key serialization", () => {
//     const declarations = ['const value0 = "x";'];
//     for (let index = 1; index <= 100; index += 1) {
//       const previous = `value${String(index - 1)}`;
//       declarations.push(
//         `const value${String(index)} = ${previous} + ${previous};`,
//       );
//     }
//     declarations.push("const answer = value100;");
//     const ir = analyzeJavaScriptSemantics(declarations.join("\n"));
//     expect(topLevelBinding(ir, "answer").value).toMatchObject({
//       status: "unknown",
//       resourceLimit: "primitive-bytes",
//       reason: expect.stringMatching(/primitive string-byte budget exceeded/i),
//     });
//     expect(ir.coverage).toMatchObject({
//       status: "partial",
//       omittedCount: null,
//       resourceLimits: expect.arrayContaining(["primitive-bytes"]),
//     });
//   });
//
//   it("memoizes by resolved binding without crossing shadowing or mutation", () => {
//     const ir = analyzeJavaScriptSemantics(`
//       const shared = "outer";
//       function readsOuter() { return shared; }
//       function readsShadow() { const shared = "inner"; return shared; }
//       function readsMutation() {
//         let shared = "before";
//         shared = "after";
//         return shared;
//       }
//     `);
//     expect(topLevelBinding(ir, "shared").value).toEqual({
//       status: "literal",
//       value: "outer",
//     });
//     expect(
//       ir.callables.find(({ name }) => name === "readsOuter")?.returnSites[0]
//         ?.value,
//     ).toEqual({
//       status: "literal",
//       value: "outer",
//     });
//     expect(
//       ir.callables.find(({ name }) => name === "readsShadow")?.returnSites[0]
//         ?.value,
//     ).toEqual({
//       status: "literal",
export const _l = 134;
