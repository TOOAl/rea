export const __stub = 1;
// import { Buffer } from "node:buffer";
// import { setImmediate as yieldToEventLoop } from "node:timers/promises";
// import { createElfLoadMap } from "./ElfLoadMap.js";
// import {
//   SNAPSHOT_HASH_LENGTH,
//   SNAPSHOT_HASH_OFFSET,
//   SNAPSHOT_HASH_PATTERN,
// } from "./FlutterPayloadScan.js";
// import { readElfFixedHeader } from "../domain/elfFixedHeader.js";
//
// /** Bounds-checked little-endian reader over one loaded buffer. */
// class BoundedReader {
//   constructor(private readonly bytes: Buffer) {}
//
//   u8(offset: number): number | null {
//     return offset < this.bytes.length ? this.bytes.readUInt8(offset) : null;
//   }
//
//   u16(offset: number): number | null {
//     return offset + 2 <= this.bytes.length
//       ? this.bytes.readUInt16LE(offset)
//       : null;
//   }
//
//   u32(offset: number): number | null {
//     return offset + 4 <= this.bytes.length
//       ? this.bytes.readUInt32LE(offset)
//       : null;
//   }
//
//   u64(offset: number): number | null {
//     const low = this.u32(offset);
//     const high = this.u32(offset + 4);
//     if (low === null || high === null || high > 0x001fffff) return null;
//     return high * 0x1_0000_0000 + low;
//   }
//
//   cString(offset: number, tableEnd: number): string | null {
//     if (offset < 0 || offset >= tableEnd || tableEnd > this.bytes.length)
//       return null;
//     const end = this.bytes
//       .subarray(offset, Math.min(tableEnd, offset + 257))
//       .indexOf(0);
//     return end < 0
//       ? null
//       : this.bytes.subarray(offset, offset + end).toString("latin1");
//   }
// }
//
// export interface ElfSymbol {
//   readonly name: string;
//   /** File offset mapped from the virtual address through PT_LOAD. */
//   readonly offset: number;
//   readonly size: number;
// }
//
// export interface ElfParseFailure {
//   readonly reason: string;
// }
//
// const SHT_DYNSYM = 11;
// const SHF_ALLOC = 2;
// const PT_LOAD = 1;
// const PT_DYNAMIC = 2;
// /** Position-independent executable images carry PT_DYNAMIC. */
// const ET_DYN = 3;
// const DT_NULL = 0;
// const DT_STRTAB = 5;
// const DT_SYMTAB = 6;
// const DT_STRSZ = 10;
// const DT_SYMENT = 11;
//
// /** ELF32 needs 52 bytes, ELF64 needs 64; retain at most this prefix. */
// export const ELF_HEADER_MAX_BYTES = 64;
//
// /**
//  * Decode the supported ELF header and validate its table extents against
//  * the complete image size. The buffer may contain only the header prefix;
//  * this does not validate table contents or symbol availability.
//  */
// export const readElfHeader = (
//   bytes: Buffer,
//   totalBytes: number = bytes.length,
// ) => {
//   const reader = new BoundedReader(bytes);
//   const fixedHeader = readElfFixedHeader(bytes, totalBytes);
//   if (!fixedHeader.ok) return { failure: { reason: fixedHeader.error } };
//   const is64 = fixedHeader.value.elfClass === 64;
//   const headerBytes = is64 ? ELF_HEADER_MAX_BYTES : 52;
//   if (fixedHeader.value.byteOrder !== "little")
//     return { failure: { reason: "unsupported ELF byte order" } };
//   if (fixedHeader.value.headerSize !== headerBytes)
//     return { failure: { reason: "unsupported ELF header size" } };
//   const e_type = reader.u16(0x10);
//   if (e_type !== 1 && e_type !== 2 && e_type !== ET_DYN)
//     return { failure: { reason: "unsupported ELF type" } };
//   const e_shoff = is64 ? reader.u64(0x28) : reader.u32(0x20);
//   const e_shentsize = reader.u16(is64 ? 0x3a : 0x2e);
//   const e_shnum = reader.u16(is64 ? 0x3c : 0x30);
//   const e_phoff = is64 ? reader.u64(0x20) : reader.u32(0x1c);
//   const e_phentsize = reader.u16(is64 ? 0x36 : 0x2a);
//   const e_phnum = reader.u16(is64 ? 0x38 : 0x2c);
//   const tableFits = (
//     offset: number | null,
//     width: number | null,
//     count: number | null,
//     minimumWidth: number,
//   ): boolean =>
//     offset !== null &&
//     width !== null &&
//     count !== null &&
//     offset >= headerBytes &&
//     offset <= totalBytes &&
//     width >= minimumWidth &&
//     count > 0 &&
//     count <= Math.floor((totalBytes - offset) / width);
//   const MIN_SHENT = is64 ? 64 : 40;
//   // Section-stripped ET_DYN images keep their exported symbols reachable
//   // through PT_DYNAMIC instead of section headers; every other shape still
//   // needs a usable section header table.
//   // A nonzero shoff with shnum=0 uses extended numbering, which this
//   // parser does not support; it must not masquerade as a stripped image.
//   const dynamicFallback = e_type === ET_DYN && e_shoff === 0 && e_shnum === 0;
//   if (
//     e_shoff === null ||
//     e_shentsize === null ||
//     e_shnum === null ||
//     (!dynamicFallback && !tableFits(e_shoff, e_shentsize, e_shnum, MIN_SHENT))
//   )
//     return {
//       failure: {
//         reason: "ELF section header table is missing or out of bounds",
//       },
//     };
export const _l = 134;
