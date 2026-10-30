export const __stub = 1;
//   it("propagates an incompatible nested branch through an outer union", () => {
//     expect(
//       valueOf(
//         'condition ? (choice ? "one" : "two") : (other ? "three" : missing)',
//       ),
//     ).toEqual(incompatibleValue);
//   });
// });
//
// describe("logical primitive unions", () => {
//   // Each left-hand set can select the unresolved right-hand operand at runtime.
//   const operators = [
//     {
//       operator: "||",
//       alternatives: [
//         '""',
//         '(choice ? "" : "one")',
//         '(choice ? "" : other ? "one" : "two")',
//       ],
//     },
//     {
//       operator: "&&",
//       alternatives: [
//         '"one"',
//         '(choice ? 0 : "one")',
//         '(choice ? 0 : other ? "one" : "two")',
//       ],
//     },
//     {
//       operator: "??",
//       alternatives: [
//         "null",
//         '(choice ? null : "one")',
//         '(choice ? null : other ? "one" : "two")',
//       ],
//     },
//   ];
//   const cases = operators.flatMap(({ operator, alternatives }) =>
//     alternatives.flatMap((known) =>
//       ["missing", "unsupported()"].flatMap((other) => [
//         `${known} ${operator} ${other}`,
//         `${other} ${operator} ${known}`,
//       ]),
//     ),
//   );
//
//   it("preserves unresolved alternatives across logical expressions", () => {
//     expect(valuesOf(cases)).toEqual(cases.map(() => incompatibleValue));
//   });
//
//   const exactCases = [
//     [
//       '(choice ? "" : "one") || "two"',
//       { status: "union", values: ["", "one", "two"] },
//     ],
//     [
//       '(choice ? 0 : "one") && "two"',
//       { status: "union", values: [0, "one", "two"] },
//     ],
//     [
//       '(choice ? null : "one") ?? "two"',
//       { status: "union", values: [null, "one", "two"] },
//     ],
//     ['"one" || "one"', { status: "literal", value: "one" }],
//     ["null ?? null", { status: "literal", value: null }],
//   ] as const;
//
//   it("retains conservative primitive unions across logical expressions", () => {
//     expect(valuesOf(exactCases.map(([expression]) => expression))).toEqual(
//       exactCases.map(([, expected]) => expected),
//     );
//   });
//
//   const unevaluatedCases = [
//     'true ? "one" : missing',
//     '"one" || missing',
//     "false && missing",
//     '"one" ?? missing',
//   ];
//
//   it("does not introduce short-circuit evaluation", () => {
//     expect(valuesOf(unevaluatedCases)).toEqual(
//       unevaluatedCases.map(() => incompatibleValue),
//     );
//   });
// });
//
// describe("semantic primitive resource observations", () => {
//   it.each([
//     {
//       name: "member",
//       source: (large: string) =>
//         `const answer = (${JSON.stringify(large)}).field;`,
//     },
//     {
//       name: "destructuring",
//       source: (large: string) =>
//         `const { nested: { answer } } = { nested: ${JSON.stringify(large)} };`,
//     },
//   ])("preserves a limiting value through $name projection", ({ source }) => {
//     const ir = analyzeJavaScriptSemantics(source("x".repeat(200_000)));
//     expect(topLevelBinding(ir, "answer").value).toMatchObject({
//       status: "unknown",
//       resourceLimit: "primitive-bytes",
//     });
//     expect(ir.coverage).toMatchObject({
//       status: "partial",
//       resourceLimits: ["primitive-bytes"],
//     });
//   });
//
//   it("records an encountered bound without weakening a selected healthy sibling", () => {
//     const ir = analyzeJavaScriptSemantics(
//       `const answer = ({ ignored: ${JSON.stringify("x".repeat(200_000))}, kept: 7 }).kept;`,
//     );
//     expect(topLevelBinding(ir, "answer").value).toEqual({
//       status: "literal",
//       value: 7,
//     });
//     expect(ir.coverage).toMatchObject({
//       status: "partial",
//       resourceLimits: ["primitive-bytes"],
//     });
//   });
// });
//
// describe("configuration default normalization", () => {
//   it.each(["quoted", "template"])(
//     "normalizes a bare %s configuration default",
//     (syntax) => {
//       const large = "x".repeat(200_000);
//       const expression =
//         syntax === "quoted" ? JSON.stringify(large) : `\`${large}\``;
//       const ir = analyzeJavaScriptSemantics(
export const _l = 134;
