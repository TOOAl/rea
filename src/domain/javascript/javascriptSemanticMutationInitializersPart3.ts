export const __stub = 1;
//       return t.isVariableDeclaration(declaration)
//         ? statementPosition(declaration, parents, parent)
//         : null;
//     }
//     current = parent;
//   }
// };
//
// const referenceInitializerPosition = (
//   node: t.Node,
//   parents: WeakMap<t.Node, t.Node>,
// ): StatementPosition | null => {
//   const cache = initializerPositionCache(parents);
//   const cached = cache.reference.get(node);
//   if (cached !== undefined) return cached;
//   const computed = computeReferenceInitializerPosition(node, parents);
//   cache.reference.set(node, computed);
//   return computed;
// };
//
// /** Resolve origins at their use or capture, never at a later transitive effect. */
// export const semanticMutationInitializers = (
//   binding: JavaScriptSemanticBindingState,
//   mutation: t.Node,
//   parents: WeakMap<t.Node, t.Node>,
// ): Pick<
//   JavaScriptSemanticBindingState,
//   "initializers" | "referenceInitializers" | "directOrigins"
// > => {
//   const mutationPosition =
//     directMutationPosition(mutation, parents) ??
//     referenceInitializerPosition(mutation, parents);
//   if (mutationPosition === null) return binding;
//   const origins = [
//     ...binding.initializers.map((initializer) => ({
//       initializer,
//       position:
//         initializer.entryBody === undefined
//           ? directInitializerPosition(initializer.node, parents)
//           : {
//               body: initializer.entryBody.body,
//               index: -1,
//               declaratorIndex: -1,
//             },
//     })),
//     ...binding.referenceInitializers.map((initializer) => ({
//       initializer,
//       position: referenceInitializerPosition(initializer.node, parents),
//     })),
//   ];
//   if (
//     origins.some(
//       ({ position }) =>
//         position === null || !positionPrecedes(position, mutationPosition),
//     )
//   )
//     return binding;
//   const latest = origins.reduce<StatementPosition | null>(
//     (latest, { position }) =>
//       position !== null &&
//       (latest === null || positionPrecedes(latest, position))
//         ? position
//         : latest,
//     null,
//   );
//   const retained = new Set(
//     origins
//       .filter(
//         ({ position }) =>
//           position?.index === latest?.index &&
//           position?.declaratorIndex === latest?.declaratorIndex,
//       )
//       .map(({ initializer }) => initializer),
//   );
//   return {
//     // A proven earlier assignment replaces even an import-equals value. A
//     // capture before or inside an uncertain assignment retains the full binding.
//     directOrigins: origins.length === 0 ? binding.directOrigins : [],
//     initializers: binding.initializers.filter((initializer) =>
//       retained.has(initializer),
//     ),
//     referenceInitializers: binding.referenceInitializers.filter((initializer) =>
//       retained.has(initializer),
//     ),
//   };
// };
//
// /** Select a local alias at its read, before any later straight-line reassignment. */
// export const semanticReadInitializers = (
//   binding: JavaScriptSemanticBindingState,
//   read: t.Node,
//   parents: WeakMap<t.Node, t.Node>,
// ): Pick<
//   JavaScriptSemanticBindingState,
//   "initializers" | "referenceInitializers"
// > => {
//   let position: StatementPosition | null = null;
//   let current = read;
//   for (
//     let parent = parents.get(current);
//     parent;
//     parent = parents.get(current)
//   ) {
//     if (t.isLoop(parent)) return binding;
//     if (t.isFunction(parent)) break;
//     if (position === null) {
//       if (t.isVariableDeclarator(parent)) {
//         const declaration = parents.get(parent);
//         if (t.isVariableDeclaration(declaration))
//           position = statementPosition(declaration, parents, parent);
//       } else if (t.isStatement(parent))
//         position = statementPosition(parent, parents);
//     }
//     current = parent;
//   }
//   return selectInitializers(binding, position, parents, true);
// };
//
// const selectInitializers = (
//   binding: JavaScriptSemanticBindingState,
//   position: StatementPosition | null,
//   parents: WeakMap<t.Node, t.Node>,
//   atRead = false,
// ): Pick<
//   JavaScriptSemanticBindingState,
//   "initializers" | "referenceInitializers"
// > => {
//   if (position === null) return binding;
//   const origins = [
//     ...binding.initializers.map((initializer) => ({
//       initializer,
//       position:
//         initializer.entryBody === undefined
//           ? directInitializerPosition(initializer.node, parents)
//           : {
//               body: initializer.entryBody.body,
//               index: -1,
export const _l = 137;
