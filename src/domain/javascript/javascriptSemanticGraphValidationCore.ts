import { digestCanonicalValue } from "../canonicalDigest.js";
import {
  checkCanonicalOrder,
  checkEvidenceContextReferencesSteps,
  checkNodesSteps,
  checkRootsSteps,
  checkRelationsSteps,
  checkUnknownsSteps,
  checkUnknownReferences,
  checkFingerprintsSteps,
  checkCoverageSteps,
} from "./javascriptSemanticGraphValidation.js";
import type {
  GraphRecord,
  GraphIssueReporter,
} from "./javascriptSemanticGraphValidation.js";

export function* checkGraphContentSteps(
  graph: GraphRecord,
  context: GraphIssueReporter,
): Generator<void> {
  checkCanonicalOrder(graph, context);
  yield* checkEvidenceContextReferencesSteps(graph, context);
  const evidenceContexts = new Map(
    graph.evidence_contexts.map((evidenceContext) => [
      evidenceContext.context_id,
      evidenceContext,
    ]),
  );
  const nodes = new Map<
    string,
    import("./javascriptSemanticGraphSchemas.js").JavaScriptSemanticGraphNode
  >();
  for (const [index, node] of graph.nodes.entries()) {
    if (index % 256 === 0) yield;
    nodes.set(node.node_id, node);
  }
  yield* checkNodesSteps(graph, nodes, context);
  yield* checkRootsSteps(graph, nodes, context);
  yield* checkRelationsSteps(graph, nodes, evidenceContexts, context);
  yield* checkUnknownsSteps(graph, nodes, evidenceContexts, context);
  checkUnknownReferences(graph, context);
  yield* checkFingerprintsSteps(graph, nodes, context);
  yield* checkCoverageSteps(graph, context);
  if (graph.coverage.status !== "complete" && graph.limitations.length === 0)
    context.addIssue({
      code: "custom",
      path: ["limitations"],
      message: "Non-complete graph coverage requires a limitation",
    });
}
export const checkGraphContent = (
  graph: GraphRecord,
  context: GraphIssueReporter,
): void => {
  const steps = checkGraphContentSteps(graph, context);
  while (!steps.next().done) {}
};
export const checkGraph = (
  graph: GraphRecord,
  context: GraphIssueReporter,
): void => {
  checkGraphContent(graph, context);
  const { graph_id: identifier, ...semantic } = graph;
  if (
    identifier !==
    "jsrg_" + digestCanonicalValue(semantic, "JavaScript semantic graph")
  )
    context.addIssue({
      code: "custom",
      path: ["graph_id"],
      message: "Graph identifier is stale",
    });
};
