export const __stub = 1;
//   const chain = semanticMemberChain(callee);
//   if (chain === undefined || chain.members.at(-1) !== "createRequire")
//     return false;
//   if (!t.isNode(chain.root)) return false;
//   const root = unwrapJavaScriptExpression(chain.root).node;
//   if (!t.isIdentifier(root)) return false;
//   const origins = resolveSemanticBindingState(
//     state,
//     root,
//     root.name,
//   )?.directOrigins;
//   if (origins?.length !== 1) return false;
//   const [origin] = origins;
//   return (
//     origin?.importedPath.length === 0 &&
//     ["module", "node:module"].includes(origin.specifier)
//   );
// };
//
// /** The RHS call runs before its assignment replaces Node's wrapper loader. */
// const isWrapperRequireInitializerCall = (
//   binding: NonNullable<ReturnType<typeof resolveSemanticBindingState>>,
//   node: t.CallExpression | t.OptionalCallExpression | t.NewExpression,
//   state: JavaScriptSemanticAnalysisState,
// ): boolean => {
//   const scope = state.scopesById.get(binding.scopeId);
//   if (
//     scope?.kind !== "program" ||
//     binding.kind !== "variable" ||
//     binding.declarationKinds.size !== 1 ||
//     !binding.declarationKinds.has("var") ||
//     binding.initializers.length !== 1 ||
//     binding.initializers[0]?.node !== node
//   )
//     return false;
//   const assignment = state.parentsByNode.get(node);
//   if (
//     !t.isAssignmentExpression(assignment) ||
//     assignment.right !== node ||
//     state.conditionallySkippedExpressions.has(node)
//   )
//     return false;
//   const statement = state.parentsByNode.get(assignment);
//   if (!t.isExpressionStatement(statement)) return false;
//   if (state.parentsByNode.get(statement) !== state.program) return false;
//   const target = unwrapJavaScriptExpression(assignment.left).node;
//   return (
//     t.isIdentifier(target, { name: "require" }) &&
//     resolveSemanticBindingState(state, target, target.name) === binding
//   );
// };
//
// // Ambient indexing finishes before these derived facts are consumed. Keep only
// // replacement sites, rather than rescanning unrelated global member writes.
// const globalProcessReplacements = new WeakMap<
//   JavaScriptSemanticAnalysisState,
//   readonly (t.Node | undefined)[]
// >();
// const moduleRequireWrites = new WeakMap<
//   JavaScriptSemanticAnalysisState,
//   readonly t.Node[]
// >();
//
// const writesModuleRequire = (
//   state: JavaScriptSemanticAnalysisState,
// ): readonly t.Node[] => {
//   const cached = moduleRequireWrites.get(state);
//   if (cached !== undefined) return cached;
//   // Interop invocation resolution may ask for require provenance while this
//   // index is being built. Publish a temporary empty result to break that cycle.
//   moduleRequireWrites.set(state, []);
//   const writes: t.Node[] = [];
//   const interop = createSemanticModuleInterop(state);
//   const isModuleObject = (
//     node: t.Node,
//     visited = new Set<string>(),
//   ): boolean => {
//     const value = unwrapJavaScriptExpression(node).node;
//     if (!t.isIdentifier(value)) return false;
//     if (value.name === "module")
//       return resolveSemanticBindingState(state, value, "module") === undefined
//         ? !semanticResolutionBlocked(state, value, "module")
//         : isUnmodifiedCommonJsWrapperBinding(value, "module", state);
//     const binding = resolveSemanticBindingState(state, value, value.name);
//     if (binding === undefined || visited.has(binding.bindingId)) return false;
//     const next = new Set(visited).add(binding.bindingId);
//     return (
//       binding.initializers.length > 0 &&
//       binding.initializers.every(({ node: init }) => isModuleObject(init, next))
//     );
//   };
//   traverseJavaScriptAst(state.program, {
//     enter: (node) => {
//       const target = t.isAssignmentExpression(node)
//         ? node.left
//         : t.isUpdateExpression(node) ||
//             t.isUnaryExpression(node, { operator: "delete" })
//           ? node.argument
//           : undefined;
//       if (target !== undefined) {
//         const members: string[] = [];
//         let root: t.Node = target;
//         while (
//           t.isMemberExpression(root) ||
//           t.isOptionalMemberExpression(root)
//         ) {
//           const key = semanticStaticPropertyKey(root.property, root.computed);
//           if (key === null) break;
//           members.unshift(key);
//           root = root.object;
//         }
//         if (
//           members.length === 1 &&
//           members[0] === "require" &&
//           isModuleObject(root)
//         )
//           writes.push(node);
//         else if (
//           members.length === 0 &&
//           (t.isMemberExpression(target) ||
//             t.isOptionalMemberExpression(target)) &&
//           target.computed &&
//           semanticStaticPropertyKey(target.property, true) === null &&
//           isModuleObject(target.object)
//         )
//           // An unknown computed key may be "require"; retain uncertainty rather
//           // than treating this direct delegate write as a proven unrelated slot.
//           writes.push(node);
//       }
//       if (t.isCallExpression(node) || t.isOptionalCallExpression(node)) {
//         const invocation = interop.intrinsicInvocation(node);
export const _l = 131;
