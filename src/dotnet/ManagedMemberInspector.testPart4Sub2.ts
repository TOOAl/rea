export const __stub = 1;
//   expect(signature(Buffer.from([0x06, 0x45, 0x08]))).toMatchObject({
//     parse_status: "unsupported",
//     issue: "unsupported element type 0x45",
//   });
// });
//
// it("decodes deeply nested generic instantiations without recursion", () => {
//   const depth = 4_000;
//   const decoded = signature(
//     Buffer.concat([
//       Buffer.from([0x06]),
//       Buffer.from(
//         Array.from({ length: depth }, () => [0x15, 0x12, 0x05, 0x01]).flat(),
//       ),
//       Buffer.from([0x08]),
//     ]),
//   );
//
//   expect(decoded).toMatchObject({
//     parse_status: "decoded",
//     field_type: `${"class:5<".repeat(depth)}i4${">".repeat(depth)}`,
//   });
// });
//
// it("preserves leading U+FEFF as metadata name content", () => {
//   const bytes = buildManagedPeFixture({
//     typeNamespace: "\uFEFFFixture",
//     typeName: "\uFEFFProgram",
//     methodName: "\uFEFFMain",
//     fieldName: "\uFEFFcounter",
//   });
//   const result = inspectManagedMembersBytes(
//     bytes,
//     managedPeFixtureTarget(bytes),
//   );
//   expect(result.types[0]?.full_name).toBe("\uFEFFFixture.\uFEFFProgram");
//   expect(result.methods[0]?.name).toBe("\uFEFFMain");
//   expect(result.fields[0]?.name).toBe("\uFEFFcounter");
//   expect(result.call_edges[0]?.caller).toBe(
//     "\uFEFFFixture.\uFEFFProgram.\uFEFFMain",
//   );
// });
//
// it.each([
//   { implFlags: 1, flags: 0, label: "native" },
//   { implFlags: 3, flags: 0, label: "runtime" },
//   { implFlags: 4, flags: 0, label: "unmanaged" },
//   { implFlags: 0, flags: 0x2000, label: "pinvoke" },
// ])(
//   "does not interpret $label implementations as CIL",
//   ({ implFlags, flags }) => {
//     const bytes = buildManagedPeFixture();
//     const original = inspectManagedMembersBytes(
//       bytes,
//       managedPeFixtureTarget(bytes),
//     );
//     const row = original.methods[0]?.row_offset;
//     expect(row).toBeDefined();
//     if (row === undefined) return;
//     bytes.writeUInt16LE(implFlags, row + 4);
//     bytes.writeUInt16LE(bytes.readUInt16LE(row + 6) | flags, row + 6);
//     const result = inspectManagedMembersBytes(
//       bytes,
//       managedPeFixtureTarget(bytes),
//     );
//     expect(result.methods[0]?.body).toMatchObject({
//       status: "partial",
//       header_format: "unknown",
//       rva: original.methods[0]?.rva,
//       il_sha256: null,
//       normalized_il_sha256: null,
//       anchors: [],
//     });
//     expect(result.methods[0]?.body.issue).toMatch(/CIL/u);
//     expect(result.coverage.state).toBe("partial");
//     expect(result.call_edges).toEqual([]);
//     expect(result.field_accesses).toEqual([]);
//   },
// );
//
// it.each([
//   { facet: "fields", nameOffset: 2 },
//   { facet: "methods", nameOffset: 8 },
//   { facet: "member_refs", nameOffset: 2 },
//   { facet: "types", nameOffset: 4 },
// ] as const)(
//   "preserves independent metadata when a $facet name is unreadable",
//   ({ facet, nameOffset }) => {
//     const bytes = buildManagedPeFixture();
//     const original = inspectManagedMembersBytes(
//       bytes,
//       managedPeFixtureTarget(bytes),
//     );
//     const row = original[facet][0]?.row_offset;
//     if (row === undefined) throw new Error(`Fixture must contain ${facet}`);
//     bytes.writeUInt16LE(0xffff, row + nameOffset);
//     const result = inspectManagedMembersBytes(
//       bytes,
//       managedPeFixtureTarget(bytes),
//     );
//
//     expect(result.module?.mvid).toBe(original.module?.mvid);
//     expect(result.metadata.status).toBe("partial");
//     expect(result[facet]).toEqual([]);
//     for (const remaining of [
//       "fields",
//       "methods",
//       "member_refs",
//       "types",
//     ] as const)
//       if (remaining !== facet)
//         expect(result[remaining]).toHaveLength(original[remaining].length);
//     expect(result.coverage).toMatchObject({
//       state: "partial",
//       issues: [
//         expect.objectContaining({
//           code: "invalid-heap-index",
//           scope: "metadata.#Strings",
//         }),
//       ],
//     });
//     if (facet === "types") {
//       expect(result.fields[0]).toMatchObject({
//         declaring_type_token: "0x02000001",
//         declaring_type: null,
//       });
//       expect(result.methods[0]).toMatchObject({
//         declaring_type_token: "0x02000001",
//         declaring_type: null,
//       });
//     }
//   },
// );
//
// describe("managed member type selection", () => {
//   const bytes = buildManagedPeFixture();
//   const target = managedPeFixtureTarget(bytes);
//   const everything = inspectManagedMembersBytes(bytes, target);
//
//   it("reports no selection when every type is inspected", () => {
//     expect(everything.selection).toBeNull();
//   });
//
//   it("decodes the selected type's members and reports unmatched names", () => {
//     const result = inspectManagedMembersBytes(bytes, target, {
//       typeNames: ["Fixture.Program", "Missing.Type"],
//     });
//
//     expect(result.selection).toEqual({
//       type_names: ["Fixture.Program", "Missing.Type"],
//       unmatched_type_names: ["Missing.Type"],
//     });
//     expect(result.types).toEqual(everything.types);
//     expect(result.fields).toEqual(everything.fields);
//     expect(result.methods).toEqual(everything.methods);
//     expect(result.call_edges).toEqual(everything.call_edges);
//     expect(result.field_accesses).toEqual(everything.field_accesses);
//     expect(result.coverage).toEqual(everything.coverage);
//     expect(result.limitations).toContain(
//       "Types, fields, methods, call edges, field accesses, and user strings cover only the selected declaring types; coverage describes that selection. Edge targets outside it keep their names but are not described.",
//     );
//   });
//
//   it("does not treat a name as absent when a TypeDef name is unreadable", () => {
//     const corrupt = Buffer.from(bytes);
//     const row = everything.types[0]?.row_offset ?? 0;
//     // Point the TypeDef Name past the #Strings heap.
//     corrupt.writeUInt16LE(0xffff, row + 4);
//     const result = inspectManagedMembersBytes(
//       corrupt,
//       managedPeFixtureTarget(corrupt),
//       { typeNames: ["Fixture.Program"] },
//     );
//
//     expect(result.selection?.unmatched_type_names).toEqual(["Fixture.Program"]);
//     expect(result.coverage.state).toBe("partial");
//     // Its methods were never inspected, so neither were their literals.
//     expect(result.user_strings?.state).toBe("partial");
//     expect(result.limitations).toContain(
//       "1 TypeDef name(s) could not be read; a name in selection.unmatched_type_names may belong to one of them, so its absence is not observed.",
//     );
//   });
//
//   it("omits members of unselected types without dropping member references", () => {
//     const result = inspectManagedMembersBytes(bytes, target, {
//       typeNames: ["Missing.Type"],
//     });
//
//     expect(result.selection).toEqual({
//       type_names: ["Missing.Type"],
//       unmatched_type_names: ["Missing.Type"],
//     });
//     expect(result.types).toEqual([]);
//     expect(result.fields).toEqual([]);
//     expect(result.methods).toEqual([]);
//     expect(result.call_edges).toEqual([]);
//     expect(result.field_accesses).toEqual([]);
//     expect(result.member_refs).toEqual(everything.member_refs);
//   });
// });
//
// describe("managed member method paging", () => {
//   it("returns only the requested MethodDef rows", () => {
//     const image = buildMultiMethodManagedPeFixture({
//       methods: [
//         { name: "First", body: Buffer.from([0x2a]) },
//         { name: "Second", body: Buffer.from([0x2a]) },
//         { name: "Third", body: Buffer.from([0x2a]) },
//       ],
//     });
//     const all = inspectManagedMembersBytes(
//       image,
//       managedPeFixtureTarget(image),
//     );
//     expect(all.methods.map(({ name }) => name)).toEqual([
//       "First",
//       "Second",
//       "Third",
//     ]);
//
//     const page = inspectManagedMembersBytes(
//       image,
//       managedPeFixtureTarget(image),
//       { methodOffset: 1, methodLimit: 1 },
//     );
//
//     expect(page.methods.map(({ name, token }) => ({ name, token }))).toEqual([
//       { name: "Second", token: "0x06000002" },
//     ]);
//     expect(page.coverage.state).toBe("complete");
//
//     const offsetOnly = inspectManagedMembersBytes(
//       image,
//       managedPeFixtureTarget(image),
//       { methodOffset: 1 },
//     );
//     expect(offsetOnly.methods.map(({ name }) => name)).toEqual([
//       "Second",
//       "Third",
//     ]);
//
//     const emptyPage = inspectManagedMembersBytes(
//       image,
//       managedPeFixtureTarget(image),
//       { methodOffset: 1, methodLimit: 0 },
//     );
//     expect(emptyPage.methods).toEqual([]);
//   });
//
//   it("rejects invalid method page bounds", () => {
//     const image = buildManagedPeFixture();
//     expect(() =>
//       inspectManagedMembersBytes(image, managedPeFixtureTarget(image), {
//         methodOffset: -1,
//       }),
//     ).toThrow(RangeError);
//   });
// });
export const _l = 258;
