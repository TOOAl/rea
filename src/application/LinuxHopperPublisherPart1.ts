export const __stub = 1;
// import { createHash, randomUUID } from "node:crypto";
// import { copyFile, lstat, mkdir, rename, writeFile } from "node:fs/promises";
// import { isAbsolute, join } from "node:path";
//
// import { z } from "zod";
// import {
//   ArtifactResourceScope,
//   type ArtifactResourceOwner,
// } from "../artifacts/ArtifactResourceScope.js";
// import { ArtifactReaderFailure } from "../artifacts/ArtifactReader.js";
// import { homeDirectoryFromEnvironment } from "../config/homeDirectory.js";
// import { err, ok, type Result } from "../domain/result.js";
// import { hashStableFile } from "../filesystem/StableFileHash.js";
// import { readBoundedFileBytes } from "../process/BoundedFileBytes.js";
// import { verifyDetachedPgpSignature } from "../process/DetachedPgpSignature.js";
// import { execFileOutput } from "../process/ExecFileOutput.js";
// import { PrivateRuntimeRoot } from "../process/PrivateRuntimeRoot.js";
// import { waitForAbortableDelay } from "../process/ProviderDeadline.js";
// import {
//   acquireHopperReleaseCacheLease,
//   type HopperTargetLease,
// } from "../process/HopperLease.js";
// import {
//   downloadHopperPackage,
//   HOPPER_DOWNLOAD_BYTES,
// } from "./HopperDownload.js";
// import {
//   HOPPER_LINUX_PRIMARY_FINGERPRINT,
//   HOPPER_PUBLIC_KEY_URL,
//   HOPPER_RELEASES_URL,
//   HopperReleaseError,
//   parseLinuxHopperRelease,
//   parseLinuxHopperReleases,
//   type LinuxHopperRelease,
//   type LinuxPackageFamily,
// } from "./HopperReleaseFeed.js";
// import { withRegularFile } from "./RegularFileRead.js";
//
// /** Metadata/key inspection budget, independent of the compressed package budget. */
// const RELEASE_METADATA_BYTES = 1024 * 1024;
// /** Small feed/key requests must not consume the full package-download deadline. */
// const RELEASE_METADATA_TIMEOUT_MS = 10_000;
// const cacheRecordSchema = z.object({
//   format: z.literal("rea-signed-hopper-release-v1"),
//   family: z.enum(["deb", "rpm", "arch"]),
//   release: z.unknown(),
// });
//
// export interface VerifiedLinuxHopperPackage {
//   readonly release: LinuxHopperRelease;
//   readonly family: LinuxPackageFamily;
//   readonly packageSha256: string;
//   readonly publicKey: string;
//   readonly primaryFingerprint: string;
//   readonly signingFingerprint: string;
// }
//
// export interface VerifiedLinuxHopperLauncher {
//   readonly sha256: string;
//   /** Display value from release metadata; the package signature binds bytes, not this row. */
//   readonly version: string;
//   readonly primaryFingerprint: string;
//   readonly signingFingerprint: string;
//   readonly source:
//     | "signed_package_cache"
//     | "signed_vendor_release"
//     | "verified_process_cache";
// }
//
// /** Retain failed ephemeral cleanup independently of the caller's lifetime. */
// const pendingCleanup = new Set<ArtifactResourceScope>();
// /** Immutable cryptographic facts, bounded to eight packages for this process lifetime. */
// const packageProofs = new Map<
//   string,
//   Pick<VerifiedLinuxHopperPackage, "primaryFingerprint" | "signingFingerprint">
// >();
// const liveLauncherProofs = new Map<string, VerifiedLinuxHopperLauncher>();
// const retainProof = <T>(cache: Map<string, T>, key: string, proof: T): void => {
//   cache.delete(key);
//   cache.set(key, proof);
//   const oldest = cache.keys().next().value;
//   if (cache.size > 8 && oldest !== undefined) cache.delete(oldest);
// };
//
// /** One owner for the selected cache location, shared with the approval plan. */
// export const linuxHopperReleaseCacheDirectory = (
//   environment: Readonly<NodeJS.ProcessEnv>,
// ): Result<string, HopperReleaseError> => {
//   try {
//     const supplied = environment.XDG_CACHE_HOME || undefined;
//     if (supplied !== undefined && !isAbsolute(supplied))
//       return err(
//         new HopperReleaseError(
//           "verification_unavailable",
//           "XDG_CACHE_HOME must be an absolute filesystem path.",
//         ),
//       );
//     return ok(
//       join(
//         supplied ??
//           join(homeDirectoryFromEnvironment(environment, "linux"), ".cache"),
//         "rea",
//         "hopper-releases",
//       ),
//     );
//   } catch (cause: unknown) {
//     return err(
//       new HopperReleaseError(
//         "verification_unavailable",
//         "The Hopper release cache location could not be resolved.",
//         { cause },
//       ),
//     );
//   }
// };
//
// /** Authenticated package facts shared by setup, doctor, and the launch boundary. */
// export class LinuxHopperPublisher {
//   readonly #resources = new ArtifactResourceScope();
//   #feed: ReturnType<typeof parseLinuxHopperReleases> | undefined;
//
//   constructor(
//     readonly environment: Readonly<NodeJS.ProcessEnv>,
//     readonly packageFamily: () => Promise<LinuxPackageFamily | undefined>,
//   ) {}
//
//   get cacheRoot(): string {
//     const location = linuxHopperReleaseCacheDirectory(this.environment);
//     if (!location.ok) throw location.error;
//     return location.value;
//   }
//
//   async currentRelease(
//     family: LinuxPackageFamily,
//     signal?: AbortSignal,
//   ): Promise<Result<LinuxHopperRelease, HopperReleaseError>> {
//     try {
//       signal?.throwIfAborted();
//       if (this.#feed === undefined) {
//         const response = await downloadHopperPackage(HOPPER_RELEASES_URL, {
//           ...(signal === undefined ? {} : { signal }),
//           maxBytes: RELEASE_METADATA_BYTES,
//           timeoutMs: RELEASE_METADATA_TIMEOUT_MS,
//         });
//         if (!response.ok)
//           throw new HopperReleaseError(
//             "release_metadata",
//             "The official Hopper release feed is unavailable.",
//           );
//         this.#feed = parseLinuxHopperReleases(
//           JSON.parse(decodeUtf8(response.bytes)),
//         );
//       }
//       if (!this.#feed.ok) return this.#feed;
//       return this.#feed.value[family];
//     } catch (cause: unknown) {
//       return err(releaseFailure(cause, signal, "release_metadata"));
//     }
//   }
//
//   async verifyArchive(
//     family: LinuxPackageFamily,
//     release: LinuxHopperRelease,
//     archive: string,
//     signal?: AbortSignal,
//     suppliedPublicKey?: string,
//   ): Promise<Result<VerifiedLinuxHopperPackage, HopperReleaseError>> {
//     try {
//       const bytes = await this.#read(archive, HOPPER_DOWNLOAD_BYTES, signal);
//       if (
//         bytes.length !== Number(release.file_length) ||
//         createHash("sha1").update(bytes).digest("hex") !== release.file_hash
//       )
//         return err(
//           new HopperReleaseError(
//             "integrity",
//             "The Hopper package does not match the selected release bytes.",
//           ),
//         );
//       let publicKey = suppliedPublicKey;
//       if (publicKey === undefined) {
//         const response = await downloadHopperPackage(HOPPER_PUBLIC_KEY_URL, {
//           ...(signal === undefined ? {} : { signal }),
//           maxBytes: RELEASE_METADATA_BYTES,
//           timeoutMs: RELEASE_METADATA_TIMEOUT_MS,
//         });
//         if (!response.ok)
//           throw new HopperReleaseError(
//             "verification_unavailable",
//             "The official Hopper public key is unavailable.",
//           );
//         publicKey = decodeUtf8(response.bytes);
//       }
//       const packageSha256 = createHash("sha256").update(bytes).digest("hex");
//       // Every read still validates file identity, byte bounds and selected metadata.
//       // Reuse only proof of the exact signed bytes/key/signature/payload interpretation.
//       const proofKey = createHash("sha256")
//         .update(
//           JSON.stringify([
//             family,
//             packageSha256,
//             publicKey,
//             release.signature,
//             release.main_exe_hash,
//           ]),
//         )
//         .digest("hex");
//       signal?.throwIfAborted();
//       const existingProof = packageProofs.get(proofKey);
export const _l = 209;
