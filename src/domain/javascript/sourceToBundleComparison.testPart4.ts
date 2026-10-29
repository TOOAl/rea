export const __stub = 1;
//     ],
//   });
//
// const comparePathToNodes = (
//   sourcePath: string,
//   nodes: readonly ApplicationNode[],
// ) =>
//   compareSourceToBundle({
//     reference: historicalGraph("complete", [sourcePath]),
//     application: {
//       evidenceId: EVIDENCE_ID,
//       rootArtifactSha256: HASH.artifact,
//       graph: createJavaScriptApplicationGraph({
//         schema: "JavaScriptApplicationGraph",
//         root_node_ids: nodes.map(({ node_id: nodeId }) => nodeId),
//         nodes,
//         edges: [],
//         coverage: {
//           status: "complete",
//           truncated: false,
//           omitted_count: 0,
//           limits: [],
//         },
//         limitations: [],
//       }),
//     },
//   });
//
// const historicalGraph = (
//   inventoryState: "complete" | "partial",
//   paths = [
//     "src/duplicated.ts",
//     "src/merged-a.ts",
//     "src/merged-b.ts",
//     "src/modified.ts",
//     "src/removed.ts",
//     "src/split.ts",
//     "src/unchanged.ts",
//   ],
// ) =>
//   createHistoricalSourceGraph({
//     schema: "HistoricalSourceGraph",
//     authority: "historical-reference",
//     root_alias: "$REFERENCE_ROOT",
//     inventory_state: inventoryState,
//     entries: [
//       {
//         path: "src",
//         kind: "directory",
//         classifications: ["source"],
//         tree_state: inventoryState === "complete" ? "enumerated" : "partial",
//         limitations:
//           inventoryState === "complete"
//             ? []
//             : ["Fixture inventory is partial."],
//       },
//       ...paths.map((path) => ({
//         path,
//         kind: "file" as const,
//         sha256: sourceDigest(path),
//         size: 10,
//         language: "TypeScript",
//         classifications: ["source"] as const,
//         content_state: "hashed" as const,
//         limitations: [],
//       })),
//     ].sort((left, right) => compareUnicodeCodePoints(left.path, right.path)),
//     relationships: [],
//     parse_failures: [],
//     exclusions: [],
//     languages: ["TypeScript"],
//     manifests: [],
//     vcs: { kind: "none", head: null, dirty: null },
//     provenance: {
//       importer: "rea-test",
//       importer_version: "1",
//       caller: "source-to-bundle-test",
//     },
//     limitations:
//       inventoryState === "complete" ? [] : ["Fixture inventory is partial."],
//   });
//
// const applicationGraph = (coverage: "complete" | "partial") => {
//   const nodes = [
//     moduleNode("duplicated-a", {
//       path: "bundle-a.js",
//       source_sha256: HASH.duplicated,
//     }),
//     moduleNode("duplicated-b", {
//       path: "bundle-b.js",
//       source_sha256: HASH.duplicated,
//     }),
//     moduleNode("unchanged", {
//       path: "bundle.js",
//       source_sha256: HASH.unchanged,
//     }),
//     createJavaScriptApplicationNode({
//       kind: "javascript-asset",
//       identity: {
//         strategy: "canonical-path",
//         stability: "artifact-version",
//         artifact_sha256: HASH.artifact,
//         path: "src/modified.ts",
//       },
//       observations: [
//         {
//           label: "src/modified.ts",
//           properties: { path: "src/modified.ts" },
//           evidence: artifactEvidence(HASH.artifact, "src/modified.ts"),
//         },
//       ],
//     }),
//     moduleNode("split-a", { path: "bundle-a/src/split.ts" }),
//     moduleNode("split-b", { path: "bundle-b/src/split.ts" }),
//     moduleNode("merged", {
//       path: "bundle.js",
//       source_sha256: HASH.merged,
//     }),
//   ];
//   return createJavaScriptApplicationGraph({
//     schema: "JavaScriptApplicationGraph",
//     root_node_ids: nodes.map(({ node_id: nodeId }) => nodeId),
//     nodes,
//     edges: [],
//     coverage:
//       coverage === "complete"
//         ? {
//             status: "complete",
//             truncated: false,
//             omitted_count: 0,
//             limits: [],
//           }
//         : {
//             status: "partial",
//             truncated: true,
//             omitted_count: 1,
//             limits: [{ name: "fixture", value: 5, unit: "items" }],
//           },
//     limitations:
//       coverage === "complete" ? [] : ["Fixture graph coverage is partial."],
//   });
// };
//
// const moduleNode = (key: string, properties: Record<string, string>) =>
//   createJavaScriptApplicationNode({
//     kind: "javascript-module",
//     identity: {
//       strategy: "artifact-local-key",
//       stability: "artifact-version",
//       artifact_sha256: HASH.artifact,
//       namespace: "test",
//       key,
//     },
//     observations: [
//       {
//         label: key,
//         properties,
//         evidence: artifactEvidence(HASH.artifact, "bundle.js"),
//       },
//     ],
//   });
//
// const sourceDigest = (path: string): string => {
//   if (path.includes("duplicated")) return HASH.duplicated;
//   if (path.includes("merged")) return HASH.merged;
//   if (path.includes("modified")) return HASH.modified;
//   if (path.includes("removed")) return HASH.removed;
//   if (path.includes("split")) return HASH.split;
//   return HASH.unchanged;
// };
//
// const item = (
//   result: ReturnType<typeof compareSourceToBundle>,
//   sourcePath: string,
// ) => {
//   const value = result.items.find(
//     ({ source_path: path }) => path === sourcePath,
//   );
//   if (value === undefined) throw new TypeError(`Missing item: ${sourcePath}`);
//   return value;
// };
export const _l = 181;
