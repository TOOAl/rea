export const __stub = 1;
//       ],
//     });
//     const changedFrom = createJavaScriptApplicationEdge({
//       source_node_id: preload.node_id,
//       target_node_id: earlierPreload.node_id,
//       relation: "changed_from",
//       properties: {},
//       evidence: inferredArtifactEvidence(
//         APPLICATION_GRAPH_DIGESTS.asar,
//         "dist/preload.js",
//       ),
//     });
//     expect(
//       createJavaScriptApplicationGraph({
//         schema: "JavaScriptApplicationGraph",
//         root_node_ids: [preload.node_id],
//         nodes: [preload, earlierPreload],
//         edges: [changedFrom],
//         coverage: completeCoverage,
//         limitations: [],
//       }).edges,
//     ).toEqual([changedFrom]);
//
//     const invalid = createJavaScriptApplicationEdge({
//       source_node_id: preload.node_id,
//       target_node_id: runtime.node_id,
//       relation: "changed_from",
//       properties: {},
//       evidence: inferredArtifactEvidence(
//         APPLICATION_GRAPH_DIGESTS.asar,
//         "dist/preload.js",
//       ),
//     });
//     expect(() =>
//       createJavaScriptApplicationGraph({
//         schema: "JavaScriptApplicationGraph",
//         root_node_ids: [preload.node_id],
//         nodes: [preload, runtime],
//         edges: [invalid],
//         coverage: completeCoverage,
//         limitations: [],
//       }),
//     ).toThrow(/changed_from endpoints must have the same node kind/u);
//   });
// });
//
// describe("JavaScript Application Graph: identity strategy requirements", () => {
//   it("requires every identity strategy to have compatible supporting evidence", () => {
//     const mismatchedPath = createJavaScriptApplicationNode({
//       kind: "javascript-asset",
//       identity: {
//         strategy: "canonical-path",
//         stability: "artifact-version",
//         artifact_sha256: APPLICATION_GRAPH_DIGESTS.asar,
//         path: "dist/expected.js",
//       },
//       observations: [
//         {
//           label: null,
//           properties: {},
//           evidence: artifactEvidence(
//             APPLICATION_GRAPH_DIGESTS.asar,
//             "dist/other.js",
//           ),
//         },
//       ],
//     });
//     expect(() => graphForNode(mismatchedPath)).toThrow(
//       /identity is not supported/u,
//     );
//
//     const runtimeWithStaticEvidence = createJavaScriptApplicationNode({
//       kind: "runtime-script-instance",
//       identity: {
//         strategy: "runtime-instance",
//         stability: "capture-only",
//         capture_sha256: APPLICATION_GRAPH_DIGESTS.capture,
//         runtime_key: "script-preload",
//       },
//       observations: [
//         {
//           label: null,
//           properties: {},
//           evidence: artifactEvidence(
//             APPLICATION_GRAPH_DIGESTS.asar,
//             "dist/preload.js",
//             "ast-static-analysis",
//           ),
//         },
//       ],
//     });
//     expect(() => graphForNode(runtimeWithStaticEvidence)).toThrow(
//       /identity is not supported/u,
//     );
//
//     const mismatchedDigest = contentNode(
//       artifactEvidence("7".repeat(64), "dist/module.js"),
//     );
//     expect(() => graphForNode(mismatchedDigest)).toThrow(
//       /identity is not supported/u,
//     );
//   });
//
//   it("prevents static authorities from claiming runtime locations", () => {
//     const evidence = artifactEvidence(
//       APPLICATION_GRAPH_DIGESTS.asar,
//       "dist/module.js",
//       "ast-static-analysis",
//     );
//     evidence.location = runtimeEvidence("script-module").location;
//     expect(() => graphForNode(contentNode(evidence))).toThrow(
//       /cannot claim a runtime location/u,
//     );
//   });
//
//   it("enforces epistemic truthfulness and content-addressed artifacts", () => {
//     const inferredAsObserved = inferredArtifactEvidence(
//       APPLICATION_GRAPH_DIGESTS.asar,
//       "dist/module.js",
//     );
//     inferredAsObserved.state = "observed";
//     inferredAsObserved.confidence = "exact";
//     expect(() => contentNode(inferredAsObserved)).toThrow(
//       /must remain inferred/u,
//     );
//
//     const inferenceWithoutLimit = inferredArtifactEvidence(
//       APPLICATION_GRAPH_DIGESTS.asar,
//       "dist/module.js",
//     );
//     inferenceWithoutLimit.limitations = [];
//     expect(() => contentNode(inferenceWithoutLimit)).toThrow(
//       /Inferred facts require an explicit limitation/u,
//     );
//
//     const unknownWithoutLimit = unknownEvidence([]);
//     expect(() => contentNode(unknownWithoutLimit)).toThrow(
//       /require unknown confidence and an explicit limitation/u,
//     );
//
//     const missingArtifact = artifactEvidence(
//       APPLICATION_GRAPH_DIGESTS.asar,
//       "dist/module.js",
//     );
//     missingArtifact.artifact = {
//       available: false,
//       reason: "not-observed",
//       detail: "Bytes were not observed.",
//     };
//     expect(() => contentNode(missingArtifact)).toThrow(
//       /require a content digest/u,
//     );
//
//     const mismatchedArtifact = artifactEvidence(
//       APPLICATION_GRAPH_DIGESTS.asar,
//       "dist/module.js",
//     );
//     if (mismatchedArtifact.artifact.available)
//       mismatchedArtifact.artifact.artifact_id = `art_${"8".repeat(64)}`;
//     expect(() => contentNode(mismatchedArtifact)).toThrow(
//       /same SHA-256 digest/u,
//     );
//
//     const unlocatedObservation = artifactEvidence(
//       APPLICATION_GRAPH_DIGESTS.asar,
//       "dist/module.js",
//     );
//     unlocatedObservation.location = {
//       available: false,
//       reason: "not-observed",
//       detail: "The exact location was not recorded.",
//     };
//     expect(() => contentNode(unlocatedObservation)).toThrow(
//       /Observed facts require an actionable location/u,
//     );
//   });
// });
//
// describe("JavaScript Application Graph: truncation claims", () => {
//   it("rejects false truncation claims and accepts large properties", () => {
//     const truncated = artifactEvidence(
//       APPLICATION_GRAPH_DIGESTS.asar,
//       "dist/module.js",
//     );
//     truncated.coverage = {
//       status: "partial",
//       truncated: true,
//       omitted_count: 0,
//       limits: [],
//     };
//     expect(() => contentNode(truncated)).toThrow(/omitted_count[\s\S]*limits/u);
//
//     const nonComplete = artifactEvidence(
//       APPLICATION_GRAPH_DIGESTS.asar,
//       "dist/module.js",
//     );
//     nonComplete.coverage = {
//       status: "partial",
//       truncated: false,
//       omitted_count: null,
//       limits: [],
//     };
//     expect(() => contentNode(nonComplete)).toThrow(
//       /Non-complete coverage requires an explicit limitation/u,
//     );
//
//     const validNode = contentNode(
//       artifactEvidence(APPLICATION_GRAPH_DIGESTS.asar, "dist/module.js"),
//     );
//     expect(() =>
//       createJavaScriptApplicationGraph({
//         schema: "JavaScriptApplicationGraph",
//         root_node_ids: [validNode.node_id],
//         nodes: [validNode],
//         edges: [],
//         coverage: {
//           status: "partial",
//           truncated: false,
//           omitted_count: null,
//           limits: [],
//         },
//         limitations: [],
//       }),
//     ).toThrow(/Non-complete graph coverage requires an explicit limitation/u);
//
//     const properties = Object.fromEntries(
//       Array.from({ length: 65 }, (_, index) => [`key-${String(index)}`, index]),
//     );
//     expect(
//       contentNode(
//         artifactEvidence(APPLICATION_GRAPH_DIGESTS.asar, "dist/module.js"),
//         properties,
//       ).observations[0]?.properties,
//     ).toEqual(properties);
//   });
// });
export const _l = 236;
