export const __stub = 1;
//     return origin.importedPath.length === 0 &&
//       specifiers.some(
//         (specifier) => specifier.replace(/^node:/u, "") === origin.specifier,
//       ) &&
//       !requiredModuleChanged(
//         origin.specifier,
//         [...origin.importedPath, method],
//         callee,
//         state,
//         true,
//         callee.object,
//       )
//       ? method
//       : null;
//   }
//   const binding = resolveSemanticBindingState(
//     state,
//     callee.object,
//     callee.object.name,
//   );
//   const method = semanticStaticPropertyKey(callee.property, callee.computed);
//   if (method === null) return null;
//   const resolvedPath = builtinBindingPath(
//     binding,
//     state,
//     specifiers,
//     callee,
//     [method],
//     true,
//   );
//   if (resolvedPath?.length === 0) return method;
//   const initializer = binding?.initializers[0];
//   if (
//     initializer === undefined ||
//     binding?.initializers.length !== 1 ||
//     (!t.isMemberExpression(initializer.node) &&
//       !t.isOptionalMemberExpression(initializer.node))
//   ) {
//     return null;
//   }
//   const provenance = evaluateSemanticProvenance(binding, state);
//   if (provenance.status !== "module") return null;
//   const origin = builtinNamespaceOrigin(provenance.origins[0]);
//   const selected = [...origin.importedPath, method];
//   return specifiers.some(
//     (specifier) => specifier.replace(/^node:/u, "") === origin.specifier,
//   ) &&
//     builtinBindingPath(
//       binding,
//       state,
//       specifiers,
//       initializer.node,
//       [method],
//       true,
//     )?.length === 0 &&
//     !requiredModuleChanged(
//       provenance.origins[0].specifier,
//       selected,
//       callee,
//       state,
//       true,
//       initializer.node,
//     )
//     ? method
//     : null;
// };
//
// const semanticBoundMemberPath = (
//   node: t.Node,
//   state: JavaScriptSemanticAnalysisState,
// ):
//   | {
//       readonly binding: JavaScriptSemanticBindingState;
//       readonly path: string[];
//     }
//   | undefined => {
//   const path: string[] = [];
//   let current = unwrapJavaScriptExpression(node).node;
//   while (
//     t.isMemberExpression(current) ||
//     t.isOptionalMemberExpression(current)
//   ) {
//     const key = semanticStaticPropertyKey(current.property, current.computed);
//     if (key === null || !t.isNode(current.object)) return undefined;
//     path.unshift(key);
//     current = unwrapJavaScriptExpression(current.object).node;
//   }
//   if (!t.isIdentifier(current)) return undefined;
//   const binding = resolveSemanticBindingState(state, current, current.name);
//   return binding === undefined ? undefined : { binding, path };
// };
//
// type BuiltinBindingMemo = Map<t.Node, Map<string, readonly string[] | null>>;
//
// const builtinBindingPath = (
//   binding: JavaScriptSemanticBindingState | undefined,
//   state: JavaScriptSemanticAnalysisState,
//   specifiers: readonly string[],
//   capture: t.Node,
//   selectedPath: readonly string[] = [],
//   callableValue = false,
//   visited: ReadonlySet<string> = new Set(),
//   memo: BuiltinBindingMemo = new Map(),
//   provenanceCapture?: t.Identifier,
//   savedObjectCapture?: t.Node,
// ): readonly string[] | null => {
//   if (binding === undefined) return null;
//   const key = JSON.stringify([
//     binding.bindingId,
//     selectedPath,
//     callableValue,
//     provenanceCapture?.start,
//     provenanceCapture?.end,
//     savedObjectCapture?.start,
//     savedObjectCapture?.end,
//   ]);
//   let captured = memo.get(capture);
//   if (captured?.has(key)) return captured.get(key) ?? null;
//   if (visited.has(binding.bindingId)) return null;
//   if (captured === undefined) {
//     captured = new Map();
//     memo.set(capture, captured);
//   }
//   const result = computeBuiltinBindingPath(
//     binding,
//     state,
//     specifiers,
//     capture,
//     selectedPath,
//     callableValue,
//     visited,
//     memo,
//     provenanceCapture,
//     savedObjectCapture,
//   );
//   captured.set(key, result);
//   return result;
// };
//
// const computeBuiltinBindingPath = (
//   binding: JavaScriptSemanticBindingState | undefined,
//   state: JavaScriptSemanticAnalysisState,
//   specifiers: readonly string[],
//   capture: t.Node,
//   selectedPath: readonly string[] = [],
//   callableValue = false,
//   visited: ReadonlySet<string>,
//   memo: BuiltinBindingMemo,
//   provenanceCapture?: t.Identifier,
//   savedObjectCapture?: t.Node,
// ): readonly string[] | null => {
//   if (binding === undefined || visited.has(binding.bindingId)) return null;
//   // Provenance identifies the module, independently of whether a selected slot
//   // still refers to its original built-in after member mutation or escape.
//   if (
//     binding.memberWrites.some(
//       ({ path, node }) =>
//         affectsBuiltinPath(path, selectedPath) &&
//         !(
//           semanticTopLevelEffectFollowsCapture(
//             path.length === 0 && provenanceCapture !== undefined
//               ? provenanceCapture
//               : capture,
//             node,
//             state.parentsByNode,
//           ) ||
//           (savedObjectCapture !== undefined &&
//             path.length < selectedPath.length &&
//             semanticTopLevelEffectFollowsCapture(
//               savedObjectCapture,
//               node,
//               state.parentsByNode,
//             ))
//         ),
//     ) ||
//     builtinEscapes(binding, state).some(
//       ({ path, node }) =>
//         affectsBuiltinPath(path, selectedPath) &&
//         // A function-value escape cannot replace its native [[Call]]. An
//         // escaped containing object can still replace the selected method.
//         (!callableValue || path.length < selectedPath.length) &&
//         !semanticTopLevelEffectFollowsCapture(
//           capture,
//           node,
//           state.parentsByNode,
//         ),
//     )
//   )
//     return null;
//   const provenance =
//     provenanceCapture === undefined
//       ? evaluateSemanticProvenance(binding, state)
//       : evaluateSemanticProvenanceAtRead(binding, provenanceCapture, state);
//   if (provenance.status !== "module") return null;
//   const { importedPath } = provenance.origins[0];
//   const namespace = builtinNamespaceOrigin(provenance.origins[0]);
//   if (
//     !specifiers.some((item) => {
//       const name = item.replace(/^node:/u, "");
//       return (
//         name === namespace.specifier ||
//         (namespace.specifier === "fs" &&
//           selectedPath[0] === "promises" &&
//           name === "fs/promises")
//       );
//     })
//   )
//     return null;
//   let resolvedPath: readonly string[] = importedPath;
//   for (const origin of binding.directOrigins) {
//     const shared = semanticMutableBuiltinOrigin(origin, selectedPath);
//     if (
//       shared !== undefined &&
//       requiredModuleChanged(
//         shared.specifier,
//         shared.path,
//         capture,
//         state,
//         callableValue,
//       )
//     )
//       return null;
//   }
//   const ancestors = new Set([...visited, binding.bindingId]);
//   for (const initializer of binding.initializers) {
//     const pending = [
//       {
//         node: initializer.node,
//         path: [...initializer.projection.map(String), ...selectedPath],
//         savedObjectCapture:
//           selectedPath.length > 0 &&
//           (t.isMemberExpression(initializer.node) ||
//             t.isOptionalMemberExpression(initializer.node))
//             ? initializer.node
//             : savedObjectCapture,
//         capture:
//           callableValue &&
export const _l = 237;
