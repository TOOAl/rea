export const __stub = 1;
//       causes.push(cause);
//     }
//     throw new HopperReleaseError(
//       cleanupFailed ? "cleanup_failed" : "verification_unavailable",
//       `The Hopper cache repair did not finish; previous evidence is preserved at ${preserved}. Retry approved setup.`,
//       {
//         cause: new AggregateError(
//           causes,
//           "Hopper cache publication and recovery outcomes",
//         ),
//       },
//     );
//   }
//
//   async inspectLauncher(
//     path: string,
//     signal?: AbortSignal,
//   ): Promise<Result<VerifiedLinuxHopperLauncher, HopperReleaseError>> {
//     try {
//       const observed = await hashStableFile(path, signal);
//       const cached = await this.#cachedPackage(observed.sha256, signal);
//       if (cached.ok) {
//         if ((await hashStableFile(path, signal)).sha256 !== observed.sha256)
//           return err(
//             new HopperReleaseError(
//               "integrity",
//               "The Hopper launcher changed during publisher verification.",
//             ),
//           );
//         return ok(launcherIdentity(cached.value, "signed_package_cache"));
//       }
//       if (cached.error.reason !== "cache_missing") return cached;
//       signal?.throwIfAborted();
//       const processProof = liveLauncherProofs.get(observed.sha256);
//       if (processProof !== undefined)
//         return ok({ ...processProof, source: "verified_process_cache" });
//       const family = await this.packageFamily();
//       if (family === undefined)
//         return err(
//           new HopperReleaseError(
//             "verification_unavailable",
//             "No native Linux package family is available for Hopper publisher verification.",
//           ),
//         );
//       const selected = await this.currentRelease(family, signal);
//       if (!selected.ok) return selected;
//       if (selected.value.main_exe_hash !== observed.sha256)
//         return err(
//           new HopperReleaseError(
//             "unsupported_hopper_build",
//             "The selected Hopper launcher does not match an authenticated cached release or the official current Linux demo.",
//           ),
//         );
//       const verified = await this.#withTemporary(async (root) => {
//         const response = await downloadHopperPackage(
//           selected.value.filename,
//           signal === undefined ? {} : { signal },
//         );
//         if (!response.ok)
//           throw new HopperReleaseError(
//             "download",
//             "The official Hopper package is unavailable for publisher verification.",
//           );
//         const archive = join(root, "archive");
//         await writeFile(archive, response.bytes, { flag: "wx", mode: 0o600 });
//         const verified = await this.verifyArchive(
//           family,
//           selected.value,
//           archive,
//           signal,
//         );
//         if (!verified.ok) throw verified.error;
//         return verified.value;
//       });
//       if ((await hashStableFile(path, signal)).sha256 !== observed.sha256)
//         return err(
//           new HopperReleaseError(
//             "integrity",
//             "The Hopper launcher changed during publisher verification.",
//           ),
//         );
//       const identity = launcherIdentity(verified, "signed_vendor_release");
//       retainProof(liveLauncherProofs, observed.sha256, identity);
//       return ok(identity);
//     } catch (cause: unknown) {
//       return err(releaseFailure(cause, signal, "verification_unavailable"));
//     }
//   }
//
//   async close(): Promise<void> {
//     try {
//       await this.#resources.close();
//       pendingCleanup.delete(this.#resources);
//     } catch (cause: unknown) {
//       pendingCleanup.add(this.#resources);
//       throw cause;
//     }
//   }
//
//   async #cachedPackage(
//     digest: string,
//     signal?: AbortSignal,
//   ): Promise<Result<VerifiedLinuxHopperPackage, HopperReleaseError>> {
//     try {
//       const root = join(this.cacheRoot, digest);
//       try {
//         const directory = await lstat(root);
//         if (!directory.isDirectory() || directory.isSymbolicLink())
//           throw new HopperReleaseError(
//             "integrity",
//             "The retained Hopper cache entry is not a regular directory.",
//           );
//       } catch (cause: unknown) {
//         if (cause instanceof Error && Reflect.get(cause, "code") === "ENOENT") {
//           return err(
//             new HopperReleaseError(
//               "cache_missing",
//               "No retained signed Hopper package identifies this launcher.",
//               { cause },
//             ),
//           );
//         }
//         throw cause;
//       }
//       // Distinguish proven malformed/missing evidence from unavailable reads or
//       // inspection tools. Only the former authorize approved cache replacement.
//       for (const name of ["release.json", "public-key.asc", "archive"])
//         await this.#assertCacheFile(join(root, name));
//       const metadata = await this.#read(
//         join(root, "release.json"),
//         RELEASE_METADATA_BYTES,
//         signal,
//       );
//       let value: unknown;
//       try {
//         value = JSON.parse(decodeUtf8(metadata));
//       } catch (cause: unknown) {
//         throw new HopperReleaseError(
//           "release_metadata",
//           "The retained Hopper package metadata is malformed.",
//           { cause },
//         );
//       }
//       const parsed = cacheRecordSchema.safeParse(value);
//       if (!parsed.success)
//         throw new HopperReleaseError(
//           "release_metadata",
//           "The retained Hopper package metadata is malformed.",
//         );
//       const release = parseLinuxHopperRelease(
//         parsed.data.release,
//         parsed.data.family,
//       );
//       if (!release.ok) return release;
//       if (release.value.main_exe_hash !== digest)
//         throw new HopperReleaseError(
//           "integrity",
//           "The retained Hopper metadata does not identify this launcher.",
//         );
//       const keyBytes = await this.#read(
//         join(root, "public-key.asc"),
//         RELEASE_METADATA_BYTES,
//         signal,
//       );
//       let key: string;
//       try {
//         key = decodeUtf8(keyBytes);
//       } catch (cause: unknown) {
//         throw new HopperReleaseError(
//           "publisher_verification_failed",
//           "The retained Hopper public key is malformed.",
//           { cause },
//         );
//       }
//       return this.verifyArchive(
//         parsed.data.family,
//         release.value,
//         join(root, "archive"),
//         signal,
//         key,
//       );
//     } catch (cause: unknown) {
//       return err(releaseFailure(cause, signal, "verification_unavailable"));
//     }
//   }
//
//   async #assertCacheFile(path: string): Promise<void> {
//     try {
//       const stats = await lstat(path);
//       if (!stats.isFile() || stats.isSymbolicLink())
//         throw new HopperReleaseError(
//           "integrity",
//           `Required Hopper evidence is not a regular file: ${path}.`,
//         );
//     } catch (cause: unknown) {
//       if (cause instanceof Error && Reflect.get(cause, "code") === "ENOENT")
//         throw new HopperReleaseError(
//           "integrity",
//           `Required Hopper evidence is missing: ${path}.`,
//           { cause },
//         );
//       throw cause;
//     }
//   }
//
//   async #packageLauncherHash(
//     family: LinuxPackageFamily,
//     archive: string,
//     root: string,
export const _l = 209;
