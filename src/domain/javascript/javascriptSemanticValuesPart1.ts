export const __stub = 1;
// import * as t from "@babel/types";
//
// import {
//   SemanticDependencyProofs,
//   type SemanticDependencyProof,
// } from "./javascriptSemanticDependencies.js";
//
// import {
//   semanticCapturePosition,
//   semanticEscapeFollowsCapture,
//   semanticBindingPrecedesCapture,
//   semanticReadInitializers,
// } from "./javascriptSemanticMutationInitializers.js";
//
// import { semanticSlotAtPath } from "./javascriptSemanticSlots.js";
//
// import {
//   invalidateSemanticEscapedPath,
//   invalidateSemanticMutationPaths,
// } from "./javascriptSemanticMutationValues.js";
//
// import type { JavaScriptBindingProvenance } from "./javascriptSemanticIr.js";
// import type {
//   JavaScriptSemanticProperty,
//   JavaScriptSemanticResourceLimit,
//   JavaScriptSemanticValue,
// } from "./javascriptSemanticValueTypes.js";
// import {
//   recordSemanticValueLimit,
//   resolveSemanticBindingState,
//   type JavaScriptSemanticAnalysisState,
//   type JavaScriptSemanticBindingState,
// } from "./javascriptSemanticState.js";
// import { semanticRequireOrigin } from "./javascriptSemanticRequireOrigin.js";
// import { compareUnicodeCodePoints } from "../unicodeCodePointOrder.js";
// import {
//   readExactJavaScriptLiteral,
//   semanticStaticPropertyKey,
//   unwrapJavaScriptExpression,
// } from "./javascriptAstValues.js";
// import {
//   semanticAmbiguousProvenance,
//   semanticLocalProvenance,
//   semanticOriginsProvenance,
//   semanticUnresolvedProvenance,
//   uniqueSemanticOrigins,
// } from "./javascriptSemanticProvenance.js";
// import {
//   semanticPrimitiveCandidates as primitiveCandidates,
//   semanticPrimitiveSet as primitiveSet,
// } from "./javascriptSemanticPrimitives.js";
// import {
//   SEMANTIC_EXPRESSION_DEPTH_LIMIT,
//   SEMANTIC_PRIMITIVE_CANDIDATE_LIMIT,
//   exceedsSemanticPrimitiveAdditionByteBudget,
//   exceedsSemanticTemplateByteBudget,
//   semanticResourceLimitUnknown,
//   semanticResourceLimitReason,
// } from "./javascriptSemanticResourceLimits.js";
//
// interface MemoizedEvaluation<T> {
//   readonly value: T;
//   readonly dependencies: SemanticDependencyProof;
// }
//
// /** Provenance lives for one query; live values belong to the effects-aware state. */
// interface EvaluationMemo {
//   readonly provenance: Map<
//     string,
//     Map<number, MemoizedEvaluation<JavaScriptBindingProvenance>>
//   >;
//   readonly dependencyFrames: { proof: SemanticDependencyProof }[];
//   readonly dependencies: SemanticDependencyProofs;
// }
//
// // Indexing owns stable binding identities; effects invalidate values, not this
// // identity-only layout. No query result or dependency closure is retained here.
// const dependencyProofsByState = new WeakMap<
//   JavaScriptSemanticAnalysisState,
//   SemanticDependencyProofs
// >();
//
// const createEvaluationMemo = (
//   state: JavaScriptSemanticAnalysisState,
// ): EvaluationMemo => {
//   let dependencies = dependencyProofsByState.get(state);
//   if (dependencies === undefined) {
//     dependencies = new SemanticDependencyProofs(state.bindingsById.keys());
//     dependencyProofsByState.set(state, dependencies);
//   }
//   return { provenance: new Map(), dependencyFrames: [], dependencies };
// };
//
// interface EvaluationContext {
//   readonly state: JavaScriptSemanticAnalysisState;
//   /** Bindings under evaluation, by their position on the active stack. */
//   readonly bindings: Map<string, number>;
//   readonly expressionDepth: number;
//   readonly capturePoint?: t.Node;
//   readonly primitiveBindingValues: Map<string, JavaScriptSemanticValue>;
//   readonly dependence: EvaluationDependence;
//   readonly memo: EvaluationMemo;
// }
//
// /**
//  * How far up the active stack the value being evaluated depends on its
//  * caller. An alias cycle depends on the position of its head; the expression
//  * depth budget depends on every caller. A binding whose value depends only on
//  * positions pushed after its own evaluates to that value from any caller
//  * with at least as much of the depth budget left.
//  */
// interface EvaluationDependence {
//   lowest: number;
// }
//
// const CALLER_INDEPENDENT = Number.POSITIVE_INFINITY;
// const EVERY_CALLER = -1;
//
// /** A value no caller changes, and the deepest evaluation known to yield it. */
// interface CallerIndependentBindingValue extends MemoizedEvaluation<JavaScriptSemanticValue> {
//   readonly expressionDepth: number;
// }
//
// const callerIndependentBindingValuesByState = new WeakMap<
//   JavaScriptSemanticAnalysisState,
//   Map<string, CallerIndependentBindingValue>
// >();
//
// const primitiveBindingValuesByState = new WeakMap<
//   JavaScriptSemanticAnalysisState,
//   Map<string, JavaScriptSemanticValue>
// >();
//
// const primitiveExpressionValuesByState = new WeakMap<
//   JavaScriptSemanticAnalysisState,
//   WeakMap<t.Node, JavaScriptSemanticValue>
// >();
//
// const capturedBindingValuesByState = new WeakMap<
//   JavaScriptSemanticAnalysisState,
//   WeakMap<t.Node, Map<string, JavaScriptSemanticValue>>
// >();
//
// /** Discard every state-owned value derived before the effects boundary changed. */
// export const clearSemanticValueCaches = (
//   state: JavaScriptSemanticAnalysisState,
// ): void => {
//   primitiveBindingValuesByState.delete(state);
//   capturedBindingValuesByState.delete(state);
//   primitiveExpressionValuesByState.delete(state);
//   callerIndependentBindingValuesByState.delete(state);
// };
//
// const callerIndependentBindingValuesFor = (
//   state: JavaScriptSemanticAnalysisState,
// ): Map<string, CallerIndependentBindingValue> => {
//   const existing = callerIndependentBindingValuesByState.get(state);
//   if (existing !== undefined) return existing;
//   const values = new Map<string, CallerIndependentBindingValue>();
//   callerIndependentBindingValuesByState.set(state, values);
//   return values;
// };
//
// const primitiveBindingValuesFor = (
//   state: JavaScriptSemanticAnalysisState,
// ): Map<string, JavaScriptSemanticValue> => {
//   const existing = primitiveBindingValuesByState.get(state);
//   if (existing !== undefined) return existing;
//   const values = new Map<string, JavaScriptSemanticValue>();
//   primitiveBindingValuesByState.set(state, values);
//   return values;
// };
//
// // Cap expression recursion independently from graph nodes and primitive unions.
// const isSemanticResourceLimit = (
//   value: JavaScriptSemanticValue,
// ): value is Extract<
//   JavaScriptSemanticValue,
//   { readonly status: "unknown" | "ambiguous" | "cycle" }
// > & { readonly resourceLimit: JavaScriptSemanticResourceLimit } =>
//   value.status === "unknown" && value.resourceLimit !== undefined;
//
// /** Evaluate one binding in the bounded constant-value lattice. */
// export const evaluateSemanticBinding = (
//   binding: JavaScriptSemanticBindingState,
//   state: JavaScriptSemanticAnalysisState,
// ): JavaScriptSemanticValue =>
//   evaluateBinding(binding, {
//     state,
//     bindings: new Map(),
//     expressionDepth: 0,
//     primitiveBindingValues: primitiveBindingValuesFor(state),
//     dependence: { lowest: CALLER_INDEPENDENT },
//     memo: createEvaluationMemo(state),
//   });
//
// /** Evaluate an inert expression, optionally at an earlier reference capture. */
// export const evaluateSemanticExpression = (
//   node: t.Node,
//   state: JavaScriptSemanticAnalysisState,
//   capturePoint?: t.Node,
// ): JavaScriptSemanticValue => {
//   const context: EvaluationContext = {
//     state,
//     bindings: new Map(),
//     expressionDepth: 0,
//     primitiveBindingValues: primitiveBindingValuesFor(state),
//     dependence: { lowest: CALLER_INDEPENDENT },
//     memo: createEvaluationMemo(state),
//   };
//   return evaluateExpression(
//     node,
//     capturePoint === undefined
//       ? context
//       : (captureContextAt(capturePoint, context) ?? context),
//   );
// };
//
// /** Follow module provenance through destructuring, members, and aliases. */
// export const evaluateSemanticProvenance = (
//   binding: JavaScriptSemanticBindingState,
//   state: JavaScriptSemanticAnalysisState,
// ): JavaScriptBindingProvenance =>
//   provenanceForBinding(binding, {
//     state,
//     bindings: new Map(),
//     expressionDepth: 0,
//     primitiveBindingValues: primitiveBindingValuesFor(state),
//     dependence: { lowest: CALLER_INDEPENDENT },
//     memo: createEvaluationMemo(state),
//   });
//
// /** Follow a namespace binding as it was read at a specific source position. */
// export const evaluateSemanticProvenanceAtRead = (
//   binding: JavaScriptSemanticBindingState,
//   read: t.Identifier,
//   state: JavaScriptSemanticAnalysisState,
// ): JavaScriptBindingProvenance =>
//   provenanceForBindingAtRead(binding, read, {
//     state,
//     bindings: new Map(),
//     expressionDepth: 0,
//     primitiveBindingValues: primitiveBindingValuesFor(state),
//     dependence: { lowest: CALLER_INDEPENDENT },
//     memo: createEvaluationMemo(state),
//   });
//
// const readMemoizedEvaluation = <T>(
//   entry: MemoizedEvaluation<T> | undefined,
//   context: EvaluationContext,
// ): T | undefined => {
//   if (
//     entry === undefined ||
//     context.memo.dependencies.intersects(entry.dependencies, context.bindings)
//   )
//     return undefined;
//   retainDependencyProof(entry.dependencies, context);
//   return entry.value;
// };
//
// const retainDependencyProof = (
//   proof: SemanticDependencyProof,
//   context: EvaluationContext,
// ): void => {
//   const parent = context.memo.dependencyFrames.at(-1);
//   if (parent !== undefined)
//     parent.proof = context.memo.dependencies.union(parent.proof, proof);
// };
//
// const recordBindingDependency = (
//   binding: JavaScriptSemanticBindingState,
//   context: EvaluationContext,
// ): void =>
//   retainDependencyProof(
//     context.memo.dependencies.binding(binding.bindingId),
//     context,
//   );
//
// const collectEvaluationDependencies = <T>(
//   binding: JavaScriptSemanticBindingState,
//   context: EvaluationContext,
//   evaluate: () => T,
// ): MemoizedEvaluation<T> => {
//   const frame = { proof: context.memo.dependencies.binding(binding.bindingId) };
//   context.memo.dependencyFrames.push(frame);
//   try {
//     return { value: evaluate(), dependencies: frame.proof };
//   } finally {
export const _l = 288;
