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

interface DataEffectAnalysis {
  readonly configurationOperations: readonly JavaScriptSemanticConfigurationOperation[];
  readonly requestOperations: readonly JavaScriptSemanticRequestOperation[];
  readonly boundaryOperations: readonly JavaScriptSemanticBoundaryOperation[];
}

interface ConfigurationCandidate {
  readonly node: t.Node;
  readonly operation: JavaScriptSemanticConfigurationOperation;
}

interface RequestCandidate {
  readonly node: t.CallExpression | t.OptionalCallExpression | t.NewExpression;
  readonly operation: JavaScriptSemanticRequestOperation;
}

/** Recover configuration, request, and boundary candidates from inert syntax. */
export const collectJavaScriptSemanticDataEffects = (
  program: t.Program,
  state: JavaScriptSemanticAnalysisState,
  callables: readonly JavaScriptSemanticCallable[],
): DataEffectAnalysis => {
  const context: TraversalContext = {
    state,
    callableIds: new Set(callables.map(({ callableId }) => callableId)),
    callableStack: [],
    ancestors: [],
  };
  const configuration = collectConfigurations(program, context);
  const requests = collectRequests(program, context);
  return {
    configurationOperations: [
      ...configuration.map(({ operation }) => operation),
      ...collectDefaults(program, context, configuration),
    ],
    requestOperations: [
      ...requests.map(({ operation }) => operation),
      ...collectResponseConsumers(program, context, requests),
    ],
    boundaryOperations: collectBoundaries(program, context),
  };
};

const collectConfigurations = (
  program: t.Program,
  context: TraversalContext,
): ConfigurationCandidate[] => {
  const output: ConfigurationCandidate[] = [];
  traverseWithContext(program, context, (node) => {
    const details = configurationDetails(node, context);
    if (details === null) return;
    const operation: JavaScriptSemanticConfigurationOperation = {
      configId: `config:${details.kind}:${String(node.start ?? -1)}:${String(node.end ?? -1)}`,
      kind: details.kind,
      location: range(node),
      ownerCallableId: context.callableStack.at(-1) ?? null,
      resultBindingId: outerAssignedBinding(node, context),
      key: details.key,
      sourceConfigId: null,
      value: null,
      resolution: details.resolution,
    };
    output.push({ node, operation });
  });
  return output;
};

const configurationDetails = (
  node: t.Node,
  context: TraversalContext,
): {
  readonly kind: "environment" | "argv" | "file";
  readonly key: string | null;
  readonly resolution: "complete" | "partial";
} | null => {
  if (t.isMemberExpression(node) || t.isOptionalMemberExpression(node)) {
    const processMember = processConfigurationMember(node, context.state);
    if (processMember !== null) return processMember;
  }
  if (!t.isCallExpression(node) && !t.isOptionalCallExpression(node))
    return null;
  const fileMethod = builtinMethod(node.callee, context.state, [
    "fs",
    "node:fs",
  ]);
  return fileMethod === "readFile" || fileMethod === "readFileSync"
    ? {
        kind: "file",
        key: literalString(node.arguments[0]),
        resolution:
          literalString(node.arguments[0]) === null ? "partial" : "complete",
      }
    : null;
};

const processConfigurationMember = (
  node: t.MemberExpression | t.OptionalMemberExpression,
  state: JavaScriptSemanticAnalysisState,
): {
  readonly kind: "environment" | "argv";
  readonly key: string | null;
  readonly resolution: "complete" | "partial";
} | null => {
  const object = node.object;
  if (!t.isMemberExpression(object) && !t.isOptionalMemberExpression(object))
    return null;
  const family = semanticStaticPropertyName(object.property, object.computed);
  if (family !== "env" && family !== "argv") return null;
  // `process.env[""]` names an exact (empty) key; only a dynamic key is unknown.
  const key = semanticStaticPropertyKey(node.property, node.computed);
  if (family === "argv" && key !== null && !isArrayIndexKey(key)) return null;
  if (!isProcessObject(object.object, state, family, key)) return null;
  return {
    kind: family === "env" ? "environment" : "argv",
    key,
    resolution: key === null ? "partial" : "complete",
  };
};

const isArrayIndexKey = (key: string): boolean => {
  if (!/^(?:0|[1-9][0-9]*)$/u.test(key)) return false;
  const index = Number(key);
  return Number.isSafeInteger(index) && index < 2 ** 32 - 1;
};

const collectDefaults = (
  program: t.Program,
  context: TraversalContext,
  configurations: readonly ConfigurationCandidate[],
): JavaScriptSemanticConfigurationOperation[] => {
  const output: JavaScriptSemanticConfigurationOperation[] = [];
  const configurationsByNode = new Map(
    configurations.map((candidate) => [candidate.node, candidate]),
  );
  traverseWithContext(program, context, (node) => {
    if (
      !t.isLogicalExpression(node) ||
      (node.operator !== "??" && node.operator !== "||")
    )
      return;
    const source = unwrapJavaScriptExpression(node.left).node;
    const candidate = configurationsByNode.get(source);
    if (candidate === undefined) return;
    const literal = readExactJavaScriptLiteral(node.right);
    const value: JavaScriptSemanticValue = literal.found
      ? semanticPrimitiveSet([literal.value])
      : { status: "unknown", reason: "Default is not an exact primitive." };
    recordSemanticValueLimit(context.state, value);
    output.push({
      configId: `config:default:${String(node.start ?? -1)}:${String(node.end ?? -1)}`,
      kind: "default",
      location: range(node.right),
      ownerCallableId: context.callableStack.at(-1) ?? null,
      resultBindingId: outerAssignedBinding(node, context),
      key: candidate.operation.key,
      sourceConfigId: candidate.operation.configId,
      value: value.status === "literal" ? value.value : null,
      ...(value.status === "unknown" && value.resourceLimit !== undefined
        ? { valueResourceLimit: value.resourceLimit }
        : {}),
      resolution: value.status === "literal" ? "complete" : "partial",
    });
  });
  return output;
};
