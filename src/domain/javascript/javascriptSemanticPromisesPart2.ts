import * as t from "@babel/types";
import { unwrapJavaScriptExpression } from "./javascriptAstValues.js";
import {
  resolveSemanticBindingState,
  type JavaScriptSemanticAnalysisState,
} from "./javascriptSemanticState.js";

// src/domain/javascript/javascriptSemanticPromisesPart2.ts

const resolvePromiseExpression = (
  rawNode: t.Node,
  context: PromiseExpressionResolutionContext,
): PromiseResolution => {
  const { current, candidateByNode, state, seenBindings } = context;
  const node = unwrapJavaScriptExpression(rawNode).node;
  const direct = candidateByNode.get(node);
  if (direct !== undefined && direct.promiseId !== current.promiseId)
    return { promiseIds: [direct.promiseId], status: "complete" };
  if (!t.isIdentifier(node)) return unresolvedPromise();
  const binding = resolveSemanticBindingState(state, node, node.name);
  if (
    binding === undefined ||
    binding.mutable ||
    binding.initializers.length !== 1 ||
    seenBindings.has(binding.bindingId)
  )
    return unresolvedPromise();
  const initializer = binding.initializers[0];
  if (initializer === undefined || initializer.projection.length > 0)
    return unresolvedPromise();
  const nestedSeen = new Set(seenBindings);
  nestedSeen.add(binding.bindingId);
  return resolvePromiseExpression(initializer.node, {
    ...context,
    seenBindings: nestedSeen,
  });
};

const promiseResolutionContext = (
  current: PromiseCandidate,
  candidateByNode: WeakMap<t.Node, PromiseCandidate>,
  state: JavaScriptSemanticAnalysisState,
): PromiseExpressionResolutionContext => ({
  current,
  candidateByNode,
  state,
  seenBindings: new Set(),
});

const combinePromiseResolutions = (
  resolutions: readonly PromiseResolution[],
): PromiseResolution => ({
  promiseIds: resolutions.flatMap(({ promiseIds }) => promiseIds),
  status: resolutions.some(({ status }) => status === "unresolved")
    ? resolutions.some(({ status }) => status === "complete")
      ? "partial"
      : "unresolved"
    : resolutions.some(({ status }) => status === "partial")
      ? "partial"
      : "complete",
});

const completePromise = (): PromiseResolution => ({
  promiseIds: [],
  status: "complete",
});

const unresolvedPromise = (): PromiseResolution => ({
  promiseIds: [],
  status: "unresolved",
});

const isObviouslyNonPromise = (node: t.Node): boolean =>
  t.isLiteral(node) ||
  t.isObjectExpression(node) ||
  t.isFunction(node) ||
  t.isClassExpression(node);
