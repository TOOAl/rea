export const __stub = 1;
//   expect(result).toEqual({ kind: "external", path: ["electron"] });
// });
//
// it("does not treat statements after a returned closure as initialized", () => {
//   const result = inspectOne(`inspect(outer()());
//     function outer() {
//       return () => value;
//       const value = require("electron");
//     }`);
//   expect(result).toMatchObject({ kind: "unknown" });
// });
//
// it("does not treat statements after a returned module factory as initialized", () => {
//   const result = inspectOne(`(() => {
//     const modules = {
//       5(module, exports) {
//         exports.read = () => electron;
//         return;
//         const electron = require("electron");
//       },
//       9(module, exports, load) { const helper = load(5); inspect(helper.read()); }
//     };
//     function load(id) { const m={exports:{}}; modules[id](m,m.exports,load); return m.exports; }
//     load(9);
//   })();`);
//   expect(result).toMatchObject({ kind: "unknown" });
// });
//
// it("treats known symbolic records and loaders as truthy", () => {
//   expect(symbolicTruth({ kind: "record", values: new Map() })).toBe(true);
//   expect(symbolicTruth({ kind: "loader", modules: new Map() })).toBe(true);
//   expect(
//     symbolicTruth({
//       kind: "union",
//       values: [
//         { kind: "record", values: new Map() },
//         { kind: "loader", modules: new Map() },
//       ],
//     }),
//   ).toBe(true);
// });
//
// it("retains branch predicates on conditionally selected wrapper functions", () => {
//   const value = inspectOne(`
//     const selected = enabled
//       ? () => navigator.clipboard.writeText("yes")
//       : () => navigator.clipboard.writeText("no");
//     inspect(selected);
//   `);
//   const functions = symbolicVariants(value).filter(
//     (candidate) => candidate.kind === "function",
//   );
//   expect(functions).toHaveLength(2);
//   expect(functions.map((fn) => fn.conditions?.[0]?.positive)).toEqual([
//     true,
//     false,
//   ]);
// });
//
// it("retains fallthrough return guards after a one-sided early return", () => {
//   const value = inspectOne(`
//     function choose() {
//       if (enabled) return () => navigator.clipboard.writeText("early");
//       return () => navigator.clipboard.writeText("late");
//     }
//     inspect(choose());
//   `);
//   const functions = symbolicVariants(value).filter(
//     (candidate) => candidate.kind === "function",
//   );
//   expect(functions).toHaveLength(2);
//   expect(functions[0]).toMatchObject({ conditions: [{ positive: true }] });
//   expect(functions[1]).toMatchObject({ conditions: [{ positive: false }] });
// });
//
// it("composes fallthrough guards across successive conditional returns", () => {
//   const value = inspectOne(`
//     function choose() {
//       if (first) return () => navigator.clipboard.writeText("first");
//       if (second) return () => navigator.clipboard.writeText("second");
//       return () => navigator.clipboard.writeText("last");
//     }
//     inspect(choose());
//   `);
//   const functions = symbolicVariants(value).filter(
//     (candidate) => candidate.kind === "function",
//   );
//   expect(functions).toHaveLength(3);
//   expect(functions[0]?.conditions?.map(({ positive }) => positive)).toEqual([
//     true,
//   ]);
//   expect(functions[1]?.conditions?.map(({ positive }) => positive)).toEqual([
//     false,
//     true,
//   ]);
//   expect(functions[2]?.conditions?.map(({ positive }) => positive)).toEqual([
//     false,
//     false,
//   ]);
// });
//
// it.each([
//   ["while", 'inspect((() => { while (flag) { return "loop"; } })());'],
//   ["for", 'inspect((() => { for (;;) { return "forever"; } })());'],
//   ["try", 'inspect((() => { try { return "try"; } finally {} })());'],
//   [
//     "switch",
//     'inspect((() => { switch (x) { default: return "switch"; } })());',
//   ],
// ])(
//   "keeps unsupported %s return control flow explicitly unknown",
//   (_name, source) => {
//     const value = inspectOne(source);
//     expect(
//       symbolicVariants(value).some((variant) => variant.kind === "unknown"),
//     ).toBe(true);
//     expect(value).not.toEqual({ kind: "literal", value: undefined });
//   },
// );
//
// it("preserves later returns with unresolved conditions after unsupported return flow", () => {
//   const variants = symbolicVariants(
//     inspectOne(`inspect((() => {
//       while (flag) { return "inside"; }
//       return "after";
//     })());`),
//   );
//
//   expect(variants.some((variant) => variant.kind === "unknown")).toBe(true);
//   expect(variants).toContainEqual(
//     expect.objectContaining({
//       kind: "literal",
//       value: "after",
//       conditionUnresolved: true,
//     }),
//   );
// });
//
// it("does not treat loops without owned returns as unknown return flow", () => {
//   expect(
//     inspectOne(`inspect((() => {
//       while (flag) { work(); }
//       return "after";
//     })());`),
//   ).toEqual({ kind: "literal", value: "after" });
export const _l = 145;
