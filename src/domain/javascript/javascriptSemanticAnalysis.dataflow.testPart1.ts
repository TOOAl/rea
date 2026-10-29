export const __stub = 1;
// import { describe, expect, it } from "vitest";
//
// import { analyzeJavaScriptSemantics } from "./javascriptSemanticAnalysis.js";
// import {
//   onlyCallable,
//   topLevelBinding,
// } from "./javascriptSemanticAnalysis.fixture.js";
//
// describe("JavaScript semantic analysis: dataflow 1", () => {
//   it("recovers static object reads, writes, spreads, and destructuring", () => {
//     const ir = analyzeJavaScriptSemantics(`
//       const source = { token: "TOKEN", count: 1 };
//       const { token } = source;
//       const copy = { ...source };
//       source.count = 2;
//       const read = source.token;
//     `);
//
//     expect(
//       ir.objectOperations.map(({ kind, propertyPath, resolution }) => ({
//         kind,
//         propertyPath,
//         resolution,
//       })),
//     ).toEqual(
//       expect.arrayContaining([
//         {
//           kind: "destructure",
//           propertyPath: ["token"],
//           resolution: "complete",
//         },
//         { kind: "spread", propertyPath: [], resolution: "complete" },
//         { kind: "write", propertyPath: ["count"], resolution: "complete" },
//         { kind: "read", propertyPath: ["token"], resolution: "complete" },
//       ]),
//     );
//   });
//
//   it("does not invent property names for dynamic destructuring keys", () => {
//     const ir = analyzeJavaScriptSemantics(`
//       const source = { token: "TOKEN" };
//       const key = getKey();
//       const { [key]: dynamic } = source;
//       const { ["token"]: literal } = source;
//       const { token: renamed } = source;
//       const { token } = source;
//       const { [1]: numeric } = source;
//     `);
//     const destructures = ir.objectOperations.filter(
//       ({ kind }) => kind === "destructure",
//     );
//
//     expect(destructures.map(({ propertyPath }) => propertyPath)).toEqual([
//       ["token"],
//       ["token"],
//       ["token"],
//       ["1"],
//     ]);
//     expect(
//       destructures.every(({ resolution }) => resolution === "complete"),
//     ).toBe(true);
//     expect(topLevelBinding(ir, "dynamic").value.status).toBe("unknown");
//   });
//
//   it("does not project positional argument flow after a spread", () => {
//     const ir = analyzeJavaScriptSemantics(`
//       function target(first, second, third) { return third; }
//       target(one, ...rest, three);
//     `);
//
//     expect(ir.argumentFlows.map(({ argumentIndex }) => argumentIndex)).toEqual([
//       0,
//     ]);
//   });
//
//   it("retains all statically recovered call, flow, capture, and frontier facts", () => {
//     const ir = analyzeJavaScriptSemantics(
//       `
//         const captured = 1;
//         function target(value, other) { return value + other + captured; }
//         target(1, 2);
//         target(3, 4);
//         object[first];
//         object[second];
//       `,
//     );
//
//     expect(ir.callSites).toHaveLength(2);
//     expect(ir.callSites.map(({ arguments: args }) => args)).toEqual([
//       [
//         expect.objectContaining({ index: 0, spread: false }),
//         expect.objectContaining({ index: 1, spread: false }),
//       ],
//       [
//         expect.objectContaining({ index: 0, spread: false }),
//         expect.objectContaining({ index: 1, spread: false }),
//       ],
//     ]);
//     expect(ir.argumentFlows).toHaveLength(4);
//     expect(ir.callReturnFlows).toHaveLength(2);
//     expect(ir.closureCaptures).toHaveLength(1);
//     expect(ir.frontiers).toHaveLength(2);
//     expect(ir.coverage.status).toBe("complete");
//   });
//
//   it("recovers only direct return sites with literal and unknown object fields", () => {
//     const ir = analyzeJavaScriptSemantics(`
//       export default function parseMarkdown(value) {
//         if (value.startsWith("# "))
//           return { type: "heading", depth: 1, text: value.slice(2) };
//         function nested() { return { type: "nested" }; }
//         const arrow = () => ({ type: "arrow" });
//         void nested; void arrow;
//         return { type: "paragraph", text: value.replaceAll("x", "y") };
//       }
//     `);
//
//     const parse = onlyCallable(ir, "parseMarkdown");
//     expect(parse.returnCoverage).toEqual({
//       status: "complete",
//       retainedCount: 2,
//       omittedCount: 0,
//     });
//     expect(parse.returnSites).toHaveLength(2);
//     expect(parse.returnSites[0]?.value).toMatchObject({
//       status: "object",
//       unknownProperties: false,
//       omittedProperties: 0,
//       properties: expect.arrayContaining([
//         {
//           name: "depth",
//           presence: "present",
//           value: { status: "literal", value: 1 },
//         },
//         {
//           name: "type",
//           presence: "present",
//           value: { status: "literal", value: "heading" },
//         },
//         {
//           name: "text",
//           presence: "present",
//           value: {
//             status: "unknown",
//             reason: "Unsupported CallExpression value.",
//           },
//         },
//       ]),
//     });
//     expect(onlyCallable(ir, "nested").returnSites).toHaveLength(1);
//     expect(onlyCallable(ir, "arrow").returnSites).toHaveLength(1);
//     expect(ir.moduleLinks).toContainEqual(
//       expect.objectContaining({
//         exportedName: "default",
//         callableId: parse.callableId,
//       }),
//     );
export const _l = 157;
