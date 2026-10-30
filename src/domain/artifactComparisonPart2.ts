export const __stub = 1;
//       ...right.evidence.map(({ evidence_id: id }) => id),
//     ],
//     { root: rootCoverageComplete, entries: entryCoverageComplete },
//   );
//   const changes = comparison.changes;
//   const limitations = [
//     ...left.inventory.limitations.map((item) => `Left: ${item}`),
//     ...right.inventory.limitations.map((item) => `Right: ${item}`),
//     ...(leftComplete ? [] : ["Left artifact inventory is incomplete."]),
//     ...(rightComplete ? [] : ["Right artifact inventory is incomplete."]),
//     ...(sameScope ? [] : ["Artifact inventory scopes differ."]),
//     ...(sameScope &&
//     left.inventory.coverage.scope === "root" &&
//     (left.inventory.manifest.occurrence_count > 1 ||
//       right.inventory.manifest.occurrence_count > 1)
//       ? ["Container entry coverage is unavailable for child paths."]
//       : []),
//     ...(left.inventory.coverage.status === "complete"
//       ? []
//       : ["Left artifact inventory traversal coverage is unknown."]),
//     ...(right.inventory.coverage.status === "complete"
//       ? []
//       : ["Right artifact inventory traversal coverage is unknown."]),
//     ...(comparison.hasAmbiguousDuplicatePaths
//       ? [
//           "Duplicate logical paths cannot be paired across inventories; comparisons for those paths are unknown.",
//         ]
//       : []),
//   ];
//   applyRootHashChange(left.inventory, right.inventory, changes, [
//     ...left.evidence.map(({ evidence_id: id }) => id),
//     ...right.evidence.map(({ evidence_id: id }) => id),
//   ]);
//   const summary = summarize(
//     left.inventory,
//     right.inventory,
//     changes,
//     fullyCovered,
//   );
//   return artifactComparisonResultSchema.parse({
//     status:
//       !leftComplete || !rightComplete
//         ? "truncated"
//         : changes.some(
//               ({ classification }) => classification === "contradiction",
//             )
//           ? "contradiction"
//           : !fullyCovered
//             ? "unknown"
//             : changes.some(({ classification }) => classification === "unknown")
//               ? "unknown"
//               : changes.length === 0
//                 ? "unchanged"
//                 : "changed",
//     left_manifest_id: left.inventory.manifest.manifest_id,
//     right_manifest_id: right.inventory.manifest.manifest_id,
//     summary,
//     changes,
//     limitations: [...new Set(limitations)].sort(compareUnicodeCodePoints),
//   });
// };
//
// const compareOccurrences = (
//   left: InventorySet,
//   right: InventorySet,
//   leftByPath: ReadonlyMap<string, ArtifactOccurrence[]>,
//   rightByPath: ReadonlyMap<string, ArtifactOccurrence[]>,
//   evidenceLinks: readonly string[],
//   coverage: { readonly root: boolean; readonly entries: boolean },
// ): {
//   readonly changes: ArtifactChange[];
//   readonly hasAmbiguousDuplicatePaths: boolean;
// } => {
//   const leftNodes = new Map(left.nodes.map((item) => [item.artifact_id, item]));
//   const rightNodes = new Map(
//     right.nodes.map((item) => [item.artifact_id, item]),
//   );
//   const leftRelations = relationsByPath(left);
//   const rightRelations = relationsByPath(right);
//   const paths = [
//     ...new Set([...leftByPath.keys(), ...rightByPath.keys()]),
//   ].sort(compareUnicodeCodePoints);
//   const output: ArtifactChange[] = [];
//   let hasAmbiguousDuplicatePaths = false;
//   for (const path of paths) {
//     const leftMatches = leftByPath.get(path) ?? [];
//     const rightMatches = rightByPath.get(path) ?? [];
//     if (leftMatches.length > 1 || rightMatches.length > 1) {
//       hasAmbiguousDuplicatePaths = true;
//       output.push({
//         logical_path: path,
//         classification: "unknown",
//         dimensions: ["availability"],
//         left_occurrence_id: null,
//         right_occurrence_id: null,
//         left_artifact_id: null,
//         right_artifact_id: null,
//         evidence_links: [...evidenceLinks],
//       });
//       continue;
//     }
//     const leftOccurrence = leftMatches[0];
//     const rightOccurrence = rightMatches[0];
//     const change = classifyPath({
//       path,
//       leftOccurrence,
//       rightOccurrence,
//       leftNode: nodeFor(leftOccurrence, leftNodes),
//       rightNode: nodeFor(rightOccurrence, rightNodes),
//       leftRelations: leftRelations.get(path) ?? [],
//       rightRelations: rightRelations.get(path) ?? [],
//       rootCovered: coverage.root,
//       entriesCovered: coverage.entries,
//       evidenceLinks,
//     });
//     if (change !== null) output.push(change);
//   }
//   return { changes: output, hasAmbiguousDuplicatePaths };
// };
//
// const occurrencesByPath = (
//   occurrences: readonly ArtifactOccurrence[],
// ): ReadonlyMap<string, ArtifactOccurrence[]> => {
//   const output = new Map<string, ArtifactOccurrence[]>();
//   for (const occurrence of occurrences) {
//     const matches = output.get(occurrence.logical_path);
//     if (matches === undefined)
//       output.set(occurrence.logical_path, [occurrence]);
//     else matches.push(occurrence);
//   }
//   return output;
// };
//
// interface ClassifyPathInput {
//   readonly path: string;
//   readonly leftOccurrence: ArtifactOccurrence | undefined;
//   readonly rightOccurrence: ArtifactOccurrence | undefined;
//   readonly leftNode: ArtifactNode | undefined;
//   readonly rightNode: ArtifactNode | undefined;
//   readonly leftRelations: readonly RelationProjection[];
//   readonly rightRelations: readonly RelationProjection[];
//   readonly rootCovered: boolean;
export const _l = 142;
