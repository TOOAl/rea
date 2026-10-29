export const __stub = 1;
//       await assertPathIdentity(path, identity);
//     if (this.#unknownDirectories.size > 0)
//       throw new ArtifactReaderFailure(
//         "path",
//         `Extraction directory ownership is unknown: ${[...this.#unknownDirectories].join(", ")}`,
//       );
//   }
//
//   #requireRootIdentity(): DirectoryIdentity {
//     if (this.#rootIdentity === undefined)
//       throw new ArtifactReaderFailure(
//         "path",
//         `Extraction output root identity is unknown: ${this.#outputRoot}`,
//       );
//     return this.#rootIdentity;
//   }
//
//   #assertWritable(): void {
//     if (this.#published)
//       throw new ArtifactReaderFailure(
//         "integrity",
//         "Extraction tree is already committed",
//       );
//     if (this.#cleanup.status !== "not-required")
//       throw new ArtifactReaderFailure(
//         "integrity",
//         "Extraction tree cleanup has already started",
//       );
//   }
//
//   #trackHandle(handle: FileHandle): OwnedFileHandle {
//     const owner = new OwnedFileHandle(handle);
//     this.#openHandles.add(owner);
//     return owner;
//   }
//
//   async #closeHandle(owner: OwnedFileHandle): Promise<void> {
//     await owner.close();
//     this.#openHandles.delete(owner);
//   }
//
//   async #closePendingHandles(): Promise<void> {
//     const failures: unknown[] = [];
//     for (const owner of this.#openHandles) {
//       try {
//         await this.#closeHandle(owner);
//       } catch (cause: unknown) {
//         failures.push(cause);
//       }
//     }
//     if (failures.length > 0)
//       throw new AggregateError(failures, "Output tree handles remain open");
//   }
//
//   async #closeFileHandle(path: string, owner: OwnedFileHandle): Promise<void> {
//     await this.#closeHandle(owner);
//     this.#openFiles.delete(path);
//   }
//
//   async #admitPendingFiles(): Promise<void> {
//     for (const [path, owner] of this.#openFiles) {
//       let identity = this.#ownedFiles.get(path);
//       if (identity === undefined) {
//         identity = await readFileIdentity(owner.handle, path);
//         await assertFilePathIdentity(path, identity);
//         this.#ownedFiles.set(path, identity);
//       }
//     }
//   }
// }
//
// const isDefined = <T>(value: T | undefined): value is T => value !== undefined;
//
// const isRejected = (
//   result: PromiseSettledResult<void>,
// ): result is PromiseRejectedResult => result.status === "rejected";
//
// type DirectoryLineageEntry = {
//   readonly path: string;
//   readonly identity: DirectoryIdentity;
// };
//
// const writeAll = async (
//   handle: Awaited<ReturnType<typeof open>>,
//   chunk: Buffer,
// ): Promise<void> => {
//   let offset = 0;
//   while (offset < chunk.length) {
//     const { bytesWritten } = await handle.write(
//       chunk,
//       offset,
//       chunk.length - offset,
//     );
//     if (bytesWritten === 0)
//       throw new ArtifactReaderFailure(
//         "unavailable",
//         "Extraction output stopped accepting bytes",
//       );
//     offset += bytesWritten;
//   }
// };
//
// const normalizeDestinationPath = (
//   relativePath: string,
//   platform: NodeJS.Platform,
// ): string => {
//   const path = normalizeArtifactPath(relativePath);
//   if (platform === "win32" && path.includes("\\"))
//     throw new ArtifactReaderFailure(
//       "path",
//       `Windows destination cannot materialize artifact path: ${JSON.stringify(path)}; backslashes denote path separators.`,
//     );
//   if (platform === "win32" && path.includes(":"))
//     throw new ArtifactReaderFailure(
//       "path",
//       `Windows destination cannot materialize artifact path as a regular file: ${path}; ':' denotes alternate data stream syntax.`,
//     );
//   if (platform === "win32" && /[\u0001-\u001f]/u.test(path))
//     throw new ArtifactReaderFailure(
//       "path",
//       `Windows destination cannot materialize artifact path: ${JSON.stringify(path)}; Windows names cannot contain U+0001-U+001F.`,
//     );
//   return path;
// };
//
// const abortIfNeeded = (signal?: AbortSignal): void => {
//   if (signal?.aborted === true)
//     throw new ArtifactReaderFailure(
//       "cancelled",
//       "Artifact extraction cancelled",
//     );
// };
//
// const isCancellationFailure = (
//   cause: unknown,
// ): cause is ArtifactReaderFailure =>
//   cause instanceof ArtifactReaderFailure && cause.reason === "cancelled";
//
// const isAlreadyExists = (cause: unknown): boolean =>
//   cause instanceof Error && "code" in cause && cause.code === "EEXIST";
//
// /** Fail when this directory already holds another spelling of the requested segment. */
// const throwIfDestinationCaseCollision = async (
//   parentDirectory: string,
//   logicalPath: string,
//   cause?: unknown,
// ): Promise<void> => {
//   const names = await readdir(parentDirectory).catch(() => undefined);
//   if (names === undefined) return;
//   const message = destinationCaseCollisionMessage(logicalPath, names);
//   if (message === undefined) return;
//   throw new ArtifactReaderFailure(
//     "path",
//     message,
//     cause === undefined ? undefined : { cause },
//   );
// };
export const _l = 157;
