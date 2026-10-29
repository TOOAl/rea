export const __stub = 1;
//     ["an empty name", { firstName: "" }, "second", "0x100000508"],
//   ] as const)(
//     "retains the valid sibling of a property with %s",
//     (_, layout, kept, location) => {
//       const result = decodeAppleDispatchMetadata(
//         machoWithPropertyAttributes("Tq,N", layout),
//         100,
//         provenance,
//       );
//       expect(
//         result.objc_classes.map(({ name, properties }) => ({
//           name,
//           properties: properties.map((property) => property.name),
//         })),
//       ).toEqual([{ name: "Fixture", properties: [kept] }]);
//       expect(
//         result.coverage.find(
//           ({ facet }) => facet === "objc_properties_categories",
//         ),
//       ).toMatchObject({
//         status: "partial",
//         reason: expect.stringContaining(
//           `property_decode_failed at ${location}: Fixture: property`,
//         ),
//       });
//     },
//   );
// });
//
// describe("malformed Apple dispatch metadata", () => {
//   it("retains valid class siblings when one class has an empty name", () => {
//     const result = decodeAppleDispatchMetadata(
//       partialSiblingsFixture({ emptyMiddleClass: true }),
//       100,
//       provenance,
//     );
//     expect(result.objc_classes.map(({ name }) => name)).toEqual([
//       "KeptClass",
//       "LaterClass",
//     ]);
//     expect(
//       result.coverage.find(
//         ({ facet }) => facet === "objc_class_method_ivar_metadata",
//       ),
//     ).toMatchObject({ status: "partial", examined: 3 });
//   });
//
//   it("rejects malformed command and section boundaries", () => {
//     const bytes = fixture();
//     bytes.writeUInt32LE(7, 36);
//     expect(() => decodeAppleDispatchMetadata(bytes, 100, provenance)).toThrow(
//       "command size",
//     );
//     expect(() =>
//       decodeAppleDispatchMetadata(Buffer.alloc(10), 100, provenance),
//     ).toThrow("Truncated");
//   });
// });
//
// describe("universal Apple dispatch metadata", () => {
//   it.each([false, true])("decodes selected FAT slices (fat64=%s)", (fat64) => {
//     const thin = fixture();
//     const offset = 256;
//     const bytes = Buffer.alloc(offset + thin.length);
//     bytes.writeUInt32BE(fat64 ? 0xcafebabf : 0xcafebabe, 0);
//     bytes.writeUInt32BE(1, 4);
//     bytes.writeUInt32BE(0x0100000c, 8);
//     if (fat64) {
//       bytes.writeBigUInt64BE(BigInt(offset), 16);
//       bytes.writeBigUInt64BE(BigInt(thin.length), 24);
//     } else {
//       bytes.writeUInt32BE(offset, 16);
//       bytes.writeUInt32BE(thin.length, 20);
//     }
//     thin.copy(bytes, offset);
//     const result = decodeAppleDispatchMetadata(bytes, 100, provenance);
//     expect(result.objc_classes[0]).toMatchObject({
//       name: "Fixture",
//       location: { address: "0x100000200", file_offset: offset + 512 },
//     });
//     expect(result.objc_dispatch_implementations[0]).toMatchObject({
//       implementation_address: "0x100000700",
//       location: { file_offset: offset + 0x488 },
//     });
//   });
// });
//
// describe("FAT64 dispatch slice validation", () => {
//   const wrapped = () => {
//     const thin = fixture();
//     const bytes = Buffer.alloc(256 + thin.length);
//     bytes.writeUInt32BE(0xcafebabf, 0);
//     bytes.writeUInt32BE(1, 4);
//     bytes.writeUInt32BE(0x0100000c, 8);
//     bytes.writeBigUInt64BE(256n, 16);
//     bytes.writeBigUInt64BE(BigInt(thin.length), 24);
//     thin.copy(bytes, 256);
//     return bytes;
//   };
//
//   it("rejects a truncated architecture table", () => {
//     expect(() =>
//       decodeAppleDispatchMetadata(wrapped().subarray(0, 32), 100, provenance),
//     ).toThrow("Malformed FAT architecture table");
//   });
//
//   it.each([16, 24])(
//     "checks the full 64-bit slice extent at field %i",
//     (field) => {
//       const bytes = wrapped();
//       bytes.writeBigUInt64BE(0x100000000n, field);
//       expect(() => decodeAppleDispatchMetadata(bytes, 100, provenance)).toThrow(
//         "FAT architecture 0 slice range extends beyond the file",
//       );
//     },
//   );
//
//   it("rejects ambiguous matching architectures", () => {
//     const bytes = wrapped();
//     bytes.writeUInt32BE(2, 4);
//     bytes.copy(bytes, 40, 8, 40);
//     expect(() => decodeAppleDispatchMetadata(bytes, 100, provenance)).toThrow(
//       "Ambiguous FAT architecture slice",
//     );
//   });
//
//   it("rejects a missing selected architecture", () => {
//     expect(() =>
//       decodeAppleDispatchMetadata(wrapped(), 100, provenance, "x86_64"),
//     ).toThrow("Requested FAT architecture is absent");
//   });
// });
//
// describe("byte-swapped universal Apple dispatch metadata", () => {
//   const wrapped = (fat64: boolean) => {
//     const thin = fixture();
//     const offset = 256;
//     const bytes = Buffer.alloc(offset + thin.length);
//     bytes.writeUInt32LE(fat64 ? 0xcafebabf : 0xcafebabe, 0);
//     bytes.writeUInt32LE(1, 4);
//     bytes.writeUInt32LE(0x0100000c, 8);
//     if (fat64) {
//       bytes.writeBigUInt64LE(BigInt(offset), 16);
//       bytes.writeBigUInt64LE(BigInt(thin.length), 24);
//     } else {
//       bytes.writeUInt32LE(offset, 16);
//       bytes.writeUInt32LE(thin.length, 20);
//     }
//     thin.copy(bytes, offset);
//     return bytes;
//   };
//
//   it.each([false, true])(
//     "decodes selected little-endian FAT slices (fat64=%s)",
//     (fat64) => {
//       const result = decodeAppleDispatchMetadata(
//         wrapped(fat64),
//         100,
//         provenance,
//       );
//       expect(result.objc_classes[0]).toMatchObject({
//         name: "Fixture",
//         location: { address: "0x100000200", file_offset: 256 + 512 },
//       });
//       expect(result.objc_dispatch_implementations[0]).toMatchObject({
//         implementation_address: "0x100000700",
//         location: { file_offset: 256 + 0x488 },
//       });
//     },
//   );
//
//   it.each([6, 16])(
//     "states the header byte order when its architecture table is truncated at %i bytes",
//     (length) => {
//       expect(() =>
//         decodeAppleDispatchMetadata(
//           wrapped(false).subarray(0, length),
//           100,
//           provenance,
//         ),
//       ).toThrow(
//         "Malformed FAT architecture table (FAT header byte order: little-endian)",
//       );
//     },
//   );
//
//   it("validates the selected thin slice's own byte order", () => {
//     const bytes = wrapped(false);
//     bytes.writeUInt32BE(0xfeedfacf, 256);
//     expect(() => decodeAppleDispatchMetadata(bytes, 100, provenance)).toThrow(
//       "Only little-endian 64-bit Mach-O metadata is supported",
//     );
//   });
//
//   it("rejects a 32-bit slice payload inside a little-endian container", () => {
//     const bytes = wrapped(false);
//     bytes.writeUInt32BE(0xfeedface, 256);
//     expect(() => decodeAppleDispatchMetadata(bytes, 100, provenance)).toThrow(
//       "Unsupported 32-bit Mach-O metadata for requested CPU type arm64 (FAT header byte order: little-endian)",
//     );
//   });
//
//   it("checks the full little-endian FAT64 slice extent", () => {
//     const bytes = wrapped(true);
//     bytes.writeBigUInt64LE(0x100000000n, 16);
//     expect(() => decodeAppleDispatchMetadata(bytes, 100, provenance)).toThrow(
//       "FAT architecture 0 slice range extends beyond the file (FAT header byte order: little-endian)",
//     );
//   });
// });
//
// const unmappedProtocolSectionBase = 0x100000000n;
// const unmappedProtocolImage = (bad: "protocol" | "class" | "neither") => {
//   const bytes = Buffer.alloc(4096);
//   bytes.writeUInt32LE(0xfeedfacf, 0);
//   bytes.writeUInt32LE(0x0100000c, 4);
//   bytes.writeUInt32LE(2, 12);
//   bytes.writeUInt32LE(1, 16);
//   bytes.writeUInt32LE(232, 20);
//   bytes.writeUInt32LE(0x19, 32);
//   bytes.writeUInt32LE(232, 36);
//   bytes.write("__DATA", 40);
//   bytes.writeBigUInt64LE(unmappedProtocolSectionBase, 56);
//   bytes.writeBigUInt64LE(4096n, 64);
//   bytes.writeBigUInt64LE(4096n, 80);
//   bytes.writeUInt32LE(5, 92);
//   bytes.writeUInt32LE(2, 96);
//   bytes.write("__objc_classlist", 104);
//   bytes.writeBigUInt64LE(
//     unmappedProtocolSectionBase + (bad === "class" ? 0x9000n : 0x200n),
//     136,
//   );
//   bytes.writeBigUInt64LE(8n, 144);
//   bytes.write("__objc_protolist", 184);
//   bytes.writeBigUInt64LE(
//     unmappedProtocolSectionBase + (bad === "protocol" ? 0x9000n : 0x300n),
//     216,
export const _l = 237;
