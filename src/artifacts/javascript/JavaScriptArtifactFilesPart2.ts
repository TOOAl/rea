export const __stub = 1;
//       compareUnicodeCodePoints(left.path, right.path),
//     ),
//     text_bytes_read: context.textBytes,
//     invalid_utf8_files: context.invalidUtf8,
//     ...(sourcePaths === undefined
//       ? {}
//       : {
//           source_selection: {
//             requested_paths: [...sourcePaths],
//             unselected_files: files.filter(
//               ({ text }) =>
//                 !text.included && text.reason === "outside-analysis-scope",
//             ).length,
//           },
//         }),
//   };
// };
//
// const visitReader = async (
//   reader: ArtifactReader,
//   prefix: string,
//   containerSha256: string,
//   context: ReadContext,
// ): Promise<void> => {
//   const stack: Array<{
//     readonly reader: ArtifactReader;
//     readonly prefix: string;
//     readonly containerSha256: string;
//     readonly iterator: AsyncIterator<ArtifactEntry>;
//   }> = [
//     {
//       reader,
//       prefix,
//       containerSha256,
//       iterator: reader.entries(context.signal)[Symbol.asyncIterator](),
//     },
//   ];
//   const ownedReaders: {
//     readonly reader: ArtifactReader;
//     readonly path: string;
//   }[] = [];
//   let failure: { readonly cause: unknown } | undefined;
//   try {
//     while (stack.length > 0) {
//       const frame = stack.at(-1);
//       if (frame === undefined) break;
//       const next = await frame.iterator.next();
//       if (next.done) {
//         stack.pop();
//         continue;
//       }
//       const entry = next.value;
//       abortIfNeeded(context.signal);
//       const path = normalizeArtifactPath(
//         frame.prefix === "" ? entry.path : `${frame.prefix}/${entry.path}`,
//       );
//       const nestedAsar = isFilesystemAsar(entry, path);
//       context.registry.add(path, nestedAsar ? "directory" : entry.kind);
//       if (nestedAsar) {
//         const container = context.expectedContainers.get(path);
//         // Inventory deliberately does not expand unverified or unavailable
//         // nested archives. Keep the same boundary here when reconstruction
//         // reads the active entries again.
//         if (container === undefined)
//           throw new ArtifactReaderFailure(
//             "integrity",
//             `Nested ASAR was not present in inventory: ${path}`,
//           );
//         if (container.hash_status === "mismatched") continue;
//         if (container.hash_status === "unavailable")
//           throw new ArtifactReaderFailure(
//             "unavailable",
//             `Nested ASAR bytes were unavailable during inventory: ${path}`,
//           );
//         if (container.hash_status !== "verified")
//           throw new ArtifactReaderFailure(
//             "integrity",
//             `Nested ASAR was not integrity-verified: ${path}`,
//           );
//         // Inventory expands an ASAR-named file only when its bytes are an
//         // ASAR. One it recorded as ordinary bytes has no members to read.
//         if (container.format !== "asar") continue;
//         const inventory = container.inventory;
//         if (inventory === null)
//           throw new ArtifactReaderFailure(
//             "integrity",
//             `Verified nested ASAR has no inventory node: ${path}`,
//           );
//         await verifyEntryBytes(
//           await frame.reader.open(entry, context.signal),
//           inventory,
//           context.signal,
//         );
//         context.containers.push(inventory);
//         const nested = new AsarArtifactReader(entry.adapterKey);
//         ownedReaders.push({ reader: nested, path });
//         stack.push({
//           reader: nested,
//           prefix: path,
//           containerSha256: inventory.sha256,
//           iterator: nested.entries(context.signal)[Symbol.asyncIterator](),
//         });
//         await nested.prepareContainer(inventory.sha256, context.signal);
//         continue;
//       }
//       const expected = context.expected.get(path);
//       if (expected === undefined) continue;
//       const text = await readText(context, {
//         reader: frame.reader,
//         entry,
//         expected,
//       });
//       context.files.push({
//         path,
//         container_sha256: frame.containerSha256,
//         sha256: expected.sha256,
//         bytes: expected.bytes,
//         inventory_artifact_id: expected.inventoryArtifactId,
//         kind: expected.kind,
//         unpacked: entry.unpacked,
//         text,
//       });
//     }
//   } catch (cause: unknown) {
//     failure = { cause };
//   } finally {
//     for (const { iterator, prefix, reader } of stack.reverse()) {
//       try {
//         await iterator.return?.();
//       } catch (cause: unknown) {
//         failure = {
//           cause: ArtifactReaderFailure.withCleanup(
//             failure === undefined ? cause : failure.cause,
//             ArtifactReaderFailure.cleanupObservation(
//               cause,
//               `JavaScript artifact traversal for ${prefix || reader.format}`,
//             ),
//           ),
//         };
//       }
//     }
//     for (const owned of ownedReaders.reverse()) {
//       const resource = `nested ASAR reader for ${owned.path}`;
//       const cleanup = await context.resources.release({
//         kind: "reader",
//         reader: owned.reader,
//         resource,
//       });
//       if (cleanup.kind === "failed") {
//         failure = {
//           cause: ArtifactReaderFailure.withCleanup(
//             failure === undefined ? cleanup.cause : failure.cause,
//             ArtifactReaderFailure.cleanupObservation(cleanup.cause, resource),
//           ),
//         };
//       }
//     }
//   }
export const _l = 158;
