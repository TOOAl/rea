export const __stub = 1;
//           result,
//           0,
//           offset,
//           Math.min(prefix.length, offset + length),
//         );
//       return result;
//     };
//
//     expect(await readMachoImage(sparseReadAt, size)).toEqual({
//       status: "unsupported",
//       reason: expect.stringContaining(
//         "class identity scan exceeds the 16 MiB limit",
//       ),
//     });
//   });
// });
//
// describe("Mach-O load command reader failures", () => {
//   const withCommandSize = (size: number): Uint8Array => {
//     const image = machoImage({ commands: [rpathCommand("@loader_path")] });
//     new DataView(image.buffer).setUint32(32 + 4, size, true);
//     return image;
//   };
//
//   it("reports malformed command tables with the failing command", async () => {
//     expect(await read(withCommandSize(0))).toMatchObject({
//       status: "malformed",
//       reason: expect.stringContaining("load command 0"),
//     });
//     expect(await read(withCommandSize(4096))).toMatchObject({
//       status: "malformed",
//       reason: expect.stringContaining("invalid cmdsize"),
//     });
//     const extraCommand = machoImage({ commands: [rpathCommand("x")] });
//     new DataView(extraCommand.buffer).setUint32(16, 2, true);
//     expect(await read(extraCommand)).toMatchObject({
//       status: "malformed",
//       reason: "load command 1 starts beyond sizeofcmds",
//     });
//   });
//
//   it("requires 8-byte command alignment in 64-bit images", async () => {
//     // A command the reader does not decode; only its size is checked.
//     const command = new Uint8Array(12);
//     const view = new DataView(command.buffer);
//     view.setUint32(0, 0x7f000001, true);
//     view.setUint32(4, 12, true);
//     expect(await read(machoImage({ commands: [command] }))).toMatchObject({
//       status: "malformed",
//       reason: expect.stringContaining("invalid cmdsize 12"),
//     });
//     expect(
//       await read(
//         machoImage({
//           cpu: { type: 7, subtype: 3 },
//           wide: false,
//           commands: [command],
//         }),
//       ),
//     ).toMatchObject({ status: "parsed" });
//   });
//
//   it("accepts FAT tables up to 128 records that name a Mach-O CPU", async () => {
//     const slices = Array.from({ length: 24 }, () => ({
//       cpu: CPU.arm64,
//       bytes: machoImage({}),
//     }));
//     const facts = await read(fatImage(slices));
//     expect(facts.status === "parsed" && facts.slices).toHaveLength(24);
//     // An empty table is not a Java class file, whose major version is nonzero.
//     for (const magic of [
//       [0xca, 0xfe, 0xba, 0xbe],
//       [0xbf, 0xba, 0xfe, 0xca],
//     ])
//       expect(await read(Uint8Array.from([...magic, 0, 0, 0, 0]))).toEqual({
//         status: "malformed",
//         reason: "FAT header declares no architectures",
//       });
//   });
//
//   it("rejects string commands too short to hold their string offset", async () => {
//     const short = new Uint8Array(8);
//     const view = new DataView(short.buffer);
//     view.setUint32(0, LC.RPATH, true);
//     view.setUint32(4, 8, true);
//     expect(await read(machoImage({ commands: [short] }))).toMatchObject({
//       status: "malformed",
//       reason: "load command 0 is too short to hold a string offset",
//     });
//     view.setUint32(0, LC.CODE_SIGNATURE, true);
//     expect(await read(machoImage({ commands: [short] }))).toMatchObject({
//       status: "malformed",
//       reason: "load command 0 is too short for LC_CODE_SIGNATURE",
//     });
//   });
//
//   it("rejects strings that are unterminated, misplaced or not UTF-8", async () => {
//     const unterminated = rpathCommand("abcd");
//     unterminated.fill(0x41, 12);
//     expect(await read(machoImage({ commands: [unterminated] }))).toMatchObject({
//       status: "malformed",
//       reason: expect.stringContaining("unterminated"),
//     });
//     const misplaced = rpathCommand("abcd");
//     new DataView(misplaced.buffer).setUint32(8, 4, true);
//     expect(await read(machoImage({ commands: [misplaced] }))).toMatchObject({
//       status: "malformed",
//       reason: expect.stringContaining("string offset 4"),
//     });
//     const invalid = rpathCommand("ab");
//     invalid[12] = 0xff;
//     expect(await read(machoImage({ commands: [invalid] }))).toMatchObject({
//       status: "malformed",
//       reason: expect.stringContaining("not UTF-8"),
//     });
//   });
//
//   it("refuses truncated, oversized, big-endian and out-of-range images", async () => {
//     const image = machoImage({ commands: [rpathCommand("@loader_path")] });
//     expect(await read(image.subarray(0, 20))).toMatchObject({
//       status: "malformed",
//       reason: "Mach-O header is truncated",
//     });
//     const oversized = machoImage({});
//     new DataView(oversized.buffer).setUint32(
//       20,
//       MAX_LOAD_COMMAND_BYTES + 8,
//       true,
//     );
//     expect(await read(oversized)).toMatchObject({ status: "unsupported" });
//     const beyond = machoImage({ commands: [rpathCommand("x")] });
//     new DataView(beyond.buffer).setUint32(20, beyond.length, true);
//     expect(await read(beyond)).toMatchObject({
//       status: "malformed",
//       reason: "load commands extend beyond the Mach-O slice",
//     });
//     const bigEndian = Uint8Array.from([0xfe, 0xed, 0xfa, 0xcf, 0, 0, 0, 0]);
//     expect(await read(bigEndian)).toMatchObject({ status: "unsupported" });
//     const fat = fatImage([{ cpu: CPU.arm64, bytes: machoImage({}) }]);
//     expect(await read(fat.subarray(0, 4100))).toMatchObject({
//       status: "malformed",
//       reason: "FAT architecture 0 slice range extends beyond the file",
//     });
//   });
//
//   it("preserves unsupported status for an unsupported FAT alignment exponent", async () => {
//     const fat = fatImage([{ cpu: CPU.arm64, bytes: machoImage({}) }]);
//     new DataView(fat.buffer).setUint32(24, 53, false);
//
//     expect(await read(fat)).toMatchObject({
//       status: "unsupported",
//       reason: expect.stringContaining("alignment exponent 53 is unsupported"),
//     });
//   });
// });
//
// it.each([true, false])(
//   "rejects unconsumed command bytes in wide=%s headers",
//   async (wide) => {
//     const bytes = machoImage({ wide, commands: [rpathCommand("ignored")] });
//     new DataView(bytes.buffer).setUint32(16, 0, true);
//     expect(await read(bytes)).toMatchObject({
//       status: "malformed",
//       reason: expect.stringContaining("sizeofcmds"),
//     });
//   },
// );
export const _l = 167;
