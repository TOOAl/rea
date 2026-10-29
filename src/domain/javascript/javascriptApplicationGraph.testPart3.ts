export const __stub = 1;
//       sourceModule.observations,
//       "source observation",
//     );
//     const {
//       source_map_reference,
//       observation_id,
//       identifier_strategy,
//       ...withoutReference
//     } = sourceObservation;
//     void observation_id;
//     void identifier_strategy;
//     expect(() =>
//       graphForNode(
//         createJavaScriptApplicationNode({
//           kind: sourceModule.kind,
//           identity: sourceModule.identity,
//           observations: [withoutReference],
//         }),
//       ),
//     ).toThrow(/Source-map observation/u);
//     expect(() =>
//       graphForNode(
//         createJavaScriptApplicationNode({
//           kind: sourceModule.kind,
//           identity: sourceModule.identity,
//           observations: [
//             {
//               ...withoutReference,
//               source_map_reference: {
//                 ...source_map_reference,
//                 map_path: "different/map.js.map",
//               },
//             },
//           ],
//         }),
//       ),
//     ).toThrow(/Source-map observation/u);
//   });
// });
//
// describe("JavaScript Application Graph: source-map digest consistency", () => {
//   it("rejects source-map observations that contradict a known original digest", () => {
//     const sourceMapNode = (
//       identityDigest: string | null,
//       observedDigest: unknown,
//       contentAvailable?: boolean,
//     ) =>
//       createJavaScriptApplicationNode({
//         kind: "source-module",
//         identity: {
//           strategy: "source-map-original",
//           source_root: null,
//           stability: "source-map-exact",
//           source_map_sha256: APPLICATION_GRAPH_DIGESTS.asar,
//           original_source: "src/editor.ts",
//           source_sha256: identityDigest,
//         },
//         observations: [
//           {
//             label: null,
//             source_map_reference: sourceMapReference(
//               "src/editor.ts",
//               null,
//               "dist/app.js.map",
//             ),
//             properties: {
//               ...(contentAvailable === undefined
//                 ? {}
//                 : { content_available: contentAvailable }),
//               ...(observedDigest === undefined
//                 ? {}
//                 : { content_sha256: observedDigest }),
//             },
//             evidence: artifactEvidence(
//               APPLICATION_GRAPH_DIGESTS.asar,
//               "dist/app.js.map",
//               "ast-static-analysis",
//             ),
//           },
//         ],
//       });
//
//     expect(() =>
//       graphForNode(sourceMapNode("2".repeat(64), "3".repeat(64))),
//     ).toThrow(/Source-map observation/u);
//     expect(() => graphForNode(sourceMapNode(null, "3".repeat(64)))).toThrow(
//       /Source-map observation/u,
//     );
//     expect(() => graphForNode(sourceMapNode(null, 7))).toThrow(
//       /Source-map observation/u,
//     );
//     expect(() =>
//       graphForNode(sourceMapNode("3".repeat(64), "3".repeat(64))),
//     ).not.toThrow();
//     expect(() =>
//       graphForNode(sourceMapNode("3".repeat(64), "3".repeat(64), false)),
//     ).toThrow(/Source-map observation/u);
//     expect(() =>
//       graphForNode(sourceMapNode("3".repeat(64), null, false)),
//     ).toThrow(/Source-map observation/u);
//     expect(() =>
//       graphForNode(sourceMapNode("3".repeat(64), null, true)),
//     ).toThrow(/Source-map observation/u);
//     expect(() =>
//       graphForNode(sourceMapNode("3".repeat(64), undefined)),
//     ).toThrow(/Source-map observation/u);
//     expect(() => graphForNode(sourceMapNode(null, null, true))).toThrow(
//       /Source-map observation/u,
//     );
//     expect(() =>
//       graphForNode(sourceMapNode("3".repeat(64), "3".repeat(64), undefined)),
//     ).not.toThrow();
//   });
// });
//
// describe("JavaScript Application Graph: commitments and schemas", () => {
//   it("rejects unknown fields and stale commitments", () => {
//     const graph = buildSyntheticJavaScriptApplicationGraph();
//     expect(() =>
//       parseJavaScriptApplicationGraph({ ...graph, surprise: true }),
//     ).toThrow();
//
//     const staleGraph = structuredClone(graph);
//     staleGraph.graph_id = `jag_${"f".repeat(64)}`;
//     expect(() => parseJavaScriptApplicationGraph(staleGraph)).toThrow(
//       /Graph identifier/u,
//     );
//
//     const staleNode = structuredClone(graph);
//     firstOf(staleNode.nodes, "node").node_id = `jag_node_${"f".repeat(64)}`;
//     expect(() => parseJavaScriptApplicationGraph(staleNode)).toThrow(
//       /Node identifier/u,
//     );
//
//     const staleObservation = structuredClone(graph);
//     firstOf(
//       firstOf(staleObservation.nodes, "node").observations,
//       "observation",
//     ).observation_id = `jag_observation_${"f".repeat(64)}`;
//     expect(() => parseJavaScriptApplicationGraph(staleObservation)).toThrow(
//       /Observation identifier/u,
//     );
//
//     const staleEdge = structuredClone(graph);
//     firstOf(staleEdge.edges, "edge").edge_id = `jag_edge_${"f".repeat(64)}`;
//     expect(() => parseJavaScriptApplicationGraph(staleEdge)).toThrow(
//       /Edge identifier/u,
//     );
//   });
//
//   it("creates exactly the graph the public schema accepts", () => {
//     const graph = buildSyntheticJavaScriptApplicationGraph();
//     expect(JSON.stringify(graph)).toBe(
//       JSON.stringify(
//         javascriptApplicationGraphSchema.parse(structuredClone(graph)),
//       ),
//     );
//
//     const { graph_id: _graphId, ...semantic } = structuredClone(graph);
//     firstOf(semantic.edges, "edge").edge_id = `jag_edge_${"f".repeat(64)}`;
//     expect(() => createJavaScriptApplicationGraph(semantic)).toThrow(
//       /Edge identifier/u,
//     );
//   });
// });
//
// describe("JavaScript Application Graph: duplicate and orphan rejection", () => {
//   it("rejects duplicate nodes, missing roots, dangling edges, and self edges", () => {
//     const graph = buildSyntheticJavaScriptApplicationGraph();
//     const { graph_id: _graphId, ...semantic } = graph;
//     const source = firstOf(semantic.nodes, "node");
//     expect(() =>
//       createJavaScriptApplicationGraph({
//         ...semantic,
//         nodes: [...semantic.nodes, source],
//       }),
//     ).toThrow(/Nodes must be sorted and unique/u);
//     expect(() =>
//       createJavaScriptApplicationGraph({
//         ...semantic,
//         root_node_ids: [`jag_node_${"9".repeat(64)}`],
//       }),
//     ).toThrow(/Root identifier/u);
//
//     const missingId = `jag_node_${"9".repeat(64)}`;
//     const dangling = createJavaScriptApplicationEdge({
//       source_node_id: source.node_id,
//       target_node_id: missingId,
//       relation: "loads",
//       properties: {},
//       evidence: inferredArtifactEvidence(
//         APPLICATION_GRAPH_DIGESTS.asar,
//         "dist/main.js",
//       ),
//     });
//     expect(() =>
//       createJavaScriptApplicationGraph({
//         ...semantic,
//         edges: [...semantic.edges, dangling],
//       }),
//     ).toThrow(/endpoints must name graph nodes/u);
//
//     const selfEdge = createJavaScriptApplicationEdge({
//       source_node_id: source.node_id,
//       target_node_id: source.node_id,
//       relation: "imports",
//       properties: {},
//       evidence: inferredArtifactEvidence(
//         APPLICATION_GRAPH_DIGESTS.asar,
//         "dist/main.js",
//       ),
//     });
//     expect(() =>
//       createJavaScriptApplicationGraph({
//         ...semantic,
//         edges: [...semantic.edges, selfEdge],
//       }),
//     ).toThrow(/self-referential/u);
//   });
//
//   it("allows changed_from only between entities of the same kind", () => {
//     const graph = buildSyntheticJavaScriptApplicationGraph();
//     const preload = nodeByLabel(graph, "desktop preload");
//     const runtime = nodeByLabel(graph, "preload runtime script");
//     const earlierPreload = createJavaScriptApplicationNode({
//       kind: "electron-preload",
//       identity: {
//         strategy: "canonical-path",
//         stability: "artifact-version",
//         artifact_sha256: "7".repeat(64),
//         path: "dist/preload.js",
//       },
//       observations: [
//         {
//           label: "earlier preload",
//           properties: {},
//           evidence: artifactEvidence("7".repeat(64), "dist/preload.js"),
//         },
export const _l = 238;
