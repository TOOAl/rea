export const __stub = 1;
//   };
//   const expressionNode = (node: t.Node): MutationObserverNode => {
//     const expression = unwrapJavaScriptExpression(node).node;
//     const existing = expressions.get(expression);
//     if (existing !== undefined) return existing;
//     const observer = create();
//     expressions.set(expression, observer);
//     pendingExpressions.push({ expression, observer });
//     return observer;
//   };
//   const project = (
//     source: MutationObserverNode,
//     path: PropertyPath,
//   ): MutationObserverNode => {
//     let observer = source;
//     for (const key of path) {
//       const identity = JSON.stringify(
//         key === null || typeof key === "object" ? key : String(key),
//       );
//       let selected = observer.projections?.get(identity);
//       if (selected === undefined) {
//         selected = create({ source: observer, key });
//         (observer.projections ??= new Map()).set(identity, selected);
//         (observer.dependents ??= new Set()).add(selected);
//         schedule(selected);
//       }
//       observer = selected;
//     }
//     return observer;
//   };
//   for (const binding of state.bindingsById.values())
//     bindingNodes.set(binding.bindingId, create());
//   for (const binding of state.bindingsById.values()) {
//     const observer = bindingNodes.get(binding.bindingId);
//     if (observer === undefined) continue;
//     // Imported values are external objects with observable member slots even
//     // when their syntax has no local object-allocation node (for example a
//     // CommonJS namespace from `require("node:fs")`). Keep those writes at their
//     // exact member paths instead of widening the first path to a wildcard.
//     const hasParsedRequireOrigin = binding.initializers.some(
//       ({ node }) => semanticRequireOrigin(node, state) !== undefined,
//     );
//     if (binding.directOrigins.length > 0 || hasParsedRequireOrigin)
//       (observer.origins ??= new Set()).add("opaque");
//     for (const initializer of binding.initializers) {
//       link(
//         project(expressionNode(initializer.node), initializer.projection),
//         observer,
//       );
//     }
//     // Preserve exact paths where copies, defaults or iteration need their
//     // reference-specific projections; an opaque origin prevents pruning.
//     if (binding.referenceInitializers.length > 0)
//       (observer.origins ??= new Set()).add("opaque");
//     for (const initializer of binding.referenceInitializers) {
//       for (const source of [
//         initializer,
//         ...(initializer.requiredSources ?? []),
//         ...(initializer.fallbackSources ?? []),
//       ])
//         link(expressionNode(source.node), observer);
//     }
//   }
//   const settle = (): void => {
//     while (pendingExpressions.length > 0 || pending.length > 0) {
//       while (pendingExpressions.length > 0) {
//         const selected = pendingExpressions.pop();
//         if (selected === undefined) break;
//         const { expression, observer } = selected;
//         // Keep class/getter projections distinct so cycle pruning does not
//         // discard observable escapes through a shared getter result.
//         if (
//           t.isObjectExpression(expression) ||
//           t.isArrayExpression(expression) ||
//           t.isClass(expression) ||
//           t.isNewExpression(expression)
//         )
//           (observer.origins ??= new Set()).add(expression);
//         else if (t.isIdentifier(expression)) {
//           const binding = resolveSemanticBindingState(
//             state,
//             expression,
//             expression.name,
//           );
//           if (binding !== undefined) {
//             const origin = bindingNodes.get(binding.bindingId);
//             if (origin !== undefined) link(origin, observer);
//           } else if (expression.name === "Array")
//             (observer.origins ??= new Set()).add("array");
//           else if (
//             ["globalThis", "global", "window", "self"].includes(expression.name)
//           )
//             (observer.origins ??= new Set()).add("ambient");
//         } else if (
//           t.isMemberExpression(expression) ||
//           t.isOptionalMemberExpression(expression)
//         )
//           link(
//             project(expressionNode(expression.object), [
//               semanticStaticPropertyKey(
//                 expression.property,
//                 expression.computed,
//               ),
//             ]),
//             observer,
//           );
//         else
//           for (const reference of referencedValues(
//             expression,
//             [],
//             "escape",
//             state,
//           ))
//             link(
//               project(expressionNode(reference.node), reference.path),
//               observer,
//             );
//         schedule(observer);
//       }
//       const observer = pending.pop();
//       if (observer === undefined) continue;
//       queued.delete(observer);
//       let changed = false;
//       const add = (origin: MutationObservableOrigin): void => {
//         if (observer.origins?.has(origin) === true) return;
//         (observer.origins ??= new Set()).add(origin);
//         changed = true;
//       };
//       for (const source of observer.sources ?? [])
//         for (const origin of source.origins ?? []) add(origin);
//       if (observer.read !== undefined) {
//         const { source, key } = observer.read;
//         if (key === null || typeof key === "object") {
//           // Dynamic keys and copied-slot masks retain their original paths.
//           // Enumerating their exclusion combinations would recreate the growth
//           // that the mutation collector's selection union already prevents.
//           if ((source.origins?.size ?? 0) > 0) add("opaque");
//         } else
//           for (const origin of source.origins ?? []) {
//             if (typeof origin === "string") {
//               if (origin === "array-prototype" || origin === "opaque")
//                 add(origin);
//               else if (
//                 origin === "ambient" &&
//                 semanticPropertyPathKeyMatches(key, "Array")
//               )
//                 add("array");
//               else if (
//                 origin === "array" &&
//                 semanticPropertyPathKeyMatches(key, "prototype")
//               )
//                 add("array-prototype");
//             } else {
//               for (const reference of referencedValues(
//                 origin,
//                 [key],
//                 "escape",
//                 state,
//               )) {
//                 link(
//                   project(expressionNode(reference.node), reference.path),
//                   observer,
//                 );
//                 if (reference.iterableFallbackPath !== undefined)
//                   link(
//                     project(
//                       expressionNode(reference.node),
//                       reference.iterableFallbackPath,
//                     ),
//                     observer,
//                   );
//               }
//             }
//           }
//       }
//       if (changed)
//         for (const dependent of observer.dependents ?? []) schedule(dependent);
//     }
//   };
//   settle();
//   const normalize = (
//     bindingId: string,
//     path: PropertyPath,
//     effect: ValueEffect,
//   ): PropertyPath | null => {
//     let observer = bindingNodes.get(bindingId);
//     if (observer === undefined) return path;
//     if (path.some((key) => key !== null && typeof key === "object"))
//       return path;
//     if (effect === "escape") {
//       observer = project(observer, path);
//       settle();
//       return (observer.origins?.size ?? 0) === 0 ? null : path;
//     }
//     if ((observer.origins?.size ?? 0) === 0)
//       return path.length === 0 ? path : [null];
//     for (let offset = 0; offset < path.length; offset++) {
//       const key = path[offset];
//       if (key === undefined) break;
//       observer = project(observer, [key]);
//       settle();
//       if ((observer.origins?.size ?? 0) === 0 && offset + 1 < path.length)
//         return [...path.slice(0, offset + 1), null];
//     }
//     return path;
//   };
//   // A projection's origins depend only on its source origins and key. Once
//   // repeating a prefix revisits an origin set, every longer repetition stays
//   // observable and normalization can never prune it. The answer depends only
//   // on the binding and prefix, so every revisit of a long chain shares it.
//   const repeated = new Map<string, boolean>();
//   const repeatsUnpruned = (
//     bindingId: string,
//     prefix: PropertyPath,
//   ): boolean => {
//     const key = JSON.stringify([bindingId, prefix]);
//     const cached = repeated.get(key);
//     if (cached !== undefined) return cached;
//     let observer = bindingNodes.get(bindingId);
//     const signatures = new Set<string>();
//     let result = false;
//     while (observer !== undefined && prefix.length > 0) {
//       observer = project(observer, prefix);
//       settle();
//       if ((observer.origins?.size ?? 0) === 0) break;
//       const signature = JSON.stringify(
//         [...(observer.origins ?? [])]
//           .map((origin) =>
//             typeof origin === "string"
//               ? origin
//               : `${String(origin.start)}:${String(origin.end)}`,
//           )
//           .sort(compareUnicodeCodePoints),
//       );
//       if (signatures.has(signature)) {
//         result = true;
//         break;
//       }
//       signatures.add(signature);
//     }
//     repeated.set(key, result);
//     return result;
//   };
//   return { normalize, repeatsUnpruned };
// };
//
// const arrayReferencedValues = (
//   node: t.ArrayExpression,
//   path: PropertyPath,
// ): readonly ReferencedValue[] => {
//   const [key, ...remaining] = path;
//   const selected = key ?? null;
//   const selectedIndex =
//     typeof selected === "object" ? null : semanticArrayIndex(selected);
//   if (typeof selected !== "object" && selectedIndex === null) return [];
//   const references: ReferencedValue[] = [];
//   let minimumIndex = 0;
//   let uncertainIndex = false;
//   for (const element of node.elements) {
//     if (t.isSpreadElement(element)) {
//       if (selectedIndex === null || selectedIndex >= minimumIndex) {
//         let sourceKey: PropertyPath[number] = null;
//         if (!uncertainIndex) {
//           if (selectedIndex !== null) sourceKey = selectedIndex - minimumIndex;
//           else if (selected !== null && typeof selected === "object")
//             sourceKey = {
//               excludedKeys: selected.excludedKeys.flatMap((name) => {
//                 const index = semanticArrayIndex(name);
//                 return index === null || index < minimumIndex
//                   ? []
//                   : [String(index - minimumIndex)];
//               }),
//               startIndex: Math.max(
//                 0,
//                 (selected.startIndex ?? 0) - minimumIndex,
//               ),
//             };
//         }
//         references.push({
//           node: element.argument,
//           path: [sourceKey, ...remaining],
//           iterableFallbackPath: [],
//         });
//       }
//       uncertainIndex = true;
//       continue;
//     }
//     if (
//       element !== null &&
//       (uncertainIndex
//         ? selectedIndex === null || selectedIndex >= minimumIndex
//         : semanticPropertyPathKeyMatches(selected, String(minimumIndex)))
//     )
//       references.push({ node: element, path: remaining });
//     minimumIndex++;
//   }
//   return references;
// };
//
// const copiedReferencePath = (
//   initializer: JavaScriptSemanticBindingState["referenceInitializers"][number],
//   path: PropertyPath,
//   effect: ValueEffect,
// ): PropertyPath | null => {
//   const offset = initializer.copyProjectionOffset;
//   if (offset === undefined) return [...initializer.projection, ...path];
//   const copiedPath = [...initializer.projection.slice(offset + 1), ...path];
//   if (effect === "write" && copiedPath.length < 2) return null;
//   let [key, ...remaining] = copiedPath;
//   if (initializer.copyKind === "array-rest") {
//     const startIndex = initializer.copyStartIndex ?? 0;
//     if (key === undefined || key === null)
//       key = { excludedKeys: [], startIndex };
//     else if (typeof key === "object")
//       key = {
//         excludedKeys: key.excludedKeys.flatMap((name) => {
//           const index = semanticArrayIndex(name);
//           return index === null ? [] : [String(index + startIndex)];
//         }),
//         startIndex: (key.startIndex ?? 0) + startIndex,
//       };
//     else {
//       const index = semanticArrayIndex(key);
//       if (index === null) return null;
//       key = index + startIndex;
//     }
//   } else {
//     const excludedKeys = initializer.copyExcludedKeys ?? [];
//     if (key === undefined || key === null) key = { excludedKeys };
//     else if (typeof key === "object")
//       key = {
//         ...key,
//         excludedKeys: [...new Set([...key.excludedKeys, ...excludedKeys])].sort(
//           compareUnicodeCodePoints,
//         ),
//       };
//     else if (excludedKeys.includes(String(key))) return null;
//   }
//   return [...initializer.projection.slice(0, offset), key, ...remaining];
// };
export const _l = 340;
