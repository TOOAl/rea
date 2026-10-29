export const __stub = 1;
//   const parsed = parseDosMzHeader(bytes, fileSize, signatureAtOffset);
//   return parsed.ok
//     ? ok({
//         format: "dos-mz",
//         architecture: "x86",
//         availableArchitectures: ["x86"],
//       })
//     : parsed;
// };
//
// /** Parse a bounded PE signature, COFF record, and optional header without I/O. */
// export const parsePeRecord = (
//   record: Buffer,
//   codeView: PeCodeViewRecord | undefined,
// ): Result<ExecutableMetadata, string> => {
//   if (
//     record.length < 24 ||
//     record.toString("binary", 0, 4) !== "PE\u0000\u0000"
//   )
//     return err("invalid or truncated PE header");
//   const machineType = record.readUInt16LE(4);
//   const machine = decodePeMachine(machineType);
//   if (machine === undefined)
//     return err(
//       `unsupported PE architecture (COFF machine 0x${machineType.toString(16).padStart(4, "0")})`,
//     );
//   const { architecture } = machine;
//   const optionalHeaderSize = record.readUInt16LE(20);
//   if (optionalHeaderSize > 4096 || record.length < 24 + optionalHeaderSize)
//     return err("invalid or truncated PE optional header");
//   const optionalHeader = record.subarray(24, 24 + optionalHeaderSize);
//   const managed = peManagedStatus(optionalHeader, architecture);
//   if (!managed.ok) return managed;
//   if (machine.nativeOsOverride && !managed.value)
//     return err("unsupported PE architecture");
//   const characteristics = record.readUInt16LE(22);
//   return ok({
//     format: "pe",
//     peMachine: machineType,
//     architecture,
//     availableArchitectures: [architecture],
//     executableRole:
//       (characteristics & 0x0002) === 0
//         ? "non-executable"
//         : (characteristics & 0x2000) === 0
//           ? "application"
//           : "shared-library",
//     managed: managed.value,
//     ...(codeView !== undefined ? { codeView } : {}),
//   });
// };
//
// /** Parse CodeView record data (RSDS or NB10) from raw data bytes. */
// export const parseCodeViewData = (
//   buffer: Buffer,
//   sizeOfData: number,
// ): PeCodeViewRecord | undefined => {
//   if (sizeOfData < 16 || buffer.length < 16) return undefined;
//   const magic = buffer.subarray(0, 4).toString("binary");
//   const pathOffset = magic === "RSDS" ? 24 : magic === "NB10" ? 16 : undefined;
//   if (
//     pathOffset === undefined ||
//     sizeOfData <= pathOffset ||
//     buffer.length <= pathOffset
//   )
//     return undefined;
//   const end = buffer.indexOf(0, pathOffset);
//   if (end <= pathOffset || end >= sizeOfData) return undefined;
//   const pdbPath = buffer.toString("utf8", pathOffset, end);
//   const pdbFileName = pdbPath.split(/[/\\]/u).pop() ?? pdbPath;
//   if (magic === "RSDS" && sizeOfData >= 24 && buffer.length >= 24) {
//     const part1 = buffer.readUInt32LE(4).toString(16).padStart(8, "0");
//     const part2 = buffer.readUInt16LE(8).toString(16).padStart(4, "0");
//     const part3 = buffer.readUInt16LE(10).toString(16).padStart(4, "0");
//     const part4 = buffer.subarray(12, 14).toString("hex");
//     const part5 = buffer.subarray(14, 20).toString("hex");
//     const guid = `${part1}-${part2}-${part3}-${part4}-${part5}`;
//     const age = buffer.readUInt32LE(20);
//     return { pdbPath, pdbFileName, guid, age };
//   }
//   if (magic === "NB10") {
//     const age = buffer.readUInt32LE(12);
//     return { pdbPath, pdbFileName, guid: null, age };
//   }
//   return undefined;
// };
//
// /** Locate the debug directory RVA and size from a PE optional header. */
// export const peDebugDirectoryEntry = (
//   optionalHeader: Buffer,
// ):
//   | {
//       readonly debugRva: number;
//       readonly debugSize: number;
//       readonly sizeOfHeaders: number;
//     }
//   | undefined => {
//   if (optionalHeader.length < 2) return undefined;
//   const magic = optionalHeader.readUInt16LE(0);
//   if (magic !== 0x10b && magic !== 0x20b) return undefined;
//   const directoryOffset = magic === 0x20b ? 112 : 96;
//   const directoryCountOffset = directoryOffset - 4;
//   if (optionalHeader.length < directoryCountOffset + 4) return undefined;
//   const directoryCount = optionalHeader.readUInt32LE(directoryCountOffset);
//   if (directoryCount <= 6) return undefined;
//   const debugEntryOffset = directoryOffset + 6 * 8;
//   if (optionalHeader.length < debugEntryOffset + 8) return undefined;
//   const debugRva = optionalHeader.readUInt32LE(debugEntryOffset);
//   const debugSize = optionalHeader.readUInt32LE(debugEntryOffset + 4);
//   if (debugRva === 0 || debugSize < 28) return undefined;
//   return {
//     debugRva,
//     debugSize,
//     sizeOfHeaders: optionalHeader.readUInt32LE(60),
//   };
// };
//
// /** Translate an RVA to an absolute file offset using the PE section table. */
// export const peRvaToFileOffset = (
//   rva: number,
//   sectionTable: Buffer,
//   numberOfSections: number,
//   sizeOfHeaders: number,
//   size = 1,
// ): number | undefined => {
//   if (rva < sizeOfHeaders && size <= sizeOfHeaders - rva) return rva;
//   for (let i = 0; i < numberOfSections; i++) {
//     const offset = i * 40;
//     if (sectionTable.length < offset + 40) break;
//     const virtualAddress = sectionTable.readUInt32LE(offset + 12);
//     const sizeOfRawData = sectionTable.readUInt32LE(offset + 16);
//     const pointerToRawData = sectionTable.readUInt32LE(offset + 20);
//     if (
//       pointerToRawData > 0 &&
//       rva >= virtualAddress &&
//       rva - virtualAddress < sizeOfRawData &&
//       size <= sizeOfRawData - (rva - virtualAddress)
//     ) {
//       return pointerToRawData + (rva - virtualAddress);
//     }
//   }
//   return undefined;
export const _l = 142;
