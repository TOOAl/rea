export const __stub = 1;
//       }
//     }
//     if (failure !== undefined) throw failure;
//   }
//
//   async #openOwned(path: string, flags: number): Promise<SharedAsarFileHandle> {
//     const handle = await (this.options.openFile ?? open)(path, flags);
//     this.#adoptHandle(handle, path);
//     return handle;
//   }
//
//   #adoptHandle(handle: SharedAsarFileHandle, path: string): void {
//     this.#ownedHandles.set(handle, {
//       path,
//       owner: new OwnedFileHandle(handle),
//     });
//   }
//
//   #ownedReadStream(
//     handle: SharedAsarFileHandle,
//     options: {
//       readonly start?: number;
//       readonly end?: number;
//       readonly signal?: AbortSignal | undefined;
//       readonly releaseOnClose?: boolean;
//     },
//   ): Readable {
//     const { releaseOnClose, ...readOptions } = options;
//     const source = readFileHandleChunks(handle, readOptions);
//     const owned = this.#ownedHandles.get(handle);
//     if (owned === undefined)
//       throw new ArtifactReaderFailure("integrity", "ASAR handle has no owner");
//     owned.source = source;
//     owned.output = source;
//     if (releaseOnClose !== false)
//       source.once("close", () => {
//         void this.#closeOwnedHandle(handle).catch(() => undefined);
//       });
//     return source;
//   }
//
//   #setOwnedOutput(handle: SharedAsarFileHandle, output: Readable): void {
//     const owned = this.#ownedHandles.get(handle);
//     if (owned !== undefined) owned.output = output;
//   }
//
//   #resetArchiveState(): void {
//     this.#archiveSize = undefined;
//     this.#headerSize = undefined;
//   }
// }
//
// type AsarFileMetadata = AsarMetadata & { readonly size: number };
// type AsarEntryState = {
//   readonly metadata: AsarFileMetadata;
//   readonly entry: ArtifactEntry;
// };
// type SharedAsarFileHandle = Pick<FileHandle, "fd" | "read" | "close"> & {
//   stat(): Promise<Stats>;
// };
// type OpenAsarFile = (
//   path: string,
//   flags: number,
// ) => Promise<SharedAsarFileHandle>;
// type OwnedAsarHandle = {
//   readonly path: string;
//   readonly owner: OwnedFileHandle<SharedAsarFileHandle>;
//   source?: Readable;
//   output?: Readable;
// };
// type AsarArtifactReaderOptions = {
//   readonly openFile?: OpenAsarFile;
//   readonly openUnpackedFile?: OpenAsarFile;
//   readonly removeSnapshot?: (path: string) => Promise<void>;
// };
//
// const defaultRemoveSnapshot = (path: string): Promise<void> =>
//   rm(path, { recursive: true, force: true });
//
// const asarUnpackedEntryFailure = (
//   archivePath: string,
//   entry: ArtifactEntry,
//   cause: unknown,
// ): ArtifactReaderFailure => {
//   if (cause instanceof ArtifactReaderFailure) return cause;
//   if (entry.unpacked && isMissingFile(cause))
//     return new ArtifactReaderFailure(
//       "unavailable",
//       `ASAR unpacked entry bytes are unavailable: ${entry.path}`,
//       { cause },
//       {
//         logicalPath: entry.path,
//         declaredSha256: entry.declaredSha256,
//         calculatedSha256: null,
//         unpacked: true,
//       },
//     );
//   return asarFailure(archivePath, `read ${entry.path}`, cause);
// };
//
// const isAsarFileMetadata = (
//   metadata: AsarMetadata,
// ): metadata is AsarFileMetadata =>
//   typeof metadata.size === "number" &&
//   metadata.files === undefined &&
//   metadata.link === undefined;
//
// const parseArchiveOffset = (value: string): number | undefined => {
//   if (!/^(?:0|[1-9][0-9]*)$/u.test(value)) return undefined;
//   const offset = Number(value);
//   return Number.isSafeInteger(offset) ? offset : undefined;
// };
//
// const abortIfNeeded = (signal?: AbortSignal): void => {
//   if (signal?.aborted === true)
//     throw new ArtifactReaderFailure("cancelled", "ASAR operation cancelled");
// };
//
// const waitForOperation = async (
//   operation: Promise<void>,
//   signal?: AbortSignal,
// ): Promise<void> => {
//   if (signal === undefined) return operation;
//   abortIfNeeded(signal);
//   await new Promise<void>((resolve, reject) => {
//     const removeAbortListener = (): void =>
//       signal.removeEventListener("abort", onAbort);
//     const onAbort = (): void => {
//       removeAbortListener();
//       reject(
//         new ArtifactReaderFailure("cancelled", "ASAR operation cancelled"),
//       );
//     };
//     signal.addEventListener("abort", onAbort, { once: true });
//     operation.then(
//       () => {
//         removeAbortListener();
//         resolve();
//       },
//       (cause: unknown) => {
//         removeAbortListener();
//         reject(cause);
//       },
//     );
//   });
// };
//
// const asarFailure = (
//   path: string,
//   operation: string,
//   cause: unknown,
// ): ArtifactReaderFailure => {
//   if (cause instanceof ArtifactReaderFailure) return cause;
//   if (isFilesystemFailure(cause))
//     return new ArtifactReaderFailure(
//       "io",
//       `Could not ${operation} ASAR at ${path}: ${cause.message}`,
//       { cause },
//     );
//   return new ArtifactReaderFailure(
//     "format",
//     `Malformed ASAR during ${operation}: ${path}`,
//     { cause },
//   );
// };
//
// const isFilesystemFailure = (
//   cause: unknown,
// ): cause is NodeJS.ErrnoException & Error =>
//   cause instanceof Error &&
//   "errno" in cause &&
//   typeof cause.errno === "number" &&
//   "syscall" in cause &&
//   typeof cause.syscall === "string";
//
// const isMissingFile = (cause: unknown): boolean =>
//   typeof cause === "object" &&
//   cause !== null &&
//   "code" in cause &&
//   cause.code === "ENOENT";
export const _l = 180;
