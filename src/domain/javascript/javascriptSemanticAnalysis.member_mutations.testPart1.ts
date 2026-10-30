export const __stub = 1;
// import { describe, expect, it } from "vitest";
//
// import { analyzeJavaScriptSemantics } from "./javascriptSemanticAnalysis.js";
// import { onlyCallable } from "./javascriptSemanticAnalysis.fixture.js";
//
// const resultValue = (body: string) =>
//   onlyCallable(
//     analyzeJavaScriptSemantics(`export function result() { ${body} }`),
//     "result",
//   ).returnSites[0]?.value;
//
// const mutations = [
//   'const shared = { mode: "initial" }; const options = { [key]: shared }; options.foo.mode = "updated"; return shared.mode;',
//   'const shared = { mode: "initial" }; const original = [shared]; const copy = [...original]; copy[0].mode = "updated"; return shared.mode;',
//   'const original = { nested: { mode: "initial" } }; const copy = { ...original }; copy.nested.mode = "updated"; return original.nested.mode;',
//   'const shared = { mode: "initial" }; const options = flag ? shared : { mode: "other" }; options.mode = "updated"; return shared.mode;',
//   'const child = { mode: "initial" }; const options = { layer: { child } }; options.layer.child.mode = "updated"; return child.mode;',
//   'const options = { mode: "initial" }; options.mode = "updated"; return options.mode;',
//   "const options = { count: 1 }; options.count += 1; return options.count;",
//   "const options = { count: 1 }; options.count++; return options.count;",
//   'const options = { mode: "initial" }; delete options.mode; return options.mode;',
//   'const options = ["initial"]; options[0] = "updated"; return options[0];',
//   'const options = { nested: { mode: "initial" } }; options.nested.mode = "updated"; return options.nested.mode;',
//   'const options = { mode: "initial" }; const alias = options; alias.mode = "updated"; return options.mode;',
//   'const options = { nested: { mode: "initial" } }; const { nested } = options; nested.mode = "updated"; return options.nested.mode;',
//   'const nested = { mode: "initial" }; const options = { nested }; options.nested.mode = "updated"; return nested.mode;',
//   'const options = { mode: "initial" }; [options.mode] = ["updated"]; return options.mode;',
//   'const options = { mode: "initial" }; for (options.mode of ["updated"]) {} return options.mode;',
//   'const options = { mode: "initial" }; const key = getKey(); options[key] = "updated"; return options.mode;',
// ];
//
// describe("JavaScript semantic values after explicit property mutations", () => {
//   it.each(mutations)("keeps the mutated value unknown: %s", (body) => {
//     expect(resultValue(body)?.status).toBe("unknown");
//   });
//
//   it("keeps an unrelated shadowed object literal known", () => {
//     expect(
//       resultValue(`
//       const options = { mode: "initial" };
//       { const options = { mode: "inner" }; options.mode = "updated"; }
//       return options.mode;
//     `),
//     ).toEqual({ status: "literal", value: "initial" });
//   });
//
//   it("keeps scalar slots in a spread source known after a copy slot write", () => {
//     expect(
//       resultValue(`
//       const original = { mode: "initial" };
//       const copy = { ...original };
//       copy.mode = "updated";
//       return original.mode;
//     `),
//     ).toEqual({ status: "literal", value: "initial" });
//   });
//
//   it("keeps conditional object branches unknown after a property write", () => {
//     expect(
//       resultValue(`
//       const options = flag ? { mode: "initial" } : { mode: "other" };
//       options.mode = "updated";
//       return options.mode;
//     `)?.status,
//     ).toBe("unknown");
//   });
//
//   it("keeps a copied primitive initializer known", () => {
//     expect(
//       resultValue(`
//       const mode = "initial";
//       const options = { mode };
//       options.mode = "updated";
//       return mode;
//     `),
//     ).toEqual({ status: "literal", value: "initial" });
//   });
//
//   it("does not propagate writes through an alias after an unconditional rebind", () => {
//     expect(
//       resultValue(`
//         const shared = { mode: "initial" };
//         let alias = shared;
//         alias = { mode: "other" };
//         alias.mode = "updated";
//         return shared.mode;
//       `),
//     ).toEqual({ status: "literal", value: "initial" });
//   });
//
//   it.each([
//     'if (flag) alias = { mode: "other" }; alias.mode = "updated";',
//     'flag && (alias = { mode: "other" }); alias.mode = "updated";',
//     'flag ||= (alias = { mode: "other" }); alias.mode = "updated";',
//     'alias ||= { mode: "other" }; alias.mode = "updated";',
//     'alias ??= { mode: "other" }; alias.mode = "updated";',
//   ])(
//     "keeps possible source aliases unknown across conditional rebinds",
//     (body) => {
//       expect(
//         resultValue(`
//         const shared = { mode: "initial" };
//         let alias = shared;
//         ${body}
//         return shared.mode;
//       `)?.status,
//       ).toBe("unknown");
//     },
//   );
//
//   it("keeps mutation under a bare conditional unknown across a rebind", () => {
//     expect(
//       resultValue(`
//         const shared = { mode: "initial" };
//         let alias = shared;
//         alias = { mode: "other" };
//         if (flag) alias.mode = "updated";
//         return shared.mode;
//       `)?.status,
//     ).toBe("unknown");
//   });
//
//   it("does not treat a short-circuit assignment RHS as an unconditional value", () => {
//     expect(
//       resultValue(`
//         let value;
//         value &&= 2;
//         return value;
//       `)?.status,
//     ).toBe("unknown");
//   });
//
//   it("keeps possible alias mutations conservative across short-circuit assignment", () => {
//     expect(
//       resultValue(`
//         const shared = { mode: "initial" };
//         let alias = shared;
//         alias &&= { mode: "other" };
//         alias.mode = "updated";
//         return shared.mode;
//       `)?.status,
//     ).toBe("unknown");
//   });
//
//   it("propagates short-circuit assignment mutations to the RHS alias candidate", () => {
//     expect(
//       resultValue(`
//         const shared = { mode: "initial" };
//         const other = { mode: "other" };
//         let alias = shared;
//         alias &&= other;
//         alias.mode = "updated";
//         return other.mode;
//       `)?.status,
//     ).toBe("unknown");
//   });
//
//   it("retains ordinary immutable object and array projection", () => {
//     expect(
//       resultValue(
//         'const options = { mode: ["initial"] }; return options.mode[0];',
//       ),
//     ).toEqual({ status: "literal", value: "initial" });
//   });
// });
//
// it("invalidates a shared value reached through an object-literal prototype getter", () => {
//   const value = resultValue(`
//     const shared = { x: 1 };
//     const proto = { get v() { return shared; } };
//     const box = { __proto__: proto };
//     box.v.x = 2;
//     return shared.x;
//   `);
//   expect(
//     value?.status === "unknown" ||
//       (value?.status === "literal" && value.value === 2),
//   ).toBe(true);
// });
//
// it("does not follow an object-literal prototype getter past an own property", () => {
//   expect(
//     resultValue(`
//       const shared = { x: 1 };
//       const proto = { get v() { return shared; } };
//       const box = { __proto__: proto, v: { x: 3 } };
//       box.v.x = 2;
//       return shared.x;
//     `),
//   ).toEqual({ status: "literal", value: 1 });
// });
//
// describe("JavaScript semantic mutations through getter results (#1494)", () => {
//   it.each([
//     [
//       "object getter",
//       "const shared = { value: 1 }; const box = { get value() { return shared; } }; box.value.value = 2; return shared.value;",
//     ],
//     [
//       "class instance getter",
//       "const shared = { value: 1 }; class Box { get value() { return shared; } } const box = new Box(); box.value.value = 2; return shared.value;",
//     ],
//     [
//       "static getter",
//       "const shared = { value: 1 }; class Box { static get value() { return shared; } } Box.value.value = 2; return shared.value;",
//     ],
//     [
//       "copied getter result",
//       "const shared = { value: 1 }; const box = { get value() { return shared; } }; const alias = box.value; alias.value = 2; return shared.value;",
//     ],
//   ])("marks shared returned objects uncertain through %s", (_shape, body) => {
//     expect(resultValue(body)?.status).toBe("unknown");
//   });
//
//   it.each([
//     [
//       "last duplicate object getter wins",
export const _l = 217;
