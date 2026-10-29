export const __stub = 1;
//
// const relationsByPath = (
//   inventory: InventorySet,
// ): ReadonlyMap<string, readonly RelationProjection[]> => {
//   const output = new Map<string, RelationProjection[]>();
//   const occurrences = new Map(
//     inventory.occurrences.map((item) => [item.occurrence_id, item]),
//   );
//   for (const edge of inventory.edges) {
//     const occurrence = occurrences.get(edge.occurrence_id);
//     // An incomplete inventory can omit the occurrence that names the child.
//     if (occurrence?.artifact_id === null || occurrence === undefined) continue;
//     const path = occurrence.logical_path;
//     const values = output.get(path);
//     const projection: RelationProjection = {
//       parent_logical_path:
//         occurrence.parent_occurrence_id === null
//           ? null
//           : (occurrences.get(occurrence.parent_occurrence_id)?.logical_path ??
//             null),
//       child_artifact_id: occurrence.artifact_id,
//       relation: edge.relation,
//       logical_path: occurrence.logical_path,
//       producer: edge.producer,
//     };
//     if (values === undefined) output.set(path, [projection]);
//     else values.push(projection);
//   }
//   for (const values of output.values())
//     values.sort((left, right) =>
//       compareUnicodeCodePoints(canonicalJson(left), canonicalJson(right)),
//     );
//   return output;
// };
//
// interface RelationProjection {
//   /** Logical parent is stable across graph-root ID changes. */
//   readonly parent_logical_path: string | null;
//   readonly child_artifact_id: string;
//   readonly relation: ArtifactInventoryResult["edges"][number]["relation"];
//   readonly logical_path: string | null;
//   /** Producer is semantic provenance; edge ordinal is presentation order. */
//   readonly producer: ArtifactInventoryResult["edges"][number]["producer"];
// }
//
// const summarize = (
//   left: InventorySet,
//   right: InventorySet,
//   changes: readonly ArtifactChange[],
//   covered: boolean,
// ) => {
//   const counts = {
//     added: 0,
//     removed: 0,
//     changed: 0,
//     unknown: 0,
//     contradiction: 0,
//   };
//   for (const change of changes) counts[change.classification] += 1;
//   // Change rows are keyed by logical path, and one unknown row for a duplicate
//   // path stands for every left occurrence on it. Only occurrences on paths
//   // without a left-side change are affirmatively unchanged.
//   const changedPaths = new Set(
//     changes
//       .filter(({ classification }) => classification !== "added")
//       .map(({ logical_path: path }) => path),
//   );
//   return {
//     unchanged: covered
//       ? left.occurrences.filter(
//           ({ logical_path: path }) => !changedPaths.has(path),
//         ).length
//       : 0,
//     ...counts,
//     unknown: covered
//       ? counts.unknown
//       : Math.max(
//           counts.unknown,
//           Math.max(
//             left.manifest.occurrence_count,
//             right.manifest.occurrence_count,
//           ) -
//             counts.added -
//             counts.removed -
//             counts.changed -
//             counts.contradiction,
//         ),
//   };
// };
//
// // Differing manifest root digests prove a root content change even when node
// // details are unavailable. Fold that fact into an existing root row so one
// // logical path keeps one classification.
// const applyRootHashChange = (
//   left: InventorySet,
//   right: InventorySet,
//   changes: ArtifactChange[],
//   evidenceLinks: readonly string[],
// ): void => {
//   if (left.manifest.root_sha256 === right.manifest.root_sha256) return;
//   const index = changes.findIndex((change) => change.logical_path === ".");
//   const existing = changes[index];
//   if (existing !== undefined) {
//     if (
//       existing.dimensions.includes("content") ||
//       (existing.classification !== "unknown" &&
//         existing.classification !== "changed")
//     )
//       return;
//     changes[index] = {
//       ...existing,
//       classification: "changed",
//       dimensions: comparisonDimensionSchema.options.filter(
//         (dimension) =>
//           dimension === "content" || existing.dimensions.includes(dimension),
//       ),
//       evidence_links: [
//         ...new Set([...existing.evidence_links, ...evidenceLinks]),
//       ],
//     };
//     return;
//   }
//   const leftRoot = left.occurrences.find(
//     (occurrence) => occurrence.logical_path === ".",
//   );
//   const rightRoot = right.occurrences.find(
//     (occurrence) => occurrence.logical_path === ".",
//   );
//   changes.push({
//     classification: "changed",
//     logical_path: ".",
//     dimensions: ["content"],
//     left_occurrence_id: leftRoot?.occurrence_id ?? null,
//     right_occurrence_id: rightRoot?.occurrence_id ?? null,
//     left_artifact_id: leftRoot?.artifact_id ?? null,
//     right_artifact_id: rightRoot?.artifact_id ?? null,
//     evidence_links: [...evidenceLinks],
//   });
// };
export const _l = 139;
