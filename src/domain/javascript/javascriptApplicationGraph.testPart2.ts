export const __stub = 1;
//         {
//           label: "observed module",
//           properties: {},
//           evidence: artifactEvidence(
//             APPLICATION_GRAPH_DIGESTS.asar,
//             "dist/module.js",
//           ),
//         },
//         {
//           label: null,
//           properties: { question: "runtime correspondence" },
//           evidence: unknownEvidence(),
//         },
//       ],
//     });
//
//     const graph = graphForNode(node);
//     expect(
//       graph.nodes[0]?.observations.find(
//         ({ evidence }) => evidence.state === "unknown",
//       )?.evidence,
//     ).toMatchObject({ authority: "unknown", confidence: "unknown" });
//   });
//
//   it("separates stable entity identity from changing observations", () => {
//     const identity = {
//       strategy: "canonical-path" as const,
//       stability: "artifact-version" as const,
//       artifact_sha256: APPLICATION_GRAPH_DIGESTS.asar,
//       path: "dist/chunk.js",
//     };
//     const first = createJavaScriptApplicationNode({
//       kind: "javascript-chunk",
//       identity,
//       observations: [
//         {
//           label: "first label",
//           properties: { modules: 10 },
//           evidence: artifactEvidence(
//             APPLICATION_GRAPH_DIGESTS.asar,
//             "dist/chunk.js",
//             "ast-static-analysis",
//           ),
//         },
//       ],
//     });
//     const second = createJavaScriptApplicationNode({
//       kind: "javascript-chunk",
//       identity,
//       observations: [
//         {
//           label: "renamed chunk",
//           properties: { modules: 11 },
//           evidence: artifactEvidence(
//             APPLICATION_GRAPH_DIGESTS.asar,
//             "dist/chunk.js",
//             "ast-static-analysis",
//           ),
//         },
//       ],
//     });
//
//     expect(first.node_id).toBe(second.node_id);
//     expect(first.observations[0]?.observation_id).not.toBe(
//       second.observations[0]?.observation_id,
//     );
//   });
// });
//
// describe("JavaScript Application Graph: identity and evidence", () => {
//   it("normalizes structural identity and evidence set ordering", () => {
//     const evidence = inferredArtifactEvidence(
//       APPLICATION_GRAPH_DIGESTS.asar,
//       "dist/module.js",
//     );
//     evidence.limitations = ["z limitation", "a limitation", "a limitation"];
//     evidence.evidence_ids = [
//       `ev_${"b".repeat(64)}`,
//       `ev_${"a".repeat(64)}`,
//       `ev_${"a".repeat(64)}`,
//     ];
//     evidence.coverage.limits = [
//       { name: "modules", value: 100, unit: "items" },
//       { name: "modules", value: 100, unit: "items" },
//     ];
//     const node = createJavaScriptApplicationNode({
//       kind: "javascript-module",
//       identity: {
//         strategy: "structural-fingerprint",
//         stability: "cross-version-inference",
//         algorithm: "synthetic-v1",
//         fingerprint_sha256: "5".repeat(64),
//         basis: ["syntax-tree", "imports", "syntax-tree"],
//       },
//       observations: [{ label: "module", properties: {}, evidence }],
//     });
//
//     expect(node.identity).toMatchObject({ basis: ["imports", "syntax-tree"] });
//     expect(node.observations[0]?.evidence.limitations).toEqual([
//       "a limitation",
//       "z limitation",
//     ]);
//     expect(node.observations[0]?.evidence.evidence_ids).toEqual([
//       `ev_${"a".repeat(64)}`,
//       `ev_${"b".repeat(64)}`,
//     ]);
//     expect(node.observations[0]?.evidence.coverage.limits).toEqual([
//       { name: "modules", value: 100, unit: "items" },
//     ]);
//     expect(graphForNode(node).nodes).toEqual([node]);
//   });
//
//   it("scopes runtime identities to a capture and artifact paths to a version", () => {
//     const runtime = nodeByLabel(
//       buildSyntheticJavaScriptApplicationGraph(),
//       "preload runtime script",
//     );
//     const differentCapture = createJavaScriptApplicationNode({
//       kind: "runtime-script-instance",
//       identity: {
//         strategy: "runtime-instance",
//         stability: "capture-only",
//         capture_sha256: "6".repeat(64),
//         runtime_key: "script-preload",
//       },
//       observations: [
//         {
//           label: "other capture",
//           properties: {},
//           evidence: {
//             ...runtimeEvidence("script-preload"),
//             location: {
//               available: true,
//               value: {
//                 kind: "runtime",
//                 capture_sha256: "6".repeat(64),
//                 target_key: "target-main",
//                 frame_key: "frame-main",
//                 script_key: "script-preload",
//               },
//             },
//           },
//         },
//       ],
//     });
//     expect(differentCapture.node_id).not.toBe(runtime.node_id);
//
//     const firstArtifact = createJavaScriptApplicationNode({
//       kind: "javascript-asset",
//       identity: {
//         strategy: "canonical-path",
//         stability: "artifact-version",
//         artifact_sha256: APPLICATION_GRAPH_DIGESTS.asar,
//         path: "dist/app.js",
//       },
//       observations: [
//         {
//           label: null,
//           properties: {},
//           evidence: artifactEvidence(
//             APPLICATION_GRAPH_DIGESTS.asar,
//             "dist/app.js",
//           ),
//         },
//       ],
//     });
//     const secondArtifact = createJavaScriptApplicationNode({
//       kind: "javascript-asset",
//       identity: {
//         strategy: "canonical-path",
//         stability: "artifact-version",
//         artifact_sha256: "7".repeat(64),
//         path: "dist/app.js",
//       },
//       observations: [
//         {
//           label: null,
//           properties: {},
//           evidence: artifactEvidence("7".repeat(64), "dist/app.js"),
//         },
//       ],
//     });
//     expect(firstArtifact.node_id).not.toBe(secondArtifact.node_id);
//   });
// });
//
// describe("JavaScript Application Graph: source maps and observations", () => {
//   it("admits source-map and observation-scoped identities only with supporting observations", () => {
//     const sourceModule = createJavaScriptApplicationNode({
//       kind: "source-module",
//       identity: {
//         strategy: "source-map-original",
//         source_root: null,
//         stability: "source-map-exact",
//         source_map_sha256: APPLICATION_GRAPH_DIGESTS.asar,
//         original_source: "webpack:///src/editor.ts",
//         source_sha256: null,
//       },
//       observations: [
//         {
//           label: "src/editor.ts",
//           source_map_reference: sourceMapReference(
//             "webpack:///src/editor.ts",
//             null,
//             "dist/app.js.map",
//           ),
//           properties: { recovered_from: "source-map" },
//           evidence: artifactEvidence(
//             APPLICATION_GRAPH_DIGESTS.asar,
//             "dist/app.js.map",
//             "ast-static-analysis",
//           ),
//         },
//       ],
//     });
//     const observationScoped = createJavaScriptApplicationNode({
//       kind: "unknown",
//       identity: {
//         strategy: "observation-fingerprint",
//         stability: "observation-only",
//         observation_sha256: "8".repeat(64),
//         scope: "synthetic static inventory",
//       },
//       observations: [
//         {
//           label: "unclassified entity",
//           properties: {},
//           evidence: artifactEvidence(
//             APPLICATION_GRAPH_DIGESTS.asar,
//             "dist/app.js",
//           ),
//         },
//       ],
//     });
//
//     expect(graphForNode(sourceModule).nodes).toEqual([sourceModule]);
//     expect(graphForNode(observationScoped).nodes).toEqual([observationScoped]);
//     const sourceObservation = firstOf(
export const _l = 238;
