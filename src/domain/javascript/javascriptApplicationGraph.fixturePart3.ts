export const __stub = 1;
//       namespace: "napi-export",
//       key: "openProject",
//     },
//     "openProject",
//     { calling_convention: "napi" },
//     artifactEvidence(
//       APPLICATION_GRAPH_DIGESTS.nativeAddon,
//       "native/synthetic.node",
//       "native-analysis-provider",
//     ),
//   ),
//   fixtureNode(
//     "runtime-script-instance",
//     {
//       strategy: "runtime-instance",
//       stability: "capture-only",
//       capture_sha256: APPLICATION_GRAPH_DIGESTS.capture,
//       runtime_key: "script-preload",
//     },
//     "preload runtime script",
//     { url: "file:///synthetic/dist/preload.js" },
//     runtimeEvidence("script-preload"),
//   ),
// ];
//
// const observedEdge = (
//   sourceNodeId: string,
//   targetNodeId: string,
//   relation: "contains" | "exposes" | "handles",
//   evidence: ApplicationGraphEvidence,
// ) =>
//   createJavaScriptApplicationEdge({
//     source_node_id: sourceNodeId,
//     target_node_id: targetNodeId,
//     relation,
//     properties: {},
//     evidence,
//   });
//
// const inferredEdge = (
//   sourceNodeId: string,
//   targetNodeId: string,
//   relation: "invokes" | "calls" | "loads",
//   path: string,
// ) =>
//   createJavaScriptApplicationEdge({
//     source_node_id: sourceNodeId,
//     target_node_id: targetNodeId,
//     relation,
//     properties: {},
//     evidence: inferredArtifactEvidence(APPLICATION_GRAPH_DIGESTS.asar, path),
//   });
//
// const buildEdges = (nodes: FixtureNode[]) => {
//   const [packageNode, asarNode, preloadNode, bridgeNode, channelNode] = nodes;
//   const [handlerNode, addonNode, exportNode, runtimeNode] = nodes.slice(5);
//   if (
//     packageNode === undefined ||
//     asarNode === undefined ||
//     preloadNode === undefined ||
//     bridgeNode === undefined ||
//     channelNode === undefined ||
//     handlerNode === undefined ||
//     addonNode === undefined ||
//     exportNode === undefined ||
//     runtimeNode === undefined
//   ) {
//     throw new Error(
//       "Synthetic application graph fixture nodes are incomplete.",
//     );
//   }
//   return [
//     observedEdge(
//       packageNode.node_id,
//       asarNode.node_id,
//       "contains",
//       artifactEvidence(APPLICATION_GRAPH_DIGESTS.package, "resources/app.asar"),
//     ),
//     observedEdge(
//       asarNode.node_id,
//       preloadNode.node_id,
//       "contains",
//       artifactEvidence(APPLICATION_GRAPH_DIGESTS.asar, "dist/preload.js"),
//     ),
//     observedEdge(
//       preloadNode.node_id,
//       bridgeNode.node_id,
//       "exposes",
//       artifactEvidence(
//         APPLICATION_GRAPH_DIGESTS.asar,
//         "dist/preload.js",
//         "ast-static-analysis",
//       ),
//     ),
//     inferredEdge(
//       bridgeNode.node_id,
//       channelNode.node_id,
//       "invokes",
//       "dist/preload.js",
//     ),
//     observedEdge(
//       channelNode.node_id,
//       handlerNode.node_id,
//       "handles",
//       artifactEvidence(
//         APPLICATION_GRAPH_DIGESTS.asar,
//         "dist/main.js",
//         "ast-static-analysis",
//       ),
//     ),
//     inferredEdge(
//       handlerNode.node_id,
//       addonNode.node_id,
//       "loads",
//       "dist/main.js",
//     ),
//     inferredEdge(
//       handlerNode.node_id,
//       exportNode.node_id,
//       "calls",
//       "dist/main.js",
//     ),
//     observedEdge(
//       addonNode.node_id,
//       exportNode.node_id,
//       "contains",
export const _l = 126;
