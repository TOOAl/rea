export const __stub = 1;
//       if (existingProof !== undefined)
//         return ok({
//           release,
//           family,
//           packageSha256,
//           publicKey,
//           ...existingProof,
//         });
//       const verified = await verifyDetachedPgpSignature(
//         bytes,
//         Buffer.from(release.signature, "base64"),
//         publicKey,
//         HOPPER_LINUX_PRIMARY_FINGERPRINT,
//         signal,
//       );
//       if (!verified.ok)
//         return err(
//           new HopperReleaseError(
//             verified.error.reason === "cancelled"
//               ? "cancelled"
//               : "publisher_verification_failed",
//             verified.error.message,
//             { cause: verified.error },
//           ),
//         );
//       const mainExeHash = await this.#withTemporary(async (root) => {
//         // Extract only after authentication, from this operation's private byte snapshot.
//         const snapshot = join(root, "package");
//         await writeFile(snapshot, bytes, { flag: "wx", mode: 0o600 });
//         return this.#packageLauncherHash(family, snapshot, root, signal);
//       });
//       if (mainExeHash !== release.main_exe_hash)
//         return err(
//           new HopperReleaseError(
//             "integrity",
//             `The signed ${family} package launcher SHA-256 ${mainExeHash} differs from the release main_exe_hash ${release.main_exe_hash}.`,
//           ),
//         );
//       retainProof(packageProofs, proofKey, verified.value);
//       return ok({
//         release,
//         family,
//         packageSha256,
//         publicKey,
//         ...verified.value,
//       });
//     } catch (cause: unknown) {
//       return err(releaseFailure(cause, signal, "verification_unavailable"));
//     }
//   }
//
//   /** Durable evidence contains the signed bytes; an editable digest receipt cannot authorize a build. */
//   async retainVerifiedArchive(
//     verified: VerifiedLinuxHopperPackage,
//     archive: string,
//     signal?: AbortSignal,
//   ): Promise<Result<void, HopperReleaseError>> {
//     try {
//       signal?.throwIfAborted();
//       await mkdir(this.cacheRoot, { recursive: true, mode: 0o700 });
//       const parent = await lstat(this.cacheRoot);
//       if (
//         !parent.isDirectory() ||
//         parent.isSymbolicLink() ||
//         parent.uid !== process.getuid?.()
//       )
//         throw new HopperReleaseError(
//           "verification_unavailable",
//           "The Hopper release cache is not a caller-owned directory.",
//         );
//       const target = join(this.cacheRoot, verified.release.main_exe_hash);
//       const lease = await this.#acquireCacheLease(
//         verified.release.main_exe_hash,
//         signal,
//       );
//       await this.#withOwnedResource(
//         {
//           kind: "lease",
//           resource: lease.socketPath ?? "hopper-release-cache-lease",
//           lease,
//         },
//         async () => {
//           signal?.throwIfAborted();
//           await this.#withTemporary(async (stage) => {
//             await copyFile(archive, join(stage, "archive"));
//             if (
//               (await hashStableFile(join(stage, "archive"), signal)).sha256 !==
//               verified.packageSha256
//             )
//               throw new HopperReleaseError(
//                 "integrity",
//                 "The verified package changed before cache retention.",
//               );
//             await writeFile(join(stage, "public-key.asc"), verified.publicKey, {
//               flag: "wx",
//               mode: 0o600,
//             });
//             await writeFile(
//               join(stage, "release.json"),
//               JSON.stringify({
//                 format: "rea-signed-hopper-release-v1",
//                 family: verified.family,
//                 release: verified.release,
//               }) + "\n",
//               { flag: "wx", mode: 0o600 },
//             );
//             await this.#publishCacheStage(
//               stage,
//               target,
//               verified.release.main_exe_hash,
//               signal,
//             );
//           }, this.cacheRoot);
//         },
//       );
//       return ok(undefined);
//     } catch (cause: unknown) {
//       return err(releaseFailure(cause, signal, "verification_unavailable"));
//     }
//   }
//
//   async #publishCacheStage(
//     stage: string,
//     target: string,
//     digest: string,
//     signal?: AbortSignal,
//   ): Promise<void> {
//     const existing = await this.#cachedPackage(digest, signal);
//     if (existing.ok) return;
//     if (existing.error.reason === "cache_missing") {
//       await rename(stage, target);
//       return;
//     }
//     if (
//       ![
//         "integrity",
//         "release_metadata",
//         "publisher_verification_failed",
//       ].includes(existing.error.reason)
//     )
//       throw existing.error;
//     signal?.throwIfAborted();
//     const previous = await lstat(target);
//     if (
//       !previous.isDirectory() ||
//       previous.isSymbolicLink() ||
//       previous.uid !== process.getuid?.()
//     )
//       throw existing.error;
//     // Only approved retention under the publication lease may repair an entry.
//     // Preserve malformed evidence without following links or deleting content.
//     const backup = `${target}.backup-${randomUUID()}`;
//     await rename(target, backup);
//     try {
//       const moved = await lstat(backup);
//       if (moved.dev !== previous.dev || moved.ino !== previous.ino)
//         throw new Error("The Hopper cache entry changed during repair.");
//       await rename(stage, target);
//     } catch (cause: unknown) {
//       const replacement = await this.#cachedPackage(digest, signal);
//       if (replacement.ok) return;
//       await this.#failedCachePublication(
//         target,
//         backup,
//         [cause, replacement.error],
//         replacement.error.reason === "cleanup_failed",
//       );
//     }
//   }
//
//   async #acquireCacheLease(
//     digest: string,
//     signal?: AbortSignal,
//   ): Promise<HopperTargetLease> {
//     const deadline = performance.now() + 120_000;
//     const runId = randomUUID();
//     let delay = 25;
//     while (true) {
//       signal?.throwIfAborted();
//       const acquired = await acquireHopperReleaseCacheLease({
//         cacheDirectory: this.cacheRoot,
//         launcherSha256: digest,
//         runId,
//       });
//       if (acquired.acquired) return acquired.lease;
//       const remaining = deadline - performance.now();
//       if (remaining <= 0)
//         throw new HopperReleaseError(
//           "verification_unavailable",
//           "Another approved Hopper setup still owns this release cache. Retry after it finishes.",
//         );
//       await waitForAbortableDelay(Math.min(delay, remaining), signal);
//       delay = Math.min(delay * 2, 200);
//     }
//   }
//
//   async #failedCachePublication(
//     target: string,
//     backup: string,
//     causes: unknown[],
//     cleanupFailed = false,
//   ): Promise<never> {
//     let preserved = backup;
//     try {
//       // Under the publication lease, restore the previous directory on failure.
//       // POSIX rename cannot replace another nonempty evidence directory.
//       await rename(backup, target);
//       preserved = target;
//     } catch (cause: unknown) {
export const _l = 209;
