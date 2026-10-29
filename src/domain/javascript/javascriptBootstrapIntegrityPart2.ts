export const __stub = 1;
// const tableDispatch = (
//   call: t.CallExpression,
//   tableId: string,
//   parameterId: string,
//   state: JavaScriptSemanticAnalysisState,
// ): { readonly table: t.Node; readonly moduleId?: string } | undefined => {
//   const viaCall =
//     t.isMemberExpression(call.callee) &&
//     semanticStaticPropertyKey(call.callee.property, call.callee.computed) ===
//       "call";
//   const slot =
//     viaCall && t.isMemberExpression(call.callee)
//       ? call.callee.object
//       : call.callee;
//   if (
//     !t.isMemberExpression(slot) ||
//     !slot.computed ||
//     !t.isIdentifier(slot.object) ||
//     !t.isIdentifier(slot.property) ||
//     bindingOf(state, slot.object) !== tableId ||
//     bindingOf(state, slot.property) !== parameterId
//   )
//     return undefined;
//   const module = call.arguments[viaCall ? 1 : 0];
//   const moduleId = t.isIdentifier(module)
//     ? bindingOf(state, module)
//     : undefined;
//   return moduleId === undefined
//     ? { table: slot.object }
//     : { table: slot.object, moduleId };
// };
//
// /**
//  * The module object is a fresh literal, optionally stored as `cache[key]`.
//  * Undefined means no cache; null means the module binding is not proven.
//  */
// const moduleCache = (
//   moduleId: string,
//   parameterId: string,
//   state: JavaScriptSemanticAnalysisState,
// ): { readonly cacheId: string; readonly site: t.Node } | undefined | null => {
//   const binding = state.bindingsById.get(moduleId);
//   const initializer = semanticStableInitializer(binding, state);
//   if (
//     binding?.definitions.length !== 1 ||
//     initializer === undefined ||
//     initializer.projection.length !== 0
//   )
//     return null;
//   const value = initializer.node;
//   if (isPlainObject(value)) return undefined;
//   if (
//     !t.isAssignmentExpression(value, { operator: "=" }) ||
//     !isPlainObject(value.right)
//   )
//     return null;
//   const cacheId = keyedSlot(value.left, parameterId, state);
//   return cacheId !== undefined && startsEmpty(cacheId, state)
//     ? { cacheId, site: value.left }
//     : null;
// };
//
// /** A pre-populated cache could answer the early return without a dispatch. */
// const startsEmpty = (
//   cacheId: string,
//   state: JavaScriptSemanticAnalysisState,
// ): boolean => {
//   const binding = state.bindingsById.get(cacheId);
//   const initializer = semanticStableInitializer(binding, state);
//   return (
//     binding?.definitions.length === 1 &&
//     initializer?.projection.length === 0 &&
//     t.isObjectExpression(initializer.node) &&
//     initializer.node.properties.length === 0
//   );
// };
//
// /** An object literal of ordinary data properties, so `exports` stores plainly. */
// const isPlainObject = (node: t.Node): boolean =>
//   t.isObjectExpression(node) &&
//   node.properties.every(
//     (property) =>
//       t.isObjectProperty(property) &&
//       !property.computed &&
//       semanticStaticPropertyKey(property.key, false) !== "__proto__",
//   );
//
// /** Every ancestor up to the loader body executes whenever the loader runs. */
// const runsUnconditionally = (
//   dispatch: t.Node,
//   loader: t.FunctionDeclaration,
//   state: JavaScriptSemanticAnalysisState,
// ): boolean => {
//   let child: t.Node = dispatch;
//   let parent = state.parentsByNode.get(child);
//   while (parent !== undefined && child !== loader.body) {
//     const ordered =
//       t.isSequenceExpression(parent) ||
//       t.isExpressionStatement(parent) ||
//       t.isReturnStatement(parent) ||
//       t.isBlockStatement(parent) ||
//       (t.isMemberExpression(parent) && parent.object === child) ||
//       (t.isCallExpression(parent) && parent.callee === child) ||
//       (t.isTryStatement(parent) && parent.block === child);
//     if (!ordered) return false;
//     child = parent;
//     parent = state.parentsByNode.get(parent);
//   }
//   return child === loader.body;
// };
//
// /**
//  * The module object reaches only the dispatch, `.exports` reads after it, and
//  * writes to members other than `exports`, so nothing swaps its exports.
//  */
// const moduleObjectContained = (
//   loader: t.FunctionDeclaration,
//   moduleId: string,
//   dispatch: t.CallExpression,
//   state: JavaScriptSemanticAnalysisState,
// ): boolean => {
//   let contained = true;
//   traverseJavaScriptAst(loader.body, {
//     enter: (node, parent, readAncestors) => {
//       if (!contained || !t.isIdentifier(node) || parent === null) return;
//       const ancestors = readAncestors();
//       if (!t.isReferenced(node, parent, ancestors.at(-2))) return;
//       if (bindingOf(state, node) !== moduleId) return;
//       contained =
//         !ancestors.some((ancestor) => t.isFunction(ancestor)) &&
//         moduleUse(node, [parent, ancestors.at(-2)], dispatch);
//     },
export const _l = 132;
