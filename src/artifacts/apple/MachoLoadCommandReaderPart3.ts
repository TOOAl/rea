export const __stub = 1;
//       "load commands",
//     );
//     const slice = decodeCommands(commands, {
//       wide,
//       cpuType: header.getUint32(4, true),
//       cpuSubtype: header.getUint32(8, true),
//       fileType: header.getUint32(12, true),
//       commandCount,
//       sliceOffset: base,
//       sliceSize: length,
//       fatCpuType: fat?.fatCpuType ?? null,
//       fatCpuSubtype: fat?.fatCpuSubtype ?? null,
//       fatAlignmentExponent: fat?.alignmentExponent ?? null,
//     });
//     const distinctPlatforms = [...new Set(slice.platforms)];
//     slice.platform =
//       distinctPlatforms.length === 1 ? (distinctPlatforms[0] ?? null) : null;
//     return slice;
//   }
//   throw new MachoFormatIssue(
//     magic === swap(MH_MAGIC) || magic === swap(MH_MAGIC_64)
//       ? "unsupported"
//       : "malformed",
//     magic === swap(MH_MAGIC) || magic === swap(MH_MAGIC_64)
//       ? "big-endian Mach-O slices are not supported"
//       : `slice at offset ${base} has no Mach-O header`,
//   );
// };
//
// const decodeCommands = (
//   bytes: Uint8Array,
//   header: {
//     readonly wide: boolean;
//     readonly cpuType: number;
//     readonly cpuSubtype: number;
//     readonly fileType: number;
//     readonly commandCount: number;
//     readonly sliceOffset: number;
//     readonly sliceSize: number;
//     readonly fatCpuType: number | null;
//     readonly fatCpuSubtype: number | null;
//     readonly fatAlignmentExponent: number | null;
//   },
// ): MachoSlice => {
//   // loader.h: load commands are 8-byte aligned in 64-bit images, 4 in 32-bit.
//   const alignment = header.wide ? 8 : 4;
//   const view = viewOf(bytes);
//   const slice: MachoSlice = {
//     architecture: architectureName(header.cpuType, header.cpuSubtype),
//     slice_offset: header.sliceOffset,
//     slice_size: header.sliceSize,
//     cpu_type: header.cpuType,
//     cpu_subtype: header.cpuSubtype,
//     fat_cpu_type: header.fatCpuType,
//     fat_cpu_subtype: header.fatCpuSubtype,
//     fat_alignment_exponent: header.fatAlignmentExponent,
//     file_type: fileTypeName(header.fileType),
//     file_type_code: header.fileType,
//     platform: null,
//     platforms: [],
//     install_name: null,
//     dependencies: [],
//     rpaths: [],
//     dyld_environment: [],
//     code_signature_present: false,
//   };
//   let offset = 0;
//   for (let index = 0; index < header.commandCount; index++) {
//     if (offset + 8 > bytes.byteLength)
//       throw new MachoFormatIssue(
//         "malformed",
//         `load command ${index} starts beyond sizeofcmds`,
//       );
//     const command = view.getUint32(offset, true);
//     const size = view.getUint32(offset + 4, true);
//     if (size < 8 || size % alignment !== 0 || offset + size > bytes.byteLength)
//       throw new MachoFormatIssue(
//         "malformed",
//         `load command ${index} at offset ${offset} has invalid cmdsize ${size}`,
//       );
//     const body = bytes.subarray(offset, offset + size);
//     decodeCommand(command, body, index, slice);
//     offset += size;
//   }
//   if (offset !== bytes.byteLength)
//     throw new MachoFormatIssue(
//       "malformed",
//       `load commands declare ${header.commandCount} commands but sizeofcmds holds ${bytes.byteLength} bytes`,
//     );
//   return slice;
// };
//
// const decodeCommand = (
//   command: number,
//   body: Uint8Array,
//   index: number,
//   slice: MachoSlice,
// ): void => {
//   if (command === LC_ID_DYLIB) {
//     slice.install_name = commandString(body, 24, index);
//     return;
//   }
//   if (command === LC_RPATH) {
//     slice.rpaths.push(commandString(body, 12, index));
//     return;
//   }
//   if (command === LC_DYLD_ENVIRONMENT) {
//     slice.dyld_environment.push(commandString(body, 12, index));
//     return;
//   }
//   if (command === LC_CODE_SIGNATURE) {
//     // linkedit_data_command: cmd, cmdsize, dataoff, datasize.
//     if (body.byteLength < 16)
//       throw new MachoFormatIssue(
//         "malformed",
//         `load command ${index} is too short for LC_CODE_SIGNATURE`,
//       );
//     slice.code_signature_present = true;
//     return;
//   }
//   if (command === LC_BUILD_VERSION) {
//     if (body.byteLength < 24)
//       throw new MachoFormatIssue(
//         "malformed",
//         `load command ${index} is too short for LC_BUILD_VERSION`,
//       );
//     const view = viewOf(body);
//     const toolCount = view.getUint32(20, true);
//     if (toolCount > Math.floor((body.byteLength - 24) / 8))
//       throw new MachoFormatIssue(
//         "malformed",
//         `load command ${index} LC_BUILD_VERSION tool records exceed cmdsize`,
//       );
//     const platform = view.getUint32(8, true);
//     slice.platforms.push(platform);
//     return;
//   }
//   const legacyPlatform = legacyVersionMinPlatform(command, slice.cpu_type);
//   if (legacyPlatform !== undefined) {
//     if (body.byteLength < 16)
export const _l = 140;
