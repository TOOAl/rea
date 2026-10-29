export const __stub = 1;
//           semanticResolutionBlocked(state, node, node.name);
//         output.push({
//           name: node.name,
//           role: resolvedRole,
//           location: range(node),
//           bindingId: binding?.bindingId ?? null,
//           resolution:
//             binding !== undefined
//               ? "resolved"
//               : blocked
//                 ? "unknown"
//                 : "unbound",
//         });
//       }
//     },
//     exit: (node) => {
//       if (isPatternNode(node)) patterns.pop();
//     },
//   });
//   return output;
// }
//
// /** Freeze collected scopes into deterministic IR order. */
// export const immutableSemanticScopes = (
//   state: JavaScriptSemanticAnalysisState,
// ): JavaScriptSemanticScope[] =>
//   state.scopes.map((scope) => ({
//     scopeId: scope.scopeId,
//     parentScopeId: scope.parentScopeId,
//     kind: scope.kind,
//     location: scope.location,
//     bindingsComplete: scope.bindingsComplete,
//     bindingIds: [...scope.bindings.values()]
//       .map(({ bindingId }) => bindingId)
//       .sort(compareUnicodeCodePoints),
//   }));
//
// /** Evaluate and freeze bindings into deterministic IR order. */
// export const immutableSemanticBindings = (
//   state: JavaScriptSemanticAnalysisState,
// ): JavaScriptSemanticBinding[] =>
//   [...state.bindingsById.values()]
//     .map((binding) => ({
//       bindingId: binding.bindingId,
//       scopeId: binding.scopeId,
//       name: binding.name,
//       kind: binding.kind,
//       mutable: binding.mutable,
//       definitions: binding.definitions,
//       value: evaluateSemanticBinding(binding, state),
//       provenance: evaluateSemanticProvenance(binding, state),
//     }))
//     .sort((left, right) =>
//       compareUnicodeCodePoints(left.bindingId, right.bindingId),
//     );
//
// const callableKind = (
//   node: t.Node,
// ): "function" | "class" | "method" | undefined => {
//   if (
//     t.isClassMethod(node) ||
//     t.isClassPrivateMethod(node) ||
//     t.isObjectMethod(node)
//   )
//     return "method";
//   if (t.isFunction(node)) return "function";
//   if (t.isClass(node)) return "class";
//   return undefined;
// };
//
// const callableName = (node: t.Node, parent: t.Node | null): string | null => {
//   if (
//     (t.isFunctionDeclaration(node) ||
//       t.isFunctionExpression(node) ||
//       t.isClassDeclaration(node) ||
//       t.isClassExpression(node)) &&
//     t.isIdentifier(node.id)
//   )
//     return node.id.name;
//   if (
//     t.isClassMethod(node) ||
//     t.isClassPrivateMethod(node) ||
//     t.isObjectMethod(node)
//   ) {
//     if (t.isPrivateName(node.key)) return `#${node.key.id.name}`;
//     // `{[key]() {}}` names nothing statically; reading `key` off the key node
//     // would report the variable name as the method name. `{[""]() {}}` names
//     // the exact empty key, which is retained rather than replaced.
//     return (
//       semanticStaticPropertyKey(node.key, node.computed) ??
//       `[computed@${String(node.start ?? -1)}]`
//     );
//   }
//   if (
//     parent !== null &&
//     t.isVariableDeclarator(parent) &&
//     t.isIdentifier(parent.id)
//   )
//     return parent.id.name;
//   return null;
// };
//
// const collectImports = (
//   node: t.ImportDeclaration,
//   state: JavaScriptSemanticAnalysisState,
// ): void => {
//   if (node.specifiers.length === 0)
//     addModuleLink(
//       state,
//       {
//         kind: isTypeOnlyImportDeclaration(node) ? "type-import" : "import",
//         specifier: node.source.value,
//         importedName: null,
//         localName: null,
//         exportedName: null,
//         location: range(node),
//       },
//       node,
//     );
//   for (const specifier of node.specifiers)
//     addModuleLink(
//       state,
//       {
//         kind:
//           isTypeOnlyImportDeclaration(node) ||
//           (t.isImportSpecifier(specifier) &&
//             isTypeOnlyImportSpecifier(specifier))
//             ? "type-import"
//             : "import",
//         specifier: node.source.value,
//         importedName: t.isImportDefaultSpecifier(specifier)
//           ? "default"
//           : t.isImportNamespaceSpecifier(specifier)
//             ? "*"
//             : propertyName(specifier.imported),
//         localName: specifier.local.name,
//         exportedName: null,
//         location: range(specifier),
//       },
//       node,
//     );
// };
//
// const collectNamedExports = (
//   node: t.ExportNamedDeclaration,
//   state: JavaScriptSemanticAnalysisState,
// ): void => {
//   const declarationTypeOnly = isTypeOnlyExportDeclaration(node);
//   if (node.declaration !== null && node.declaration !== undefined)
//     for (const localName of declarationNames(node.declaration))
//       addModuleLink(
//         state,
//         {
//           kind: declarationTypeOnly ? "type-import" : "export",
//           specifier: null,
//           importedName: null,
//           localName,
//           exportedName: localName,
//           callableId: declarationCallableId(node.declaration, localName),
//           location: range(node.declaration),
//         },
//         node,
//       );
//   for (const specifier of node.specifiers)
//     if (
//       t.isExportSpecifier(specifier) ||
//       (t.isExportNamespaceSpecifier(specifier) && node.exportKind !== "type")
//     )
//       addModuleLink(
//         state,
//         {
//           kind:
//             declarationTypeOnly ||
//             (t.isExportSpecifier(specifier) &&
//               isTypeOnlyExportSpecifier(specifier))
//               ? "type-import"
//               : node.source == null
//                 ? "export"
//                 : "re-export",
//           specifier: node.source?.value ?? null,
//           importedName: t.isExportNamespaceSpecifier(specifier)
//             ? "*"
//             : propertyName(specifier.local),
//           localName:
//             node.source == null && t.isExportSpecifier(specifier)
//               ? propertyName(specifier.local)
//               : null,
//           exportedName: propertyName(specifier.exported),
//           location: range(specifier),
//         },
//         node,
//       );
// };
//
// const collectRequireLink = (
//   node: t.VariableDeclarator,
//   state: JavaScriptSemanticAnalysisState,
// ): void => {
//   const required = semanticRequireOrigin(node.init, state);
//   if (required === undefined) return;
export const _l = 200;
