export const __stub = 1;
//     documents,
//     limits,
//   });
//   return finalizeHierarchyCoverage(result, {
//     incompleteHierarchies,
//     unresolvedConnections,
//     prototypeKeyOmissions,
//     unknownDates,
//     invalid,
//     omittedArchives,
//     unreportedOmittedArchives,
//     attempted,
//     omitted,
//   });
// };
//
// /** Select lexically earliest document paths independent of host traversal order. */
// const selectInterfaceBuilderCandidates = async (
//   reader: DirectoryArtifactReader,
//   signal: AbortSignal | undefined,
//   maximumDocuments: number,
// ): Promise<{
//   readonly selected: readonly ArtifactEntry[];
//   readonly omittedSamples: readonly ArtifactEntry[];
//   readonly omitted: number;
//   readonly unreportedOmitted: number;
// }> => {
//   const capacity = maximumDocuments + MAX_REPORTED_OMITTED_ARCHIVES;
//   const candidates: ArtifactEntry[] = [];
//   let total = 0;
//   for await (const entry of reader.entries(signal)) {
//     if (entry.kind !== "file" || !isInterfaceBuilderArchive(entry.path))
//       continue;
//     total += 1;
//     retainCandidate(candidates, entry, capacity);
//   }
//   const omittedSamples = candidates.slice(maximumDocuments, capacity);
//   return {
//     selected: candidates.slice(0, maximumDocuments),
//     omittedSamples,
//     omitted: Math.max(0, total - maximumDocuments),
//     unreportedOmitted: Math.max(
//       0,
//       total - maximumDocuments - omittedSamples.length,
//     ),
//   };
// };
//
// /** Keep the earliest bounded path set; directory iteration order is host-defined. */
// const retainCandidate = (
//   candidates: ArtifactEntry[],
//   entry: ArtifactEntry,
//   maximum: number,
// ): void => {
//   let low = 0;
//   let high = candidates.length;
//   while (low < high) {
//     const middle = Math.floor((low + high) / 2);
//     const existing = candidates[middle];
//     if (
//       existing !== undefined &&
//       compareUnicodeCodePoints(existing.path, entry.path) < 0
//     )
//       low = middle + 1;
//     else high = middle;
//   }
//   candidates.splice(low, 0, entry);
//   if (candidates.length > maximum) candidates.pop();
// };
//
// const finalizeHierarchyCoverage = (
//   result: ReturnType<typeof buildInterfaceBuilderAnalysis>,
//   counts: {
//     incompleteHierarchies: ReadonlyMap<string, number>;
//     unresolvedConnections: ReadonlyMap<string, number>;
//     prototypeKeyOmissions: ReadonlyMap<string, number | null>;
//     unknownDates: ReadonlyMap<string, number>;
//     invalid: readonly string[];
//     omittedArchives: readonly { path: string; reason: string }[];
//     unreportedOmittedArchives: number;
//     attempted: number;
//     omitted: number;
//   },
// ) => {
//   const {
//     incompleteHierarchies,
//     unresolvedConnections,
//     prototypeKeyOmissions,
//     unknownDates,
//     invalid,
//     omittedArchives,
//     unreportedOmittedArchives,
//   } = counts;
//   const archiveDecodePartial =
//     invalid.length > 0 ||
//     prototypeKeyOmissions.size > 0 ||
//     omittedArchives.length > 0;
//   return {
//     ...result,
//     documents: result.documents.map((document) => ({
//       ...document,
//       connection_count:
//         document.connection_count +
//         (unresolvedConnections.get(document.relative_path) ?? 0),
//     })),
//     graph: {
//       ...result.graph,
//       coverage: [
//         ...result.graph.coverage.map((facet) => {
//           const omittedConnection = unresolvedConnections.get(
//             facet.facet.replace(/^connections:/u, ""),
//           );
//           return facet.facet.startsWith("connections:") &&
//             omittedConnection !== undefined
//             ? {
//                 ...facet,
//                 status: "partial" as const,
//                 // A connection dropped by the limit is recoverable by raising
//                 // it, so that cause keeps the reason the graph already named.
//                 // Only a facet with no other cause reports the omission.
//                 reason: facet.reason ?? "connection_unresolved",
//                 omitted: facet.omitted + omittedConnection,
//               }
//             : facet;
//         }),
//         {
//           facet: "archive_decode",
//           status: archiveDecodePartial
//             ? ("partial" as const)
//             : ("complete" as const),
//           reason: omittedArchives.some(
//             ({ reason }) => reason === "aggregate_decode_budget_exhausted",
//           )
//             ? "aggregate_decode_budget_exhausted"
//             : omittedArchives.some(({ reason }) => reason === "max_documents")
//               ? "document_limit_reached"
//               : omittedArchives.length > 0
//                 ? "archive_decode_budget_exhausted"
//                 : invalid.length > 0
//                   ? "one_or_more_archives_invalid"
//                   : prototypeKeyOmissions.size > 0
//                     ? "dictionary_entries_omitted"
//                     : null,
//           examined: counts.attempted,
//           omitted: counts.omitted,
//         },
//       ],
//       truncated:
//         result.graph.truncated ||
//         counts.omitted > 0 ||
//         archiveDecodePartial ||
//         unresolvedConnections.size > 0,
//     },
//     limitations: [
//       ...result.limitations,
//       "Compiled Interface Builder archives are private serialized object graphs. The decoder reports only recognized keyed-archive objects and connections; unrecognized object classes and fields remain unknown.",
//       ...(incompleteHierarchies.size === 0
//         ? []
//         : [
//             "Some serialized hierarchy links could not be projected within the bounded hierarchy; their parentage remains unknown.",
//           ]),
//       ...(unresolvedConnections.size === 0
//         ? []
//         : [
//             "Some recognized NIBArchive connectors declare no resolvable owner; they carry no connection evidence and are reported as omissions.",
//           ]),
//       ...(invalid.length === 0
//         ? []
//         : [
//             `Some Interface Builder archives could not be decoded: ${invalid.slice(0, 16).join("; ")}`,
//           ]),
//       ...[...prototypeKeyOmissions].map(
//         ([path, count]) => `${path}: ${omittedPrototypeKeysLimitation(count)}`,
//       ),
//       ...[...unknownDates].map(
//         ([path, count]) => `${path}: ${unknownDateLimitation(count)}`,
//       ),
//       ...omittedArchives.map(
//         ({ path, reason }) =>
//           `${path}: omitted because ${reason.replaceAll("_", " ")}.`,
//       ),
//       ...(unreportedOmittedArchives === 0
//         ? []
//         : [
//             `${unreportedOmittedArchives} additional omitted archive path(s) and their reasons were not retained; reporting is bounded to ${MAX_REPORTED_OMITTED_ARCHIVES} paths.`,
//           ]),
//     ],
//   };
export const _l = 188;
