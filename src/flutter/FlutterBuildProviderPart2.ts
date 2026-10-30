export const __stub = 1;
//   if (bytes > APK_MAX_BYTES)
//     throw new AnalysisResourceConstraintError(
//       operation,
//       "file-size",
//       `The selected APK exceeds the ${String(APK_MAX_BYTES)}-byte snapshot budget`,
//       { max_apk_bytes: APK_MAX_BYTES, observed_bytes: bytes },
//     );
// };
//
// export interface FlutterProviderOptions {
//   /** Deterministic root removal for tests; production removes recursively. */
//   readonly removeRoot?: (path: string) => Promise<void>;
// }
//
// /**
//  * Flutter build identification by pure parsing: reads `lib/<abi>/libapp.so`
//  * and `libflutter.so` through the hardened ZIP reader and reports the Dart
//  * snapshot hash, GNU build-id, and any labeled version strings verbatim.
//  * Runs no engine, installs nothing, and performs no external lookups.
//  */
// export class FlutterBuildProvider {
//   private readonly ownedRoots = new Map<
//     string,
//     Set<{ close(): Promise<void> }>
//   >();
//   private readonly removeRoot: (path: string) => Promise<void>;
//   private readonly cleanupFailures = new Map<string, readonly unknown[]>();
//
//   constructor(options: FlutterProviderOptions = {}) {
//     this.removeRoot =
//       options.removeRoot ??
//       ((path) => rm(path, { recursive: true, force: true }));
//   }
//
//   /**
//    * Snapshot the admitted input into a provider-owned, read-only copy so a
//    * concurrently modified original cannot mix into one observation. The
//    * digest is taken from the snapshot, and every later read uses the
//    * snapshot path.
//    */
//   private async ownSnapshot(
//     operation: string,
//     path: string,
//     signal: AbortSignal | undefined,
//   ): Promise<OwnedSnapshot> {
//     let root: string;
//     try {
//       root = await mkdtemp(join(tmpdir(), "rea-flutter-"));
//     } catch (cause) {
//       throw mapOwnedIoFailure(operation, cause);
//     }
//     this.ownedRoots.set(root, new Set());
//     const snapshotPath = join(root, "input.apk");
//     const readSource = async <T>(read: () => Promise<T>): Promise<T> => {
//       try {
//         return await read();
//       } catch (cause) {
//         throw mapInputFailure(operation, path, cause);
//       }
//     };
//     try {
//       // Pin the admitted source: capture its identity before the copy and
//       // revalidate after, so an in-place replacement or swap mid-copy is
//       // refused instead of publishing mixed bytes under the original path.
//       // The copy itself is streamed and abort-checked so cancellation
//       // stops the write promptly instead of draining the whole file.
//       let source: OwnedFileHandle;
//       try {
//         source = this.ownResource(
//           root,
//           new OwnedFileHandle(
//             await openRegularFile(path, { symlinks: "follow", signal }),
//           ),
//         );
//       } catch (cause) {
//         if (cause instanceof RegularFileAdmissionFailure) {
//           this.ownResource(root, cause.owner);
//           throw mapInputFailure(operation, path, cause.cause);
//         }
//         throw mapInputFailure(operation, path, cause);
//       }
//       const before = await readSource(() =>
//         source.handle.stat({ bigint: true }),
//       );
//       checkApkSize(operation, Number(before.size));
//       const output = this.ownResource(
//         root,
//         new OwnedFileHandle(await openFile(snapshotPath, "wx")),
//       );
//       const chunk = Buffer.alloc(64 * 1024);
//       let copiedBytes = 0;
//       while (copiedBytes <= Number(before.size)) {
//         signal?.throwIfAborted();
//         const { bytesRead } = await readSource(() =>
//           source.handle.read(
//             chunk,
//             0,
//             Math.min(chunk.length, Number(before.size) - copiedBytes + 1),
//             copiedBytes,
//           ),
//         );
//         signal?.throwIfAborted();
//         if (bytesRead === 0) break;
//         copiedBytes += bytesRead;
//         if (BigInt(copiedBytes) > before.size)
//           throw new AnalysisArtifactChangedError(
//             operation,
//             path,
//             "Selected file grew during snapshotting",
//           );
//         await output.handle.writeFile(chunk.subarray(0, bytesRead));
//       }
//       await this.releaseResource(root, output);
//       const [after, currentPath] = await Promise.all([
//         readSource(() => source.handle.stat({ bigint: true })),
//         stat(path, { bigint: true }).catch((cause: unknown) => {
//           if (
//             cause instanceof Error &&
//             "code" in cause &&
//             (cause.code === "EACCES" || cause.code === "EPERM")
//           )
//             throw mapInputFailure(operation, path, cause);
//           throw new AnalysisArtifactChangedError(
//             operation,
//             path,
//             "Selected path became unavailable during snapshotting",
//             { cause },
//           );
//         }),
//       ]);
//       if (
//         BigInt(copiedBytes) !== before.size ||
//         !sameRegularFileState(before, after) ||
//         !sameRegularFileState(before, currentPath)
//       )
//         throw new AnalysisArtifactChangedError(
//           operation,
//           path,
//           "Selected file identity or contents changed during snapshotting",
//         );
//       await this.releaseResource(root, source);
//       await chmod(snapshotPath, 0o400);
//       const info = await stat(snapshotPath);
//       const sha256 = await sha256File(operation, snapshotPath, signal);
//       return { root, path: snapshotPath, bytes: info.size, sha256 };
//     } catch (cause) {
//       await this.discardRoot(root);
//       if (signal?.aborted === true)
//         throw new AnalysisCancelledError(operation, { cause });
//       throw mapOwnedIoFailure(operation, cause);
//     }
//   }
//
//   private readerFor(snapshot: OwnedSnapshot): ZipArtifactReader {
//     return this.ownResource(
//       snapshot.root,
//       new ZipArtifactReader(snapshot.path, "apk", APK_METADATA_READ_MAX_BYTES),
//     );
//   }
//
//   private ownResource<T extends { close(): Promise<void> }>(
//     root: string,
//     resource: T,
//   ): T {
//     this.ownedRoots.get(root)!.add(resource);
//     return resource;
//   }
//
//   private async releaseResource(
//     root: string,
//     resource: { close(): Promise<void> },
//   ): Promise<void> {
//     await resource.close();
//     this.ownedRoots.get(root)?.delete(resource);
//   }
//
//   /** Close every owned handle before removing its root; retain any failure. */
//   private async discardRoot(root: string): Promise<boolean> {
//     const resources = this.ownedRoots.get(root);
//     if (resources === undefined) return true;
//     const attempts = await Promise.allSettled(
//       [...resources].map((resource) => this.releaseResource(root, resource)),
//     );
//     const failures = attempts.flatMap((attempt) =>
//       attempt.status === "rejected" ? [attempt.reason as unknown] : [],
//     );
//     if (failures.length > 0) {
//       this.cleanupFailures.set(root, failures);
//       return false;
//     }
//     try {
//       await this.removeRoot(root);
//       this.ownedRoots.delete(root);
//       this.cleanupFailures.delete(root);
//       return true;
//     } catch (cause) {
//       this.cleanupFailures.set(root, [cause]);
//       return false;
//     }
//   }
//
//   /** Pure parsing; the provider is always available. */
//   async inspectAvailability(): Promise<ProviderAvailability> {
//     return {
//       status: "available",
//       code: null,
//       reason: null,
//       diagnostics: { engine: "static-apk-parsing" },
//     };
//   }
//
//   /** Retain failed snapshot cleanup ownership and retry it on close. */
//   async close(): Promise<void> {
//     const failures: unknown[] = [];
//     for (const root of [...this.ownedRoots.keys()]) {
//       if (!(await this.discardRoot(root)))
//         failures.push(
//           new AggregateError(
//             this.cleanupFailures.get(root)!,
//             `snapshot root retained: ${root}`,
//           ),
//         );
//     }
//     if (failures.length > 0)
//       throw new AggregateError(failures, "Flutter snapshot cleanup failed");
//   }
//
//   async execute(
//     request: FlutterRequest,
//     options?: ExecutionOptions,
//   ): Promise<Result<AnalysisExecution, AnalysisError>> {
//     if (options?.signal?.aborted === true)
//       return err(new AnalysisCancelledError(request.operation));
//     const { path } = request.input;
//     const signal = options?.signal;
//     let snapshot: OwnedSnapshot | undefined;
//     let result: Result<AnalysisExecution, AnalysisError>;
//     try {
//       snapshot = await this.ownSnapshot(request.operation, path, signal);
//       const reader = this.readerFor(snapshot);
//       const libraries = await collectFlutterLibraries(
//         reader,
//         request.operation,
//         path,
//         signal,
//       );
//       result =
//         request.operation === "inspect_dart_aot"
//           ? await this.inspectDartAot(
//               path,
//               request.input.abi,
//               signal,
//               snapshot,
//               reader,
//               libraries,
//             )
//           : await this.identifyFlutterBuild(
//               path,
//               signal,
//               snapshot,
//               reader,
//               libraries,
//             );
//     } catch (cause) {
//       result = err(mapOwnedIoFailure(request.operation, cause));
//     } finally {
//       if (snapshot !== undefined) await this.discardRoot(snapshot.root);
//     }
//     if (signal?.aborted === true)
//       return err(
//         new AnalysisCancelledError(request.operation, { cause: signal.reason }),
//       );
//     return result;
//   }
//
//   private async identifyFlutterBuild(
//     path: string,
//     signal: AbortSignal | undefined,
//     snapshot: OwnedSnapshot,
//     reader: ZipArtifactReader,
//     flutterEntries: readonly FlutterLibrary[],
//   ): Promise<Result<AnalysisExecution, AnalysisError>> {
//     const operation = "identify_flutter_build";
//     for (const { entry } of flutterEntries) {
//       if (entry.declaredSize !== null && entry.declaredSize > LIBRARY_MAX_BYTES)
//         return err(
//           new AnalysisResourceConstraintError(
//             operation,
//             "file-size",
//             `${entry.path} exceeds the library read budget`,
//             { max_library_bytes: LIBRARY_MAX_BYTES, entry_path: entry.path },
//           ),
//         );
//     }
//     // Preflight: refuse before any I/O when the declared entry sizes
//     // already exceed the cumulative budget, even though streaming might
//     // discover smaller actual sizes.
//     const declaredTotal = flutterEntries.reduce(
//       (total, { entry }) => total + (entry.declaredSize ?? 0),
//       0,
//     );
//     if (declaredTotal > TOTAL_EXTRACTION_MAX_BYTES)
//       return err(
//         new AnalysisResourceConstraintError(
//           operation,
//           "file-size",
//           `declared library sizes total ${String(declaredTotal)} bytes, exceeding the ${String(TOTAL_EXTRACTION_MAX_BYTES)}-byte cumulative budget before any extraction`,
//           {
//             max_total_bytes: TOTAL_EXTRACTION_MAX_BYTES,
//             declared_total: declaredTotal,
//           },
//         ),
export const _l = 312;
