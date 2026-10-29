export const __stub = 1;
// import * as t from "@babel/types";
//
// import type {
//   JavaScriptSemanticCallable,
//   JavaScriptSemanticPromiseOperation,
// } from "./javascriptSemanticIr.js";
// import { semanticCallableIdForNode } from "./javascriptSemanticProjection.js";
// import { createSemanticCallableIdStack } from "./javascriptSemanticCallableStack.js";
// import {
//   semanticStaticPropertyName,
//   unwrapJavaScriptExpression,
// } from "./javascriptAstValues.js";
// import {
//   resolveSemanticBindingState,
//   semanticResolutionBlocked,
//   type JavaScriptSemanticAnalysisState,
// } from "./javascriptSemanticState.js";
// import { compareUnicodeCodePoints } from "../unicodeCodePointOrder.js";
// import { traverseJavaScriptAst } from "./javascriptSemanticTraversal.js";
// import { range } from "./javascriptStaticAnalysisHelpers.js";
// import {
//   assignedSemanticResultBindings,
//   dataEffectMemberCallee,
//   scalarAssignedResultBinding,
// } from "./javascriptSemanticDataEffectHelpers.js";
//
// type PromiseMethod = JavaScriptSemanticPromiseOperation["method"];
// type PromiseKind = JavaScriptSemanticPromiseOperation["kind"];
//
// interface PromiseCandidate {
//   readonly node: t.Node;
//   readonly kind: PromiseKind;
//   readonly method: PromiseMethod;
//   readonly promiseId: string;
//   readonly ownerCallableId: string | null;
//   readonly ancestors: readonly t.Node[];
// }
//
// interface PromiseResolution {
//   readonly promiseIds: readonly string[];
//   readonly status: JavaScriptSemanticPromiseOperation["sourceResolution"];
// }
//
// interface PromiseOwnership {
//   readonly ownership: JavaScriptSemanticPromiseOperation["ownership"];
//   readonly ownerBindingId: string | null;
//   readonly returnSiteId: string | null;
// }
//
// interface PromiseExpressionResolutionContext {
//   readonly current: PromiseCandidate;
//   readonly candidateByNode: WeakMap<t.Node, PromiseCandidate>;
//   readonly state: JavaScriptSemanticAnalysisState;
//   readonly seenBindings: ReadonlySet<string>;
// }
//
// interface PromiseOwnershipContext {
//   readonly candidate: PromiseCandidate;
//   readonly candidateByNode: WeakMap<t.Node, PromiseCandidate>;
//   readonly state: JavaScriptSemanticAnalysisState;
//   readonly returnSiteIdFor: (
//     callableId: string | null,
//     location: JavaScriptSemanticPromiseOperation["location"],
//   ) => string | null;
// }
//
// /** Recover explicit Promise construction, chaining, aggregation, and ownership. */
// export const collectJavaScriptSemanticPromises = (
//   program: t.Program,
//   state: JavaScriptSemanticAnalysisState,
//   callables: readonly JavaScriptSemanticCallable[],
// ): JavaScriptSemanticPromiseOperation[] => {
//   const candidates = collectCandidates(program, state, callables);
//   const returnSiteIdFor = createReturnSiteLookup(callables);
//   const candidateByNode = new WeakMap<t.Node, PromiseCandidate>();
//   for (const candidate of candidates)
//     candidateByNode.set(candidate.node, candidate);
//   return candidates.map((candidate) => {
//     const ownership = promiseOwnership(
//       candidate,
//       candidateByNode,
//       state,
//       returnSiteIdFor,
//     );
//     const sources = promiseSources(candidate, candidateByNode, state);
//     return {
//       promiseId: candidate.promiseId,
//       kind: candidate.kind,
//       method: candidate.method,
//       location: range(candidate.node),
//       ownerCallableId: candidate.ownerCallableId,
//       ...ownership,
//       sourcePromiseIds: [...new Set(sources.promiseIds)].sort(
//         compareUnicodeCodePoints,
//       ),
//       sourceResolution: sources.status,
//     };
//   });
// };
//
// const collectCandidates = (
//   program: t.Program,
//   state: JavaScriptSemanticAnalysisState,
//   callables: readonly JavaScriptSemanticCallable[],
// ): PromiseCandidate[] => {
//   const output: PromiseCandidate[] = [];
//   const admittedCallables = new Set(
//     callables.map(({ callableId }) => callableId),
//   );
//   const callableStack = createSemanticCallableIdStack(admittedCallables);
//   const ancestors: t.Node[] = [];
//   traverseJavaScriptAst(program, {
//     enter: (node, parent) => {
//       callableStack.enter(node, parent);
//       const details = promiseCandidateDetails(node, state);
//       if (details !== null) {
//         output.push({
//           node,
//           ...details,
//           promiseId: semanticPromiseId(details.kind, node),
//           ownerCallableId: callableStack.callables.at(-1) ?? null,
//           ancestors: [...ancestors],
//         });
//       }
//       ancestors.push(node);
//     },
//     exit: (node) => {
//       ancestors.pop();
export const _l = 128;
