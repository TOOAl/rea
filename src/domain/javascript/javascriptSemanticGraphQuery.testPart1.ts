export const __stub = 1;
// import {
//   semanticFixtureGraph,
//   semanticFixtureInput,
//   semanticGraphTestEvidence,
//   unknownSemanticGraphTestEvidence,
// } from "../../../tests/support/javascriptSemanticGraphFixture.js";
// import { expect, it } from "vitest";
// import { z } from "zod";
//
// import { digestCanonicalValue } from "../canonicalDigest.js";
// import type { JsonValue } from "../jsonValue.js";
// import type { ApplicationGraphEvidence } from "./javascriptApplicationEvidenceSchemas.js";
// import {
//   JAVASCRIPT_SEMANTIC_RELATION_FAMILIES,
//   JAVASCRIPT_SEMANTIC_RELATION_FAMILY,
//   JAVASCRIPT_SEMANTIC_NODE_KINDS,
//   JAVASCRIPT_SEMANTIC_RELATIONS,
//   type JavaScriptSemanticGraphInput,
// } from "./javascriptSemanticGraphSchemas.js";
// import {
//   createJavaScriptSemanticGraph,
//   createJavaScriptSemanticGraphNode,
//   createJavaScriptSemanticGraphRelation,
//   createJavaScriptSemanticGraphUnknown,
//   createImmutableJavaScriptSemanticGraphSteps,
//   isValidatedImmutableJavaScriptSemanticGraph,
//   JavaScriptSemanticEvidenceContextRegistry,
//   javaScriptSemanticGraphSchema,
//   resolveJavaScriptSemanticEvidence,
//   type JavaScriptSemanticGraph,
// } from "./javascriptSemanticGraph.js";
// import type { JavaScriptSemanticGraphNode } from "./javascriptSemanticGraphSchemas.js";
// import {
//   parseJavaScriptSemanticGraph,
//   serializeJavaScriptSemanticGraph,
// } from "./javascriptSemanticGraphSerialization.js";
// import { queryJavaScriptSemanticGraph } from "./javascriptSemanticQuery.js";
//
// const SHA = "a".repeat(64);
// const node = (
//   kind: (typeof JAVASCRIPT_SEMANTIC_NODE_KINDS)[number],
//   role: string,
//   properties: Record<string, JsonValue> = {},
//   evidenceContexts: JavaScriptSemanticEvidenceContextRegistry,
//   options: {
//     readonly functionNodeId?: string | null;
//     readonly modulePath?: string;
//   } = {},
// ): JavaScriptSemanticGraphNode =>
//   createJavaScriptSemanticGraphNode(
//     {
//       kind,
//       identity: {
//         artifact_sha256: SHA,
//         module_path: options.modulePath ?? "bundle.js",
//         source_range: {
//           start: { line: 1, column: role.length },
//           end: { line: 1, column: role.length + 1 },
//         },
//         role_key: role,
//       },
//       function_node_id: options.functionNodeId ?? null,
//       application_node_ids: [],
//       label: role,
//       properties,
//       evidence: semanticGraphTestEvidence(),
//     },
//     evidenceContexts,
//   );
//
// it("accepts semantic module paths longer than the former schema ceiling", () => {
//   const modulePath = `${"segment/".repeat(600)}entry.js`;
//   const evidenceContexts = new JavaScriptSemanticEvidenceContextRegistry();
//   expect(
//     node("module", "long-path", {}, evidenceContexts, { modulePath }).identity
//       .module_path,
//   ).toBe(modulePath);
// });
//
// it("captures caller-owned node identity, properties, and provenance", () => {
//   const contexts = new JavaScriptSemanticEvidenceContextRegistry();
//   const input = {
//     kind: "literal",
//     identity: {
//       artifact_sha256: SHA,
//       module_path: "bundle.js",
//       source_range: null,
//       role_key: "literal",
//     },
//     function_node_id: null,
//     application_node_ids: [],
//     label: "literal",
//     properties: { nested: ["original"] },
//     evidence: semanticGraphTestEvidence(),
//   };
//   const captured = createJavaScriptSemanticGraphNode(input, contexts);
//   const expected = structuredClone(captured);
//   const expectedEvidence = structuredClone(input.evidence);
//
//   input.identity.module_path = "replaced.js";
//   input.properties.nested[0] = "replaced";
//   input.evidence.limitations.push("later mutation");
//   if (input.evidence.location.available)
//     input.evidence.location.value = {
//       kind: "artifact-path",
//       path: "replaced.js",
//     };
//
//   expect(captured).toEqual(expected);
//   expect(
//     resolveJavaScriptSemanticEvidence(
//       { evidence_contexts: contexts.contexts },
//       captured.evidence,
//     ),
//   ).toEqual(expectedEvidence);
// });
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
// const graphWithCandidateRelations = (): JavaScriptSemanticGraph => {
//   const base = semanticFixtureGraph();
//   const evidenceContexts = registryForGraph(base);
//   const relations = base.relations.map(
//     ({ relation_id: _relationId, ...relation }) =>
//       createJavaScriptSemanticGraphRelation(
//         {
//           ...relation,
//           resolution: "candidate",
//           evidence: resolveJavaScriptSemanticEvidence(base, relation.evidence),
//         },
//         evidenceContexts,
//       ),
//   );
//   const binding = base.nodes.find(({ label }) => label === "binding");
//   const callable = base.nodes.find(({ label }) => label === "function");
//   if (binding === undefined || callable === undefined)
//     throw new Error("Expected candidate-cycle endpoints");
//   for (const [source, target] of [
//     [binding, callable],
//     [callable, binding],
//   ] as const)
//     relations.push(
//       createJavaScriptSemanticGraphRelation(
//         {
//           source_node_id: source.node_id,
//           target_node_id: target.node_id,
//           relation: "owns",
//           resolution: "candidate",
//           properties: {},
//           evidence: semanticGraphTestEvidence("inferred"),
//         },
//         evidenceContexts,
//       ),
//     );
//
//   const { graph_id: _graphId, ...input } = base;
//   return createJavaScriptSemanticGraph({
//     ...input,
//     evidence_contexts: evidenceContexts.contexts,
//     relations,
//     coverage: {
//       ...input.coverage,
//       families: input.coverage.families.map((family) => ({
//         ...family,
//         retained_relations: relations.filter(
//           ({ relation }) =>
//             JAVASCRIPT_SEMANTIC_RELATION_FAMILY[relation] === family.family,
//         ).length,
//       })),
//     },
//   });
// };
//
// it("counts candidate edges by query direction and relation filter", () => {
//   const graph = graphWithCandidateRelations();
//   const binding = graph.nodes.find(({ label }) => label === "binding");
//   if (binding === undefined) throw new Error("Expected binding seed");
//   const query = (
//     direction: "forward-influence" | "backward-provenance",
//     allowedRelations: (typeof JAVASCRIPT_SEMANTIC_RELATIONS)[number][],
//   ) =>
//     queryJavaScriptSemanticGraph(graph, {
//       seed: { kind: "semantic-node", node_id: binding.node_id },
//       direction,
//       allowed_relations: allowedRelations,
export const _l = 197;
