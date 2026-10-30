export const __stub = 1;
//
// describe("managed derived caller names", () => {
//   it("admits a caller name before building it", () => {
//     let built = false;
//     // A string-like type name records whether the caller was interpolated.
//     const declaringType = {
//       length: 70 * 1024 * 1024,
//       charCodeAt: () => 0x54,
//       toString: () => {
//         built = true;
//         return "T";
//       },
//     } as unknown as string;
//     const method = {
//       token: "0x06000001",
//       declaring_type: declaringType,
//       name: "m",
//       body: {
//         anchors: [
//           {
//             il_offset: 0,
//             opcode: "call",
//             operand_kind: "method",
//             operand: "0x0a000001",
//           },
//         ],
//       },
//     } as unknown as ManagedMethod;
//
//     expect(() => edges([method], new Map(), new ManagedDecodeBudget())).toThrow(
//       ManagedReaderFailure,
//     );
//     expect(built).toBe(false);
//   });
// });
//
// describe("managed TypeDef list ownership bounds", () => {
//   it("retains rows but leaves ownership unknown for zero TypeDef list starts", () => {
//     const bytes = buildManagedPeFixture();
//     const pe = readManagedPeLayout(bytes);
//     if (pe.cli === null) throw new Error("fixture has no CLI header");
//     const { rva, size } = pe.cli.metadata;
//     const layout = readManagedMetadataLayout(
//       bytes,
//       pe.rvaToOffset(rva, size, "cli.metadata"),
//       size,
//     );
//     const listOffset =
//       metadataRowOffset(layout, 2, 1) +
//       4 +
//       2 * layout.stringIndexSize +
//       layout.codedIndexSize("TypeDefOrRef");
//     const listIndexWidth = Math.max(
//       layout.tableIndexSize(3),
//       layout.tableIndexSize(4),
//       layout.tableIndexSize(5),
//       layout.tableIndexSize(6),
//     );
//     const writeIndex = (offset: number) =>
//       listIndexWidth === 2
//         ? bytes.writeUInt16LE(0, offset)
//         : bytes.writeUInt32LE(0, offset);
//     writeIndex(listOffset);
//     writeIndex(listOffset + listIndexWidth);
//
//     const result = inspectManagedMembersBytes(
//       bytes,
//       managedPeFixtureTarget(bytes),
//     );
//
//     expect(result.types[0]).toMatchObject({
//       field_list: { first_row: null, last_row: null, count: 0 },
//       method_list: { first_row: null, last_row: null, count: 0 },
//     });
//     expect(result.fields[0]).toMatchObject({
//       token: "0x04000001",
//       name: "counter",
//       declaring_type: null,
//     });
//     expect(result.methods[0]).toMatchObject({
//       token: "0x06000001",
//       name: "Main",
//       declaring_type: null,
//     });
//     expect(result.coverage).toMatchObject({
//       state: "partial",
//       issues: [
//         expect.objectContaining({
//           code: "invalid-row",
//           detail: expect.stringContaining("TypeDef FieldList start 0"),
//         }),
//         expect.objectContaining({
//           code: "invalid-row",
//           detail: expect.stringContaining("TypeDef MethodList start 0"),
//         }),
//       ],
//     });
//   });
//
//   it("does not infer an earlier owner from an invalid next list endpoint", () => {
//     const bytes = buildManagedPeFixture({ additionalEmptyTypes: 1 });
//     const pe = readManagedPeLayout(bytes);
//     if (pe.cli === null) throw new Error("fixture has no CLI header");
//     const { rva, size } = pe.cli.metadata;
//     const layout = readManagedMetadataLayout(
//       bytes,
//       pe.rvaToOffset(rva, size, "cli.metadata"),
//       size,
//     );
//     const methodStartOffset =
//       metadataRowOffset(layout, 2, 2) +
//       4 +
//       2 * layout.stringIndexSize +
//       layout.codedIndexSize("TypeDefOrRef") +
//       memberListIndexSize(layout, 4);
//     if (memberListIndexSize(layout, 6) === 2)
//       bytes.writeUInt16LE(0, methodStartOffset);
//     else bytes.writeUInt32LE(0, methodStartOffset);
//
//     const result = inspectManagedMembersBytes(
//       bytes,
//       managedPeFixtureTarget(bytes),
//     );
//
//     expect(result.methods[0]).toMatchObject({
//       token: "0x06000001",
//       declaring_type: null,
//     });
//     expect(result.types[0]?.method_list).toMatchObject({
//       first_row: null,
//       last_row: null,
//       count: 0,
//     });
//     expect(result.coverage.state).toBe("partial");
//   });
// });
//
// describe("managed TypeDef list ordering", () => {
//   it("leaves adjacent ownership unknown when valid list starts decrease", () => {
//     const bytes = buildManagedPeFixture({
//       additionalEmptyTypes: 1,
//       methodRowCount: 2,
//     });
//     const pe = readManagedPeLayout(bytes);
//     if (pe.cli === null) throw new Error("fixture has no CLI header");
//     const { rva, size } = pe.cli.metadata;
//     const layout = readManagedMetadataLayout(
//       bytes,
//       pe.rvaToOffset(rva, size, "cli.metadata"),
//       size,
//     );
//     const methodOffset =
//       4 +
//       2 * layout.stringIndexSize +
//       layout.codedIndexSize("TypeDefOrRef") +
//       memberListIndexSize(layout, 4);
//     const writeMethodStart = (row: number, value: number): void => {
//       const offset = metadataRowOffset(layout, 2, row) + methodOffset;
//       if (memberListIndexSize(layout, 6) === 2)
//         bytes.writeUInt16LE(value, offset);
//       else bytes.writeUInt32LE(value, offset);
//     };
//     writeMethodStart(1, 2);
//     writeMethodStart(2, 1);
//
//     const result = inspectManagedMembersBytes(
//       bytes,
//       managedPeFixtureTarget(bytes),
//     );
//
//     expect(result.methods.map(({ declaring_type }) => declaring_type)).toEqual([
//       null,
//       null,
//     ]);
//     expect(result.coverage).toMatchObject({
//       state: "partial",
//       issues: [
//         expect.objectContaining({
//           code: "invalid-row",
//           detail: expect.stringContaining(
//             "MethodList start 1 decreases from preceding start 2",
//           ),
//         }),
//       ],
//     });
//   });
//
//   it("accepts the one-based start for an empty ordinary member table", () => {
//     const bytes = buildManagedPeFixture({ methodRowCount: 0 });
//     const result = inspectManagedMembersBytes(
//       bytes,
//       managedPeFixtureTarget(bytes),
//     );
//     expect(result.types[0]?.method_list).toEqual({
//       first_row: null,
//       last_row: null,
//       count: 0,
//     });
//     expect(result.coverage).toMatchObject({ state: "complete", issues: [] });
//   });
// });
//
// describe("managed metadata reference bounds", () => {
//   it("retains members and reports an out-of-range TypeDef coded index as partial", () => {
//     const bytes = buildManagedPeFixture({ extendsRaw: 12 });
//     const result = inspectManagedMembersBytes(
//       bytes,
//       managedPeFixtureTarget(bytes),
//     );
//
//     expect(result.types[0]).toMatchObject({
//       token: "0x02000001",
//       extends_token: null,
//     });
//     expect(result.fields).toHaveLength(1);
//     expect(result.methods).toHaveLength(1);
//     expect(result.metadata.status).toBe("partial");
//     expect(result.coverage).toMatchObject({
//       state: "partial",
//       issues: [
//         {
//           code: "invalid-row",
//           scope: "metadata.TypeDef:0x02000001",
//           detail: expect.stringContaining(
//             "TypeDef Extends coded index 0xc is invalid: coded index selects row 3 in table 2, which has 1 rows",
//           ),
//         },
//       ],
//     });
//     expect(result.coverage.issues[0]?.offset).toBe(
//       (result.types[0]?.row_offset ?? 0) + 8,
//     );
//   });
//
//   it("retains a MemberRef with an out-of-range parent as an unknown partial reference", () => {
//     const bytes = buildManagedPeFixture({ memberRefParentRaw: 40 });
//     const result = inspectManagedMembersBytes(
//       bytes,
//       managedPeFixtureTarget(bytes),
//     );
//
//     expect(result.member_refs[0]).toMatchObject({
//       token: "0x0a000001",
//       parent_token: null,
//       name: ".ctor",
//     });
//     expect(result.coverage).toMatchObject({
//       state: "partial",
//       issues: [
//         {
//           code: "invalid-row",
//           scope: "metadata.MemberRef:0x0a000001",
//           detail: expect.stringContaining(
//             "MemberRef parent coded index 0x28 is invalid: coded index selects row 5 in table 2, which has 1 rows",
//           ),
//         },
//       ],
//     });
//     expect(result.coverage.issues[0]?.offset).toBe(
//       result.member_refs[0]?.row_offset,
export const _l = 260;
