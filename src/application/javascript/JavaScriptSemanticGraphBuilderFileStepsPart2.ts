import type { JavaScriptSemanticGraphNode } from "../../domain/javascript/javascriptSemanticGraphSchemas.js";
import type { JavaScriptSemanticCallArgument } from "../../domain/javascript/javascriptSemanticIr.js";
import { sourceRangesEqual as rangesEqual } from "../../domain/javascript/javascriptStaticAnalysisHelpers.js";
import {
  projectSemanticEvents,
  projectSemanticTimers,
} from "./JavaScriptSemanticGraphAsyncProjection.js";
import { projectSemanticChildProcesses } from "./JavaScriptSemanticGraphChildProcessProjection.js";
import {
  projectSemanticBoundaries,
  projectSemanticConfiguration,
  projectSemanticRequests,
} from "./JavaScriptSemanticGraphDataProjection.js";
import { projectSemanticResources } from "./JavaScriptSemanticGraphResourceProjection.js";
import { projectSemanticObjects } from "./JavaScriptSemanticGraphObjectProjection.js";
import { projectSemanticValues } from "./JavaScriptSemanticGraphValueProjection.js";
import {
  projectSemanticClosureCaptures,
  projectSemanticFrontiers,
  projectSemanticPromises,
  projectSemanticReturnValues,
} from "./JavaScriptSemanticGraphFlowProjection.js";
import {
  retainSemanticGraphNode as retainNode,
  addSemanticGraphRelation as addRelation,
} from "./JavaScriptSemanticGraphConstruction.js";
import type { FileContext } from "./JavaScriptSemanticGraphBuilderTypes.js";

const projectCalls = (context: FileContext): void => {
  for (const call of context.ir.callSites) {
    const callNode = context.callSiteNodes.get(call.callSiteId);
    if (callNode === undefined) continue;
    for (const callableId of call.calleeCallableIds) {
      const callable = context.callableNodes.get(callableId);
      addRelation(context.state, {
        source: callNode,
        target: callable,
        relation: "calls",
        resolution: call.resolution === "exact" ? "resolved" : "candidate",
      });
    }
    for (const argument of call.arguments) {
      const argumentNode = createArgumentNode(
        context,
        callNode,
        call.callSiteId,
        argument,
      );
      if (argumentNode !== null)
        context.argumentNodes.set(
          `${call.callSiteId}\u0000${String(argument.index)}`,
          argumentNode,
        );
      const references = context.referenceNodesWithin(argument.location);
      for (const reference of references)
        addRelation(context.state, {
          source: reference,
          target: argumentNode,
          relation: "aliases",
          resolution:
            references.length === 1 &&
            rangesEqual(reference.identity.source_range, argument.location)
              ? "resolved"
              : "candidate",
        });
    }
  }
  for (const flow of context.ir.argumentFlows) {
    const argument = context.argumentNodes.get(
      `${flow.callSiteId}\u0000${String(flow.argumentIndex)}`,
    );
    const parameter = context.bindingNodes.get(flow.parameterBindingId);
    addRelation(context.state, {
      source: argument,
      target: parameter,
      relation: "argument-to-parameter",
      resolution: context.callResolutions.get(flow.callSiteId) ?? "candidate",
    });
  }
  for (const flow of context.ir.callReturnFlows)
    addRelation(context.state, {
      source: context.returnSiteNodes.get(flow.returnSiteId),
      target: context.callSiteNodes.get(flow.callSiteId),
      relation: "returns-to-call",
      resolution: context.callResolutions.get(flow.callSiteId) ?? "candidate",
    });
  for (const flow of context.ir.callResultFlows)
    addRelation(context.state, {
      source: context.callSiteNodes.get(flow.callSiteId),
      target: context.bindingNodes.get(flow.bindingId),
      relation: "aliases",
      resolution: context.callResolutions.get(flow.callSiteId) ?? "candidate",
    });
  projectSemanticReturnValues(context);
};

const createArgumentNode = (
  context: FileContext,
  callNode: JavaScriptSemanticGraphNode,
  callSiteId: string,
  argument: JavaScriptSemanticCallArgument,
): JavaScriptSemanticGraphNode | null =>
  retainNode(context.state, context.file, {
    kind: "expression",
    roleKey: `argument:${callSiteId}:${String(argument.index)}`,
    location: argument.location,
    label: argument.spread
      ? "spread argument"
      : `argument ${String(argument.index)}`,
    functionNodeId: callNode.function_node_id,
  });

/** Per-file projection passes, run in this order with a yield between each. */
const FILE_PROJECTION_PASSES: readonly ((
  context: FileContext,
) => Iterator<void, void> | void)[] = [
  projectSemanticValues,
  projectSemanticObjects,
  projectCalls,
  projectSemanticPromises,
  projectSemanticEvents,
  projectSemanticTimers,
  projectSemanticChildProcesses,
  projectSemanticConfiguration,
  projectSemanticRequests,
  projectSemanticBoundaries,
  projectSemanticResources,
  projectSemanticClosureCaptures,
  projectSemanticFrontiers,
];
