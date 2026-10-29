export const __stub = 1;
// import * as t from "@babel/types";
//
// import { BUILTIN_RESOURCE_METHODS } from "./javascriptBuiltinResourceMethods.js";
// import { semanticBuiltinNamespacePath } from "./javascriptSemanticProvenance.js";
// import {
//   semanticRequireOrigin,
//   semanticRequireExportsIdentity,
//   semanticGlobalProcessOrigin,
//   semanticMutableBuiltinOrigin,
// } from "./javascriptSemanticRequireOrigin.js";
// import type { JavaScriptModuleOrigin } from "./javascriptSemanticIr.js";
// import {
//   evaluateSemanticProvenance,
//   evaluateSemanticProvenanceAtRead,
// } from "./javascriptSemanticValues.js";
// import {
//   semanticPropertyPathKeyMatches,
//   type JavaScriptSemanticPropertyPath,
// } from "./javascriptSemanticPropertyPaths.js";
//
// import { semanticCallableIdForNode } from "./javascriptSemanticProjection.js";
// import { semanticTopLevelEffectFollowsCapture } from "./javascriptSemanticMutationInitializers.js";
// import { createSemanticCallableIdStack } from "./javascriptSemanticCallableStack.js";
// import {
//   resolveSemanticBindingState,
//   type JavaScriptSemanticAnalysisState,
//   type JavaScriptSemanticBindingState,
//   type JavaScriptSemanticMemberEffect,
//   type JavaScriptSemanticRequiredModuleEffect,
// } from "./javascriptSemanticState.js";
// import { traverseJavaScriptAst } from "./javascriptSemanticTraversal.js";
// import {
//   readExactJavaScriptLiteral,
//   semanticStaticPropertyKey,
//   unwrapJavaScriptExpression,
// } from "./javascriptAstValues.js";
//
// export interface SemanticProjectedBinding {
//   readonly bindingId: string;
//   readonly identifier: t.Identifier;
//   readonly projectionPath: readonly (string | number | null)[];
//   readonly resolution: "complete" | "partial";
// }
//
// /** Resolve bindings written by the nearest variable or assignment owner. */
// export const assignedSemanticResultBindings = (
//   node: t.Node,
//   ancestors: readonly t.Node[],
//   state: JavaScriptSemanticAnalysisState,
// ): SemanticProjectedBinding[] => {
//   for (let index = ancestors.length - 1; index >= 0; index -= 1) {
//     const owner = ancestors[index];
//     if (owner === undefined) continue;
//     let pattern: t.Node | undefined;
//     let source: t.Node | null = null;
//     if (t.isVariableDeclarator(owner)) {
//       pattern = owner.id;
//       source = owner.init ?? null;
//     } else if (t.isAssignmentExpression(owner)) {
//       pattern = owner.left;
//       source = owner.right;
//     }
//     if (
//       pattern !== undefined &&
//       source !== null &&
//       assignedSourceIs(node, source)
//     )
//       return projectedPatternBindings(pattern, state);
//     if (semanticCallableIdForNode(owner) !== null) return [];
//   }
//   return [];
// };
//
// const assignedSourceIs = (node: t.Node, source: t.Node): boolean => {
//   let value = source;
//   while (true) {
//     if (t.isAwaitExpression(value)) value = value.argument;
//     else {
//       const unwrapped = unwrapJavaScriptExpression(value).node;
//       if (unwrapped === value) break;
//       value = unwrapped;
//     }
//   }
//   return value === node;
// };
//
// const projectedPatternBindings = (
//   pattern: t.Node,
//   state: JavaScriptSemanticAnalysisState,
// ): SemanticProjectedBinding[] => {
//   const output: SemanticProjectedBinding[] = [];
//   const visit = (
//     current: t.Node,
//     path: readonly (string | number | null)[],
//     partial: boolean,
//   ): void => {
//     if (t.isIdentifier(current)) {
//       const binding = resolveSemanticBindingState(state, current, current.name);
//       if (binding !== undefined)
//         output.push({
//           bindingId: binding.bindingId,
//           identifier: current,
//           projectionPath: path,
//           resolution: partial ? "partial" : "complete",
//         });
//       return;
//     }
//     if (t.isAssignmentPattern(current)) return visit(current.left, path, true);
//     if (t.isRestElement(current))
//       return visit(current.argument, [...path, null], true);
//     if (t.isObjectPattern(current)) {
//       for (const property of current.properties) {
//         if (t.isRestElement(property))
//           visit(property.argument, [...path, null], true);
//         else
//           visit(
//             property.value,
//             [
//               ...path,
//               semanticStaticPropertyKey(property.key, property.computed),
//             ],
//             partial ||
//               semanticStaticPropertyKey(property.key, property.computed) ===
//                 null,
//           );
//       }
//     } else if (t.isArrayPattern(current)) {
//       current.elements.forEach((element, index) => {
//         if (element !== null) visit(element, [...path, index], partial);
//       });
//     }
//   };
//   visit(pattern, [], false);
//   return output;
// };
//
// export const semanticProjectedBindingFacts = (
//   bindings: readonly SemanticProjectedBinding[],
// ): Omit<SemanticProjectedBinding, "identifier">[] =>
//   bindings.map(({ identifier: _identifier, ...fact }) => fact);
//
// /** Return a scalar owner only for an unprojected identifier result. */
// export const scalarAssignedResultBinding = (
//   bindings: readonly SemanticProjectedBinding[],
// ): string | null =>
//   bindings.length === 1 && bindings[0]?.projectionPath.length === 0
//     ? (bindings[0]?.bindingId ?? null)
//     : null;
//
// /** Shared mutable stacks reset before each deterministic data-effect pass. */
// export interface DataEffectTraversalContext {
//   readonly state: JavaScriptSemanticAnalysisState;
//   readonly callableIds: ReadonlySet<string>;
//   readonly callableStack: string[];
//   readonly ancestors: t.Node[];
// }
//
// /** Resolve built-in methods from the shared, unambiguous binding provenance. */
// export const builtinDataEffectMethod = (
//   callee: t.Node,
//   state: JavaScriptSemanticAnalysisState,
//   specifiers: readonly string[],
// ): string | null => {
//   const expression = unwrapJavaScriptExpression(callee).node;
//   if (expression !== callee)
//     return builtinDataEffectMethod(expression, state, specifiers);
//   if (t.isSequenceExpression(expression)) {
//     const final = expression.expressions.at(-1);
//     return final === undefined
//       ? null
//       : builtinDataEffectMethod(final, state, specifiers);
//   }
//   const required = semanticRequireOrigin(callee, state);
//   if (required !== undefined) {
//     const origin = builtinNamespaceOrigin(required.origin);
//     return origin.importedPath.length === 1 &&
//       specifiers.some(
//         (specifier) => specifier.replace(/^node:/u, "") === origin.specifier,
//       ) &&
//       !requiredModuleChanged(
//         required.origin.specifier,
//         required.origin.importedPath,
//         callee,
//         state,
//         true,
//       )
//       ? (origin.importedPath[0] ?? null)
//       : null;
//   }
//   if (t.isIdentifier(callee)) {
//     const binding = resolveSemanticBindingState(state, callee, callee.name);
//     const path = builtinBindingPath(
//       binding,
//       state,
//       specifiers,
//       callee,
//       [],
//       true,
//     );
//     return path?.length === 1 ? (path[0] ?? null) : null;
//   }
//   if (!t.isMemberExpression(callee) && !t.isOptionalMemberExpression(callee))
//     return null;
//   if (!t.isIdentifier(callee.object)) {
//     const method = semanticStaticPropertyKey(callee.property, callee.computed);
//     const receiver = semanticBoundMemberPath(callee.object, state);
//     if (method !== null && receiver !== undefined) {
//       const provenance = evaluateSemanticProvenance(receiver.binding, state);
//       if (provenance.status === "module") {
//         const origin = builtinNamespaceOrigin({
//           ...provenance.origins[0],
//           importedPath: [
//             ...provenance.origins[0].importedPath,
//             ...receiver.path,
//           ],
//         });
//         if (
//           specifiers.some(
//             (specifier) =>
//               specifier.replace(/^node:/u, "") === origin.specifier,
//           )
//         )
//           return builtinBindingPath(
//             receiver.binding,
//             state,
//             specifiers,
//             callee,
//             [...receiver.path, method],
//             true,
//           )?.length === 0
//             ? method
//             : null;
//       }
//     }
//     const source = semanticExpressionModuleOrigin(callee.object, state);
//     if (method === null || source === undefined) return null;
//     const origin = builtinNamespaceOrigin(source);
export const _l = 237;
