import * as t from "@babel/types";

import type {
  JavaScriptSemanticBoundaryOperation,
  JavaScriptSemanticCallable,
  JavaScriptSemanticConfigurationOperation,
  JavaScriptSemanticRequestOperation,
} from "./javascriptSemanticIr.js";
import { compareUnicodeCodePoints } from "../unicodeCodePointOrder.js";
import {
  readExactJavaScriptLiteral,
  semanticStaticPropertyKey,
  semanticStaticPropertyName,
  unwrapJavaScriptExpression,
} from "./javascriptAstValues.js";
import {
  recordSemanticValueLimit,
  resolveSemanticBindingState,
  semanticResolutionBlocked,
  type JavaScriptSemanticAnalysisState,
} from "./javascriptSemanticState.js";
import {
  builtinDataEffectMethod as builtinMethod,
  dataEffectArgumentBindingId as argumentBindingId,
  dataEffectLiteralString as literalString,
  dataEffectMemberCallee as memberCallee,
  isSemanticProcessObject as isProcessObject,
  outerDataEffectBinding as outerAssignedBinding,
  assignedSemanticResultBindings,
  semanticProjectedBindingFacts,
  traverseDataEffects as traverseWithContext,
  type DataEffectTraversalContext as TraversalContext,
} from "./javascriptSemanticDataEffectHelpers.js";
import { range } from "./javascriptStaticAnalysisHelpers.js";
import { semanticPrimitiveSet } from "./javascriptSemanticPrimitives.js";
import type { JavaScriptSemanticValue } from "./javascriptSemanticValueTypes.js";

const collectRequests = (
  program: t.Program,
  context: TraversalContext,
): RequestCandidate[] => {
  const output: RequestCandidate[] = [];
  traverseWithContext(program, context, (node) => {
    if (
      !t.isCallExpression(node) &&
      !t.isOptionalCallExpression(node) &&
      !t.isNewExpression(node)
    )
      return;
    const method = requestMethod(node, context.state);
    if (method === null) return;
    const endpoint = requestEndpoint(node);
    output.push({
      node,
      operation: {
        requestId: `request:${String(node.start ?? -1)}:${String(node.end ?? -1)}`,
        kind: "request",
        method,
        location: range(node),
        ownerCallableId: context.callableStack.at(-1) ?? null,
        resultBindingId: outerAssignedBinding(node, context),
        projectedResultBindings: semanticProjectedBindingFacts(
          assignedSemanticResultBindings(
            node,
            context.ancestors,
            context.state,
          ).filter(({ projectionPath }) => projectionPath.length > 0),
        ),
        linkedRequestIds: [],
        endpoint,
        fields: requestFields(node, method, context.state),
        resolution: endpoint === null ? "partial" : "complete",
      },
    });
  });
  return output;
};

const collectResponseConsumers = (
  program: t.Program,
  context: TraversalContext,
  requests: readonly RequestCandidate[],
): JavaScriptSemanticRequestOperation[] => {
  const requestsByBinding = new Map<string, RequestCandidate[]>();
  for (const request of requests) {
    const bindingIds = [
      ...(request.operation.resultBindingId === null
        ? []
        : [request.operation.resultBindingId]),
      ...request.operation.projectedResultBindings.map(
        ({ bindingId }) => bindingId,
      ),
    ];
    for (const bindingId of bindingIds) {
      const existing = requestsByBinding.get(bindingId) ?? [];
      existing.push(request);
      requestsByBinding.set(bindingId, existing);
    }
  }
  const output: JavaScriptSemanticRequestOperation[] = [];
  traverseWithContext(program, context, (node) => {
    if (!t.isCallExpression(node) && !t.isOptionalCallExpression(node)) return;
    const member = memberCallee(node);
    if (member === null || !t.isIdentifier(member.object)) return;
    const method = semanticStaticPropertyName(member.property, member.computed);
    if (method !== "json" && method !== "text" && method !== "arrayBuffer")
      return;
    const binding = resolveSemanticBindingState(
      context.state,
      member.object,
      member.object.name,
    );
    const linked =
      binding === undefined
        ? []
        : (requestsByBinding.get(binding.bindingId) ?? []);
    if (linked.length === 0) return;
    // A consumer of exactly one request through its own result binding
    // reads that request's response, so it keeps the request's endpoint.
    const uniqueRequest =
      linked.length === 1 &&
      !linked[0]?.operation.projectedResultBindings.some(
        ({ bindingId }) => bindingId === binding?.bindingId,
      )
        ? linked[0]
        : undefined;
    // Any other write (assignment, update, loop or destructuring target) can
    // replace the response before this read, so its endpoint stays unknown.
    const soleWrite = binding?.initializers.length === 1;
    output.push({
      requestId: `response:${String(node.start ?? -1)}:${String(node.end ?? -1)}`,
      kind: "response-consumer",
      method,
      location: range(node),
      ownerCallableId: context.callableStack.at(-1) ?? null,
      resultBindingId: outerAssignedBinding(node, context),
      projectedResultBindings: semanticProjectedBindingFacts(
        assignedSemanticResultBindings(
          node,
          context.ancestors,
          context.state,
        ).filter(({ projectionPath }) => projectionPath.length > 0),
      ),
      linkedRequestIds: linked
        .map(({ operation }) => operation.requestId)
        .sort(compareUnicodeCodePoints),
      endpoint: soleWrite ? (uniqueRequest?.operation.endpoint ?? null) : null,
      fields: [],
      resolution: uniqueRequest === undefined ? "partial" : "complete",
    });
  });
  return output;
};

const collectBoundaries = (
  program: t.Program,
  context: TraversalContext,
): JavaScriptSemanticBoundaryOperation[] => {
  const output: JavaScriptSemanticBoundaryOperation[] = [];
  traverseWithContext(program, context, (node) => {
    if (!t.isCallExpression(node) && !t.isOptionalCallExpression(node)) return;
    const details = boundaryDetails(node, context.state);
    if (details === null) return;
    output.push({
      boundaryId: `boundary:${details.kind}:${String(node.start ?? -1)}:${String(node.end ?? -1)}`,
      kind: details.kind,
      method: details.method,
      location: range(node),
      ownerCallableId: context.callableStack.at(-1) ?? null,
      sourceBindingId: argumentBindingId(node.arguments[0], context.state),
      resultBindingId: outerAssignedBinding(node, context),
      resolution: details.resolution,
    });
  });
  return output;
};

const boundaryDetails = (
  node: t.CallExpression | t.OptionalCallExpression,
  state: JavaScriptSemanticAnalysisState,
): {
  readonly kind: JavaScriptSemanticBoundaryOperation["kind"];
  readonly method: string;
  readonly resolution: "complete" | "partial";
} | null => {
  if (t.isIdentifier(node.callee)) {
    const name = node.callee.name;
    const unbound =
      resolveSemanticBindingState(state, node.callee, name) === undefined &&
      !semanticResolutionBlocked(state, node.callee, name);
    if (
      unbound &&
      ["String", "Number", "Boolean", "parseInt", "parseFloat"].includes(name)
    )
      return { kind: "coerce", method: name, resolution: "complete" };
  }
  const member = memberCallee(node);
  if (member === null) return null;
  const method = semanticStaticPropertyName(member.property, member.computed);
  if (
    method === "parse" &&
    t.isIdentifier(member.object, { name: "JSON" }) &&
    resolveSemanticBindingState(state, member.object, "JSON") === undefined &&
    !semanticResolutionBlocked(state, member.object, "JSON")
  )
    return { kind: "parse", method: "JSON.parse", resolution: "complete" };
  if (method === "parse" || method === "safeParse")
    return { kind: "parse", method, resolution: "partial" };
  if (method === "validate" || method === "assert" || method === "is")
    return { kind: "validate", method, resolution: "partial" };
  return null;
};

const requestMethod = (
  node: t.CallExpression | t.OptionalCallExpression | t.NewExpression,
  state: JavaScriptSemanticAnalysisState,
): JavaScriptSemanticRequestOperation["method"] | null => {
  if (t.isIdentifier(node.callee)) {
    const name = node.callee.name;
    const unbound =
      resolveSemanticBindingState(state, node.callee, name) === undefined &&
      !semanticResolutionBlocked(state, node.callee, name);
    if (!t.isNewExpression(node) && unbound && name === "fetch") return "fetch";
    if (t.isNewExpression(node) && unbound && name === "WebSocket")
      return "WebSocket";
  }
  const method = builtinMethod(node.callee, state, [
    "http",
    "https",
    "node:http",
    "node:https",
  ]);
  return method === "request" || method === "get" ? method : null;
};

const requestFields = (
  node: t.CallExpression | t.OptionalCallExpression | t.NewExpression,
  method: JavaScriptSemanticRequestOperation["method"],
  state: JavaScriptSemanticAnalysisState,
): JavaScriptSemanticRequestOperation["fields"] => {
  const candidate =
    method === "fetch" || method === "WebSocket"
      ? node.arguments[1]
      : t.isObjectExpression(node.arguments[0])
        ? node.arguments[0]
        : node.arguments[1];
  if (!t.isObjectExpression(candidate)) return [];
  return candidate.properties.flatMap((property) => {
    if (!t.isObjectProperty(property)) return [];
    // `{[key]: 1}` sends no knowable field name; reporting `key` would invent
    // a request field that may not exist.
    const name = semanticStaticPropertyKey(property.key, property.computed);
    if (name === null) return [];
    return [
      {
        name,
        sourceBindingId: t.isIdentifier(property.value)
          ? (resolveSemanticBindingState(
              state,
              property.value,
              property.value.name,
            )?.bindingId ?? null)
          : null,
      },
    ];
  });
};

const requestEndpoint = (
  node: t.CallExpression | t.OptionalCallExpression | t.NewExpression,
): string | null =>
  t.isObjectExpression(node.arguments[0])
    ? null
    : literalString(node.arguments[0]);
