export const __stub = 1;
// import { constants, createWriteStream, type Stats } from "node:fs";
// import {
//   lstat,
//   mkdtemp,
//   open,
//   realpath,
//   rm,
//   type FileHandle,
// } from "node:fs/promises";
// import { tmpdir } from "node:os";
// import { createHash } from "node:crypto";
// import { isAbsolute, join, relative, sep } from "node:path";
// import { Readable, Transform } from "node:stream";
// import { pipeline } from "node:stream/promises";
//
// import { getRawHeader, uncache } from "@electron/asar";
//
// import {
//   ArtifactReaderFailure,
//   copyArtifactEntry,
//   sameArtifactEntry,
//   type ArtifactEntry,
//   type ArtifactReader,
// } from "./ArtifactReader.js";
// import { closeAsarHandle, readValidatedAsarEntry } from "./AsarEntryStream.js";
// import { admitAsarHeader } from "./AsarHeader.js";
// import { OwnedFileHandle } from "../filesystem/OwnedFileHandle.js";
// import { readFileHandleChunks } from "../filesystem/readFileHandleChunks.js";
// import {
//   readAsarListing,
//   type AsarListedEntry,
//   type AsarMetadata,
// } from "./AsarListing.js";
//
// /**
//  * Official Electron ASAR adapter with range-streamed member reads.
//  *
//  * An entry marked `unpacked` is metadata, not an integrity exemption: Electron
//  * stores its bytes beside the archive in `<archive>.unpacked`, and callers must
//  * hash those companion bytes against the archive's declared integrity value.
//  */
// export class AsarArtifactReader implements ArtifactReader {
//   readonly format = "asar" as const;
//   #archiveSize: number | undefined;
//   #headerSize: number | undefined;
//   readonly #entries = new Map<string, AsarEntryState>();
//   readonly #ownedHandles = new Map<SharedAsarFileHandle, OwnedAsarHandle>();
//   #snapshot: { readonly path: string; readonly sha256: string } | undefined;
//   #snapshotRoot: string | undefined;
//   #snapshotOperation: Promise<void> = Promise.resolve();
//
//   constructor(
//     private readonly path: string,
//     private readonly options: AsarArtifactReaderOptions = {},
//   ) {}
//
//   async *entries(signal?: AbortSignal): AsyncIterable<ArtifactEntry> {
//     let paths: readonly AsarListedEntry[];
//     try {
//       await this.prepareContainer(undefined, signal);
//       paths = await this.#withSnapshotOperation(async () => {
//         const snapshotPath = this.#snapshotPath();
//         this.#resetArchiveState();
//         this.#entries.clear();
//         const admitted = await this.#admitHeader(snapshotPath);
//         this.#archiveSize = admitted.archiveBytes;
//         this.#headerSize = admitted.headerBytes;
//         abortIfNeeded(signal);
//         const ordered = await readAsarListing(
//           getRawHeader(snapshotPath).header,
//           signal,
//         );
//         const archiveMetadata = await lstat(snapshotPath);
//         if (!archiveMetadata.isFile() || archiveMetadata.isSymbolicLink())
//           throw new ArtifactReaderFailure(
//             "format",
//             "ASAR container is not a regular file",
//           );
//         this.#archiveSize = archiveMetadata.size;
//         return ordered;
//       }, signal);
//     } catch (cause: unknown) {
//       throw asarFailure(this.path, "inventory", cause);
//     }
//     for (const { metadata, path } of paths) {
//       abortIfNeeded(signal);
//       const providerPath = path.split("/").join(sep);
//       const kind =
//         metadata.files !== undefined
//           ? "directory"
//           : metadata.link !== undefined
//             ? "symlink"
//             : "file";
//       const entry: ArtifactEntry = {
//         path,
//         kind,
//         declaredSize: metadata.size ?? null,
//         compressedSize: null,
//         executable: metadata.executable === true,
//         encrypted: false,
//         byteOffset: null,
//         declaredSha256:
//           metadata.integrity !== undefined &&
//           metadata.integrity.algorithm === "SHA256" &&
//           /^[a-f0-9]{64}$/u.test(metadata.integrity.hash)
//             ? metadata.integrity.hash
//             : null,
//         unpacked: "unpacked" in metadata && metadata.unpacked === true,
//         limitations:
//           kind === "symlink"
//             ? ["ASAR symlink target was not followed or disclosed."]
//             : [],
//         adapterKey: providerPath,
//       };
//       if (kind === "file" && isAsarFileMetadata(metadata))
//         this.#entries.set(providerPath, {
//           metadata,
//           entry: copyArtifactEntry(entry),
//         });
//       yield entry;
//     }
//   }
//
//   async #admitHeader(snapshotPath: string) {
//     const headerHandle = await this.#openOwned(
//       snapshotPath,
//       constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK,
//     );
//     let admission:
//       | {
//           readonly ok: true;
//           readonly value: Awaited<ReturnType<typeof admitAsarHeader>>;
//         }
//       | { readonly ok: false; readonly cause: unknown };
//     try {
//       admission = { ok: true, value: await admitAsarHeader(headerHandle) };
//     } catch (cause: unknown) {
//       admission = { ok: false, cause };
//     }
//     try {
//       await this.#closeOwnedHandle(headerHandle);
//     } catch (cleanupCause: unknown) {
//       if (!admission.ok)
//         throw ArtifactReaderFailure.withCleanup(
//           admission.cause,
//           ArtifactReaderFailure.cleanupObservation(cleanupCause, snapshotPath),
//         );
//       throw cleanupCause;
//     }
//     if (!admission.ok) throw admission.cause;
//     return admission.value;
//   }
//
//   async open(entry: ArtifactEntry, signal?: AbortSignal): Promise<Readable> {
//     return this.#withSnapshotOperation(
//       () => this.#openEntry(entry, signal),
//       signal,
//     );
//   }
//
//   async #openEntry(
//     entry: ArtifactEntry,
//     signal?: AbortSignal,
//   ): Promise<Readable> {
//     abortIfNeeded(signal);
//     const state = this.#entries.get(entry.adapterKey);
//     if (state === undefined && entry.kind !== "file")
//       throw new ArtifactReaderFailure(
//         "format",
//         "ASAR entry is not a regular file",
//       );
//     if (state === undefined)
//       throw new ArtifactReaderFailure(
//         "integrity",
//         `ASAR entry was not produced by this reader: ${entry.path}`,
//       );
//     if (!sameArtifactEntry(entry, state.entry))
//       throw new ArtifactReaderFailure(
//         "integrity",
//         `ASAR entry metadata changed since inventory: ${state.entry.path}`,
//       );
//     if (state.entry.unpacked)
//       return this.#openUnpackedStream(state.entry, signal);
export const _l = 183;
