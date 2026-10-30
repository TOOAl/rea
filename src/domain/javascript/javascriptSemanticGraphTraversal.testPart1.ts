export const __stub = 1;
// import {
//   semanticFixtureGraph,
//   semanticGraphTestEvidence,
//   unknownSemanticGraphTestEvidence,
// } from "../../../tests/support/javascriptSemanticGraphFixture.js";
// import { expect, it } from "vitest";
//
// import {
//   JAVASCRIPT_SEMANTIC_NODE_KINDS,
//   JAVASCRIPT_SEMANTIC_RELATION_FAMILIES,
//   JAVASCRIPT_SEMANTIC_RELATION_FAMILY,
//   type JavaScriptSemanticGraphInput,
// } from "./javascriptSemanticGraphSchemas.js";
// import {
//   createJavaScriptSemanticGraph,
//   createJavaScriptSemanticGraphNode,
//   createJavaScriptSemanticGraphRelation,
//   createJavaScriptSemanticGraphUnknown,
//   JavaScriptSemanticEvidenceContextRegistry,
//   resolveJavaScriptSemanticEvidence,
//   type JavaScriptSemanticGraph,
// } from "./javascriptSemanticGraph.js";
// import type {
//   JavaScriptSemanticGraphNode,
//   JavaScriptSemanticGraphRelation,
// } from "./javascriptSemanticGraphSchemas.js";
// import { queryJavaScriptSemanticGraph } from "./javascriptSemanticQuery.js";
// import type { JsonValue } from "../jsonValue.js";
//
// const SHA = "a".repeat(64);
// const JAG_ID = `jag_${"b".repeat(64)}`;
// const node = (
//   kind: (typeof JAVASCRIPT_SEMANTIC_NODE_KINDS)[number],
//   role: string,
//   evidenceContexts: JavaScriptSemanticEvidenceContextRegistry,
//   properties: Record<string, JsonValue> = {},
//   functionNodeId: string | null = null,
// ): JavaScriptSemanticGraphNode =>
//   createJavaScriptSemanticGraphNode(
//     {
//       kind,
//       identity: {
//         artifact_sha256: SHA,
//         module_path: "bundle.js",
//         source_range: {
//           start: { line: 1, column: role.length },
//           end: { line: 1, column: role.length + 1 },
//         },
//         role_key: role,
//       },
//       function_node_id: functionNodeId,
//       application_node_ids: [],
//       label: role,
//       properties,
//       evidence: semanticGraphTestEvidence(),
//     },
//     evidenceContexts,
//   );
//
// const graphWithCandidateEdge = (): JavaScriptSemanticGraph => {
//   const graph = semanticFixtureGraph();
//   const input = constructionInput(graph);
//   const evidenceContexts = registryForGraph(graph);
//   const literal = graph.nodes.find(({ kind }) => kind === "literal");
//   const request = graph.nodes.find(({ kind }) => kind === "request");
//   if (literal === undefined || request === undefined)
//     throw new TypeError("Semantic fixture nodes are missing");
//   const candidate = createJavaScriptSemanticGraphRelation(
//     {
//       source_node_id: literal.node_id,
//       target_node_id: request.node_id,
//       relation: "supplies-request-field",
//       resolution: "candidate",
//       properties: { field: "authorization" },
//       evidence: semanticGraphTestEvidence("inferred"),
//     },
//     evidenceContexts,
//   );
//   return createJavaScriptSemanticGraph({
//     ...input,
//     evidence_contexts: evidenceContexts.contexts,
//     relations: [...input.relations, candidate],
//     coverage: {
//       ...graph.coverage,
//       families: graph.coverage.families.map((family) =>
//         family.family === "request"
//           ? {
//               ...family,
//               retained_relations: family.retained_relations + 1,
//             }
//           : family,
//       ),
//     },
//   });
// };
//
// const constructionInput = (
//   graph: JavaScriptSemanticGraph,
// ): JavaScriptSemanticGraphInput => {
//   const { graph_id: _graphId, ...input } = graph;
//   return input;
// };
//
// const registryForGraph = (
//   graph: JavaScriptSemanticGraph,
// ): JavaScriptSemanticEvidenceContextRegistry => {
//   const registry = new JavaScriptSemanticEvidenceContextRegistry();
//   for (const { evidence: reference } of [
//     ...graph.nodes,
//     ...graph.relations,
//     ...graph.unknowns,
//     ...graph.fingerprints,
//   ])
//     registry.intern(resolveJavaScriptSemanticEvidence(graph, reference));
//   return registry;
// };
//
// it("returns every relevant unknown inline", () => {
//   const graph = semanticFixtureGraph(true);
//   const callable = graph.nodes.find(({ kind }) => kind === "function");
//   if (callable === undefined) throw new Error("Expected callable node");
//   const result = queryJavaScriptSemanticGraph(graph, {
//     seed: { kind: "semantic-node", node_id: callable.node_id },
//     direction: "forward-influence",
//   });
//   expect(result).toMatchObject({
//     summary: { relevant_unknowns: 1 },
//   });
//   expect(result.unknowns).toHaveLength(1);
// });
//
// it("does not admit a semantic-node seed absent from the graph", () => {
//   const result = queryJavaScriptSemanticGraph(semanticFixtureGraph(), {
//     seed: { kind: "semantic-node", node_id: `jsrg_node_${"f".repeat(64)}` },
//     direction: "forward-influence",
//   });
export const _l = 136;
