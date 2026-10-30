export const __stub = 1;
// import { describe, expect, it, vi } from "vitest";
//
// import {
//   decodeChainedPointer,
//   parsePointerFixups,
// } from "./AppleMachoFixups.js";
// import { parsePropertyAttributes } from "./AppleObjcProperties.js";
// import type { Segment } from "./AppleMachoSelection.js";
//
// const BASE = 0x100000000n;
// const IMPORTS = [
//   {
//     symbol: "_OBJC_CLASS_$_NSObject",
//     library: "/usr/lib/libobjc.A.dylib",
//     weak: false,
//     addend: 0n,
//   },
//   {
//     symbol: "_free",
//     library: "/usr/lib/libSystem.B.dylib",
//     weak: true,
//     addend: 4n,
//   },
// ];
//
// const field = (value: bigint, from: number): bigint => value << BigInt(from);
//
// describe("chained pointer decoding", () => {
//   it("decodes DYLD_CHAINED_PTR_64 and _64_OFFSET rebases and binds", () => {
//     const rebase = 0x4000n | field(0x80n, 36) | field(3n, 51);
//     expect(decodeChainedPointer(BASE + 0x4000n, 2, BASE, IMPORTS)).toEqual({
//       kind: "rebase",
//       target: BASE + 0x4000n,
//     });
//     expect(decodeChainedPointer(rebase, 6, BASE, IMPORTS)).toEqual({
//       kind: "rebase",
//       target: (0x80n << 56n) + BASE + 0x4000n,
//     });
//     const bind = 1n | field(2n, 24) | field(1n, 63);
//     expect(decodeChainedPointer(bind, 6, BASE, IMPORTS)).toEqual({
//       kind: "bind",
//       symbol: "_free",
//       library: "/usr/lib/libSystem.B.dylib",
//       weak: true,
//       addend: 6n,
//     });
//   });
//
//   it("decodes arm64e plain, authenticated and 24-bit binds", () => {
//     expect(decodeChainedPointer(0x8000n, 9, BASE, IMPORTS)).toEqual({
//       kind: "rebase",
//       target: BASE + 0x8000n,
//     });
//     expect(decodeChainedPointer(BASE + 0x8000n, 1, BASE, IMPORTS)).toEqual({
//       kind: "rebase",
//       target: BASE + 0x8000n,
//     });
//     const authRebase = 0x8000n | field(0x1234n, 32) | field(1n, 63);
//     expect(decodeChainedPointer(authRebase, 1, BASE, IMPORTS)).toEqual({
//       kind: "rebase",
//       target: BASE + 0x8000n,
//     });
//     const authBind = 0n | field(1n, 62) | field(1n, 63);
//     expect(decodeChainedPointer(authBind, 9, BASE, IMPORTS)).toMatchObject({
//       kind: "bind",
//       symbol: "_OBJC_CLASS_$_NSObject",
//       addend: 0n,
//     });
//     const bind24 = 1n | field(0x7ffffn, 32) | field(1n, 62);
//     expect(decodeChainedPointer(bind24, 12, BASE, IMPORTS)).toMatchObject({
//       kind: "bind",
//       symbol: "_free",
//       addend: 3n,
//     });
//     expect(() =>
//       decodeChainedPointer(field(1n, 62) | 9n, 9, BASE, IMPORTS),
//     ).toThrow("Chained bind ordinal 9 has no import");
//     expect(() => decodeChainedPointer(1n, 3, BASE, IMPORTS)).toThrow(
//       "Unsupported chained pointer format 3",
//     );
//   });
// });
//
// /** Build `LC_DYLD_CHAINED_FIXUPS` data with one fixup segment and the given imports. */
// const chainedData = (format: 1 | 2 | 3): Buffer => {
//   const symbols = Buffer.from("\0_OBJC_CLASS_$_NSObject\0_free\0");
//   const importSize = format === 3 ? 16 : format === 2 ? 8 : 4;
//   const imports = Buffer.alloc(importSize * 2);
//   const entry = (
//     index: number,
//     {
//       ordinal,
//       weak,
//       nameOffset,
//       addend,
//     }: {
//       ordinal: number;
//       weak: boolean;
//       nameOffset: number;
//       addend: number;
//     },
//   ) => {
//     const at = index * importSize;
//     if (format === 3) {
//       imports.writeBigUInt64LE(
//         BigInt(ordinal & 0xffff) |
//           (BigInt(weak ? 1 : 0) << 16n) |
//           (BigInt(nameOffset) << 32n),
//         at,
//       );
//       imports.writeBigInt64LE(BigInt(addend), at + 8);
//     } else {
//       imports.writeUInt32LE(
//         ((nameOffset << 9) | ((weak ? 1 : 0) << 8) | (ordinal & 0xff)) >>> 0,
//         at,
//       );
//       if (format === 2) imports.writeInt32LE(addend, at + 4);
//     }
//   };
//   entry(0, { ordinal: 1, weak: false, nameOffset: 1, addend: 0 });
//   entry(1, { ordinal: 2, weak: true, nameOffset: 24, addend: 7 });
//   // starts_in_image: two segments, only the second has fixups.
//   const starts = Buffer.alloc(12 + 24);
//   starts.writeUInt32LE(2, 0);
//   starts.writeUInt32LE(0, 4);
//   starts.writeUInt32LE(12, 8);
//   starts.writeUInt32LE(24, 12);
//   starts.writeUInt16LE(0x4000, 16);
//   starts.writeUInt16LE(6, 18);
//   starts.writeBigUInt64LE(0x4000n, 20);
//   starts.writeUInt16LE(1, 32);
//   starts.writeUInt16LE(8, 34);
//   const header = Buffer.alloc(28);
//   header.writeUInt32LE(0, 0);
//   header.writeUInt32LE(28, 4);
//   header.writeUInt32LE(28 + starts.length, 8);
//   header.writeUInt32LE(28 + starts.length + imports.length, 12);
//   header.writeUInt32LE(2, 16);
//   header.writeUInt32LE(format, 20);
//   header.writeUInt32LE(0, 24);
//   const data = Buffer.alloc(0x8000);
//   Buffer.concat([header, starts, imports, symbols]).copy(data);
//   data.writeBigUInt64LE(1n | field(1n, 63), 0x4008);
//   return data;
// };
//
// const SEGMENTS: Segment[] = [
//   { address: BASE, size: 0x4000n, offset: 0, executable: true },
//   { address: BASE + 0x4000n, size: 0x4000n, offset: 0x4000, executable: false },
// ];
//
// describe("independent chained segment coverage", () => {
//   it("counts successfully decoded chained segments alongside an unsupported segment", () => {
//     const starts = 28;
//     const startsSize = 4 + 2 * 4;
//     const firstInfo = starts + startsSize;
//     const secondInfo = firstInfo + 24;
//     const imports = secondInfo + 24;
//     const data = Buffer.alloc(0x3000);
//     data.writeUInt32LE(starts, 4);
//     data.writeUInt32LE(imports, 8);
//     data.writeUInt32LE(imports, 12);
//     data.writeUInt32LE(1, 20);
//     data.writeUInt32LE(2, starts);
//     data.writeUInt32LE(firstInfo - starts, starts + 4);
//     data.writeUInt32LE(secondInfo - starts, starts + 8);
//     for (const [info, format, segmentOffset] of [
//       [firstInfo, 6, 0],
//       [secondInfo, 99, 0x1000],
//     ] as const) {
//       data.writeUInt32LE(24, info);
//       data.writeUInt16LE(0x1000, info + 4);
//       data.writeUInt16LE(format, info + 6);
//       data.writeBigUInt64LE(BigInt(segmentOffset), info + 8);
//       data.writeUInt16LE(1, info + 20);
//       data.writeUInt16LE(8, info + 22);
//     }
//     const segments: Segment[] = [
//       { address: BASE, size: 0x1000n, offset: 0x1000, executable: false },
//       {
//         address: BASE + 0x1000n,
//         size: 0x1000n,
//         offset: 0x2000,
//         executable: false,
//       },
//     ];
//     const fixups = parsePointerFixups(
//       data,
//       {
//         chained: { offset: 0, size: imports },
//         binds: [],
//         rebases: [],
//         dylibs: [],
//       },
//       segments,
//       BASE,
//     );
//
//     expect(fixups).toMatchObject({ examined: 2, decoded: 1 });
//     expect(fixups.issues).toMatchObject([
//       { code: "unsupported_pointer_format" },
//     ]);
//     expect(fixups.decode(BASE + 8n, 0n)).toEqual({
//       kind: "rebase",
//       target: BASE,
//     });
//   });
// });
//
// describe("pointer fixup tables", () => {
//   it("reports unsupported pointer formats even when no pointer is visited", () => {
//     const data = chainedData(1);
//     data.writeUInt16LE(99, 46);
//     const fixups = parsePointerFixups(
//       data,
//       {
//         chained: { offset: 0, size: data.length },
//         binds: [],
//         rebases: [],
//         dylibs: [],
//       },
//       SEGMENTS,
//       BASE,
//     );
//     expect(fixups.failures).toContain("Unsupported chained pointer format 99");
//   });
//
//   it("keeps unread LC_DYLD_INFO rebase bytes when chained fixups are present", () => {
//     const data = chainedData(1);
//     const fixups = parsePointerFixups(
//       data,
//       {
//         chained: { offset: 0, size: data.length },
//         binds: [],
//         rebases: [{ offset: 8, size: 12 }],
//         dylibs: [],
//       },
//       SEGMENTS,
//       BASE,
//     );
//     expect(fixups).toMatchObject({
//       kind: "chained",
//       unreadRebaseBytes: 12,
//     });
//   });
//
//   it("does not decode unreferenced imports while constructing fixup facts", () => {
//     const data = chainedData(1);
//     // The second import's name leaves the pool. Preserve the first import
//     // and defer that distinct failure until its pointer is examined.
//     data.writeUInt32LE(0xffff_ff00, data.readUInt32LE(8) + 4);
//     const fixups = parsePointerFixups(
//       data,
//       {
//         chained: { offset: 0, size: 128 },
//         binds: [],
//         rebases: [{ offset: 8, size: 12 }],
//         dylibs: [],
//       },
//       SEGMENTS,
//       BASE,
//     );
//     expect(fixups).toMatchObject({
//       examined: 1,
//       decoded: 1,
//       unreadRebaseBytes: 12,
//     });
//     expect(fixups.decode(BASE + 0x4008n, field(1n, 63))).toMatchObject({
//       kind: "bind",
//       symbol: "_OBJC_CLASS_$_NSObject",
//     });
//     expect(fixups.issues).toEqual([]);
//     expect(fixups.decoded).toBe(1);
//     expect(fixups.decode(BASE + 0x4008n, 1n | field(1n, 63))).toMatchObject({
//       kind: "unsupported",
//     });
//     expect(fixups.decoded).toBe(0);
//     expect(fixups.issues).toMatchObject([
//       { code: "chained_pointer_decode_failed" },
//     ]);
//   });
//
//   for (const format of [1, 2, 3] as const)
//     it(`reads chained import format ${format}`, () => {
//       const data = chainedData(format);
//       const fixups = parsePointerFixups(
//         data,
//         {
export const _l = 288;
