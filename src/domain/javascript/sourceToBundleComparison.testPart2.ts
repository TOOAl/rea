export const __stub = 1;
//         graph: applicationGraph("complete"),
//       },
//     });
//
//     expect(result.items[0]).toMatchObject({ status: "split" });
//     expect(result.coverage).toMatchObject({
//       status: "complete-within-inputs",
//       candidate_evaluations: 2,
//     });
//   });
// });
//
// describe("source to bundle digest changes", () => {
//   it("reports a located source with a different digest as modified", () => {
//     const node = createJavaScriptApplicationNode({
//       kind: "source-module",
//       identity: {
//         strategy: "source-map-original",
//         source_root: null,
//         stability: "source-map-exact",
//         source_map_sha256: HASH.artifact,
//         original_source: "webpack://fixture/./src/modified.ts",
//         source_sha256: HASH.unchanged,
//       },
//       observations: [
//         {
//           label: "display label",
//           source_map_reference: sourceMapReference(
//             "webpack://fixture/./src/modified.ts",
//             null,
//             "dist/main.js.map",
//           ),
//           properties: {
//             content_available: true,
//             content_sha256: HASH.unchanged,
//             source: "src/removed.ts",
//           },
//           evidence: artifactEvidence(HASH.artifact, "dist/main.js.map"),
//         },
//       ],
//     });
//     const graph = createJavaScriptApplicationGraph({
//       schema: "JavaScriptApplicationGraph",
//       root_node_ids: [node.node_id],
//       nodes: [node],
//       edges: [],
//       coverage: {
//         status: "complete",
//         truncated: false,
//         omitted_count: 0,
//         limits: [],
//       },
//       limitations: [],
//     });
//     const result = compareSourceToBundle({
//       reference: historicalGraph("complete", [
//         "src/modified.ts",
//         "src/removed.ts",
//       ]),
//       application: {
//         evidenceId: EVIDENCE_ID,
//         rootArtifactSha256: HASH.artifact,
//         graph,
//       },
//     });
//
//     expect(result.summary).toMatchObject({ modified: 1, unknown: 0 });
//     expect(item(result, "src/removed.ts").candidates).toEqual([]);
//     expect(item(result, "src/modified.ts")).toMatchObject({
//       status: "modified",
//       confidence: "high",
//       current_node_ids: [node.node_id],
//     });
//   });
// });
//
// describe("source to bundle Unicode path collisions", () => {
//   it("keeps colliding canonical-equivalent current paths ambiguous", () => {
//     const historicalPath = "src/a\u0301\u0323.ts";
//     const currentPaths = ["src/a\u0323\u0301.ts", "src/\u1ea1\u0301.ts"];
//     const nodes = currentPaths.map((path, index) =>
//       moduleNode(`unicode-${index}`, { path }),
//     );
//     const result = comparePathToNodes(historicalPath, nodes);
//     const mapping = item(result, historicalPath);
//
//     expect(mapping).toMatchObject({
//       status: "unknown",
//       confidence: "unknown",
//       current_node_ids: [],
//       candidates: [
//         expect.objectContaining({
//           signals: expect.arrayContaining([
//             expect.objectContaining({ kind: "unicode-equivalent-path" }),
//           ]),
//         }),
//         expect.objectContaining({
//           signals: expect.arrayContaining([
//             expect.objectContaining({ kind: "unicode-equivalent-path" }),
//           ]),
//         }),
//       ],
//       limitations: [
//         expect.stringContaining(
//           "filesystem paths with distinct Unicode spellings",
//         ),
//       ],
//     });
//   });
//
//   it("prefers a raw source-map path over canonically equivalent alternatives", () => {
//     const historicalPath = "src/cafe\u0301.ts";
//     const exact = sourceMapNode(
//       "exact",
//       "cafe\u0301.ts",
//       "../src/",
//       HASH.modified,
//     );
//     const equivalent = sourceMapNode(
//       "equivalent",
//       "caf\u00e9.ts",
//       "../src/",
//       HASH.removed,
//     );
//     const result = comparePathToNodes(historicalPath, [exact, equivalent]);
//
//     expect(item(result, historicalPath)).toMatchObject({
//       status: "modified",
//       current_node_ids: [exact.node_id],
//     });
//   });
//
//   it("finds Unicode-equivalent suffixes of absolute source-map URLs", () => {
//     const historicalPath = "src/caf\u00e9.ts";
//     const node = sourceMapNode(
//       "remote",
//       "cafe\u0301.ts",
//       "https://cdn.example/src/",
//       HASH.modified,
//     );
//     const result = comparePathToNodes(historicalPath, [node]);
//
//     expect(item(result, historicalPath)).toMatchObject({
//       status: "unknown",
//       current_node_ids: [],
//       candidates: [
//         expect.objectContaining({
//           current_node_id: node.node_id,
//           signals: expect.arrayContaining([
//             expect.objectContaining({
//               kind: "unicode-equivalent-path",
//               current_values: ["cdn.example/src/cafe\u0301.ts"],
//             }),
//           ]),
//         }),
//       ],
//     });
//   });
// });
//
// describe("source to bundle path syntax", () => {
//   it.each([
//     "src/modified#part.ts",
//     "src/modified?part.ts",
//     "pkg:app/src/modified#part.ts",
//     "pkg:app/src/modified?part.ts",
//     "data:/src/modified.ts",
//   ])("preserves literal filesystem punctuation in %s", (path) => {
//     const node = moduleNode("punctuated", { path });
//     const graph = createJavaScriptApplicationGraph({
//       schema: "JavaScriptApplicationGraph",
//       root_node_ids: [node.node_id],
//       nodes: [node],
//       edges: [],
//       coverage: {
//         status: "complete",
//         truncated: false,
//         omitted_count: 0,
//         limits: [],
//       },
//       limitations: [],
//     });
//     const result = compareSourceToBundle({
export const _l = 183;
