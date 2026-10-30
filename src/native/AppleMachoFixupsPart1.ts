export const __stub = 1;
// import type { Segment } from "./AppleMachoSelection.js";
// import { issue } from "./AppleDispatchDecodeFacts.js";
// import type { DecodeIssue } from "./AppleDispatchDecodeFacts.js";
//
// /** Where a Mach-O stores pointer fixups, from its load commands. */
// export interface FixupCommands {
//   /** Absolute file range of `LC_DYLD_CHAINED_FIXUPS` data. */
//   readonly chained: { readonly offset: number; readonly size: number } | null;
//   /** Absolute file ranges of `LC_DYLD_INFO(_ONLY)` rebase streams. */
//   readonly rebases: readonly {
//     readonly offset: number;
//     readonly size: number;
//   }[];
//   /** Absolute file ranges of `LC_DYLD_INFO(_ONLY)` bind streams. */
//   readonly binds: readonly {
//     readonly offset: number;
//     readonly size: number;
//     readonly stream: "bind" | "weak" | "lazy";
//   }[];
//   /** Install names of dependent dylibs, in library-ordinal order. */
//   readonly dylibs: readonly string[];
// }
//
// /** One decoded pointer: a rebase to an in-image address or a bind to a symbol. */
// export type DecodedPointer =
//   | { readonly kind: "rebase"; readonly target: bigint }
//   | {
//       readonly kind: "bind";
//       readonly symbol: string;
//       readonly library: string | null;
//       readonly weak: boolean;
//       readonly addend: bigint;
//     }
//   | { readonly kind: "unsupported"; readonly reason: string };
//
// /** Pointer decoding for one Mach-O slice. */
// export interface PointerFixups {
//   readonly kind: "chained" | "dyld-info" | "none";
//   /** Chained pointer formats in use, such as `DYLD_CHAINED_PTR_64_OFFSET`. */
//   readonly formats: readonly string[];
//   readonly failures: readonly string[];
//   readonly issues: readonly DecodeIssue[];
//   /** Fixup segments or bind streams this reader walked. */
//   readonly examined: number;
//   /** Fully decoded fixup segments or bind streams, in the same units as `examined`. */
//   readonly decoded: number;
//   /** Rebase opcode bytes present in the load command and not decoded. */
//   readonly unreadRebaseBytes: number;
//   /** Decode the pointer stored at `address` whose raw 64-bit value is `raw`. */
//   decode(address: bigint, raw: bigint): DecodedPointer;
// }
//
// const POINTER_FORMATS: Readonly<Record<number, string>> = {
//   1: "DYLD_CHAINED_PTR_ARM64E",
//   2: "DYLD_CHAINED_PTR_64",
//   6: "DYLD_CHAINED_PTR_64_OFFSET",
//   9: "DYLD_CHAINED_PTR_ARM64E_USERLAND",
//   12: "DYLD_CHAINED_PTR_ARM64E_USERLAND24",
// };
//
// const bits = (value: bigint, from: number, width: number): bigint =>
//   (value >> BigInt(from)) & ((1n << BigInt(width)) - 1n);
//
// const signed = (value: bigint, width: number): bigint =>
//   value >= 1n << BigInt(width - 1) ? value - (1n << BigInt(width)) : value;
//
// interface Import {
//   readonly symbol: string;
//   readonly library: string | null;
//   readonly weak: boolean;
//   readonly addend: bigint;
// }
//
// interface BindRun {
//   readonly start: bigint;
//   count: bigint;
//   readonly stride: bigint;
//   readonly binding: Import;
// }
//
// /** Library ordinal to install name; 0 and negative ordinals are special lookups. */
// const libraryName = (
//   ordinal: number,
//   dylibs: readonly string[],
// ): string | null => {
//   if (ordinal > 0) return dylibs[ordinal - 1] ?? null;
//   return null;
// };
//
// const cString = (bytes: Buffer, offset: number, end: number): string => {
//   const stop = bytes.indexOf(0, offset);
//   if (offset < 0 || offset >= end || stop < 0 || stop >= end)
//     throw new RangeError("Fixup symbol name is outside the symbol pool");
//   return bytes.toString("utf8", offset, stop);
// };
//
// const readImport = (
//   data: {
//     readonly bytes: Buffer;
//     readonly base: number;
//     readonly end: number;
//     readonly dylibs: readonly string[];
//   },
//   header: {
//     readonly offset: number;
//     readonly count: number;
//     readonly format: number;
//     readonly symbols: number;
//   },
//   index: number,
// ): Import => {
//   const { bytes, base, end, dylibs } = data;
//   const size = header.format === 3 ? 16 : header.format === 2 ? 8 : 4;
//   if (header.format < 1 || header.format > 3)
//     throw new RangeError(`Unsupported chained import format ${header.format}`);
//   if (
//     !Number.isSafeInteger(header.count) ||
//     base + header.offset + header.count * size > end
//   )
//     throw new RangeError("Chained import table exceeds the fixup data");
//   if (index < 0 || index >= header.count)
//     throw new RangeError("Chained import index is outside the table");
//   const at = base + header.offset + index * size;
//   if (header.format === 3) {
//     const word = bytes.readBigUInt64LE(at);
//     const encodedOrdinal = Number(bits(word, 0, 16));
//     const ordinal =
//       encodedOrdinal > 0xfff0 ? encodedOrdinal - 0x10000 : encodedOrdinal;
//     return {
//       symbol: cString(
//         bytes,
//         base + header.symbols + Number(bits(word, 32, 32)),
//         end,
//       ),
//       library: libraryName(ordinal, dylibs),
//       weak: bits(word, 16, 1) === 1n,
//       addend: bytes.readBigInt64LE(at + 8),
//     };
//   }
//   const word = bytes.readUInt32LE(at);
//   const encodedOrdinal = word & 0xff;
//   const ordinal =
//     encodedOrdinal > 0xf0 ? encodedOrdinal - 0x100 : encodedOrdinal;
//   return {
//     symbol: cString(bytes, base + header.symbols + (word >>> 9), end),
//     library: libraryName(ordinal, dylibs),
//     weak: ((word >>> 8) & 1) === 1,
//     addend: header.format === 2 ? BigInt(bytes.readInt32LE(at + 4)) : 0n,
//   };
// };
//
// /** Decode one raw chained pointer for its segment's pointer format. */
// export const decodeChainedPointer = (
//   raw: bigint,
//   format: number,
//   baseAddress: bigint,
//   imports: readonly Import[] | ((index: number) => Import),
// ): DecodedPointer => {
//   const bind = (ordinal: bigint, addend: bigint): DecodedPointer => {
//     const target =
//       typeof imports === "function"
//         ? imports(Number(ordinal))
//         : imports[Number(ordinal)];
//     if (target === undefined)
//       throw new RangeError(`Chained bind ordinal ${ordinal} has no import`);
//     return { kind: "bind", ...target, addend: target.addend + addend };
//   };
//   if (format === 2 || format === 6) {
//     if (bits(raw, 63, 1) === 1n)
//       return bind(bits(raw, 0, 24), bits(raw, 24, 8));
//     const target = bits(raw, 0, 36) | (bits(raw, 36, 8) << 56n);
//     return {
//       kind: "rebase",
//       target: format === 6 ? target + baseAddress : target,
//     };
//   }
//   if (format === 1 || format === 9 || format === 12) {
//     const auth = bits(raw, 63, 1) === 1n;
//     if (bits(raw, 62, 1) === 1n)
//       return bind(
//         bits(raw, 0, format === 12 ? 24 : 16),
//         auth ? 0n : signed(bits(raw, 32, 19), 19),
//       );
//     if (auth) return { kind: "rebase", target: bits(raw, 0, 32) + baseAddress };
//     const target = bits(raw, 0, 43) | (bits(raw, 43, 8) << 56n);
//     return {
//       kind: "rebase",
//       target: format === 1 ? target : target + baseAddress,
//     };
//   }
//   throw new RangeError(`Unsupported chained pointer format ${format}`);
// };
//
// /** The slice bytes and load-command facts that fixup decoding reads. */
export const _l = 194;
