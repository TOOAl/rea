export const __stub = 1;
// import * as t from "@babel/types";
//
// import {
//   semanticStaticPropertyKey,
//   unwrapJavaScriptExpression,
// } from "./javascriptAstValues.js";
// import type { JavaScriptSemanticBindingState } from "./javascriptSemanticState.js";
//
// interface StatementPosition {
//   readonly body: readonly t.Statement[];
//   readonly index: number;
//   readonly declaratorIndex: number;
// }
//
// /**
//  * Initializer positions depend only on a node and its parent map, which one
//  * analysis builds once and never changes. Different mutations and initializers
//  * re-derive the same positions along shared ancestry, so retain the first
//  * result for as long as its parent map is reachable.
//  */
// interface InitializerPositionCache {
//   readonly direct: WeakMap<t.Node, StatementPosition | null>;
//   readonly mutation: WeakMap<t.Node, StatementPosition | null>;
//   readonly reference: WeakMap<t.Node, StatementPosition | null>;
// }
//
// const initializerPositionCaches = new WeakMap<
//   WeakMap<t.Node, t.Node>,
//   InitializerPositionCache
// >();
//
// const initializerPositionCache = (
//   parents: WeakMap<t.Node, t.Node>,
// ): InitializerPositionCache => {
//   const cached = initializerPositionCaches.get(parents);
//   if (cached !== undefined) return cached;
//   const created: InitializerPositionCache = {
//     direct: new WeakMap(),
//     mutation: new WeakMap(),
//     reference: new WeakMap(),
//   };
//   initializerPositionCaches.set(parents, created);
//   return created;
// };
//
// const statementPosition = (
//   statement: t.Statement,
//   parents: WeakMap<t.Node, t.Node>,
//   declarator?: t.VariableDeclarator,
// ): StatementPosition | null => {
//   const parent = parents.get(statement);
//   if (!t.isProgram(parent) && !t.isBlockStatement(parent)) return null;
//   const index = parent.body.indexOf(statement);
//   return index < 0
//     ? null
//     : {
//         body: parent.body,
//         index,
//         declaratorIndex:
//           t.isVariableDeclaration(statement) && declarator !== undefined
//             ? statement.declarations.indexOf(declarator)
//             : -1,
//       };
// };
//
// const positionPrecedes = (
//   left: StatementPosition,
//   right: StatementPosition,
// ): boolean =>
//   left.body === right.body &&
//   (left.index < right.index ||
//     (left.index === right.index &&
//       left.declaratorIndex >= 0 &&
//       left.declaratorIndex < right.declaratorIndex));
//
// /** Order effects only in a non-repeating top-level activation. */
// export const semanticTopLevelEffectFollowsCapture = (
//   capture: t.Node,
//   effect: t.Node | undefined,
//   parents: WeakMap<t.Node, t.Node>,
// ): boolean => {
//   const position = (node: t.Node | undefined): StatementPosition | null => {
//     let selected: StatementPosition | null = null;
//     let declarator: t.VariableDeclarator | undefined;
//     let child: t.Node | undefined;
//     while (node !== undefined) {
//       if (t.isFunction(node) || t.isLoop(node)) return null;
//       if (
//         (t.isClassProperty(node) ||
//           t.isClassPrivateProperty(node) ||
//           t.isClassAccessorProperty(node)) &&
//         !node.static &&
//         node.value === child
//       )
//         return null;
//       if (t.isVariableDeclarator(node)) declarator = node;
//       if (selected === null && t.isStatement(node))
//         selected = statementPosition(node, parents, declarator);
//       if (t.isProgram(node)) return selected;
//       child = node;
//       node = parents.get(node);
//     }
//     return null;
//   };
//   const before = position(capture);
//   const after = position(effect);
//   if (before === null || after === null) return false;
//   if (positionPrecedes(before, after)) return true;
//   if (
//     before.body !== after.body ||
//     before.index !== after.index ||
//     before.declaratorIndex !== after.declaratorIndex
//   )
//     return false;
//   return expressionEvaluationPrecedes(capture, effect, parents);
// };
//
// /** Prove ordering only where JavaScript evaluates sibling expressions left-to-right. */
// const expressionEvaluationPrecedes = (
//   earlier: t.Node,
//   later: t.Node | undefined,
//   parents: WeakMap<t.Node, t.Node>,
// ): boolean => {
//   if (later === undefined) return false;
//   const earlierAncestors = new Set<t.Node>();
//   let current: t.Node | undefined = earlier;
//   while (current !== undefined) {
//     earlierAncestors.add(current);
//     current = parents.get(current);
//   }
//   const laterPath: t.Node[] = [];
//   current = later;
//   while (current !== undefined && !earlierAncestors.has(current)) {
//     laterPath.push(current);
//     current = parents.get(current);
//   }
//   const common = current;
export const _l = 137;
