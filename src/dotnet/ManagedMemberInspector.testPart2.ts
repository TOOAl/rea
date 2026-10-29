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
//       inspect({ ilBody }).methods[0]?.body.normalized_il_sha256,
//     );
//     expect(comparisonLimitations(result, result)).toContain(
//       "ldstr literals are not compared; normalized CIL keeps #US tokens rather than decoded text, so an unchanged method does not establish unchanged string literals.",
//     );
//   });
//
//   it("ignores a 0x70 token carried by an instruction other than ldstr", () => {
//     const { heap, tokens } = fixtureUserStringHeap(["not loaded"]);
//     const token = Number.parseInt(tokens[0] ?? "", 16);
//     const ldtoken = Buffer.from([0xd0, 0, 0, 0, 0, 0x26, 0x2a]);
//     ldtoken.writeUInt32LE(token, 1);
//     const result = inspect({
//       ilBody: Buffer.concat([
//         Buffer.from([(ldtoken.length << 2) | 2]),
//         ldtoken,
//       ]),
//       userStringHeap: heap,
//     });
//
//     expect(result.methods[0]?.body.anchors[0]).toMatchObject({
//       opcode: "ldtoken",
//       operand_kind: "string",
//     });
//     expect(result.user_strings?.literals).toEqual([]);
//   });
//
//   it("admits ldstr tokens before collecting them", () => {
//     const layout = { userStrings: null } as unknown as ManagedMetadataLayout;
//     // Leave 1 KiB of the 64 MiB budget: too little for 100 distinct tokens.
//     managedDecodeBudget(layout).reserve(64 * 1024 * 1024 - 1024, null);
//     const method = {
//       body: {
//         anchors: Array.from({ length: 100 }, (_, index) => ({
//           il_offset: index * 5,
//           opcode: "ldstr",
//           operand_kind: "string",
//           operand: `0x70${(index + 1).toString(16).padStart(6, "0")}`,
//         })),
//       },
//     } as unknown as ManagedMethod;
//
//     expect(() =>
//       parseUserStrings(Buffer.alloc(0), layout, {
//         methods: [method],
//         unscannedMethods: 0,
//       }),
//     ).toThrow(ManagedReaderFailure);
//   });
//
//   it("retains readable literals beside malformed #US items", () => {
//     const { heap, tokens } = fixtureUserStringHeap(["ok", "bad", "worse"]);
//     const [ok, bad, worse] = tokens as [string, string, string];
//     // "bad" encodes 7 bytes; an even length cannot end in the flag byte.
//     heap.writeUInt8(6, Number.parseInt(bad.slice(4), 16));
//     // 0xe0 is a reserved compressed-length prefix.
//     heap.writeUInt8(0xe0, Number.parseInt(worse.slice(4), 16));
//     const result = inspect({
//       ilBody: ldstrBody([ok, bad, worse, "0x70ffffff", "0x06000001"]),
//       userStringHeap: heap,
//     });
//
//     expect(result.user_strings?.literals).toEqual([
//       { token: ok, offset: expect.any(Number), value: "ok" },
//     ]);
//     expect(result.user_strings?.state).toBe("partial");
//     expect(
//       result.user_strings?.issues.map(({ code, scope }) => [code, scope]),
//     ).toEqual([
//       ["invalid-heap-index", "metadata.#US:0x06000001"],
//       ["invalid-string", `metadata.#US:${bad}`],
//       ["invalid-string", `metadata.#US:${worse}`],
//       ["invalid-heap-index", "metadata.#US:0x70ffffff"],
//     ]);
//   });
//
//   it("rejects #US items that run past the end of the stream", () => {
//     const { heap: readable, tokens } = fixtureUserStringHeap(["ok"]);
//     // An odd length claiming 127 bytes with two left, then a two-byte length
//     // prefix whose second byte lies past the stream end.
//     const crossing = Buffer.from([0x7f, 0x41, 0x00]);
//     const heap = Buffer.concat([readable, crossing, Buffer.from([0x80])]);
//     const token = (offset: number) =>
//       `0x70${offset.toString(16).padStart(6, "0")}`;
//     const crossingToken = token(readable.length);
//     const truncatedToken = token(readable.length + crossing.length);
//     const result = inspect({
//       ilBody: ldstrBody([tokens[0] ?? "", crossingToken, truncatedToken]),
//       userStringHeap: heap,
//     });
//
//     expect(result.user_strings?.literals).toEqual([
//       { token: tokens[0], offset: expect.any(Number), value: "ok" },
//     ]);
//     expect(result.user_strings).toMatchObject({
//       state: "partial",
//       issues: [crossingToken, truncatedToken].map((item) => ({
//         code: "invalid-string",
//         scope: `metadata.#US:${item}`,
//         detail: "User string leaves #US",
//       })),
//     });
//   });
//
//   it("leaves user strings unexamined when CLI metadata is unavailable or predates them", () => {
//     const native = buildNativePeFixture();
//     expect(
//       inspectManagedMembersBytes(native, managedPeFixtureTarget(native))
//         .user_strings,
//     ).toBeNull();
//
//     const { user_strings: _omitted, ...legacy } = inspect({});
//     const parsed = managedMemberInspectionSchema.parse(legacy);
//     expect(parsed.user_strings).toBeNull();
//     expect(comparisonLimitations(parsed, inspect({}))).toContain(
//       "ldstr literals are not compared; normalized CIL keeps #US tokens rather than decoded text, so an unchanged method does not establish unchanged string literals.",
//     );
//   });
// });
//
// describe("managed user string issues", () => {
//   const inspect = (options: Parameters<typeof buildManagedPeFixture>[0]) => {
//     const bytes = buildManagedPeFixture(options);
//     return inspectManagedMembersBytes(bytes, managedPeFixtureTarget(bytes));
//   };
//
//   it("reports a missing #US stream once and keeps the method", () => {
//     const result = inspect({
//       // A MethodDef operand is not a #US reference, so it is reported alone.
//       ilBody: ldstrBody([
//         "0x70000001",
//         "0x70000005",
//         "0x70000001",
//         "0x06000001",
//       ]),
//     });
//
//     expect(result.methods).toHaveLength(1);
//     expect(result.coverage.state).toBe("complete");
//     expect(result.user_strings).toEqual({
//       state: "partial",
//       literals: [],
//       issues: [
//         {
//           code: "invalid-heap-index",
//           scope: "metadata.#US:0x06000001",
//           offset: null,
//           detail: "ldstr operand does not name an item inside #US",
//         },
//         {
//           code: "missing-stream",
//           scope: "metadata.#US",
//           offset: null,
//           detail:
//             "2 distinct ldstr operand(s) reference #US, but the metadata has no #US stream",
//         },
//       ],
//     });
//   });
//
//   it("rejects a nonempty item at the reserved #US offset 0", () => {
//     // "A" with its flag, where only the empty entry may sit.
//     const result = inspect({
//       ilBody: ldstrBody(["0x70000000"]),
//       userStringHeap: Buffer.from([3, 0x41, 0, 0]),
//     });
//
//     expect(result.user_strings?.literals).toEqual([]);
//     expect(result.user_strings).toMatchObject({
//       state: "partial",
//       issues: [{ code: "invalid-string", scope: "metadata.#US:0x70000000" }],
//     });
//   });
//
//   it.each([
//     // "ok" is 5 bytes, which ECMA-335 encodes in one prefix byte, not 0x80 0x05.
//     ["0x70000001", [0, 0x80, 0x05, 0x6f, 0, 0x6b, 0, 0], "ok"],
//     // The empty entry at offset 0 is the single byte 0x00, not 0x80 0x00.
//     ["0x70000000", [0x80, 0x00], ""],
//   ])(
//     "keeps %s when its length prefix is wider than ECMA-335 assigns",
//     (token, heap, value) => {
//       const result = inspect({
//         ilBody: ldstrBody([token]),
//         userStringHeap: Buffer.from(heap),
//       });
//
//       expect(result.user_strings?.literals).toEqual([
//         { token, offset: expect.any(Number), value },
//       ]);
//       expect(result.user_strings).toMatchObject({
//         state: "partial",
//         issues: [
//           {
//             code: "invalid-string",
//             scope: `metadata.#US:${token}`,
//             detail: expect.stringContaining("prefix wider than ECMA-335"),
//           },
//         ],
//       });
//     },
//   );
//
//   it("admits no width issue for an item that then fails", () => {
//     // 64 overlong zero lengths away from offset 0: each item is fatal.
//     const heap = Buffer.concat([
//       Buffer.from([0]),
//       ...Array.from({ length: 64 }, () => Buffer.from([0x80, 0x00])),
//     ]);
//     const layout = {
//       userStrings: { name: "#US", offset: 0, size: heap.length },
//     } as unknown as ManagedMetadataLayout;
//     // Leave 24 KiB: enough for the failures, not for 512 bytes leaked each.
//     managedDecodeBudget(layout).reserve(64 * 1024 * 1024 - 24 * 1024, null);
//     const method = {
//       body: {
//         anchors: Array.from({ length: 64 }, (_, index) => ({
//           il_offset: index * 5,
//           opcode: "ldstr",
//           operand_kind: "string",
//           operand: `0x70${(1 + index * 2).toString(16).padStart(6, "0")}`,
//         })),
//       },
//     } as unknown as ManagedMethod;
//
//     expect(
//       parseUserStrings(heap, layout, { methods: [method], unscannedMethods: 0 })
//         .issues,
//     ).toHaveLength(64);
//   });
//
//   it("keeps literals whose terminal flag differs from ECMA-335 and reports each flag", () => {
//     const { heap, tokens } = fixtureUserStringHeap(["ok", "it's"]);
//     const [ok, quoted] = tokens as [string, string];
//     // A short item is a one-byte length, the UTF-16 text, then the flag byte.
//     const flagAt = (token: string, value: string) =>
//       Number.parseInt(token.slice(4), 16) + 1 + value.length * 2;
//     heap.writeUInt8(1, flagAt(ok, "ok"));
//     heap.writeUInt8(0, flagAt(quoted, "it's"));
//     const result = inspect({
//       ilBody: ldstrBody([ok, quoted]),
//       userStringHeap: heap,
//     });
//
//     expect(result.coverage.state).toBe("complete");
//     expect(result.user_strings?.literals.map(({ value }) => value)).toEqual([
//       "ok",
//       "it's",
//     ]);
//     expect(result.user_strings).toMatchObject({
//       state: "partial",
//       issues: [ok, quoted].map((token) => ({
//         code: "invalid-string",
//         scope: `metadata.#US:${token}`,
//         detail: expect.stringContaining("terminal flag"),
//       })),
//     });
//   });
// });
//
export const _l = 519;
