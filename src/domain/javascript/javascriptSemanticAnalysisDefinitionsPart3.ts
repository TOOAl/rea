export const __stub = 1;
//     const left = unwrapJavaScriptExpression(node.left).node;
//     if (t.isIdentifier(left))
//       addAssignment(
//         left,
//         node.operator === "=" ||
//           ((node.operator === "||=" || node.operator === "??=") &&
//             !hasIncomingValue(left, scope, state))
//           ? node.right
//           : node,
//         scope,
//         state,
//         conditionallySkipped,
//       );
//     else
//       for (const identifier of semanticWriteTargets(node.left))
//         if (t.isIdentifier(identifier))
//           addAssignment(identifier, node, scope, state, conditionallySkipped);
//   } else if (t.isUpdateExpression(node)) {
//     const argument = unwrapJavaScriptExpression(node.argument).node;
//     if (t.isIdentifier(argument))
//       addAssignment(argument, node, scope, state, conditionallySkipped);
//   } else if (t.isForOfStatement(node) || t.isForInStatement(node))
//     for (const pattern of t.isVariableDeclaration(node.left)
//       ? node.left.declarations.map(({ id }) => id)
//       : [node.left]) {
//       for (const identifier of semanticWriteTargets(pattern))
//         if (t.isIdentifier(identifier))
//           addAssignment(identifier, node, scope, state, conditionallySkipped);
//       if (t.isForOfStatement(node))
//         bindPattern({
//           pattern,
//           initializer: node,
//           scope,
//           state,
//           mutable: true,
//           referenceOnly: true,
//         });
//     }
// };
// const nestedScope = (
//   node: t.Node,
//   parent: t.Node | null,
//   parentScope: JavaScriptSemanticScopeState,
//   state: JavaScriptSemanticAnalysisState,
// ): JavaScriptSemanticScopeState | undefined => {
//   const switchOwner =
//     t.isSwitchCase(node) && parent !== null && t.isSwitchStatement(parent)
//       ? parent
//       : undefined;
//   if (switchOwner !== undefined) {
//     const existing = state.scopesById.get(
//       semanticScopeId("block", switchOwner),
//     );
//     if (existing !== undefined) return existing;
//   }
//   const kind = scopeKind(node, parent);
//   if (kind === undefined) return undefined;
//   const scope: JavaScriptSemanticScopeState = {
//     scopeId: semanticScopeId(kind, switchOwner ?? node),
//     parentScopeId:
//       functionNameScope(node, parentScope, state)?.scopeId ??
//       parentScope.scopeId,
//     kind,
//     location: range(switchOwner ?? node),
//     bindingsComplete: true,
//     bindings: new Map(),
//   };
//   state.scopes.push(scope);
//   state.scopesById.set(scope.scopeId, scope);
//   return scope;
// };
// const functionNameScope = (
//   node: t.Node,
//   parentScope: JavaScriptSemanticScopeState,
//   state: JavaScriptSemanticAnalysisState,
// ): JavaScriptSemanticScopeState | undefined => {
//   if (!t.isFunctionExpression(node) || !t.isIdentifier(node.id))
//     return undefined;
//   const scope: JavaScriptSemanticScopeState = {
//     scopeId: `${semanticScopeId("block", node)}:function-name`,
//     parentScopeId: parentScope.scopeId,
//     kind: "block",
//     location: range(node),
//     bindingsComplete: true,
//     bindings: new Map(),
//   };
//   state.scopes.push(scope);
//   state.scopesById.set(scope.scopeId, scope);
//   addBinding({
//     state,
//     scope,
//     name: node.id.name,
//     kind: "function",
//     mutable: false,
//     definitionNode: node.id,
//     initializer: node,
//   });
//   return scope;
// };
// const scopeKind = (
//   node: t.Node,
//   parent: t.Node | null,
// ): JavaScriptSemanticScopeState["kind"] | undefined => {
//   if (t.isFunction(node)) return "function";
//   if (t.isClass(node)) return "class";
//   if (t.isCatchClause(node)) return "catch";
//   if (
//     t.isForStatement(node) ||
//     t.isForOfStatement(node) ||
//     t.isForInStatement(node)
//   )
//     return "block";
//   if (t.isSwitchCase(node)) return "block";
//   if (t.isStaticBlock(node)) return "static-block";
//   if (
//     t.isBlockStatement(node) &&
//     parent !== null &&
//     t.isFunction(parent) &&
//     parent.body === node
//   )
//     return functionParametersHaveExpressions(parent) ? "function" : undefined;
//   if (t.isBlockStatement(node)) return "block";
//   return undefined;
// };
// const functionParametersHaveExpressions = (node: t.Function): boolean => {
//   const pending: t.Node[] = [...runtimeFunctionParameters(node)];
//   while (pending.length > 0) {
//     const parameter = pending.pop();
//     if (t.isAssignmentPattern(parameter)) return true;
//     if (t.isTSParameterProperty(parameter)) pending.push(parameter.parameter);
//     else if (t.isRestElement(parameter)) pending.push(parameter.argument);
//     else if (t.isArrayPattern(parameter)) {
//       for (const element of parameter.elements)
//         if (element !== null) pending.push(element);
//     } else if (t.isObjectPattern(parameter)) {
//       for (const property of parameter.properties) {
//         if (t.isRestElement(property)) pending.push(property.argument);
//         else {
//           if (property.computed) return true;
//           pending.push(property.value);
//         }
//       }
//     }
//   }
//   return false;
// };
// const bindImports = (
//   node: t.ImportDeclaration,
//   scope: JavaScriptSemanticScopeState,
//   state: JavaScriptSemanticAnalysisState,
// ): void => {
//   for (const specifier of node.specifiers) {
//     const importedPath = t.isImportDefaultSpecifier(specifier)
//       ? ["default"]
//       : t.isImportNamespaceSpecifier(specifier)
//         ? []
//         : [semanticStaticPropertyKey(specifier.imported, false) ?? "[dynamic]"];
//     addBinding({
//       state,
//       scope,
//       name: specifier.local.name,
//       kind: "import",
//       mutable: false,
//       definitionNode: specifier.local,
//       initializer: null,
//       directOrigin: { specifier: node.source.value, importedPath },
//       runtimeImport:
//         node.importKind !== "type" &&
//         node.importKind !== "typeof" &&
//         (!t.isImportSpecifier(specifier) ||
//           (specifier.importKind !== "type" &&
//             specifier.importKind !== "typeof")),
//     });
//   }
// };
// const bindFunctionLocals = (
//   node: t.Function,
//   scope: JavaScriptSemanticScopeState,
//   state: JavaScriptSemanticAnalysisState,
// ): void => {
//   for (const parameter of runtimeFunctionParameters(node))
//     bindPattern({
//       pattern: t.isTSParameterProperty(parameter)
//         ? parameter.parameter
//         : parameter,
//       initializer: null,
//       scope,
//       state,
//       mutable: true,
//       kind: "parameter",
//     });
// };
// const bindPattern = (input: BindPatternInput): void => {
//   const {
//     pattern,
//     initializer,
//     scope,
//     state,
//     mutable,
//     declarationKind,
//     kind = "variable",
//     projection = [],
//     referenceOnly = false,
//     copyKind,
//     copyProjectionOffset,
//     copyExcludedKeys,
//     copyStartIndex,
//     fallbackSources,
//     requiredSources,
//   } = input;
export const _l = 210;
