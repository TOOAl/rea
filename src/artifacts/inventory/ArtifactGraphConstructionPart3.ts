export const __stub = 1;
//     const sourcePath = isSourceMap
//       ? occurrence.logical_path.slice(0, -".map".length)
//       : undefined;
//     const sourceCandidates =
//       sourcePath === undefined ? [] : (byPath.get(sourcePath) ?? []);
//     const mappedSource =
//       sourceCandidates.length === 1 && sourceCandidates[0]?.artifact_id !== null
//         ? sourceCandidates[0]
//         : undefined;
//     if (sourcePath !== undefined) {
//       const unknownMapping =
//         sourceCandidates.length > 1
//           ? {
//               occurrence: `Source-map target is unknown because multiple occurrences share ${JSON.stringify(sourcePath)}.`,
//               coverage: `Source-map relationships are unknown because multiple occurrences share ${JSON.stringify(sourcePath)}.`,
//             }
//           : sourceCandidates.length === 1 && mappedSource === undefined
//             ? {
//                 occurrence: `Source-map target identity is unknown because the matching occurrence at ${JSON.stringify(sourcePath)} has no content identity.`,
//                 coverage: `Source-map relationships are unknown because the matching occurrence at ${JSON.stringify(sourcePath)} has no content identity.`,
//               }
//             : undefined;
//       if (unknownMapping !== undefined) {
//         occurrence.limitations.push(unknownMapping.occurrence);
//         limitations.push(unknownMapping.coverage);
//       }
//     }
//     if (
//       occurrence.parent_occurrence_id === null ||
//       occurrence.artifact_id === null
//     )
//       continue;
//     const parentArtifactId =
//       mappedSource?.artifact_id ??
//       byId.get(occurrence.parent_occurrence_id)?.artifact_id ??
//       rootArtifactId;
//     const semantic = {
//       parent_artifact_id: parentArtifactId,
//       relation:
//         occurrence.entry_kind === "slice"
//           ? ("slice-of" as const)
//           : isSourceMap
//             ? mappedSource === undefined
//               ? ("contains" as const)
//               : ("maps-source" as const)
//             : relationFor(occurrence.logical_path),
//       occurrence_id: occurrence.occurrence_id,
//     };
//     edges.push({
//       edge_id: artifactEdgeId(semantic, occurrence),
//       ...semantic,
//       producer: occurrence.entry_kind === "slice" ? (producer ?? null) : null,
//       ordinal: edges.length,
//     });
//   }
//   return { edges, limitations };
// };
//
// interface ArtifactParentIndex {
//   readonly children: Map<string, ArtifactParentIndex>;
//   occurrences?: readonly MutableOccurrence[];
// }
//
// /** Resolve strict observed ancestors without rebuilding every path prefix. */
// export const resolveOccurrenceParents = (
//   occurrences: readonly MutableOccurrence[],
//   byPath: ReadonlyMap<string, readonly MutableOccurrence[]>,
//   expandedContainerIds: ReadonlySet<string>,
// ): {
//   readonly limitations: readonly string[];
//   readonly unknownParentOccurrences: ReadonlySet<MutableOccurrence>;
// } => {
//   const root: ArtifactParentIndex = { children: new Map() };
//   for (const matches of byPath.values()) {
//     const parents = matches.filter(
//       (occurrence) =>
//         occurrence.entry_kind === "directory" ||
//         expandedContainerIds.has(occurrence.occurrence_id),
//     );
//     if (parents.length === 0) continue;
//     if (parents.length > 1)
//       for (const parent of parents)
//         if (parent.entry_kind === "directory") {
//           parent.artifact_id = null;
//           parent.hash_status = "unavailable";
//           parent.limitations.push(
//             "This directory occurrence cannot be materialized because multiple directory entries share its logical path.",
//           );
//         }
//     const path = matches[0]?.logical_path;
//     if (path === undefined) continue;
//     let branch = root;
//     for (const segment of path.split("/")) {
//       let child = branch.children.get(segment);
//       if (child === undefined) {
//         child = { children: new Map() };
//         branch.children.set(segment, child);
//       }
//       branch = child;
//     }
//     branch.occurrences = parents;
//   }
//   const limitations = new Set<string>();
//   const unknownParentOccurrences = new Set<MutableOccurrence>();
//   for (const occurrence of occurrences) {
//     const path = occurrence.logical_path;
//     let branch = root;
//     let parent: MutableOccurrence | undefined;
//     let ambiguousParentPath: string | undefined;
//     let prefix = "";
//     // Walk parent segments only. Stop scanning the path once no observed
//     // directory or expanded container can be an ancestor.
//     for (let start = 0; ;) {
//       const slash = path.indexOf("/", start);
//       if (slash < 0) break;
//       const segment = path.slice(start, slash);
//       const child = branch.children.get(segment);
//       if (child === undefined) break;
//       branch = child;
//       prefix = prefix.length === 0 ? segment : `${prefix}/${segment}`;
//       const candidates = branch.occurrences ?? [];
//       if (candidates.length === 1) {
//         parent = candidates[0];
//         ambiguousParentPath = undefined;
//       } else if (candidates.length > 1) {
//         parent = undefined;
//         ambiguousParentPath = prefix;
//       }
//       start = slash + 1;
//     }
//     occurrence.parent_occurrence_id = parent?.occurrence_id ?? null;
//     if (ambiguousParentPath !== undefined) {
//       const limitation = `The parent occurrence for ${JSON.stringify(path)} is unknown because multiple observed directory or container occurrences share ${JSON.stringify(ambiguousParentPath)}.`;
//       occurrence.limitations.push(limitation);
//       limitations.add(limitation);
//       unknownParentOccurrences.add(occurrence);
//     }
//   }
//   return {
//     limitations: [...limitations].sort(compareUnicodeCodePoints),
//     unknownParentOccurrences,
//   };
// };
//
// /**
//  * Assign a path role hint. Container families are not path roles: ZIP and
//  * ASAR families are chosen only after their bytes have been classified.
//  */
// export const classifyArtifactPath = (
//   path: string,
export const _l = 150;
