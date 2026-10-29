export const __stub = 1;
//   const { origin, call } = required;
//   const bindings = requirePatternBindings(node.id, origin.importedPath);
//   for (const binding of bindings)
//     addModuleLink(
//       state,
//       {
//         kind: "require",
//         specifier: origin.specifier,
//         importedName: binding.importedName,
//         localName: binding.localName,
//         exportedName: null,
//         location: range(node),
//       },
//       node,
//     );
//   if (bindings.length > 0) state.linkedRequireCalls.add(call);
// };
//
// const collectUnboundRequireLink = (
//   node: t.CallExpression,
//   state: JavaScriptSemanticAnalysisState,
// ): void => {
//   if (state.linkedRequireCalls.has(node)) return;
//   const required = semanticRequireOrigin(node, state);
//   if (required === undefined) return;
//   addModuleLink(
//     state,
//     {
//       kind: "require",
//       specifier: required.origin.specifier,
//       importedName: null,
//       localName: null,
//       exportedName: null,
//       location: range(node),
//     },
//     node,
//   );
//   state.linkedRequireCalls.add(node);
// };
//
// const requirePatternBindings = (
//   pattern: t.Node,
//   path: readonly string[],
// ): { readonly importedName: string; readonly localName: string }[] => {
//   if (t.isTSParameterProperty(pattern))
//     return requirePatternBindings(pattern.parameter, path);
//   if (t.isIdentifier(pattern))
//     return [{ importedName: path.at(-1) ?? "*", localName: pattern.name }];
//   if (t.isAssignmentPattern(pattern))
//     return requirePatternBindings(pattern.left, path);
//   if (t.isObjectPattern(pattern))
//     return pattern.properties.flatMap((property) => {
//       if (t.isRestElement(property)) return [];
//       const name = semanticStaticPropertyKey(property.key, property.computed);
//       return name === null
//         ? []
//         : requirePatternBindings(property.value, [...path, name]);
//     });
//   if (t.isArrayPattern(pattern))
//     return pattern.elements.flatMap((element, index) =>
//       element === null
//         ? []
//         : requirePatternBindings(element, [...path, String(index)]),
//     );
//   return [];
// };
//
// const collectCommonJsExport = (
//   node: t.AssignmentExpression,
//   state: JavaScriptSemanticAnalysisState,
//   receiverEffect: CommonJsExportReceiverEffect | undefined,
// ): void => {
//   const exportedName = commonJsExportName(node.left, state);
//   if (exportedName === undefined) return;
//   if (receiverEffect === "detached") return;
//   // Simple assignment chains yield their rightmost assigned value. Compound
//   // and logical writes also depend on the previous value, so remain unknown.
//   let value =
//     node.operator === "=" && receiverEffect !== "uncertain" ? node.right : null;
//   while (t.isAssignmentExpression(value, { operator: "=" }))
//     value = value.right;
//   const required =
//     value === null ? undefined : semanticRequireOrigin(value, state);
//   const origin = required?.origin;
//   addModuleLink(
//     state,
//     {
//       kind: "commonjs-export",
//       specifier: origin?.specifier ?? null,
//       importedName: origin?.importedPath.at(-1) ?? null,
//       localName: value !== null && t.isIdentifier(value) ? value.name : null,
//       exportedName,
//       callableId: value === null ? null : semanticCallableIdForNode(value),
//       location: range(node),
//     },
//     node,
//   );
//   if (required !== undefined) state.linkedRequireCalls.add(required.call);
// };
//
// const addModuleLink = (
//   state: JavaScriptSemanticAnalysisState,
//   link: Omit<JavaScriptSemanticModuleLink, "callableId"> & {
//     readonly callableId?: string | null;
//   },
//   referenceNode: t.Node,
// ): void => {
//   const resolutionMode =
//     link.resolutionMode ??
//     (link.kind === "import" ||
//     link.kind === "re-export" ||
//     link.kind === "type-import"
//       ? state.staticImportResolutionMode
//       : link.kind === "require"
//         ? "require"
//         : undefined);
//   const collected = {
//     ...link,
//     ...(resolutionMode === undefined ? {} : { resolutionMode }),
//     callableId: link.callableId ?? null,
//   };
//   state.moduleLinks.push(collected);
//   if (
//     t.isExportDefaultDeclaration(referenceNode) &&
//     t.isExpression(referenceNode.declaration)
//   )
//     state.defaultExportExpressions.set(collected, referenceNode.declaration);
//   if (link.localName !== null) {
//     const binding = resolveSemanticBindingState(
//       state,
//       referenceNode,
//       link.localName,
//     );
//     if (binding !== undefined) state.moduleLinkBindings.set(collected, binding);
//   }
// };
//
// /** Deterministic callable identity shared by collection and return recovery. */
// export const semanticCallableIdForNode = (node: t.Node): string | null => {
//   const kind = callableKind(node);
//   return kind === undefined
//     ? null
//     : `callable:${kind}:${String(node.start ?? -1)}:${String(node.end ?? -1)}`;
// };
//
// const declarationCallableId = (
//   declaration: t.Declaration,
//   localName: string,
// ): string | null => {
//   if (
//     (t.isFunctionDeclaration(declaration) ||
//       t.isClassDeclaration(declaration)) &&
//     declaration.id?.name === localName
//   )
//     return semanticCallableIdForNode(declaration);
//   if (!t.isVariableDeclaration(declaration)) return null;
//   const declarator = declaration.declarations.find(({ id }) =>
//     t.isIdentifier(id, { name: localName }),
//   );
//   return declarator?.init === null || declarator?.init === undefined
//     ? null
//     : semanticCallableIdForNode(declarator.init);
// };
//
// /**
//  * True when writing `node` also reads it first: a compound assignment
//  * (`+=`, `||=`, …) or an update (`++`/`--`). A plain `=` writes only.
//  *
//  * One predicate serves both member operations and identifier references so the
//  * two can never disagree about what counts as a read-modify-write.
//  */
// export const semanticReadsBeforeWrite = (
//   node: t.Node,
//   site: t.Node,
// ): boolean => {
//   const target = semanticWriteSiteTarget(site);
//   return (
//     target !== null &&
//     unwrapJavaScriptExpression(target).node === node &&
//     semanticWriteSiteReadsFirst(site)
//   );
// };
//
// /**
//  * Role of one identifier occurrence, given the node's ancestry.
//  *
//  * A binding inside a destructuring pattern has an ObjectProperty/ArrayPattern
//  * as its direct parent, so the immediate parent cannot tell a declaration
//  * (`const {a} = o`, `catch ({message})`) from an assignment target
//  * (`({a} = o)`, `for (a of list)`). Walking the ancestry to the nearest
//  * pattern-owning construct is what makes the distinction possible.
//  */
// export const semanticIdentifierRole = (
//   node: t.Identifier,
//   parent: t.Node,
//   ancestors: readonly t.Node[],
// ): JavaScriptSemanticReference["role"] | null => {
//   const patternAncestor = enclosingPatternAncestor(node, parent, ancestors);
//   if (patternAncestor !== null) {
//     if (isPatternOwnerDeclaration(patternAncestor)) return null;
export const _l = 200;
