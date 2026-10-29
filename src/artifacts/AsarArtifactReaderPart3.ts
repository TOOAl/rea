export const __stub = 1;
//         throw ArtifactReaderFailure.withCleanup(
//           failure,
//           ArtifactReaderFailure.cleanupObservation(
//             cleanupCause,
//             this.#snapshotRoot ?? this.path,
//           ),
//         );
//       }
//       throw failure;
//     }
//   }
//
//   async #closeSnapshot(): Promise<void> {
//     await this.#closeOwnedHandles();
//     const root = this.#snapshotRoot;
//     if (root !== undefined) {
//       try {
//         await (this.options.removeSnapshot ?? defaultRemoveSnapshot)(root);
//         if (this.#snapshotRoot === root) this.#snapshotRoot = undefined;
//       } catch (cause: unknown) {
//         throw ArtifactReaderFailure.withCleanup(cause, {
//           reason: `Could not remove ASAR snapshot: ${root}`,
//           resources: [root],
//         });
//       }
//     }
//     if (root === undefined || this.#snapshotRoot === undefined) {
//       if (this.#snapshot !== undefined) uncache(this.#snapshot.path);
//       this.#snapshot = undefined;
//       this.#resetArchiveState();
//       this.#entries.clear();
//     }
//   }
//
//   async #withSnapshotOperation<Value>(
//     operation: () => Promise<Value>,
//     signal?: AbortSignal,
//   ): Promise<Value> {
//     const previous = this.#snapshotOperation;
//     let release!: () => void;
//     this.#snapshotOperation = new Promise<void>((resolve) => {
//       release = resolve;
//     });
//     try {
//       await waitForOperation(previous, signal);
//     } catch (cause: unknown) {
//       void previous.then(release, release);
//       throw cause;
//     }
//     try {
//       abortIfNeeded(signal);
//       return await operation();
//     } finally {
//       release();
//     }
//   }
//
//   #snapshotPath(): string {
//     if (this.#snapshot === undefined)
//       throw new ArtifactReaderFailure(
//         "integrity",
//         "ASAR snapshot is not available",
//       );
//     return this.#snapshot.path;
//   }
//
//   provenance(): readonly [] {
//     return [];
//   }
//
//   async #openUnpackedStream(
//     entry: ArtifactEntry,
//     signal?: AbortSignal,
//   ): Promise<Readable> {
//     const unpackedRoot = `${this.path}.unpacked`;
//     let handle: SharedAsarFileHandle | undefined;
//     try {
//       const rootMetadata = await lstat(unpackedRoot);
//       if (!rootMetadata.isDirectory() || rootMetadata.isSymbolicLink())
//         throw new ArtifactReaderFailure(
//           "path",
//           "ASAR unpacked companion is not a regular directory",
//         );
//       const canonicalRoot = await realpath(unpackedRoot);
//       const candidate = join(unpackedRoot, entry.adapterKey);
//       const canonical = await realpath(candidate);
//       const relativePath = relative(canonicalRoot, canonical);
//       if (
//         relativePath === ".." ||
//         relativePath.startsWith(`..${sep}`) ||
//         isAbsolute(relativePath)
//       )
//         throw new ArtifactReaderFailure(
//           "path",
//           `ASAR unpacked entry escaped its companion directory: ${entry.path}`,
//         );
//       const pathMetadata = await lstat(candidate);
//       if (!pathMetadata.isFile() || pathMetadata.isSymbolicLink())
//         throw new ArtifactReaderFailure(
//           "path",
//           `ASAR unpacked entry is not a regular file: ${entry.path}`,
//         );
//       handle = await (this.options.openUnpackedFile ?? open)(
//         canonical,
//         constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK,
//       );
//       const openedHandle = handle;
//       this.#adoptHandle(openedHandle, canonical);
//       const openedMetadata = await openedHandle.stat();
//       if (
//         !openedMetadata.isFile() ||
//         openedMetadata.dev !== pathMetadata.dev ||
//         openedMetadata.ino !== pathMetadata.ino
//       ) {
//         throw new ArtifactReaderFailure(
//           "integrity",
//           `ASAR unpacked entry changed before read: ${entry.path}`,
//           {},
//           {
//             logicalPath: entry.path,
//             declaredSha256: entry.declaredSha256,
//             calculatedSha256: null,
//             unpacked: true,
//           },
//         );
//       }
//       abortIfNeeded(signal);
//       const source = this.#ownedReadStream(openedHandle, { start: 0 });
//       handle = undefined;
//       const output = readValidatedAsarEntry(
//         source,
//         undefined,
//         entry.path,
//         this.path,
//         signal,
//       );
//       this.#setOwnedOutput(openedHandle, output);
//       return output;
//     } catch (cause: unknown) {
//       let failure = asarUnpackedEntryFailure(this.path, entry, cause);
//       if (handle !== undefined && this.#ownedHandles.has(handle)) {
//         try {
//           await this.#closeOwnedHandle(handle);
//         } catch (cleanupCause: unknown) {
//           failure = ArtifactReaderFailure.withCleanup(
//             failure,
//             ArtifactReaderFailure.cleanupObservation(
//               cleanupCause,
//               this.#ownedHandles.get(handle)?.path ?? entry.path,
//             ),
//           );
//         }
//       }
//       throw failure;
//     }
//   }
//
//   async #closeOwnedHandle(handle: SharedAsarFileHandle): Promise<void> {
//     const owned = this.#ownedHandles.get(handle);
//     if (owned === undefined) return;
//     owned.output?.destroy();
//     owned.source?.destroy();
//     try {
//       await owned.owner.close();
//     } catch (cause: unknown) {
//       throw ArtifactReaderFailure.withCleanup(
//         cause,
//         ArtifactReaderFailure.cleanupObservation(cause, owned.path),
//       );
//     }
//     this.#ownedHandles.delete(handle);
//   }
//
//   async #closeOwnedHandles(): Promise<void> {
//     let failure: ArtifactReaderFailure | undefined;
//     for (const [handle, owned] of this.#ownedHandles) {
//       try {
//         await this.#closeOwnedHandle(handle);
//       } catch (cause: unknown) {
//         failure = ArtifactReaderFailure.withCleanup(
//           failure ?? cause,
//           ArtifactReaderFailure.cleanupObservation(cause, owned.path),
//         );
export const _l = 183;
