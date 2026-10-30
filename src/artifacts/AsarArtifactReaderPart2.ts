export const __stub = 1;
//     return this.#openPackedStream(state, signal);
//   }
//
//   async #openPackedStream(
//     state: AsarEntryState,
//     signal?: AbortSignal,
//   ): Promise<Readable> {
//     const { metadata, entry: producedEntry } = state;
//     const archiveSize = this.#archiveSize;
//     const headerSize = this.#headerSize;
//     const offset =
//       metadata.offset === undefined
//         ? undefined
//         : parseArchiveOffset(metadata.offset);
//     const start =
//       offset === undefined || headerSize === undefined
//         ? undefined
//         : 8 + headerSize + offset;
//     if (
//       archiveSize === undefined ||
//       start === undefined ||
//       !Number.isSafeInteger(start) ||
//       metadata.size < 0 ||
//       !Number.isSafeInteger(metadata.size) ||
//       start > archiveSize ||
//       metadata.size > archiveSize - start
//     )
//       throw new ArtifactReaderFailure(
//         "format",
//         `ASAR entry range is outside its container: ${producedEntry.path}`,
//       );
//     const snapshotPath = this.#snapshotPath();
//     let handle: SharedAsarFileHandle | undefined;
//     try {
//       const openedHandle = await this.#openOwned(
//         snapshotPath,
//         constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK,
//       );
//       handle = openedHandle;
//       const observed = await openedHandle.stat();
//       abortIfNeeded(signal);
//       if (!observed.isFile() || observed.size !== archiveSize)
//         throw new ArtifactReaderFailure(
//           "integrity",
//           `ASAR container changed before read: ${producedEntry.path}`,
//         );
//       if (metadata.size === 0) {
//         handle = undefined;
//         await closeAsarHandle(
//           () => this.#closeOwnedHandle(openedHandle),
//           signal,
//         );
//         return Readable.from([]);
//       }
//       const source = this.#ownedReadStream(openedHandle, {
//         start,
//         end: start + metadata.size - 1,
//         signal,
//       });
//       handle = undefined;
//       const output = readValidatedAsarEntry(
//         source,
//         metadata.size,
//         producedEntry.path,
//         this.path,
//         signal,
//       );
//       this.#setOwnedOutput(openedHandle, output);
//       return output;
//     } catch (cause: unknown) {
//       const failure = asarFailure(
//         this.path,
//         `read ${producedEntry.path}`,
//         cause,
//       );
//       if (handle !== undefined) {
//         try {
//           await this.#closeOwnedHandle(handle);
//         } catch (cleanupCause: unknown) {
//           throw ArtifactReaderFailure.withCleanup(
//             failure,
//             ArtifactReaderFailure.cleanupObservation(
//               cleanupCause,
//               snapshotPath,
//             ),
//           );
//         }
//       }
//       throw failure;
//     }
//   }
//
//   /** Capture once per reader lifetime; bind all interpretation to these exact bytes. */
//   async prepareContainer(
//     expectedSha256?: string,
//     signal?: AbortSignal,
//   ): Promise<void> {
//     await this.#withSnapshotOperation(async () => {
//       abortIfNeeded(signal);
//       if (this.#snapshot === undefined && this.#snapshotRoot !== undefined)
//         await this.#closeSnapshot();
//       if (this.#snapshot === undefined) await this.#captureSnapshot(signal);
//       if (
//         expectedSha256 !== undefined &&
//         this.#snapshot?.sha256 !== expectedSha256
//       )
//         throw new ArtifactReaderFailure(
//           "integrity",
//           `ASAR container changed before interpretation: ${this.path}`,
//         );
//     }, signal);
//   }
//
//   /** Read the same captured container that supplies headers and packed members. */
//   async openContainer(signal?: AbortSignal): Promise<Readable> {
//     await this.prepareContainer(undefined, signal);
//     return this.#withSnapshotOperation(async () => {
//       abortIfNeeded(signal);
//       const snapshotPath = this.#snapshotPath();
//       const handle = await this.#openOwned(
//         snapshotPath,
//         constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK,
//       );
//       return this.#ownedReadStream(handle, { signal });
//     }, signal);
//   }
//
//   async close(): Promise<void> {
//     await this.#withSnapshotOperation(() => this.#closeSnapshot());
//   }
//
//   async #captureSnapshot(signal?: AbortSignal): Promise<void> {
//     let inputHandle: SharedAsarFileHandle | undefined;
//     try {
//       this.#snapshotRoot = await mkdtemp(join(tmpdir(), "rea-asar-snapshot-"));
//       const snapshotPath = join(this.#snapshotRoot, "container.asar");
//       const hash = createHash("sha256");
//       inputHandle = await this.#openOwned(
//         this.path,
//         constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK,
//       );
//       const source = this.#ownedReadStream(inputHandle, {
//         signal,
//         releaseOnClose: false,
//       });
//       const digesting = new Transform({
//         transform(chunk: Buffer, _encoding, callback) {
//           hash.update(chunk);
//           callback(null, chunk);
//         },
//       });
//       await pipeline(
//         source,
//         digesting,
//         createWriteStream(snapshotPath, { flags: "wx", mode: 0o600 }),
//         signal === undefined ? {} : { signal },
//       );
//       const completedInput = inputHandle;
//       inputHandle = undefined;
//       await this.#closeOwnedHandle(completedInput);
//       this.#snapshot = { path: snapshotPath, sha256: hash.digest("hex") };
//     } catch (cause: unknown) {
//       let failure =
//         signal?.aborted === true
//           ? new ArtifactReaderFailure("cancelled", "ASAR operation cancelled", {
//               cause,
//             })
//           : asarFailure(this.path, "snapshot", cause);
//       if (inputHandle !== undefined) {
//         const failedInput = inputHandle;
//         inputHandle = undefined;
//         try {
//           await this.#closeOwnedHandle(failedInput);
//         } catch (cleanupCause: unknown) {
//           failure = ArtifactReaderFailure.withCleanup(
//             failure,
//             ArtifactReaderFailure.cleanupObservation(cleanupCause, this.path),
//           );
//         }
//       }
//       try {
//         if (this.#ownedHandles.size === 0) await this.#closeSnapshot();
//       } catch (cleanupCause: unknown) {
export const _l = 183;
