export const __stub = 1;
// describe("managed user string scan completeness", () => {
//   const inspect = (options: Parameters<typeof buildManagedPeFixture>[0]) => {
//     const bytes = buildManagedPeFixture(options);
//     return inspectManagedMembersBytes(bytes, managedPeFixtureTarget(bytes));
//   };
//
//   it("marks user strings partial when a method body is not fully decoded", () => {
//     const { heap, tokens } = fixtureUserStringHeap(["ok", "later"]);
//     const [ok, later] = tokens as [string, string];
//     // ldstr "ok", then an undefined opcode before ldstr "later".
//     const il = Buffer.from([
//       0x72, 0, 0, 0, 0, 0x26, 0xfe, 0xff, 0x72, 0, 0, 0, 0, 0x26, 0x2a,
//     ]);
//     il.writeUInt32LE(Number.parseInt(ok, 16), 1);
//     il.writeUInt32LE(Number.parseInt(later, 16), 9);
//     const result = inspect({
//       ilBody: Buffer.concat([Buffer.from([(il.length << 2) | 2]), il]),
//       userStringHeap: heap,
//     });
//
//     expect(result.methods[0]?.body.status).toBe("malformed");
//     expect(result.user_strings).toEqual({
//       state: "partial",
//       literals: [{ token: ok, offset: expect.any(Number), value: "ok" }],
//       issues: [],
//     });
//   });
//
//   it.each([
//     ["outside", 1, "complete"],
//     ["inside", 2, "partial"],
//   ])(
//     "judges an unreadable method row %s the selection by its owner",
//     (_where, badRow, state) => {
//       const bytes = buildManagedPeFixture({
//         additionalEmptyTypes: 1,
//         methodRowCount: 2,
//       });
//       const cli = readManagedPeLayout(bytes);
//       if (cli.cli === null) throw new Error("fixture has no CLI header");
//       const { rva, size } = cli.cli.metadata;
//       const layout = readManagedMetadataLayout(
//         bytes,
//         cli.rvaToOffset(rva, size, "cli.metadata"),
//         size,
//       );
//       const write = (offset: number, width: number, value: number) =>
//         width === 2
//           ? bytes.writeUInt16LE(value, offset)
//           : bytes.writeUInt32LE(value, offset);
//       // Fixture.Program's methods now start at row 2, so Fixture.Empty0 owns row 1.
//       write(
//         metadataRowOffset(layout, 2, 2) +
//           4 +
//           2 * layout.stringIndexSize +
//           layout.codedIndexSize("TypeDefOrRef") +
//           layout.tableIndexSize(4),
//         layout.tableIndexSize(6),
//         2,
//       );
//       // An out-of-range name index makes that method row unreadable.
//       write(
//         metadataRowOffset(layout, 6, badRow) + 8,
//         layout.stringIndexSize,
//         0xffff,
//       );
//       const result = inspectManagedMembersBytes(
//         bytes,
//         managedPeFixtureTarget(bytes),
//         { typeNames: ["Fixture.Program"] },
//       );
//
//       expect(result.user_strings?.state).toBe(state);
//     },
//   );
//
//   it("keeps user strings complete when only the exception section is malformed", () => {
//     const { heap, tokens } = fixtureUserStringHeap(["ok"]);
//     // ldstr "ok"; pop; ret all decode before an exception section that
//     // holds no whole clause.
//     const il = Buffer.from([0x72, 0, 0, 0, 0, 0x26, 0x2a]);
//     il.writeUInt32LE(Number.parseInt(tokens[0] ?? "", 16), 1);
//     const header = Buffer.alloc(12);
//     header.writeUInt16LE(0x300b, 0);
//     header.writeUInt16LE(8, 2);
//     header.writeUInt32LE(il.length, 4);
//     const section = Buffer.alloc(17);
//     section[0] = 0x01;
//     section[1] = section.length;
//     const result = inspect({
//       ilBody: Buffer.concat([header, il, Buffer.alloc(1), section]),
//       userStringHeap: heap,
//     });
//
//     expect(result.methods[0]?.body.status).toBe("malformed");
//     expect(result.user_strings).toMatchObject({
//       state: "complete",
//       literals: [{ value: "ok" }],
//     });
//   });
//
//   it("marks user strings partial when selected type identity is unreadable", () => {
//     const layout = {
//       userStrings: { name: "#US", offset: 0, size: 1 },
//     } as unknown as ManagedMetadataLayout;
//     expect(
//       parseUserStrings(Buffer.from([0]), layout, {
//         methods: [],
//         unscannedMethods: 0,
//         unreadableSelectedTypes: 1,
//       }),
//     ).toEqual({ state: "partial", literals: [], issues: [] });
//   });
//
//   it("marks user strings partial when an inspected method row was not read", () => {
//     const layout = {
//       userStrings: { name: "#US", offset: 0, size: 1 },
//     } as unknown as ManagedMetadataLayout;
//     // The omitted row's body, and any ldstr in it, was never scanned.
//     expect(
//       parseUserStrings(Buffer.from([0]), layout, {
//         methods: [],
//         unscannedMethods: 1,
//       }),
//     ).toEqual({ state: "partial", literals: [], issues: [] });
//   });
// });
//
// describe("managed member decoding budget", () => {
//   it("admits a wide-instruction method whose actual records fit the budget", () => {
//     // Five-byte branches all target the next instruction. A final ret leaves
//     // the method stack-neutral, despite over 256 KiB of valid IL bytes.
//     const il = Buffer.alloc(270_001);
//     for (let offset = 0; offset < il.length - 1; offset += 5) {
//       il[offset] = 0x38;
//     }
//     il[il.length - 1] = 0x2a;
//     const header = Buffer.alloc(12);
//     header.writeUInt16LE(0x3003, 0);
//     header.writeUInt16LE(8, 2);
//     header.writeUInt32LE(il.length, 4);
//     const bytes = buildManagedPeFixture({
//       ilBody: Buffer.concat([header, il]),
//     });
//     const result = inspectManagedMembersBytes(
//       bytes,
//       managedPeFixtureTarget(bytes),
//     );
//
//     expect(result.coverage).toMatchObject({ state: "complete", issues: [] });
//     expect(result.types).toHaveLength(1);
//     expect(result.methods[0]?.body).toMatchObject({
//       status: "present",
//       il_size: il.length,
//       decoded_instruction_count: 54_001,
//       opcode_counts: { br: 54_000, ret: 1 },
//     });
//   });
//
//   it("still rejects dense one-byte instructions before exceeding capacity", () => {
//     // All NOPs: unlike wide instructions, each IL byte adds a decoded record.
//     // A true oversized transient must remain an actionable resource limit.
//     const il = Buffer.alloc(270_001);
//     il[il.length - 1] = 0x2a;
//     const header = Buffer.alloc(12);
//     header.writeUInt16LE(0x3003, 0);
//     header.writeUInt16LE(8, 2);
//     header.writeUInt32LE(il.length, 4);
//     const bytes = buildManagedPeFixture({
//       ilBody: Buffer.concat([header, il]),
//     });
//     const result = inspectManagedMembersBytes(
//       bytes,
//       managedPeFixtureTarget(bytes),
//     );
//
//     expect(result.coverage).toMatchObject({
//       state: "unavailable",
//       issues: [{ code: "resource-limit", scope: "metadata.representation" }],
//     });
//     // Report the originating IL coordinate, not a generic decoding error.
//     expect(result.coverage.issues[0]?.offset).toBeGreaterThan(0);
//     expect(result.types).toEqual([]);
//     expect(result.methods).toEqual([]);
//   });
//
//   it("charges decoded output rather than accumulated decoding bounds", () => {
//     // Each bound fits alone, but 256 bytes per IL and signature byte together
//     // exceed the 64 MiB budget although the retained members are small.
//     const il = Buffer.concat([Buffer.alloc(200_000), Buffer.from([0x2a])]);
//     const header = Buffer.alloc(12);
//     header.writeUInt16LE(0x3003, 0);
//     header.writeUInt16LE(8, 2);
//     header.writeUInt32LE(il.length, 4);
//     const bytes = buildManagedPeFixture({
//       ilBody: Buffer.concat([header, il]),
//       methodSignature: Buffer.concat([
//         Buffer.from([0x00, 0x00, 0x01]),
//         Buffer.alloc(80_000),
//       ]),
//     });
//     const result = inspectManagedMembersBytes(
//       bytes,
//       managedPeFixtureTarget(bytes),
//     );
//
//     expect(result.coverage.state).not.toBe("unavailable");
//     expect(result.methods[0]?.body).toMatchObject({
//       status: "present",
//       il_size: il.length,
//       opcode_counts: { nop: 200_000, ret: 1 },
//     });
//   });
//
//   it("bounds a method's IL and exception sections together", () => {
//     // Each bound fits alone; both stay live while one method is decoded.
//     const il = Buffer.concat([Buffer.alloc(159_999), Buffer.from([0x2a])]);
//     const header = Buffer.alloc(12);
//     header.writeUInt16LE(0x300b, 0);
//     header.writeUInt16LE(8, 2);
//     header.writeUInt32LE(il.length, 4);
//     const clauses = 110_000;
//     const section = Buffer.alloc(4 + clauses * 24);
//     section.writeUInt32LE(0x41 | ((4 + clauses * 24) << 8), 0);
//     const bytes = buildManagedPeFixture({
//       ilBody: Buffer.concat([header, il, section]),
//     });
//     const result = inspectManagedMembersBytes(
//       bytes,
//       managedPeFixtureTarget(bytes),
//     );
//
//     expect(result.coverage).toMatchObject({
//       state: "unavailable",
//       issues: [{ code: "resource-limit" }],
//     });
//   });
// });
//
// describe("managed derived edges", () => {
//   it("admits call edges before the derived graph exceeds the budget", () => {
//     const anchor = {
//       il_offset: 0,
//       opcode: "call",
//       operand_kind: "method",
//       operand: "0x0a000001",
//     };
//     const method = {
//       token: "0x06000001",
//       declaring_type: "T".repeat(2000),
//       name: "m",
//       body: { anchors: Array.from({ length: 40_000 }, () => anchor) },
//     } as unknown as ManagedMethod;
//
//     expect(() => edges([method], new Map(), new ManagedDecodeBudget())).toThrow(
//       ManagedReaderFailure,
//     );
//   });
// });
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
export const _l = 519;
