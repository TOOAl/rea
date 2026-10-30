export const __stub = 1;
//           exportedName: "bridge",
//         }),
//         expect.objectContaining({
//           kind: "re-export",
//           specifier: "./wrapper.js",
//           importedName: "*",
//           exportedName: "*",
//         }),
//         expect.objectContaining({
//           kind: "export",
//           localName: "localValue",
//           exportedName: "localValue",
//         }),
//         expect.objectContaining({
//           kind: "require",
//           specifier: "./native.node",
//           localName: "addon",
//         }),
//         expect.objectContaining({
//           kind: "commonjs-export",
//           localName: "addon",
//           exportedName: "addon",
//         }),
//         expect.objectContaining({
//           kind: "export",
//           localName: "namedDefault",
//           exportedName: "default",
//         }),
//       ]),
//     );
//   });
//
//   it("does not invent export or method names from dynamic keys", () => {
//     const ir = analyzeJavaScriptSemantics(`
//       const key = resolveKey();
//       exports[key] = addon;
//       module.exports[key] = addon;
//       const target = { [key]() { return 1; } };
//       class Holder { [key]() { return 2; } }
//     `);
//     // The assignment is real, but its name is not knowable, so the only
//     // honest exported_name is the wildcard.
//     expect(
//       ir.moduleLinks
//         .filter(({ kind }) => kind === "commonjs-export")
//         .map(({ exportedName }) => exportedName),
//     ).toEqual(["*", "*"]);
//     const names = ir.callables.map(({ name }) => name);
//     expect(names).not.toContain("key");
//     expect(names.filter((name) => name?.startsWith("[computed@")).length).toBe(
//       2,
//     );
//   });
//
//   it("resolves the value of a simple assignment expression exported through CommonJS", () => {
//     const ir = analyzeJavaScriptSemantics(`
//       function parse() { return { kind: "result" }; }
//       const holder = {};
//       module.exports = holder.value = parse;
//     `);
//     expect(ir.moduleLinks).toEqual(
//       expect.arrayContaining([
//         expect.objectContaining({
//           kind: "commonjs-export",
//           localName: "parse",
//           exportedName: "default",
//         }),
//       ]),
//     );
//   });
//
//   it.each(["parse", "default"])(
//     "does not export a %s property write to a replaced module.exports receiver",
//     (name) => {
//       const ir = analyzeJavaScriptSemantics(`
//         module.exports.${name} = (module.exports = () => ({ kind: "result" }));
//       `);
//       expect(ir.moduleLinks).toEqual([
//         expect.objectContaining({
//           kind: "commonjs-export",
//           exportedName: "default",
//         }),
//       ]);
//     },
//   );
// });
//
// describe("CommonJS receiver lifetimes", () => {
//   it.each([
//     'Object.defineProperty(module.exports, "other", { value: exports });',
//     "Object.assign(module.exports, { other: exports });",
//   ])(
//     "keeps the receiver identity intact when mutating its contents: %s",
//     (mutation) => {
//       const ir = analyzeJavaScriptSemantics(
//         `exports.parse = () => 1; ${mutation}`,
//       );
//       const exported = ir.moduleLinks.find(
//         ({ exportedName }) => exportedName === "parse",
//       );
//       expect(exported?.callableId).toEqual(expect.any(String));
//     },
//   );
//
//   it.each([
//     "module.exports = {}; exports.parse = () => 1;",
//     "exports = {}; exports.parse = () => 1;",
//     "exports.parse = () => 1; module.exports = {};",
//     "module.exports.parse = () => 1; module.exports = [];",
//     'module.exports = {}; exports.status = "enabled";',
//     "module.exports = exports = {}; module.exports = {}; exports.parse = () => 1;",
//     'module.exports = {}; Reflect.set(module, "other", exports); exports.parse = () => 1;',
//     'module.exports = {}; Object.defineProperty(globalThis.module, "exports", { value: exports }); exports.parse = () => 1;',
//     "module.exports = {}; let wrapper = module; wrapper = {}; Object.assign(wrapper, { exports }); exports.parse = () => 1;",
//   ])(
//     "excludes a detached CommonJS receiver across statements: %s",
//     (source) => {
//       const ir = analyzeJavaScriptSemantics(source);
//       expect(
//         ir.moduleLinks.filter(
//           ({ exportedName }) =>
//             exportedName === "parse" || exportedName === "status",
//         ),
//       ).toEqual([]);
//     },
//   );
//
//   it.each([
//     "exports.parse = () => 1;",
//     "module.exports = {}; module.exports.parse = () => 1;",
//     "module.exports = {}; exports = module.exports; exports.parse = () => 1;",
//     "module.exports = exports = {}; exports.parse = () => 1;",
//     "exports = module.exports = {}; exports.parse = () => 1;",
//     "module.exports = module.exports; exports.parse = () => 1;",
//     "module.exports = external; exports = module.exports; exports.parse = () => 1;",
//     "module.exports = external; module.exports.parse = () => 1;",
//     "exports.parse = (exports = {} , () => 1);",
//     "exports.parse = (module.exports = {}); module.exports = exports;",
//     "(module.exports = {}, exports = module.exports, exports.parse = () => 1);",
//   ])("retains a connected CommonJS receiver: %s", (source) => {
//     expect(analyzeJavaScriptSemantics(source).moduleLinks).toContainEqual(
//       expect.objectContaining({
//         kind: "commonjs-export",
//         exportedName: "parse",
//       }),
//     );
//   });
//
//   it.each([
//     "module.exports = external; exports.parse = () => 1;",
//     "if (flag) module.exports = {}; exports.parse = () => 1;",
//     "flag && (module.exports = {}); exports.parse = () => 1;",
//     "holder ||= (module.exports = {}); exports.parse = () => 1;",
//     "invoke?.(module.exports = {}); exports.parse = () => 1;",
//     "const { value = (module.exports = {}) } = source; exports.parse = () => 1;",
export const _l = 155;
