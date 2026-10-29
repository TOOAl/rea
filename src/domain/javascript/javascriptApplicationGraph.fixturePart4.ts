export const __stub = 1;
//       artifactEvidence(
//         APPLICATION_GRAPH_DIGESTS.nativeAddon,
//         "native/synthetic.node",
//         "native-analysis-provider",
//       ),
//     ),
//     createJavaScriptApplicationEdge({
//       source_node_id: preloadNode.node_id,
//       target_node_id: runtimeNode.node_id,
//       relation: "observed_as",
//       properties: {},
//       evidence: runtimeEvidence("script-preload"),
//     }),
//   ];
// };
//
// /** Build a synthetic cross-layer Electron graph without proprietary artifacts. */
// export const buildSyntheticJavaScriptApplicationGraph =
//   (): JavaScriptApplicationGraph => {
//     const nodes = [
//       ...buildArtifactNodes(),
//       ...buildInteractionNodes(),
//       ...buildNativeRuntimeNodes(),
//     ];
//     const packageNode = nodes[0];
//     if (packageNode === undefined) {
//       throw new Error("Synthetic application graph fixture has no root node.");
//     }
//
//     return createJavaScriptApplicationGraph({
//       schema: "JavaScriptApplicationGraph",
//       root_node_ids: [packageNode.node_id],
//       nodes,
//       edges: buildEdges(nodes),
//       coverage: completeCoverage,
//       limitations: [
//         "Synthetic fixture demonstrates identity and authority boundaries only.",
//       ],
//     });
//   };
//
// /** Find the fixture node carrying an observation with the given label. */
// export const nodeByLabel = (
//   graph: JavaScriptApplicationGraph,
//   label: string,
// ): ApplicationNode => {
//   const node = graph.nodes.find(({ observations }) =>
//     observations.some((observation) => observation.label === label),
//   );
//   if (node === undefined) throw new TypeError(`Missing fixture node: ${label}`);
//   return node;
// };
//
// /** Return the first value, failing loudly when a fixture is empty. */
// export const firstOf = <Value>(
//   values: readonly Value[],
//   label: string,
// ): Value => {
//   const value = values[0];
//   if (value === undefined) throw new TypeError(`Missing fixture ${label}`);
//   return value;
// };
//
// /** Shared fixture helper. */
// export const graphForNode = (
//   node: ApplicationNode,
// ): JavaScriptApplicationGraph =>
//   createJavaScriptApplicationGraph({
//     schema: "JavaScriptApplicationGraph",
//     root_node_ids: [node.node_id],
//     nodes: [node],
//     edges: [],
//     coverage: completeCoverage,
//     limitations: [],
//   });
//
// /** Shared fixture helper. */
// export const unknownEvidence = (
//   limitations: string[] = ["The extractor could not classify this fact."],
// ): ApplicationGraphEvidence => ({
//   authority: "unknown",
//   state: "unknown",
//   confidence: "unknown",
//   artifact: {
//     available: false,
//     reason: "unknown",
//     detail: "Artifact provenance is unknown.",
//   },
//   location: {
//     available: false,
//     reason: "unknown",
//     detail: "Source location is unknown.",
//   },
//   extractor: {
//     name: "test",
//     version: "1",
//     operation: "unknown",
//     executable_sha256: null,
//   },
//   coverage: {
//     status: "unknown",
//     truncated: false,
//     omitted_count: null,
//     limits: [],
//   },
//   limitations,
//   evidence_ids: [],
// });
//
// /** Shared fixture helper. */
// export const contentNode = (
//   evidence: ApplicationGraphEvidence,
//   properties: Record<string, unknown> = {},
// ): ApplicationNode =>
//   createJavaScriptApplicationNode({
//     kind: "javascript-module",
//     identity: {
//       strategy: "content-digest",
//       stability: "global-exact",
//       sha256: APPLICATION_GRAPH_DIGESTS.asar,
//     },
//     observations: [{ label: "module", properties, evidence }],
//   });
export const _l = 123;
