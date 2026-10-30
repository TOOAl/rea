export const __stub = 1;
//       0x12,
//       0x40,
//       ...Buffer.from("_free\0"),
//       0x90,
//       0x00,
//       0x71,
//       0x38,
//       0x12,
//       0x40,
//       ...Buffer.from("_malloc\0"),
//       0x90,
//       0x00,
//     ]);
//     const data = Buffer.concat([opcodes, lazy]);
//     const fixups = parsePointerFixups(
//       data,
//       {
//         chained: null,
//         binds: [
//           { offset: 0, size: opcodes.length, stream: "bind" },
//           { offset: opcodes.length, size: lazy.length, stream: "lazy" },
//         ],
//         rebases: [],
//         dylibs: ["/usr/lib/libobjc.A.dylib", "/usr/lib/libSystem.B.dylib"],
//       },
//       SEGMENTS,
//       BASE,
//     );
//     expect(fixups.kind).toBe("dyld-info");
//     expect(fixups.failures).toEqual([]);
//     for (const offset of [0x08n, 0x10n, 0x20n])
//       expect(fixups.decode(BASE + 0x4000n + offset, 0n)).toMatchObject({
//         kind: "bind",
//         symbol: "_OBJC_CLASS_$_NSObject",
//         library: "/usr/lib/libobjc.A.dylib",
//       });
//     expect(fixups.decode(BASE + 0x4038n, 0n)).toMatchObject({
//       symbol: "_malloc",
//       library: "/usr/lib/libSystem.B.dylib",
//     });
//     expect(fixups.decode(BASE + 0x4018n, 0x99n)).toEqual({
//       kind: "rebase",
//       target: 0x99n,
//     });
//   });
//
//   it("wraps a negative DO_BIND_ADD_ADDR_ULEB step and keeps decoding", () => {
//     // The unsigned 64-bit encoding of -8 revisits the current pointer slot.
//     const back = [0xf8, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0x01];
//     const opcodes = Buffer.from([
//       0x11, // SET_DYLIB_ORDINAL_IMM 1
//       0x40,
//       ...Buffer.from("__ZdlPv\0"),
//       0x71,
//       0x08, // SET_SEGMENT_AND_OFFSET segment 1 + 8
//       0xa0,
//       ...back, // DO_BIND_ADD_ADDR_ULEB -8
//       0x90, // DO_BIND the same slot again
//       0x12, // SET_DYLIB_ORDINAL_IMM 2
//       0x40,
//       ...Buffer.from("_OBJC_CLASS_$_NSObject\0"),
//       0x90, // DO_BIND the next slot
//       0x00,
//     ]);
//     const fixups = parsePointerFixups(
//       opcodes,
//       {
//         chained: null,
//         binds: [{ offset: 0, size: opcodes.length, stream: "bind" }],
//         rebases: [],
//         dylibs: ["/usr/lib/libc++.1.dylib", "/usr/lib/libobjc.A.dylib"],
//       },
//       SEGMENTS,
//       BASE,
//     );
//     expect(fixups.failures).toEqual([]);
//     expect(fixups.decode(BASE + 0x4010n, 0n)).toMatchObject({
//       kind: "bind",
//       symbol: "_OBJC_CLASS_$_NSObject",
//       library: "/usr/lib/libobjc.A.dylib",
//     });
//     expect(fixups.decode(BASE + 0x4018n, 0x99n)).toEqual({
//       kind: "rebase",
//       target: 0x99n,
//     });
//   });
// });
//
// describe("legacy bind operand decoding", () => {
//   const addendStream = (addend: readonly number[]) =>
//     Buffer.from([
//       0x11, // SET_DYLIB_ORDINAL_IMM 1
//       0x40,
//       ...Buffer.from("_x\0"),
//       0x71,
//       0x08, // SET_SEGMENT_AND_OFFSET segment 1 + 8
//       0x60,
//       ...addend, // SET_ADDEND_SLEB
//       0x00,
//     ]);
//   const parseBinds = (opcodes: Buffer) =>
//     parsePointerFixups(
//       opcodes,
//       {
//         chained: null,
//         binds: [{ offset: 0, size: opcodes.length, stream: "bind" }],
//         rebases: [],
//         dylibs: ["/usr/lib/libSystem.B.dylib"],
//       },
//       SEGMENTS,
//       BASE,
//     );
//
//   it.each([
//     { addend: 0n, sleb: [0x00] },
//     { addend: -1n, sleb: [0x7f] },
//     { addend: -8n, sleb: [0x78] },
//     { addend: 128n, sleb: [0x80, 0x01] },
//     { addend: -129n, sleb: [0xff, 0x7e] },
//     // Ten-byte operands at the signed 64-bit limits are still valid.
//     { addend: -(2n ** 63n), sleb: [...Array<number>(9).fill(0x80), 0x7f] },
//     { addend: 2n ** 63n - 1n, sleb: [...Array<number>(9).fill(0xff), 0x00] },
//     // Redundant sign extension still belongs to the operand, not the opcode stream.
//     { addend: 0n, sleb: [...Array<number>(11).fill(0x80), 0x00] },
//     { addend: -1n, sleb: [...Array<number>(11).fill(0xff), 0x7f] },
//   ])(
//     "applies a SET_ADDEND_SLEB addend of $addend to the following bind",
//     ({ addend, sleb }) => {
//       const opcodes = addendStream(sleb);
//       opcodes[opcodes.length - 1] = 0x90; // DO_BIND
//       const fixups = parseBinds(Buffer.concat([opcodes, Buffer.from([0x00])]));
//       expect(fixups.failures).toEqual([]);
//       expect(fixups.decode(BASE + 0x4008n, 0n)).toMatchObject({
//         kind: "bind",
//         symbol: "_x",
//         addend,
//       });
//     },
//   );
//
//   it.each([
//     // Ten continuation bytes, then 0x90. dyld keeps reading 0x90 as part of
//     // the operand (bit 7 is set) and binds nothing; it must not become DO_BIND.
//     {
//       name: "opcode-like tail",
//       operand: [...Array<number>(10).fill(0x80), 0x90, 0x00],
//     },
//     {
//       name: "positive signed overflow",
//       operand: [...Array<number>(9).fill(0x80), 0x01],
//     },
//     {
//       name: "negative signed overflow",
//       operand: [...Array<number>(9).fill(0xff), 0x7e],
//     },
//     {
//       name: "nonzero zero-extension",
//       operand: [...Array<number>(10).fill(0x80), 0x01],
//     },
//     {
//       name: "nonnegative sign-extension",
//       operand: [...Array<number>(10).fill(0xff), 0x00],
//     },
//   ])("rejects an oversized SET_ADDEND_SLEB with $name", ({ operand }) => {
//     const opcodes = addendStream(operand);
//     const fixups = parseBinds(opcodes);
//     expect(fixups).toMatchObject({ examined: 1, decoded: 0 });
//     expect(fixups.failures.join("\n")).toContain(
//       "Oversized bind opcode operand",
//     );
//     expect(fixups.decode(BASE + 0x4008n, 0x99n)).not.toMatchObject({
//       kind: "bind",
//     });
//   });
//
//   it("does not read beyond the declared stream to terminate an addend", () => {
//     const opcodes = addendStream([0x80]);
//     const fixups = parsePointerFixups(
//       opcodes,
//       {
//         chained: null,
//         binds: [{ offset: 0, size: opcodes.length - 1, stream: "bind" }],
//         rebases: [],
//         dylibs: [],
//       },
//       SEGMENTS,
//       BASE,
//     );
//     expect(fixups).toMatchObject({ examined: 1, decoded: 0 });
//     expect(fixups.failures).toEqual([
//       "bind bind opcodes: Truncated bind opcode operand",
//     ]);
//   });
//
//   const addressStream = (operand: readonly number[]) =>
//     Buffer.from([
//       0x40,
//       ...Buffer.from("_x\0"),
//       0x71,
//       0x08, // SET_SEGMENT_AND_OFFSET segment 1 + 8
//       0x80,
//       ...operand, // ADD_ADDR_ULEB
//       0x90,
//       0x00, // DO_BIND, DONE
//     ]);
//
//   it.each([
//     { operand: [...Array<number>(9).fill(0xff), 0x01], offset: 0x4007n },
//     { operand: [...Array<number>(11).fill(0x80), 0x00], offset: 0x4008n },
//   ])(
//     "preserves unsigned 64-bit address deltas and zero padding: $offset",
//     ({ operand, offset }) => {
//       const fixups = parseBinds(addressStream(operand));
//       expect(fixups.failures).toEqual([]);
//       expect(fixups.decode(BASE + offset, 0n)).toMatchObject({
//         kind: "bind",
//         symbol: "_x",
//       });
//     },
//   );
//
//   it.each([
//     {
//       name: "tenth-byte overflow",
//       operand: [...Array<number>(9).fill(0x80), 0x02],
//     },
//     {
//       name: "nonzero zero-extension",
//       operand: [...Array<number>(10).fill(0x80), 0x01],
//     },
//   ])("rejects unsigned address deltas with $name", ({ operand }) => {
//     const fixups = parseBinds(addressStream(operand));
//     expect(fixups).toMatchObject({ examined: 1, decoded: 0 });
//     expect(fixups.failures).toEqual([
//       "bind bind opcodes: Oversized bind opcode operand",
//     ]);
//     expect(fixups.decode(BASE + 0x4008n, 0n).kind).not.toBe("bind");
//   });
// });
//
// describe("Objective-C property attributes", () => {
//   it("parses type, ownership, accessors and quoted class names", () => {
//     expect(
//       parsePropertyAttributes(
//         "title",
//         'T@"NSString<NSCopying, NSSecureCoding>",C,N,GcustomTitle,V_title',
//       ),
//     ).toEqual({
//       name: "title",
//       type_encoding: '@"NSString<NSCopying, NSSecureCoding>"',
//       atomicity: "nonatomic",
//       attributes: [
//         { name: "T", value: '@"NSString<NSCopying, NSSecureCoding>"' },
//         { name: "C", value: "" },
//         { name: "N", value: "" },
//         { name: "G", value: "customTitle" },
//         { name: "V", value: "_title" },
//       ],
//       is_readonly: false,
//       getter: "customTitle",
//       setter: null,
//     });
//     expect(parsePropertyAttributes("count", "Tq,R")).toMatchObject({
//       type_encoding: "q",
//       is_readonly: true,
//       atomicity: "atomic",
//     });
//     expect(parsePropertyAttributes("count", "Tq,R,N").atomicity).toBe(
//       "nonatomic",
//     );
//     expect(parsePropertyAttributes("count", "").atomicity).toBeNull();
//     expect(parsePropertyAttributes("count", "R").atomicity).toBeNull();
//   });
//
//   it("establishes no defaults from an unfinished quoted class name", () => {
//     // `,N,R` here lie inside the unterminated quote, so they are not flags.
//     expect(parsePropertyAttributes("title", 'T@"NSString,N,R')).toMatchObject({
//       type_encoding: '@"NSString,N,R',
//       atomicity: null,
//       is_readonly: null,
//     });
//     expect(parsePropertyAttributes("title", 'N,R,T@"NSString')).toMatchObject({
//       atomicity: "nonatomic",
//       is_readonly: true,
//     });
//   });
// });
export const _l = 287;
