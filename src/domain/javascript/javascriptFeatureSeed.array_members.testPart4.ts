export const __stub = 1;
//       sourceEvidenceId,
//       graph,
//       nativeEvidence: [],
//       direction: "both",
//       seed: seed("api", "missingProject"),
//     });
//     expect(result.graph).toBeNull();
//     expect(result.seed_matches).toEqual([]);
//     expect(result.coverage).toEqual({
//       status: "no-match",
//       source_graph_status: "complete",
//       total_seed_matches: 0,
//     });
//     expect(result.evidence_links).toEqual([sourceEvidenceId]);
//     expect(result.limitations).toContain(
//       "No graph entity matched the literal seed; this is not evidence that the feature is absent.",
//     );
//   });
//
//   it("retains incomplete source coverage when an array member matches", () => {
//     const graph = contextBridgeGraph();
//     const { graph_id: _graphId, ...content } = graph;
//     const partialGraph = createJavaScriptApplicationGraph({
//       ...content,
//       limitations: ["Only one source file was analyzed."],
//       coverage: {
//         status: "partial",
//         truncated: false,
//         omitted_count: null,
//         limits: [],
//       },
//     });
//     const result = traceApplicationFeature({
//       sourceEvidenceId,
//       graph: partialGraph,
//       nativeEvidence: [],
//       direction: "both",
//       seed: seed("api"),
//     });
//     expect(result.coverage).toEqual({
//       status: "partial",
//       source_graph_status: "partial",
//       total_seed_matches: 1,
//     });
//     expect(result.graph?.coverage).toEqual(partialGraph.coverage);
//     expect(result.graph?.nodes).toEqual(partialGraph.nodes);
//     expect(result.limitations).toContain(
//       "The source application graph is incomplete; unmatched seeds and frontiers remain unknown.",
//     );
//   });
// });
//
// const sourceEvidenceId = `ev_${"b".repeat(64)}`;
//
// const seed = (
//   kind: ApplicationFeatureSeed["kind"],
//   value = "openProject",
// ): ApplicationFeatureSeed =>
//   applicationFeatureSeedSchema.parse({
//     kind,
//     value,
//     match: "exact",
//     case_sensitive: true,
//   });
//
// const memberNode = (
//   kind: ApplicationNode["kind"],
//   properties: Readonly<Record<string, JsonValue>>,
// ): ApplicationNode =>
//   createJavaScriptApplicationNode({
//     kind,
//     identity: {
//       strategy: "canonical-path",
//       stability: "artifact-version",
//       artifact_sha256: "a".repeat(64),
//       path: "preload.js",
//     },
//     observations: [
//       {
//         label: "desktopApi",
//         properties,
//         evidence: {
//           ...artifactEvidence(
//             "a".repeat(64),
//             "preload.js",
//             "ast-static-analysis",
//           ),
//           evidence_ids: [sourceEvidenceId],
//         },
//       },
//     ],
//   });
//
// const propertyMatch = (node: ApplicationNode, field: string) => ({
//   node_id: node.node_id,
//   kind: node.kind,
//   basis: "property",
//   field: `observations[0].properties.${field}`,
// });
//
// const contextBridgeGraph = () => {
//   const analysis = analyzeJavaScriptStaticSource(
//     "const { contextBridge } = require('electron');\ncontextBridge.exposeInMainWorld('desktopApi', { openProject() {}, closeProject() {} });",
//   );
//   expect(analysis.parse_status).toBe("complete");
//   const finding = analysis.electron.context_bridge_apis[0];
//   if (finding === undefined) throw new Error("Expected contextBridge finding");
//   expect(finding.api_key).toBe("desktopApi");
//   expect(finding.members).toEqual(["closeProject", "openProject"]);
//   expect(finding.unknown_members).toBe(0);
//   const node = memberNode("context-bridge-api", {
//     api_name: finding.api_key,
//     members: [...finding.members],
//     unknown_members: finding.unknown_members,
//   });
//   return createJavaScriptApplicationGraph({
//     schema: "JavaScriptApplicationGraph",
//     root_node_ids: [node.node_id],
//     nodes: [node],
//     edges: [],
//     coverage: completeCoverage,
//     limitations: [],
//   });
// };
export const _l = 124;
