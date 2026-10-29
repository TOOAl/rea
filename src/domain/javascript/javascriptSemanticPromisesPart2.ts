export const __stub = 1;
//       callableStack.exit(node);
//     },
//   });
//   return output;
// };
//
// const promiseCandidateDetails = (
//   node: t.Node,
//   state: JavaScriptSemanticAnalysisState,
// ): Pick<PromiseCandidate, "kind" | "method"> | null => {
//   if (
//     t.isNewExpression(node) &&
//     t.isIdentifier(node.callee, { name: "Promise" }) &&
//     isUnshadowedGlobalPromise(node.callee, state)
//   )
//     return { kind: "constructor", method: "new" };
//   if (t.isCallExpression(node) || t.isOptionalCallExpression(node)) {
//     const member = dataEffectMemberCallee(node);
//     if (member === null) return null;
//     const method = semanticStaticPropertyName(member.property, member.computed);
//     if (
//       t.isIdentifier(member.object, { name: "Promise" }) &&
//       isUnshadowedGlobalPromise(member.object, state)
//     ) {
//       if (method === "all" || method === "allSettled")
//         return { kind: "aggregate", method };
//       if (method === "resolve" || method === "reject")
//         return { kind: "static", method };
//     }
//     if (method === "then" || method === "catch" || method === "finally")
//       return { kind: "chain", method };
//   }
//   if (t.isAwaitExpression(node) && !isPromiseProducer(node.argument, state))
//     return { kind: "awaited-expression", method: "await" };
//   return null;
// };
//
// const isUnshadowedGlobalPromise = (
//   node: t.Identifier,
//   state: JavaScriptSemanticAnalysisState,
// ): boolean =>
//   resolveSemanticBindingState(state, node, "Promise") === undefined &&
//   !semanticResolutionBlocked(state, node, "Promise");
//
// const isPromiseProducer = (
//   node: t.Node,
//   state: JavaScriptSemanticAnalysisState,
// ): boolean =>
//   promiseCandidateDetails(unwrapJavaScriptExpression(node).node, state) !==
//   null;
//
// const semanticPromiseId = (kind: PromiseKind, node: t.Node): string =>
//   `promise:${kind}:${String(node.start ?? -1)}:${String(node.end ?? -1)}`;
//
// const promiseOwnership = (
//   candidate: PromiseCandidate,
//   candidateByNode: WeakMap<t.Node, PromiseCandidate>,
//   state: JavaScriptSemanticAnalysisState,
//   returnSiteIdFor: PromiseOwnershipContext["returnSiteIdFor"],
// ): PromiseOwnership => {
//   if (candidate.kind === "awaited-expression") return emptyOwnership("awaited");
//   const context: PromiseOwnershipContext = {
//     candidate,
//     candidateByNode,
//     state,
//     returnSiteIdFor,
//   };
//   for (let index = candidate.ancestors.length - 1; index >= 0; index -= 1) {
//     const ancestor = candidate.ancestors[index];
//     if (ancestor === undefined) continue;
//     const ownership = ownershipAtAncestor(ancestor, context);
//     if (ownership === "boundary") break;
//     if (ownership !== null) return ownership;
//   }
//   return emptyOwnership("unknown");
// };
//
// const ownershipAtAncestor = (
//   ancestor: t.Node,
//   context: PromiseOwnershipContext,
// ): PromiseOwnership | "boundary" | null => {
//   const { candidate, candidateByNode, state, returnSiteIdFor } = context;
//   if (t.isAwaitExpression(ancestor))
//     return unwrapJavaScriptExpression(ancestor.argument).node === candidate.node
//       ? emptyOwnership("awaited")
//       : "boundary";
//   const outer = candidateByNode.get(ancestor);
//   if (
//     outer !== undefined &&
//     outer.ownerCallableId === candidate.ownerCallableId &&
//     outerConsumesCandidate(outer, candidate)
//   )
//     return outer.kind === "chain"
//       ? emptyOwnership("chained")
//       : emptyOwnership("aggregated");
//   if (isUnmodeledCall(ancestor, outer)) return "boundary";
//   const assigned = assignedPromiseBinding(ancestor, candidate.node, state);
//   if (assigned !== undefined)
//     return {
//       ownership: "assigned",
//       ownerBindingId: assigned,
//       returnSiteId: null,
//     };
//   if (t.isReturnStatement(ancestor)) {
//     if (
//       ancestor.argument == null ||
//       unwrapJavaScriptExpression(ancestor.argument).node !== candidate.node
//     )
//       return "boundary";
//     return returnedPromiseOwnership(
//       candidate.ownerCallableId,
//       range(ancestor),
//       returnSiteIdFor,
//     );
//   }
//   if (t.isExpressionStatement(ancestor))
//     return unwrapJavaScriptExpression(ancestor.expression).node ===
//       candidate.node
//       ? emptyOwnership("detached")
//       : "boundary";
//   const callableId = semanticCallableIdForNode(ancestor);
//   if (callableId === null || callableId !== candidate.ownerCallableId)
//     return null;
//   return t.isArrowFunctionExpression(ancestor) &&
//     unwrapJavaScriptExpression(ancestor.body).node === candidate.node
//     ? returnedPromiseOwnership(
//         candidate.ownerCallableId,
//         range(ancestor.body),
export const _l = 128;
