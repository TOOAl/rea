export const __stub = 1;
//   if (common === undefined || common === earlier || common === later)
//     return false;
//   let earlierChild: t.Node = earlier;
//   while (parents.get(earlierChild) !== common) {
//     const parent = parents.get(earlierChild);
//     if (parent === undefined) return false;
//     earlierChild = parent;
//   }
//   const laterChild = laterPath.at(-1);
//   if (laterChild === undefined) return false;
//   const orderedChildren = ((): readonly t.Node[] | null => {
//     if (t.isSequenceExpression(common)) return common.expressions;
//     if (t.isCallExpression(common) || t.isOptionalCallExpression(common))
//       return [common.callee, ...common.arguments];
//     if (t.isNewExpression(common)) return [common.callee, ...common.arguments];
//     if (t.isBinaryExpression(common) || t.isLogicalExpression(common))
//       return [common.left, common.right];
//     if (t.isConditionalExpression(common)) return [common.test];
//     return null;
//   })();
//   if (orderedChildren === null) return false;
//   const earlierIndex = orderedChildren.indexOf(earlierChild);
//   const laterIndex = orderedChildren.indexOf(laterChild);
//   return earlierIndex >= 0 && laterIndex > earlierIndex;
// };
//
// const computeDirectInitializerPosition = (
//   node: t.Node,
//   parents: WeakMap<t.Node, t.Node>,
// ): StatementPosition | null => {
//   const parent = parents.get(node);
//   if (t.isVariableDeclarator(parent) && parent.init === node) {
//     const declaration = parents.get(parent);
//     return t.isVariableDeclaration(declaration)
//       ? statementPosition(declaration, parents, parent)
//       : null;
//   }
//   if (
//     t.isAssignmentExpression(parent) &&
//     parent.operator === "=" &&
//     parent.right === node &&
//     t.isIdentifier(parent.left)
//   ) {
//     const statement = parents.get(parent);
//     return t.isExpressionStatement(statement) && statement.expression === parent
//       ? statementPosition(statement, parents)
//       : null;
//   }
//   return null;
// };
//
// const directInitializerPosition = (
//   node: t.Node,
//   parents: WeakMap<t.Node, t.Node>,
// ): StatementPosition | null => {
//   const cache = initializerPositionCache(parents);
//   const cached = cache.direct.get(node);
//   if (cached !== undefined) return cached;
//   const computed = computeDirectInitializerPosition(node, parents);
//   cache.direct.set(node, computed);
//   return computed;
// };
//
// const computeDirectMutationPosition = (
//   node: t.Node,
//   parents: WeakMap<t.Node, t.Node>,
// ): StatementPosition | null => {
//   if (t.isForOfStatement(node)) return statementPosition(node, parents);
//   if (t.isVariableDeclarator(node)) {
//     const declaration = parents.get(node);
//     return t.isVariableDeclaration(declaration)
//       ? statementPosition(declaration, parents, node)
//       : null;
//   }
//   if (t.isSpreadElement(node)) {
//     const array = parents.get(node);
//     return t.isArrayExpression(array)
//       ? semanticCapturePosition(array, parents)
//       : null;
//   }
//   if (
//     !t.isAssignmentExpression(node) &&
//     !t.isUpdateExpression(node) &&
//     !t.isUnaryExpression(node, { operator: "delete" }) &&
//     !t.isCallExpression(node) &&
//     !t.isOptionalCallExpression(node) &&
//     !t.isNewExpression(node) &&
//     !t.isTaggedTemplateExpression(node)
//   )
//     return null;
//   let current: t.Node = node;
//   while (true) {
//     const parent = parents.get(current);
//     if (
//       parent === undefined ||
//       t.isFunction(parent) ||
//       (t.isLogicalExpression(parent) && parent.right === current) ||
//       (t.isConditionalExpression(parent) && parent.test !== current)
//     )
//       return null;
//     if (t.isStatement(parent)) return statementPosition(parent, parents);
//     if (t.isVariableDeclarator(parent)) {
//       const declaration = parents.get(parent);
//       return t.isVariableDeclaration(declaration)
//         ? statementPosition(declaration, parents, parent)
//         : null;
//     }
//     current = parent;
//   }
// };
//
// const directMutationPosition = (
//   node: t.Node,
//   parents: WeakMap<t.Node, t.Node>,
// ): StatementPosition | null => {
//   const cache = initializerPositionCache(parents);
//   const cached = cache.mutation.get(node);
//   if (cached !== undefined) return cached;
//   const computed = computeDirectMutationPosition(node, parents);
//   cache.mutation.set(node, computed);
//   return computed;
// };
//
// const computeReferenceInitializerPosition = (
//   node: t.Node,
//   parents: WeakMap<t.Node, t.Node>,
// ): StatementPosition | null => {
//   // Defaults live inside the declaration pattern rather than its initializer.
//   let current = node;
//   while (true) {
//     const direct = directInitializerPosition(current, parents);
//     if (direct !== null) return direct;
//     const parent = parents.get(current);
//     if (parent === undefined || t.isStatement(parent) || t.isFunction(parent))
//       return null;
//     if (t.isVariableDeclarator(parent)) {
//       const declaration = parents.get(parent);
export const _l = 137;
