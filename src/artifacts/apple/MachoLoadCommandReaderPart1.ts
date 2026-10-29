export const __stub = 1;
// import type {
//   MachoDependency,
//   MachoImageFacts,
//   MachoSlice,
// } from "../../domain/apple/dylibResolution.js";
// import { machoCpuSubtypeBase } from "../../domain/apple/machoCpuIdentity.js";
// import {
//   classifyFatContainerIdentity,
//   readFatContainerHeader,
//   validateFatSliceIdentity,
//   type FatSliceDeclaration,
// } from "../../domain/apple/machoContainer.js";
//
// /** Read `length` bytes at `offset`; shorter results mean end of file. */
// export type ReadAt = (offset: number, length: number) => Promise<Uint8Array>;
//
// /** Load commands larger than this are refused instead of buffered. */
// export const MAX_LOAD_COMMAND_BYTES = 16 * 1024 * 1024;
// const MH_MAGIC = 0xfeedface;
// const MH_MAGIC_64 = 0xfeedfacf;
// const MH_CIGAM = 0xcefaedfe;
// const MH_CIGAM_64 = 0xcffaedfe;
// const FAT_MAGIC = 0xcafebabe;
// const FAT_MAGIC_64 = 0xcafebabf;
// const FAT_CIGAM = 0xbebafeca;
// const FAT_CIGAM_64 = 0xbfbafeca;
//
// const LC_ID_DYLIB = 0xd;
// const LC_LOAD_DYLIB = 0xc;
// const LC_LOAD_WEAK_DYLIB = 0x80000018;
// const LC_REEXPORT_DYLIB = 0x8000001f;
// const LC_LAZY_LOAD_DYLIB = 0x20;
// const LC_LOAD_UPWARD_DYLIB = 0x80000023;
// const LC_RPATH = 0x8000001c;
// const LC_DYLD_ENVIRONMENT = 0x27;
// const LC_CODE_SIGNATURE = 0x1d;
// const LC_VERSION_MIN_MACOSX = 0x24;
// const LC_VERSION_MIN_IPHONEOS = 0x25;
// const LC_VERSION_MIN_TVOS = 0x2f;
// const LC_VERSION_MIN_WATCHOS = 0x30;
// const LC_BUILD_VERSION = 0x32;
//
// // `mach-o/loader.h` `PLATFORM_*` numbers observed via Apple linker output.
// const PLATFORM_MACOS = 1;
// const PLATFORM_IOS = 2;
// const PLATFORM_TVOS = 3;
// const PLATFORM_WATCHOS = 4;
// const PLATFORM_IOSSIMULATOR = 7;
// const PLATFORM_TVOSSIMULATOR = 8;
// const PLATFORM_WATCHOSSIMULATOR = 9;
//
// const CPU_TYPE_I386 = 7;
// const CPU_TYPE_X86_64 = 0x01000007;
//
// /**
//  * Legacy `LC_VERSION_MIN_*` commands predate explicit simulator platform
//  * IDs. Per Apple's dyld rules the image CPU type distinguishes simulator
//  * from device: Intel images are simulator, ARM images are device
//  * (tvOS simulator applies to x86_64 only). `LC_BUILD_VERSION` platform
//  * numbers are preserved verbatim; unknown future numbers stay unknown
//  * downstream, never mapped to nearest.
//  */
// const legacyVersionMinPlatform = (
//   command: number,
//   cpuType: number,
// ): number | undefined => {
//   const isIntel = cpuType === CPU_TYPE_I386 || cpuType === CPU_TYPE_X86_64;
//   switch (command) {
//     case LC_VERSION_MIN_MACOSX:
//       return PLATFORM_MACOS;
//     case LC_VERSION_MIN_IPHONEOS:
//       return isIntel ? PLATFORM_IOSSIMULATOR : PLATFORM_IOS;
//     case LC_VERSION_MIN_TVOS:
//       return cpuType === CPU_TYPE_X86_64
//         ? PLATFORM_TVOSSIMULATOR
//         : PLATFORM_TVOS;
//     case LC_VERSION_MIN_WATCHOS:
//       return isIntel ? PLATFORM_WATCHOSSIMULATOR : PLATFORM_WATCHOS;
//     default:
//       return undefined;
//   }
// };
//
// /** `mach-o/loader.h` `dylib_use_command`: `nameoff == 28` and this marker. */
// const DYLIB_USE_MARKER = 0x1a741800;
// const DYLIB_USE_WEAK_LINK = 0x1;
// const DYLIB_USE_REEXPORT = 0x2;
// const DYLIB_USE_UPWARD = 0x4;
// const DYLIB_USE_DELAYED_INIT = 0x8;
//
// const DEPENDENCY_COMMANDS: ReadonlyMap<number, MachoDependency["command"]> =
//   new Map([
//     [LC_LOAD_DYLIB, "LC_LOAD_DYLIB"],
//     [LC_LOAD_WEAK_DYLIB, "LC_LOAD_WEAK_DYLIB"],
//     [LC_REEXPORT_DYLIB, "LC_REEXPORT_DYLIB"],
//     [LC_LAZY_LOAD_DYLIB, "LC_LAZY_LOAD_DYLIB"],
//     [LC_LOAD_UPWARD_DYLIB, "LC_LOAD_UPWARD_DYLIB"],
//   ]);
//
// /** Malformed or unsupported structure found while decoding one image. */
// class MachoFormatIssue extends Error {
//   constructor(
//     readonly status: "malformed" | "unsupported",
//     message: string,
//   ) {
//     super(message);
//   }
// }
//
// /** Report whether the first bytes carry a Mach-O or FAT magic number. */
// export const hasMachoMagic = (head: Uint8Array): boolean => {
//   if (head.byteLength < 4) return false;
//   const magic = new DataView(
//     head.buffer,
//     head.byteOffset,
//     head.byteLength,
//   ).getUint32(0, false);
//   return [
//     MH_MAGIC,
//     MH_MAGIC_64,
//     MH_CIGAM,
//     MH_CIGAM_64,
//     FAT_MAGIC,
//     FAT_MAGIC_64,
//     FAT_CIGAM,
//     FAT_CIGAM_64,
//   ].includes(magic);
// };
//
// /** Decode every slice's dylib-loading load commands without reading code. */
// export const readMachoImage = async (
//   readAt: ReadAt,
//   size: number,
// ): Promise<MachoImageFacts> => {
//   try {
//     const head = await readAt(0, Math.min(size, 8));
//     if (head.byteLength < 8)
//       // A recognized magic with no room for a header is a truncated image.
//       return hasMachoMagic(head)
//         ? { status: "malformed", reason: "Mach-O header is truncated" }
export const _l = 140;
