export const __stub = 1;
//   location: JavaScriptSemanticPromiseOperation["location"],
// ): string =>
//   `${location.start.line}:${location.start.column}:${location.end.line}:${location.end.column}`;
//
// const promiseSources = (
//   candidate: PromiseCandidate,
//   candidateByNode: WeakMap<t.Node, PromiseCandidate>,
//   state: JavaScriptSemanticAnalysisState,
// ): PromiseResolution => {
//   if (candidate.kind === "chain") {
//     const member =
//       t.isCallExpression(candidate.node) ||
//       t.isOptionalCallExpression(candidate.node)
//         ? dataEffectMemberCallee(candidate.node)
//         : null;
//     return member === null
//       ? unresolvedPromise()
//       : resolvePromiseExpression(
//           member.object,
//           promiseResolutionContext(candidate, candidateByNode, state),
//         );
//   }
//   if (candidate.kind === "aggregate")
//     return aggregateSources(candidate, candidateByNode, state);
//   if (candidate.kind === "awaited-expression")
//     return t.isAwaitExpression(candidate.node)
//       ? resolvePromiseExpression(
//           candidate.node.argument,
//           promiseResolutionContext(candidate, candidateByNode, state),
//         )
//       : unresolvedPromise();
//   return { promiseIds: [], status: "complete" };
// };
//
// const aggregateSources = (
//   candidate: PromiseCandidate,
//   candidateByNode: WeakMap<t.Node, PromiseCandidate>,
//   state: JavaScriptSemanticAnalysisState,
// ): PromiseResolution => {
//   if (
//     !t.isCallExpression(candidate.node) &&
//     !t.isOptionalCallExpression(candidate.node)
//   )
//     return unresolvedPromise();
//   const input = candidate.node.arguments[0];
//   if (!t.isArrayExpression(input)) return unresolvedPromise();
//   const resolutions = input.elements.map((element) => {
//     if (element === null) return completePromise();
//     if (t.isSpreadElement(element)) return unresolvedPromise();
//     if (isObviouslyNonPromise(element)) return completePromise();
//     return resolvePromiseExpression(
//       element,
//       promiseResolutionContext(candidate, candidateByNode, state),
//     );
//   });
//   return combinePromiseResolutions(resolutions);
// };
//
// const resolvePromiseExpression = (
//   rawNode: t.Node,
//   context: PromiseExpressionResolutionContext,
// ): PromiseResolution => {
//   const { current, candidateByNode, state, seenBindings } = context;
//   const node = unwrapJavaScriptExpression(rawNode).node;
//   const direct = candidateByNode.get(node);
//   if (direct !== undefined && direct.promiseId !== current.promiseId)
//     return { promiseIds: [direct.promiseId], status: "complete" };
//   if (!t.isIdentifier(node)) return unresolvedPromise();
//   const binding = resolveSemanticBindingState(state, node, node.name);
//   if (
//     binding === undefined ||
//     binding.mutable ||
//     binding.initializers.length !== 1 ||
//     seenBindings.has(binding.bindingId)
//   )
//     return unresolvedPromise();
//   const initializer = binding.initializers[0];
//   if (initializer === undefined || initializer.projection.length > 0)
//     return unresolvedPromise();
//   const nestedSeen = new Set(seenBindings);
//   nestedSeen.add(binding.bindingId);
//   return resolvePromiseExpression(initializer.node, {
//     ...context,
//     seenBindings: nestedSeen,
//   });
// };
//
// const promiseResolutionContext = (
//   current: PromiseCandidate,
//   candidateByNode: WeakMap<t.Node, PromiseCandidate>,
//   state: JavaScriptSemanticAnalysisState,
// ): PromiseExpressionResolutionContext => ({
//   current,
//   candidateByNode,
//   state,
//   seenBindings: new Set(),
// });
//
// const combinePromiseResolutions = (
//   resolutions: readonly PromiseResolution[],
// ): PromiseResolution => ({
//   promiseIds: resolutions.flatMap(({ promiseIds }) => promiseIds),
//   status: resolutions.some(({ status }) => status === "unresolved")
//     ? resolutions.some(({ status }) => status === "complete")
//       ? "partial"
//       : "unresolved"
//     : resolutions.some(({ status }) => status === "partial")
//       ? "partial"
//       : "complete",
// });
//
// const completePromise = (): PromiseResolution => ({
//   promiseIds: [],
//   status: "complete",
// });
//
// const unresolvedPromise = (): PromiseResolution => ({
//   promiseIds: [],
//   status: "unresolved",
// });
//
// const isObviouslyNonPromise = (node: t.Node): boolean =>
//   t.isLiteral(node) ||
//   t.isObjectExpression(node) ||
//   t.isFunction(node) ||
//   t.isClassExpression(node);
export const _l = 126;
