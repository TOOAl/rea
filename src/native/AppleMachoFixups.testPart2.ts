export const __stub = 1;
//           chained: { offset: 0, size: data.length },
//           binds: [],
//           rebases: [],
//           dylibs: ["/usr/lib/libobjc.A.dylib", "/usr/lib/libSystem.B.dylib"],
//         },
//         SEGMENTS,
//         BASE,
//       );
//       expect(fixups).toMatchObject({
//         kind: "chained",
//         formats: ["DYLD_CHAINED_PTR_64_OFFSET"],
//       });
//       expect(fixups.decode(BASE + 0x4008n, 1n | field(1n, 63))).toMatchObject({
//         kind: "bind",
//         symbol: "_free",
//         library: "/usr/lib/libSystem.B.dylib",
//         weak: true,
//         addend: format === 1 ? 0n : 7n,
//       });
//       // Pointers outside fixup segments are stored plainly.
//       expect(fixups.decode(BASE + 0x10n, 0x1234n)).toEqual({
//         kind: "rebase",
//         target: 0x1234n,
//       });
//     });
// });
// describe("parsed chained pointer membership", () => {
//   it("parses a dense chain once and reuses its membership for every lookup", () => {
//     const data = chainedData(1);
//     const count = 512;
//     const raw = Array.from(
//       { length: count },
//       (_, index) => BigInt(index + 1) | field(index + 1 < count ? 2n : 0n, 51),
//     );
//     for (const [index, pointer] of raw.entries())
//       data.writeBigUInt64LE(pointer, 0x4008 + index * 8);
//     const read = vi.spyOn(data, "readBigUInt64LE");
//     try {
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
//       const readsAfterParse = read.mock.calls.length;
//       for (const [index, pointer] of raw.entries())
//         expect(
//           fixups.decode(BASE + 0x4008n + BigInt(index * 8), pointer),
//         ).toEqual({
//           kind: "rebase",
//           target: BASE + BigInt(index + 1),
//         });
//       expect(read.mock.calls.length).toBe(readsAfterParse);
//       expect(fixups.issues).toEqual([]);
//     } finally {
//       read.mockRestore();
//     }
//   });
//
//   it("preserves byte-exact unaligned producer locations", () => {
//     const data = chainedData(1);
//     data.writeUInt16LE(9, 62);
//     data.writeBigUInt64LE(0x1234n | field(2n, 51), 0x4009);
//     data.writeBigUInt64LE(0x4321n, 0x4011);
//     const fixups = parsePointerFixups(
//       data,
//       { chained: { offset: 0, size: 128 }, binds: [], rebases: [], dylibs: [] },
//       SEGMENTS,
//       BASE,
//     );
//     expect(fixups.decode(BASE + 0x4009n, data.readBigUInt64LE(0x4009))).toEqual(
//       {
//         kind: "rebase",
//         target: BASE + 0x1234n,
//       },
//     );
//     expect(fixups.decode(BASE + 0x4011n, data.readBigUInt64LE(0x4011))).toEqual(
//       {
//         kind: "rebase",
//         target: BASE + 0x4321n,
//       },
//     );
//     const plain = data.readBigUInt64LE(0x400b);
//     expect(fixups.decode(BASE + 0x400bn, plain)).toEqual({
//       kind: "rebase",
//       target: plain,
//     });
//   });
//
//   it.each(["shared", "exhausted"])(
//     "preserves physical page facts with %s retention",
//     (mode) => {
//       const data = Buffer.alloc(0x8000);
//       const count = 5;
//       const starts = 28;
//       const table = starts + 4 + count * 4;
//       const imports = table + count * 24;
//       data.writeUInt32LE(starts, 4);
//       data.writeUInt32LE(imports, 8);
//       data.writeUInt32LE(imports, 12);
//       data.writeUInt32LE(1, 20);
//       data.writeUInt32LE(count, starts);
//       const segments: Segment[] = [];
//       for (let index = 0; index < count; index++) {
//         const info = table + index * 24;
//         const address = BASE + BigInt((index + 1) * 0x4000);
//         data.writeUInt32LE(info - starts, starts + 4 + index * 4);
//         data.writeUInt32LE(24, info);
//         data.writeUInt16LE(0x4000, info + 4);
//         data.writeUInt16LE(6, info + 6);
//         data.writeBigUInt64LE(address - BASE, info + 8);
//         data.writeUInt16LE(1, info + 20);
//         data.writeUInt16LE(8, info + 22);
//         segments.push({
//           address,
//           size: BigInt(0x4000 - (mode === "exhausted" ? index * 8 : 0)),
//           offset: 0x4000 + (mode === "exhausted" ? index * 8 : 0),
//           executable: false,
//         });
//         data.writeBigUInt64LE(
//           0x1234n,
//           0x4008 + (mode === "exhausted" ? index * 8 : 0),
//         );
//       }
//       const reads = vi.spyOn(data, "readBigUInt64LE");
//       const fixups = parsePointerFixups(
//         data,
//         {
//           chained: { offset: 0, size: imports },
//           binds: [],
//           rebases: [],
//           dylibs: [],
//         },
//         segments,
//         BASE,
//       );
//       for (const segment of segments)
//         expect(fixups.decode(segment.address + 8n, 0x1234n)).toEqual({
//           kind: "rebase",
//           target: BASE + 0x1234n,
//         });
//       expect(fixups.issues).toEqual([]);
//       expect(reads.mock.calls.filter(([at]) => at === 0x4008)).toHaveLength(1);
//       if (mode === "exhausted") {
//         // Five different physical views exceed ceil(32KiB / 8) bitmap bytes.
//         // The final view remains readable, with recomputation instead of rejection.
//         expect(reads.mock.calls.filter(([at]) => at === 0x4028)).toHaveLength(
//           2,
//         );
//       }
//       reads.mockRestore();
//     },
//   );
// });
//
// /** Small malformed carriers exercise expansion without allocating exploit-sized data. */
// const aliasedStarts = (format: number, count = 32, pages = 128) => {
//   const data = Buffer.alloc(0x8000);
//   const starts = 28;
//   const info = starts + 4 + count * 4;
//   const end = info + 22 + pages * 2;
//   data.writeUInt32LE(starts, 4);
//   data.writeUInt32LE(end, 8);
//   data.writeUInt32LE(end, 12);
//   data.writeUInt32LE(1, 20);
//   data.writeUInt32LE(count, starts);
//   data.writeUInt32LE(22 + pages * 2, info);
//   data.writeUInt16LE(0x1000, info + 4);
//   data.writeUInt16LE(format, info + 6);
//   data.writeBigUInt64LE(0x4000n, info + 8);
//   data.writeUInt16LE(pages, info + 20);
//   const segments = Array.from({ length: count }, (_, index) => {
//     data.writeUInt32LE(info - starts, starts + 4 + index * 4);
//     return {
//       address: BASE + 0x4000n,
//       size: 0x4000n,
//       offset: 0x4000,
//       executable: false,
//     };
//   });
//   return {
//     data,
//     segments,
//     pageStarts: info + 22,
//     commands: {
//       chained: { offset: 0, size: end },
//       binds: [],
//       rebases: [],
//       dylibs: [],
//     },
//   };
// };
//
// describe("bounded chained page facts", () => {
//   it("does not expand unsupported non-NONE aliased declarations", () => {
//     const { data, segments, pageStarts, commands } = aliasedStarts(99);
//     const reads = vi.spyOn(data, "readUInt16LE");
//     const fixups = parsePointerFixups(data, commands, segments, BASE);
//     // All 128 encoded starts are zero (not NONE); the former per-segment maps
//     // read 32 * 128 starts before any bitmap budget could apply.
//     expect(
//       reads.mock.calls.filter(([at]) => at !== undefined && at >= pageStarts),
//     ).toHaveLength(0);
//     expect(fixups.formats).toEqual(["format-99"]);
//     expect(fixups.issues).toHaveLength(32);
//     expect(fixups.decode(BASE + 0x4000n, 0n)).toEqual({
//       kind: "unsupported",
//       reason: "Unsupported chained pointer format 99",
//     });
//     reads.mockRestore();
//   });
//
//   it("bounds failed alias diagnostics and leaves later pages independently queryable", () => {
//     const { data, segments, pageStarts, commands } = aliasedStarts(6);
//     data.writeBigUInt64LE(field(0xfffn, 51), 0x4000);
//     data.writeBigUInt64LE(0x1234n, 0x5000);
//     const reads = vi.spyOn(data, "readUInt16LE");
//     const fixups = parsePointerFixups(data, commands, segments, BASE);
//     expect(
//       reads.mock.calls.filter(([at]) => at !== undefined && at >= pageStarts),
//     ).toHaveLength(1);
//     expect(fixups.issues).toEqual([
//       {
//         facet: "pointer_fixups",
//         code: "chained_pointer_walk_failed",
//         message: "Chained pointer link leaves its file-backed page",
//         location: "0x100004000",
//       },
//     ]);
//     expect(fixups.decode(BASE + 0x4000n, data.readBigUInt64LE(0x4000))).toEqual(
//       {
//         kind: "rebase",
//         target: BASE,
//       },
//     );
//     expect(fixups.decode(BASE + 0x5000n, 0x1234n)).toEqual({
//       kind: "rebase",
//       target: BASE + 0x1234n,
//     });
//     reads.mockRestore();
//   });
// });
//
// describe("chained metadata retention", () => {
//   it("bounds cache records even when malformed facts have no bitmap bytes", () => {
//     const count = 8;
//     const pages = 4;
//     const { data, commands } = aliasedStarts(6, count, pages);
//     const starts = 28;
//     const table = starts + 4 + count * 4;
//     const infoSize = 22 + pages * 2;
//     const end = table + count * infoSize;
//     data.writeUInt32LE(end, 8);
//     data.writeUInt32LE(end, 12);
//     const segments = Array.from({ length: count }, (_, index) => {
//       const info = table + index * infoSize;
//       data.copy(data, info, table, table + infoSize);
//       data.writeUInt32LE(info - starts, starts + 4 + index * 4);
//       const address = BASE + BigInt((index + 1) * 0x4000);
//       data.writeBigUInt64LE(address - BASE, info + 8);
//       for (let page = 0; page < pages; page++)
//         data.writeUInt16LE(0x8000 + index, info + 22 + page * 2);
//       return { address, offset: 0x4000, size: 0x4000n, executable: false };
//     });
//     const retained: unknown[] = [];
//     const set = Map.prototype.set;
//     const writes = vi.spyOn(Map.prototype, "set").mockImplementation(function (
//       this: Map<unknown, unknown>,
//       key,
//       value,
//     ) {
//       if (typeof value === "object" && value !== null && "locations" in value)
//         retained.push(value);
//       return set.call(this, key, value);
//     });
//     try {
//       const fixups = parsePointerFixups(
//         data,
//         { ...commands, chained: { offset: 0, size: end } },
//         segments,
//         BASE,
//       );
//       expect(fixups.issues).toHaveLength(count);
export const _l = 288;
