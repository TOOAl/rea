export const __stub = 1;
// });
//
// it("does not treat nested-function returns as wrapper return flow", () => {
//   expect(
//     inspectOne(`inspect((() => {
//       try { function nested() { return "inner"; } }
//       catch {}
//       return "outer";
//     })());`),
//   ).toEqual({ kind: "literal", value: "outer" });
// });
//
// it("marks return guards unresolved when a nested join cannot be represented", () => {
//   const value = inspectOne(`
//     function choose() {
//       if (enabled) {
//         if (other) return () => navigator.clipboard.writeText("early");
//       }
//       return () => navigator.clipboard.writeText("late");
//     }
//     inspect(choose());
//   `);
//   const functions = symbolicVariants(value).filter(
//     (candidate) => candidate.kind === "function",
//   );
//   expect(functions).toHaveLength(2);
//   expect(functions[1]).toMatchObject({ conditionUnresolved: true });
// });
//
// it.each([
//   [
//     "duplicate literal keys use the last value",
//     `const object = { value: "first", value: "last" }; inspect(object.value);`,
//     { kind: "literal", value: "last" },
//   ],
//   [
//     "a final accessor is unknown",
//     `const object = { value: "first", get value() { return "accessor"; } }; inspect(object.value);`,
//     { kind: "unknown", reason: "accessor property" },
//   ],
//   [
//     "a later literal overwrites an accessor",
//     `const object = { get value() { return "accessor"; }, value: "last" }; inspect(object.value);`,
//     { kind: "literal", value: "last" },
//   ],
//   [
//     "a later unknown computed key can overwrite an earlier value",
//     `const object = { value: "known", [dynamic]: "other" }; inspect(object.value);`,
//     { kind: "unknown", reason: "dynamic property overwrite" },
//   ],
//   [
//     "a later static key overrides an earlier unknown computed key",
//     `const object = { [dynamic]: "other", value: "last" }; inspect(object.value);`,
//     { kind: "literal", value: "last" },
//   ],
//   [
//     "a known spread can override an earlier static value",
//     `const replacement = { value: "spread" }; const object = { value: "first", ...replacement }; inspect(object.value);`,
//     { kind: "literal", value: "spread" },
//   ],
// ] as const)("resolves object properties when %s", (_case, source, expected) => {
//   expect(inspectOne(source)).toEqual(expected);
// });
//
// it("propagates branch guards through object properties and function calls", () => {
//   const inspected = inspectedValues(`
//     const direct = flag
//       ? { action: () => navigator.clipboard.writeText("direct-yes") }
//       : { action: () => navigator.clipboard.writeText("direct-no") };
//     function choose() {
//       return flag
//         ? () => navigator.clipboard.writeText("call-yes")
//         : () => navigator.clipboard.writeText("call-no");
//     }
//     const called = { action: choose() };
//     inspect(direct.action);
//     inspect(called.action);
//   `);
//   for (const value of inspected) {
//     const functions = symbolicVariants(value).filter(
//       (candidate) => candidate.kind === "function",
//     );
//     expect(functions).toHaveLength(2);
//     expect(functions.map((fn) => fn.conditions?.[0]?.positive)).toEqual([
//       true,
//       false,
//     ]);
//   }
// });
//
// it("completes a loaded module past a very large array without stack overflow", () => {
//   const parsed = parseJavaScriptSource(`(() => {
//     const modules = {
//       4(module) {
//         module.exports = { table: [0] };
//         if (module) { return; }
//         return;
//       },
//       8(module, exports, load) { const dep = load(4); inspect(dep); }
//     };
//     function load(id) { const m = {exports:{}}; modules[id](m,m.exports,load); return m.exports; }
//     load(8);
//   })();`);
//   if (parsed === null) throw new Error("symbolic source fixture did not parse");
//   const arrays: t.ArrayExpression[] = [];
//   const bareReturns: t.ReturnStatement[] = [];
//   let inspectCall: t.CallExpression | undefined;
//   traverseJavaScriptAst(parsed.program, {
//     enter: (node) => {
//       if (t.isArrayExpression(node)) arrays.push(node);
//       if (t.isReturnStatement(node) && node.argument == null)
//         bareReturns.push(node);
//       if (
//         t.isCallExpression(node) &&
//         t.isIdentifier(node.callee, { name: "inspect" })
//       )
//         inspectCall = node;
//     },
//   });
//   for (const array of arrays)
//     array.elements = Array.from({ length: 1_000_000 }, () =>
//       t.numericLiteral(0),
//     );
//   const earliestReturn = bareReturns.toSorted(
//     (left, right) => (left.start ?? 0) - (right.start ?? 0),
//   )[0];
//   const inspected = inspectCall?.arguments[0];
//   if (earliestReturn === undefined || inspected === undefined)
//     throw new Error("symbolic source fixture is missing its probes");
//
//   const state = completeSemanticSteps(
//     indexJavaScriptBindingsSteps(parsed.program),
//   );
//   const resolver = new JavaScriptSymbolicBindings(state, parsed.program);
//   const namespace = symbolicVariants(resolver.evaluate(inspected)).find(
//     (variant) => variant.kind === "namespace",
//   );
//   if (namespace?.kind !== "namespace")
//     throw new Error("loaded module namespace missing");
//   expect(namespace.environment.completedAt).toBe(earliestReturn);
// });
export const _l = 141;
