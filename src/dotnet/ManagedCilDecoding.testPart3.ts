export const __stub = 1;
//
//   it("keeps a complete operand-bearing body decodable", () => {
//     expect(
//       fatBody(Buffer.from([0x00, 0x20, 0x01, 0x00, 0x00, 0x00, 0x2a])),
//     ).toMatchObject({
//       status: "present",
//       decoded_instruction_count: 3,
//       opcode_counts: { nop: 1, "ldc.i4": 1, ret: 1 },
//       issue: null,
//     });
//   });
//
//   it("still decodes a switch whose targets fit", () => {
//     const il = Buffer.from([
//       0x00, 0x45, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x2a,
//     ]);
//     expect(fatBody(il)).toMatchObject({
//       status: "present",
//       il_size: il.length,
//       opcode_counts: { nop: 1, switch: 1, ret: 1 },
//       issue: null,
//     });
//   });
// });
//
// describe("managed exception region bounds", () => {
//   it("marks out-of-method ranges malformed and preserves the raw EH clause", () => {
//     expect(
//       managedBodyWithRegion({
//         il: Buffer.from([0x2a]),
//         tryOffset: 0,
//         tryLength: 2,
//         handlerOffset: 0,
//       }),
//     ).toMatchObject({
//       status: "malformed",
//       il_size: 1,
//       exception_regions: [
//         {
//           flags: 0,
//           try_offset: 0,
//           try_length: 2,
//           handler_offset: 0,
//           handler_length: 1,
//           class_token: "0x02000001",
//         },
//       ],
//       issue: "Exception clause try range leaves the method IL body",
//     });
//   });
//
//   it("uses half-open method bounds and permits zero-length ranges", () => {
//     expect(
//       managedBodyWithRegion({
//         il: Buffer.from([0x00, 0x00, 0x2a]),
//         tryOffset: 0,
//         tryLength: 1,
//         handlerOffset: 1,
//         handlerLength: 2,
//       }),
//     ).toMatchObject({ status: "present", il_size: 3, issue: null });
//     expect(
//       managedBodyWithRegion({
//         il: Buffer.from([0x2a]),
//         tryOffset: 0,
//         tryLength: 0,
//         handlerOffset: 0,
//         handlerLength: 0,
//       }),
//     ).toMatchObject({ status: "present", il_size: 1, issue: null });
//   });
//
//   it.each([
//     ["try start", { tryOffset: 1, tryLength: 4, handlerOffset: 5 }],
//     ["try end", { tryOffset: 0, tryLength: 1, handlerOffset: 5 }],
//     ["handler start", { tryLength: 5, handlerOffset: 1, handlerLength: 5 }],
//     ["handler end", { tryLength: 5, handlerOffset: 0, handlerLength: 1 }],
//   ] as const)(
//     "preserves clauses with a mid-instruction %s",
//     (_label, region) => {
//       const body = managedBodyWithRegion({
//         il: Buffer.from([0x20, 0, 0, 0, 0, 0x2a]),
//         ...region,
//       });
//       expect(body).toMatchObject({
//         status: "malformed",
//         exception_regions: [expect.any(Object)],
//         issue:
//           "Exception clause " +
//           (_label.startsWith("try") ? "try" : "handler") +
//           " range does not align with CIL instruction boundaries",
//       });
//     },
//   );
//
//   it("rejects a filter start inside an instruction and retains the clause", () => {
//     expect(
//       managedBodyWithRegion({
//         il: Buffer.from([0x20, 0, 0, 0, 0, 0x2a]),
//         flags: 1,
//         tryLength: 5,
//         handlerOffset: 5,
//         extra: 1,
//       }),
//     ).toMatchObject({
//       status: "malformed",
//       exception_regions: [expect.objectContaining({ filter_offset: 1 })],
//       issue:
//         "Exception clause filter range does not align with CIL instruction boundaries",
//     });
//   });
// });
//
// describe("managed exception region prefix boundaries", () => {
//   it("treats a CIL prefix chain and its opcode as one boundary", () => {
//     expect(
//       managedBodyWithRegion({
//         il: Buffer.from([0xfe, 0x12, 1, 0xfe, 0x13, 0x4a, 0x2a]),
//         tryOffset: 0,
//         tryLength: 6,
//         handlerOffset: 6,
//       }),
//     ).toMatchObject({ status: "present", issue: null, il_size: 7 });
//   });
//
//   it("keeps constrained callvirt as a single region boundary", () => {
//     const il = Buffer.from([0xfe, 0x16, 1, 0, 0, 1, 0x6f, 1, 0, 0, 6, 0x2a]);
//     expect(
//       managedBodyWithRegion({
//         il,
//         tryOffset: 0,
//         tryLength: 11,
//         handlerOffset: 11,
//       }),
//     ).toMatchObject({ status: "present", issue: null, il_size: 12 });
//     expect(
//       managedBodyWithRegion({
//         il,
//         tryOffset: 6,
//         tryLength: 1,
//         handlerOffset: 11,
//       }),
//     ).toMatchObject({
//       status: "malformed",
//       issue:
//         "Exception clause try range does not align with CIL instruction boundaries",
//     });
//   });
//
//   it("decodes the no. prefix and keeps it with its opcode", () => {
//     // ldarg.0; no. nullcheck; ldfld 0x04000001; pop; ret
//     const il = Buffer.from([2, 0xfe, 0x19, 4, 0x7b, 1, 0, 0, 4, 0x26, 0x2a]);
//     expect(
//       managedBodyWithRegion({ il, tryLength: 10, handlerOffset: 10 }),
//     ).toMatchObject({
//       status: "present",
//       issue: null,
//       decoded_instruction_count: 5,
//       opcode_counts: { "ldarg.0": 1, "no.": 1, ldfld: 1, pop: 1, ret: 1 },
//     });
//     expect(
//       managedBodyWithRegion({
//         il,
//         tryOffset: 4,
//         tryLength: 5,
//         handlerOffset: 10,
//       }),
//     ).toMatchObject({
//       status: "malformed",
//       issue:
//         "Exception clause try range does not align with CIL instruction boundaries",
//     });
//   });
//
//   it.each([
//     ["start", { tryOffset: 5, tryLength: 1, handlerOffset: 6 }],
//     [
//       "end after first prefix",
//       { tryOffset: 0, tryLength: 3, handlerOffset: 6 },
//     ],
//     [
//       "end after second prefix",
//       { tryOffset: 0, tryLength: 5, handlerOffset: 6 },
//     ],
//   ] as const)(
//     "rejects a region %s between a prefix and its opcode",
//     (_edge, region) => {
//       expect(
//         managedBodyWithRegion({
//           il: Buffer.from([0xfe, 0x12, 1, 0xfe, 0x13, 0x4a, 0x2a]),
//           ...region,
//         }),
//       ).toMatchObject({
//         status: "malformed",
//         exception_regions: [expect.any(Object)],
//         issue:
//           "Exception clause try range does not align with CIL instruction boundaries",
//       });
//     },
//   );
// });
//
// describe("managed exception region flags and filters", () => {
export const _l = 203;
