export const __stub = 1;
// import * as t from "@babel/types";
// import {
//   semanticStaticPropertyKey,
//   semanticWriteSiteTarget,
//   semanticWriteTargets,
//   runtimeFunctionParameters,
//   unwrapJavaScriptExpression,
// } from "./javascriptAstValues.js";
// import { javascriptBootstrapAt } from "./javascriptBootstrap.js";
// import { ELECTRON_MODULE } from "./javascriptElectronMemberWrites.js";
// import {
//   indexJavaScriptElectronIdentitySteps,
//   type JavaScriptElectronIdentity,
// } from "./javascriptSemanticAnalysis.js";
// import { symbolicLogicalRight } from "./javascriptSymbolicControlFlow.js";
// import {
//   moduleFactory,
//   modulePropertyName,
// } from "./javascriptStaticAnalysisHelpers.js";
// import {
//   completeSemanticSteps,
//   traverseJavaScriptAst,
// } from "./javascriptSemanticTraversal.js";
// import {
//   resolveSemanticBindingState,
//   semanticResolutionBlocked,
//   type JavaScriptSemanticAnalysisState,
// } from "./javascriptSemanticState.js";
// import {
//   symbolicCondition,
//   symbolicUnion,
//   symbolicUnknown,
//   symbolicVariants,
//   symbolicConditionsUnresolved,
//   symbolicTruth,
//   type SymbolicCondition,
//   type SymbolicValue,
//   type SymbolicEnvironment,
//   type SymbolicFunction,
// } from "./javascriptSymbolicValues.js";
//
// interface PropertyWrite {
//   readonly path: readonly string[];
//   readonly value: t.Node;
//   readonly site: t.Node;
// }
// interface SymbolicReturnFlow {
//   readonly values: readonly SymbolicValue[];
//   readonly fallsThrough: boolean;
// }
// const emptyEnvironment: SymbolicEnvironment = { values: new Map() };
// const isObjectPrototypeSetter = (
//   property: t.ObjectMethod | t.ObjectProperty,
//   name: string,
// ): boolean =>
//   t.isObjectProperty(property) &&
//   !property.computed &&
//   !property.shorthand &&
//   name === "__proto__";
//
// const containsOwnedReturn = (root: t.Node): boolean => {
//   let found = false;
//   traverseJavaScriptAst(root, {
//     skip: (node) => found || t.isFunction(node) || t.isClass(node),
//     enter: (node) => {
//       if (t.isReturnStatement(node)) found = true;
//     },
//   });
//   return found;
// };
//
// /** Demand-driven substitutions for local bindings, closures and literal module tables. */
// export class JavaScriptSymbolicBindings {
//   readonly #writes = new Map<string, PropertyWrite[]>();
//   readonly #environments = new WeakMap<t.Node, SymbolicEnvironment>();
//   readonly #cache = new WeakMap<
//     SymbolicEnvironment,
//     WeakMap<t.Node, SymbolicValue>
//   >();
//   readonly #active = new Set<t.Node>();
//   readonly #activeFunctions = new Set<t.Function>();
//   readonly #exportAliases = new Map<string, string>();
//   readonly #moduleBindings = new Set<string>();
//   readonly #replacements = new Map<string, t.Node>();
//   readonly #propertyActive = new WeakMap<object, Set<string>>();
//   readonly #literalPropertyIndex = new WeakMap<
//     t.ObjectExpression,
//     ReadonlyMap<string, t.ObjectMethod | t.ObjectProperty> | null
//   >();
//   readonly #mutated = new Set<string>();
//   readonly #electronIdentity: JavaScriptElectronIdentity;
//   readonly #namespaceOwners = new Map<string, t.Function>();
//   readonly #unsafeExports = new Set<string>();
//   readonly #aliasesByBinding = new Map<string, string[]>();
//   readonly #bootstrapTables: Array<{
//     readonly tableAliases: ReadonlySet<string>;
//     readonly modules: Map<string, SymbolicValue>;
//   }> = [];
//   #remainingEvaluations = 1_000_000;
//   #depth = 0;
//   truncated = false;
//   unresolved = false;
//
//   constructor(
//     readonly state: JavaScriptSemanticAnalysisState,
//     program: t.Program,
//     electronIdentity = completeSemanticSteps(
//       indexJavaScriptElectronIdentitySteps(program, state),
//     ),
//   ) {
//     this.#electronIdentity = electronIdentity;
//     this.#indexBindingAliases();
//     traverseJavaScriptAst(program, {
//       enter: (node) => {
//         if (t.isCallExpression(node)) this.#indexBootstrap(node);
//       },
//     });
//     traverseJavaScriptAst(program, {
//       enter: (node) => {
//         const target = semanticWriteSiteTarget(node);
//         if (target !== null) this.#indexWriteSite(target, node);
//         if (
//           t.isCallExpression(node) &&
//           t.isMemberExpression(node.callee) &&
//           t.isIdentifier(node.callee.object, { name: "Object" }) &&
//           !resolveSemanticBindingState(state, node.callee.object, "Object") &&
//           semanticStaticPropertyKey(
//             node.callee.property,
//             node.callee.computed,
//           ) === "defineProperty"
//         ) {
//           const [target, key, descriptor] = node.arguments;
//           if (
//             t.isIdentifier(target) &&
//             t.isStringLiteral(key) &&
//             t.isObjectExpression(descriptor)
//           ) {
//             const value = descriptor.properties.find(
//               (p) =>
//                 t.isObjectProperty(p) &&
//                 semanticStaticPropertyKey(p.key, p.computed) === "value",
//             );
//             if (t.isObjectProperty(value))
//               this.#addWrite(target, [key.value], value.value, node);
//           }
//         }
//       },
//     });
//     for (const table of this.#bootstrapTables)
//       this.#invalidateBootstrapTable(table.tableAliases, table.modules);
//   }
//
//   environmentAt(node: t.Node): SymbolicEnvironment {
//     let current: t.Node | undefined = node;
//     while (current) {
//       const found = this.#environments.get(current);
//       if (found) return found;
//       current = this.state.parentsByNode.get(current);
//     }
//     return emptyEnvironment;
//   }
//
//   evaluate(
//     input: t.Node | null | undefined,
//     environment?: SymbolicEnvironment,
//   ): SymbolicValue {
//     if (!input) return { kind: "literal", value: undefined };
//     if (--this.#remainingEvaluations < 0 || this.#depth >= 128) {
//       this.truncated = true;
//       return symbolicUnknown("symbolic resource limit");
//     }
//     const node = unwrapJavaScriptExpression(input).node;
//     const env = environment ?? this.environmentAt(node);
//     const cache = this.#cache.get(env) ?? new WeakMap<t.Node, SymbolicValue>();
//     this.#cache.set(env, cache);
//     const cached = cache.get(node);
//     if (cached) return cached;
//     if (this.#active.has(node)) return symbolicUnknown("cyclic binding");
//     this.#active.add(node);
//     this.#depth += 1;
//     try {
//       const value = this.#evaluate(node, env);
//       cache.set(node, value);
//       return value;
//     } finally {
//       this.#active.delete(node);
//       this.#depth -= 1;
//     }
//   }
//
//   property(value: SymbolicValue, key: string): SymbolicValue {
//     let result: SymbolicValue;
//     if (value.kind === "union")
//       result = symbolicUnion(
//         value.values.map((variant) => this.property(variant, key)),
//       );
//     else result = this.#property(value, key);
//     for (const condition of value.conditions ?? [])
//       result = symbolicCondition(result, condition);
//     if (value.conditionUnresolved)
//       result = symbolicConditionsUnresolved(result);
//     return result;
//   }
//
//   #property(value: SymbolicValue, key: string): SymbolicValue {
//     const active = this.#propertyActive.get(value) ?? new Set<string>();
//     if (active.has(key)) return symbolicUnknown("cyclic property");
//     active.add(key);
//     this.#propertyActive.set(value, active);
//     try {
//       return this.#propertyValue(value, key);
//     } finally {
//       active.delete(key);
//     }
//   }
//
//   #propertyValue(value: SymbolicValue, key: string): SymbolicValue {
//     if (value.kind === "external") {
//       const path = [...value.path, key];
//       if (
//         ELECTRON_MODULE.test(path[0] ?? "") &&
//         !this.#electronIdentity.intactExport(path)
//       ) {
//         return symbolicUnknown("overwritten Electron API member");
//       }
//       return { kind: "external", path };
//     }
//     if (value.kind === "record")
//       return value.values.get(key) ?? symbolicUnknown("missing property");
//     if (value.kind === "namespace") {
//       if (
//         this.#mutated.has(value.bindingId) ||
//         this.#unsafeExports.has(`${value.bindingId}:${key}`)
//       )
//         return symbolicUnknown("ambiguous export writes");
//       const replacement = this.#replacements.get(value.bindingId);
//       if (replacement)
//         return this.property(
//           this.evaluate(replacement, value.environment),
//           key,
//         );
//       const writes = (this.#writes.get(value.bindingId) ?? []).filter(
//         (w) => w.path.length === 1 && w.path[0] === key,
//       );
//       const write = writes.at(-1);
//       return write
//         ? this.evaluate(write.value, value.environment)
//         : symbolicUnknown("unresolved module export");
//     }
//     if (value.kind === "object") {
//       let index = this.#literalPropertyIndex.get(value.node);
//       if (index === undefined) {
//         const properties = new Map<string, t.ObjectMethod | t.ObjectProperty>();
//         index = properties;
//         for (const property of value.node.properties) {
//           const name = t.isSpreadElement(property)
//             ? null
//             : semanticStaticPropertyKey(property.key, property.computed);
//           if (name === null || t.isSpreadElement(property)) {
//             index = null;
//             break;
//           }
//           if (isObjectPrototypeSetter(property, name)) continue;
//           properties.set(name, property);
export const _l = 264;
