import type {
  JavaScriptSemanticFingerprint,
  JavaScriptSemanticGraphNode,
} from "../../domain/javascript/javascriptSemanticGraphSchemas.js";
import type { JavaScriptSemanticIr } from "../../domain/javascript/javascriptSemanticIr.js";
import type { JavaScriptArtifactFile } from "../../domain/javascript/javascriptArtifactFiles.js";
import { projectSemanticChildProcesses } from "./JavaScriptSemanticGraphChildProcessProjection.js";
import { projectSemanticResources } from "./JavaScriptSemanticGraphResourceProjection.js";
import { projectSemanticValues } from "./JavaScriptSemanticGraphValueProjection.js";
import { projectSemanticFunctionFingerprints } from "./JavaScriptSemanticGraphFingerprintProjection.js";
import {
  createSemanticCallableOwnerLookup,
  createSemanticCallSiteLookup,
  createSemanticNodeRangeLookup,
} from "./JavaScriptSemanticGraphProjection.js";
import {
  retainSemanticGraphNode as retainNode,
  addSemanticGraphRelation as addRelation,
} from "./JavaScriptSemanticGraphConstruction.js";
import type {
  BuilderState,
  FileContext,
} from "./JavaScriptSemanticGraphBuilderTypes.js";
import { projectElectronSemanticCallPaths } from "./JavaScriptSemanticGraphElectronProjection.js";
import { inferredSemanticEvidenceAt } from "./JavaScriptSemanticGraphEvidence.js";
import type { ElectronCallPath } from "../../domain/javascript/electronStaticAnalysisTypes.js";

export function* projectFileSteps(
  file: JavaScriptArtifactFile,
  ir: JavaScriptSemanticIr,
  state: BuilderState,
  paths: readonly ElectronCallPath[] = [],
): Generator<void, JavaScriptSemanticFingerprint[]> {
  yield;
  const moduleNode = retainNode(state, file, {
    kind: "module",
    roleKey: "module",
    location: null,
    label: file.path,
    functionNodeId: null,
  });
  if (moduleNode === null) return [];
  state.roots.add(moduleNode.node_id);
  yield* projectElectronSemanticCallPaths(file, paths, state);
  // Node creation keeps source order, which the per-file node budget relies
  // on; yields between nodes do not change it.
  const callableNodes = new Map<string, JavaScriptSemanticGraphNode>();
  for (const [index, callable] of ir.callables.entries()) {
    if (index % 64 === 0) yield;
    const node = retainNode(state, file, {
      kind: "function",
      roleKey: `callable:${callable.callableId}`,
      location: callable.location,
      label: callable.name,
      functionNodeId: null,
      // The label is display text; keep the exact name, which may be "".
      properties: { name: callable.name },
    });
    if (node !== null) callableNodes.set(callable.callableId, node);
  }
  const callableOwnerAt = createSemanticCallableOwnerLookup(ir, callableNodes);
  const bindingNodes = new Map<string, JavaScriptSemanticGraphNode>();
  for (const [index, binding] of ir.bindings.entries()) {
    if (index % 64 === 0) yield;
    const location = binding.definitions[0]?.location ?? null;
    const kind = binding.kind === "parameter" ? "parameter" : "binding";
    const owner = callableOwnerAt(location);
    const node = retainNode(state, file, {
      kind,
      roleKey: `binding:${binding.bindingId}`,
      location,
      label: binding.name,
      functionNodeId: owner?.node_id ?? null,
    });
    if (node !== null) bindingNodes.set(binding.bindingId, node);
  }
  const returnSiteNodes = yield* createReturnSiteNodes(
    file,
    ir,
    callableNodes,
    state,
  );
  const callSiteNodes = yield* createCallSiteNodes(
    file,
    ir,
    callableNodes,
    state,
  );
  const definitions: Omit<FileContext, "referenceNodesWithin"> = {
    file,
    ir,
    state,
    moduleNode,
    bindingNodes,
    callableNodes,
    callSiteNodes,
    returnSiteNodes,
    argumentNodes: new Map(),
    referenceNodes: [],
    callResolutions: new Map(
      ir.callSites.map((call) => [
        call.callSiteId,
        call.resolution === "exact" ? "resolved" : "candidate",
      ]),
    ),
    callableOwnerAt,
    callSiteAt: createSemanticCallSiteLookup(ir, callSiteNodes),
  };
  yield* projectDefinitionsAndReferences(definitions);
  const context: FileContext = {
    ...definitions,
    referenceNodesWithin: createSemanticNodeRangeLookup(
      definitions.referenceNodes,
    ),
  };
  // Each pass completes before the next starts, so yielding between passes
  // keeps projection order and results unchanged.
  for (const project of FILE_PROJECTION_PASSES) {
    yield;
    const steps = project(context);
    if (steps !== undefined) while (steps.next().done !== true) yield;
  }
  yield;
  return projectSemanticFunctionFingerprints(
    file,
    ir,
    callableNodes,
    state.evidenceContexts,
  );
}

function* createReturnSiteNodes(
  file: JavaScriptArtifactFile,
  ir: JavaScriptSemanticIr,
  callables: ReadonlyMap<string, JavaScriptSemanticGraphNode>,
  state: BuilderState,
): Generator<void, Map<string, JavaScriptSemanticGraphNode>> {
  const result = new Map<string, JavaScriptSemanticGraphNode>();
  for (const [index, callable] of ir.callables.entries()) {
    if (index % 64 === 0) yield;
    const owner = callables.get(callable.callableId);
    if (owner === undefined) continue;
    for (const site of callable.returnSites) {
      const identifier = site.returnSiteId;
      const node = retainNode(state, file, {
        kind: "return-site",
        roleKey: identifier,
        location: site.location,
        label: "return",
        functionNodeId: owner.node_id,
      });
      if (node !== null) result.set(identifier, node);
    }
  }
  return result;
}

function* createCallSiteNodes(
  file: JavaScriptArtifactFile,
  ir: JavaScriptSemanticIr,
  callables: ReadonlyMap<string, JavaScriptSemanticGraphNode>,
  state: BuilderState,
): Generator<void, Map<string, JavaScriptSemanticGraphNode>> {
  const result = new Map<string, JavaScriptSemanticGraphNode>();
  for (const [index, call] of ir.callSites.entries()) {
    if (index % 64 === 0) yield;
    const owner =
      call.callerCallableId === null
        ? null
        : (callables.get(call.callerCallableId)?.node_id ?? null);
    const node = retainNode(state, file, {
      kind: "call-site",
      roleKey: `call:${call.callSiteId}`,
      location: call.location,
      label: call.kind,
      functionNodeId: owner,
    });
    if (node !== null) result.set(call.callSiteId, node);
  }
  return result;
}

function* projectDefinitionsAndReferences(
  context: Omit<FileContext, "referenceNodesWithin">,
): Generator<void, void> {
  for (const [bindingIndex, binding] of context.ir.bindings.entries()) {
    if (bindingIndex % 64 === 0) yield;
    const bindingNode = context.bindingNodes.get(binding.bindingId);
    if (bindingNode === undefined) continue;
    for (const [index, definition] of binding.definitions.entries()) {
      const definitionNode = retainNode(context.state, context.file, {
        kind: "expression",
        roleKey: `definition:${binding.bindingId}:${String(index)}`,
        location: definition.location,
        label: definition.kind,
        functionNodeId: bindingNode.function_node_id,
      });
      addRelation(context.state, {
        source: definitionNode,
        target: bindingNode,
        relation: "defines",
        resolution: "resolved",
      });
    }
  }
  for (const [index, reference] of context.ir.references.entries()) {
    if (index % 64 === 0) yield;
    const expression = retainNode(context.state, context.file, {
      kind: "expression",
      roleKey: `reference:${String(index)}:${reference.role}:${reference.name}`,
      location: reference.location,
      label: reference.name,
      functionNodeId:
        context.callableOwnerAt(reference.location)?.node_id ?? null,
    });
    const binding =
      reference.bindingId === null
        ? undefined
        : context.bindingNodes.get(reference.bindingId);
    if (expression !== null) context.referenceNodes.push(expression);
    if (binding === undefined || expression === null) continue;
    if (reference.role === "read")
      addRelation(context.state, {
        source: binding,
        target: expression,
        relation: "reads",
        resolution: "resolved",
        evidence: inferredSemanticEvidenceAt(context.file, reference.location),
      });
    else if (reference.role === "write")
      addRelation(context.state, {
        source: expression,
        target: binding,
        relation: "writes",
        resolution: "resolved",
      });
  }
}
