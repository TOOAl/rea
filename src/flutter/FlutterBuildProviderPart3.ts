export const __stub = 1;
//       );
//
//     const facts = new Map<string, LibraryFacts>();
//     let extractedTotal = 0;
//     let libraryIndex = 0;
//     for (const { entry, abi, kind } of flutterEntries) {
//       const stream = openEntrySafely(reader, entry, operation, path, signal);
//       const hash = createHash("sha256");
//       const snapshotScanner = new SnapshotHashScanner();
//       const labeledScanner = new LabeledStringScanner();
//       const engineFile =
//         kind === "libflutter"
//           ? this.ownResource(
//               snapshot.root,
//               new OwnedFileHandle(
//                 await openFile(
//                   join(snapshot.root, `engine-${libraryIndex++}.so`),
//                   "wx+",
//                 ),
//               ),
//             )
//           : null;
//       let bytes = 0;
//       const headerPrefix = Buffer.alloc(ELF_HEADER_MAX_BYTES);
//       let headerBytes = 0;
//       for await (const chunk of stream) {
//         if (signal?.aborted === true)
//           return err(
//             new AnalysisCancelledError(operation, {
//               cause: signal.reason,
//             }),
//           );
//         const view = chunk as Buffer;
//         headerBytes += view.copy(
//           headerPrefix,
//           headerBytes,
//           0,
//           Math.min(view.length, headerPrefix.length - headerBytes),
//         );
//         bytes += view.byteLength;
//         if (bytes > LIBRARY_MAX_BYTES)
//           return err(
//             new AnalysisResourceConstraintError(
//               operation,
//               "file-size",
//               `${entry.path} exceeds the ${String(LIBRARY_MAX_BYTES)}-byte read budget while streaming`,
//               {
//                 max_library_bytes: LIBRARY_MAX_BYTES,
//                 entry_path: entry.path,
//               },
//             ),
//           );
//         hash.update(view);
//         if (kind === "libapp") snapshotScanner.push(view);
//         else {
//           labeledScanner.push(view);
//           await engineFile!.handle.writeFile(view);
//         }
//         // Enforce the cumulative cap inside the chunk loop so refusal
//         // happens before the remaining bytes are streamed and hashed.
//         if (extractedTotal + bytes > TOTAL_EXTRACTION_MAX_BYTES)
//           return err(
//             new AnalysisResourceConstraintError(
//               operation,
//               "file-size",
//               `cumulative library extraction across ${String(flutterEntries.length)} entries exceeds the ${String(TOTAL_EXTRACTION_MAX_BYTES)}-byte budget`,
//               { max_total_bytes: TOTAL_EXTRACTION_MAX_BYTES },
//             ),
//           );
//       }
//       extractedTotal += bytes;
//       const digest = hash.digest("hex");
//       const current = facts.get(abi) ?? emptyFacts();
//       if (kind === "libapp") {
//         const scan = snapshotScanner.result();
//         if (scan.capped)
//           return err(
//             new AnalysisResourceConstraintError(
//               operation,
//               "memory",
//               "Snapshot hash candidates exceed the retained evidence budget",
//               {
//                 max_snapshot_hash_candidates: MAX_SNAPSHOT_HASH_CANDIDATES,
//                 entry_path: entry.path,
//               },
//             ),
//           );
//         facts.set(abi, {
//           ...current,
//           libapp: {
//             present: true,
//             bytes,
//             sha256: digest,
//             elfHeaderValid:
//               readElfHeader(headerPrefix.subarray(0, headerBytes), bytes)
//                 .header !== undefined,
//             sources: scan.sources,
//             candidates: scan.candidates,
//           },
//         });
//       } else {
//         const labeled = labeledScanner.result();
//         const buildIds = await readElfBuildIds(
//           engineFile!.handle,
//           bytes,
//           signal,
//         );
//         await this.releaseResource(snapshot.root, engineFile!);
//         facts.set(abi, {
//           ...current,
//           libflutter: {
//             present: true,
//             bytes,
//             sha256: digest,
//             buildId:
//               buildIds.failures.length === 0 && buildIds.candidates.length === 1
//                 ? buildIds.candidates[0]!
//                 : null,
//             buildIdCandidates: buildIds.candidates,
//             buildIdFailures: buildIds.failures.map((failure) => failure.reason),
//             ...labeled,
//           },
//         });
//       }
//     }
//     const abis = [...facts.entries()]
//       .map(([abi, value]) => ({
//         abi,
//         libapp: {
//           present: value.libapp.present,
//           bytes: value.libapp.bytes,
//           sha256: value.libapp.sha256,
//           elf_header_valid: value.libapp.elfHeaderValid,
//           snapshot_hash_sources: value.libapp.sources,
//           snapshot_hash_candidates: [...value.libapp.candidates],
//           snapshot_hash:
//             value.libapp.candidates.length === 1
//               ? value.libapp.candidates[0]!
//               : null,
//         },
//         libflutter: {
//           present: value.libflutter.present,
//           bytes: value.libflutter.bytes,
//           sha256: value.libflutter.sha256,
//           build_id: value.libflutter.buildId,
//           build_id_candidates: [...value.libflutter.buildIdCandidates],
//           dart_version: value.libflutter.dartVersion,
//           dart_version_capped: value.libflutter.dartVersionCapped,
//           toolchain_lines: [...value.libflutter.toolchainLines],
//           toolchain_capped: value.libflutter.toolchainCapped,
//         },
//       }))
//       .sort((left, right) => compareUnicodeCodePoints(left.abi, right.abi));
//     const flutterDetected = abis.some((entry) => entry.libapp.present);
//     const partial =
//       abis.some(
//         (entry) =>
//           (entry.libapp.present &&
//             (entry.libapp.snapshot_hash === null ||
//               entry.libapp.snapshot_hash_sources !== 2 ||
//               entry.libapp.elf_header_valid !== true)) ||
//           entry.libflutter.toolchain_capped ||
//           entry.libflutter.dart_version_capped ||
//           entry.libapp.present !== entry.libflutter.present,
//       ) ||
//       [...facts.values()].some(
//         (value) =>
//           value.libflutter.buildIdFailures.length > 0 ||
//           value.libflutter.buildIdCandidates.length > 1,
//       );
//     return ok(
//       createAnalysisExecution(
//         {
//           target: { path, bytes: snapshot.bytes, sha256: snapshot.sha256 },
//           flutter_detected: flutterDetected,
//           abis,
//           coverage: partial ? "partial" : "complete",
//         },
//         FLUTTER_PROVIDER_IDENTITY,
//         {
//           subject: { path, format: "apk", sha256: snapshot.sha256 },
//           locations: [{ kind: "artifact-path", path }],
//           limitations: [
//             "The APK is read through an owned read-only snapshot; concurrent changes to the original cannot mix into this observation",
//             "The snapshot hash identifies a Dart SDK build only against an external mapping dataset; REA performs no lookup",
//             "Release engine builds often carry no labeled Dart version string; absence is reported, not guessed",
//             "Engine build IDs come only from ELF-declared PT_NOTE/SHT_NOTE records; conflicting or incompletely examined notes preserve candidates and report partial coverage",
//             ...[...facts].flatMap(([abi, value]) => [
//               ...value.libflutter.buildIdFailures.map(
//                 (reason) => `lib/${abi}/libflutter.so: ${reason}`,
//               ),
//               ...(value.libflutter.buildIdCandidates.length > 1
//                 ? [`lib/${abi}/libflutter.so has conflicting GNU build IDs`]
//                 : []),
//             ]),
//             ...abis
//               .filter((entry) => entry.libflutter.toolchain_capped)
//               .map(
//                 (entry) =>
//                   `lib/${entry.abi}/libflutter.so has toolchain labels omitted by the complete-label grammar or the 4-line projection`,
//               ),
//             ...abis
//               .filter((entry) => entry.libflutter.dart_version_capped)
//               .map(
//                 (entry) =>
//                   `lib/${entry.abi}/libflutter.so has Dart version labels omitted by the complete-label grammar or the single-version projection`,
//               ),
//             "The snapshot hash sits 20 bytes after each snapshot magic in the AOT payload; findings are observations of that layout",
//             "ELF header validity checks the supported header layout and declared table extents; identification does not resolve symbols or validate table contents",
//             ...abis
//               .filter(
//                 (entry) =>
//                   entry.libapp.present &&
//                   entry.libapp.snapshot_hash_sources !== 2,
//               )
//               .map(
//                 (entry) =>
//                   `lib/${entry.abi}/libapp.so carries ${String(entry.libapp.snapshot_hash_sources)} snapshot section(s); a complete AOT payload carries two, so the library is truncated or nonstandard`,
//               ),
//             ...abis
//               .filter(
//                 (entry) =>
//                   entry.libapp.present &&
//                   entry.libapp.elf_header_valid !== true,
//               )
//               .map(
//                 (entry) =>
//                   `lib/${entry.abi}/libapp.so has a truncated, malformed, or unsupported ELF header or table extent; byte-scanned hashes remain observations only`,
//               ),
//             ...(flutterDetected
//               ? []
//               : [
//                   "No lib/*/libapp.so was found; the target does not carry a Flutter AOT payload",
//                 ]),
//           ],
//         },
//       ),
//     );
//   }
//
//   private async inspectDartAot(
//     path: string,
//     abi: string | undefined,
//     signal: AbortSignal | undefined,
//     snapshot: OwnedSnapshot,
//     reader: ZipArtifactReader,
//     libraries: readonly FlutterLibrary[],
//   ): Promise<Result<AnalysisExecution, AnalysisError>> {
//     const candidates = libraries.filter((library) => library.kind === "libapp");
//     if (candidates.length === 0)
//       return err(
//         new AnalysisUnsupportedTargetError(
//           "inspect_dart_aot",
//           path,
//           "No lib/<abi>/libapp.so was found; the target carries no Dart AOT payload",
//         ),
//       );
//     const preference = ["arm64-v8a", "x86_64", "x86", "armeabi-v7a"];
//     const selected =
//       abi === undefined
//         ? [...candidates].sort(
//             (left, right) =>
//               (preference.indexOf(left.abi) + 1 || preference.length + 1) -
//                 (preference.indexOf(right.abi) + 1 || preference.length + 1) ||
//               compareUnicodeCodePoints(left.abi, right.abi),
//           )[0]!
//         : candidates.find((candidate) => candidate.abi === abi);
//     if (selected === undefined)
//       return err(
//         new AnalysisUnsupportedTargetError(
//           "inspect_dart_aot",
//           path,
//           `No libapp.so was found for ABI ${abi ?? "(none)"}; available: ${candidates
//             .map((candidate) => candidate.abi)
//             .join(", ")}`,
//         ),
//       );
//     const declared = selected.entry.declaredSize ?? LIBRARY_MAX_BYTES + 1;
//     if (declared > LIBRARY_MAX_BYTES)
//       return err(
//         new AnalysisResourceConstraintError(
//           "inspect_dart_aot",
//           "file-size",
//           `lib/${selected.abi}/libapp.so declares ${String(declared)} bytes, exceeding the ${String(LIBRARY_MAX_BYTES)}-byte read budget`,
//           { max_library_bytes: LIBRARY_MAX_BYTES },
//         ),
//       );
//     const imagePath = join(snapshot.root, "libapp.so");
//     const imageHash = createHash("sha256");
//     const imageWriter = this.ownResource(
//       snapshot.root,
//       new OwnedFileHandle(await openFile(imagePath, "wx")),
//     );
//     {
//       const stream = openEntrySafely(
//         reader,
//         selected.entry,
//         "inspect_dart_aot",
//         path,
//         signal,
//       );
//       let total = 0;
//       for await (const chunk of stream) {
//         if (signal?.aborted === true)
//           return err(new AnalysisCancelledError("inspect_dart_aot"));
//         const view = chunk as Buffer;
//         total += view.byteLength;
//         if (total > LIBRARY_MAX_BYTES)
//           return err(
//             new AnalysisResourceConstraintError(
//               "inspect_dart_aot",
//               "file-size",
export const _l = 312;
