export const __stub = 1;
//
//   expect(result).toMatchObject({
//     status: "no-match",
//     seed_node_ids: [],
//     nodes: [],
//     summary: { total_seed_matches: 0, traversed_nodes: 0 },
//   });
// });
//
// it("returns the complete deterministic forward influence result inline", () => {
//   const graph = semanticFixtureGraph();
//   const input = {
//     seed: { kind: "literal" as const, value: "TOKEN" },
//     direction: "forward-influence" as const,
//     expected: { role: "sink" as const, classes: ["request" as const] },
//   };
//   const first = queryJavaScriptSemanticGraph(graph, input);
//   expect(first).toMatchObject({
//     status: "found",
//     summary: { traversed_nodes: 4, traversed_relations: 3 },
//     relations: expect.any(Array),
//   });
//   expect(first.expected_match_node_ids).toHaveLength(1);
//   expect(first.relations).toHaveLength(3);
// });
//
// it("returns only the referenced evidence contexts with resolvable trace facts", () => {
//   const graph = semanticFixtureGraph();
//   const result = queryJavaScriptSemanticGraph(graph, {
//     seed: { kind: "literal", value: "TOKEN" },
//     direction: "forward-influence",
//   });
//   const expectedContextIds = [
//     ...new Set([
//       ...result.nodes.map(({ evidence }) => evidence.context_id),
//       ...result.relations.map(({ evidence }) => evidence.context_id),
//       ...result.unknowns.map(({ evidence }) => evidence.context_id),
//     ]),
//   ].sort();
//   expect(result.evidence_contexts.map(({ context_id }) => context_id)).toEqual(
//     expectedContextIds,
//   );
//   for (const node of result.nodes)
//     expect(resolveJavaScriptSemanticEvidence(result, node.evidence)).toEqual(
//       resolveJavaScriptSemanticEvidence(graph, node.evidence),
//     );
// });
//
// it("traverses paths beyond the former fixed depth ceiling", () => {
//   const original = semanticFixtureGraph();
//   const input = constructionInput(original);
//   const evidenceContexts = registryForGraph(original);
//   const request = original.nodes.find(({ kind }) => kind === "request");
//   if (request === undefined) throw new TypeError("Missing request node");
//   const chain = Array.from({ length: 70 }, (_, index) =>
//     node("binding", `long-chain-${index}`, evidenceContexts),
//   );
//   const chainRelations = chain.map((target, index) =>
//     createJavaScriptSemanticGraphRelation(
//       {
//         source_node_id: chain[index - 1]?.node_id ?? request.node_id,
//         target_node_id: target.node_id,
//         relation: "reads",
//         resolution: "resolved",
//         properties: {},
//         evidence: semanticGraphTestEvidence("inferred"),
//       },
//       evidenceContexts,
//     ),
//   );
//   const graph = createJavaScriptSemanticGraph({
//     ...input,
//     evidence_contexts: evidenceContexts.contexts,
//     nodes: [...input.nodes, ...chain],
//     relations: [...input.relations, ...chainRelations],
//     coverage: {
//       ...original.coverage,
//       families: original.coverage.families.map((family) =>
//         family.family === "data-flow"
//           ? {
//               ...family,
//               retained_relations:
//                 family.retained_relations + chainRelations.length,
//             }
//           : family,
//       ),
//     },
//   });
//
//   const result = queryJavaScriptSemanticGraph(graph, {
//     seed: { kind: "literal", value: "TOKEN" },
//     direction: "forward-influence",
//   });
//
//   expect(result.summary.traversed_nodes).toBe(74);
//   expect(result.nodes).toHaveLength(74);
// });
//
// it("accepts deeply nested semantic properties", () => {
//   let nested: JsonValue = "leaf";
//   for (let index = 0; index < 12; index += 1)
//     nested = { [`level-${String(index)}`]: nested };
//
//   const result = node(
//     "binding",
//     "deep-properties",
//     new JavaScriptSemanticEvidenceContextRegistry(),
//     { nested },
//   );
//
//   expect(result.properties).toEqual({ nested });
// });
//
// it("keeps relevant dynamic frontiers unknown", () => {
//   const result = queryJavaScriptSemanticGraph(semanticFixtureGraph(true), {
//     seed: { kind: "literal", value: "TOKEN" },
//     direction: "forward-influence",
//   });
//   expect(result.status).toBe("found");
//   expect(result.coverage.status).toBe("partial");
//   expect(result.unknowns).toMatchObject([
//     { reason: "dynamic-call", relation_kinds: ["calls"] },
//   ]);
// });
//
// it("excludes candidate edges unless the caller explicitly opts in", () => {
//   const graph = graphWithCandidateEdge();
//   const input = {
//     seed: { kind: "literal" as const, value: "TOKEN" },
//     direction: "forward-influence" as const,
//     allowed_relations: ["supplies-request-field" as const],
//   };
//   const conservative = queryJavaScriptSemanticGraph(graph, input);
//   const optedIn = queryJavaScriptSemanticGraph(graph, {
//     ...input,
//     include_ambiguous_dynamic_edges: true,
export const _l = 136;
