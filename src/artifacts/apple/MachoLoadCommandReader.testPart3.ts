export const __stub = 1;
//         encoding: "dylib_use_command",
//         weak: true,
//         upward: true,
//         reexport: false,
//         delayed: false,
//       },
//       {
//         encoding: "dylib_use_command",
//         weak: false,
//         upward: false,
//         reexport: true,
//         delayed: false,
//       },
//     ]);
//   });
// });
//
// describe("Mach-O load command reader: reads and validates universal binary slices", () => {
//   it("reads every slice of FAT and FAT_64 containers in either byte order", async () => {
//     for (const [wide, littleEndian] of [
//       [false, false],
//       [true, false],
//       [false, true],
//       [true, true],
//     ] as const) {
//       const facts = await read(
//         fatImage(
//           [
//             {
//               cpu: CPU.arm64e,
//               bytes: machoImage({
//                 cpu: CPU.arm64e,
//                 commands: [rpathCommand("@executable_path/a")],
//               }),
//             },
//             {
//               cpu: CPU.x86_64,
//               bytes: machoImage({
//                 cpu: CPU.x86_64,
//                 commands: [rpathCommand("@executable_path/b")],
//               }),
//             },
//           ],
//           wide,
//           littleEndian,
//         ),
//       );
//       if (facts.status !== "parsed") throw new Error(facts.status);
//       expect(
//         facts.slices.map(({ architecture, rpaths }) => [architecture, rpaths]),
//       ).toEqual([
//         ["arm64e", ["@executable_path/a"]],
//         ["x86_64", ["@executable_path/b"]],
//       ]);
//     }
//   });
//
//   it("retains physical slice identity and declared build platform", async () => {
//     const thin = machoImage({ commands: [buildVersionCommand(7)] });
//     const parsedThin = await read(thin);
//     expect(
//       parsedThin.status === "parsed" && parsedThin.slices[0],
//     ).toMatchObject({
//       slice_offset: 0,
//       slice_size: thin.length,
//       cpu_type: CPU.arm64.type,
//       cpu_subtype: CPU.arm64.subtype,
//       fat_cpu_type: null,
//       fat_cpu_subtype: null,
//       platform: 7,
//     });
//     const fat = fatImage([{ cpu: CPU.arm64, bytes: thin }]);
//     const parsedFat = await read(fat);
//     expect(parsedFat.status === "parsed" && parsedFat.slices[0]).toMatchObject({
//       slice_offset: 4096,
//       slice_size: thin.length,
//       fat_cpu_type: CPU.arm64.type,
//       fat_cpu_subtype: CPU.arm64.subtype,
//     });
//   });
//
//   it("rejects FAT table/header identity mismatches and unaligned ranges", async () => {
//     const original = fatImage([{ cpu: CPU.arm64, bytes: machoImage({}) }]);
//     for (const [fieldOffset, value] of [
//       [8, CPU.x86_64.type],
//       [12, 99],
//     ] as const) {
//       const mismatch = original.slice();
//       new DataView(mismatch.buffer).setUint32(fieldOffset, value, false);
//       expect(await read(mismatch)).toMatchObject({
//         status: "malformed",
//         reason: expect.stringContaining("disagrees"),
//       });
//     }
//     const unaligned = original.slice();
//     new DataView(unaligned.buffer).setUint32(16, 4097, false);
//     expect(await read(unaligned)).toMatchObject({
//       status: "malformed",
//       reason: expect.stringContaining("not aligned"),
//     });
//   });
//
//   it("preserves unknown CPU table facts when the embedded slice is Mach-O", async () => {
//     const cpu = { type: 0x7fffffff, subtype: 11 };
//     const facts = await read(fatImage([{ cpu, bytes: machoImage({ cpu }) }]));
//     expect(facts.status === "parsed" && facts.slices[0]).toMatchObject({
//       architecture: "cpu-7fffffff",
//       cpu_type: cpu.type,
//       cpu_subtype: cpu.subtype,
//       fat_cpu_type: cpu.type,
//       fat_cpu_subtype: cpu.subtype,
//     });
//   });
// });
//
// describe("Mach-O load command reader inputs", () => {
//   it("names 32-bit and non-Mach-O inputs without guessing", async () => {
//     const i386 = await read(
//       machoImage({ cpu: { type: 7, subtype: 3 }, wide: false }),
//     );
//     expect(i386.status === "parsed" && i386.slices[0]?.architecture).toBe(
//       "i386",
//     );
//     // A Java class file shares the FAT magic; version fields are not a slice count.
//     const javaClasses = [
//       javaClassFile(),
//       javaClassFile(4000),
//       javaClassFile(4000, true),
//     ];
//     for (const javaClass of javaClasses) {
//       expect(hasMachoMagic(javaClass)).toBe(true);
//       expect(await read(javaClass)).toEqual({ status: "not-mach-o" });
//     }
//     const malformedFat = Buffer.alloc(28);
//     malformedFat.writeUInt32BE(0xcafebabe, 0);
//     malformedFat.writeUInt32BE(1, 4);
//     malformedFat.writeUInt32BE(0x0100000c, 8);
//     malformedFat.writeUInt32BE(4096, 16);
//     malformedFat.writeUInt32BE(32, 20);
//     malformedFat.writeUInt32BE(12, 24);
//     expect(await read(malformedFat)).toMatchObject({
//       status: "malformed",
//       reason: expect.stringContaining("slice range extends beyond the file"),
//     });
//     expect(await read(new TextEncoder().encode("#!/bin/sh\n"))).toEqual({
//       status: "not-mach-o",
//     });
//     expect(await read(Uint8Array.from([0xcf, 0xfa]))).toEqual({
//       status: "not-mach-o",
//     });
//     // A recognized magic without room for a header is a truncated image.
//     expect(
//       await read(Uint8Array.from([0xcf, 0xfa, 0xed, 0xfe, 0x0c, 0x00])),
//     ).toEqual({ status: "malformed", reason: "Mach-O header is truncated" });
//   });
//
//   it("keeps oversized CAFEBABE identity unknown when class payload is sparse", async () => {
//     const classPrefix = Buffer.from(javaClassFile(4000, true));
//     const payloadBytes = MAX_LOAD_COMMAND_BYTES + 1;
//     const attributeHeader = Buffer.alloc(6);
//     attributeHeader.writeUInt16BE(5, 0);
//     attributeHeader.writeUInt32BE(payloadBytes, 2);
//     classPrefix.writeUInt16BE(1, classPrefix.length - 2);
//     const prefix = Buffer.concat([classPrefix, attributeHeader]);
//     const size = prefix.length + payloadBytes;
//     const sparseReadAt = async (offset: number, length: number) => {
//       const result = Buffer.alloc(Math.min(length, size - offset));
//       if (offset < prefix.length)
//         prefix.copy(
export const _l = 169;
