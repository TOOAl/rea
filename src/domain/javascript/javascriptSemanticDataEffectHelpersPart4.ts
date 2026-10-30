export const __stub = 1;
// /** Check shared exports at the use or method-capture point, not at every later call. */
// const requiredModuleChanged = (
//   specifier: string,
//   selected: readonly string[],
//   capture: t.Node,
//   state: JavaScriptSemanticAnalysisState,
//   callableValue = false,
//   savedObjectCapture?: t.Node,
// ): boolean => {
//   const identity = semanticRequireExportsIdentity(specifier, selected);
//   return builtinModuleEffects(identity.specifier, state).some(
//     ({ path, node, kind }) =>
//       !(
//         savedObjectCapture !== undefined &&
//         path.length < identity.path.length &&
//         semanticTopLevelEffectFollowsCapture(
//           savedObjectCapture,
//           node,
//           state.parentsByNode,
//         )
//       ) &&
//       affectsBuiltinPath(path, identity.path) &&
//       !semanticTopLevelEffectFollowsCapture(
//         capture,
//         node,
//         state.parentsByNode,
//       ) &&
//       (kind === "write" ||
//         !callableValue ||
//         path.length < identity.path.length),
//   );
// };
//
// /** Calling an unchanged built-in as a member is not an escape to unknown code. */
// const originalBuiltinReceiver = (
//   node: t.Node | undefined,
//   state: JavaScriptSemanticAnalysisState,
// ): boolean => {
//   if (node === undefined) return false;
//   const receivers = builtinEffectIndex(state).receivers;
//   const previous = receivers.get(node);
//   if (previous !== undefined) return previous;
//   const result = computeOriginalBuiltinReceiver(node, state);
//   receivers.set(node, result);
//   return result;
// };
//
// const computeOriginalBuiltinReceiver = (
//   node: t.Node | undefined,
//   state: JavaScriptSemanticAnalysisState,
// ): boolean => {
//   if (!t.isCallExpression(node) && !t.isOptionalCallExpression(node))
//     return false;
//   const callee = node.callee;
//   if (!t.isMemberExpression(callee) && !t.isOptionalMemberExpression(callee))
//     return false;
//   const receiver = t.isIdentifier(callee.object)
//     ? resolveSemanticBindingState(state, callee.object, callee.object.name)
//     : undefined;
//   const provenance =
//     receiver === undefined
//       ? undefined
//       : evaluateSemanticProvenance(receiver, state);
//   const sourceOrigin =
//     provenance?.status === "module"
//       ? provenance.origins[0]
//       : (semanticExpressionModuleOrigin(callee.object, state) ??
//         semanticRequireOrigin(callee.object, state)?.origin ??
//         semanticGlobalProcessOrigin(callee.object, state));
//   if (sourceOrigin === undefined) return false;
//   const origin = builtinNamespaceOrigin(sourceOrigin);
//   if (origin.importedPath.length !== 0) return false;
//   const method = semanticStaticPropertyKey(callee.property, callee.computed);
//   const identity = semanticRequireExportsIdentity(origin.specifier, [
//     method ?? "",
//   ]);
//   if (
//     method === null ||
//     !BUILTIN_RECEIVER_METHODS[origin.specifier]?.has(method) ||
//     receiver?.memberWrites.some(
//       ({ path, node: write }) =>
//         affectsBuiltinPath(path, [method]) &&
//         !semanticTopLevelEffectFollowsCapture(node, write, state.parentsByNode),
//     ) ||
//     (
//       builtinEffectIndex(state).writesByModule.get(identity.specifier) ?? []
//     ).some(
//       ({ path, node: write }) =>
//         affectsBuiltinPath(path, identity.path) &&
//         !semanticTopLevelEffectFollowsCapture(node, write, state.parentsByNode),
//     )
//   )
//     return false;
//   return !node.arguments.some((argument) => {
//     if (!t.isIdentifier(argument)) return false;
//     const passed = resolveSemanticBindingState(state, argument, argument.name);
//     if (passed === undefined) return false;
//     const passedOrigin = evaluateSemanticProvenance(passed, state);
//     return (
//       passedOrigin.status === "module" &&
//       builtinNamespaceOrigin(passedOrigin.origins[0]).specifier ===
//         origin.specifier &&
//       builtinNamespaceOrigin(passedOrigin.origins[0]).importedPath.length === 0
//     );
//   });
// };
//
// const semanticExpressionModuleOrigin = (
//   expression: t.Node,
//   state: JavaScriptSemanticAnalysisState,
//   visited = new Set<string>(),
// ): JavaScriptModuleOrigin | undefined => {
//   const node = unwrapJavaScriptExpression(expression).node;
//   const required = semanticRequireOrigin(node, state);
//   if (required !== undefined) return required.origin;
//   if (t.isIdentifier(node)) {
//     const binding = resolveSemanticBindingState(state, node, node.name);
//     if (binding === undefined || visited.has(binding.bindingId))
//       return undefined;
//     const provenance = evaluateSemanticProvenance(binding, state);
//     return provenance.status === "module" ? provenance.origins[0] : undefined;
//   }
//   if (t.isMemberExpression(node) || t.isOptionalMemberExpression(node)) {
//     const base = semanticExpressionModuleOrigin(node.object, state, visited);
//     const key = semanticStaticPropertyKey(node.property, node.computed);
//     return base === undefined || key === null
//       ? undefined
//       : { ...base, importedPath: [...base.importedPath, key] };
//   }
//   return undefined;
// };
//
// /** Recognize global or node:process aliases without accepting shadowing. */
// export const isSemanticProcessObject = (
//   node: t.Expression | t.Super,
//   state: JavaScriptSemanticAnalysisState,
//   family: "env" | "argv",
//   key?: string | null,
// ): boolean => {
//   if (!t.isIdentifier(node)) return false;
//   const binding = resolveSemanticBindingState(state, node, node.name);
//   const selected = key === undefined || key === null ? [family] : [family, key];
//   if (binding === undefined)
//     return (
//       semanticGlobalProcessOrigin(node, state) !== undefined &&
//       !requiredModuleChanged("process", selected, node, state)
//     );
//   return (
//     builtinBindingPath(
//       binding,
//       state,
//       ["process", "node:process"],
//       node,
//       selected,
//     )?.length === 0
//   );
// };
//
// /** Resolve the nearest direct variable/assignment owner before a callable. */
// export const outerDataEffectBinding = (
//   node: t.Node,
//   context: DataEffectTraversalContext,
// ): string | null => {
//   return scalarAssignedResultBinding(
//     assignedSemanticResultBindings(node, context.ancestors, context.state),
//   );
// };
//
// /** Traverse with exact callable and ancestor stacks. */
// export const traverseDataEffects = (
//   program: t.Program,
//   context: DataEffectTraversalContext,
//   visit: (node: t.Node, parent: t.Node | null) => void,
// ): void => {
//   const callableStack = createSemanticCallableIdStack(
//     context.callableIds,
//     context.callableStack,
//   );
//   context.ancestors.length = 0;
//   traverseJavaScriptAst(program, {
//     enter: (node, parent) => {
//       callableStack.enter(node, parent);
//       visit(node, parent);
//       context.ancestors.push(node);
//     },
//     exit: (node) => {
//       context.ancestors.pop();
//       callableStack.exit(node);
//     },
//   });
// };
//
// /** Resolve one direct identifier argument to a lexical binding. */
// export const dataEffectArgumentBindingId = (
//   node:
//     | t.Expression
//     | t.SpreadElement
//     | t.JSXNamespacedName
//     | t.ArgumentPlaceholder
//     | undefined,
//   state: JavaScriptSemanticAnalysisState,
// ): string | null =>
//   t.isIdentifier(node)
//     ? (resolveSemanticBindingState(state, node, node.name)?.bindingId ?? null)
//     : null;
//
// /**
//  * Read one static string or expression-free template. A template recovered
//  * with an invalid escape has no cooked value; its raw spelling is not a
//  * JavaScript string, so it stays dynamic.
//  */
// export const dataEffectLiteralString = (
//   node:
//     | t.Expression
//     | t.SpreadElement
//     | t.JSXNamespacedName
//     | t.ArgumentPlaceholder
//     | undefined,
// ): string | null => {
//   if (node === undefined) return null;
//   const literal = readExactJavaScriptLiteral(node);
//   return literal.found && typeof literal.value === "string"
//     ? literal.value
//     : null;
// };
//
// /** Read a member callee from call or construction syntax. */
// export const dataEffectMemberCallee = (
//   node: t.CallExpression | t.OptionalCallExpression | t.NewExpression,
// ): t.MemberExpression | t.OptionalMemberExpression | null =>
//   t.isMemberExpression(node.callee) || t.isOptionalMemberExpression(node.callee)
//     ? node.callee
//     : null;
export const _l = 233;
