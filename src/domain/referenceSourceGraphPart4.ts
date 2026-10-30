export const __stub = 1;
//   );
//   checkSortedUnique(
//     graph.parse_failures.map(historicalSourceParseFailureKey),
//     "parse_failures",
//     context,
//   );
//   checkSortedUnique(
//     graph.exclusions.map(
//       (exclusion) =>
//         `${exclusion.path}\u0000${exclusion.reason}\u0000${"pattern" in exclusion ? exclusion.pattern : ""}`,
//     ),
//     "exclusions",
//     context,
//   );
//
//   if (
//     canonicalJson(graph.languages, "Reference source graph") !==
//     canonicalJson(
//       historicalSourceLanguages(graph.entries),
//       "Reference source graph",
//     )
//   )
//     context.addIssue({
//       code: "custom",
//       message: "languages must be derived from file entries",
//       path: ["languages"],
//     });
//   if (
//     canonicalJson(graph.manifests, "Reference source graph") !==
//     canonicalJson(
//       historicalSourceManifests(graph.entries),
//       "Reference source graph",
//     )
//   )
//     context.addIssue({
//       code: "custom",
//       message: "manifests must be derived from classified file entries",
//       path: ["manifests"],
//     });
//
//   const paths = new Set(graph.entries.map(({ path }) => path));
//   checkRelationships(graph, paths, context);
//   checkSymlinks(graph, paths, context);
//   checkCompleteInventory(graph, context);
// }
//
// const rootCommitment = (
//   entries: readonly z.infer<typeof sourceEntrySchema>[],
//   exclusions: readonly z.infer<typeof exclusionSchema>[],
// ): unknown => ({
//   entries: entries.map((entry) => {
//     switch (entry.kind) {
//       case "file":
//         return {
//           kind: entry.kind,
//           path: entry.path,
//           sha256: entry.sha256,
//           size: entry.size,
//           content_state: entry.content_state,
//         };
//       case "directory":
//         return {
//           kind: entry.kind,
//           path: entry.path,
//           tree_state: entry.tree_state,
//         };
//       case "symlink":
//         return {
//           kind: entry.kind,
//           path: entry.path,
//           target: entry.target,
//           target_state: entry.target_state,
//         };
//       case "unknown":
//         return {
//           kind: entry.kind,
//           path: entry.path,
//         };
//     }
//   }),
//   exclusions,
// });
//
// const computeRootSha256 = (
//   entries: readonly z.infer<typeof sourceEntrySchema>[],
//   exclusions: readonly z.infer<typeof exclusionSchema>[],
// ): string =>
//   digestCanonicalValue(
//     rootCommitment(entries, exclusions),
//     "Reference source graph",
//   );
//
// /** Build and internally commit a normalized historical source graph. */
// export const createHistoricalSourceGraph = (
//   input: unknown,
// ): HistoricalSourceGraph => {
//   const parsed = historicalSourceGraphInputSchema.parse(input);
//   return historicalSourceGraphSchema.parse({
//     ...parsed,
//     root_sha256: computeRootSha256(parsed.entries, parsed.exclusions),
//   });
// };
//
// /** Parse a graph and reject stale or caller-invented root commitments. */
// export const parseHistoricalSourceGraph = (
//   input: unknown,
// ): HistoricalSourceGraph => historicalSourceGraphSchema.parse(input);
//
// /** Compute a deterministic graph commitment containing no absolute root path. */
// export const computeHistoricalSourceGraphSha256 = (input: unknown): string =>
//   digestCanonicalValue(
//     parseHistoricalSourceGraph(input),
//     "Reference source graph",
//   );
//
// /** Build a deterministic, relocation-independent manifest for a source graph. */
// export const createHistoricalSourceManifest = (
//   input: unknown,
// ): HistoricalSourceManifest => {
//   const graph = parseHistoricalSourceGraph(input);
//   const semantic = {
//     schema: "HistoricalSourceManifest" as const,
//     authority: "historical-reference" as const,
//     graph_sha256: computeHistoricalSourceGraphSha256(graph),
//     root_sha256: graph.root_sha256,
//     inventory_state: graph.inventory_state,
//     entry_count: graph.entries.length,
//     relationship_count: graph.relationships.length,
//   };
//   return historicalSourceManifestBaseSchema.parse({
//     ...semantic,
//     manifest_id: `hsm_${digestCanonicalValue(semantic, "Reference source graph")}`,
//   });
// };
//
// /** Parse and verify a historical source manifest's semantic identifier. */
// export const parseHistoricalSourceManifest = (
//   input: unknown,
// ): HistoricalSourceManifest => {
//   const manifest = historicalSourceManifestBaseSchema.parse(input);
//   const { manifest_id: manifestId, ...semantic } = manifest;
//   if (
//     `hsm_${digestCanonicalValue(semantic, "Reference source graph")}` !==
//     manifestId
//   )
//     throw new TypeError("Historical source manifest identifier does not match");
//   return manifest;
// };
export const _l = 148;
