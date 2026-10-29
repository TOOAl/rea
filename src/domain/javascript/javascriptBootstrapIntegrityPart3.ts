export const __stub = 1;
//   });
//   return contained;
// };
//
// const moduleUse = (
//   node: t.Identifier,
//   [parent, grandparent]: readonly [t.Node, t.Node | undefined],
//   dispatch: t.CallExpression,
// ): boolean => {
//   if (parent === dispatch) return dispatch.arguments.includes(node);
//   if (!t.isMemberExpression(parent) || parent.object !== node) return false;
//   const key = semanticStaticPropertyKey(parent.property, parent.computed);
//   const written =
//     (t.isAssignmentExpression(grandparent) && grandparent.left === parent) ||
//     t.isUpdateExpression(grandparent) ||
//     t.isUnaryExpression(grandparent, { operator: "delete" });
//   if (written) return key !== null && key !== "exports";
//   if (key !== "exports") return false;
//   // `module.exports` passed to the factory, or read after the dispatch ran.
//   return (
//     grandparent === dispatch ||
//     (parent.start ?? -1) > (dispatch.end ?? Number.POSITIVE_INFINITY)
//   );
// };
//
// /** Record `cache[key]` reads that initialize the loader's early-return binding. */
// const withCacheReads = (
//   loader: t.FunctionDeclaration,
//   shape: LoaderShape,
//   state: JavaScriptSemanticAnalysisState,
// ): LoaderShape | undefined => {
//   if (shape.cacheId === undefined) return shape;
//   const sites = new Set(shape.cacheSites);
//   let contained = true;
//   traverseJavaScriptAst(loader.body, {
//     skip: (node) => t.isFunction(node),
//     enter: (node, parent) => {
//       if (
//         !t.isMemberExpression(node) ||
//         keyedSlot(node, shape.parameterId, state) !== shape.cacheId
//       )
//         return;
//       const read = t.isVariableDeclarator(parent) && parent.init === node;
//       const deleted = t.isUnaryExpression(parent, { operator: "delete" });
//       if (read || deleted || sites.has(node)) sites.add(node);
//       else contained = false;
//     },
//   });
//   return contained ? { ...shape, cacheSites: sites } : undefined;
// };
//
// /** Accept `module.exports` or `cache[key].exports` read through a stable binding. */
// const returnsModuleExports = (
//   argument: t.Expression | null | undefined,
//   shape: LoaderShape,
//   state: JavaScriptSemanticAnalysisState,
// ): boolean => {
//   const value = t.isSequenceExpression(argument)
//     ? argument.expressions.at(-1)
//     : argument;
//   const before = t.isSequenceExpression(argument)
//     ? argument.expressions.slice(0, -1)
//     : [];
//   if (
//     !before.every((expression) =>
//       sideEffectBeforeReturn(expression, shape, state),
//     )
//   )
//     return false;
//   if (
//     !t.isMemberExpression(value) ||
//     !t.isIdentifier(value.object) ||
//     semanticStaticPropertyKey(value.property, value.computed) !== "exports"
//   )
//     return false;
//   const id = bindingOf(state, value.object);
//   if (id === shape.moduleId) return true;
//   if (id === undefined || shape.cacheId === undefined) return false;
//   const binding = state.bindingsById.get(id);
//   const initializer = semanticStableInitializer(binding, state);
//   return (
//     binding?.definitions.length === 1 &&
//     initializer?.projection.length === 0 &&
//     keyedSlot(initializer.node, shape.parameterId, state) === shape.cacheId
//   );
// };
//
// /** The dispatch itself, or a write to a module member other than `exports`. */
// const sideEffectBeforeReturn = (
//   expression: t.Expression,
//   shape: LoaderShape,
//   state: JavaScriptSemanticAnalysisState,
// ): boolean => {
//   if (expression === shape.dispatch) return true;
//   if (
//     !t.isAssignmentExpression(expression) ||
//     !t.isMemberExpression(expression.left) ||
//     !t.isIdentifier(expression.left.object) ||
//     bindingOf(state, expression.left.object) !== shape.moduleId
//   )
//     return false;
//   const key = semanticStaticPropertyKey(
//     expression.left.property,
//     expression.left.computed,
//   );
//   return key !== null && key !== "exports";
// };
//
// /** The binding of `owner` in `owner[key]` when `key` is the loader parameter. */
// const keyedSlot = (
//   node: t.Node,
//   parameterId: string,
//   state: JavaScriptSemanticAnalysisState,
// ): string | undefined =>
//   t.isMemberExpression(node) &&
//   node.computed &&
//   t.isIdentifier(node.object) &&
//   t.isIdentifier(node.property) &&
//   bindingOf(state, node.property) === parameterId
//     ? bindingOf(state, node.object)
//     : undefined;
//
// const referencesAreContained = (
//   call: t.CallExpression,
//   {
//     bootstrap,
//     shape,
//     loaderIds,
//   }: {
//     readonly bootstrap: Bootstrap;
//     readonly shape: LoaderShape;
//     readonly loaderIds: ReadonlySet<string>;
export const _l = 132;
