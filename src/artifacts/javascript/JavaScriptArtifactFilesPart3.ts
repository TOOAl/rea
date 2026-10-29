export const __stub = 1;
//   if (failure !== undefined) throw failure.cause;
// };
//
// const readText = async (
//   context: ReadContext,
//   input: ReadTextInput,
// ): Promise<JavaScriptArtifactFile["text"]> => {
//   if (
//     context.selectedPaths !== undefined &&
//     !context.selectedPaths.has(input.expected.path)
//   ) {
//     // Keep the inventory/acquisition identity check without allocating or
//     // decoding an unrelated source's text.
//     await verifyEntryBytes(
//       await input.reader.open(input.entry, context.signal),
//       input.expected,
//       context.signal,
//     );
//     return { included: false, reason: "outside-analysis-scope" };
//   }
//   if (input.expected.kind === "native-addon") {
//     await verifyEntryBytes(
//       await input.reader.open(input.entry, context.signal),
//       input.expected,
//       context.signal,
//     );
//     return { included: false, reason: "not-applicable" };
//   }
//   const bytes = await readAll(
//     await input.reader.open(input.entry, context.signal),
//     context.signal,
//   );
//   const digest = createHash("sha256").update(bytes).digest("hex");
//   if (digest !== input.expected.sha256 || bytes.length !== input.expected.bytes)
//     throw new ArtifactReaderFailure(
//       "integrity",
//       `Artifact entry changed after inventory: ${input.expected.path}`,
//     );
//   context.textBytes += bytes.length;
//   try {
//     return {
//       included: true,
//       value: new TextDecoder("utf-8", {
//         fatal: true,
//         ignoreBOM:
//           input.expected.kind === "javascript" ||
//           input.expected.kind === "html",
//       }).decode(bytes),
//     };
//   } catch (cause: unknown) {
//     // Non-UTF8 bytes are counted; the fixed reason preserves the schema.
//     void cause;
//     context.invalidUtf8 += 1;
//     return { included: false, reason: "invalid-utf8" };
//   }
// };
//
// const verifyEntryBytes = async (
//   stream: Readable,
//   expected: Pick<ExpectedFile, "path" | "sha256" | "bytes">,
//   signal?: AbortSignal,
// ): Promise<void> => {
//   try {
//     const digest = await hashReadable(stream, signal);
//     if (digest.sha256 !== expected.sha256 || digest.bytes !== expected.bytes)
//       throw new ArtifactReaderFailure(
//         "integrity",
//         `Artifact entry changed after inventory: ${expected.path}`,
//       );
//   } catch (cause: unknown) {
//     abortIfNeeded(signal);
//     throw cause;
//   }
// };
//
// const expectedInventory = (
//   snapshot: ArtifactInventorySnapshot,
// ): {
//   readonly files: ReadonlyMap<string, ExpectedFile>;
//   readonly containers: ReadonlyMap<string, ExpectedContainer>;
//   readonly unavailableFiles: ReadonlySet<string>;
// } => {
//   const nodes = new Map(snapshot.nodes.map((node) => [node.artifact_id, node]));
//   const files = new Map<string, ExpectedFile>();
//   const containers = new Map<string, ExpectedContainer>();
//   const unavailableFiles = new Set<string>();
//   for (const occurrence of snapshot.occurrences) {
//     if (occurrence.logical_path === ".") continue;
//     const isNestedAsar =
//       occurrence.entry_kind === "file" &&
//       occurrence.logical_path.toLowerCase().endsWith(".asar");
//     if (occurrence.artifact_id === null) {
//       if (
//         occurrence.entry_kind === "file" &&
//         relevantKind(occurrence.logical_path) !== undefined
//       )
//         unavailableFiles.add(occurrence.logical_path);
//       if (isNestedAsar)
//         containers.set(occurrence.logical_path, {
//           hash_status: occurrence.hash_status,
//           format: occurrence.artifact_format,
//           inventory: null,
//         });
//       continue;
//     }
//     const node = nodes.get(occurrence.artifact_id);
//     if (node === undefined)
//       throw new ArtifactReaderFailure(
//         "integrity",
//         `Artifact inventory node is missing: ${occurrence.logical_path}`,
//       );
//     // Inventory occurrences can have content identities for directories too.
//     // Suffixes only describe file candidates; a directory such as
//     // node_modules/@zip.js remains a graph node and must never be opened.
//     if (occurrence.entry_kind !== "file") continue;
//     if (isNestedAsar)
//       containers.set(occurrence.logical_path, {
//         hash_status: occurrence.hash_status,
//         format: occurrence.artifact_format,
//         inventory: {
//           path: occurrence.logical_path,
//           sha256: node.sha256,
//           bytes: node.size,
//           inventory_artifact_id: node.artifact_id,
//         },
//       });
//     const kind = relevantKind(occurrence.logical_path);
//     if (kind === undefined) continue;
//     files.set(occurrence.logical_path, {
//       path: occurrence.logical_path,
//       sha256: node.sha256,
//       bytes: node.size,
//       inventoryArtifactId: node.artifact_id,
//       kind,
//     });
//   }
//   return { files, containers, unavailableFiles };
// };
//
// /** Canonical snapshot arrays are already ordered by code-point identity. */
// const lowerBound = <T>(
//   rows: readonly T[],
//   key: string,
//   identity: (row: T) => string,
// ): number => {
//   let low = 0;
//   let high = rows.length;
//   while (low < high) {
//     const middle = low + Math.floor((high - low) / 2);
//     const row = rows[middle];
//     if (row !== undefined && compareUnicodeCodePoints(identity(row), key) < 0)
//       low = middle + 1;
//     else high = middle;
//   }
//   return low;
// };
//
// const createUnanalyzedArtifactLookup = (
export const _l = 158;
