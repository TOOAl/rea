export const __stub = 1;
//   let bytesRead = observed.bytesRead;
//   while (xmlState === "pending" && bytesRead < MAX_XML_PLIST_PROBE_BYTES) {
//     throwIfTargetResolutionCancelled(signal);
//     const read = await handle.read(
//       chunk,
//       0,
//       Math.min(chunk.length, MAX_XML_PLIST_PROBE_BYTES - bytesRead),
//       bytesRead,
//     );
//     throwIfTargetResolutionCancelled(signal);
//     if (read.bytesRead === 0) break;
//     bytesRead += read.bytesRead;
//     xmlState = xmlProbe.write(chunk.subarray(0, read.bytesRead));
//     if (xmlState === "matched") return "plist";
//   }
//   if (bytesRead === MAX_XML_PLIST_PROBE_BYTES) {
//     const { size } = await handle.stat();
//     throwIfTargetResolutionCancelled(signal);
//     if (size > bytesRead)
//       throw new BinaryTargetError(
//         path,
//         "XML plist prolog was not found within the 1 MiB format probe limit",
//         { constraint: "file_format_rejected" },
//       );
//   }
//   return undefined;
// };
//
// const namedArtifactFormat = (
//   lowerPath: string,
// ): "asar" | "plist" | "source-map" | "javascript" | undefined => {
//   if (lowerPath.endsWith(".asar")) return "asar";
//   if (lowerPath.endsWith(".plist")) return "plist";
//   if (lowerPath.endsWith(".map")) return "source-map";
//   return /\.(?:m?js|cjs)$/u.test(lowerPath) ? "javascript" : undefined;
// };
//
// const isArchiveFormat = (
//   format: Exclude<
//     BinaryTarget["format"],
//     | "analysis-database"
//     | "mach-o"
//     | "mach-o-universal"
//     | "elf"
//     | "pe"
//     | "dos-mz"
//     | "dos-com"
//     | "raw-binary"
//   >,
// ): format is Extract<BinaryTarget, { kind: "archive" }>["format"] =>
//   isZipPackageFormat(format) || ["asar", "dmg", "pkg"].includes(format);
//
// const sha256Handle = async (
//   handle: FileHandle,
//   path: string,
//   initial: Stats,
//   signal?: AbortSignal,
// ): Promise<string> => {
//   const hash = createHash("sha256");
//   const chunk = Buffer.allocUnsafe(64 * 1024);
//   let position = 0;
//   while (true) {
//     throwIfTargetResolutionCancelled(signal);
//     const observed = await handle.read(
//       chunk,
//       0,
//       Math.min(chunk.length, initial.size - position + 1),
//       position,
//     );
//     throwIfTargetResolutionCancelled(signal);
//     if (observed.bytesRead === 0) break;
//     hash.update(chunk.subarray(0, observed.bytesRead));
//     position += observed.bytesRead;
//     if (position > initial.size)
//       throw new BinaryTargetError(path, "target grew while being read");
//   }
//   throwIfTargetResolutionCancelled(signal);
//   const [opened, currentPath] = await Promise.all([handle.stat(), lstat(path)]);
//   if (
//     !sameRegularFileState(initial, opened) ||
//     !sameRegularFileState(initial, currentPath) ||
//     position !== initial.size
//   )
//     throw new BinaryTargetError(path, "target changed while being read");
//   return hash.digest("hex");
// };
//
// const resolveAppBundle = async (
//   path: string,
// ): Promise<Result<ResolvedAppBundle, BinaryTargetError>> => {
//   const metadata = await stat(path);
//   if (!metadata.isDirectory()) return ok({ executable: path });
//   if (extname(path).toLowerCase() !== ".app")
//     return err(
//       new BinaryTargetError(
//         path,
//         "this opening route requires a file or app bundle",
//         {
//           constraint: "directory_requires_file",
//         },
//       ),
//     );
//   return resolveAppBundleExecutable(path);
// };
//
// const readExecutableMetadata = async (
//   handle: FileHandle,
//   hostArchitecture: NodeJS.Architecture,
//   signal?: AbortSignal,
// ): Promise<Result<ExecutableMetadata, string>> => {
//   throwIfTargetResolutionCancelled(signal);
//   const prefix = Buffer.alloc(4096);
//   const prefixRead = await handle.read(prefix, 0, prefix.length, 0);
//   throwIfTargetResolutionCancelled(signal);
//   const bytes = prefix.subarray(0, prefixRead.bytesRead);
//   // Header commitments such as Mach-O load commands and FAT slices are
//   // checked against the whole file, not the probed prefix.
//   const fileSize = (await handle.stat()).size;
//   throwIfTargetResolutionCancelled(signal);
//   if (bytes.length >= 2 && bytes[0] === 0x4d && bytes[1] === 0x5a) {
//     let windowsHeader = observeMzWindowsHeader(bytes, fileSize);
//     let signatureBytes: Buffer | undefined;
//     if (windowsHeader.state === "signature-needed") {
//       const { offset } = windowsHeader;
//       const signature = Buffer.alloc(Math.min(4, fileSize - offset));
//       const observedSignature = await handle.read(
//         signature,
//         0,
//         signature.length,
//         offset,
//       );
//       throwIfTargetResolutionCancelled(signal);
//       signatureBytes = signature.subarray(0, observedSignature.bytesRead);
//       windowsHeader = observeMzWindowsHeader(bytes, fileSize, signatureBytes);
//     }
//     if (windowsHeader.state === "declared") {
//       if (windowsHeader.offset < 64)
//         return err("invalid Windows new-header offset in MZ image");
//       return readPeMetadata(
//         handle,
//         windowsHeader.offset,
//         bytes,
//         fileSize,
//         signal,
//       );
//     }
//     // MZ relocation records may extend past the initial probe; their format
//     // bounds are at most 65535 records inside a 65535-paragraph header.
//     const tableEnd =
//       bytes.length >= 28
//         ? bytes.readUInt16LE(24) + bytes.readUInt16LE(6) * 4
//         : 0;
//     const headerBytes = bytes.length >= 28 ? bytes.readUInt16LE(8) * 16 : 0;
//     if (
//       tableEnd > bytes.length &&
//       tableEnd <= headerBytes &&
//       tableEnd <= fileSize
//     ) {
//       const table = Buffer.alloc(tableEnd);
//       const observed = await handle.read(table, 0, table.length, 0);
//       throwIfTargetResolutionCancelled(signal);
//       return parseExecutableHeader(
//         table.subarray(0, observed.bytesRead),
//         hostArchitecture,
//         fileSize,
//       );
//     }
//     return parseExecutableHeader(
//       bytes,
//       hostArchitecture,
//       fileSize,
//       signatureBytes,
//     );
//   }
export const _l = 174;
