export const __stub = 1;
//       reference: historicalGraph("complete", [path]),
//       application: {
//         evidenceId: EVIDENCE_ID,
//         rootArtifactSha256: HASH.artifact,
//         graph,
//       },
//     });
//     expect(item(result, path)).toMatchObject({
//       status: "unknown",
//       current_node_ids: [node.node_id],
//       candidates: [
//         expect.objectContaining({
//           signals: expect.arrayContaining([
//             expect.objectContaining({ kind: "current-path-exact" }),
//           ]),
//         }),
//       ],
//     });
//   });
//
//   it.each(
//     [
//       "https://example.test/src/modified.ts?revision=2#section",
//       "webpack://fixture/./src/modified.ts?revision=2#section",
//     ].flatMap((path) => ["path", "module_path"].map((key) => ({ key, path }))),
//   )("still strips URL query and fragment from $key $path", ({ key, path }) => {
//     const node = moduleNode("url", { [key]: path });
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
//       reference: historicalGraph("complete", ["src/modified.ts"]),
//       application: {
//         evidenceId: EVIDENCE_ID,
//         rootArtifactSha256: HASH.artifact,
//         graph,
//       },
//     });
//     expect(item(result, "src/modified.ts")).toMatchObject({
//       status: "unknown",
//       current_node_ids: [node.node_id],
//       candidates: [
//         expect.objectContaining({
//           signals: expect.arrayContaining([
//             expect.objectContaining({ kind: "current-path-suffix" }),
//           ]),
//         }),
//       ],
//     });
//     expect(
//       item(result, "src/modified.ts").candidates.flatMap(
//         ({ signals }) => signals,
//       ),
//     ).not.toContainEqual(
//       expect.objectContaining({ kind: "unicode-equivalent-path" }),
//     );
//   });
// });
//
// describe("source-map resolver equivalence", () => {
//   it.each([
//     {
//       sourceRoot: "https://cdn.example/src/",
//       expectedSource: "https://cdn.example/src/a.js",
//       expectedResolution: { kind: "suffix", path: "cdn.example/src/a.js" },
//     },
//     {
//       sourceRoot: "https://cdn.example/src//",
//       expectedSource: "https://cdn.example/src/a.js",
//       expectedResolution: { kind: "suffix", path: "cdn.example/src/a.js" },
//     },
//     {
//       sourceRoot: "webpack://",
//       expectedSource: "webpack:///a.js",
//       expectedResolution: { kind: "suffix", path: "a.js" },
//     },
//   ])(
//     "matches TraceMap for sourceRoot $sourceRoot",
//     ({ sourceRoot, expectedSource, expectedResolution }) => {
//       const producerSource = new TraceMap(
//         {
//           version: 3,
//           file: "main.js",
//           sourceRoot,
//           sources: ["a.js"],
//           names: [],
//           mappings: "",
//         },
//         "file:///artifact/dist/main.js.map",
//       ).resolvedSources[0];
//       const reference = sourceMapReference(
//         "a.js",
//         sourceRoot,
//         "dist/main.js.map",
//       );
//
//       expect(producerSource).toBe(expectedSource);
//       expect(reference.source_root).toBe(sourceRoot);
//       expect(reference.resolution).toEqual(expectedResolution);
//     },
//   );
// });
//
// describe("source to bundle complete metadata", () => {
//   it("accepts long source metadata and all reported limitations", () => {
//     const result = compareSourceToBundle({
//       reference: historicalGraph("complete"),
//       application: {
//         evidenceId: EVIDENCE_ID,
//         rootArtifactSha256: HASH.artifact,
//         graph: applicationGraph("complete"),
//       },
//     });
//     const item = result.items[0];
//     if (item === undefined) throw new Error("Expected a comparison item");
//
//     const parsed = sourceToBundleComparisonResultSchema.parse({
//       ...result,
//       items: [
//         {
//           ...item,
//           source_path: "p".repeat(4_097),
//           source_language: "l".repeat(101),
//           limitations: Array.from(
//             { length: 101 },
//             (_, index) => `gap-${index}`,
//           ),
//           candidates: item.candidates.map((candidate) => ({
//             ...candidate,
//             signals: Array.from({ length: 7 }, (_, index) => ({
//               kind: SOURCE_TO_BUNDLE_SIGNAL_WEIGHTS[index % 6]?.[0],
//               weight: SOURCE_TO_BUNDLE_SIGNAL_WEIGHTS[index % 6]?.[1],
//               source_value: "v".repeat(4_097),
//               current_values: ["v".repeat(4_097)],
//             })),
//           })),
//         },
//       ],
//       limitations: Array.from({ length: 1_001 }, (_, index) => `gap-${index}`),
//     });
//
//     expect(parsed.items[0]?.limitations).toHaveLength(101);
//     expect(parsed.limitations).toHaveLength(1_001);
//   });
// });
//
// const sourceMapNode = (
//   key: string,
//   sourceName: string,
//   sourceRoot: string,
//   digest: string,
// ) =>
//   createJavaScriptApplicationNode({
//     kind: "source-module",
//     identity: {
//       strategy: "source-map-original",
//       source_root: sourceRoot,
//       stability: "source-map-exact",
//       source_map_sha256: HASH.artifact,
//       original_source: sourceName,
//       source_sha256: digest,
//     },
//     observations: [
//       {
//         label: `${key} source-map spelling`,
//         source_map_reference: sourceMapReference(
//           sourceName,
//           sourceRoot,
//           `dist/${key}.map`,
//         ),
//         properties: { content_available: true, content_sha256: digest },
//         evidence: artifactEvidence(HASH.artifact, `dist/${key}.map`),
//       },
export const _l = 183;
