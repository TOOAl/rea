export const __stub = 1;
// import { constants, type Stats } from "node:fs";
// import { createHash } from "node:crypto";
// import {
//   access,
//   lstat,
//   realpath,
//   stat,
//   type FileHandle,
// } from "node:fs/promises";
// import { extname } from "node:path";
//
// import { BinaryTargetError } from "../domain/configurationErrors.js";
// import {
//   openRegularFile,
//   sameRegularFileState,
// } from "../filesystem/RegularFile.js";
// import { AnalysisCancelledError } from "../domain/analysisErrorCore.js";
// import type { BinaryTarget } from "../domain/binaryTargetTypes.js";
// import { err, ok, type Result } from "../domain/result.js";
// import { readMipsElfMetadata } from "./MipsElfMetadata.js";
// import {
//   resolveAppBundleExecutable,
//   type ResolvedAppBundle,
// } from "./AppBundleExecutable.js";
// import {
//   validateDosComLength,
//   type ExecutableFormatHint,
// } from "../domain/dosCom.js";
// import {
//   admitRawBinary,
//   rawBinarySelectionError,
// } from "../domain/rawBinary.js";
// import type { BinaryArchitecture } from "../domain/binaryTargetTypes.js";
// import { observeMzWindowsHeader } from "../domain/dosMz.js";
// import {
//   createXmlPlistSignatureProbe,
//   hasBinaryPlistSignature,
//   MAX_XML_PLIST_PROBE_BYTES,
// } from "../domain/apple/appleArchiveFormat.js";
// import {
//   hasZipSignature,
//   isZipPackageFormat,
//   zipPackageFormatForPath,
// } from "../domain/zipPackageFormat.js";
//
// import {
//   parseCodeViewData,
//   parseExecutableHeader,
//   parsePeRecord,
//   peDebugDirectoryEntry,
//   peRvaToFileOffset,
//   type ExecutableMetadata,
// } from "../domain/binaryTarget.js";
// import type { PeCodeViewRecord } from "../domain/binaryTargetTypes.js";
// import { absoluteCallerPath } from "../filesystem/callerPath.js";
//
// const XML_PLIST_PROBE_CHUNK_BYTES = 64 * 1024;
//
// /** Options for resolving a local binary target and its stable identity. */
// export interface BinaryTargetResolverOptions {
//   readonly cwd?: string;
//   readonly hostArchitecture?: NodeJS.Architecture;
//   readonly targetKind?: BinaryTarget["kind"];
//   readonly formatHint?: ExecutableFormatHint;
//   readonly architecture?: BinaryArchitecture;
//   readonly entryPoint?: string;
//   readonly signal?: AbortSignal;
// }
//
// /**
//  * Resolve and classify a readable local target before a provider is selected.
//  * FAT Mach-O inputs select only a host-compatible architecture so setup remains
//  * non-interactive; unsupported or ambiguous inputs are returned as typed errors.
//  */
// export const parseBinaryTarget = async (
//   input: string,
//   options: BinaryTargetResolverOptions = {},
// ): Promise<
//   Result<BinaryTarget, BinaryTargetError | AnalysisCancelledError>
// > => {
//   const cwd = options.cwd ?? process.cwd();
//   const hostArchitecture = options.hostArchitecture ?? process.arch;
//   const { targetKind, formatHint, signal, architecture, entryPoint } = options;
//   const candidate = absoluteCallerPath(input, { cwd });
//   try {
//     throwIfTargetResolutionCancelled(signal);
//     await access(candidate, constants.R_OK);
//     throwIfTargetResolutionCancelled(signal);
//     const canonical = await realpath(candidate);
//     // Windows native admission must inspect the caller-selected reparse components.
//     const sourcePath = process.platform === "win32" ? candidate : canonical;
//     throwIfTargetResolutionCancelled(signal);
//     const resolved = await resolveAppBundle(canonical);
//     throwIfTargetResolutionCancelled(signal);
//     if (!resolved.ok) return err(resolved.error);
//     const { executable: path, infoPlist } = resolved.value;
//     const bundle =
//       infoPlist === undefined ? {} : { bundleInfoPlist: infoPlist };
//     const handle = await openRegularFile(path, {
//       symlinks: "reject",
//       signal,
//     });
//     try {
//       throwIfTargetResolutionCancelled(signal);
//       const metadata = await handle.stat();
//       throwIfTargetResolutionCancelled(signal);
//       if (formatHint === "raw-binary") {
//         if (targetKind !== undefined && targetKind !== "executable")
//           return err(
//             new BinaryTargetError(
//               path,
//               "raw-binary format requires an executable target kind",
//               { constraint: "load_selection_rejected" },
//             ),
//           );
//         const admitted = admitRawBinary({
//           architecture,
//           entryPoint,
//           fileBytes: metadata.size,
//         });
//         if (!admitted.ok)
//           return err(
//             new BinaryTargetError(path, admitted.error.reason, {
//               constraint: admitted.error.constraint,
//             }),
//           );
//         return ok({
//           path,
//           sourcePath,
//           sha256: await sha256Handle(handle, path, metadata, signal),
//           kind: "executable",
//           format: "raw-binary",
//           architecture: admitted.value.architecture,
//           availableArchitectures: [admitted.value.architecture],
//           entryPoint: admitted.value.entryPoint,
//           entryPointSource: admitted.value.entryPointSource,
//         });
//       }
//       const pairing = rawBinarySelectionError({
//         ...(formatHint === undefined ? {} : { format: formatHint }),
//         architecture,
//         entryPoint,
//       });
//       if (pairing !== undefined)
//         return err(
//           new BinaryTargetError(path, pairing, {
//             constraint: "load_selection_rejected",
//           }),
//         );
//       if (formatHint === "dos-com") {
//         if (targetKind !== undefined && targetKind !== "executable")
//           return err(
//             new BinaryTargetError(
//               path,
//               "DOS COM format requires an executable target kind",
//               { constraint: "load_selection_rejected" },
//             ),
//           );
//         const length = validateDosComLength(metadata.size);
//         if (!length.ok)
//           return err(
//             new BinaryTargetError(path, length.error, {
//               constraint: "file_format_rejected",
//             }),
//           );
//         return ok({
//           path,
//           sourcePath,
//           sha256: await sha256Handle(handle, path, metadata, signal),
//           kind: "executable",
//           format: "dos-com",
//           architecture: "x86",
//           availableArchitectures: ["x86"],
//         });
export const _l = 174;
