export const __stub = 1;
// import * as t from "@babel/types";
// import { describe, expect, it } from "vitest";
//
// import {
//   analyzeJavaScriptSemantics,
//   analyzeParsedJavaScriptSemantics,
// } from "./javascriptSemanticAnalysis.js";
// import { topLevelBinding } from "./javascriptSemanticAnalysis.fixture.js";
// import { parseJavaScriptSource } from "./javascriptSourceParser.js";
// import { readExactJavaScriptLiteral } from "./javascriptAstValues.js";
//
// const conditionalCandidates = [
//   '"one"',
//   '(choice ? "one" : "two")',
//   '(choice ? "one" : other ? "two" : "three")',
// ];
// const incompatibleValue = {
//   status: "ambiguous",
//   reason: "Branches have incompatible values.",
// };
//
// const valueOf = (expression: string) =>
//   topLevelBinding(
//     analyzeJavaScriptSemantics(`const answer = ${expression};`),
//     "answer",
//   ).value;
//
// describe("exact JavaScript literal reader", () => {
//   it("reads cooked atoms and rejects raw-only or interpolated templates", () => {
//     const cookedElement = t.templateElement(
//       { raw: "raw", cooked: "raw" },
//       true,
//     );
//     cookedElement.value.cooked = "cooked";
//     const rawOnlyElement = t.templateElement(
//       { raw: "raw", cooked: "raw" },
//       true,
//     );
//     rawOnlyElement.value.cooked = null;
//     expect(readExactJavaScriptLiteral(t.stringLiteral(""))).toEqual({
//       found: true,
//       value: "",
//     });
//     expect(
//       readExactJavaScriptLiteral(t.templateLiteral([cookedElement], [])),
//     ).toEqual({ found: true, value: "cooked" });
//     expect(
//       readExactJavaScriptLiteral(t.templateLiteral([rawOnlyElement], [])),
//     ).toEqual({ found: false });
//     expect(
//       readExactJavaScriptLiteral(
//         t.templateLiteral(
//           [
//             t.templateElement({ raw: "", cooked: "" }, false),
//             t.templateElement({ raw: "", cooked: "" }, true),
//           ],
//           [t.identifier("value")],
//         ),
//       ),
//     ).toEqual({ found: false });
//   });
// });
// const valuesOf = (expressions: readonly string[]) => {
//   const ir = analyzeJavaScriptSemantics(
//     expressions
//       .map(
//         (expression, index) =>
//           `const candidate${String(index)} = ${expression};`,
//       )
//       .join("\n"),
//   );
//   return expressions.map(
//     (_, index) => topLevelBinding(ir, `candidate${String(index)}`).value,
//   );
// };
//
// describe("conditional primitive unions", () => {
//   const cases = conditionalCandidates.flatMap((known) =>
//     [
//       "missing",
//       "unsupported()",
//       '({ key: "value" })',
//       '["value"]',
//       '+"invalid"',
//       "1e309",
//       "1e308 + 1e308",
//     ].flatMap((other) => [
//       `condition ? ${known} : ${other}`,
//       `condition ? ${other} : ${known}`,
//     ]),
//   );
//
//   it("preserves incompatible alternatives across conditional expressions", () => {
//     expect(valuesOf(cases)).toEqual(cases.map(() => incompatibleValue));
//   });
//
//   const exactCases = [
//     [
//       'condition ? (choice ? "two" : "one") : "three"',
//       { status: "union", values: ["one", "three", "two"] },
//     ],
//     [
//       'condition ? "three" : (choice ? "two" : "one")',
//       { status: "union", values: ["one", "three", "two"] },
//     ],
//     [
//       'condition ? (choice ? "two" : "one") : (other ? "one" : "three")',
//       { status: "union", values: ["one", "three", "two"] },
//     ],
//     [
//       'condition ? (choice ? "two" : "one") : (other ? "one" : "two")',
//       { status: "union", values: ["one", "two"] },
//     ],
//     [
//       'condition ? (choice ? "one" : "one") : "one"',
//       { status: "literal", value: "one" },
//     ],
//     [
//       'condition ? (choice ? "one" : "two") : null',
//       { status: "union", values: [null, "one", "two"] },
//     ],
//     [
//       'condition ? null : (choice ? "one" : "two")',
//       { status: "union", values: [null, "one", "two"] },
//     ],
//     ["condition ? null : null", { status: "literal", value: null }],
//   ] as const;
//
//   it("retains exact primitive candidates across conditional expressions", () => {
//     expect(valuesOf(exactCases.map(([expression]) => expression))).toEqual(
//       exactCases.map(([, expected]) => expected),
//     );
//   });
//
export const _l = 134;
