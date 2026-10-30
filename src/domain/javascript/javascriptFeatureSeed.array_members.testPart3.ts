export const __stub = 1;
//     ]);
//   });
//
//   it.each([
//     {
//       kind: "route",
//       nodeKind: "endpoint",
//       properties: { endpoint_kind: "route", path: "/projects" },
//       value: "/projects",
//       field: "path",
//     },
//     {
//       kind: "channel",
//       nodeKind: "ipc-channel",
//       properties: { channel: "project:open" },
//       value: "project:open",
//       field: "channel",
//     },
//   ] as const)(
//     "preserves $kind scalar matching and node-kind restrictions",
//     ({ kind, nodeKind, properties, value, field }) => {
//       const node = memberNode(nodeKind, properties);
//       expect(findApplicationFeatureSeeds([node], seed(kind, value))).toEqual([
//         propertyMatch(node, field),
//       ]);
//       expect(
//         findApplicationFeatureSeeds(
//           [memberNode("context-bridge-api", properties)],
//           seed(kind, value),
//         ),
//       ).toEqual([]);
//     },
//   );
//
//   it.each(memberFields)(
//     "rejects $kind members on an unrelated node kind",
//     ({ kind, field }) => {
//       const node = memberNode("unknown", { [field]: ["openProject"] });
//       expect(findApplicationFeatureSeeds([node], seed(kind))).toEqual([]);
//     },
//   );
// });
//
// describe("public feature trace from contextBridge source members", () => {
//   it.each(["openProject", "missingProject"])(
//     "normalizes optional seed defaults before deriving trace identity for %s",
//     (value) => {
//       const input = {
//         sourceEvidenceId,
//         graph: contextBridgeGraph(),
//         nativeEvidence: [],
//         direction: "both" as const,
//       };
//       const omitted = traceApplicationFeature({
//         ...input,
//         seed: { kind: "api", value },
//       });
//       const explicit = traceApplicationFeature({
//         ...input,
//         seed: {
//           kind: "api",
//           value,
//           match: null,
//           case_sensitive: false,
//         },
//       });
//       expect(omitted).toEqual(explicit);
//     },
//   );
//
//   it("traces one exact member seed through the public feature workflow", () => {
//     const mode = {
//       value: "openProject",
//       match: "exact" as const,
//       case_sensitive: true,
//     };
//     const graph = contextBridgeGraph();
//     const before = structuredClone(graph);
//     const input = {
//       sourceEvidenceId,
//       graph,
//       nativeEvidence: [],
//       direction: "both" as const,
//     };
//     const generic = traceApplicationFeature({
//       ...input,
//       seed: { kind: "string", ...mode },
//     });
//     const typed = traceApplicationFeature({
//       ...input,
//       seed: { kind: "api", ...mode },
//     });
//
//     expect(typed.coverage).toEqual({
//       status: "complete-within-source",
//       source_graph_status: "complete",
//       total_seed_matches: 1,
//     });
//     expect(typed.seed_matches).toEqual(generic.seed_matches);
//     expect(typed.seed_matches).toEqual([
//       {
//         node_id: graph.nodes[0]?.node_id,
//         kind: "context-bridge-api",
//         basis: "property",
//         field: "observations[0].properties.members[1]",
//       },
//     ]);
//     expect(typed.graph?.nodes).toEqual(graph.nodes);
//     expect(typed.graph?.edges).toEqual([]);
//     expect(typed.evidence_links).toEqual([sourceEvidenceId]);
//     expect(typed.summary).toMatchObject({
//       matched_seeds: 1,
//       traced_nodes: 1,
//       traced_edges: 0,
//       observed_facts: 1,
//       inferred_facts: 0,
//       unknown_facts: 0,
//       unavailable_facts: 0,
//     });
//     expect(typed.native_handoffs).toEqual([]);
//     expect(graph).toEqual(before);
//   });
//
//   it("keeps a missing member explicit without changing source coverage", () => {
//     const graph = contextBridgeGraph();
//     const result = traceApplicationFeature({
export const _l = 126;
