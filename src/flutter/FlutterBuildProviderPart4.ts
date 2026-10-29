export const __stub = 1;
//               `lib/${selected.abi}/libapp.so exceeds the ${String(LIBRARY_MAX_BYTES)}-byte read budget while streaming`,
//               { max_library_bytes: LIBRARY_MAX_BYTES },
//             ),
//           );
//         imageHash.update(view);
//         await imageWriter.handle.writeFile(view);
//       }
//     }
//     await this.releaseResource(snapshot.root, imageWriter);
//     const imageSha256 = imageHash.digest("hex");
//     // Allocate exactly the budget-checked size before reading, so the
//     // buffer cannot exceed the declared library size plus one byte.
//     const image = Buffer.alloc(declared + 1);
//     let imageLength = 0;
//     {
//       const file = this.ownResource(
//         snapshot.root,
//         new OwnedFileHandle(await openFile(imagePath, "r")),
//       );
//       while (imageLength < image.length) {
//         if (signal?.aborted === true)
//           return err(new AnalysisCancelledError("inspect_dart_aot"));
//         const result = await file.handle.read(
//           image,
//           imageLength,
//           image.length - imageLength,
//           null,
//         );
//         signal?.throwIfAborted();
//         if (result.bytesRead === 0) break;
//         imageLength += result.bytesRead;
//       }
//       await this.releaseResource(snapshot.root, file);
//     }
//     signal?.throwIfAborted();
//     const bounded = image.subarray(0, imageLength);
//     const symbolNames = [
//       "_kDartVmSnapshotData",
//       "_kDartVmSnapshotInstructions",
//       "_kDartIsolateSnapshotData",
//       "_kDartIsolateSnapshotInstructions",
//     ];
//     const sections: {
//       name: string;
//       offset: number;
//       size: number;
//       magic_valid: boolean;
//       kind: number | null;
//       header_length: number | null;
//     }[] = [];
//     const dataHeaders: {
//       name: string;
//       offset: number;
//       size: number;
//       header: ReturnType<typeof readSnapshotHeader>;
//     }[] = [];
//     let isolateData: Buffer | null = null;
//     const inventory = await readElfSymbols(bounded, symbolNames, signal);
//     for (const symbol of inventory.symbols) {
//       const name = symbol.name;
//       const header = name.endsWith("Data")
//         ? readSnapshotHeader(
//             bounded.subarray(symbol.offset, symbol.offset + symbol.size),
//             0,
//           )
//         : null;
//       sections.push({
//         name,
//         offset: symbol.offset,
//         size: symbol.size,
//         magic_valid: header?.magicValid ?? false,
//         kind: header?.kind ?? null,
//         header_length: header?.headerLength ?? null,
//       });
//       if (header !== null) dataHeaders.push({ ...symbol, header });
//       if (name === "_kDartIsolateSnapshotData")
//         isolateData = image.subarray(
//           symbol.offset,
//           symbol.offset + symbol.size,
//         );
//     }
//     // Each exported data symbol owns one header at its start. Matching
//     // records elsewhere in a symbol are not evidence for the other
//     // symbol's hash. Count a physical header only once for aliased exports.
//     const observedOffsets = new Set<number>();
//     let aliasedDataSymbols = false;
//     const hashes: string[] = [];
//     for (const section of dataHeaders) {
//       if (observedOffsets.has(section.offset)) {
//         aliasedDataSymbols = true;
//         continue;
//       }
//       observedOffsets.add(section.offset);
//       if (section.header.hash !== null) hashes.push(section.header.hash);
//     }
//     const hashScan = {
//       sources: hashes.length,
//       candidates: [...new Set(hashes)],
//     };
//     const overlappingDataSymbols = dataHeaders.some((section, index) =>
//       dataHeaders
//         .slice(0, index)
//         .some(
//           (previous) =>
//             previous.offset < section.offset + section.size &&
//             section.offset < previous.offset + previous.size,
//         ),
//     );
//     if (sections.length === 0)
//       return err(
//         new AnalysisUnsupportedTargetError(
//           "inspect_dart_aot",
//           path,
//           `No recognizable Dart snapshot symbols were found: ${inventory.failures.map((failure) => failure.reason).join("; ")}`,
//         ),
//       );
//     const pool = await projectStringPool(isolateData, signal);
//     const snapshotPartial =
//       inventory.failures.length > 0 ||
//       aliasedDataSymbols ||
//       overlappingDataSymbols ||
//       sections.length < symbolNames.length ||
//       dataHeaders.length !== SYMBOL_PAIR_COUNT ||
//       dataHeaders.some((section) => !section.header.complete) ||
//       hashScan.candidates.length !== 1 ||
//       hashScan.sources !== SYMBOL_PAIR_COUNT;
//     const poolPartial =
//       isolateData === null ||
//       pool.collectionCapped ||
//       pool.packageUriCount > MAX_POOL_URIS ||
//       pool.dartUriCount > MAX_POOL_URIS ||
//       pool.classLikeTokenCount > MAX_POOL_TOKENS;
//     return ok(
//       createAnalysisExecution(
//         {
//           target: { path, bytes: snapshot.bytes, sha256: snapshot.sha256 },
//           abi: selected.abi,
//           libapp: {
//             coverage: snapshotPartial ? "partial" : "complete",
//             bytes: imageLength,
//             sha256: imageSha256,
//             snapshot_hash:
//               hashScan.candidates.length === 1 ? hashScan.candidates[0]! : null,
//             snapshot_hash_candidates: [...hashScan.candidates],
//             snapshot_hash_sources: hashScan.sources,
//             sections,
//           },
//           string_pool: {
//             coverage: poolPartial ? "partial" : "complete",
//             package_uris: pool.packageUris.slice(0, MAX_POOL_URIS),
//             package_uri_count_at_least: pool.packageUriCount,
//             dart_uris: pool.dartUris.slice(0, MAX_POOL_URIS),
//             dart_uri_count_at_least: pool.dartUriCount,
//             class_like_tokens: pool.classLikeTokens.slice(0, MAX_POOL_TOKENS),
//             class_like_token_count_at_least: pool.classLikeTokenCount,
//             printable_run_count: pool.printableRunCount,
//           },
//           coverage: snapshotPartial || poolPartial ? "partial" : "complete",
//         },
//         FLUTTER_PROVIDER_IDENTITY,
//         {
//           subject: { path, format: "apk", sha256: snapshot.sha256 },
//           locations: [{ kind: "artifact-path", path }],
//           limitations: [
//             "The APK is read through an owned read-only snapshot; concurrent changes to the original cannot mix into this observation",
//             "Snapshot sections are located through the ELF dynamic symbol table; a payload without exported snapshot symbols is refused rather than guessed",
//             "Snapshot hash sources are the headers at the start of the VM and isolate data symbols; complete decoding supports kind 3 (the Dart 2.14 FullAOT layout), a valid hash and a declared length that fits its symbol, including the four magic bytes; other kind values remain observed with partial coverage",
//             "String-pool entries are byte-pattern observations from the isolate data section, not deserialized cluster semantics; typed class and function recovery needs an SDK-specific parser",
//             "class_like_tokens are identifier-shaped runs and include incidental matches",
//             "string-pool counts are lower bounds: collection stops at twice each projection bound, and any value beyond that is counted only through the capped flag",
//             ...inventory.failures.map((failure) => failure.reason),
//             ...(sections.length < symbolNames.length
//               ? [
//                   `Only ${String(sections.length)} of 4 snapshot symbols were present`,
//                 ]
//               : []),
//             ...(aliasedDataSymbols
//               ? [
//                   "Two or more snapshot data symbols share one header offset; its hash counts as one source instead of two agreeing ones",
//                 ]
//               : []),
//             ...(overlappingDataSymbols && !aliasedDataSymbols
//               ? [
//                   "Snapshot data symbol ranges overlap; independent VM/isolate coverage is not established",
//                 ]
//               : []),
//             ...dataHeaders
//               .filter((section) => !section.header.complete)
//               .map(
//                 (section) =>
//                   `${section.name} has an incomplete or invalid snapshot header: kind ${String(section.header.kind)} (AOT app requires 3), declared length ${String(section.header.headerLength)} excludes the four magic bytes, symbol size ${String(section.size)}, valid hash ${String(section.header.hash !== null)}`,
//               ),
//             ...(pool.collectionCapped
//               ? [
//                   "String-pool collection or printable-run capacity was exceeded; counts are lower bounds and overflowed runs are omitted",
//                 ]
//               : []),
//             ...(pool.dartUriCount > MAX_POOL_URIS
//               ? [
//                   `dart_uris reports ${String(MAX_POOL_URIS)} of at least ${String(pool.dartUriCount)} distinct URIs`,
//                 ]
//               : []),
//             ...(pool.packageUriCount > MAX_POOL_URIS
//               ? [
//                   `package_uris reports ${String(MAX_POOL_URIS)} of at least ${String(pool.packageUriCount)} distinct URIs`,
//                 ]
//               : []),
//             ...(pool.classLikeTokenCount > MAX_POOL_TOKENS
//               ? [
//                   `class_like_tokens reports ${String(MAX_POOL_TOKENS)} of at least ${String(pool.classLikeTokenCount)} distinct tokens`,
//                 ]
//               : []),
//           ],
//         },
//       ),
//     );
//   }
// }
//
// /**
//  * Categorize printable runs from one snapshot data section. Collection stops
//  * admitting new distinct entries once each category reaches its projection
//  * bound times a slack factor, so allocation and sorting stay proportional to
//  * the response rather than to an adversarial payload; counts still reflect
//  * how far scanning proceeded before the collection cap tripped.
//  */
// const projectStringPool = async (
//   section: Buffer | null,
//   signal: AbortSignal | undefined,
// ): Promise<{
//   packageUris: string[];
//   packageUriCount: number;
//   dartUris: string[];
//   dartUriCount: number;
//   classLikeTokens: string[];
//   classLikeTokenCount: number;
//   printableRunCount: number;
//   collectionCapped: boolean;
// }> => {
//   const packages = new Set<string>();
//   const darts = new Set<string>();
//   const tokens = new Set<string>();
//   let runCount = 0;
//   let collectionCapped = false;
//   const COLLECTION_SLACK = 2;
//   /** One printable run never materializes beyond this length. */
//   const MAX_RUN_BYTES = 1024;
//   const packageBudget = MAX_POOL_URIS * COLLECTION_SLACK;
//   const dartBudget = MAX_POOL_URIS * COLLECTION_SLACK;
//   const tokenBudget = MAX_POOL_TOKENS * COLLECTION_SLACK;
//   if (section !== null) {
//     let run = "";
//     const consider = (text: string): void => {
//       if (text.length < 5) return;
//       runCount += 1;
//       if (text.startsWith("package:")) {
//         if (!packages.has(text) && packages.size >= packageBudget)
//           collectionCapped = true;
//         else packages.add(text);
//       } else if (text.startsWith("dart:")) {
//         if (!darts.has(text) && darts.size >= dartBudget)
//           collectionCapped = true;
//         else darts.add(text);
//       } else if (
//         text.length <= 128 &&
//         text.length >= 5 &&
//         IDENTIFIER_PATTERN.test(text)
//       ) {
//         if (!tokens.has(text) && tokens.size >= tokenBudget)
//           collectionCapped = true;
//         else tokens.add(text);
//       }
//     };
//     let overflowed = false;
//     for (let start = 0; start < section.length; start += 64 * 1024) {
//       await yieldToEventLoop();
//       signal?.throwIfAborted();
//       for (const byte of section.subarray(start, start + 64 * 1024)) {
//         if (byte >= 0x20 && byte < 0x7f) {
//           // A single unbounded run (an adversarial NUL-free section) never
//           // materializes: growth stops at the cap and the entire run is
//           // discarded at its delimiter, since a truncated prefix would be
//           // fabricated evidence rather than an observation.
//           if (run.length < MAX_RUN_BYTES) run += String.fromCharCode(byte);
//           else {
//             overflowed = true;
//             collectionCapped = true;
//           }
//         } else {
//           if (!overflowed) consider(run);
//           overflowed = false;
//           run = "";
//         }
//       }
//     }
//     if (!overflowed) consider(run);
//   }
//   signal?.throwIfAborted();
//   return {
//     packageUris: [...packages].sort(),
//     packageUriCount: packages.size,
//     dartUris: [...darts].sort(),
//     dartUriCount: darts.size,
//     classLikeTokens: [...tokens].sort(),
//     classLikeTokenCount: tokens.size,
//     printableRunCount: runCount,
//     collectionCapped,
//   };
// };
export const _l = 309;
