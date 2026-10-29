export const __stub = 1;
//
//   it("propagates literal, template, object, conditional, and destructured values", () => {
//     const ir = analyzeJavaScriptSemantics(`
//       const prefix = "rea";
//       const suffix = "open";
//       const channel = \`${"${prefix}"}:${"${suffix}"}\`;
//       const options = {
//         channel,
//         mode: enabled ? "read" : "write",
//       };
//       const selected = options.channel;
//       const { mode } = options;
//       const [first] = ["zero", "one"];
//     `);
//
//     expect(topLevelBinding(ir, "channel").value).toEqual({
//       status: "literal",
//       value: "rea:open",
//     });
//     expect(topLevelBinding(ir, "selected").value).toEqual({
//       status: "literal",
//       value: "rea:open",
//     });
//     expect(topLevelBinding(ir, "mode").value).toEqual({
//       status: "union",
//       values: ["read", "write"],
//     });
//     expect(topLevelBinding(ir, "first").value).toEqual({
//       status: "literal",
//       value: "zero",
//     });
//   });
// });
//
// describe("JavaScript semantic analysis: loop lexical names", () => {
//   it.each([
//     `for (let value = "inside"; ready; step()) { consume(value); }`,
//     `for (const value of entries) { consume(value); }`,
//     `for (const value in entries) { consume(value); }`,
//   ])("does not leak lexical loop bindings into the enclosing scope", (loop) => {
//     const ir = analyzeJavaScriptSemantics(`
//       const value = "outside";
//       ${loop}
//       consume(value);
//     `);
//     expect(topLevelBinding(ir, "value").value).toEqual({
//       status: "literal",
//       value: "outside",
//     });
//     expect(bindingsNamed(ir, "value")).toHaveLength(2);
//     const reads = ir.references.filter(
//       ({ name, role }) => name === "value" && role === "read",
//     );
//     expect(reads).toHaveLength(2);
//     expect(reads[0]?.bindingId).not.toBe(reads[1]?.bindingId);
//     expect(reads[1]?.bindingId).toBe(topLevelBinding(ir, "value").bindingId);
//   });
//
//   it("resolves closures inside a loop against the loop binding", () => {
//     const ir = analyzeJavaScriptSemantics(`
//       const value = "outside";
//       for (const value of entries) { callbacks.push(() => value); }
//       consume(value);
//     `);
//     const reads = ir.references.filter(
//       ({ name, role }) => name === "value" && role === "read",
//     );
//     expect(reads).toHaveLength(2);
//     expect(reads[0]?.bindingId).not.toBe(
//       topLevelBinding(ir, "value").bindingId,
//     );
//     expect(reads[1]?.bindingId).toBe(topLevelBinding(ir, "value").bindingId);
//     expect(ir.closureCaptures).toContainEqual(
//       expect.objectContaining({
//         bindingId: reads[0]?.bindingId,
//       }),
//     );
//   });
//
//   it("keeps var loop declarations in the enclosing function", () => {
//     const ir = analyzeJavaScriptSemantics(`
//       function run() { for (var value of entries) { consume(value); } return value; }
//     `);
//     const binding = onlyBinding(ir, "value");
//     const callable = ir.callables.find(({ name }) => name === "run");
//     expect(binding.scopeId).toBe(callable?.bodyScopeId);
//     expect(
//       ir.references
//         .filter(({ name, role }) => name === "value" && role === "read")
//         .every(({ bindingId }) => bindingId === binding.bindingId),
//     ).toBe(true);
//   });
// });
//
// describe("JavaScript semantic analysis: class expression lexical names", () => {
//   it("resolves named class expressions inside the class without changing the outer binding", () => {
//     const ir = analyzeJavaScriptSemantics(`
//       const Service = "outside";
//       const Wrapper = class Service {
//         create() { return new Service(); }
//       };
//       consume(Service);
//     `);
//     expect(bindingsNamed(ir, "Service")).toHaveLength(2);
//     expect(topLevelBinding(ir, "Service").value).toEqual({
//       status: "literal",
//       value: "outside",
//     });
//     const references = ir.references.filter(
//       ({ name, role }) => name === "Service" && role === "read",
//     );
//     expect(references).toHaveLength(2);
//     expect(references[0]?.bindingId).not.toBe(references[1]?.bindingId);
//     expect(references[0]?.resolution).toBe("resolved");
//     const classScope = ir.scopes.find(({ kind }) => kind === "class");
//     expect(
//       bindingsNamed(ir, "Service").some(
//         ({ scopeId }) => scopeId === classScope?.scopeId,
//       ),
//     ).toBe(true);
//   });
//
//   it("does not expose a named class expression outside its class", () => {
//     const ir = analyzeJavaScriptSemantics(`
//       const Wrapper = class Internal { create() { return new Internal(); } };
//       consume(Internal);
//     `);
//     const references = ir.references.filter(
//       ({ name, role }) => name === "Internal" && role === "read",
//     );
//     expect(references.map(({ resolution }) => resolution)).toEqual([
//       "resolved",
//       "unbound",
//     ]);
//     expect(topLevelBinding(ir, "Wrapper").provenance.status).toBe("local");
//   });
// });
//
// describe("JavaScript semantic analysis: structure 2", () => {
//   it("retains ESM, re-export, require, and CommonJS export relationships", () => {
//     const ir = analyzeJavaScriptSemantics(`
//       export { ipcRenderer as bridge } from "electron";
//       export * from "./wrapper.js";
//       export const localValue = 1;
//       const addon = require("./native.node");
//       module.exports.addon = addon;
//       export default function namedDefault() {}
//     `);
//
//     expect(ir.moduleLinks).toEqual(
//       expect.arrayContaining([
//         expect.objectContaining({
//           kind: "re-export",
//           specifier: "electron",
//           importedName: "ipcRenderer",
export const _l = 155;
