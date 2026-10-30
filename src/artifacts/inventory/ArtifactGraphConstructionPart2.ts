export const __stub = 1;
//     if (children === undefined)
//       childrenByParent.set(occurrence.parent_occurrence_id, [occurrence]);
//     else children.push(occurrence);
//   }
//   for (const directory of directories) {
//     const children = (childrenByParent.get(directory.occurrence_id) ?? [])
//       .map(({ logical_path, artifact_id, entry_kind }) => ({
//         // Intermediate directory entries may be absent from an archive.
//         name: logical_path.slice(directory.logical_path.length + 1),
//         artifact_id,
//         entry_kind,
//       }))
//       .sort((left, right) => compareUnicodeCodePoints(left.name, right.name));
//     const node = createArtifactNode({
//       sha256: digestCanonicalValue({ kind: "directory", children }, "Artifact"),
//       size: 0,
//       format: "directory",
//       contentState: "virtual",
//     });
//     nodes.set(node.artifact_id, node);
//     directory.artifact_id = node.artifact_id;
//     directory.hash_status = "verified";
//   }
// };
//
// export const createRootNode = (input: {
//   readonly digest: {
//     readonly sha256: string;
//     readonly bytes: number;
//     readonly prefix: Buffer;
//   } | null;
//   readonly occurrences: readonly MutableOccurrence[];
// }): ArtifactNode =>
//   createArtifactNode({
//     sha256:
//       input.digest?.sha256 ??
//       digestCanonicalValue(
//         {
//           kind: "directory-root",
//           children: input.occurrences
//             .map(({ logical_path, artifact_id }) => ({
//               logical_path,
//               artifact_id,
//             }))
//             .sort((left, right) =>
//               compareUnicodeCodePoints(left.logical_path, right.logical_path),
//             ),
//         },
//         "Artifact",
//       ),
//     size: input.digest?.bytes ?? 0,
//     format:
//       input.digest === null
//         ? "directory"
//         : classifyArtifactBytes(input.digest.prefix, input.digest.bytes),
//     contentState: "materialized",
//   });
//
// export const createArtifactNode = (input: {
//   readonly sha256: string;
//   readonly size: number;
//   readonly format: ArtifactNode["format"];
//   readonly contentState: ArtifactNode["content_state"];
// }): ArtifactNode => ({
//   artifact_id: artifactIdForContent(input.sha256),
//   format: input.format,
//   sha256: input.sha256,
//   size: input.size,
//   media_type: null,
//   architecture: null,
//   content_state: input.contentState,
//   limitations: [],
// });
//
// export const rootOccurrenceFor = (
//   node: ArtifactNode,
//   metadata: {
//     readonly size: number;
//     readonly executable: boolean;
//     readonly format: ArtifactOccurrence["artifact_format"];
//     readonly path: string;
//   },
// ): MutableOccurrence => ({
//   occurrence_id: occurrenceIdForLocation({
//     rootArtifactId: node.artifact_id,
//     logicalPath: ".",
//     entryKind: metadata.format === "directory" ? "directory" : "file",
//   }),
//   artifact_id: node.artifact_id,
//   parent_occurrence_id: null,
//   logical_path: ".",
//   entry_kind: metadata.format === "directory" ? "directory" : "file",
//   artifact_kind:
//     metadata.format === "directory" ||
//     isZipPackageFormat(metadata.format) ||
//     ["asar", "dmg", "pkg"].includes(metadata.format)
//       ? "container"
//       : artifactRoleForFormat(metadata.path, metadata.format).kind,
//   artifact_format: metadata.format,
//   declared_size: metadata.size,
//   compressed_size: null,
//   executable: metadata.executable,
//   encrypted: false,
//   hash_status: "verified",
//   source_location: null,
//   limitations: [],
// });
//
// export const rekeyOccurrences = (
//   rootArtifactId: string,
//   occurrences: MutableOccurrence[],
// ): void => {
//   const replacements = new Map<string, string>();
//   const ordinalByPath = new Map<string, number>();
//   for (const occurrence of occurrences) {
//     const ordinal = ordinalByPath.get(occurrence.logical_path) ?? 0;
//     ordinalByPath.set(occurrence.logical_path, ordinal + 1);
//     replacements.set(
//       occurrence.occurrence_id,
//       occurrenceIdForLocation({
//         rootArtifactId,
//         logicalPath: occurrence.logical_path,
//         entryKind: occurrence.entry_kind,
//         ...(ordinal === 0 ? {} : { duplicateOrdinal: ordinal }),
//       }),
//     );
//   }
//   for (const occurrence of occurrences) {
//     occurrence.occurrence_id =
//       replacements.get(occurrence.occurrence_id) ?? occurrence.occurrence_id;
//     if (occurrence.parent_occurrence_id !== null)
//       occurrence.parent_occurrence_id =
//         replacements.get(occurrence.parent_occurrence_id) ??
//         occurrence.parent_occurrence_id;
//   }
// };
//
// export const createArtifactEdges = (
//   rootArtifactId: string,
//   occurrences: MutableOccurrence[],
//   producer?: ArtifactCommand,
// ): { readonly edges: ArtifactEdge[]; readonly limitations: string[] } => {
//   const byId = new Map(occurrences.map((item) => [item.occurrence_id, item]));
//   const byPath = indexOccurrencesByPath(occurrences);
//   const edges: ArtifactEdge[] = [];
//   const limitations: string[] = [];
//   for (const occurrence of occurrences) {
//     // Use the occurrence's own classification: a directory named `x.map` is
//     // a container, not a source map of its sibling.
//     const isSourceMap = occurrence.artifact_kind === "source-map";
export const _l = 150;
