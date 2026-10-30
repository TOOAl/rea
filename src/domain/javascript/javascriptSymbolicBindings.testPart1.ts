export const __stub = 1;
// import { expect, it } from "vitest";
// import * as t from "@babel/types";
// import { parseJavaScriptSource } from "./javascriptSourceParser.js";
// import { indexJavaScriptBindingsSteps } from "./javascriptSemanticAnalysis.js";
// import {
//   completeSemanticSteps,
//   traverseJavaScriptAst,
// } from "./javascriptSemanticTraversal.js";
// import { JavaScriptSymbolicBindings } from "./javascriptSymbolicBindings.js";
// import {
//   symbolicTruth,
//   symbolicVariants,
//   type SymbolicValue,
// } from "./javascriptSymbolicValues.js";
//
// const resolverFor = (source: string) => {
//   const parsed = parseJavaScriptSource(source);
//   if (parsed === null) throw new Error("symbolic source fixture did not parse");
//   const state = completeSemanticSteps(
//     indexJavaScriptBindingsSteps(parsed.program),
//   );
//   return {
//     parsed,
//     resolver: new JavaScriptSymbolicBindings(state, parsed.program),
//   };
// };
//
// /** Parse a fixture and collect the first argument of each inspect call. */
// const inspectFixture = (
//   source: string,
//   evaluate: (
//     resolver: JavaScriptSymbolicBindings,
//     node: t.CallExpression,
//   ) => SymbolicValue = (resolver, node) => resolver.evaluate(node.arguments[0]),
// ) => {
//   const { parsed, resolver } = resolverFor(source);
//   const values: SymbolicValue[] = [];
//   traverseJavaScriptAst(parsed.program, {
//     enter: (node) => {
//       if (
//         t.isCallExpression(node) &&
//         t.isIdentifier(node.callee, { name: "inspect" })
//       ) {
//         values.push(evaluate(resolver, node));
//       }
//     },
//   });
//   return { parsed, resolver, values };
// };
//
// const inspectedValues = (source: string): SymbolicValue[] =>
//   inspectFixture(source).values;
//
// const inspectOne = (source: string): SymbolicValue => {
//   const values = inspectedValues(source);
//   expect(values).toHaveLength(1);
//   const value = values[0];
//   if (value === undefined) throw new Error("inspect call result missing");
//   return value;
// };
//
// it("substitutes numeric modules, named exports and captured wrapper arguments", () => {
//   const { resolver, values } = inspectFixture(`(() => {
//     const modules = {
//       4(module) { module.exports = require("electron"); },
//       8(module, exports, load) {
//         const electron = load(4);
//         exports.sender = function(channel) { return (...args) => electron.ipcRenderer.send(channel,...args); };
//       },
//       12(module, exports, load) { const helpers = load(8); const api = {copy: helpers.sender("test:copy")}; inspect(api.copy); }
//     };
//     function load(id) { const m = {exports:{}}; modules[id](m,m.exports,load); return m.exports; }
//     load(12);
//   })();`);
//   expect(values).toHaveLength(1);
//   const value = values[0];
//   if (value === undefined) throw new Error("inspect call result missing");
//   const fn = symbolicVariants(value).find((v) => v.kind === "function");
//   expect(fn?.kind).toBe("function");
//   if (fn?.kind !== "function" || !t.isCallExpression(fn.node.body))
//     throw new Error("closure missing");
//   const env = resolver.bind(fn, []);
//   expect(resolver.evaluate(fn.node.body.callee, env)).toEqual({
//     kind: "external",
//     path: ["electron", "ipcRenderer", "send"],
//   });
//   expect(resolver.arguments(fn.node.body, env)[0]).toEqual({
//     kind: "literal",
//     value: "test:copy",
//   });
// });
//
// it("checks block lexical initializers against their containing function call", () => {
//   const { parsed, resolver } = resolverFor(`run();
//     function run() { { const value = require("electron"); inspect(value); } }`);
//   let resolved: SymbolicValue | undefined;
//   traverseJavaScriptAst(parsed.program, {
//     enter: (node) => {
//       if (
//         !t.isCallExpression(node) ||
//         !t.isIdentifier(node.callee, { name: "inspect" })
//       )
//         return;
//       const fn = parsed.program.body.find(
//         (statement): statement is t.FunctionDeclaration =>
//           t.isFunctionDeclaration(statement) && statement.id?.name === "run",
//       );
//       if (!fn) throw new Error("run declaration missing");
//       const call = parsed.program.body[0];
//       if (
//         !t.isExpressionStatement(call) ||
//         !t.isCallExpression(call.expression)
//       )
//         throw new Error("run invocation missing");
//       resolved = resolver.evaluate(
//         node.arguments[0],
//         resolver.bind(
//           {
//             kind: "function",
//             node: fn,
//             environment: { values: new Map() },
//             origins: [],
//           },
//           [],
//           call.expression,
//         ),
//       );
//     },
//   });
//   expect(resolved).toEqual({ kind: "external", path: ["electron"] });
// });
//
// it("keeps same-factory reads before initialization unresolved", () => {
//   const { values, resolver } = inspectFixture(
//     `(() => {
//     const modules = { 9(module) { inspect(value); const value = require("electron"); } };
//     function load(id) { const m={exports:{}}; modules[id](m); return m.exports; }
//     load(9);
//   })();`,
//     (bindings, node) =>
//       bindings.evaluate(node.arguments[0], bindings.environmentAt(node)),
//   );
//   expect(values).toHaveLength(1);
//   const resolved = values[0];
//   if (resolved === undefined) throw new Error("inspect call result missing");
export const _l = 145;
