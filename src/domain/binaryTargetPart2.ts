export const __stub = 1;
//     architectures.push(architecture);
//     slices.set(architecture, {
//       offset: declaration.offset,
//       size: declaration.size,
//     });
//   }
//   const preferred = fatHostArchitecture(host);
//   const slice = preferred === undefined ? undefined : slices.get(preferred);
//   if (preferred === undefined || slice === undefined)
//     return err(`FAT binary has no host-compatible ${host} architecture`);
//   const minimumHeaderSize =
//     preferred === "arm64" || preferred === "x86_64" ? 32 : 28;
//   if (slice.size < minimumHeaderSize)
//     return err(`FAT slice for ${preferred} is shorter than its Mach-O header`);
//   return ok({
//     format: "mach-o-universal",
//     architecture: preferred,
//     availableArchitectures: architectures,
//     universalSlice: { offset: slice.offset, size: slice.size },
//   });
// };
//
// const fatHostArchitecture = (
//   host: NodeJS.Architecture,
// ): HeaderArchitecture | undefined => {
//   switch (host) {
//     case "arm64":
//       return "arm64";
//     case "x64":
//       return "x86_64";
//     case "ia32":
//       return "x86";
//     case "arm":
//       return "arm";
//     default:
//       return undefined;
//   }
// };
//
// const fatIdentityError = (
//   bytes: Buffer,
//   header: Extract<
//     ReturnType<typeof readFatContainerHeader>,
//     { state: "parsed" }
//   >,
// ): string | null => {
//   const identity = classifyFatContainerIdentity(header, (offset) => {
//     if (offset >= bytes.length) return undefined;
//     if (offset + 4 > bytes.length) return null;
//     return bytes.readUInt32BE(offset);
//   });
//   if (identity.state === "needs-slice-header")
//     return "FAT slice identity is outside the bounded prefix";
//   if (identity.state === "not-mach-o")
//     return "FAT table does not identify a Mach-O image";
//   if (identity.state === "malformed") return identity.reason;
//   return null;
// };
//
// const parseElf = (
//   bytes: Buffer,
//   fileSize: number,
// ): Result<ExecutableMetadata, string> => {
//   const fixedHeader = readElfFixedHeader(bytes, fileSize);
//   if (!fixedHeader.ok) return fixedHeader;
//   const { elfClass, byteOrder } = fixedHeader.value;
//   const little = byteOrder === "little";
//   const machine = little ? bytes.readUInt16LE(18) : bytes.readUInt16BE(18);
//   const architecture = elfArchitecture(machine);
//   if (architecture === undefined) return err("unsupported ELF architecture");
//   if (
//     architecture === "mips" ||
//     architecture === "riscv" ||
//     architecture === "powerpc"
//   ) {
//     const flagsOffset = elfClass === 32 ? 36 : 48;
//     const metadata: ElfFamilyMetadata = {
//       elfClass,
//       byteOrder: little ? "little" : "big",
//       type: little ? bytes.readUInt16LE(16) : bytes.readUInt16BE(16),
//       flags: little
//         ? bytes.readUInt32LE(flagsOffset)
//         : bytes.readUInt32BE(flagsOffset),
//     };
//     if (architecture === "powerpc")
//       return ok({
//         format: "elf",
//         architecture,
//         availableArchitectures: [architecture],
//         powerpc: metadata,
//       });
//     return architecture === "mips"
//       ? ok({
//           format: "elf",
//           architecture,
//           availableArchitectures: [architecture],
//           mips: metadata,
//         })
//       : ok({
//           format: "elf",
//           architecture,
//           availableArchitectures: [architecture],
//           riscv: metadata,
//         });
//   }
//   return ok({
//     format: "elf",
//     architecture,
//     availableArchitectures: [architecture],
//   });
// };
//
// const parseMz = (
//   bytes: Buffer,
//   fileSize: number,
//   signatureAtOffset?: Buffer,
// ): Result<ExecutableMetadata, string> => {
//   const windowsHeader = observeMzWindowsHeader(
//     bytes,
//     fileSize,
//     signatureAtOffset,
//   );
//   if (
//     windowsHeader.state === "header-needed" ||
//     windowsHeader.state === "signature-needed"
//   )
//     return err(
//       "Windows new-header pointer or signature is outside the bounded prefix",
//     );
//   if (windowsHeader.state === "declared") {
//     const { offset } = windowsHeader;
//     if (offset < 64 || offset > bytes.length - 24)
//       return err("invalid or truncated Windows executable header in MZ image");
//     if (["NE", "LE", "LX"].includes(windowsHeader.signature))
//       return err(
//         `unsupported ${windowsHeader.signature} executable in MZ image`,
//       );
//     if (windowsHeader.signature !== "PE")
//       return err("invalid or truncated Windows executable header in MZ image");
//     const codeView = parsePeCodeViewFromBuffer(bytes, offset);
//     return parsePeRecord(bytes.subarray(offset), codeView);
//   }
export const _l = 142;
