import { canonicalJson } from "../comparisonSemantics.js";
import { digestCanonicalValue } from "../canonicalDigest.js";
import { applicationGraphEvidenceSchema } from "./javascriptApplicationEvidenceSchemas.js";
import { JAVASCRIPT_SEMANTIC_RELATION_FAMILY } from "./javascriptSemanticGraphSchemas.js";

export function* checkNodesSteps(
  graph: GraphRecord,
  nodes: ReadonlyMap<
    string,
    import("./javascriptSemanticGraphSchemas.js").JavaScriptSemanticGraphNode
  >,
  context: GraphIssueReporter,
): Generator<void> {
  for (const [index, node] of graph.nodes.entries()) {
    if (index % 256 === 0) yield;
    if (
      node.node_id !==
      `jsrg_node_${digestCanonicalValue({ kind: node.kind, identity: node.identity }, "JavaScript semantic graph")}`
    )
      context.addIssue({
        code: "custom",
        path: ["nodes", index, "node_id"],
        message: "Node identifier is stale",
      });
    if (
      node.function_node_id !== null &&
      nodes.get(node.function_node_id)?.kind !== "function"
    )
      context.addIssue({
        code: "custom",
        path: ["nodes", index, "function_node_id"],
        message: "Function owner must name a function node",
      });
  }
}
export function* checkRootsSteps(
  graph: GraphRecord,
  nodes: ReadonlyMap<
    string,
    import("./javascriptSemanticGraphSchemas.js").JavaScriptSemanticGraphNode
  >,
  context: GraphIssueReporter,
): Generator<void> {
  for (const [index, root] of graph.root_node_ids.entries()) {
    if (index % 256 === 0) yield;
    if (!nodes.has(root))
      context.addIssue({
        code: "custom",
        path: ["root_node_ids"],
        message: "Root identifier must name a semantic node",
      });
  }
}
export function* checkRelationsSteps(
  graph: GraphRecord,
  nodes: ReadonlyMap<
    string,
    import("./javascriptSemanticGraphSchemas.js").JavaScriptSemanticGraphNode
  >,
  evidenceContexts: ReadonlyMap<
    string,
    import("./javascriptSemanticGraphSchemas.js").JavaScriptSemanticEvidenceContext
  >,
  context: GraphIssueReporter,
): Generator<void> {
  for (const [index, relation] of graph.relations.entries()) {
    if (index % 256 === 0) yield;
    const { relation_id: identifier, ...semantic } = relation;
    if (
      identifier !==
      "jsrg_relation_" +
        digestCanonicalValue(semantic, "JavaScript semantic graph")
    )
      context.addIssue({
        code: "custom",
        path: ["relations", index, "relation_id"],
        message: "Relation identifier is stale",
      });
    if (
      !nodes.has(relation.source_node_id) ||
      !nodes.has(relation.target_node_id)
    )
      context.addIssue({
        code: "custom",
        path: ["relations", index],
        message: "Relation endpoints must name semantic nodes",
      });
    if (relation.source_node_id === relation.target_node_id)
      context.addIssue({
        code: "custom",
        path: ["relations", index],
        message: "Semantic relations cannot be self-referential",
      });
    if (
      relation.resolution === "candidate" &&
      evidenceContexts.get(relation.evidence.context_id)?.state === "observed"
    )
      context.addIssue({
        code: "custom",
        path: ["relations", index, "evidence", "state"],
        message: "Candidate relations cannot claim observed resolution",
      });
  }
}
export function* checkUnknownsSteps(
  graph: GraphRecord,
  nodes: ReadonlyMap<
    string,
    import("./javascriptSemanticGraphSchemas.js").JavaScriptSemanticGraphNode
  >,
  evidenceContexts: ReadonlyMap<
    string,
    import("./javascriptSemanticGraphSchemas.js").JavaScriptSemanticEvidenceContext
  >,
  context: GraphIssueReporter,
): Generator<void> {
  for (const [index, unknown] of graph.unknowns.entries()) {
    if (index % 256 === 0) yield;
    const { unknown_id: identifier, ...semantic } = unknown;
    if (
      identifier !==
      "jsrg_unknown_" +
        digestCanonicalValue(semantic, "JavaScript semantic graph")
    )
      context.addIssue({
        code: "custom",
        path: ["unknowns", index, "unknown_id"],
        message: "Unknown frontier identifier is stale",
      });
    if (unknown.node_id !== null && !nodes.has(unknown.node_id))
      context.addIssue({
        code: "custom",
        path: ["unknowns", index, "node_id"],
        message: "Unknown frontier node is absent",
      });
    if (unknown.candidate_node_ids.some((nodeId) => !nodes.has(nodeId)))
      context.addIssue({
        code: "custom",
        path: ["unknowns", index, "candidate_node_ids"],
        message: "Unknown frontier candidate node is absent",
      });
    if (
      unknown.relation_kinds.some(
        (kind) => JAVASCRIPT_SEMANTIC_RELATION_FAMILY[kind] !== unknown.family,
      )
    )
      context.addIssue({
        code: "custom",
        path: ["unknowns", index, "relation_kinds"],
        message: "Unknown relation kinds must belong to their declared family",
      });
    const evidenceState = evidenceContexts.get(
      unknown.evidence.context_id,
    )?.state;
    if (evidenceState !== "unknown" && evidenceState !== "unavailable")
      context.addIssue({
        code: "custom",
        path: ["unknowns", index, "evidence", "state"],
        message: "Unknown frontiers require unknown or unavailable evidence",
      });
  }
}
export const checkUnknownReferences = (
  graph: GraphRecord,
  context: GraphIssueReporter,
): void => {
  const unknownIds = new Set(
    graph.unknowns.map(({ unknown_id }) => unknown_id),
  );
  for (const [index, family] of graph.coverage.families.entries())
    if (family.unknown_ids.some((identifier) => !unknownIds.has(identifier)))
      context.addIssue({
        code: "custom",
        path: ["coverage", "families", index, "unknown_ids"],
        message: "Family coverage references an absent unknown frontier",
      });
};
export function* checkFingerprintsSteps(
  graph: GraphRecord,
  nodes: ReadonlyMap<
    string,
    import("./javascriptSemanticGraphSchemas.js").JavaScriptSemanticGraphNode
  >,
  context: GraphIssueReporter,
): Generator<void> {
  for (const [index, fingerprint] of graph.fingerprints.entries()) {
    if (index % 256 === 0) yield;
    if (nodes.get(fingerprint.function_node_id)?.kind !== "function")
      context.addIssue({
        code: "custom",
        path: ["fingerprints", index, "function_node_id"],
        message: "Fingerprint must name a function node",
      });
    if (
      fingerprint.fingerprint_sha256 !==
      digestCanonicalValue(fingerprint.components, "JavaScript semantic graph")
    )
      context.addIssue({
        code: "custom",
        path: ["fingerprints", index, "fingerprint_sha256"],
        message: "Fingerprint component commitment is stale",
      });
    const expectedIdentifier =
      "jsrg_fingerprint_" +
      digestCanonicalValue(
        {
          function_node_id: fingerprint.function_node_id,
          algorithm: fingerprint.algorithm,
          fingerprint_sha256: fingerprint.fingerprint_sha256,
        },
        "JavaScript semantic graph",
      );
    if (fingerprint.fingerprint_id !== expectedIdentifier)
      context.addIssue({
        code: "custom",
        path: ["fingerprints", index, "fingerprint_id"],
        message: "Fingerprint identifier is stale",
      });
    if (
      fingerprint.status !== "complete" &&
      fingerprint.limitations.length === 0
    )
      context.addIssue({
        code: "custom",
        path: ["fingerprints", index, "limitations"],
        message: "Incomplete fingerprints require a limitation",
      });
  }
}
