export const __stub = 1;
//     ).toMatchObject({ status: "complete", examined: 1, decoded: 1 });
//   });
// });
// describe("Apple dispatch binary metadata", () => {
//   it.each([false, true])(
//     "decodes stripped absolute/relative method lists (relative=%s) with exact offsets",
//     (relative) => {
//       const result = decodeAppleDispatchMetadata(
//         fixture(relative),
//         100,
//         provenance,
//       );
//       expect(result.objc_classes).toMatchObject([
//         {
//           name: "Fixture",
//           instance_size: 16,
//           location: { address: "0x100000200", file_offset: 512 },
//         },
//         { name: "Fixture", is_meta_class: true },
//       ]);
//       expect(result.objc_dispatch_implementations).toMatchObject([
//         {
//           selector: "performAction:",
//           implementation_address: "0x100000700",
//           location: { file_offset: 0x488 },
//           decode: { status: "decoded" },
//         },
//       ]);
//       expect(result.objc_ivars).toMatchObject([
//         {
//           name: "state",
//           type_encoding: "i",
//           offset: 8,
//           location: { file_offset: 0x508 },
//         },
//       ]);
//       expect(result.objc_classes[0]?.properties).toEqual([
//         {
//           name: "atomicValue",
//           type_encoding: "q",
//           attributes: [{ name: "T", value: "q" }],
//           atomicity: "atomic",
//           is_readonly: false,
//           getter: null,
//           setter: null,
//         },
//         {
//           name: "nonatomicValue",
//           type_encoding: "q",
//           attributes: [
//             { name: "T", value: "q" },
//             { name: "N", value: "" },
//           ],
//           atomicity: "nonatomic",
//           is_readonly: false,
//           getter: null,
//           setter: null,
//         },
//         {
//           name: "unknownValue",
//           type_encoding: null,
//           attributes: [],
//           atomicity: null,
//           is_readonly: null,
//           getter: null,
//           setter: null,
//         },
//       ]);
//       expect(result.objc_classes[0]).toMatchObject({
//         is_meta_class: false,
//         is_root_class: false,
//         ivar_count: 1,
//       });
//       expect(result.objc_classes[1]).toMatchObject({
//         is_meta_class: true,
//         is_root_class: false,
//         ivar_count: null,
//       });
//       expect(result.objc_classes[0]?.methods[0]).toMatchObject({
//         is_required: null,
//         is_optional: null,
//       });
//       expect(result.objc_protocols[0]).toMatchObject({
//         name: "FixtureProtocol",
//         methods: [
//           {
//             selector: "requiredAction:",
//             is_required: true,
//             is_optional: false,
//           },
//         ],
//         optional_methods: [
//           {
//             selector: "optionalAction:",
//             is_required: false,
//             is_optional: true,
//           },
//         ],
//       });
//     },
//   );
//
//   it.each([
//     [0xffffffff, 8],
//     [3, 8],
//     [0xfffffffe, null],
//   ])("decodes ivar alignment raw value %i as %s", (raw, alignment) => {
//     const bytes = fixture();
//     bytes.writeUInt32LE(raw, 0x520);
//     const result = decodeAppleDispatchMetadata(bytes, 100, provenance);
//     expect(result.objc_ivars).toMatchObject([
//       { name: "state", alignment, decode: { status: "decoded" } },
//     ]);
//   });
// });
//
// describe("Apple dispatch coverage ownership", () => {
//   it("keeps unsupported pointers and record truncation explicit", () => {
//     const bytes = fixture();
//     bytes.writeBigUInt64LE(0xffffffffffffffffn, 0x498);
//     const result = decodeAppleDispatchMetadata(bytes, 100, provenance);
//     expect(result.objc_dispatch_implementations[0]).toMatchObject({
//       implementation_address: null,
//       decode: { status: "partial" },
//     });
//     expect(
//       result.coverage.find(
//         ({ facet }) => facet === "objc_class_method_ivar_metadata",
//       ),
//     ).toMatchObject({
//       status: "partial",
//       reason: expect.stringContaining("method Fixture instance performAction:"),
//     });
//     const truncated = decodeAppleDispatchMetadata(fixture(), 1, provenance);
//     expect(truncated.coverage[0]?.reason).toContain("max_records_reached");
//     expect(
//       truncated.coverage.find(
//         ({ facet }) => facet === "objc_properties_categories",
//       ),
//     ).toMatchObject({ status: "partial", reason: "max_records_reached" });
//   });
//   it("keeps partial category methods in category coverage only", () => {
//     const baseline = decodeAppleDispatchMetadata(fixture(), 100, provenance);
//     const result = decodeAppleDispatchMetadata(
//       fixture(false, "partial-method"),
//       100,
//       provenance,
//     );
//
//     expect(result.objc_dispatch_implementations).toContainEqual(
//       expect.objectContaining({
//         category: "FixtureCategory",
//         decode: {
//           status: "partial",
//           reason: "implementation_pointer_unmapped_or_encoded",
//         },
//       }),
//     );
//     const baselineClassCoverage = baseline.coverage.find(
//       ({ facet }) => facet === "objc_class_method_ivar_metadata",
//     );
//     const classCoverage = result.coverage.find(
//       ({ facet }) => facet === "objc_class_method_ivar_metadata",
//     );
//     expect(baselineClassCoverage).toBeDefined();
//     expect(classCoverage).toEqual(baselineClassCoverage);
//     expect(
//       result.coverage.find(
//         ({ facet }) => facet === "objc_properties_categories",
//       ),
//     ).toMatchObject({
//       status: "partial",
//       reason: expect.stringContaining("category method FixtureCategory"),
//     });
//   });
//   it("keeps a category whose class reference is unmapped", () => {
//     const result = decodeAppleDispatchMetadata(
//       fixture(false, "unmapped-class"),
//       100,
//       provenance,
//     );
//     expect(result.objc_categories).toMatchObject([
//       {
//         name: "FixtureCategory",
//         class_name: null,
//         class_source: "unresolved",
//         decode: { status: "partial", reason: "category_class_unresolved" },
//       },
//     ]);
//     expect(result.objc_categories[0]?.instance_methods).toHaveLength(1);
//     expect(result.objc_dispatch_implementations).toContainEqual(
//       expect.objectContaining({
//         category: "FixtureCategory",
//         class_name: "(FixtureCategory)",
//         implementation_address: "0x100000700",
//       }),
//     );
//     expect(
//       result.coverage.find(
//         ({ facet }) => facet === "objc_properties_categories",
//       ),
//     ).toMatchObject({
//       status: "partial",
//       reason: expect.stringContaining(
//         "category_class_unresolved at 0x100000b48: Category FixtureCategory class reference 0x100005000",
//       ),
//     });
//   });
//   it("keeps malformed category pointers out of class failure coverage", () => {
//     const baseline = decodeAppleDispatchMetadata(fixture(), 100, provenance);
//     const result = decodeAppleDispatchMetadata(
//       fixture(false, "unmapped-pointer"),
//       100,
//       provenance,
//     );
//     const baselineClassCoverage = baseline.coverage.find(
//       ({ facet }) => facet === "objc_class_method_ivar_metadata",
//     );
//     const classCoverage = result.coverage.find(
//       ({ facet }) => facet === "objc_class_method_ivar_metadata",
//     );
//     expect(baselineClassCoverage).toBeDefined();
//     expect(classCoverage).toEqual(baselineClassCoverage);
//     expect(
//       result.coverage.find(
//         ({ facet }) => facet === "objc_properties_categories",
//       ),
//     ).toMatchObject({
//       status: "partial",
//       reason: expect.stringContaining("category_decode_failed"),
//     });
//   });
// });
//
// describe("malformed Objective-C property records", () => {
//   it.each([
//     ["an unmapped name", { secondNameOffset: 0x2000 }, "first", "0x100000518"],
export const _l = 237;
