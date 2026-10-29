export const __stub = 1;
//   },
//   state: JavaScriptSemanticAnalysisState,
// ): JavaScriptBootstrapIntegrity | undefined => {
//   const tracked = new Map<string, "table" | "cache" | "loader">([
//     [bootstrap.tableBindingId, "table"],
//     ...(shape.cacheId === undefined ? [] : [[shape.cacheId, "cache"] as const]),
//     ...[...loaderIds].map((id) => [id, "loader"] as const),
//   ]);
//   const names = new Set(
//     [...tracked.keys()].flatMap((id) => state.bindingsById.get(id)?.name ?? []),
//   );
//   const replacedKeys = new Set<string>();
//   let contained = true;
//   traverseJavaScriptAst(call, {
//     skip: () => !contained,
//     enter: (node, parent, readAncestors) => {
//       if (!t.isIdentifier(node) || !names.has(node.name) || parent === null)
//         return;
//       const ancestors = readAncestors();
//       if (!t.isReferenced(node, parent, ancestors.at(-2))) return;
//       const id = bindingOf(state, node);
//       const role = id === undefined ? undefined : tracked.get(id);
//       if (role === undefined) return;
//       const use: Use = { node, parent, ancestors, shape, loaderIds, state };
//       if (role !== "loader") contained = containedUse(role, use);
//       else if (exposedTableUse(use) === "escaped") contained = false;
//       else exposedSlotWrite(use, replacedKeys);
//     },
//   });
//   return contained ? { replacedKeys } : undefined;
// };
//
// interface Use {
//   readonly node: t.Identifier;
//   readonly parent: t.Node;
//   readonly ancestors: readonly t.Node[];
//   readonly shape: LoaderShape;
//   readonly loaderIds: ReadonlySet<string>;
//   readonly state: JavaScriptSemanticAnalysisState;
// }
//
// /** The table is read only by the dispatch; the cache only by the loader's own slot operations. */
// const containedUse = (role: "table" | "cache", use: Use): boolean => {
//   if (role === "table" && use.shape.dispatches.has(use.node)) return true;
//   if (role === "cache" && use.shape.cacheSites.has(use.parent)) return true;
//   return isRuntimeExposure(use, role === "table" ? "m" : "c");
// };
//
// /** `loader.m = table` or `loader.c = cache`, the runtime's own exposure. */
// const isRuntimeExposure = (use: Use, key: "m" | "c"): boolean => {
//   const { parent, node, loaderIds, state } = use;
//   return (
//     t.isAssignmentExpression(parent, { operator: "=" }) &&
//     parent.right === node &&
//     t.isMemberExpression(parent.left) &&
//     t.isIdentifier(parent.left.object) &&
//     semanticStaticPropertyKey(parent.left.property, parent.left.computed) ===
//       key &&
//     loaderIds.has(bindingOf(state, parent.left.object) ?? "")
//   );
// };
//
// /**
//  * `loader.m`/`loader.c` may only be assigned (the exposure) or indexed
//  * directly; any other use, such as `const a = loader.m`, lets later writes
//  * escape this proof. Writing a member of an indexed entry, such as
//  * `loader.c[id].exports = value`, can replace what the loader returns.
//  */
// const exposedTableUse = (use: Use): "other" | "contained" | "escaped" => {
//   const { parent, ancestors } = use;
//   if (
//     !t.isMemberExpression(parent) ||
//     parent.object !== use.node ||
//     !["m", "c"].includes(
//       semanticStaticPropertyKey(parent.property, parent.computed) ?? "",
//     )
//   )
//     return "other";
//   const outer = ancestors.at(-2);
//   const assigned =
//     t.isAssignmentExpression(outer, { operator: "=" }) && outer.left === parent;
//   const indexed =
//     t.isMemberExpression(outer) && outer.object === parent && outer.computed;
//   if (assigned) return "contained";
//   if (!indexed) return "escaped";
//   const member = ancestors.at(-3);
//   const target = ancestors.at(-4);
//   const entryWritten =
//     t.isMemberExpression(member) &&
//     member.object === outer &&
//     ((t.isAssignmentExpression(target) && target.left === member) ||
//       t.isUpdateExpression(target) ||
//       t.isUnaryExpression(target, { operator: "delete" }));
//   return entryWritten ? "escaped" : "contained";
// };
//
// /**
//  * `loader.m[key] = factory` or `delete loader.c[key]` replaces a literal slot.
//  * Writes with runtime keys are chunk installation, which adds modules under
//  * their own ids; they are not treated as replacing a declared slot.
//  */
// const exposedSlotWrite = (use: Use, replacedKeys: Set<string>): void => {
//   const { parent, ancestors } = use;
//   const slot = ancestors.at(-2);
//   const write = ancestors.at(-3);
//   if (
//     !t.isMemberExpression(parent) ||
//     parent.object !== use.node ||
//     !["m", "c"].includes(
//       semanticStaticPropertyKey(parent.property, parent.computed) ?? "",
//     ) ||
//     !t.isMemberExpression(slot) ||
//     slot.object !== parent ||
//     !(
//       (t.isAssignmentExpression(write) && write.left === slot) ||
//       t.isUnaryExpression(write, { operator: "delete" }) ||
//       t.isUpdateExpression(write)
//     )
//   )
//     return;
//   const key = slot.computed
//     ? argumentValue(slot.property)
//     : semanticStaticPropertyKey(slot.property, false);
//   if (key !== undefined && key !== null) replacedKeys.add(key);
// };
//
// const bindingOf = (
//   state: JavaScriptSemanticAnalysisState,
//   identifier: t.Identifier,
// ): string | undefined =>
//   resolveSemanticBindingState(state, identifier, identifier.name)?.bindingId;
export const _l = 131;
