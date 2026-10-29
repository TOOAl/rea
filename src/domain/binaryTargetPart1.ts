export const __stub = 1;
// import type {
//   BinaryArchitecture,
//   ElfFamilyMetadata,
//   HeaderArchitecture,
//   MipsElfMetadata,
//   PeCodeViewRecord,
//   RiscvElfMetadata,
//   PowerPcElfMetadata,
//   UniversalMachOSlice,
// } from "./binaryTargetTypes.js";
// import { err, ok, type Result } from "./result.js";
// import { readElfFixedHeader } from "./elfFixedHeader.js";
// import { observeMzWindowsHeader, parseDosMzHeader } from "./dosMz.js";
// import { decodePeMachine } from "./peMachine.js";
// import {
//   classifyFatContainerIdentity,
//   readFatContainerHeader,
// } from "./apple/machoContainer.js";
//
// /** Format and architecture facts recovered from an executable header. */
// export type ExecutableMetadata =
//   | {
//       readonly format: "elf";
//       readonly architecture: "mips";
//       readonly availableArchitectures: readonly "mips"[];
//       readonly mips: MipsElfMetadata;
//     }
//   | {
//       readonly format: "elf";
//       readonly architecture: "riscv";
//       readonly availableArchitectures: readonly "riscv"[];
//       readonly riscv: RiscvElfMetadata;
//     }
//   | {
//       readonly format: "elf";
//       readonly architecture: "powerpc";
//       readonly availableArchitectures: readonly "powerpc"[];
//       readonly powerpc: PowerPcElfMetadata;
//     }
//   | {
//       readonly format: "mach-o" | "elf" | "dos-mz" | "dos-com";
//       readonly architecture: HeaderArchitecture;
//       readonly availableArchitectures: readonly HeaderArchitecture[];
//       readonly universalSlice?: never;
//     }
//   | {
//       readonly format: "mach-o-universal";
//       readonly architecture: HeaderArchitecture;
//       readonly availableArchitectures: readonly HeaderArchitecture[];
//       readonly universalSlice: UniversalMachOSlice;
//     }
//   | {
//       readonly format: "pe";
//       /** Original unsigned COFF machine, before CPU-family normalization. */
//       readonly peMachine: number;
//       readonly architecture: HeaderArchitecture;
//       readonly availableArchitectures: readonly HeaderArchitecture[];
//       readonly executableRole:
//         | "application"
//         | "shared-library"
//         | "non-executable";
//       readonly managed: boolean;
//       readonly codeView?: PeCodeViewRecord;
//     };
//
// /**
//  * Parse supported executable headers without I/O. The caller supplies the host
//  * architecture used for deterministic FAT Mach-O slice selection.
//  */
// export const parseExecutableHeader = (
//   bytes: Buffer,
//   hostArchitecture: NodeJS.Architecture,
//   fileSize = bytes.length,
//   mzWindowsHeaderSignature?: Buffer,
// ): Result<ExecutableMetadata, string> => {
//   if (
//     bytes.length >= 4 &&
//     bytes.subarray(0, 4).equals(Buffer.from([0x7f, 0x45, 0x4c, 0x46]))
//   )
//     return parseElf(bytes, fileSize);
//   if (bytes.length >= 2 && bytes[0] === 0x4d && bytes[1] === 0x5a)
//     return parseMz(bytes, fileSize, mzWindowsHeaderSignature);
//   if (bytes.length < 8) return err("truncated or unsupported binary header");
//   const magic = bytes.readUInt32BE(0);
//   if ([0xfeedface, 0xfeedfacf, 0xcefaedfe, 0xcffaedfe].includes(magic))
//     return parseThinMachO(bytes, magic, fileSize);
//   const fatHeader = readFatContainerHeader(bytes, fileSize);
//   if (fatHeader.state !== "not-fat")
//     return parseFatMachO(bytes, hostArchitecture, fatHeader);
//   return err("unsupported binary format");
// };
//
// const parseThinMachO = (
//   bytes: Buffer,
//   magic: number,
//   fileSize: number,
// ): Result<ExecutableMetadata, string> => {
//   const is64 = magic === 0xfeedfacf || magic === 0xcffaedfe;
//   const headerSize = is64 ? 32 : 28;
//   if (bytes.length < headerSize)
//     return err(
//       `truncated Mach-O header: a ${is64 ? 64 : 32}-bit header needs ${headerSize} bytes; the file has ${fileSize}`,
//     );
//   const little = magic === 0xcefaedfe || magic === 0xcffaedfe;
//   const read = (offset: number): number =>
//     little ? bytes.readUInt32LE(offset) : bytes.readUInt32BE(offset);
//   const architecture = machArchitecture(read(4));
//   if (architecture === undefined) return err("unsupported Mach-O architecture");
//   const commandBytes = read(20);
//   if (headerSize + commandBytes > fileSize)
//     return err(
//       `truncated Mach-O load commands: the header declares ${commandBytes} bytes after its ${headerSize}-byte header; the file has ${fileSize}`,
//     );
//   return ok({
//     format: "mach-o",
//     architecture,
//     availableArchitectures: [architecture],
//   });
// };
//
// const parseFatMachO = (
//   bytes: Buffer,
//   host: NodeJS.Architecture,
//   header: Exclude<
//     ReturnType<typeof readFatContainerHeader>,
//     { state: "not-fat" }
//   >,
// ): Result<ExecutableMetadata, string> => {
//   if (header.state === "needs-data")
//     return err("truncated or invalid FAT architecture table");
//   if (header.state === "malformed") return err(header.reason);
//   const identityError = fatIdentityError(bytes, header);
//   if (identityError !== null) return err(identityError);
//   const architectures: HeaderArchitecture[] = [];
//   const slices = new Map<
//     HeaderArchitecture,
//     { readonly offset: number; readonly size: number }
//   >();
//   for (const declaration of header.slices) {
//     const architecture = machArchitecture(declaration.cpuType);
//     if (architecture === undefined || architectures.includes(architecture))
//       continue;
export const _l = 142;
