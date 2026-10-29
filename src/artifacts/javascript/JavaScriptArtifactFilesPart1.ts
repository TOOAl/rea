export const __stub = 1;
// import { createHash } from "node:crypto";
// import { isAbsolute } from "node:path";
// import type { Readable } from "node:stream";
//
// import { compareUnicodeCodePoints } from "../../domain/unicodeCodePointOrder.js";
// import { AsarArtifactReader } from "../AsarArtifactReader.js";
// import type { ArtifactResourceScope } from "../ArtifactResourceScope.js";
// import {
//   ArtifactPathRegistry,
//   normalizeArtifactPath,
// } from "../ArtifactPaths.js";
// import {
//   ArtifactReaderFailure,
//   type ArtifactEntry,
//   type ArtifactReader,
// } from "../ArtifactReader.js";
// import { streamChunkToBuffer } from "../StreamBytes.js";
// import { hashReadable } from "../ArtifactHash.js";
// import type { ArtifactOccurrence } from "../../domain/artifactGraph.js";
// import type { ArtifactInventorySnapshot } from "../../domain/artifactInventorySnapshot.js";
// import { AnalysisInputError } from "../../domain/analysisErrorCore.js";
// import { isJavaScriptSourcePath } from "../../domain/javascript/javascriptArtifactFiles.js";
//
// import type {
//   JavaScriptArtifactFileKind,
//   JavaScriptArtifactFile,
//   JavaScriptArtifactContainer,
//   JavaScriptUnanalyzedArtifactFile,
//   JavaScriptUnanalyzedArtifactLookup,
//   JavaScriptArtifactFileSet,
// } from "../../domain/javascript/javascriptArtifactFiles.js";
//
// interface ExpectedFile {
//   readonly path: string;
//   readonly sha256: string;
//   readonly bytes: number;
//   readonly inventoryArtifactId: string;
//   readonly kind: JavaScriptArtifactFileKind;
// }
//
// interface ExpectedContainer {
//   readonly hash_status: ArtifactOccurrence["hash_status"];
//   readonly format: ArtifactOccurrence["artifact_format"];
//   readonly inventory: JavaScriptArtifactContainer | null;
// }
//
// interface ReadContext {
//   readonly resources: ArtifactResourceScope;
//   readonly expected: ReadonlyMap<string, ExpectedFile>;
//   readonly expectedContainers: ReadonlyMap<string, ExpectedContainer>;
//   readonly registry: ArtifactPathRegistry;
//   readonly files: JavaScriptArtifactFile[];
//   readonly containers: JavaScriptArtifactContainer[];
//   readonly signal: AbortSignal | undefined;
//   readonly selectedPaths: ReadonlyMap<string, number> | undefined;
//   textBytes: number;
//   invalidUtf8: number;
// }
//
// interface ReadTextInput {
//   readonly reader: ArtifactReader;
//   readonly entry: ArtifactEntry;
//   readonly expected: ExpectedFile;
// }
//
// /** Verify inventoried entries; acquire text only inside the caller's scope. */
// export const readJavaScriptArtifactFiles = async (
//   reader: ArtifactReader,
//   snapshot: ArtifactInventorySnapshot,
//   resources: ArtifactResourceScope,
//   signal?: AbortSignal,
//   sourcePaths?: readonly string[],
// ): Promise<JavaScriptArtifactFileSet> => {
//   const inventory = expectedInventory(snapshot);
//   const expected = inventory.files;
//   const selectedPaths =
//     sourcePaths === undefined
//       ? undefined
//       : new Map([...new Set(sourcePaths)].map((path, index) => [path, index]));
//   const issues = (sourcePaths ?? []).flatMap((path, index) =>
//     expected.has(path) || inventory.unavailableFiles.has(path)
//       ? []
//       : [
//           {
//             path: ["source_paths", index],
//             reason: "invalid_value" as const,
//             message:
//               "Select an exact relevant file path from the artifact inventory; no globs or path aliases.",
//           },
//         ],
//   );
//   if (issues.length > 0)
//     throw new AnalysisInputError(
//       "analyze_javascript_application",
//       undefined,
//       issues,
//     );
//   const unavailablePath = sourcePaths?.find((path) =>
//     inventory.unavailableFiles.has(path),
//   );
//   if (unavailablePath !== undefined)
//     throw new ArtifactReaderFailure(
//       "unavailable",
//       `Selected inventoried source bytes are unavailable: ${unavailablePath}`,
//       {
//         partialObservation: { kind: "artifact-inventory", inventory: snapshot },
//       },
//     );
//   if (reader instanceof AsarArtifactReader) {
//     const root = snapshot.nodes.find(
//       ({ artifact_id }) => artifact_id === snapshot.manifest.root_artifact_id,
//     );
//     if (root === undefined)
//       throw new ArtifactReaderFailure(
//         "integrity",
//         "Root artifact node is missing",
//       );
//     await verifyEntryBytes(
//       await reader.openContainer(signal),
//       { path: ".", sha256: root.sha256, bytes: root.size },
//       signal,
//     );
//   }
//   const context: ReadContext = {
//     resources,
//     expected,
//     expectedContainers: inventory.containers,
//     registry: new ArtifactPathRegistry(),
//     files: [],
//     containers: [],
//     signal,
//     selectedPaths,
//     textBytes: 0,
//     invalidUtf8: 0,
//   };
//   await visitReader(reader, "", snapshot.manifest.root_sha256, context);
//   const files = context.files.sort((left, right) => {
//     const leftPriority = selectedPaths?.get(left.path) ?? Infinity;
//     const rightPriority = selectedPaths?.get(right.path) ?? Infinity;
//     if (leftPriority !== rightPriority) return leftPriority - rightPriority;
//     return compareUnicodeCodePoints(left.path, right.path);
//   });
//   const unanalyzedFiles = createUnanalyzedArtifactLookup(
//     snapshot,
//     context.containers,
//   );
//   const unavailableRelevantFiles = [...inventory.unavailableFiles]
//     .sort(compareUnicodeCodePoints)
//     .flatMap((path) => {
//       const unavailable = unanalyzedFiles.get(path);
//       return unavailable === undefined ? [] : [unavailable];
//     });
//   assertExpectedFilesWereVisited(expected, files);
//   return {
//     files,
//     unanalyzed_files: unanalyzedFiles,
//     unavailable_relevant_files: unavailableRelevantFiles,
//     containers: context.containers.sort((left, right) =>
export const _l = 158;
