export const __stub = 1;
//         if (setup.kind === "failed") throw setup.cause;
//       }
//       await assertPathIdentity(canonicalOutput, rootIdentity);
//       return tree;
//     } catch (cause: unknown) {
//       throw new SafeOutputTreeCreationFailure(cause, tree);
//     }
//   }
//
//   get outputRoot(): string {
//     return this.#outputRoot;
//   }
//
//   /** The output was durably committed, even if descriptor cleanup later failed. */
//   get published(): boolean {
//     return this.#published;
//   }
//
//   get cleanup(): SafeOutputCleanup {
//     return structuredClone(this.#cleanup);
//   }
//
//   /** Stream one regular file with exact byte and digest verification. */
//   async write(
//     relativePath: string,
//     source: Readable,
//     expected: { readonly sha256: string; readonly bytes: number },
//     signal?: AbortSignal,
//   ): Promise<SafeOutputFile> {
//     try {
//       this.#assertWritable();
//       if (!Number.isSafeInteger(expected.bytes) || expected.bytes < 0)
//         throw new ArtifactReaderFailure(
//           "format",
//           `Invalid expected extraction size for ${relativePath}`,
//         );
//       const path = normalizeDestinationPath(relativePath, this.platform);
//       this.#registry.add(path, "file");
//       const lineage = await this.#prepareParent(path);
//       const parent = lineage.at(-1);
//       if (parent === undefined) throw replacedDirectory(this.#outputRoot);
//       const fileName = path.slice(path.lastIndexOf("/") + 1);
//       const destination = join(parent.path, fileName);
//       const handle = await open(
//         destination,
//         constants.O_CREAT |
//           constants.O_EXCL |
//           constants.O_WRONLY |
//           constants.O_NOFOLLOW,
//         0o600,
//       ).catch(async (cause: unknown) => {
//         await throwIfDestinationCaseCollision(parent.path, path, cause);
//         throw new ArtifactReaderFailure(
//           "path",
//           `Could not exclusively create extraction path: ${path}`,
//           { cause },
//         );
//       });
//       const ownedHandle = this.#trackHandle(handle);
//       this.#openFiles.set(destination, ownedHandle);
//       const fileIdentity = await readFileIdentity(
//         ownedHandle.handle,
//         destination,
//       );
//       await assertFilePathIdentity(destination, fileIdentity);
//       this.#ownedFiles.set(destination, fileIdentity);
//       const hash = createHash("sha256");
//       let bytes = 0;
//       await this.#assertLineage(lineage);
//       for await (const raw of source) {
//         abortIfNeeded(signal);
//         const chunk = streamChunkToBuffer(raw);
//         if (chunk.length > expected.bytes - bytes)
//           throw new ArtifactReaderFailure(
//             "integrity",
//             `Extracted content exceeds the inventoried size: ${path}`,
//           );
//         bytes += chunk.length;
//         hash.update(chunk);
//         await writeAll(ownedHandle.handle, chunk);
//       }
//       if (bytes !== expected.bytes)
//         throw new ArtifactReaderFailure(
//           "integrity",
//           `Extracted content size disagrees with inventory: ${path}`,
//         );
//       const sha256 = hash.digest("hex");
//       if (sha256 !== expected.sha256)
//         throw new ArtifactReaderFailure(
//           "integrity",
//           `Extracted content disagrees with inventory: ${path}`,
//         );
//       await this.#assertLineage(lineage);
//       await assertFilePathIdentity(destination, fileIdentity);
//       await ownedHandle.handle.sync();
//       await this.#closeFileHandle(destination, ownedHandle);
//       const readbackHandle = this.#trackHandle(
//         await open(destination, constants.O_RDONLY | constants.O_NOFOLLOW),
//       );
//       const readback = await hashOutputFile(
//         readbackHandle,
//         destination,
//         fileIdentity,
//         { maximum: bytes, signal },
//       );
//       await this.#closeHandle(readbackHandle);
//       await this.#assertLineage(lineage);
//       await assertFilePathIdentity(destination, fileIdentity);
//       if (readback.sha256 !== sha256 || readback.bytes !== bytes)
//         throw new ArtifactReaderFailure(
//           "integrity",
//           `Durable readback verification failed: ${path}`,
//         );
//       return { relativePath: path, sha256, bytesWritten: bytes };
//     } catch (cause: unknown) {
//       try {
//         source.destroy();
//       } catch {
//         // Preserve the write refusal or failure as the caller-visible error.
//       }
//       throw cause;
//     }
//   }
//
//   /** Sync the owned output tree and prevent further writes through this instance. */
//   async commit(signal?: AbortSignal): Promise<void> {
//     this.#assertWritable();
//     abortIfNeeded(signal);
//     await this.#assertOwnedDirectories();
//     abortIfNeeded(signal);
//     // Windows has no directory fsync; file contents are already synced in write().
//     if (this.platform === "win32") {
//       this.#published = true;
//       return;
//     }
//     const parent = this.#trackHandle(
//       await open(
//         dirname(this.#outputRoot),
//         constants.O_RDONLY | constants.O_DIRECTORY,
//       ),
//     );
//     let output: OwnedFileHandle | undefined;
//     let sync:
//       | { readonly kind: "synced" }
//       | {
//           readonly kind: "failed";
//           readonly cause: unknown;
//         } = { kind: "synced" };
//     try {
//       output = this.#trackHandle(
//         await open(
//           this.#outputRoot,
//           constants.O_RDONLY | constants.O_DIRECTORY,
//         ),
//       );
//       await assertHandleIdentity(
//         output.handle,
//         this.#requireRootIdentity(),
//         this.#outputRoot,
export const _l = 159;
