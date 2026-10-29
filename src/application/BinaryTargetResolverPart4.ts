export const __stub = 1;
//   if (bytes.length >= 8) {
//     const magic = bytes.readUInt32BE(0);
//     if ([0xcafebabf, 0xbfbafeca].includes(magic)) {
//       const little = magic === 0xbfbafeca;
//       const count = little ? bytes.readUInt32LE(4) : bytes.readUInt32BE(4);
//       const required = 8 + count * 32;
//       if (count <= 128 && required > bytes.length) {
//         const header = Buffer.alloc(required);
//         const headerRead = await handle.read(header, 0, header.length, 0);
//         throwIfTargetResolutionCancelled(signal);
//         return parseExecutableHeader(
//           header.subarray(0, headerRead.bytesRead),
//           hostArchitecture,
//           fileSize,
//         );
//       }
//     }
//   }
//   const parsed = parseExecutableHeader(bytes, hostArchitecture, fileSize);
//   if (
//     !parsed.ok ||
//     parsed.value.architecture !== "mips" ||
//     parsed.value.mips.elfClass !== 32
//   )
//     return parsed;
//   const declarations = await readMipsElfMetadata(
//     handle,
//     parsed.value.mips,
//     () => throwIfTargetResolutionCancelled(signal),
//   );
//   if (!declarations.ok) return declarations;
//   return ok({
//     ...parsed.value,
//     mips: {
//       ...parsed.value.mips,
//       abiFlags: declarations.value.abiFlags,
//       gnuAttributes: declarations.value.gnuAttributes,
//       ...(declarations.value.sharedLoad === undefined
//         ? {}
//         : { sharedLoad: declarations.value.sharedLoad }),
//       ...(declarations.value.limitations.length === 0
//         ? {}
//         : { limitations: declarations.value.limitations }),
//     },
//   });
// };
//
// const readPeMetadata = async (
//   handle: FileHandle,
//   offset: number,
//   mzPrefix: Buffer,
//   fileSize: number,
//   signal?: AbortSignal,
// ): Promise<Result<ExecutableMetadata, string>> => {
//   throwIfTargetResolutionCancelled(signal);
//   const fileHeader = Buffer.alloc(24);
//   const fileHeaderRead = await handle.read(
//     fileHeader,
//     0,
//     fileHeader.length,
//     offset,
//   );
//   throwIfTargetResolutionCancelled(signal);
//   if (fileHeaderRead.bytesRead !== fileHeader.length)
//     return err("invalid or truncated PE header");
//   const windowsHeader = observeMzWindowsHeader(
//     mzPrefix,
//     fileSize,
//     fileHeader.subarray(0, 4),
//   );
//   if (windowsHeader.state !== "declared")
//     return err("invalid Windows new-header signature in MZ image");
//   if (["NE", "LE", "LX"].includes(windowsHeader.signature))
//     return err(`unsupported ${windowsHeader.signature} executable in MZ image`);
//   const optionalHeaderSize = fileHeader.readUInt16LE(20);
//   if (optionalHeaderSize > 4096) return err("invalid PE optional header size");
//   const numberOfSections = fileHeader.readUInt16LE(6);
//   const record = Buffer.alloc(24 + optionalHeaderSize);
//   const recordRead = await handle.read(record, 0, record.length, offset);
//   throwIfTargetResolutionCancelled(signal);
//   if (recordRead.bytesRead !== record.length)
//     return err("invalid or truncated PE header");
//   const codeView = await readPeCodeView(
//     handle,
//     offset,
//     numberOfSections,
//     record.subarray(24),
//     optionalHeaderSize,
//     signal,
//   );
//   return parsePeRecord(record, codeView);
// };
//
// const readPeCodeView = async (
//   handle: FileHandle,
//   peOffset: number,
//   numberOfSections: number,
//   optionalHeader: Buffer,
//   optionalHeaderSize: number,
//   signal?: AbortSignal,
// ): Promise<PeCodeViewRecord | undefined> => {
//   throwIfTargetResolutionCancelled(signal);
//   const debugDir = peDebugDirectoryEntry(optionalHeader);
//   if (debugDir === undefined || numberOfSections > 96) return undefined;
//   const sectionTableOffset = peOffset + 24 + optionalHeaderSize;
//   const sectionTableSize = numberOfSections * 40;
//   const sectionTable = Buffer.alloc(sectionTableSize);
//   const sectionRead = await handle.read(
//     sectionTable,
//     0,
//     sectionTableSize,
//     sectionTableOffset,
//   );
//   throwIfTargetResolutionCancelled(signal);
//   if (sectionRead.bytesRead !== sectionTableSize) return undefined;
//   const debugFileOffset = peRvaToFileOffset(
//     debugDir.debugRva,
//     sectionTable,
//     numberOfSections,
//     debugDir.sizeOfHeaders,
//     Math.min(debugDir.debugSize, 4096),
//   );
//   if (debugFileOffset === undefined) return undefined;
//   const maxDebugSize = Math.min(debugDir.debugSize, 4096);
//   const debugDirectoryBuffer = Buffer.alloc(maxDebugSize);
//   const debugDirRead = await handle.read(
//     debugDirectoryBuffer,
//     0,
//     maxDebugSize,
//     debugFileOffset,
//   );
//   throwIfTargetResolutionCancelled(signal);
//   const numEntries = Math.floor(debugDirRead.bytesRead / 28);
//   for (let j = 0; j < numEntries; j++) {
//     const entryOffset = j * 28;
//     const type = debugDirectoryBuffer.readUInt32LE(entryOffset + 12);
//     if (type !== 2) continue; // IMAGE_DEBUG_TYPE_CODEVIEW
//     const sizeOfData = debugDirectoryBuffer.readUInt32LE(entryOffset + 16);
//     let pointerToRawData = debugDirectoryBuffer.readUInt32LE(entryOffset + 24);
//     if (pointerToRawData === 0) {
//       const addressOfRawData = debugDirectoryBuffer.readUInt32LE(
//         entryOffset + 20,
//       );
//       const mapped = peRvaToFileOffset(
//         addressOfRawData,
//         sectionTable,
//         numberOfSections,
//         debugDir.sizeOfHeaders,
//         Math.min(sizeOfData, 4096),
//       );
//       if (mapped === undefined) continue;
//       pointerToRawData = mapped;
//     }
//     if (sizeOfData < 16) continue;
//     const maxCodeViewRead = Math.min(sizeOfData, 4096);
//     const codeViewBuffer = Buffer.alloc(maxCodeViewRead);
//     const codeViewRead = await handle.read(
//       codeViewBuffer,
//       0,
//       maxCodeViewRead,
//       pointerToRawData,
//     );
//     throwIfTargetResolutionCancelled(signal);
//     const parsed = parseCodeViewData(
//       codeViewBuffer.subarray(0, codeViewRead.bytesRead),
//       sizeOfData,
//     );
//     if (parsed !== undefined) return parsed;
//   }
//   return undefined;
// };
export const _l = 171;
