export const __stub = 1;
//       expect(fixups.issues.map(({ location }) => location)).toEqual(
//         segments.map(({ address }) => `0x${address.toString(16)}`),
//       );
//       for (const segment of segments)
//         for (let page = 0; page < pages; page++)
//           expect(
//             fixups.decode(segment.address + BigInt(page * 0x1000), 0n),
//           ).toMatchObject({ kind: "unsupported" });
//     } finally {
//       writes.mockRestore();
//     }
//     // All facts have zero bitmap bytes. Entry count must independently bound
//     // 8 * 4 distinct physical start/format/pageEnd keys to the derived 24 slots.
//     expect(retained).toHaveLength(Math.ceil(data.length / 0x1000) + 2 * count);
//   });
// });
//
// describe("chained pointer membership", () => {
//   it("retains a valid later page after an earlier chain fails", () => {
//     const data = chainedData(1);
//     data.copyWithin(66, 64, 128);
//     data.writeUInt32LE(66, 8);
//     data.writeUInt32LE(74, 12);
//     data.writeUInt32LE(26, 40);
//     data.writeUInt16LE(0x1000, 44);
//     data.writeUInt16LE(2, 60);
//     data.writeUInt16LE(8, 64);
//     data.writeBigUInt64LE(field(0xfffn, 51), 0x4008);
//     data.writeBigUInt64LE(0x1234n, 0x5008);
//     const fixups = parsePointerFixups(
//       data,
//       {
//         chained: { offset: 0, size: 160 },
//         binds: [],
//         rebases: [],
//         dylibs: [],
//       },
//       SEGMENTS,
//       BASE,
//     );
//     expect(fixups.issues).toMatchObject([
//       { code: "chained_pointer_walk_failed" },
//     ]);
//     expect(fixups.decode(BASE + 0x5008n, data.readBigUInt64LE(0x5008))).toEqual(
//       { kind: "rebase", target: BASE + 0x1234n },
//     );
//   });
//   it.each([2, 6, 1, 9, 12])(
//     "decodes only chain members for pointer format %i",
//     (pointerFormat) => {
//       const data = chainedData(1);
//       data.writeUInt16LE(pointerFormat, 46);
//       const generic = pointerFormat === 2 || pointerFormat === 6;
//       const bindBit = generic ? 63 : 62;
//       data.writeBigUInt64LE(field(4n, 51) | field(1n, bindBit), 0x4008);
//       const second = generic ? 0x4018 : 0x4028;
//       data.writeBigUInt64LE(1n | field(1n, bindBit), second);
//       const plain = BASE + 0x1234n;
//       data.writeBigUInt64LE(plain, 0x4010);
//       const fixups = parsePointerFixups(
//         data,
//         {
//           chained: { offset: 0, size: 128 },
//           binds: [],
//           rebases: [],
//           dylibs: [],
//         },
//         SEGMENTS,
//         BASE,
//       );
//       expect(fixups.issues).toEqual([]);
//       expect(
//         fixups.decode(BASE + 0x4008n, data.readBigUInt64LE(0x4008)),
//       ).toMatchObject({
//         kind: "bind",
//         symbol: "_OBJC_CLASS_$_NSObject",
//       });
//       expect(
//         fixups.decode(BASE + BigInt(second), data.readBigUInt64LE(second)),
//       ).toMatchObject({
//         kind: "bind",
//         symbol: "_free",
//       });
//       expect(fixups.decode(BASE + 0x4010n, plain)).toEqual({
//         kind: "rebase",
//         target: plain,
//       });
//       expect(fixups.decode(BASE + 0x4030n, 0n)).toEqual({
//         kind: "rebase",
//         target: 0n,
//       });
//     },
//   );
//
//   it("keeps NONE pages and pages absent from the table plain, and decodes a chained zero", () => {
//     const data = chainedData(1);
//     data.writeBigUInt64LE(0n, 0x4008);
//     const commands = {
//       chained: { offset: 0, size: 128 },
//       binds: [],
//       rebases: [],
//       dylibs: [],
//     } as const;
//     const fixups = parsePointerFixups(data, commands, SEGMENTS, BASE);
//     expect(fixups.decode(BASE + 0x4008n, 0n)).toEqual({
//       kind: "rebase",
//       target: BASE,
//     });
//     data.writeUInt16LE(0xffff, 62);
//     data.writeUInt16LE(99, 46);
//     data.writeUInt16LE(0x1000, 44);
//     const unknown = parsePointerFixups(data, commands, SEGMENTS, BASE);
//     expect(unknown.decode(BASE + 0x4008n, BASE + 8n)).toEqual({
//       kind: "rebase",
//       target: BASE + 8n,
//     });
//     expect(unknown.decode(BASE + 0x5008n, BASE + 16n)).toEqual({
//       kind: "rebase",
//       target: BASE + 16n,
//     });
//   });
// });
// describe("malformed chained pointer coverage", () => {
//   it("locates a failed later page without discarding established pointer facts", () => {
//     const data = chainedData(1);
//     data.copyWithin(66, 64, 128);
//     data.writeUInt32LE(66, 8);
//     data.writeUInt32LE(74, 12);
//     data.writeUInt32LE(26, 40);
//     data.writeUInt16LE(0x1000, 44);
//     data.writeUInt16LE(2, 60);
//     data.writeUInt16LE(8, 64);
//     data.writeBigUInt64LE(0x1234n, 0x4008);
//     data.writeBigUInt64LE(field(0xfffn, 51), 0x5008);
//     const fixups = parsePointerFixups(
//       data,
//       { chained: { offset: 0, size: 160 }, binds: [], rebases: [], dylibs: [] },
//       SEGMENTS,
//       BASE,
//     );
//     expect(fixups.issues).toEqual([
//       {
//         facet: "pointer_fixups",
//         code: "chained_pointer_walk_failed",
//         message: "Chained pointer link leaves its file-backed page",
//         location: "0x100005000",
//       },
//     ]);
//     expect(fixups.decode(BASE + 0x4008n, data.readBigUInt64LE(0x4008))).toEqual(
//       {
//         kind: "rebase",
//         target: BASE + 0x1234n,
//       },
//     );
//     expect(fixups.decode(BASE + 0x5008n, data.readBigUInt64LE(0x5008))).toEqual(
//       {
//         kind: "rebase",
//         target: BASE,
//       },
//     );
//   });
//
//   it.each(["link", "multi"])(
//     "reports malformed %s chains without claiming complete fixups",
//     (malformed) => {
//       const data = chainedData(1);
//       if (malformed === "link")
//         data.writeBigUInt64LE(field(0xfffn, 51), 0x4008);
//       else data.writeUInt16LE(0x8000, 62);
//       const fixups = parsePointerFixups(
//         data,
//         {
//           chained: { offset: 0, size: 128 },
//           binds: [],
//           rebases: [],
//           dylibs: [],
//         },
//         SEGMENTS,
//         BASE,
//       );
//       expect(fixups.issues).toMatchObject([
//         { code: "chained_pointer_walk_failed" },
//       ]);
//       if (malformed === "link")
//         expect(
//           fixups.decode(BASE + 0x4008n, data.readBigUInt64LE(0x4008)),
//         ).toEqual({ kind: "rebase", target: BASE });
//       expect(fixups.decode(BASE + 0x4010n, 0n)).toMatchObject({
//         kind: "unsupported",
//       });
//     },
//   );
//
//   it.each([
//     [0, 1, "header version"],
//     [4, 126, "starts table"],
//     [8, 63, "starts table"],
//     [40, 22, "page starts"],
//     [48, 0x1000, "segment offset"],
//   ] as const)(
//     "rejects malformed chained structure at byte %i",
//     (at, value, message) => {
//       const data = chainedData(1);
//       data.writeUInt32LE(value, at);
//       expect(() =>
//         parsePointerFixups(
//           data,
//           {
//             chained: { offset: 0, size: 128 },
//             binds: [],
//             rebases: [],
//             dylibs: [],
//           },
//           SEGMENTS,
//           BASE,
//         ),
//       ).toThrow(message);
//     },
//   );
// });
// describe("chained import library identity", () => {
//   it.each([1, 2, 3] as const)(
//     "retains positive and special library ordinals for import format %i",
//     (format) => {
//       const data = chainedData(format);
//       const importAt = data.readUInt32LE(8);
//       const width = format === 3 ? 16 : 8;
//       const maximum = format === 3 ? 0xfff0 : 0xf0;
//       const libraries = Array.from(
//         { length: maximum },
//         (_, index) => `/library-${index + 1}`,
//       );
//       for (const ordinal of [
//         1 << (width - 1),
//         maximum,
//         maximum + 1,
//         (1 << width) - 1,
//       ]) {
//         if (format === 3)
//           data.writeBigUInt64LE(
//             (data.readBigUInt64LE(importAt) & ~0xffffn) | BigInt(ordinal),
//             importAt,
//           );
//         else
//           data.writeUInt32LE(
//             (data.readUInt32LE(importAt) & ~0xff) | ordinal,
//             importAt,
//           );
//         data.writeBigUInt64LE(field(1n, 63), 0x4008);
//         const fixups = parsePointerFixups(
//           data,
//           {
//             chained: { offset: 0, size: 160 },
//             binds: [],
//             rebases: [],
//             dylibs: libraries,
//           },
//           SEGMENTS,
//           BASE,
//         );
//         expect(
//           fixups.decode(BASE + 0x4008n, data.readBigUInt64LE(0x4008)),
//         ).toMatchObject({
//           kind: "bind",
//           library: ordinal <= maximum ? libraries[ordinal - 1] : null,
//         });
//       }
//     },
//   );
// });
// describe("legacy pointer fixup streams", () => {
//   it("interprets legacy bind, weak-bind and lazy-bind opcodes", () => {
//     const opcodes = Buffer.from([
//       0x11, // SET_DYLIB_ORDINAL_IMM 1
//       0x40,
//       ...Buffer.from("_OBJC_CLASS_$_NSObject\0"),
//       0x51, // SET_TYPE_IMM pointer
//       0x71,
//       0x08, // SET_SEGMENT_AND_OFFSET segment 1 + 8
//       0x90, // DO_BIND
//       0xc0,
//       0x02,
//       0x08, // DO_BIND_ULEB_TIMES_SKIPPING_ULEB 2 times, skip 8
//       0x00,
//     ]);
//     const lazy = Buffer.from([
//       0x71,
//       0x30,
export const _l = 288;
