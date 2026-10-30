export const __stub = 1;
//     });
//
//   expect(query("forward-influence", ["captures"]).status).toBe("ambiguous");
//   expect(query("forward-influence", ["defines"]).status).toBe("found");
//   expect(query("backward-provenance", ["defines"]).status).toBe("ambiguous");
//   expect(query("backward-provenance", ["captures"]).status).toBe("found");
// });
//
// it("matches scalar literal seeds and skips non-scalar literal metadata", () => {
//   const input = semanticFixtureInput();
//   const metadataContexts = new JavaScriptSemanticEvidenceContextRegistry();
//   const literals = [
//     node("literal", "string-seven", { value: "7" }, metadataContexts),
//     node("literal", "number-seven", { value: 7 }, metadataContexts),
//     node("literal", "boolean-true", { value: true }, metadataContexts),
//     node("literal", "null", { value: null }, metadataContexts),
//     node("literal", "empty-string", { value: "" }, metadataContexts),
//     node("literal", "zero", { value: 0 }, metadataContexts),
//     node("literal", "negative-zero", { value: -0 }, metadataContexts),
//     node("literal", "missing-value", {}, metadataContexts),
//     node(
//       "literal",
//       "structured-value",
//       { value: { nested: "metadata" } },
//       metadataContexts,
//     ),
//   ];
//   input.nodes.push(...literals);
//   const graph = createJavaScriptSemanticGraph(input);
//   const query = (value: string | number | boolean | null) =>
//     queryJavaScriptSemanticGraph(graph, {
//       seed: { kind: "literal", value },
//       direction: "forward-influence",
//     }).seed_node_ids;
//   const nodeId = (role: string) => {
//     const literal = literals.find(({ identity }) => identity.role_key === role);
//     if (literal === undefined) throw new Error(`Missing literal ${role}`);
//     return literal.node_id;
//   };
//
//   expect(query("7")).toEqual([nodeId("string-seven")]);
//   expect(query(7)).toEqual([nodeId("number-seven")]);
//   expect(query(true)).toEqual([nodeId("boolean-true")]);
//   expect(query(null)).toEqual([nodeId("null")]);
//   expect(query("")).toEqual([nodeId("empty-string")]);
//   expect(query(0)).toEqual(
//     [nodeId("zero"), nodeId("negative-zero")].toSorted(),
//   );
//   expect(query("unmatched")).toEqual([]);
// });
//
// it("scopes callers unknowns to call relations while preserving graph uncertainty", () => {
//   const contexts = new JavaScriptSemanticEvidenceContextRegistry();
//   const caller = node("function", "caller", {}, contexts);
//   const seed = node("function", "seed", {}, contexts);
//   const call = createJavaScriptSemanticGraphRelation(
//     {
//       source_node_id: caller.node_id,
//       target_node_id: seed.node_id,
//       relation: "calls",
//       resolution: "resolved",
//       properties: {},
//       evidence: semanticGraphTestEvidence("inferred"),
//     },
//     contexts,
//   );
//   const readUnknown = createJavaScriptSemanticGraphUnknown(
//     {
//       node_id: caller.node_id,
//       family: "data-flow",
//       relation_kinds: ["reads"],
//       reason: "dynamic-property",
//       detail: "Unresolved property read at the caller.",
//       candidate_node_ids: [],
//       evidence: unknownSemanticGraphTestEvidence(),
//     },
//     contexts,
//   );
//   const graph = createJavaScriptSemanticGraph({
//     schema: "JavaScriptSemanticRelationGraph",
//     root_artifact_sha256: SHA,
//     application_graph_id: `jag_${"b".repeat(64)}`,
//     root_node_ids: [seed.node_id],
//     evidence_contexts: contexts.contexts,
//     nodes: [caller, seed],
//     relations: [call],
//     fingerprints: [],
//     unknowns: [readUnknown],
//     coverage: {
//       status: "partial",
//       truncated: false,
//       omitted_nodes: null,
//       omitted_relations: null,
//       limits: [],
//       families: JAVASCRIPT_SEMANTIC_RELATION_FAMILIES.map((family) => ({
//         family,
//         status:
//           family === "data-flow" ? ("unknown" as const) : ("complete" as const),
//         retained_relations:
//           JAVASCRIPT_SEMANTIC_RELATION_FAMILY[call.relation] === family ? 1 : 0,
//         omitted_relations: family === "data-flow" ? null : 0,
//         unknown_ids: family === "data-flow" ? [readUnknown.unknown_id] : [],
//       })),
//     },
//     limitations: ["One property read remains unresolved."],
//   });
//   const query = (
//     direction: "callers" | "backward-provenance",
//     allowed_relations?: ["calls"],
//   ) =>
//     queryJavaScriptSemanticGraph(graph, {
//       seed: { kind: "semantic-node", node_id: seed.node_id },
//       direction,
//       ...(allowed_relations === undefined ? {} : { allowed_relations }),
//     });
//   const callers = query("callers");
//   const filtered = query("callers", ["calls"]);
//   const backward = query("backward-provenance");
//   expect(callers.summary.traversed_nodes).toBe(2);
//   expect(callers.unknowns).toEqual([]);
//   expect(callers.summary.relevant_unknowns).toBe(0);
//   expect(callers.limitations).not.toContain(
//     "Relevant dynamic, unsupported, incomplete, or ambiguous semantics remain unknown.",
//   );
//   expect(filtered.unknowns).toEqual(callers.unknowns);
//   expect(backward.unknowns.map(({ unknown_id }) => unknown_id)).toEqual([
//     readUnknown.unknown_id,
//   ]);
//   expect(callers.coverage.status).toBe("partial");
// });
//
// it("counts candidate ownership cycles once and traverses them finitely", () => {
//   const graph = graphWithCandidateRelations();
//   const binding = graph.nodes.find(({ label }) => label === "binding");
//   if (binding === undefined) throw new Error("Expected binding seed");
//   const result = queryJavaScriptSemanticGraph(graph, {
//     seed: { kind: "semantic-node", node_id: binding.node_id },
//     direction: "ownership",
//     allowed_relations: ["owns"],
//     include_ambiguous_dynamic_edges: true,
//   });
//
//   expect(result.status).toBe("ambiguous");
//   expect(result.relations).toHaveLength(2);
//   expect(result.summary.traversed_nodes).toBe(2);
//   expect(result.summary.traversed_relations).toBe(2);
//   expect(
//     queryJavaScriptSemanticGraph(graph, {
//       seed: { kind: "semantic-node", node_id: binding.node_id },
//       direction: "ownership",
//       allowed_relations: ["constructs-request"],
//     }).status,
//   ).toBe("found");
// });
//
// it("defines every required relation family and canonicalizes records", () => {
//   expect(JAVASCRIPT_SEMANTIC_RELATIONS).toContain("argument-to-parameter");
//   expect(JAVASCRIPT_SEMANTIC_RELATIONS).toContain("detaches-task");
//   expect(JAVASCRIPT_SEMANTIC_RELATIONS).toContain("forwards-signal");
//   expect(JAVASCRIPT_SEMANTIC_RELATIONS).toContain("validates");
//   const graph = semanticFixtureGraph();
//   expect(
//     parseJavaScriptSemanticGraph(
//       JSON.parse(serializeJavaScriptSemanticGraph(graph)),
//     ),
//   ).toEqual(graph);
//   expect(graph.nodes.map(({ node_id }) => node_id)).toEqual(
//     graph.nodes.map(({ node_id }) => node_id).toSorted(),
//   );
// });
//
// it("rejects stale identities, dangling endpoints, and incomplete coverage claims", () => {
//   const graph = semanticFixtureGraph();
//   expect(() =>
//     parseJavaScriptSemanticGraph({
//       ...graph,
//       graph_id: `jsrg_${"0".repeat(64)}`,
//     }),
//   ).toThrow();
//   expect(() =>
//     createJavaScriptSemanticGraph({
//       ...semanticFixtureInput(),
//       relations: [
//         {
//           ...semanticFixtureInput().relations[0],
//           target_node_id: `jsrg_node_${"f".repeat(64)}`,
//         },
//       ],
//     }),
//   ).toThrow();
//   expect(() =>
//     createJavaScriptSemanticGraph({
//       ...semanticFixtureInput(),
//       coverage: { ...semanticFixtureInput().coverage, omitted_nodes: 1 },
//     }),
//   ).toThrow(/Complete graph coverage/u);
//   const unknownGraphInput = semanticFixtureInput(true);
export const _l = 197;
