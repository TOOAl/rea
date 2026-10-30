export const __stub = 1;
//   it("marks reserved clause flags malformed without dropping its bytes", () => {
//     expect(
//       managedBodyWithRegion({
//         il: Buffer.from([0x00, 0x2a]),
//         flags: 8,
//         tryLength: 1,
//         handlerOffset: 1,
//       }),
//     ).toMatchObject({
//       status: "malformed",
//       exception_regions: [expect.objectContaining({ flags: 8 })],
//       issue: "Exception clause has unsupported flags 0x8",
//     });
//   });
//
//   it.each([2, 4])(
//     "accepts the defined finally/fault clause flag %s",
//     (flags) => {
//       expect(
//         managedBodyWithRegion({
//           il: Buffer.from([0x00, 0x00, 0x2a]),
//           flags,
//           tryOffset: 0,
//           tryLength: 1,
//           handlerOffset: 1,
//           handlerLength: 2,
//         }),
//       ).toMatchObject({ status: "present", issue: null });
//     },
//   );
//
//   it("validates filter ordering", () => {
//     expect(
//       managedBodyWithRegion({
//         il: Buffer.from([0x00, 0x00, 0xfe, 0x11, 0x2a]),
//         flags: 1,
//         tryOffset: 0,
//         tryLength: 1,
//         handlerOffset: 4,
//         extra: 1,
//       }),
//     ).toMatchObject({ status: "present", il_size: 5, issue: null });
//     expect(
//       managedBodyWithRegion({
//         il: Buffer.from([0x00, 0x00, 0x2a]),
//         flags: 1,
//         tryOffset: 0,
//         tryLength: 1,
//         handlerOffset: 1,
//         extra: 1,
//       }),
//     ).toMatchObject({
//       status: "malformed",
//       issue:
//         "Exception clause filter must start before its handler within the method IL body",
//     });
//   });
// });
//
// describe("managed exception section decoding", () => {
//   it("reads legacy small EH DataSize without counting its header", () => {
//     const section = Buffer.alloc(16);
//     section[0] = 0x01;
//     section[1] = 12;
//
//     expect(managedBodyWithSections(section)).toMatchObject({
//       status: "present",
//       issue: null,
//       exception_regions: [expect.any(Object)],
//       normalized_il_sha256: expect.any(String),
//     });
//   });
//
//   it("advances a chained legacy section by its physical size", () => {
//     const legacy = Buffer.alloc(16);
//     legacy[0] = 0x81;
//     legacy[1] = 12;
//     const conformant = Buffer.alloc(16);
//     conformant[0] = 0x01;
//     conformant[1] = 16;
//
//     expect(managedBodyWithSections(legacy, conformant)).toMatchObject({
//       status: "present",
//       issue: null,
//       exception_regions: [expect.any(Object), expect.any(Object)],
//       normalized_il_sha256: expect.any(String),
//     });
//   });
//
//   it("rejects a legacy-sized clause whose physical bytes leave the artifact", () => {
//     const section = Buffer.alloc(12);
//     section[0] = 0x01;
//     section[1] = 12;
//
//     expect(parseExceptionRegions(section, 0, section.length)).toMatchObject({
//       status: "malformed",
//       regions: [],
//       issue: "Exception section size leaves artifact",
//     });
//   });
//
//   it("still rejects a small EH DataSize that matches neither layout", () => {
//     const section = Buffer.alloc(17);
//     section[0] = 0x01;
//     section[1] = 13;
//
//     expect(managedBodyWithSections(section)).toMatchObject({
//       status: "malformed",
//       exception_regions: [],
//       issue: "Exception section size does not contain whole clauses",
//     });
//   });
//
//   it("marks an exception section with a partial clause as malformed", () => {
//     const section = Buffer.alloc(17);
//     section[0] = 0x01;
//     section[1] = section.length;
//
//     expect(managedBodyWithSections(section)).toMatchObject({
//       status: "malformed",
//       exception_regions: [],
//       issue: "Exception section size does not contain whole clauses",
//     });
//   });
//
//   it("reads every chained exception section", () => {
//     const first = Buffer.alloc(16);
//     first[0] = 0x81;
//     first[1] = first.length;
//     const second = Buffer.alloc(16);
//     second[0] = 0x01;
//     second[1] = second.length;
//     expect(managedBodyWithSections(first, second)).toMatchObject({
//       status: "present",
//       issue: null,
//       exception_regions: [
//         { flags: 0, try_offset: 0, try_length: 0, handler_offset: 0 },
//         { flags: 0, try_offset: 0, try_length: 0, handler_offset: 0 },
//       ],
//     });
//   });
//
//   it("keeps small section reserved bytes invalid", () => {
//     const section = Buffer.alloc(16);
//     section[0] = 0x01;
//     section[1] = 16;
//     section[2] = 1;
//
//     expect(managedBodyWithSections(section)).toMatchObject({
//       status: "malformed",
//       exception_regions: [],
//       issue: "Small exception section reserved bytes are nonzero",
//     });
//   });
//
//   it("preserves decoded clauses when a chained section has an unsupported kind", () => {
//     const first = Buffer.alloc(16);
//     first[0] = 0x81;
//     first[1] = first.length;
//     const second = Buffer.from([0x02, 0x04, 0x00, 0x00]);
//     expect(managedBodyWithSections(first, second)).toMatchObject({
//       status: "malformed",
//       exception_regions: [expect.objectContaining({ flags: 0 })],
//       issue: "Unsupported method data section kind 2",
//     });
//   });
//
//   it("preserves decoded clauses when a later section has a partial clause", () => {
//     const first = Buffer.alloc(16);
//     first[0] = 0x81;
//     first[1] = first.length;
//     first.writeUInt16LE(2, 4);
//     const later = Buffer.alloc(17);
//     later[0] = 0x01;
//     later[1] = later.length;
//
//     expect(managedBodyWithSections(first, later)).toMatchObject({
//       status: "malformed",
//       exception_regions: [expect.objectContaining({ flags: 2 })],
//       issue: "Exception section size does not contain whole clauses",
//     });
//   });
//
//   it.each([
//     {
//       name: "unsupported section kind",
//       section: Buffer.from([0x02, 0x04, 0x00, 0x00]),
//       issue: "Unsupported method data section kind 2",
//     },
//     {
//       name: "section size outside artifact",
//       section: Buffer.from([0x41, 0xff, 0xff, 0xff]),
//       issue: "Exception section size leaves artifact",
//     },
//   ])("rejects $name", ({ section, issue }) => {
//     expect(managedBodyWithSections(section)).toMatchObject({
//       status: "malformed",
//       exception_regions: [],
//       issue,
//     });
//   });
// });
export const _l = 202;
