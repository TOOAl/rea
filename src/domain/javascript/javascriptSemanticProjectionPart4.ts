export const __stub = 1;
//     return "write";
//   }
//   const site = semanticWrappedWriteSite(node, parent, ancestors);
//   if (site !== null && site !== parent && !isDeleteSite(site)) return "write";
//   return semanticReferenceRole(node, parent);
// };
//
// /**
//  * The nearest ancestor that owns this identifier as a *bound* pattern slot, or
//  * null when the identifier is not being bound. A binding inside a pattern has
//  * an ObjectProperty/ArrayPattern parent, so the immediate parent cannot say
//  * whether the identifier declares a binding or is assigned to.
//  *
//  * Only the bound side counts: `{a = compute()}` binds `a` but merely *reads*
//  * `compute`, so the default-value side must not be mistaken for a binding.
//  */
// const enclosingPatternAncestor = (
//   node: t.Identifier,
//   parent: t.Node,
//   ancestors: readonly t.Node[],
// ): t.Node | null => {
//   const chain = [...ancestors, parent];
//   for (let index = chain.length - 1; index >= 0; index -= 1) {
//     const ancestor = chain[index];
//     if (ancestor === undefined || !isPatternNode(ancestor)) continue;
//     if (!bindsIdentifier(ancestor, parent, node)) continue;
//     // Found the binding slot; now find what owns the pattern.
//     for (let owner = index - 1; owner >= 0; owner -= 1) {
//       const candidate = chain[owner];
//       if (candidate === undefined) continue;
//       if (
//         t.isAssignmentExpression(candidate) ||
//         t.isForInStatement(candidate) ||
//         t.isForOfStatement(candidate)
//       )
//         return candidate;
//       if (isPatternOwnerDeclaration(candidate)) return candidate;
//     }
//     return null;
//   }
//   return null;
// };
//
// /** True when `parent` places `node` in the bound slot of `pattern`. */
// const bindsIdentifier = (
//   pattern: t.Node,
//   parent: t.Node,
//   node: t.Identifier,
// ): boolean => {
//   // The identifier sits directly in the pattern: `[b]`, `({b})`, `{b = 1}`.
//   if (parent === pattern) return patternContains(pattern, node);
//   if (t.isObjectPattern(pattern))
//     return (
//       t.isObjectProperty(parent) &&
//       (parent.value === node || (parent.shorthand && parent.key === node))
//     );
//   if (t.isArrayPattern(pattern))
//     return pattern.elements.some((element) => element === parent);
//   if (t.isAssignmentPattern(pattern)) return pattern.left === parent;
//   return t.isRestElement(pattern) && pattern.argument === parent;
// };
//
// const isPatternNode = (node: t.Node): boolean =>
//   t.isObjectPattern(node) ||
//   t.isArrayPattern(node) ||
//   t.isAssignmentPattern(node) ||
//   t.isRestElement(node);
//
// const isDeleteSite = (site: t.Node): boolean =>
//   t.isUnaryExpression(site, { operator: "delete" });
//
// const isPatternOwnerDeclaration = (node: t.Node): boolean =>
//   (t.isVariableDeclarator(node) && t.isPattern(node.id)) ||
//   (t.isFunction(node) &&
//     node.params.some((value): value is t.Pattern => t.isPattern(value))) ||
//   (t.isCatchClause(node) && node.param !== null && t.isPattern(node.param));
//
// /** Classify one identifier occurrence consistently with semantic references. */
// export const semanticReferenceRole = (
//   node: t.Identifier,
//   parent: t.Node,
// ): JavaScriptSemanticReference["role"] | null => {
//   if (isDeclarationIdentifier(node, parent) || isNonReferenceKey(node, parent))
//     return null;
//   if (
//     (t.isAssignmentExpression(parent) && parent.left === node) ||
//     t.isUpdateExpression(parent) ||
//     ((t.isForInStatement(parent) || t.isForOfStatement(parent)) &&
//       parent.left === node)
//   )
//     return "write";
//   if (t.isExportSpecifier(parent) && parent.local === node) return "export";
//   return "read";
// };
//
// const isDeclarationIdentifier = (
//   node: t.Identifier,
//   parent: t.Node,
// ): boolean => {
//   if (t.isTSImportEqualsDeclaration(parent)) return parent.id === node;
//   return (
//     (t.isVariableDeclarator(parent) && patternContains(parent.id, node)) ||
//     ((t.isFunctionDeclaration(parent) || t.isFunctionExpression(parent)) &&
//       parent.id === node) ||
//     (t.isFunction(parent) &&
//       parent.params.some((value) => patternContains(value, node))) ||
//     ((t.isClassDeclaration(parent) || t.isClassExpression(parent)) &&
//       parent.id === node) ||
//     (t.isImportSpecifier(parent) &&
//       (parent.local === node || parent.imported === node)) ||
//     (t.isImportDefaultSpecifier(parent) && parent.local === node) ||
//     (t.isImportNamespaceSpecifier(parent) && parent.local === node) ||
//     (t.isCatchClause(parent) && parent.param === node)
//   );
// };
//
// const isNonReferenceKey = (node: t.Identifier, parent: t.Node): boolean =>
//   ((t.isMemberExpression(parent) || t.isOptionalMemberExpression(parent)) &&
//     parent.property === node &&
//     !parent.computed) ||
//   ((t.isObjectProperty(parent) || t.isObjectMethod(parent)) &&
//     parent.key === node &&
//     !parent.computed &&
//     !(t.isObjectProperty(parent) && parent.shorthand)) ||
//   (t.isExportSpecifier(parent) && parent.exported === node) ||
//   t.isLabeledStatement(parent) ||
//   t.isBreakStatement(parent) ||
//   t.isContinueStatement(parent);
//
// const patternNames = (pattern: t.Node): string[] => {
//   if (t.isTSParameterProperty(pattern)) return patternNames(pattern.parameter);
//   if (t.isIdentifier(pattern)) return [pattern.name];
//   if (t.isAssignmentPattern(pattern)) return patternNames(pattern.left);
//   if (t.isRestElement(pattern)) return patternNames(pattern.argument);
//   if (t.isObjectPattern(pattern))
//     return pattern.properties.flatMap((property) =>
//       t.isRestElement(property)
//         ? patternNames(property.argument)
//         : patternNames(property.value),
//     );
//   if (t.isArrayPattern(pattern))
//     return pattern.elements.flatMap((element) =>
//       element === null ? [] : patternNames(element),
//     );
//   return [];
// };
//
// const patternContains = (pattern: t.Node, target: t.Identifier): boolean =>
//   pattern === target ||
//   (t.isAssignmentPattern(pattern) && patternContains(pattern.left, target)) ||
//   (t.isRestElement(pattern) && patternContains(pattern.argument, target)) ||
//   (t.isObjectPattern(pattern) &&
//     pattern.properties.some((property) =>
//       t.isRestElement(property)
//         ? patternContains(property.argument, target)
//         : patternContains(property.value, target),
//     )) ||
//   (t.isArrayPattern(pattern) &&
//     pattern.elements.some(
//       (element) => element !== null && patternContains(element, target),
//     ));
//
// const declarationNames = (declaration: t.Declaration): string[] => {
//   if (t.isVariableDeclaration(declaration))
//     return declaration.declarations.flatMap(({ id }) => patternNames(id));
//   if (
//     (t.isFunctionDeclaration(declaration) ||
//       t.isClassDeclaration(declaration)) &&
//     t.isIdentifier(declaration.id)
//   )
//     return [declaration.id.name];
//   if (
//     (t.isTSInterfaceDeclaration(declaration) ||
//       t.isTSTypeAliasDeclaration(declaration) ||
//       t.isTSDeclareFunction(declaration)) &&
//     t.isIdentifier(declaration.id)
//   )
//     return [declaration.id.name];
//   if (
//     t.isTSImportEqualsDeclaration(declaration) &&
//     semanticImportEqualsSpecifier(declaration) !== null
//   )
//     return [declaration.id.name];
//   return [];
// };
//
// const defaultExportLocalName = (
//   declaration: t.ExportDefaultDeclaration["declaration"],
// ): string | null => {
//   const value = unwrapJavaScriptExpression(declaration).node;
//   if (t.isIdentifier(value)) return value.name;
//   return (t.isFunctionDeclaration(value) || t.isClassDeclaration(value)) &&
//     t.isIdentifier(value.id)
//     ? value.id.name
//     : null;
// };
export const _l = 196;
