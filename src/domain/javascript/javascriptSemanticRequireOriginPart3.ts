export const __stub = 1;
//         const owner =
//           invocation?.path?.length === 3 ? invocation.path[1] : undefined;
//         const method = invocation?.path?.at(-1);
//         const args = invocation?.arguments;
//         if (
//           (owner === "Object" || owner === "Reflect") &&
//           method === "defineProperty" &&
//           isModuleObject(args?.[0] ?? t.nullLiteral())
//         ) {
//           const key = interop.staticString(args?.[1]);
//           if (key === "require" || key === undefined) writes.push(node);
//         } else if (
//           owner === "Object" &&
//           method === "defineProperties" &&
//           isModuleObject(args?.[0] ?? t.nullLiteral())
//         ) {
//           const descriptors = args?.[1];
//           if (
//             !t.isObjectExpression(descriptors) ||
//             descriptors.properties.some(
//               (property) =>
//                 t.isSpreadElement(property) ||
//                 (t.isObjectProperty(property) &&
//                   semanticStaticPropertyKey(property.key, property.computed) ===
//                     "require"),
//             )
//           )
//             writes.push(node);
//         } else if (
//           owner === "Object" &&
//           method === "assign" &&
//           args?.some((arg) => isModuleObject(arg))
//         ) {
//           const target = args?.[0];
//           if (target !== undefined && isModuleObject(target)) {
//             const sourceHasRequire = args
//               ?.slice(1)
//               .some(
//                 (arg) =>
//                   t.isObjectExpression(arg) &&
//                   arg.properties.some(
//                     (property) =>
//                       t.isObjectProperty(property) &&
//                       semanticStaticPropertyKey(
//                         property.key,
//                         property.computed,
//                       ) === "require",
//                   ),
//               );
//             if (
//               sourceHasRequire ||
//               args?.slice(1).some((arg) => !t.isObjectExpression(arg))
//             )
//               writes.push(node);
//           }
//         }
//       }
//     },
//   });
//   moduleRequireWrites.set(state, writes);
//   return writes;
// };
//
// /** Whether the original global process object can still own effects at this source site. */
// export const semanticOriginalGlobalProcessAt = (
//   node: t.Node,
//   state: JavaScriptSemanticAnalysisState,
// ): boolean => {
//   let replacements = globalProcessReplacements.get(state);
//   if (replacements === undefined) {
//     replacements = [
//       ...state.ambientWriteEffects
//         .filter(
//           ({ path }) =>
//             path.length <= 2 &&
//             path.every((key, index) =>
//               semanticPropertyPathKeyMatches(
//                 key,
//                 ["global", "process"][index]!,
//               ),
//             ),
//         )
//         .map(({ node: write }) => write),
//       ...(state.ambientBindingWrites.get("process") ?? []),
//     ];
//     globalProcessReplacements.set(state, replacements);
//   }
//   return !replacements.some(
//     (write) =>
//       !semanticTopLevelEffectFollowsCapture(node, write, state.parentsByNode),
//   );
// };
//
// /** Node's unbound process reference shares the cached process exports object. */
// export const semanticGlobalProcessOrigin = (
//   node: t.Node,
//   state: JavaScriptSemanticAnalysisState,
// ): JavaScriptModuleOrigin | undefined =>
//   t.isIdentifier(node, { name: "process" }) &&
//   resolveSemanticBindingState(state, node, "process") === undefined &&
//   !semanticResolutionBlocked(state, node, "process") &&
//   semanticOriginalGlobalProcessAt(node, state)
//     ? { specifier: "node:process", importedPath: [], resolutionMode: "require" }
//     : undefined;
//
// /** Resolve qualified global-object process references, preserving their selected path. */
// export const semanticGlobalProcessPathOrigin = (
//   node: t.Node,
//   state: JavaScriptSemanticAnalysisState,
// ): JavaScriptModuleOrigin | undefined => {
//   const members: string[] = [];
//   let current = unwrapJavaScriptExpression(node).node;
//   while (
//     t.isMemberExpression(current) ||
//     t.isOptionalMemberExpression(current)
//   ) {
//     const key = semanticStaticPropertyKey(current.property, current.computed);
//     if (key === null) return undefined;
//     members.unshift(key);
//     current = unwrapJavaScriptExpression(current.object).node;
//   }
//   if (
//     !t.isIdentifier(current) ||
//     !["globalThis", "global", "window", "self"].includes(current.name) ||
//     resolveSemanticBindingState(state, current, current.name) !== undefined ||
//     semanticResolutionBlocked(state, current, current.name) ||
//     members[0] !== "process" ||
//     !semanticOriginalGlobalProcessAt(node, state)
//   )
//     return undefined;
//   return {
export const _l = 131;
