export const __stub = 1;
//     signal?: AbortSignal,
//   ): Promise<string> {
//     const commandOptions = {
//       env: this.environment,
//       signal,
//       timeout: 120_000,
//       stopSignal: "SIGKILL" as const,
//       maxBuffer: RELEASE_METADATA_BYTES,
//     };
//     if (family === "rpm") {
//       const output = await execFileOutput(
//         "rpm",
//         [
//           "-qp",
//           "--nosignature",
//           "--nodigest",
//           "--qf",
//           "%{FILEDIGESTALGO}\n[%{FILENAMES}\t%{FILEDIGESTS}\n]",
//           archive,
//         ],
//         commandOptions,
//       );
//       const rows = output.stdout.split("\n");
//       if (rows.shift() !== "8")
//         throw new HopperReleaseError(
//           "integrity",
//           "The signed RPM header does not use SHA-256 file digests.",
//         );
//       const matches = rows.filter((row) =>
//         row.startsWith("/opt/hopper/bin/Hopper\t"),
//       );
//       const digest = matches[0]?.split("\t")[1];
//       if (
//         matches.length !== 1 ||
//         digest === undefined ||
//         !/^[a-f0-9]{64}$/u.test(digest)
//       )
//         throw new HopperReleaseError(
//           "integrity",
//           "The signed RPM header has no unique Hopper launcher digest.",
//         );
//       return digest;
//     }
//     const extracted = join(root, "extracted");
//     await mkdir(extracted, { mode: 0o700 });
//     if (family === "deb")
//       await execFileOutput(
//         "dpkg-deb",
//         ["--extract", archive, extracted],
//         commandOptions,
//       );
//     else
//       await execFileOutput(
//         "tar",
//         ["-xf", archive, "-C", extracted, "--", "opt/hopper/bin/Hopper"],
//         commandOptions,
//       );
//     return (
//       await hashStableFile(
//         join(extracted, "opt", "hopper", "bin", "Hopper"),
//         signal,
//       )
//     ).sha256;
//   }
//
//   #read(path: string, limit: number, signal?: AbortSignal): Promise<Buffer> {
//     return withRegularFile(
//       path,
//       async (handle, stats) => {
//         if (stats.size > limit)
//           throw new HopperReleaseError(
//             "integrity",
//             "Retained Hopper evidence exceeds its resource byte budget.",
//           );
//         const bytes = await readBoundedFileBytes(handle, stats.size, signal);
//         if (bytes === undefined)
//           throw new HopperReleaseError(
//             "integrity",
//             "Retained Hopper evidence changed during inspection.",
//           );
//         return bytes;
//       },
//       { signal, resources: this.#resources, symlinks: "reject" },
//     );
//   }
//
//   async #withTemporary<T>(
//     operation: (path: string) => Promise<T>,
//     parent?: string,
//   ): Promise<T> {
//     const root = await PrivateRuntimeRoot.create({
//       prefix: "rea-hopper-publisher-",
//       ...(parent === undefined ? {} : { parent }),
//     });
//     return this.#withOwnedResource(
//       {
//         kind: "private-runtime-root",
//         resource: root.path,
//         root,
//       },
//       () => operation(root.path),
//     );
//   }
//
//   async #withOwnedResource<T>(
//     owner: ArtifactResourceOwner,
//     operation: () => Promise<T>,
//   ): Promise<T> {
//     let outcome:
//       | { readonly ok: true; readonly value: T }
//       | { readonly ok: false; readonly cause: unknown };
//     try {
//       outcome = { ok: true, value: await operation() };
//     } catch (cause: unknown) {
//       outcome = { ok: false, cause };
//     }
//     const cleanup = await this.#resources.release(owner);
//     if (cleanup.kind === "failed") {
//       pendingCleanup.add(this.#resources);
//       const causes = outcome.ok
//         ? [cleanup.cause]
//         : [outcome.cause, cleanup.cause];
//       throw new HopperReleaseError(
//         "cleanup_failed",
//         `Hopper publisher verification retained cleanup ownership for ${owner.resource}.`,
//         {
//           cause: new AggregateError(
//             causes,
//             "Publisher inspection and cleanup outcomes",
//           ),
//         },
//       );
//     }
//     if (!outcome.ok) throw outcome.cause;
//     return outcome.value;
//   }
// }
//
// /** Retry only resources retained by this producer after failed cleanup. */
// export const retryLinuxHopperPublisherCleanup = async (): Promise<void> => {
//   const causes: unknown[] = [];
//   const observations = [];
//   for (const scope of pendingCleanup) {
//     try {
//       await scope.close();
//       pendingCleanup.delete(scope);
//     } catch (cause: unknown) {
//       causes.push(cause);
//       observations.push(
//         ArtifactReaderFailure.cleanupObservation(
//           cause,
//           "hopper-publisher-verification",
//         ),
//       );
//     }
//   }
//   if (causes.length > 0) {
//     const cleanup = {
//       reason: observations.map(({ reason }) => reason).join("; "),
//       resources: [
//         ...new Set(observations.flatMap(({ resources }) => resources)),
//       ],
//     };
//     throw new ArtifactReaderFailure(
//       "unavailable",
//       `Hopper publisher cleanup remains incomplete: ${cleanup.resources.join(", ")}`,
//       {
//         cause: new AggregateError(causes, "Hopper publisher cleanup failures"),
//         cleanup,
//       },
//     );
//   }
// };
//
// const decodeUtf8 = (bytes: Uint8Array): string =>
//   new TextDecoder("utf-8", { fatal: true }).decode(bytes);
// const releaseFailure = (
//   cause: unknown,
//   signal: AbortSignal | undefined,
//   fallback: HopperReleaseError["reason"],
// ): HopperReleaseError =>
//   cause instanceof HopperReleaseError && cause.reason === "cleanup_failed"
//     ? cause
//     : signal?.aborted === true
//       ? new HopperReleaseError(
//           "cancelled",
//           "Hopper publisher verification was cancelled.",
//           { cause },
//         )
//       : cause instanceof HopperReleaseError
//         ? cause
//         : new HopperReleaseError(
//             fallback,
//             "Hopper publisher verification could not complete.",
//             { cause },
//           );
// const launcherIdentity = (
//   verified: VerifiedLinuxHopperPackage,
//   source: VerifiedLinuxHopperLauncher["source"],
// ): VerifiedLinuxHopperLauncher => ({
//   sha256: verified.release.main_exe_hash,
//   version: verified.release.version,
//   primaryFingerprint: verified.primaryFingerprint,
//   signingFingerprint: verified.signingFingerprint,
//   source,
// });
export const _l = 206;
