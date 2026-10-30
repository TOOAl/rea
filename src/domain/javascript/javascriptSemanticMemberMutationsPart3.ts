export const __stub = 1;
//   };
//   yield* traverseJavaScriptAstSteps(program, {
//     enter: (node, parent) => {
//       for (const source of semanticIterationSources(node, parent))
//         deferIterable({
//           ...source,
//           path: source.projection,
//           fallbackPath: source.projection,
//           bindings: new Set(),
//           effect: "escape",
//           originAt: source.mutation,
//           iterationOnly: source.kind === "iteration",
//         });
//       const writeTarget = semanticWriteSiteTarget(node);
//       if (writeTarget !== null) markTarget(writeTarget, node);
//       else if (
//         t.isCallExpression(node) ||
//         t.isOptionalCallExpression(node) ||
//         t.isNewExpression(node)
//       ) {
//         for (const source of returnedReferences(node.callee))
//           markEscaped(source.node, node, source.projection);
//         for (const argument of node.arguments)
//           if (t.isSpreadElement(argument))
//             deferIterable({
//               node: argument.argument,
//               projection: [],
//               path: [null],
//               fallbackPath: [],
//               bindings: new Set(),
//               effect: "escape",
//               mutation: node,
//               originAt: node,
//             });
//           else markEscaped(argument, node);
//         // Constructing a member does not pass its container as `this`.
//         if (!t.isNewExpression(node)) markReceiver(node.callee, node);
//       } else if (t.isTaggedTemplateExpression(node)) {
//         markReceiver(node.tag, node);
//         for (const expression of node.quasi.expressions)
//           markEscaped(expression, node);
//       }
//     },
//   });
//   // A later effect can make a previously defined destructuring source uncertain.
//   // Reconsider defaults and iterable origins until their effects are stable.
//   while (pendingReferences.length > 0 || iterableReferences.length > 0) {
//     const effectsBefore = recordedEffectCount;
//     const iterablesBefore = iterableReferences.length;
//     const iterationBefore: boolean = arrayIterationUnknown;
//     for (const [index, reference] of pendingReferences.splice(0).entries()) {
//       if (index % 64 === 0) yield;
//       const { initializer } = reference;
//       if (semanticReferenceSourcesInactive(initializer, state))
//         pendingReferences.push(reference);
//       else if (t.isForOfStatement(initializer.node))
//         deferIterable({
//           node: initializer.node.right,
//           projection: [],
//           path: [null, ...reference.path],
//           fallbackPath: [],
//           bindings: reference.bindings,
//           effect: reference.effect,
//           originAt: initializer.node,
//           ...(reference.mutation === undefined
//             ? {}
//             : { mutation: reference.mutation }),
//         });
//       else if (
//         initializer.copyKind === "array-rest" &&
//         initializer.copyProjectionOffset !== undefined
//       ) {
//         const offset = initializer.copyProjectionOffset;
//         const projection = initializer.projection.slice(0, offset);
//         deferIterable({
//           node: initializer.node,
//           projection,
//           path: reference.path,
//           fallbackPath: projection,
//           bindings: reference.bindings,
//           effect: reference.effect,
//           originAt: reference.originAt,
//           ...(reference.mutation === undefined
//             ? {}
//             : { mutation: reference.mutation }),
//         });
//       } else
//         markValue(
//           initializer.node,
//           reference.path,
//           reference.bindings,
//           reference.effect,
//           reference.mutation,
//           reference.originAt,
//         );
//     }
//     for (const [index, reference] of [...iterableReferences].entries()) {
//       if (index % 64 === 0) yield;
//       if (semanticReferenceSourcesInactive(reference, state)) continue;
//       if (reference.iterationOnly) {
//         const expanded = expandedIterationReferences(reference, state);
//         if (expanded !== null) {
//           for (const selected of expanded) deferIterable(selected);
//           continue;
//         }
//       }
//       const slot = semanticSelectedReferenceSlot(reference, state);
//       // Custom iteration can yield the iterable itself as well as any child.
//       // Treat its root as escaped, including writes through yielded references.
//       const knownArray =
//         !arrayIterationUnknown &&
//         slot?.value.status === "array" &&
//         slot.value.items.every(
//           (item) => semanticArrayIndex(item.name) !== null,
//         );
//       if (knownArray && reference.iterationOnly) continue;
//       markValue(
//         reference.node,
//         knownArray ? reference.path : reference.fallbackPath,
//         reference.bindings,
//         knownArray ? reference.effect : "escape",
//         reference.mutation,
//         reference.originAt,
//       );
//     }
//     if (
//       recordedEffectCount === effectsBefore &&
//       iterableReferences.length === iterablesBefore &&
//       arrayIterationUnknown === iterationBefore
//     )
//       break;
//   }
//   // Gathering effects can evaluate a primitive projection before its object
//   // escapes. Final values must use the completed mutation state.
//   clearSemanticValueCaches(state);
// }
//
// interface ReferencedValue extends JavaScriptSemanticObjectReference {
//   readonly iterableFallbackPath?: PropertyPath;
// }
//
// interface IterableReference extends ReferencedValue {
//   readonly projection: PropertyPath;
//   readonly fallbackPath: PropertyPath;
//   readonly bindings: ReadonlySet<string>;
//   readonly effect: ValueEffect;
//   readonly mutation?: t.Node;
//   readonly originAt: t.Node | undefined;
//   readonly iterationOnly?: boolean;
//   readonly requiredSources?: readonly {
//     readonly node: t.Node;
//     readonly projection: PropertyPath;
//   }[];
//   readonly fallbackSources?: readonly {
//     readonly node: t.Node;
//     readonly projection: PropertyPath;
//   }[];
// }
//
// const expandedIterationReferences = (
//   reference: IterableReference,
//   state: JavaScriptSemanticAnalysisState,
// ): readonly IterableReference[] | null => {
//   if (!t.isForOfStatement(reference.mutation)) return null;
//   const iterable = reference.mutation.right;
//   // Expand only the loop's yielded-item selector. Enumerating dynamic property
//   // selections would multiply paths through shared object aliases.
//   const source = [
//     reference,
//     ...(reference.requiredSources ?? []),
//     ...(reference.fallbackSources ?? []),
//   ].find((source) => source.node === iterable && source.projection[0] === null);
//   if (source === undefined) return null;
//   const slot = semanticSelectedReferenceSlot(
//     { node: iterable, projection: [] },
//     state,
//   );
//   const container = slot === undefined ? null : semanticContainer(slot.value);
//   if (container?.coverage.status !== "complete") return null;
//   const select = (
//     candidate: { readonly node: t.Node; readonly projection: PropertyPath },
//     name: string,
//   ) => ({
//     ...candidate,
//     projection:
//       candidate.node === iterable && candidate.projection[0] === null
//         ? [name, ...candidate.projection.slice(1)]
//         : candidate.projection,
//   });
//   return container.slots.map((slot) => {
//     const { projection } = select(reference, slot.name);
//     return {
//       ...reference,
//       projection,
//       path: projection,
//       fallbackPath: projection,
//       ...(reference.requiredSources === undefined
//         ? {}
//         : {
//             requiredSources: reference.requiredSources.map((source) =>
//               select(source, slot.name),
//             ),
//           }),
//       ...(reference.fallbackSources === undefined
//         ? {}
//         : {
//             fallbackSources: reference.fallbackSources.map((source) =>
//               select(source, slot.name),
//             ),
//           }),
//     };
//   });
// };
//
// const referencedValues = (
//   node: t.Node,
//   path: PropertyPath,
//   effect: ValueEffect,
//   state: JavaScriptSemanticAnalysisState,
// ): readonly ReferencedValue[] => {
//   if (effect === "escape" && t.isFunction(node))
//     return semanticCallableResultExpressions(node).flatMap(
//       ({ node, delegated }) =>
//         node === null ? [] : [{ node, path: delegated ? [null] : [] }],
//     );
//   // An initializer owns its slots; only deeper writes can affect shared children.
//   if (t.isObjectExpression(node) || t.isArrayExpression(node)) {
//     if (effect === "write" && path.length < 2) return [];
//     return t.isObjectExpression(node)
//       ? semanticObjectPropertyReferences(node, path, state)
//       : arrayReferencedValues(node, path);
//   }
//   if (t.isClass(node)) {
//     const [key, ...remaining] = path;
//     if (key === undefined) return [];
//     // Replacing or deleting the getter's property does not use the value it
//     // would return. Only a deeper path can mutate the returned object.
//     if (effect === "write" && remaining.length === 0) return [];
//     return semanticClassPropertyReferences(
//       { owner: node, kind: "static" },
//       [key, ...remaining],
//       state,
//     );
//   }
//   if (t.isNewExpression(node)) {
//     const [key, ...remaining] = path;
//     if (key === undefined) return [];
//     if (effect === "write" && remaining.length === 0) return [];
//     return semanticClassCandidates(node.callee, state).flatMap((klass) =>
//       semanticClassPropertyReferences(
//         { owner: klass, kind: "instance" },
//         [key, ...remaining],
//         state,
//       ),
//     );
//   }
//   if (t.isAssignmentExpression(node))
//     return node.operator === "||=" || node.operator === "??="
//       ? [
//           { node: node.left, path },
//           { node: node.right, path },
//         ]
//       : [{ node: node.right, path }];
//   if (t.isAwaitExpression(node)) return [{ node: node.argument, path }];
//   if (t.isSequenceExpression(node)) {
//     const last = node.expressions.at(-1);
//     return last === undefined ? [] : [{ node: last, path }];
//   }
//   if (t.isConditionalExpression(node))
//     return [
//       { node: node.consequent, path },
//       { node: node.alternate, path },
//     ];
//   if (t.isLogicalExpression(node))
//     return [
//       { node: node.left, path },
//       { node: node.right, path },
//     ];
//   return [];
// };
//
// type MutationObservableOrigin =
//   | t.ObjectExpression
//   | t.ArrayExpression
//   | t.ClassDeclaration
//   | t.ClassExpression
//   | t.NewExpression
//   | "ambient"
//   | "array"
//   | "array-prototype"
//   | "opaque";
//
// interface MutationObserverNode {
//   origins?: Set<MutationObservableOrigin>;
//   sources?: Set<MutationObserverNode>;
//   dependents?: Set<MutationObserverNode>;
//   projections?: Map<string, MutationObserverNode>;
//   readonly read?: {
//     readonly source: MutationObserverNode;
//     readonly key: PropertyPath[number];
//   };
// }
//
// const observableMutationPaths = (
//   state: JavaScriptSemanticAnalysisState,
// ): {
//   readonly normalize: (
//     bindingId: string,
//     path: PropertyPath,
//     effect: ValueEffect,
//   ) => PropertyPath | null;
//   readonly repeatsUnpruned: (
//     bindingId: string,
//     prefix: PropertyPath,
//   ) => boolean;
// } => {
//   const bindingNodes = new Map<string, MutationObserverNode>();
//   const expressions = new WeakMap<t.Node, MutationObserverNode>();
//   const pendingExpressions: {
//     readonly expression: t.Node;
//     readonly observer: MutationObserverNode;
//   }[] = [];
//   const pending: MutationObserverNode[] = [];
//   const queued = new Set<MutationObserverNode>();
//   const schedule = (node: MutationObserverNode): void => {
//     if (queued.has(node)) return;
//     queued.add(node);
//     pending.push(node);
//   };
//   const create = (read?: MutationObserverNode["read"]): MutationObserverNode =>
//     // Most bindings have no object origin or property projection. Materialize
//     // each collection only when it contains a fact or relationship.
//     read === undefined ? {} : { read };
//   const link = (
//     source: MutationObserverNode,
//     target: MutationObserverNode,
//   ): void => {
//     if (target.sources?.has(source) === true) return;
//     (target.sources ??= new Set()).add(source);
//     (source.dependents ??= new Set()).add(target);
//     schedule(target);
export const _l = 341;
