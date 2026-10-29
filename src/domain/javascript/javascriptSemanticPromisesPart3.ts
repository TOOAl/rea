export const __stub = 1;
//         returnSiteIdFor,
//       )
//     : "boundary";
// };
//
// const isUnmodeledCall = (
//   node: t.Node,
//   candidate: PromiseCandidate | undefined,
// ): boolean =>
//   candidate === undefined &&
//   (t.isCallExpression(node) ||
//     t.isOptionalCallExpression(node) ||
//     t.isNewExpression(node));
//
// const assignedPromiseBinding = (
//   ancestor: t.Node,
//   candidate: t.Node,
//   state: JavaScriptSemanticAnalysisState,
// ): string | null | undefined => {
//   if (!t.isVariableDeclarator(ancestor) && !t.isAssignmentExpression(ancestor))
//     return undefined;
//   const source = t.isVariableDeclarator(ancestor)
//     ? ancestor.init
//     : ancestor.right;
//   if (source == null) return undefined;
//   if (unwrapJavaScriptExpression(source).node !== candidate) return undefined;
//   return scalarAssignedResultBinding(
//     assignedSemanticResultBindings(source, [ancestor], state),
//   );
// };
//
// const returnedPromiseOwnership = (
//   callableId: string | null,
//   location: JavaScriptSemanticPromiseOperation["location"],
//   returnSiteIdFor: PromiseOwnershipContext["returnSiteIdFor"],
// ): PromiseOwnership => ({
//   ownership: "returned",
//   ownerBindingId: null,
//   returnSiteId: returnSiteIdFor(callableId, location),
// });
//
// const outerConsumesCandidate = (
//   outer: PromiseCandidate,
//   candidate: PromiseCandidate,
// ): boolean => {
//   if (
//     outer.kind === "chain" &&
//     (t.isCallExpression(outer.node) || t.isOptionalCallExpression(outer.node))
//   ) {
//     const member = dataEffectMemberCallee(outer.node);
//     return (
//       member !== null &&
//       unwrapJavaScriptExpression(member.object).node === candidate.node
//     );
//   }
//   if (
//     outer.kind === "aggregate" &&
//     (t.isCallExpression(outer.node) || t.isOptionalCallExpression(outer.node))
//   ) {
//     const input = outer.node.arguments[0];
//     return (
//       t.isArrayExpression(input) &&
//       input.elements.some(
//         (element) =>
//           element !== null &&
//           !t.isSpreadElement(element) &&
//           unwrapJavaScriptExpression(element).node === candidate.node,
//       )
//     );
//   }
//   return false;
// };
//
// const emptyOwnership = (
//   ownership: JavaScriptSemanticPromiseOperation["ownership"],
// ): PromiseOwnership => ({
//   ownership,
//   ownerBindingId: null,
//   returnSiteId: null,
// });
//
// const indexReturnSites = (
//   callable: JavaScriptSemanticCallable,
// ): ReadonlyMap<string, string> => {
//   const output = new Map<string, string>();
//   for (const site of callable.returnSites) {
//     const key = returnSiteKey(site.location);
//     if (!output.has(key)) output.set(key, site.returnSiteId);
//   }
//   return output;
// };
//
// const createReturnSiteLookup = (
//   callables: readonly JavaScriptSemanticCallable[],
// ): PromiseOwnershipContext["returnSiteIdFor"] => {
//   let callablesById:
//     | ReadonlyMap<string, JavaScriptSemanticCallable>
//     | undefined;
//   let returnSiteIdsByCallable:
//     | Map<string, ReadonlyMap<string, string>>
//     | undefined;
//   return (callableId, location) => {
//     if (callableId === null) return null;
//     callablesById ??= indexCallablesById(callables);
//     const callable = callablesById.get(callableId);
//     if (callable === undefined) return null;
//     returnSiteIdsByCallable ??= new Map();
//     let returnSiteIds = returnSiteIdsByCallable.get(callableId);
//     if (returnSiteIds === undefined) {
//       returnSiteIds = indexReturnSites(callable);
//       returnSiteIdsByCallable.set(callableId, returnSiteIds);
//     }
//     return returnSiteIds.get(returnSiteKey(location)) ?? null;
//   };
// };
//
// const indexCallablesById = (
//   callables: readonly JavaScriptSemanticCallable[],
// ): ReadonlyMap<string, JavaScriptSemanticCallable> => {
//   const output = new Map<string, JavaScriptSemanticCallable>();
//   for (const callable of callables) {
//     if (output.has(callable.callableId)) continue;
//     output.set(callable.callableId, callable);
//   }
//   return output;
// };
//
// const returnSiteKey = (
export const _l = 128;
