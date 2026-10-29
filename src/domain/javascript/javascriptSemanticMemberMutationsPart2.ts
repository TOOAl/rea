export const __stub = 1;
//               mutation,
//             );
//           if (
//             (expression.name === "Array" &&
//               (current.path[0] === "prototype" || current.path[0] === null)) ||
//             (["globalThis", "global", "window", "self"].includes(
//               expression.name,
//             ) &&
//               (current.path[0] === "Array" || current.path[0] === null) &&
//               (current.path[1] === "prototype" || current.path[1] === null))
//           )
//             arrayIterationUnknown = true;
//           continue;
//         }
//         // An alias restored from a saved reference can revisit the same binding
//         // at an earlier capture or a shorter getter-receiver path. Only a
//         // repeated capture and path closes a cycle.
//         const captureKey = captureKeyOf(
//           binding,
//           current.originAt,
//           current.ownerInitializer,
//         );
//         const lifetime = lifetimeKey(captureKey, current.path);
//         if (current.bindings.has(lifetime)) continue;
//         // A self alias such as `node = node[key]` revisits its capture with the
//         // same prefix added on every cycle, so exact paths never repeat. When
//         // that prefix can never be pruned, escaping it once covers every longer
//         // effect, including writes below shared children.
//         // Only a capture already on this alias chain can repeat a prefix.
//         const revisited = current.bindings.has(captureKey);
//         let repeatedPrefix: PropertyPath | undefined;
//         for (
//           let start = 1;
//           revisited && start <= current.path.length;
//           start++
//         ) {
//           const suffix = current.path.slice(start);
//           if (!current.bindings.has(lifetimeKey(captureKey, suffix))) continue;
//           repeatedPrefix = current.path.slice(0, start);
//           break;
//         }
//         if (
//           repeatedPrefix !== undefined &&
//           observablePaths.repeatsUnpruned(binding.bindingId, repeatedPrefix)
//         ) {
//           markValue(
//             current.node,
//             repeatedPrefix,
//             new Set(),
//             "escape",
//             mutation,
//             current.originAt,
//             current.ownerInitializer,
//           );
//           continue;
//         }
//         // Union compatible copied-slot selections at each binding. Carrying every
//         // combination of exclusions through branch diamonds is exponential.
//         // Preserve paths that can change observed slots or Array prototype
//         // effects; canonicalize suffixes that cannot distinguish lattice facts.
//         let path = observablePaths.normalize(
//           binding.bindingId,
//           current.path,
//           effect,
//         );
//         if (path === null) continue;
//         const selectorIndex = path.findIndex(
//           (key) => key !== null && typeof key === "object",
//         );
//         const selector = path[selectorIndex];
//         if (selector !== null && typeof selector === "object") {
//           const selectionIdentity = JSON.stringify([
//             binding.bindingId,
//             effect,
//             path.map((key, index) =>
//               index === selectorIndex
//                 ? { startIndex: selector.startIndex }
//                 : key,
//             ),
//             mutation?.start,
//             mutation?.end,
//             current.originAt?.start,
//             current.originAt?.end,
//             current.ownerInitializer?.start,
//             current.ownerInitializer?.end,
//           ]);
//           const previous = selections.get(selectionIdentity);
//           const excludedKeys =
//             previous === undefined
//               ? selector.excludedKeys
//               : previous.filter((key) => selector.excludedKeys.includes(key));
//           if (previous !== undefined && excludedKeys.length === previous.length)
//             continue;
//           selections.set(selectionIdentity, excludedKeys);
//           path = path.map((key, index) =>
//             index === selectorIndex ? { ...selector, excludedKeys } : key,
//           );
//         }
//         const origins =
//           current.ownerInitializer !== undefined
//             ? {
//                 initializers: binding.initializers.filter(
//                   ({ node }) => node === current.ownerInitializer,
//                 ),
//                 referenceInitializers: [],
//                 directOrigins: [],
//               }
//             : current.originAt === undefined
//               ? binding
//               : semanticMutationInitializers(
//                   binding,
//                   current.originAt,
//                   parents,
//                 );
//         // A setter on the binding's own literal runs on assignment and may
//         // replace any member of its receiver, so the written key is unknown.
//         // Deleting the accessor never calls it.
//         if (
//           effect === "write" &&
//           !t.isUnaryExpression(mutation, { operator: "delete" })
//         ) {
//           const receiver = localSetterReceiver(origins.initializers, path);
//           if (receiver !== undefined) path = [...receiver, null];
//         }
//         // Keep an antichain of exact paths. Widening distinct member keys would
//         // also invalidate unrelated siblings that never reach this effect.
//         // This map is local to the file scan. Escaping the binding id keeps a
//         // field separator injective while avoiding a fresh JSON array encode.
//         const pathState = `${JSON.stringify(binding.bindingId)}\u0001${
//           effect
//         }\u0001${
//           // Short writes stop at owned literal slots, whereas longer writes
//           // reach shared children. Only equal-depth writes cover one another.
//           effect === "write" ? path.length : -1
//         }\u0001${mutation?.start ?? -1}\u0001${mutation?.end ?? -1}\u0001${
//           current.originAt?.start ?? -1
//         }\u0001${current.originAt?.end ?? -1}\u0001${
//           current.ownerInitializer?.start ?? -1
//         }\u0001${current.ownerInitializer?.end ?? -1}`;
//         let covering = coveringPaths.get(pathState);
//         if (covering === undefined) {
//           covering = new SemanticPropertyPathCoverage();
//           coveringPaths.set(pathState, covering);
//         }
//         if (!covering.retain(path)) continue;
//         // A recorded write invalidates the binding to a non-primitive value, so
//         // only its first write can target a primitive. Re-evaluating it would
//         // replay every earlier write and make repeated writes superlinear.
//         const value =
//           effect === "write" && binding.memberWrites.length === 0
//             ? evaluateSemanticBinding(binding, state)
//             : undefined;
//         const primitiveWrite =
//           value?.status === "literal" || value?.status === "union";
//         // The coverage index already owns binding-effect deduplication.
//         recordedEffectCount += 1;
//         const nested = new Set(current.bindings);
//         nested.add(lifetime);
//         nested.add(captureKey);
//         // Returning a literal's receiver reaches that allocation, not the
//         // binding's older values read while evaluating its initializer.
//         if (!primitiveWrite) {
//           for (const origin of origins.directOrigins) {
//             const shared = semanticMutableBuiltinOrigin(origin, path);
//             if (shared !== undefined)
//               recordRequiredEffect(
//                 shared.specifier,
//                 shared.path,
//                 effect,
//                 mutation,
//               );
//           }
//           if (effect === "escape")
//             binding.escapedPaths.push({ path, node: mutation });
//           else binding.memberWrites.push({ path, node: mutation });
//           clearSemanticValueCaches(state);
//           for (const initializer of origins.initializers)
//             pending.push({
//               node: initializer.node,
//               path: [...initializer.projection, ...path],
//               bindings: nested,
//               originAt: initializer.node,
//             });
//         }
//         for (const initializer of origins.referenceInitializers) {
//           const copiedPath = copiedReferencePath(initializer, path, effect);
//           if (copiedPath === null) continue;
//           pendingReferences.push({
//             initializer,
//             path: copiedPath,
//             bindings: nested,
//             effect,
//             originAt: initializer.node,
//             ...(mutation === undefined ? {} : { mutation }),
//           });
//         }
//       } else if (
//         t.isMemberExpression(expression) ||
//         t.isOptionalMemberExpression(expression)
//       ) {
//         pending.push({
//           node: expression.object,
//           path: [
//             semanticStaticPropertyKey(expression.property, expression.computed),
//             ...current.path,
//           ],
//           bindings: current.bindings,
//           originAt: current.originAt,
//         });
//       } else {
//         for (const value of effect === "escape"
//           ? escapedReferenceLeaves(expression, current.path)
//           : expandedValues(expression, current.path, effect)) {
//           if (value.escapes && effect !== "escape")
//             markValue(
//               value.node,
//               value.path,
//               new Set(),
//               "escape",
//               mutation,
//               current.originAt,
//               value.ownerInitializer,
//             );
//           else if (value.iterableFallbackPath !== undefined)
//             deferIterable({
//               node: value.node,
//               projection: [],
//               path: value.path,
//               fallbackPath: value.iterableFallbackPath,
//               bindings: current.bindings,
//               effect,
//               originAt: current.originAt,
//               ...(mutation === undefined ? {} : { mutation }),
//             });
//           else
//             pending.push({
//               ...value,
//               bindings: current.bindings,
//               originAt: current.originAt,
//             });
//         }
//       }
//     }
//   };
//   const markEscaped = (
//     node: t.Node,
//     mutation: t.Node,
//     path: PropertyPath = [],
//   ): void => markValue(node, path, new Set(), "escape", mutation);
//   function expandedValues(
//     expression: t.Node,
//     path: PropertyPath,
//     effect: ValueEffect,
//   ): readonly ReferencedValue[] {
//     if (
//       t.isArrayExpression(expression) &&
//       ((path[0] === "__proto__" && (effect === "escape" || path.length > 1)) ||
//         (path[0] === "constructor" && path[1] === "prototype"))
//     )
//       arrayIterationUnknown = true;
//     return referencedValues(expression, path, effect, state);
//   }
//   // Expanding a value below its references depends only on syntax, not on the
//   // escape site. Escaping an object reaches every method's results, so
//   // re-expanding it at each call through that object made N calls over N
//   // methods quadratic. Identifiers that resolve to the same binding and path
//   // are processed identically, so one stands for all of them.
//   const escapedLeaves = new WeakMap<
//     t.Node,
//     Map<string, readonly ReferencedValue[]>
//   >();
//   function escapedReferenceLeaves(
//     root: t.Node,
//     rootPath: PropertyPath,
//   ): readonly ReferencedValue[] {
//     // Parser recovery can leave an argument hole, which expands to nothing.
//     if (!t.isNode(root)) return [];
//     const rootKey = JSON.stringify(rootPath);
//     const cached = escapedLeaves.get(root)?.get(rootKey);
//     if (cached !== undefined) return cached;
//     const leaves: ReferencedValue[] = [];
//     const leafIdentities = new Set<string>();
//     const expanded = new WeakMap<t.Node, Set<string>>();
//     const pending = [...expandedValues(root, rootPath, "escape")];
//     for (let cursor = 0; cursor < pending.length; cursor++) {
//       const value = pending[cursor];
//       if (value === undefined) break;
//       const node = unwrapJavaScriptExpression(value.node).node;
//       if (!t.isNode(node)) continue;
//       const pathKey = JSON.stringify(value.path);
//       if (t.isIdentifier(node) && value.iterableFallbackPath === undefined) {
//         const binding = resolveBinding(node, node.name);
//         const identity = JSON.stringify([
//           binding === undefined ? null : binding.bindingId,
//           binding === undefined ? node.name : null,
//           pathKey,
//           value.ownerInitializer?.start,
//           value.ownerInitializer?.end,
//         ]);
//         if (leafIdentities.has(identity)) continue;
//         leafIdentities.add(identity);
//         leaves.push(value);
//       } else if (
//         value.iterableFallbackPath !== undefined ||
//         t.isIdentifier(node) ||
//         t.isMemberExpression(node) ||
//         t.isOptionalMemberExpression(node)
//       )
//         leaves.push(value);
//       else {
//         const paths = expanded.get(node) ?? new Set<string>();
//         if (paths.has(pathKey)) continue;
//         paths.add(pathKey);
//         expanded.set(node, paths);
//         for (const reference of expandedValues(node, value.path, "escape"))
//           pending.push(reference);
//       }
//     }
//     const byPath = escapedLeaves.get(root) ?? new Map();
//     byPath.set(rootKey, leaves);
//     escapedLeaves.set(root, byPath);
//     return leaves;
//   }
//   const markReceiver = (callee: t.Node, mutation: t.Node): void => {
//     const expression = unwrapJavaScriptExpression(callee).node;
//     if (
//       t.isMemberExpression(expression) ||
//       t.isOptionalMemberExpression(expression)
//     )
//       markEscaped(expression.object, mutation);
//   };
//   const markTarget = (node: t.Node, mutation: t.Node): void => {
//     for (const target of semanticWriteTargets(node))
//       if (!t.isIdentifier(target))
//         markValue(
//           target.object,
//           [semanticStaticPropertyKey(target.property, target.computed)],
//           new Set(),
//           "write",
//           mutation,
//         );
export const _l = 341;
