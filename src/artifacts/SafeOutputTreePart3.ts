export const __stub = 1;
//       );
//       await output.handle.sync();
//       await parent.handle.sync();
//       abortIfNeeded(signal);
//       this.#published = true;
//     } catch (cause: unknown) {
//       sync = { kind: "failed", cause };
//     }
//     const closeResults = await Promise.allSettled(
//       [parent, output]
//         .filter(isDefined)
//         .map((handle) => this.#closeHandle(handle)),
//     );
//     const closeFailures = closeResults
//       .filter(isRejected)
//       .map(({ reason }) => reason);
//     if (closeFailures.length > 0) {
//       const closeFailure = new AggregateError(
//         closeFailures,
//         "Extraction output directory handles could not be closed",
//       );
//       const cleanup = ArtifactReaderFailure.cleanupObservation(
//         closeFailure,
//         this.#outputRoot,
//       );
//       if (sync.kind === "failed") {
//         const primary = isCancellationFailure(sync.cause)
//           ? sync.cause
//           : new ArtifactReaderFailure(
//               "path",
//               "Could not durably sync extraction output",
//               { cause: sync.cause },
//             );
//         throw ArtifactReaderFailure.withCleanup(primary, cleanup);
//       }
//       throw ArtifactReaderFailure.withCleanup(closeFailure, cleanup);
//     }
//     if (sync.kind === "failed") {
//       if (isCancellationFailure(sync.cause)) throw sync.cause;
//       throw new ArtifactReaderFailure(
//         "path",
//         "Could not durably sync extraction output",
//         { cause: sync.cause },
//       );
//     }
//   }
//
//   /** Remove only this operation's unsealed tree and verify absence. */
//   async rollback(): Promise<SafeOutputCleanup> {
//     if (this.#published) {
//       await this.#closePendingHandles();
//       return structuredClone(this.#cleanup);
//     }
//     if (this.#cleanup.status === "complete")
//       return structuredClone(this.#cleanup);
//     this.#cleanup = {
//       status: "incomplete",
//       residualPaths: [basename(this.#outputRoot)],
//     };
//     let removalFailure: unknown;
//     try {
//       await this.#admitPendingFiles();
//       await this.#closePendingHandles();
//       await this.#assertOwnedDirectories();
//       await removeOwnedTree({
//         outputRoot: this.#outputRoot,
//         rootIdentity: this.#requireRootIdentity(),
//         directories: this.#nestedDirectories,
//         files: this.#ownedFiles,
//       });
//     } catch (cause: unknown) {
//       removalFailure = cause;
//     }
//     const absent =
//       removalFailure === undefined && (await isAbsent(this.#outputRoot));
//     this.#cleanup = absent
//       ? { status: "complete", residualPaths: [] }
//       : {
//           status: "incomplete",
//           residualPaths: [basename(this.#outputRoot)],
//         };
//     if (!absent)
//       throw new ArtifactReaderFailure(
//         "integrity",
//         `Extraction output cleanup could not be verified${removalFailure === undefined ? "" : `: ${removalFailure instanceof Error ? removalFailure.message : String(removalFailure)}`}`,
//         {
//           cause: removalFailure,
//           cleanup: {
//             reason:
//               removalFailure instanceof Error
//                 ? removalFailure.message
//                 : "Extraction output root remains after rollback",
//             resources: [this.#outputRoot],
//           },
//         },
//       );
//     return structuredClone(this.#cleanup);
//   }
//
//   async #prepareParent(
//     relativePath: string,
//   ): Promise<readonly DirectoryLineageEntry[]> {
//     const parts = relativePath.split("/");
//     if (parts.pop() === undefined)
//       throw new ArtifactReaderFailure("path", "Invalid extraction path");
//     let current = this.#outputRoot;
//     let logicalParent = "";
//     const lineage: DirectoryLineageEntry[] = [
//       { path: this.#outputRoot, identity: this.#requireRootIdentity() },
//     ];
//     if (parts.length === 0)
//       await assertPathIdentity(this.#outputRoot, this.#requireRootIdentity());
//     for (const part of parts) {
//       const parent = lineage.at(-1);
//       if (parent === undefined) throw replacedDirectory(this.#outputRoot);
//       const logicalPath =
//         logicalParent.length === 0 ? part : `${logicalParent}/${part}`;
//       current = join(current, part);
//       await assertPathIdentity(parent.path, parent.identity);
//       let created = true;
//       await mkdir(current, { mode: 0o700 }).catch((cause: unknown) => {
//         if (!isAlreadyExists(cause)) throw cause;
//         created = false;
//       });
//       if (!created) {
//         await throwIfDestinationCaseCollision(parent.path, logicalPath);
//         const identity = this.#nestedDirectories.get(current);
//         if (identity === undefined) throw replacedDirectory(current);
//         await assertPathIdentity(current, identity);
//       } else {
//         try {
//           const identity = await readDirectoryIdentity(current);
//           this.#nestedDirectories.set(current, identity);
//         } catch (cause: unknown) {
//           this.#unknownDirectories.add(current);
//           throw cause;
//         }
//       }
//       await assertPathIdentity(parent.path, parent.identity);
//       const identity = this.#nestedDirectories.get(current);
//       if (identity === undefined) throw replacedDirectory(current);
//       await assertPathIdentity(current, identity);
//       lineage.push({ path: current, identity });
//       logicalParent = logicalPath;
//     }
//     return lineage;
//   }
//
//   async #assertLineage(
//     lineage: readonly DirectoryLineageEntry[],
//   ): Promise<void> {
//     for (const { path, identity } of lineage)
//       await assertPathIdentity(path, identity);
//   }
//
//   async #assertOwnedDirectories(): Promise<void> {
//     const rootIdentity = this.#requireRootIdentity();
//     await assertPathIdentity(this.#outputRoot, rootIdentity);
//     for (const [path, identity] of this.#nestedDirectories)
export const _l = 159;
