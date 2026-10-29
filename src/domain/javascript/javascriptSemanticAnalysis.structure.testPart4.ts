export const __stub = 1;
//     "module[key] = {}; exports.parse = () => 1;",
//     "exports.parse = () => 1; if (flag) module.exports = {};",
//     "function replace() { module.exports = {}; } exports.parse = () => 1; replace();",
//     "function replace() { exports = {}; } replace(); exports.parse = () => 1;",
//     "module.exports = {}; function install() { exports.parse = () => 1; } install();",
//     "for (exports of values) {} exports.parse = () => 1;",
//     "({ exports } = external); exports.parse = () => 1;",
//     "module = {}; module.exports = {}; module.exports.parse = () => 1;",
//     'const holder = {}; ({ [(module.exports = exports, "x")]: holder.x } = (module.exports = {})); exports.parse = () => 1;',
//     'const { [(module.exports = exports, "x")]: value } = (module.exports = {}); exports.parse = () => 1;',
//     "const [value = (module.exports = exports)] = (module.exports = []); exports.parse = () => 1;",
//     "module.exports = {}; Object.assign(module, { exports }); exports.parse = () => 1;",
//     'module.exports = {}; Object.defineProperty(module, "exports", { value: exports }); exports.parse = () => 1;',
//     'module.exports = {}; Reflect.set(module, "exports", exports); exports.parse = () => 1;',
//     "module.exports = {}; const assign = Object.assign; assign.call(null, module, { exports }); exports.parse = () => 1;",
//     "module.exports = {}; const wrapper = module; Object.assign(wrapper, { exports }); exports.parse = () => 1;",
//   ])("keeps uncertain CommonJS receiver identity unresolved: %s", (source) => {
//     expect(analyzeJavaScriptSemantics(source).moduleLinks).toContainEqual(
//       expect.objectContaining({
//         kind: "commonjs-export",
//         exportedName: "parse",
//         callableId: null,
//         localName: null,
//       }),
//     );
//   });
// });
//
// describe("JavaScript semantic analysis: write references", () => {
//   it("classifies destructuring and loop targets as writes, not reads", () => {
//     const ir = analyzeJavaScriptSemantics(`
//       let a, b, c;
//       ({ a } = source);
//       [b] = list;
//       ({ nested: { c } } = source);
//       for (a of list) {}
//       let d;
//       try { risky(); } catch ({ message }) { report(message); }
//     `);
//     const roles = (name: string): string[] =>
//       ir.references
//         .filter((reference) => reference.name === name)
//         .map(({ role }) => role);
//     expect(roles("a")).toEqual(["write", "write"]);
//     expect(roles("b")).toEqual(["write"]);
//     expect(roles("c")).toEqual(["write"]);
//     // A catch binding is a declaration, so its only later use is a read.
//     expect(roles("message")).toEqual(["read"]);
//   });
//
//   it("retains the read a compound assignment or update performs", () => {
//     const ir = analyzeJavaScriptSemantics(`
//       let total = 0;
//       total += 1;
//       total++;
//       total = 2;
//       const observed = total;
//     `);
//     const roles = ir.references
//       .filter(({ name }) => name === "total")
//       .map(({ role }) => role);
//     expect(roles).toEqual([
//       "read",
//       "write", // total += 1
//       "read",
//       "write", // total++
//       "write", // total = 2
//       "read", // const observed = total
//     ]);
//   });
// });
//
// describe("JavaScript semantic analysis: dynamic and case scopes", () => {
//   it("marks with and eval as unresolved dynamic scope instead of staying silent", () => {
//     const ir = analyzeJavaScriptSemantics(`
//       function load(source) {
//         with (host) { consume(target); }
//         eval("var injected = 1;");
//       }
//     `);
//     const reasons = ir.frontiers
//       .filter(({ kind }) => kind === "dynamic-scope")
//       .map(({ reason }) => reason);
//     expect(reasons).toHaveLength(2);
//     expect(reasons.join("\n")).toContain("`with`");
//     expect(reasons.join("\n")).toContain("`eval`");
//   });
//
//   it("does not assign CommonJS exports to lexically shadowed module or exports", () => {
//     const ir = analyzeJavaScriptSemantics(`
//       function shadowed(module, exports) {
//         module.exports.value = 1;
//         exports.other = 2;
//         exports[key] = 3;
//         module.exports[key] = 4;
//         unrelated[key] = 5;
//       }
//     `);
//     expect(
//       ir.moduleLinks.filter(({ kind }) => kind === "commonjs-export"),
//     ).toEqual([]);
//   });
//
//   it("shares one lexical scope across switch cases and isolates static blocks", () => {
//     const switchIr = analyzeJavaScriptSemantics(`
//       const kind = select();
//       switch (kind) {
//         case "a": let shared = 1; break;
//         case "b": shared = 2; break;
//       }
//     `);
//     // One declaration, one binding — and it belongs to a scope of its own, so
//     // it cannot leak past the switch statement.
//     const shared = switchIr.bindings.filter(({ name }) => name === "shared");
//     expect(shared).toHaveLength(1);
//     expect(shared[0]?.scopeId).not.toBe(
//       topLevelBinding(switchIr, "kind").scopeId,
//     );
//     const classIr = analyzeJavaScriptSemantics(`
//       class Holder {
//         static { let isolated = 1; }
//         static { let isolated = 2; }
//       }
//     `);
//     expect(
//       classIr.bindings.filter(({ name }) => name === "isolated"),
//     ).toHaveLength(2);
//   });
//
//   it("keeps function, class, and method identities separate from bindings", () => {
//     const ir = analyzeJavaScriptSemantics(`
//       class Service {
//         run() {}
//         get value() { return 1; }
//         #privateMethod() {}
//       }
//       const arrow = () => 1;
//       const object = { method() {} };
//     `);
//
//     expect(ir.callables).toEqual(
//       expect.arrayContaining([
//         expect.objectContaining({ kind: "class", name: "Service" }),
//         expect.objectContaining({ kind: "method", name: "run" }),
//         expect.objectContaining({ kind: "method", name: "value" }),
//         expect.objectContaining({ kind: "method", name: "#privateMethod" }),
//         expect.objectContaining({ kind: "function", name: "arrow" }),
//         expect.objectContaining({ kind: "method", name: "method" }),
//       ]),
//     );
//     expect(bindingsNamed(ir, "run")).toEqual([]);
//     expect(bindingsNamed(ir, "method")).toEqual([]);
//   });
// });
export const _l = 154;
