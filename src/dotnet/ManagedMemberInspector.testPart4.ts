export const __stub = 1;
//     );
//   });
//
//   it("reports a null required MemberRef parent without dropping the reference", () => {
//     const bytes = buildManagedPeFixture({ memberRefParentRaw: 0 });
//     const result = inspectManagedMembersBytes(
//       bytes,
//       managedPeFixtureTarget(bytes),
//     );
//
//     expect(result.member_refs[0]).toMatchObject({
//       token: "0x0a000001",
//       parent_token: null,
//     });
//     expect(result.coverage).toMatchObject({
//       state: "partial",
//       issues: [
//         expect.objectContaining({
//           code: "invalid-row",
//           detail:
//             "MemberRef parent coded index 0x0 is null, but the Class column must reference a row",
//         }),
//       ],
//     });
//   });
//
//   it("decodes deeply nested supported pointer signatures without recursion", () => {
//     const depth = 8_000;
//     const bytes = buildManagedPeFixture({
//       fieldSignature: Buffer.concat([
//         Buffer.from([0x06]),
//         Buffer.alloc(depth, 0x0f),
//         Buffer.from([0x08]),
//       ]),
//     });
//     const result = inspectManagedMembersBytes(
//       bytes,
//       managedPeFixtureTarget(bytes),
//     );
//
//     expect(result.fields[0]?.signature).toMatchObject({
//       kind: "field",
//       parse_status: "decoded",
//       field_type: `${"i4"}${"*".repeat(depth)}`,
//       issue: null,
//     });
//     expect(result.methods[0]?.body.status).toBe("present");
//     expect(result.coverage).toMatchObject({ state: "complete", issues: [] });
//   });
// });
//
// it.each([
//   Buffer.alloc(0),
//   Buffer.from([0]),
//   Buffer.from([0, 0, 0x12]),
//   Buffer.from([0x10, 0x80]),
//   Buffer.from([0, 0xe0]),
// ])(
//   "marks incomplete or reserved method signatures malformed: %j",
//   (methodSignature) => {
//     const bytes = buildManagedPeFixture({ methodSignature });
//     const result = inspectManagedMembersBytes(
//       bytes,
//       managedPeFixtureTarget(bytes),
//     );
//     expect(result.methods[0]?.signature).toMatchObject({
//       parse_status: "malformed",
//       kind: "unknown",
//     });
//   },
// );
//
// it("decodes generic instantiation member signatures as complete coverage", () => {
//   // System.Runtime.Caching 0x06000001: instance void (Dictionary<string, object>)
//   // shape, with TypeRef/TypeSpec coded tokens kept as encoded.
//   const bytes = buildManagedPeFixture({
//     methodSignature: Buffer.from([
//       0x00, 0x01, 0x01, 0x15, 0x12, 0x09, 0x01, 0x0e,
//     ]),
//     fieldSignature: Buffer.from([
//       0x06, 0x15, 0x11, 0x0d, 0x02, 0x13, 0x00, 0x1e, 0x01,
//     ]),
//     typeReferences: [
//       { namespace: "System", name: "Func`1" },
//       { namespace: "System", name: "ValueTuple`2" },
//     ],
//   });
//   const result = inspectManagedMembersBytes(
//     bytes,
//     managedPeFixtureTarget(bytes),
//   );
//
//   expect(result.methods[0]?.signature).toMatchObject({
//     parse_status: "decoded",
//     return_type: "void",
//     parameter_types: ["class:9<string>"],
//     issue: null,
//   });
//   expect(result.fields[0]?.signature).toMatchObject({
//     parse_status: "decoded",
//     field_type: "valuetype:13<var:0,mvar:1>",
//   });
//   expect(result.coverage).toMatchObject({ state: "complete", issues: [] });
// });
//
// it.each([
//   ["single-dimension general array", [0x14, 0x08, 0x01, 0x00, 0x00], "i4[...]"],
//   [
//     "sized array with signed lower bounds",
//     [0x14, 0x08, 0x02, 0x02, 0x04, 0x03, 0x02, 0x02, 0x7f],
//     "i4[1...4,-1...1]",
//   ],
//   [
//     "partially bounded array",
//     [0x14, 0x0e, 0x03, 0x01, 0x05, 0x00],
//     "string[5,,]",
//   ],
//   [
//     "function pointer",
//     [0x1b, 0x00, 0x02, 0x08, 0x0e, 0x1c],
//     "fnptr[default](string,object)->i4",
//   ],
//   ["required modifier", [0x1f, 0x09, 0x08], "i4 modreq:9"],
//   [
//     "optional modifier under a pointer",
//     [0x0f, 0x20, 0x0d, 0x08],
//     "i4 modopt:13*",
//   ],
//   [
//     "adjacent modifiers in source order",
//     [0x1f, 0x05, 0x20, 0x09, 0x08],
//     "i4 modreq:5 modopt:9",
//   ],
//   [
//     "modifier runs separated by a pointer",
//     [0x1f, 0x05, 0x0f, 0x20, 0x09, 0x08],
//     "i4 modopt:9* modreq:5",
//   ],
//   [
//     "unmanaged cdecl function pointer",
//     [0x1b, 0x01, 0x01, 0x01, 0x18],
//     "fnptr[c](native-int)->void",
//   ],
//   [
//     "array of generic instantiations",
//     [0x1d, 0x15, 0x12, 0x05, 0x01, 0x14, 0x08, 0x01, 0x01, 0x03, 0x00],
//     "class:5<i4[3]>[]",
//   ],
// ])("decodes a %s field signature", (_name, type, expected) => {
//   expect(signature(Buffer.from([0x06, ...type]))).toMatchObject({
//     kind: "field",
//     parse_status: "decoded",
//     field_type: expected,
//     issue: null,
//   });
// });
//
// it.each([
//   ["generic instantiation without arguments", [0x15, 0x12, 0x05, 0x00]],
//   ["generic instantiation of a primitive", [0x15, 0x08, 0x05, 0x01, 0x08]],
//   ["zero-rank array", [0x14, 0x08, 0x00, 0x00, 0x00]],
//   [
//     "array with more sizes than dimensions",
//     [0x14, 0x08, 0x01, 0x02, 0x01, 0x01, 0x00],
//   ],
//   ["truncated generic argument list", [0x15, 0x12, 0x05, 0x02, 0x08]],
//   ["truncated function pointer", [0x1b, 0x00, 0x01, 0x08]],
//   ["function pointer with a field header", [0x1b, 0x06, 0x00, 0x01]],
//   ["function pointer with a reserved flag", [0x1b, 0x80, 0x00, 0x01]],
//   [
//     "function pointer with explicit-this but no has-this",
//     [0x1b, 0x40, 0x00, 0x01],
//   ],
//   ["typed reference field", [0x16]],
//   ["modified typed reference field", [0x20, 0x09, 0x16]],
//   ["typed reference generic argument", [0x15, 0x12, 0x05, 0x01, 0x16]],
//   ["typed reference array element", [0x1d, 0x16]],
//   ["by-reference generic argument", [0x15, 0x12, 0x05, 0x01, 0x10, 0x08]],
//   ["void generic argument", [0x15, 0x12, 0x05, 0x01, 0x01]],
//   ["void function pointer parameter", [0x1b, 0x00, 0x01, 0x01, 0x01]],
//   ["by-reference pointee", [0x0f, 0x10, 0x08]],
//   ["nested by-reference", [0x10, 0x10, 0x08]],
//   ["void field", [0x01]],
//   ["void array element", [0x1d, 0x01]],
// ])("reports a %s as malformed", (_name, type) => {
//   expect(signature(Buffer.from([0x06, ...type]))).toMatchObject({
//     kind: "unknown",
//     parse_status: "malformed",
//   });
// });
//
// it.each([
//   ["a property header", [0x08, 0x00, 0x08]],
//   ["an explicit-this header without has-this", [0x40, 0x00, 0x01]],
//   ["a C calling convention header", [0x01, 0x00, 0x01]],
//   ["a generic vararg header", [0x15, 0x01, 0x00, 0x01]],
// ])("reports %s as a malformed member signature", (_name, blob) => {
//   expect(signature(Buffer.from(blob))).toMatchObject({
//     kind: "unknown",
//     parse_status: "malformed",
//   });
// });
//
// it("rejects array ranks beyond the CLR limit before rendering dimensions", () => {
//   expect(
//     signature(
//       Buffer.from([0x06, 0x14, 0x08, 0xdf, 0xff, 0xff, 0xff, 0x00, 0x00]),
//     ),
//   ).toMatchObject({
//     parse_status: "unsupported",
//     issue: "array rank 536870911 exceeds the 32 dimensions the CLR supports",
//   });
//   expect(
//     signature(Buffer.from([0x06, 0x14, 0x08, 0x20, 0x00, 0x00])),
//   ).toMatchObject({
//     parse_status: "decoded",
//     field_type: `i4[${",".repeat(31)}]`,
//   });
// });
//
// it("decodes typed references in parameter and return positions", () => {
//   expect(
//     signature(Buffer.from([0x00, 0x02, 0x16, 0x20, 0x09, 0x16, 0x08])),
//   ).toMatchObject({
//     kind: "method",
//     parse_status: "decoded",
//     return_type: "typedbyref",
//     parameter_types: ["typedbyref modopt:9", "i4"],
//   });
//   expect(
//     signature(Buffer.from([0x06, 0x1b, 0x20, 0x01, 0x01, 0x16])),
//   ).toMatchObject({
//     parse_status: "decoded",
//     field_type: "fnptr[default has-this](typedbyref)->void",
//   });
// });
//
// it.each([
//   ["by-reference field", [0x06, 0x10, 0x08], { field_type: "i4&" }],
//   ["void pointer field", [0x06, 0x0f, 0x01], { field_type: "void*" }],
//   [
//     "by-reference function pointer return and parameter",
//     [0x06, 0x1b, 0x00, 0x01, 0x10, 0x08, 0x10, 0x0e],
//     { field_type: "fnptr[default](string&)->i4&" },
//   ],
//   [
//     "by-reference method return and parameter",
//     [0x00, 0x01, 0x10, 0x08, 0x10, 0x15, 0x12, 0x05, 0x01, 0x0f, 0x01],
//     { return_type: "i4&", parameter_types: ["class:5<void*>&"] },
//   ],
// ])("decodes a %s in its grammar position", (_name, blob, expected) => {
//   expect(signature(Buffer.from(blob))).toMatchObject({
//     parse_status: "decoded",
//     ...expected,
//   });
// });
//
// it("keeps element types that member signatures do not assign unsupported", () => {
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
export const _l = 516;
