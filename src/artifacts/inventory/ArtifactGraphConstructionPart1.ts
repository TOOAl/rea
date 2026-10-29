export const __stub = 1;
// import { compareUnicodeCodePoints } from "../../domain/unicodeCodePointOrder.js";
// import { isJavaScriptSourcePath } from "../../domain/javascript/javascriptArtifactFiles.js";
// import { digestCanonicalValue } from "../../domain/canonicalDigest.js";
// import {
//   hasBinaryPlistSignature,
//   hasXmlPlistSignature,
// } from "../../domain/apple/appleArchiveFormat.js";
// import {
//   artifactEdgeId,
//   artifactIdForContent,
//   occurrenceIdForLocation,
// } from "../../domain/artifactIdentity.js";
// import type { ArtifactEntry } from "../ArtifactReader.js";
// import type {
//   ArtifactCommand,
//   ArtifactEdge,
//   ArtifactNode,
//   ArtifactOccurrence,
// } from "../../domain/artifactGraph.js";
// import {
//   hasZipSignature,
//   isZipPackageFormat,
//   zipPackageFormatForPath,
//   type ZipPackageFormat,
// } from "../../domain/zipPackageFormat.js";
// import {
//   observeMzWindowsHeader,
//   parseDosMzHeader,
// } from "../../domain/dosMz.js";
// import {
//   classifyFatContainerIdentity,
//   readFatContainerHeader,
// } from "../../domain/apple/machoContainer.js";
//
// /** Mutable internal occurrence used until root-bound IDs are known. */
// export interface MutableOccurrence {
//   occurrence_id: string;
//   artifact_id: string | null;
//   parent_occurrence_id: string | null;
//   logical_path: string;
//   entry_kind: ArtifactOccurrence["entry_kind"];
//   artifact_kind: ArtifactOccurrence["artifact_kind"];
//   artifact_format: ArtifactOccurrence["artifact_format"];
//   declared_size: number | null;
//   compressed_size: number | null;
//   executable: boolean;
//   encrypted: boolean;
//   hash_status: ArtifactOccurrence["hash_status"];
//   source_location: ArtifactOccurrence["source_location"];
//   limitations: string[];
// }
//
// /** Index every occurrence by canonical logical path without choosing an owner. */
// export const indexOccurrencesByPath = (
//   occurrences: readonly MutableOccurrence[],
// ): ReadonlyMap<string, readonly MutableOccurrence[]> => {
//   const byPath = new Map<string, MutableOccurrence[]>();
//   for (const occurrence of occurrences) {
//     const matches = byPath.get(occurrence.logical_path);
//     if (matches === undefined)
//       byPath.set(occurrence.logical_path, [occurrence]);
//     else matches.push(occurrence);
//   }
//   return byPath;
// };
//
// /**
//  * Create an occurrence before its bytes are read. A container suffix is not a
//  * container family until the bytes are classified, so a member named like a
//  * container starts with an unknown format.
//  */
// export const createOccurrence = (
//   entry: ArtifactEntry,
//   path: string,
//   parent: string | null,
//   duplicateOrdinal = 0,
// ): MutableOccurrence => {
//   const role =
//     entry.kind === "directory"
//       ? {
//           kind: path.toLowerCase().endsWith(".framework")
//             ? ("framework" as const)
//             : ("container" as const),
//           format: "directory" as const,
//         }
//       : containerSuffixFamily(path) === undefined
//         ? classifyArtifactPath(path)
//         : ({ kind: "unknown", format: "unknown" } as const);
//   return {
//     occurrence_id: `occ_${digestCanonicalValue(
//       duplicateOrdinal === 0
//         ? { path, kind: entry.kind }
//         : { path, kind: entry.kind, duplicate_ordinal: duplicateOrdinal },
//       "Artifact",
//     )}`,
//     artifact_id: null,
//     parent_occurrence_id: parent,
//     logical_path: path,
//     entry_kind: entry.kind,
//     artifact_kind: role.kind,
//     artifact_format: role.format,
//     declared_size: entry.declaredSize,
//     compressed_size: entry.compressedSize,
//     executable: entry.executable,
//     encrypted: entry.encrypted,
//     hash_status: entry.encrypted ? "unavailable" : "not-hashed",
//     source_location:
//       entry.byteOffset === null || entry.declaredSize === null
//         ? null
//         : { offset: entry.byteOffset, length: entry.declaredSize },
//     limitations: [...entry.limitations],
//   };
// };
//
// /** Record that an unread member's container suffix was not checked against bytes. */
// export const noteUnreadContainerSuffix = (
//   occurrence: MutableOccurrence,
// ): void => {
//   if (occurrence.entry_kind === "directory") return;
//   const family = containerSuffixFamily(occurrence.logical_path);
//   if (family === undefined) return;
//   occurrence.limitations.push(
//     `The path suffix suggests ${family.toUpperCase()}, but these bytes were not read, so the container family is unknown.`,
//   );
// };
//
// const containerSuffixFamily = (
//   path: string,
// ): "asar" | ZipPackageFormat | undefined => {
//   const lower = path.toLowerCase();
//   return lower.endsWith(".asar") ? "asar" : zipPackageFormatForPath(lower);
// };
//
// /** Compare exact child names independently of host locale and traversal order. */
// export const materializeDirectoryNodes = (
//   occurrences: MutableOccurrence[],
//   nodes: Map<string, ArtifactNode>,
// ): void => {
//   const directories = occurrences
//     .filter(
//       ({ entry_kind: kind, hash_status }) =>
//         kind === "directory" && hash_status !== "unavailable",
//     )
//     .sort(
//       (left, right) => depth(right.logical_path) - depth(left.logical_path),
//     );
//   const childrenByParent = new Map<string, MutableOccurrence[]>();
//   for (const occurrence of occurrences) {
//     if (occurrence.parent_occurrence_id === null) continue;
//     const children = childrenByParent.get(occurrence.parent_occurrence_id);
export const _l = 150;
