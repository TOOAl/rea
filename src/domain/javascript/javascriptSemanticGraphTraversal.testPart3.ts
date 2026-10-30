export const __stub = 1;
//   });
//   expect(conservative.summary.traversed_relations).toBe(0);
//   expect(optedIn.summary.traversed_relations).toBe(1);
//   expect(conservative.status).toBe("ambiguous");
//   expect(conservative.coverage.status).toBe("partial");
//   expect(optedIn.status).toBe("ambiguous");
//   expect(optedIn.relations).toMatchObject([
//     { relation: "supplies-request-field", resolution: "candidate" },
//   ]);
// });
//
// it("retains every structural application node linked to one semantic node", () => {
//   const evidenceContexts = new JavaScriptSemanticEvidenceContextRegistry();
//   const original = node("module", "module", evidenceContexts);
//   const linked = createJavaScriptSemanticGraphNode(
//     {
//       kind: original.kind,
//       identity: original.identity,
//       function_node_id: original.function_node_id,
//       application_node_ids: Array.from(
//         { length: 65 },
//         (_, index) => `jag_node_${index.toString(16).padStart(64, "0")}`,
//       ),
//       label: original.label,
//       properties: original.properties,
//       evidence: evidenceContexts.resolve(original.evidence),
//     },
//     evidenceContexts,
//   );
//   expect(linked.application_node_ids).toHaveLength(65);
// });
//
// it("retains all explicit unresolved candidate node identifiers", () => {
//   const evidenceContexts = new JavaScriptSemanticEvidenceContextRegistry();
//   const unknown = createJavaScriptSemanticGraphUnknown(
//     {
//       node_id: null,
//       family: "call-flow",
//       relation_kinds: ["calls"],
//       reason: "ambiguous-target",
//       detail: "All candidate targets are retained.",
//       candidate_node_ids: Array.from(
//         { length: 1_001 },
//         (_, index) => `jsrg_node_${index.toString(16).padStart(64, "0")}`,
//       ),
//       evidence: unknownSemanticGraphTestEvidence(),
//     },
//     evidenceContexts,
//   );
//   expect(unknown.candidate_node_ids).toHaveLength(1_001);
// });
//
// const directionalGraph = (
//   nodes: readonly JavaScriptSemanticGraphNode[],
//   relations: readonly JavaScriptSemanticGraphRelation[],
//   evidenceContexts: JavaScriptSemanticEvidenceContextRegistry,
//   partial = false,
// ): JavaScriptSemanticGraph =>
//   createJavaScriptSemanticGraph({
//     schema: "JavaScriptSemanticRelationGraph",
//     root_artifact_sha256: SHA,
//     application_graph_id: JAG_ID,
//     root_node_ids: nodes.slice(0, 1).map(({ node_id }) => node_id),
//     evidence_contexts: evidenceContexts.contexts,
//     nodes: [...nodes],
//     relations: [...relations],
//     fingerprints: [],
//     unknowns: [],
//     coverage: {
//       status: partial ? "partial" : "complete",
//       truncated: false,
//       omitted_nodes: partial ? 1 : 0,
//       omitted_relations: 0,
//       limits: [],
//       families: JAVASCRIPT_SEMANTIC_RELATION_FAMILIES.map((family) => ({
//         family,
//         status: "complete",
//         retained_relations: relations.filter(
//           ({ relation }) =>
//             JAVASCRIPT_SEMANTIC_RELATION_FAMILY[relation] === family,
//         ).length,
//         omitted_relations: 0,
//         unknown_ids: [],
//       })),
//     },
//     limitations: partial ? ["One source graph node was omitted."] : [],
//   });
//
// const relationBetween = (
//   source: JavaScriptSemanticGraphNode,
//   target: JavaScriptSemanticGraphNode,
//   relation: JavaScriptSemanticGraphRelation["relation"],
//   evidenceContexts: JavaScriptSemanticEvidenceContextRegistry,
//   resolution: JavaScriptSemanticGraphRelation["resolution"] = "resolved",
// ) =>
//   createJavaScriptSemanticGraphRelation(
//     {
//       source_node_id: source.node_id,
//       target_node_id: target.node_id,
//       relation,
//       resolution,
//       properties: {},
//       evidence: semanticGraphTestEvidence("inferred"),
//     },
//     evidenceContexts,
//   );
//
// it.each([
//   {
//     direction: "forward-influence",
//     relation: "calls",
//     incoming: true,
//     relevant: false,
//   },
//   {
//     direction: "forward-influence",
//     relation: "calls",
//     incoming: false,
//     relevant: true,
//   },
//   {
//     direction: "backward-provenance",
//     relation: "calls",
//     incoming: false,
//     relevant: false,
//   },
//   {
//     direction: "backward-provenance",
//     relation: "calls",
//     incoming: true,
//     relevant: true,
//   },
//   { direction: "callers", relation: "reads", incoming: true, relevant: false },
//   { direction: "callers", relation: "calls", incoming: false, relevant: false },
//   { direction: "callers", relation: "calls", incoming: true, relevant: true },
//   {
export const _l = 136;
