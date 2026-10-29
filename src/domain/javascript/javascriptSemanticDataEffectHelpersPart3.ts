export const __stub = 1;
//           selectedPath.length === 0 &&
//           initializer.projection.length > 0
//             ? initializer.node
//             : capture,
//       },
//     ];
//     while (pending.length > 0) {
//       const current = pending.pop()!;
//       const node = unwrapJavaScriptExpression(current.node).node;
//       if (t.isIdentifier(node)) {
//         const source = resolveSemanticBindingState(state, node, node.name);
//         const sourcePath = builtinBindingPath(
//           source,
//           state,
//           specifiers,
//           current.capture,
//           current.path,
//           callableValue,
//           ancestors,
//           memo,
//           node,
//           current.savedObjectCapture,
//         );
//         if (sourcePath === null) return null;
//         // Normalize ESM default namespaces at their owner before projecting an alias.
//         resolvedPath = [...sourcePath, ...current.path].slice(
//           0,
//           sourcePath.length + current.path.length - selectedPath.length,
//         );
//       } else if (
//         t.isMemberExpression(node) ||
//         t.isOptionalMemberExpression(node)
//       ) {
//         const key = semanticStaticPropertyKey(node.property, node.computed);
//         if (key === null) return null;
//         pending.push({
//           node: node.object,
//           path: [key, ...current.path],
//           savedObjectCapture: current.savedObjectCapture,
//           // Freeze a selected function, not later member reads through a saved object.
//           capture:
//             callableValue && selectedPath.length === 0 ? node : current.capture,
//         });
//       } else if (t.isSequenceExpression(node)) {
//         const final = node.expressions.at(-1);
//         if (final === undefined) return null;
//         pending.push({ ...current, node: final });
//       } else if (t.isAssignmentExpression(node) && node.operator === "=") {
//         pending.push({ ...current, node: node.right });
//       } else if (t.isConditionalExpression(node)) {
//         pending.push(
//           { ...current, node: node.consequent },
//           { ...current, node: node.alternate },
//         );
//       } else if (t.isLogicalExpression(node)) {
//         pending.push(
//           { ...current, node: node.left },
//           { ...current, node: node.right },
//         );
//       } else {
//         const required = semanticRequireOrigin(node, state);
//         if (
//           required !== undefined &&
//           requiredModuleChanged(
//             required.origin.specifier,
//             [...required.origin.importedPath, ...current.path],
//             current.capture,
//             state,
//             callableValue,
//             current.savedObjectCapture,
//           )
//         )
//           return null;
//       }
//     }
//   }
//   // Only a direct ESM default import denotes the built-in namespace;
//   // require("node:fs").default is a literal property, not interop syntax.
//   return binding.directOrigins.length > 0 &&
//     semanticBuiltinNamespacePath(importedPath)
//     ? []
//     : builtinNamespaceOrigin({
//         ...provenance.origins[0],
//         importedPath: resolvedPath,
//       }).importedPath;
// };
//
// /** Interpret known Node namespace aliases without changing source provenance. */
// const builtinNamespaceOrigin = (
//   origin: JavaScriptModuleOrigin,
// ): JavaScriptModuleOrigin => {
//   const specifier = origin.specifier.replace(/^node:/u, "");
//   const importedPath =
//     origin.resolutionMode !== "require" && origin.importedPath[0] === "default"
//       ? origin.importedPath.slice(1)
//       : origin.importedPath;
//   return specifier === "fs" && importedPath[0] === "promises"
//     ? {
//         ...origin,
//         specifier: "fs/promises",
//         importedPath: importedPath.slice(1),
//       }
//     : { ...origin, specifier, importedPath };
// };
//
// const affectsBuiltinPath = (
//   path: JavaScriptSemanticPropertyPath,
//   selected: readonly string[],
// ): boolean =>
//   path.length <= selected.length &&
//   path.every((key, index) =>
//     semanticPropertyPathKeyMatches(key, selected[index]!),
//   );
//
// const BUILTIN_RECEIVER_METHODS: Readonly<Record<string, ReadonlySet<string>>> =
//   {
//     fs: new Set([
//       "readFile",
//       "readFileSync",
//       "writeFile",
//       "writeFileSync",
//       "close",
//       "closeSync",
//       "existsSync",
//       ...BUILTIN_RESOURCE_METHODS.fs,
//     ]),
//     "fs/promises": new Set([
//       "readFile",
//       "writeFile",
//       ...BUILTIN_RESOURCE_METHODS["fs/promises"],
//     ]),
//     net: new Set(BUILTIN_RESOURCE_METHODS.net),
//     tls: new Set(BUILTIN_RESOURCE_METHODS.tls),
//     http: new Set(["request", "get"]),
//     https: new Set(["request", "get"]),
//     child_process: new Set(["spawn", "exec", "execFile", "fork"]),
//     process: new Set(["cwd", "uptime", "hrtime", "nextTick"]),
//     timers: new Set([
//       "setTimeout",
//       "setInterval",
//       "setImmediate",
//       "clearTimeout",
//       "clearInterval",
//       "clearImmediate",
//     ]),
//   };
//
// interface BuiltinEffectIndex {
//   readonly writesByModule: Map<
//     string,
//     readonly JavaScriptSemanticRequiredModuleEffect[]
//   >;
//   readonly moduleEffects: Map<
//     string,
//     readonly JavaScriptSemanticRequiredModuleEffect[]
//   >;
//   readonly bindingEscapes: Map<
//     string,
//     readonly JavaScriptSemanticMemberEffect[]
//   >;
//   readonly receivers: WeakMap<t.Node, boolean>;
// }
//
// // Derived passes run after mutation collection. These indexes share that state's
// // lifetime and never cache facts while its mutation owner is still producing them.
// const builtinEffectIndexes = new WeakMap<
//   JavaScriptSemanticAnalysisState,
//   BuiltinEffectIndex
// >();
//
// const builtinEffectIndex = (
//   state: JavaScriptSemanticAnalysisState,
// ): BuiltinEffectIndex => {
//   let index = builtinEffectIndexes.get(state);
//   if (index === undefined) {
//     index = {
//       writesByModule: new Map(
//         [...state.requiredModuleEffects].map(([name, effects]) => [
//           name,
//           effects.filter(({ kind }) => kind === "write"),
//         ]),
//       ),
//       moduleEffects: new Map(),
//       bindingEscapes: new Map(),
//       receivers: new WeakMap(),
//     };
//     builtinEffectIndexes.set(state, index);
//   }
//   return index;
// };
//
// const builtinEscapes = (
//   binding: JavaScriptSemanticBindingState,
//   state: JavaScriptSemanticAnalysisState,
// ): readonly JavaScriptSemanticMemberEffect[] => {
//   const cache = builtinEffectIndex(state).bindingEscapes;
//   let effects = cache.get(binding.bindingId);
//   if (effects === undefined) {
//     effects = binding.escapedPaths.filter(
//       ({ node }) => !originalBuiltinReceiver(node, state),
//     );
//     cache.set(binding.bindingId, effects);
//   }
//   return effects;
// };
//
// const builtinModuleEffects = (
//   specifier: string,
//   state: JavaScriptSemanticAnalysisState,
// ): readonly JavaScriptSemanticRequiredModuleEffect[] => {
//   const cache = builtinEffectIndex(state).moduleEffects;
//   let effects = cache.get(specifier);
//   if (effects === undefined) {
//     effects = (state.requiredModuleEffects.get(specifier) ?? []).filter(
//       ({ kind, node }) =>
//         kind === "write" || !originalBuiltinReceiver(node, state),
//     );
//     if (specifier === "fs/promises") {
//       const sharedFsEscapes = (state.requiredModuleEffects.get("fs") ?? [])
//         .filter(
//           ({ kind, path, node }) =>
//             kind === "escape" &&
//             (path.length === 0 || path[0] === "promises") &&
//             !originalBuiltinReceiver(node, state),
//         )
//         .map((effect) => ({
//           ...effect,
//           path:
//             effect.path[0] === "promises" ? effect.path.slice(1) : effect.path,
//         }));
//       effects = [...effects, ...sharedFsEscapes];
//     }
//     cache.set(specifier, effects);
//   }
//   return effects;
// };
//
export const _l = 237;
