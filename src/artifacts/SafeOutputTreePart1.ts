export const __stub = 1;
// import { createHash } from "node:crypto";
// import { constants } from "node:fs";
// import {
//   mkdir,
//   open,
//   readdir,
//   realpath,
//   type FileHandle,
// } from "node:fs/promises";
// import { basename, dirname, isAbsolute, join } from "node:path";
// import type { Readable } from "node:stream";
// import { OwnedFileHandle } from "../filesystem/OwnedFileHandle.js";
// import { streamChunkToBuffer } from "./StreamBytes.js";
//
// import {
//   ArtifactPathRegistry,
//   destinationCaseCollisionMessage,
//   normalizeArtifactPath,
// } from "./ArtifactPaths.js";
// import { absoluteCallerPath } from "../filesystem/callerPath.js";
// import { ArtifactReaderFailure } from "./ArtifactReader.js";
// import { SafeOutputTreeCreationFailure } from "./SafeOutputTreeCreationFailure.js";
// import { hashOutputFile } from "./SafeOutputTreeReadback.js";
// import { removeOwnedTree } from "./SafeOutputTreeCleanup.js";
// import {
//   assertHandleIdentity,
//   assertFilePathIdentity,
//   assertPathIdentity,
//   isAbsent,
//   readDirectoryIdentity,
//   readFileIdentity,
//   replacedDirectory,
//   type DirectoryIdentity,
//   type FileIdentity,
// } from "./SafeOutputTreeIdentity.js";
//
// /** One file durably written to an operation-owned output tree. */
// export interface SafeOutputFile {
//   readonly relativePath: string;
//   readonly sha256: string;
//   readonly bytesWritten: number;
// }
//
// /** Cleanup state established while rolling back an uncommitted tree. */
// export type SafeOutputCleanup =
//   | { readonly status: "not-required" }
//   | { readonly status: "complete"; readonly residualPaths: readonly [] }
//   | {
//       readonly status: "incomplete";
//       readonly residualPaths: readonly [string, ...string[]];
//     };
//
// /**
//  * Materialize files in a tree created by this operation.
//  *
//  * Path identities are revalidated around operations, but Node has no portable
//  * descriptor-relative traversal; a syscall-boundary pathname race remains.
//  */
// export class SafeOutputTree {
//   readonly #registry = new ArtifactPathRegistry();
//   readonly #outputRoot: string;
//   #rootIdentity: DirectoryIdentity | undefined;
//   readonly #nestedDirectories = new Map<string, DirectoryIdentity>();
//   readonly #unknownDirectories = new Set<string>();
//   readonly #ownedFiles = new Map<string, FileIdentity>();
//   readonly #openFiles = new Map<string, OwnedFileHandle>();
//   readonly #openHandles = new Set<OwnedFileHandle>();
//   #published = false;
//   #cleanup: SafeOutputCleanup = {
//     status: "not-required",
//   };
//
//   private constructor(
//     outputRoot: string,
//     private readonly platform: NodeJS.Platform,
//   ) {
//     this.#outputRoot = outputRoot;
//   }
//
//   /**
//    * Exclusively create the absent destination as this operation's owned tree.
//    *
//    * POSIX mode bits and directory `fchmod`/`fsync` have no Windows equivalent:
//    * `mkdir` already applies the requested mode, so the redundant handle
//    * `chmod` is skipped there to avoid an `EPERM` on the directory descriptor.
//    */
//   static async create(
//     outputRoot: string,
//     platform: NodeJS.Platform = process.platform,
//   ): Promise<SafeOutputTree> {
//     if (!isAbsolute(outputRoot))
//       throw new ArtifactReaderFailure(
//         "path",
//         "Extraction output root must be absolute",
//       );
//     // Path syntax follows the host; `platform` selects only the name policy.
//     const requested = absoluteCallerPath(outputRoot);
//     const name = basename(requested);
//     if (name === "." || name === "..")
//       throw new ArtifactReaderFailure("path", "Invalid extraction output root");
//     const parent = await realpath(dirname(requested)).catch(
//       (cause: unknown) => {
//         throw new ArtifactReaderFailure(
//           "unavailable",
//           "Extraction output parent is unavailable",
//           { cause },
//         );
//       },
//     );
//     const canonicalOutput = join(parent, name);
//     await mkdir(canonicalOutput, { mode: 0o700 }).catch((cause: unknown) => {
//       if (isAlreadyExists(cause))
//         throw new ArtifactReaderFailure(
//           "path",
//           "Extraction output root already exists",
//           { cause },
//         );
//       throw cause;
//     });
//     const tree = new SafeOutputTree(canonicalOutput, platform);
//     try {
//       const rootIdentity = await readDirectoryIdentity(canonicalOutput);
//       tree.#rootIdentity = rootIdentity;
//       if (platform !== "win32") {
//         const stagingHandle = tree.#trackHandle(
//           await open(
//             canonicalOutput,
//             constants.O_RDONLY | constants.O_DIRECTORY,
//           ),
//         );
//         let setup:
//           | { readonly kind: "ready" }
//           | {
//               readonly kind: "failed";
//               readonly cause: unknown;
//             } = { kind: "ready" };
//         try {
//           await assertHandleIdentity(
//             stagingHandle.handle,
//             rootIdentity,
//             canonicalOutput,
//           );
//           await stagingHandle.handle.chmod(0o700);
//         } catch (cause: unknown) {
//           setup = { kind: "failed", cause };
//         }
//         try {
//           await tree.#closeHandle(stagingHandle);
//         } catch (closeCause: unknown) {
//           if (setup.kind === "failed")
//             throw ArtifactReaderFailure.withCleanup(
//               setup.cause,
//               ArtifactReaderFailure.cleanupObservation(
//                 closeCause,
//                 canonicalOutput,
//               ),
//             );
//           throw closeCause;
//         }
export const _l = 159;
