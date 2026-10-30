export const __stub = 1;
//       value: "inner",
//     });
//     expect(
//       ir.callables.find(({ name }) => name === "readsMutation")?.returnSites[0]
//         ?.value.status,
//     ).toBe("ambiguous");
//   });
//
//   it("retains a large derived string while its aggregate JSON estimate fits", () => {
//     const part = "x".repeat(32_768);
//     const ir = analyzeJavaScriptSemantics(
//       `const left = ${JSON.stringify(part)}; const right = ${JSON.stringify(part)}; const answer = left + right;`,
//     );
//     expect(topLevelBinding(ir, "answer").value).toMatchObject({
//       status: "literal",
//       value: expect.stringMatching(/^x+$/u),
//     });
//     const value = topLevelBinding(ir, "answer").value;
//     if (value.status !== "literal" || typeof value.value !== "string")
//       throw new Error("Expected exact derived string");
//     expect(value.value.length).toBe(65_536);
//     expect(ir.coverage.status).toBe("complete");
//   });
//
//   it("retains exact candidates for a near-budget Cartesian workload", () => {
//     const left = "l".repeat(85);
//     const right = "r".repeat(85);
//     const expression = Array.from(
//       { length: 7 },
//       () =>
//         `(${JSON.stringify(left)} + (${`choice ? ${JSON.stringify(left)} : ${JSON.stringify(right)}`}))`,
//     ).join(" + ");
//     const value = valueOf(expression);
//     expect(value.status).toBe("union");
//     if (value.status !== "union")
//       throw new Error("Expected exact primitive union");
//     expect(value.values).toHaveLength(128);
//     expect(
//       value.values.every(
//         (candidate) =>
//           typeof candidate === "string" && candidate.length === 1_190,
//       ),
//     ).toBe(true);
//   });
// });
//
// describe("semantic expression depth bounds", () => {
//   it("returns an explicit unknown for a deeply nested unary AST without throwing", () => {
//     const parsed = parseJavaScriptSource("const answer = true;");
//     const declaration = parsed?.program.body[0];
//     const declarator = t.isVariableDeclaration(declaration)
//       ? declaration.declarations[0]
//       : undefined;
//     if (parsed === null || !t.isVariableDeclarator(declarator))
//       throw new Error("Expected parsed binding initializer");
//     let expression: t.Expression = t.booleanLiteral(true);
//     for (let index = 0; index < 5_000; index += 1)
//       expression = t.unaryExpression("!", expression, true);
//     declarator.init = expression;
//
//     const ir = analyzeParsedJavaScriptSemantics(parsed);
//     expect(ir.coverage).toMatchObject({
//       status: "partial",
//       omittedCount: null,
//       resourceLimits: ["expression-depth"],
//     });
//     expect(topLevelBinding(ir, "answer").value).toEqual({
//       status: "unknown",
//       resourceLimit: "expression-depth",
//       reason: expect.stringMatching(
//         /semantic expression depth budget exceeded/i,
//       ),
//     });
//   });
//
//   it("bounds nested conditional evaluation and provenance walks", () => {
//     const parsed = parseJavaScriptSource("const answer = true;");
//     const declaration = parsed?.program.body[0];
//     const declarator = t.isVariableDeclaration(declaration)
//       ? declaration.declarations[0]
//       : undefined;
//     if (parsed === null || !t.isVariableDeclarator(declarator))
//       throw new Error("Expected parsed binding initializer");
//     let expression: t.Expression = t.booleanLiteral(true);
//     for (let index = 0; index < 5_000; index += 1)
//       expression = t.conditionalExpression(
//         t.identifier("condition"),
//         expression,
//         t.booleanLiteral(false),
//       );
//     declarator.init = expression;
//
//     const ir = analyzeParsedJavaScriptSemantics(parsed);
//     const value = topLevelBinding(ir, "answer").value;
//     expect(value).toMatchObject({
//       status: "unknown",
//       resourceLimit: "expression-depth",
//       reason: expect.stringMatching(
//         /semantic expression depth budget exceeded/i,
//       ),
//     });
//   });
//
//   it("counts erased TypeScript wrappers against expression depth", () => {
//     const parsed = parseJavaScriptSource("const answer = true;");
//     const declaration = parsed?.program.body[0];
//     const declarator = t.isVariableDeclaration(declaration)
//       ? declaration.declarations[0]
//       : undefined;
//     if (parsed === null || !t.isVariableDeclarator(declarator))
//       throw new Error("Expected parsed binding initializer");
//     let expression: t.Expression = t.booleanLiteral(true);
//     for (let index = 0; index < 300; index += 1)
//       expression = t.tsAsExpression(expression, t.tsStringKeyword());
//     declarator.init = expression;
//
//     const ir = analyzeParsedJavaScriptSemantics(parsed);
//     expect(topLevelBinding(ir, "answer").value).toMatchObject({
//       status: "unknown",
//       resourceLimit: "expression-depth",
//     });
//   });
//
//   it("preserves exact shallow addition alternatives", () => {
//     expect(valueOf('(choice ? "a" : "b") + (other ? "1" : "2")')).toEqual({
//       status: "union",
//       values: ["a1", "a2", "b1", "b2"],
//     });
//   });
// });
export const _l = 130;
