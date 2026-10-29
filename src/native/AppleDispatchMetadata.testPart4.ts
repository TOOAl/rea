export const __stub = 1;
//   );
//   bytes.writeBigUInt64LE(8n, 224);
//   bytes.writeBigUInt64LE(unmappedProtocolSectionBase + 0x400n, 0x200);
//   bytes.writeBigUInt64LE(unmappedProtocolSectionBase + 0x500n, 0x420);
//   bytes.writeUInt32LE(2, 0x500);
//   bytes.writeUInt32LE(16, 0x508);
//   bytes.writeBigUInt64LE(unmappedProtocolSectionBase + 0x600n, 0x518);
//   bytes.write("RetainedClass\0", 0x600);
//   return bytes;
// };
// const unmappedProtocolClassCoverage = (result: {
//   coverage: { facet: string; status: string; reason: string | null }[];
// }) =>
//   result.coverage.find(
//     ({ facet }) => facet === "objc_class_method_ivar_metadata",
//   );
//
// describe("Apple dispatch unmapped protocol-list slot", () => {
//   it("returns the class when every list slot is mapped", () => {
//     const result = decodeAppleDispatchMetadata(
//       unmappedProtocolImage("neither"),
//       100,
//       provenance,
//     );
//     expect(result.objc_classes).toMatchObject([{ name: "RetainedClass" }]);
//     expect(unmappedProtocolClassCoverage(result)).toMatchObject({
//       status: "complete",
//     });
//   });
//
//   it("records partial coverage when the class-list slot is unmapped", () => {
//     const result = decodeAppleDispatchMetadata(
//       unmappedProtocolImage("class"),
//       100,
//       provenance,
//     );
//     expect(unmappedProtocolClassCoverage(result)).toMatchObject({
//       status: "partial",
//       reason: expect.stringContaining("0x100009000"),
//     });
//   });
//
//   it("retains the class and partial coverage when the protocol-list slot is unmapped", () => {
//     const result = decodeAppleDispatchMetadata(
//       unmappedProtocolImage("protocol"),
//       100,
//       provenance,
//     );
//     expect(result.objc_classes).toMatchObject([{ name: "RetainedClass" }]);
//     expect(unmappedProtocolClassCoverage(result)).toMatchObject({
//       status: "partial",
//       reason: expect.stringContaining("0x100009000"),
//     });
//   });
// });
//
// describe("Apple dispatch list scan budget", () => {
//   it("bounds failed protocol-list slots by the record budget", () => {
//     // The section size is file-declared, so a crafted image can claim an
//     // arbitrarily large unmapped protocol list. Failed slots must spend the
//     // record budget like decoded ones, otherwise the loop runs unbounded.
//     const bytes = unmappedProtocolImage("protocol");
//     bytes.writeBigUInt64LE(80000n, 224);
//     const result = decodeAppleDispatchMetadata(bytes, 100, provenance);
//     const coverage = unmappedProtocolClassCoverage(result);
//     expect(coverage).toMatchObject({ status: "partial" });
//     expect(coverage?.reason).toContain("max_records_reached");
//     const failures =
//       coverage?.reason?.match(/Unmapped or ambiguous metadata pointer/g) ?? [];
//     expect(failures.length).toBeLessThanOrEqual(100);
//   });
//
//   it("keeps independent facets complete when only zero-pointer list scanning is capped", () => {
//     const bytes = unmappedProtocolImage("neither");
//     bytes.writeBigUInt64LE(0n, 144);
//     bytes.writeBigUInt64LE(16n, 224);
//     const result = decodeAppleDispatchMetadata(bytes, 1, provenance);
//     expect(unmappedProtocolClassCoverage(result)).toMatchObject({
//       status: "partial",
//       reason: expect.stringContaining("max_records_reached"),
//     });
//     for (const facet of [
//       "objc_properties_categories",
//       "binary_relative_pointers",
//     ])
//       expect(
//         result.coverage.find((item) => item.facet === facet),
//       ).toMatchObject({
//         status: "complete",
//         reason: null,
//       });
//   });
//
//   it("marks class-dependent coverage partial when zero slots hide a later class", () => {
//     const bytes = unmappedProtocolImage("neither");
//     bytes.writeBigUInt64LE(0n, 224);
//     bytes.writeBigUInt64LE(16n, 144);
//     bytes.writeBigUInt64LE(0n, 0x200);
//     bytes.writeBigUInt64LE(unmappedProtocolSectionBase + 0x400n, 0x208);
//     const result = decodeAppleDispatchMetadata(bytes, 1, provenance);
//     expect(result.objc_classes).toEqual([]);
//     for (const facet of [
//       "objc_class_method_ivar_metadata",
//       "objc_properties_categories",
//       "binary_relative_pointers",
//     ])
//       expect(
//         result.coverage.find((item) => item.facet === facet),
//       ).toMatchObject({
//         status: "partial",
//         reason: expect.stringContaining("max_records_reached"),
//       });
//     for (const facet of [
//       "swift_class_vtable_descriptors",
//       "swift_conformances_static_witness_slots",
//     ])
//       expect(
//         result.coverage.find((item) => item.facet === facet),
//       ).toMatchObject({ status: "complete" });
//   });
//
//   it("bounds failed class-list slots by the record budget", () => {
//     // Same file-declared-size hazard as the protocol list: a crafted image
//     // can declare an arbitrarily large unmapped class list. Failed class
//     // slots must spend the record budget like decoded ones, otherwise the
//     // loop runs unbounded (each failed read produced an unbounded failure
//     // string with no budget spend).
//     const bytes = unmappedProtocolImage("class");
//     bytes.writeBigUInt64LE(80000n, 144);
//     const result = decodeAppleDispatchMetadata(bytes, 100, provenance);
//     const coverage = unmappedProtocolClassCoverage(result);
//     expect(coverage).toMatchObject({ status: "partial" });
//     expect(coverage?.reason).toContain("max_records_reached");
//     const failures =
//       coverage?.reason?.match(/Unmapped or ambiguous metadata pointer/g) ?? [];
//     expect(failures.length).toBeLessThanOrEqual(100);
//   });
//
//   it("reports the real failure for a mapped-but-malformed class at the budget boundary", () => {
//     // The class-list slot itself is mapped, so readClass admits the record
//     // budget and only then throws on the unmapped class_ro pointer. The
//     // failure must be recorded as-is: it already spent one budget unit, so
//     // admitting again would break before the reason is appended and report
//     // only max_records_reached.
//     const bytes = unmappedProtocolImage("neither");
//     bytes.writeBigUInt64LE(unmappedProtocolSectionBase + 0x700n, 0x200);
//     bytes.writeBigUInt64LE(unmappedProtocolSectionBase + 0x9000n, 0x720);
//     const result = decodeAppleDispatchMetadata(bytes, 1, provenance);
//     const coverage = unmappedProtocolClassCoverage(result);
//     expect(coverage).toMatchObject({ status: "partial" });
//     expect(coverage?.reason).toContain(
//       "Unmapped or ambiguous metadata pointer 0x100009018",
//     );
//     expect(coverage?.reason).not.toContain("max_records_reached");
//   });
//
//   it("does not skip a valid class after a mapped-but-malformed class", () => {
//     // With two slots and a budget of two, the corrupt first slot must spend
//     // exactly one unit: admitting twice would exhaust the budget and skip
//     // the valid class behind it.
//     const bytes = unmappedProtocolImage("neither");
//     bytes.writeBigUInt64LE(16n, 144);
//     bytes.writeBigUInt64LE(unmappedProtocolSectionBase + 0x700n, 0x200);
//     bytes.writeBigUInt64LE(unmappedProtocolSectionBase + 0x9000n, 0x720);
//     bytes.writeBigUInt64LE(unmappedProtocolSectionBase + 0x400n, 0x208);
//     const result = decodeAppleDispatchMetadata(bytes, 2, provenance);
//     expect(result.objc_classes).toMatchObject([{ name: "RetainedClass" }]);
//     expect(unmappedProtocolClassCoverage(result)?.reason).toContain(
//       "Unmapped or ambiguous metadata pointer 0x100009018",
//     );
//   });
//
//   it("reports the real failure for a mapped-but-truncated protocol slot", () => {
//     // The protocol slot is mapped, so protocolReader.record admits the
//     // budget itself before throwing on the truncated declaration. The loop
//     // must not admit a second time; the recorded reason stays the
//     // declaration failure, not max_records_reached.
//     const bytes = unmappedProtocolImage("neither");
//     bytes.writeBigUInt64LE(unmappedProtocolSectionBase + 0x700n, 0x300);
//     const result = decodeAppleDispatchMetadata(bytes, 100, provenance);
//     const coverage = unmappedProtocolClassCoverage(result);
//     expect(coverage).toMatchObject({ status: "partial" });
//     expect(coverage?.reason).toContain(
//       "Truncated Objective-C protocol declaration",
//     );
//     expect(coverage?.reason).not.toContain("max_records_reached");
//   });
//
//   it.each([
//     ["RetainedProtocol", ["RetainedProtocol"], "complete"],
//     ["", [], "partial"],
//   ])(
//     "keeps the class when the protocol name is %j",
//     (protocolName, protocols, status) => {
//       const bytes = unmappedProtocolImage("neither");
//       bytes.writeBigUInt64LE(unmappedProtocolSectionBase + 0x700n, 0x300);
//       bytes.writeBigUInt64LE(unmappedProtocolSectionBase + 0x800n, 0x708);
//       bytes.writeUInt32LE(72, 0x740);
//       bytes.write(`${protocolName}\0`, 0x800);
//       const result = decodeAppleDispatchMetadata(bytes, 100, provenance);
//       expect(result.objc_classes).toMatchObject([{ name: "RetainedClass" }]);
//       expect(result.objc_protocols.map(({ name }) => name)).toEqual(protocols);
//       const coverage = unmappedProtocolClassCoverage(result);
//       expect(coverage).toMatchObject({ status });
//       if (status === "partial")
//         expect(coverage?.reason).toBe(
//           "Protocol 0x100000700: Objective-C protocol has an empty name",
//         );
//     },
//   );
//
//   it("keeps a protocol adopted only by an empty-named protocol", () => {
//     const bytes = unmappedProtocolImage("neither");
//     const at = (offset: bigint) => unmappedProtocolSectionBase + offset;
//     bytes.writeBigUInt64LE(at(0x700n), 0x300);
//     bytes.writeBigUInt64LE(at(0x800n), 0x708); // empty parent name
//     bytes.writeBigUInt64LE(at(0x900n), 0x710); // adopted protocol list
//     bytes.writeUInt32LE(72, 0x740);
//     bytes.writeBigUInt64LE(1n, 0x900);
//     bytes.writeBigUInt64LE(at(0xa00n), 0x908);
//     bytes.writeBigUInt64LE(at(0xb00n), 0xa08);
//     bytes.writeUInt32LE(72, 0xa40);
//     bytes.write("ChildProtocol\0", 0xb00);
//     const result = decodeAppleDispatchMetadata(bytes, 100, provenance);
//     expect(result.objc_classes).toMatchObject([{ name: "RetainedClass" }]);
//     expect(result.objc_protocols.map(({ name }) => name)).toEqual([
//       "ChildProtocol",
//     ]);
//     expect(unmappedProtocolClassCoverage(result)).toMatchObject({
//       status: "partial",
//       reason: "Protocol 0x100000700: Objective-C protocol has an empty name",
//     });
//   });
// });
export const _l = 234;
