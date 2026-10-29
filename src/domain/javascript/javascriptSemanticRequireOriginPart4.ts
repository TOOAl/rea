export const __stub = 1;
//     specifier: "node:process",
//     importedPath: members.slice(1),
//     resolutionMode: "require",
//   };
// };
//
// /** Strip a static member chain, returning its root expression and member path. */
// export const semanticMemberChain = (
//   node: t.Node | null | undefined,
// ):
//   | { readonly root: t.Node | null | undefined; readonly members: string[] }
//   | undefined => {
//   const members: string[] = [];
//   let current = node;
//   while (current !== null && current !== undefined) {
//     current = unwrapJavaScriptExpression(current).node;
//     if (
//       !t.isMemberExpression(current) &&
//       !t.isOptionalMemberExpression(current)
//     )
//       break;
//     const member = semanticStaticPropertyKey(
//       current.property,
//       current.computed,
//     );
//     if (member === null || !t.isNode(current.object)) return undefined;
//     members.push(member);
//     current = current.object;
//   }
//   return { root: current, members: members.reverse() };
// };
//
// /** Recover an unshadowed literal require origin and its exact member path. */
// export const semanticRequireOrigin = (
//   node: t.Node | null | undefined,
//   state: JavaScriptSemanticAnalysisState,
// ): JavaScriptRequireOrigin | undefined => {
//   const chain = semanticMemberChain(node);
//   const current = chain?.root;
//   if (
//     chain === undefined ||
//     !t.isCallExpression(current) ||
//     !t.isIdentifier(current.callee, { name: "require" })
//   )
//     return undefined;
//   if (
//     writesModuleRequire(state).some(
//       (write) =>
//         !semanticTopLevelEffectFollowsCapture(
//           current,
//           write,
//           state.parentsByNode,
//         ),
//     )
//   )
//     return undefined;
//   const requireBinding = resolveSemanticBindingState(
//     state,
//     current.callee,
//     "require",
//   );
//   if (
//     (requireBinding !== undefined &&
//       !isUnmodifiedCommonJsWrapperBinding(current.callee, "require", state) &&
//       !isWrapperRequireInitializerCall(requireBinding, current, state)) ||
//     (requireBinding === undefined &&
//       semanticResolutionBlocked(state, current.callee, "require")) ||
//     (state.ambientBindingWrites.get("require") ?? []).some(
//       (write) =>
//         !semanticTopLevelEffectFollowsCapture(
//           current,
//           write,
//           state.parentsByNode,
//         ),
//     )
//   )
//     return undefined;
//   const specifier = stringValue(current.arguments[0]);
//   return specifier === undefined
//     ? undefined
//     : {
//         origin: {
//           specifier,
//           importedPath: chain.members,
//           resolutionMode: "require",
//         },
//         call: current,
//       };
// };
//
// /** Node's fs.promises export and fs/promises require share one object. */
// export const semanticRequireExportsIdentity = <Key>(
//   specifier: string,
//   path: readonly Key[],
// ): { readonly specifier: string; readonly path: readonly (Key | string)[] } => {
//   const name = specifier.replace(/^node:/u, "");
//   if (name === "fs/promises") return { specifier: name, path };
//   return name === "fs" && path[0] === "promises" && path.length > 1
//     ? { specifier: "fs/promises", path: path.slice(1) }
//     : { specifier: name, path };
// };
//
// const MUTABLE_BUILTIN_DEFAULTS = new Set([
//   ...Object.keys(BUILTIN_RESOURCE_METHODS),
//   "http",
//   "https",
//   "child_process",
//   "timers",
//   "process",
// ]);
//
// /** Mutable default/object selections share CommonJS identity; namespace slots do not. */
// export const semanticMutableBuiltinOrigin = <Key = never>(
//   origin: JavaScriptModuleOrigin,
//   selected: readonly Key[] = [],
// ):
//   | { readonly specifier: string; readonly path: readonly (Key | string)[] }
//   | undefined => {
//   const path = [...origin.importedPath, ...selected];
//   if (origin.resolutionMode === "require")
//     return { specifier: origin.specifier, path };
//   const specifier = origin.specifier.replace(/^node:/u, "");
//   if (!MUTABLE_BUILTIN_DEFAULTS.has(specifier)) return undefined;
//   if (path[0] === "default") return { specifier, path: path.slice(1) };
//   if (specifier === "process" && (path[0] === "env" || path[0] === "argv"))
//     return { specifier, path };
//   return specifier === "fs" && path[0] === "promises"
//     ? { specifier, path }
//     : undefined;
// };
export const _l = 130;
