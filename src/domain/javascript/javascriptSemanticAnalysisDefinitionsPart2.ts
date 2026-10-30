export const __stub = 1;
//       for (const identifier of semanticWriteTargets(
//         t.isTSParameterProperty(parameter) ? parameter.parameter : parameter,
//       ))
//         if (t.isIdentifier(identifier))
//           copyParameterToBody({ identifier, body, scope, state });
//   }
// }
// const copyParameterToBody = (input: {
//   readonly identifier: t.Identifier;
//   readonly body: t.BlockStatement;
//   readonly scope: JavaScriptSemanticScopeState;
//   readonly state: JavaScriptSemanticAnalysisState;
// }): void => {
//   const { identifier, body, scope, state } = input;
//   const binding = scope.bindings.get(identifier.name);
//   if (
//     binding === undefined ||
//     binding.kind !== "variable" ||
//     binding.definitions.some(({ kind }) => kind === "function")
//   )
//     return;
//   binding.initializers.unshift({
//     node: identifier,
//     projection: [],
//     entryBody: body,
//   });
//   for (let index = binding.initializers.length - 1; index >= 0; index -= 1) {
//     const initializer = binding.initializers[index];
//     if (
//       initializer !== undefined &&
//       initializer.entryBody === undefined &&
//       initializer.projection.length === 0 &&
//       t.isIdentifier(initializer.node) &&
//       resolveSemanticBindingState(
//         state,
//         initializer.node,
//         initializer.node.name,
//       ) === binding
//     )
//       binding.initializers.splice(index, 1);
//   }
// };
// const writeMayBeSkipped = (
//   node: t.Node,
//   ancestors: readonly t.Node[],
// ): boolean => {
//   let child = node;
//   for (let index = ancestors.length - 1; index >= 0; index -= 1) {
//     const parent = ancestors[index];
//     if (
//       parent === undefined ||
//       t.isFunction(parent) ||
//       t.isProgram(parent) ||
//       t.isStaticBlock(parent)
//     )
//       return false;
//     if (isSkippedBranch(parent, child)) return true;
//     child = parent;
//   }
//   return false;
// };
// const isSkippedBranch = (parent: t.Node, child: t.Node): boolean => {
//   if (t.isIfStatement(parent))
//     return child === parent.consequent || child === parent.alternate;
//   if (t.isSwitchCase(parent)) return true;
//   if (t.isTryStatement(parent))
//     return child === parent.block || child === parent.handler;
//   if (t.isForStatement(parent))
//     return child === parent.body || child === parent.update;
//   if (t.isWhileStatement(parent)) return child === parent.body;
//   if (t.isDoWhileStatement(parent)) return false;
//   if (t.isForInStatement(parent) || t.isForOfStatement(parent))
//     return child === parent.left || child === parent.body;
//   if (t.isLogicalExpression(parent)) return child === parent.right;
//   if (t.isConditionalExpression(parent))
//     return child === parent.consequent || child === parent.alternate;
//   if (t.isOptionalCallExpression(parent) || t.isCallExpression(parent))
//     return (
//       parent.arguments.includes(child as t.Expression) &&
//       optionalCallArgumentsMayBeSkipped(parent)
//     );
//   if (t.isOptionalMemberExpression(parent))
//     return parent.optional && parent.computed && child === parent.property;
//   return false;
// };
// const optionalCallArgumentsMayBeSkipped = (
//   call: t.CallExpression | t.OptionalCallExpression,
// ): boolean => {
//   if (t.isOptionalCallExpression(call) && call.optional) return true;
//   let callee: t.Node = call.callee;
//   while (true) {
//     if (callee.extra?.parenthesized === true) return false;
//     if (t.isOptionalMemberExpression(callee)) {
//       if (callee.optional) return true;
//       callee = callee.object;
//     } else if (t.isMemberExpression(callee)) callee = callee.object;
//     else if (t.isOptionalCallExpression(callee)) {
//       if (callee.optional) return true;
//       callee = callee.callee;
//     } else if (t.isCallExpression(callee)) callee = callee.callee;
//     else return false;
//   }
// };
// const bindOuterDeclaration = (
//   node: t.Node,
//   scope: JavaScriptSemanticScopeState,
//   state: JavaScriptSemanticAnalysisState,
// ): void => {
//   if (t.isFunctionDeclaration(node) && t.isIdentifier(node.id))
//     addBinding({
//       state,
//       scope,
//       name: node.id.name,
//       kind: "function",
//       mutable: false,
//       definitionNode: node.id,
//       initializer: node,
//     });
//   else if (t.isClassDeclaration(node) && t.isIdentifier(node.id))
//     addBinding({
//       state,
//       scope,
//       name: node.id.name,
//       kind: "class",
//       mutable: false,
//       definitionNode: node.id,
//       initializer: node,
//     });
// };
// const bindInnerDeclaration = (
//   node: t.Node,
//   parent: t.Node | null,
//   scope: JavaScriptSemanticScopeState,
//   state: JavaScriptSemanticAnalysisState,
// ): void => {
//   if (t.isImportDeclaration(node)) bindImports(node, scope, state);
//   else if (t.isTSImportEqualsDeclaration(node))
//     bindImportEquals(node, scope, state);
//   else if (t.isVariableDeclarator(node))
//     bindPattern({
//       pattern: node.id,
//       initializer: node.init ?? null,
//       scope: semanticVariableScope(scope, parent, state),
//       state,
//       mutable:
//         parent !== null && t.isVariableDeclaration(parent)
//           ? parent.kind !== "const"
//           : true,
//       ...(parent !== null && t.isVariableDeclaration(parent)
//         ? { declarationKind: parent.kind }
//         : {}),
//     });
//   else if (t.isClassExpression(node) && t.isIdentifier(node.id))
//     addBinding({
//       state,
//       scope,
//       name: node.id.name,
//       kind: "class",
//       mutable: false,
//       definitionNode: node.id,
//       initializer: node,
//     });
//   else if (t.isFunction(node)) bindFunctionLocals(node, scope, state);
//   else if (t.isCatchClause(node) && node.param != null)
//     bindPattern({
//       pattern: node.param,
//       initializer: null,
//       scope,
//       state,
//       mutable: true,
//       kind: "catch",
//     });
// };
// const bindImportEquals = (
//   node: t.TSImportEqualsDeclaration,
//   scope: JavaScriptSemanticScopeState,
//   state: JavaScriptSemanticAnalysisState,
// ): void => {
//   const specifier = semanticImportEqualsSpecifier(node);
//   if (specifier === null) return;
//   addBinding({
//     state,
//     scope,
//     name: node.id.name,
//     kind: "import",
//     mutable: false,
//     definitionNode: node.id,
//     initializer: null,
//     directOrigin: { specifier, importedPath: [], resolutionMode: "require" },
//   });
// };
// const hasIncomingValue = (
//   identifier: t.Identifier,
//   scope: JavaScriptSemanticScopeState,
//   state: JavaScriptSemanticAnalysisState,
// ): boolean => {
//   const kind = resolveSemanticBindingFromScope(
//     scope,
//     identifier.name,
//     state,
//   )?.kind;
//   return kind === "parameter" || kind === "catch";
// };
// const bindAssignment = (
//   node: t.Node,
//   scope: JavaScriptSemanticScopeState,
//   state: JavaScriptSemanticAnalysisState,
//   conditionallySkipped: boolean,
// ): void => {
//   if (t.isAssignmentExpression(node)) {
export const _l = 210;
