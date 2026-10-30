import * as t from "@babel/types";

import type {
  JavaScriptSemanticChildProcessInteraction,
  JavaScriptSemanticChildProcessSpawn,
} from "./javascriptSemanticIr.js";
import {
  semanticStaticPropertyName,
  unwrapJavaScriptExpression,
} from "./javascriptAstValues.js";
import {
  isUnshadowedGlobal,
  resolveSemanticBindingState,
  type JavaScriptSemanticAnalysisState,
  type JavaScriptSemanticBindingState,
} from "./javascriptSemanticState.js";
import { compareUnicodeCodePoints } from "../unicodeCodePointOrder.js";
import { range } from "./javascriptStaticAnalysisHelpers.js";
import {
  builtinDataEffectMethod,
  dataEffectLiteralString,
  dataEffectMemberCallee,
  scalarAssignedResultBinding,
} from "./javascriptSemanticDataEffectHelpers.js";

const childInteraction = (
  node: t.CallExpression | t.OptionalCallExpression,
  ownerCallableId: string | null,
  context: ChildInteractionContext,
): JavaScriptSemanticChildProcessInteraction | null => {
  const { state, spawnByNode, spawnsByBinding } = context;
  const member = dataEffectMemberCallee(node);
  if (member === null) return null;
  const method = semanticStaticPropertyName(member.property, member.computed);
  const binding = objectBinding(member.object, state);
  const linked = resolveChildCandidates(
    member.object,
    binding,
    spawnByNode,
    spawnsByBinding,
  );
  if (linked.length === 0) return null;
  const classification = classifyInteraction(method, node.arguments[0]);
  if (classification === null) return null;
  const { kind, interactionMethod, eventName } = classification;
  const listener = node.arguments[1];
  return {
    interactionId: `child:${kind}:${String(node.start ?? -1)}:${String(node.end ?? -1)}`,
    kind,
    method: interactionMethod,
    location: range(node),
    ownerCallableId,
    processBindingId: binding?.bindingId ?? null,
    linkedProcessIds: linked
      .map((candidate) => spawnId(candidate))
      .sort(compareUnicodeCodePoints),
    eventName: kind === "listener" ? eventName : null,
    signalName:
      kind === "signal" ? killSignalName(node.arguments, state) : null,
    listenerLocation:
      kind === "listener" && t.isNode(listener) ? range(listener) : null,
    resolution:
      linked.length === 1 &&
      !linked[0]?.projectedResultBindings.some(
        ({ bindingId }) => bindingId === binding?.bindingId,
      )
        ? "complete"
        : "partial",
  };
};

// Only an omitted argument or the unshadowed global undefined selects the
// SIGTERM default; an unresolved argument leaves the signal unknown.
const killSignalName = (
  args: t.CallExpression["arguments"],
  state: JavaScriptSemanticAnalysisState,
): string | null => {
  const [signal] = args;
  if (signal === undefined) return "SIGTERM";
  const expression = unwrapJavaScriptExpression(signal).node;
  if (
    t.isUnaryExpression(expression, { operator: "void" }) ||
    isUnshadowedGlobal(expression, state, "undefined")
  )
    return "SIGTERM";
  return dataEffectLiteralString(signal);
};

const classifyInteraction = (
  method: string,
  argument:
    | t.Expression
    | t.SpreadElement
    | t.JSXNamespacedName
    | t.ArgumentPlaceholder
    | undefined,
): {
  readonly kind: JavaScriptSemanticChildProcessInteraction["kind"];
  readonly interactionMethod: JavaScriptSemanticChildProcessInteraction["method"];
  readonly eventName: "exit" | "error" | null;
} | null => {
  if (method === "kill")
    return { kind: "signal", interactionMethod: "kill", eventName: null };
  const listenerMethod = CHILD_LISTENER_METHODS.find(
    (candidate) => candidate === method,
  );
  const eventName = dataEffectLiteralString(argument);
  return listenerMethod !== undefined &&
    (eventName === "exit" || eventName === "error")
    ? { kind: "listener", interactionMethod: listenerMethod, eventName }
    : null;
};

const childProcessMethod = (
  callee: t.Node,
  state: JavaScriptSemanticAnalysisState,
): JavaScriptSemanticChildProcessSpawn["method"] | null => {
  const method = builtinDataEffectMethod(callee, state, [
    "child_process",
    "node:child_process",
  ]);
  return (
    CHILD_PROCESS_METHODS.find((candidate) => candidate === method) ?? null
  );
};

const resolveChildCandidates = (
  node: t.Node,
  binding: JavaScriptSemanticBindingState | undefined,
  spawnByNode: WeakMap<t.Node, SpawnCandidate>,
  spawnsByBinding: ReadonlyMap<string, readonly SpawnCandidate[]>,
): readonly SpawnCandidate[] => {
  const direct = spawnByNode.get(node);
  if (direct !== undefined) return [direct];
  return binding === undefined
    ? []
    : (spawnsByBinding.get(binding.bindingId) ?? []);
};
const spawnOptions = (candidate: SpawnCandidate): t.ObjectExpression | null => {
  const args = candidate.node.arguments;

  const value =
    candidate.method === "exec"
      ? args[1]
      : t.isObjectExpression(args[1])
        ? args[1]
        : args[2];

  return t.isObjectExpression(value) ? value : null;
};
const spawnArgvCount = (candidate: SpawnCandidate): number | null => {
  if (candidate.method === "exec") return null;
  const args = candidate.node.arguments[1];
  return t.isArrayExpression(args) &&
    !args.elements.some((element) => t.isSpreadElement(element))
    ? args.elements.length
    : null;
};

const objectHasProperty = (
  object: t.ObjectExpression | null,
  name: string,
): boolean => objectProperty(object, name) !== null;

const stdioMode = (options: t.ObjectExpression | null): string => {
  const property = objectProperty(options, "stdio");
  if (property === null || !t.isObjectProperty(property)) return "default";
  if (t.isStringLiteral(property.value)) return property.value.value;
  if (t.isArrayExpression(property.value)) return "array";
  return "dynamic";
};

const objectProperty = (
  object: t.ObjectExpression | null,
  name: string,
): t.ObjectMethod | t.ObjectProperty | null =>
  object?.properties.find(
    (property): property is t.ObjectMethod | t.ObjectProperty =>
      (t.isObjectMethod(property) || t.isObjectProperty(property)) &&
      // `{[env]: vars}` has a dynamic key; treating it as `env` would claim
      // the caller supplied an environment when the real key is unknown.
      semanticStaticPropertyName(property.key, property.computed) === name,
  ) ?? null;

const objectBinding = (
  node: t.Expression | t.Super,
  state: JavaScriptSemanticAnalysisState,
): JavaScriptSemanticBindingState | undefined =>
  t.isIdentifier(node)
    ? resolveSemanticBindingState(state, node, node.name)
    : undefined;

const spawnId = (candidate: SpawnCandidate): string =>
  `child:spawn:${String(candidate.node.start ?? -1)}:${String(candidate.node.end ?? -1)}`;
