export const __stub = 1;
//     direction: "ownership",
//     relation: "reads",
//     incoming: false,
//     relevant: false,
//   },
//   { direction: "ownership", relation: "owns", incoming: false, relevant: true },
//   { direction: "ownership", relation: "owns", incoming: true, relevant: true },
// ] as const)(
//   "limits $direction ambiguity to traversable $relation candidates (incoming=$incoming)",
//   ({ direction, relation, incoming, relevant }) => {
//     const evidenceContexts = new JavaScriptSemanticEvidenceContextRegistry();
//     const seed = node("function", "directional-seed", evidenceContexts);
//     const reached = node("function", "directional-reached", evidenceContexts);
//     const other = node("function", "directional-other", evidenceContexts);
//     const reverse =
//       direction === "callers" || direction === "backward-provenance";
//     const resolved = relationBetween(
//       reverse ? reached : seed,
//       reverse ? seed : reached,
//       direction === "ownership" ? "owns" : "calls",
//       evidenceContexts,
//     );
//     const candidate = relationBetween(
//       incoming ? other : reached,
//       incoming ? reached : other,
//       relation,
//       evidenceContexts,
//       "candidate",
//     );
//     const nodes = [seed, reached, other];
//     const control = queryJavaScriptSemanticGraph(
//       directionalGraph(nodes, [resolved], evidenceContexts),
//       {
//         seed: { kind: "semantic-node", node_id: seed.node_id },
//         direction,
//       },
//     );
//     expect(control).toMatchObject({
//       status: "found",
//       coverage: { status: "complete" },
//     });
//     for (const include of [false, true]) {
//       const result = queryJavaScriptSemanticGraph(
//         directionalGraph(nodes, [resolved, candidate], evidenceContexts),
//         {
//           seed: { kind: "semantic-node", node_id: seed.node_id },
//           direction,
//           include_ambiguous_dynamic_edges: include,
//         },
//       );
//       expect(result).toMatchObject({
//         status: relevant ? "ambiguous" : "found",
//         coverage: { status: relevant ? "partial" : "complete" },
//       });
//       if (!relevant || !include) {
//         expect(result.nodes).toEqual(control.nodes);
//         expect(result.relations).toEqual(control.relations);
//       } else {
//         expect(result.nodes).toHaveLength(3);
//         expect(result.relations).toContainEqual(
//           expect.objectContaining({
//             source_node_id: candidate.source_node_id,
//             target_node_id: candidate.target_node_id,
//             relation: candidate.relation,
//             resolution: candidate.resolution,
//           }),
//         );
//       }
//     }
//   },
// );
//
// it("excludes explicitly filtered candidates without hiding partial graph coverage", () => {
//   const evidenceContexts = new JavaScriptSemanticEvidenceContextRegistry();
//   const seed = node("function", "filtered-seed", evidenceContexts);
//   const other = node("function", "filtered-other", evidenceContexts);
//   const candidate = relationBetween(
//     seed,
//     other,
//     "reads",
//     evidenceContexts,
//     "candidate",
//   );
//   for (const partial of [false, true]) {
//     const result = queryJavaScriptSemanticGraph(
//       directionalGraph([seed, other], [candidate], evidenceContexts, partial),
//       {
//         seed: { kind: "semantic-node", node_id: seed.node_id },
//         direction: "forward-influence",
//         allowed_relations: ["calls"],
//       },
//     );
//     expect(result).toMatchObject({
//       status: "found",
//       coverage: { status: partial ? "partial" : "complete" },
//       relations: [],
//     });
//   }
// });
//
// it("keeps candidate uncertainty at the end of a long reachable path", () => {
//   const evidenceContexts = new JavaScriptSemanticEvidenceContextRegistry();
//   const chain = Array.from({ length: 72 }, (_, index) =>
//     node("binding", `candidate-chain-${index}`, evidenceContexts),
//   );
//   const relations = chain.slice(1).map((target, index) => {
//     const source = chain[index];
//     if (source === undefined) throw new TypeError("Missing chain source");
//     return relationBetween(
//       source,
//       target,
//       "reads",
//       evidenceContexts,
//       index === 70 ? "candidate" : "resolved",
//     );
//   });
//   const seed = chain[0];
//   if (seed === undefined) throw new TypeError("Missing chain seed");
//   for (const include of [false, true]) {
//     const result = queryJavaScriptSemanticGraph(
//       directionalGraph(chain, relations, evidenceContexts),
//       {
//         seed: { kind: "semantic-node", node_id: seed.node_id },
//         direction: "forward-influence",
//         include_ambiguous_dynamic_edges: include,
//       },
//     );
//     expect(result).toMatchObject({
//       status: "ambiguous",
//       coverage: { status: "partial" },
//     });
//     expect(result.nodes).toHaveLength(include ? 72 : 71);
//   }
// });
export const _l = 134;
