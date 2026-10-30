export const __stub = 1;
//       result.coverage.issues.map(({ code, scope }) => [code, scope]),
//     ).toEqual([
//       ["invalid-blob", "metadata.MethodSpec:0x2b000001"],
//       ["invalid-row", "metadata.MethodSpec:0x2b000002"],
//       ["invalid-blob", "metadata.MethodSpec:0x2b000002"],
//     ]);
//   });
// });
//
// describe("managed nested types", () => {
//   const inspectNested = (
//     options: Parameters<typeof buildManagedNestedTypeFixture>[0] = {},
//   ) => {
//     const bytes = buildManagedNestedTypeFixture(options);
//     return inspectManagedMembersBytes(
//       bytes,
//       managedPeFixtureTarget(bytes, "/fixture/nested.dll"),
//     );
//   };
//
//   it("reports the enclosing type of each nested type", () => {
//     const result = inspectNested();
//
//     expect(
//       result.types.map(({ full_name, enclosing_type_token }) => [
//         full_name,
//         enclosing_type_token,
//       ]),
//     ).toEqual([
//       ["<Module>", null],
//       ["Fixture.A", null],
//       ["Fixture.B", null],
//       ["Inner", "0x02000002"],
//       ["Inner", "0x02000003"],
//       ["Leaf", "0x02000004"],
//     ]);
//     expect(result.nesting_read).toBe(true);
//     expect(result.coverage.issues).toEqual([]);
//   });
//
//   it.each([2, 3, 4, 5, 6, 7])(
//     "keeps nested visibility %i unresolved when its parent entry is missing",
//     (visibility) => {
//       const bytes = buildManagedNestedTypeFixture({ nestedClassRows: [] });
//       const target = () => managedPeFixtureTarget(bytes, "/fixture/nested.dll");
//       const row = inspectManagedMembersBytes(bytes, target()).types.find(
//         (type) => type.token === "0x02000004",
//       )!.row_offset;
//       bytes.writeUInt32LE((bytes.readUInt32LE(row) & ~7) | visibility, row);
//       const result = inspectManagedMembersBytes(bytes, target());
//       expect(result.nesting_read).toBe(true);
//       expect(
//         result.types.find((type) => type.token === "0x02000004"),
//       ).toMatchObject({ enclosing_type_token: null, name_sha256: null });
//       expect(result.coverage.issues).toContainEqual(
//         expect.objectContaining({
//           code: "invalid-row",
//           scope: "metadata.TypeDef:0x02000004",
//           offset: row,
//         }),
//       );
//     },
//   );
//
//   it("retains a selected child's contradictory parent issue exactly once", () => {
//     const bytes = buildManagedNestedTypeFixture();
//     const target = () => managedPeFixtureTarget(bytes, "/fixture/nested.dll");
//     const row = inspectManagedMembersBytes(bytes, target()).types.find(
//       (type) => type.token === "0x02000004",
//     )!.row_offset;
//     bytes.writeUInt32LE((bytes.readUInt32LE(row) & ~7) | 1, row);
//     const result = inspectManagedMembersBytes(bytes, target(), {
//       typeNames: ["Leaf"],
//     });
//     expect(result.types).toHaveLength(1);
//     expect(result.types[0]?.name_sha256).toBeNull();
//     expect(result.coverage.state).toBe("partial");
//     expect(
//       result.coverage.issues.filter(
//         (issue) => issue.scope === "metadata.TypeDef:0x02000004",
//       ),
//     ).toEqual([expect.objectContaining({ code: "invalid-row", offset: row })]);
//   });
//
//   it("reports NestedClass rows that do not pair distinct existing types once", () => {
//     const result = inspectNested({
//       nestedClassRows: [
//         [4, 4],
//         [5, 3],
//         [5, 2],
//         [6, 9],
//         [0, 2],
//         [4, 0],
//         [9, 2],
//       ],
//     });
//
//     expect(
//       result.types.map(({ enclosing_type_token }) => enclosing_type_token),
//     ).toEqual([null, null, null, null, "0x02000003", null]);
//     expect(result.nesting_read).toBe(false);
//     expect(
//       result.coverage.issues.map(({ code, scope }) => [code, scope]),
//     ).toEqual([
//       ["invalid-row", "metadata.NestedClass:0x29000001"],
//       ["invalid-row", "metadata.NestedClass:0x29000003"],
//       ["invalid-row", "metadata.NestedClass:0x29000004"],
//       ["invalid-row", "metadata.NestedClass:0x29000005"],
//       ["invalid-row", "metadata.NestedClass:0x29000006"],
//       ["invalid-row", "metadata.NestedClass:0x29000007"],
//     ]);
//   });
// });
//
// describe("managed exported types", () => {
//   it("reports type forwarders and nested exported types with their implementation scope", () => {
//     const bytes = buildManagedPeFixture({
//       exportedTypes: [
//         {
//           namespace: "System",
//           name: "Object",
//           flags: 0x0020_0001,
//           implementationRaw: (1 << 2) | 1,
//         },
//         {
//           namespace: "",
//           name: "Enumerator",
//           flags: 0x0000_0002,
//           implementationRaw: (1 << 2) | 2,
//         },
//       ],
//     });
//     const result = inspectManagedMembersBytes(
//       bytes,
//       managedPeFixtureTarget(bytes),
//     );
//
//     expect(result.metadata.table_row_counts).toMatchObject({
//       ExportedType: 2,
//     });
//     expect(result.exported_types).toMatchObject([
//       {
//         token: "0x27000001",
//         namespace: "System",
//         name: "Object",
//         flags: 0x0020_0001,
//         forwarder: true,
//         type_def_id: 0,
//         implementation_token: "0x23000001",
//       },
//       {
//         token: "0x27000002",
//         namespace: "",
//         name: "Enumerator",
//         forwarder: false,
//         implementation_token: "0x27000001",
//       },
//     ]);
//     expect(result.coverage).toEqual({ state: "complete", issues: [] });
//   });
//
//   it("leaves exported types unknown when CLI metadata is unavailable", () => {
//     const bytes = buildNativePeFixture();
//     const result = inspectManagedMembersBytes(
//       bytes,
//       managedPeFixtureTarget(bytes),
//     );
//
//     expect(result.coverage.state).toBe("unavailable");
//     expect(result.exported_types).toBeNull();
//   });
//
//   it("reads member Evidence recorded before exported types as unexamined", () => {
//     const bytes = buildManagedPeFixture();
//     const { exported_types: _omitted, ...legacy } = inspectManagedMembersBytes(
//       bytes,
//       managedPeFixtureTarget(bytes),
//     );
//     const parsed = managedMemberInspectionSchema.parse(legacy);
//
//     expect(parsed.exported_types).toBeNull();
//     expect(comparisonLimitations(parsed, parsed)).toContain(
//       "At least one managed member observation predates ExportedType inspection; its exported and forwarded types are unknown.",
//     );
//   });
//
//   it("retains an exported type whose implementation is out of range as partial", () => {
//     const bytes = buildManagedPeFixture({
//       exportedTypes: [
//         {
//           namespace: "System",
//           name: "Object",
//           flags: 0x0020_0001,
//           implementationRaw: (9 << 2) | 1,
//         },
//       ],
//     });
//     const result = inspectManagedMembersBytes(
//       bytes,
//       managedPeFixtureTarget(bytes),
//     );
//
//     expect(result.exported_types).toMatchObject([
//       { token: "0x27000001", name: "Object", implementation_token: null },
//     ]);
//     expect(result.coverage).toMatchObject({
//       state: "partial",
//       issues: [
//         {
//           code: "invalid-row",
//           scope: "metadata.ExportedType:0x27000001",
//           detail: expect.stringContaining(
//             "ExportedType implementation coded index 0x25 is invalid",
//           ),
//         },
//       ],
//     });
//   });
// });
//
// describe("managed user strings", () => {
//   const inspect = (options: Parameters<typeof buildManagedPeFixture>[0]) => {
//     const bytes = buildManagedPeFixture(options);
//     return inspectManagedMembersBytes(bytes, managedPeFixtureTarget(bytes));
//   };
//
//   it("decodes each loaded literal once, in token order, without changing CIL tokens", () => {
//     const { heap, tokens } = fixtureUserStringHeap([
//       "quicksave.peak",
//       "unused",
//       "Ünïcødé 𝄞",
//       "\ud800",
//     ]);
//     const [path, , unicode, lone] = tokens as [string, string, string, string];
//     // 0x70000000 names the heap's empty entry at offset 0.
//     const empty = "0x70000000";
//     const ilBody = ldstrBody([unicode, path, lone, path, empty]);
//     const result = inspect({ ilBody, userStringHeap: heap });
//
//     expect(result.user_strings?.literals).toEqual([
//       { token: empty, offset: expect.any(Number), value: "" },
//       { token: path, offset: expect.any(Number), value: "quicksave.peak" },
//       { token: unicode, offset: expect.any(Number), value: "Ünïcødé 𝄞" },
//       { token: lone, offset: expect.any(Number), value: "\ud800" },
//     ]);
//     expect(result.coverage).toEqual({ state: "complete", issues: [] });
//     expect(result.user_strings).toMatchObject({
//       state: "complete",
//       issues: [],
//     });
//     const body = result.methods[0]?.body;
//     expect(body?.anchors.map(({ operand }) => operand)).toEqual([
//       unicode,
//       path,
//       lone,
//       path,
//       empty,
//     ]);
//     expect(body?.normalized_il_sha256).toBe(
export const _l = 259;
