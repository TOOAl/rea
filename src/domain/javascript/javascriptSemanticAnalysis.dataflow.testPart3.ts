export const __stub = 1;
//   it("retains partial property coverage and empty returns", () => {
//     const partial = analyzeJavaScriptSemantics(`
//       const spread = () => ({ type: "spread", ...dynamic });
//       const computed = () => ({ type: "computed", [key]: 1 });
//       function noReturn() { throw new Error("stop"); }
//       function emptyReturn() { return; }
//     `);
//     expect(onlyCallable(partial, "spread").returnSites[0]?.value).toMatchObject(
//       {
//         status: "object",
//         unknownProperties: true,
//         omittedProperties: null,
//       },
//     );
//     expect(
//       onlyCallable(partial, "computed").returnSites[0]?.value,
//     ).toMatchObject({
//       status: "object",
//       unknownProperties: true,
//       omittedProperties: 1,
//     });
//     expect(onlyCallable(partial, "noReturn").returnSites).toEqual([]);
//     expect(onlyCallable(partial, "emptyReturn").returnSites[0]?.value).toEqual({
//       status: "unknown",
//       reason: "Return has no value.",
//     });
//   });
//
//   it("fails closed on assignment ambiguity and alias cycles", () => {
//     const ambiguous = analyzeJavaScriptSemantics(`
//       let current = "first";
//       current = "second";
//       const left = right;
//       const right = left;
//     `);
//     expect(topLevelBinding(ambiguous, "current").value).toMatchObject({
//       status: "ambiguous",
//     });
//     expect(topLevelBinding(ambiguous, "left").value).toMatchObject({
//       status: "cycle",
//     });
//     expect(topLevelBinding(ambiguous, "right").provenance).toMatchObject({
//       status: "cycle",
//     });
//   });
//
//   it("does not invent exact module paths for dynamic property access", () => {
//     const ir = analyzeJavaScriptSemantics(`
//       const key = getKey();
//       const dynamicMember = require("electron")[key];
//       const { [key]: dynamicBinding } = require("electron");
//     `);
//
//     expect(topLevelBinding(ir, "dynamicMember").provenance).toMatchObject({
//       status: "unknown",
//       origins: [],
//     });
//     expect(topLevelBinding(ir, "dynamicBinding").provenance).toMatchObject({
//       status: "unknown",
//       origins: [],
//     });
//     expect(
//       ir.moduleLinks.filter(({ localName }) =>
//         ["dynamicMember", "dynamicBinding"].includes(localName ?? ""),
//       ),
//     ).toEqual([]);
//   });
//
//   it("retains all scopes, bindings, and references without truncation", () => {
//     const ir = analyzeJavaScriptSemantics(
//       `
//         const retained = "yes";
//         const omitted = "no";
//         retained;
//         function nested(value) { return retained + value; }
//       `,
//     );
//
//     expect(ir.bindings.map(({ name }) => name)).toEqual(
//       expect.arrayContaining(["retained", "omitted", "value"]),
//     );
//     expect(ir.callables.map(({ name }) => name)).toContain("nested");
//     expect(ir.coverage.status).toBe("complete");
//     expect(ir.references.filter(({ name }) => name === "retained")).toEqual([
//       expect.objectContaining({
//         resolution: "resolved",
//         bindingId: topLevelBinding(ir, "retained").bindingId,
//       }),
//       expect.objectContaining({
//         resolution: "resolved",
//         bindingId: topLevelBinding(ir, "retained").bindingId,
//       }),
//     ]);
//   });
// });
//
// describe("primitive addition values", () => {
//   it.each([
//     ["true + 1", 2],
//     ["null + 2", 2],
//     ["false + true", 1],
//     ['"x" + false', "xfalse"],
//     ['null + "x"', "nullx"],
//     ["3 + 4", 7],
//     ['1 + 2 + "3"', "33"],
//     ['1 + (2 + "3")', "123"],
//     ['(1 + 2) + ("3" + 4)', "334"],
//   ])("recovers %s using primitive coercion", (expression, expected) => {
//     const ir = analyzeJavaScriptSemantics(`const answer = ${expression};`);
//     expect(topLevelBinding(ir, "answer").value).toEqual({
//       status: "literal",
//       value: expected,
//     });
//   });
// });
//
// describe("array positional value recovery", () => {
//   it("keeps holes at their actual destructuring indices", () => {
//     const ir = analyzeJavaScriptSemantics(`
//       const list = ["zero", , "two"];
//       const [first, second, third] = list;
//     `);
//     expect(topLevelBinding(ir, "first").value).toEqual({
//       status: "literal",
//       value: "zero",
//     });
//     expect(topLevelBinding(ir, "second").value.status).toBe("unknown");
//     expect(topLevelBinding(ir, "third").value).toEqual({
//       status: "literal",
//       value: "two",
//     });
//   });
//
//   it("projects canonical array indices without treating arbitrary strings as indices", () => {
//     const ir = analyzeJavaScriptSemantics(`
//       const list = ["zero", "one"];
//       const numeric = list[1];
//       const quoted = list["1"];
//       const leadingZero = list["01"];
//       const negative = list[-1];
//     `);
//     for (const name of ["numeric", "quoted"])
//       expect(topLevelBinding(ir, name).value).toEqual({
//         status: "literal",
//         value: "one",
//       });
//     for (const name of ["leadingZero", "negative"])
//       expect(topLevelBinding(ir, name).value.status).toBe("unknown");
//   });
//
//   it("does not shift trailing values across an unknown spread", () => {
//     const ir = analyzeJavaScriptSemantics(`
//       const values = ["first", ...unknownValues, "last"];
//       const [first, second] = values;
//     `);
//     expect(topLevelBinding(ir, "first").value).toEqual({
//       status: "literal",
export const _l = 157;
