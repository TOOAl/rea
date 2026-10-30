import * as t from "@babel/types";

import type {
  JavaScriptSemanticArgumentFlow,
  JavaScriptSemanticCallable,
  JavaScriptSemanticCallResultFlow,
  JavaScriptSemanticCallReturnFlow,
  JavaScriptSemanticCallSite,
  JavaScriptSemanticClosureCapture,
  JavaScriptSemanticFrontier,
} from "./javascriptSemanticIr.js";
import { createSemanticCallableStack } from "./javascriptSemanticCallableStack.js";
import {
  isUnshadowedGlobal,
  type JavaScriptSemanticAnalysisState,
  type JavaScriptSemanticBindingState,
} from "./javascriptSemanticState.js";
import {
  type LocalCallableResolution,
  resolveLocalCallables,
} from "./javascriptSemanticCallResolution.js";
import { traverseJavaScriptAst } from "./javascriptSemanticTraversal.js";
import { range } from "./javascriptStaticAnalysisHelpers.js";
import { assignedSemanticResultBindings } from "./javascriptSemanticDataEffectHelpers.js";

/** Local call, flow, capture, and unsupported-frontier facts. */
export interface JavaScriptSemanticCallAnalysis {
  readonly callSites: readonly JavaScriptSemanticCallSite[];
  readonly argumentFlows: readonly JavaScriptSemanticArgumentFlow[];
  readonly callReturnFlows: readonly JavaScriptSemanticCallReturnFlow[];
  readonly callResultFlows: readonly JavaScriptSemanticCallResultFlow[];
  readonly closureCaptures: readonly JavaScriptSemanticClosureCapture[];
  readonly frontiers: readonly JavaScriptSemanticFrontier[];
}

interface MutableCallAnalysis {
  readonly callSites: JavaScriptSemanticCallSite[];
  readonly argumentFlows: JavaScriptSemanticArgumentFlow[];
  readonly callReturnFlows: JavaScriptSemanticCallReturnFlow[];
  readonly callResultFlows: JavaScriptSemanticCallResultFlow[];
  readonly closureCaptures: JavaScriptSemanticClosureCapture[];
  readonly frontiers: JavaScriptSemanticFrontier[];
}

interface CallCollectionContext {
  readonly state: JavaScriptSemanticAnalysisState;
  readonly callableById: ReadonlyMap<string, JavaScriptSemanticCallable>;
  readonly output: MutableCallAnalysis;
  readonly bindingResolutionCache: Map<string, LocalCallableResolution>;
  readonly parameterBindingCache: Map<
    string,
    readonly JavaScriptSemanticBindingState[]
  >;
  readonly ancestors: t.Node[];
}

/** Recover direct-call and lexical-capture candidates from inert syntax. */
export const collectJavaScriptSemanticCalls = (
  program: t.Program,
  state: JavaScriptSemanticAnalysisState,
  callables: readonly JavaScriptSemanticCallable[],
): JavaScriptSemanticCallAnalysis => {
  const output: MutableCallAnalysis = {
    callSites: [],
    argumentFlows: [],
    callReturnFlows: [],
    callResultFlows: [],
    closureCaptures: [],
    frontiers: [],
  };
  const callableById = new Map(
    callables.map((callable) => [callable.callableId, callable]),
  );
  const context: CallCollectionContext = {
    state,
    callableById,
    output,
    bindingResolutionCache: new Map(),
    parameterBindingCache: new Map(),
    ancestors: [],
  };
  const callableStack = createSemanticCallableStack((callableId) =>
    callableById.get(callableId),
  );
  traverseJavaScriptAst(program, {
    enter: (node, parent) => {
      callableStack.enter(node, parent);
      const owner = enclosingFunction(callableStack.callables);
      collectCapture(node, parent, owner, context);
      collectDynamicProperty(node, owner, state, output);
      collectDynamicScope(node, owner, state, output);
      if (
        t.isCallExpression(node) ||
        t.isOptionalCallExpression(node) ||
        t.isNewExpression(node)
      )
        collectCallSite(node, parent, owner, context);
      context.ancestors.push(node);
    },
    exit: (node) => {
      context.ancestors.pop();
      callableStack.exit(node);
    },
  });
  return {
    callSites: output.callSites,
    argumentFlows: output.argumentFlows,
    callReturnFlows: output.callReturnFlows,
    callResultFlows: output.callResultFlows,
    closureCaptures: output.closureCaptures,
    frontiers: output.frontiers,
  };
};

const collectCallSite = (
  node: t.CallExpression | t.OptionalCallExpression | t.NewExpression,
  parent: t.Node | null,
  owner: JavaScriptSemanticCallable | undefined,
  context: CallCollectionContext,
): void => {
  const { state, callableById, output } = context;
  const resolution = resolveLocalCallables({
    node: node.callee,
    state,
    callableById,
    seenBindings: new Set(),
    bindingCache: context.bindingResolutionCache,
  });
  const callSiteId = semanticCallSiteId(node);
  const argumentsValue = retainedArguments(node.arguments);
  const site: JavaScriptSemanticCallSite = {
    callSiteId,
    kind: t.isNewExpression(node) ? "construct" : "call",
    callerCallableId: owner?.callableId ?? null,
    location: range(node),
    calleeLocation: range(node.callee),
    resolution:
      resolution.callableIds.length === 1 && resolution.complete
        ? "exact"
        : resolution.callableIds.length > 0
          ? "ambiguous"
          : "unresolved",
    calleeCallableIds: resolution.callableIds,
    arguments: argumentsValue,
  };
  output.callSites.push(site);
  collectCallResultFlow(site, node, context);
  if (site.resolution !== "exact")
    addFrontier(
      {
        kind: "dynamic-call",
        callableId: owner?.callableId ?? null,
        location: range(node.callee),
        reason: resolution.reason,
      },
      state,
      output,
    );
  collectArgumentFlows(site, node, context);
  if (site.kind === "call")
    collectReturnFlows(site, callableById, state, output);
};

const collectCallResultFlow = (
  site: JavaScriptSemanticCallSite,
  node: t.CallExpression | t.OptionalCallExpression | t.NewExpression,
  context: CallCollectionContext,
): void => {
  for (const assigned of assignedSemanticResultBindings(
    node,
    context.ancestors,
    context.state,
  ).filter(({ projectionPath }) => projectionPath.length === 0)) {
    const binding = context.state.bindingsById.get(assigned.bindingId);
    if (binding === undefined) continue;
    const identifierRange = range(assigned.identifier);
    const definition = binding.definitions.find(
      ({ location }) =>
        location.start.line === identifierRange.start.line &&
        location.start.column === identifierRange.start.column &&
        location.end.line === identifierRange.end.line &&
        location.end.column === identifierRange.end.column,
    );
    if (definition === undefined) continue;
    context.output.callResultFlows.push({
      callSiteId: site.callSiteId,
      bindingId: binding.bindingId,
      definitionLocation: definition.location,
    });
  }
};

const retainedArguments = (
  nodes: readonly (
    | t.Expression
    | t.SpreadElement
    | t.JSXNamespacedName
    | t.ArgumentPlaceholder
    | null
  )[],
): JavaScriptSemanticCallSite["arguments"] => {
  const retained: JavaScriptSemanticCallSite["arguments"][number][] = [];
  for (const [index, node] of nodes.entries()) {
    // Babel recovery can leave null slots; retain the other argument positions.
    if (node === null) continue;
    retained.push({
      index,
      location: range(node),
      spread: t.isSpreadElement(node),
    });
  }
  return retained;
};
