export const __stub = 1;
//
//       expect(result.member_refs[0]?.parent_name).toBeNull();
//       expect(result.coverage).toMatchObject({
//         state: "partial",
//         issues: [{ code, scope }],
//       });
//     },
//   );
//
//   it("reports unsupported TypeSpec and MethodSpec forms instead of treating them as unknown", () => {
//     const typeSpec = memberRefOnTypeSpec(Buffer.from([0xff]));
//     const methodSpec = inspect({
//       memberRefSignature: genericRef,
//       methodSpecMethods: [(1 << 1) | 1],
//       methodSpecInstantiation: Buffer.from([0x0a, 0x01, 0xff]),
//       ilBody: tokenBody([[call, 0x2b00_0001]]),
//     });
//
//     expect(typeSpec.member_refs[0]?.parent_name).toBeNull();
//     expect(typeSpec.coverage).toMatchObject({
//       state: "partial",
//       issues: [
//         {
//           code: "unsupported-signature",
//           scope: "metadata.TypeSpec:0x1b000001",
//         },
//       ],
//     });
//     expect(methodSpec.coverage).toMatchObject({
//       state: "partial",
//       issues: [
//         {
//           code: "unsupported-signature",
//           scope: "metadata.MethodSpec:0x2b000001",
//         },
//       ],
//     });
//   });
//
//   it("names field MemberRefs as fields and leaves mismatched member kinds unnamed", () => {
//     const result = inspect({
//       memberRefName: "Empty",
//       // FIELD string
//       memberRefSignature: Buffer.from([0x06, 0x0e]),
//       ilBody: tokenBody([
//         [ldsfld, 0x0a00_0001],
//         [call, 0x0400_0001],
//       ]),
//     });
//     const methodRef = inspect({ ilBody: tokenBody([[ldsfld, 0x0a00_0001]]) });
//     const flaggedField = inspect({
//       memberRefName: "Empty",
//       // GENERIC | FIELD string: FieldSig allows no flags.
//       memberRefSignature: Buffer.from([0x16, 0x0e]),
//       ilBody: tokenBody([[ldsfld, 0x0a00_0001]]),
//     });
//
//     expect(result.field_accesses).toMatchObject([
//       { field_name: "Empty", field_declaring_type: attribute },
//     ]);
//     expect(methodRef.field_accesses).toMatchObject([
//       { field_name: null, field_declaring_type: null },
//     ]);
//     expect(flaggedField.field_accesses).toMatchObject([
//       { field_name: null, field_declaring_type: null },
//     ]);
//     expect(flaggedField.coverage.state).toBe("partial");
//     expect(result.call_edges).toMatchObject([
//       {
//         target_kind: "unknown",
//         target_name: null,
//         target_declaring_type: null,
//       },
//     ]);
//   });
//
//   it("reads Evidence recorded before declaring types were named as unknown", () => {
//     const current = inspect({});
//     const parsed = managedMemberInspectionSchema.parse({
//       ...current,
//       member_refs: current.member_refs.map(
//         ({ parent_name: _omitted, ...legacy }) => legacy,
//       ),
//       call_edges: current.call_edges.map(
//         ({ target_declaring_type: _omitted, ...legacy }) => legacy,
//       ),
//       field_accesses: current.field_accesses.map(
//         ({ field_declaring_type: _omitted, ...legacy }) => legacy,
//       ),
//     });
//
//     expect(parsed.member_refs[0]?.parent_name).toBeNull();
//     expect(parsed.call_edges[0]?.target_declaring_type).toBeNull();
//     expect(parsed.field_accesses[0]?.field_declaring_type).toBeNull();
//   });
// });
//
// describe("managed TypeRef resolution scopes", () => {
//   it.each([
//     // AssemblyRef 9 does not exist.
//     ["an invalid", (9 << 2) | 2, "is invalid"],
//     // The TypeRef is its own enclosing type.
//     ["a cyclic", (1 << 2) | 3, "contains a cycle"],
//   ])(
//     "keeps a TypeRef name beside %s resolution scope",
//     (_case, typeRefScopeRaw, detail) => {
//       const result = inspect({ typeRefScopeRaw });
//
//       expect(result.member_refs[0]?.parent_name).toBe(attribute);
//       expect(result.call_edges[0]?.target_declaring_type).toBe(attribute);
//       expect(result.coverage).toMatchObject({
//         state: "partial",
//         issues: [
//           {
//             code: "invalid-row",
//             scope: "metadata.TypeRef:0x01000001",
//             detail: expect.stringContaining(detail),
//           },
//         ],
//       });
//     },
//   );
// });
//
// describe("managed MethodSpec call targets", () => {
//   it("names generic method calls after the method they instantiate", () => {
//     const result = inspect({
//       memberRefSignature: genericRef,
//       methodSignature: genericDef,
//       methodSpecMethods: [(1 << 1) | 1, (1 << 1) | 0],
//       ilBody: tokenBody([
//         [call, 0x2b00_0001],
//         [call, 0x2b00_0002],
//       ]),
//     });
//
//     expect(
//       result.call_edges.map((edge) => [
//         edge.target_kind,
//         edge.target_name,
//         edge.target_declaring_type,
//       ]),
//     ).toEqual([
//       ["method-spec", ".ctor", attribute],
//       ["method-spec", "Main", "Fixture.Program"],
//     ]);
//     expect(result.coverage).toEqual({ state: "complete", issues: [] });
//   });
//
//   it.each([
//     [
//       "a non-generic method",
//       {},
//       Buffer.from([0x0a, 0x01, 0x0e]),
//       "but its method declares 0 generic parameter(s)",
//     ],
//     [
//       "the wrong number of type arguments",
//       { memberRefSignature: genericRef },
//       Buffer.from([0x0a, 0x02, 0x0e, 0x08]),
//       "supplies 2 type argument(s), but its method declares 1",
//     ],
//     [
//       "a field reference",
//       { memberRefSignature: Buffer.from([0x06, 0x0e]) },
//       Buffer.from([0x0a, 0x01, 0x0e]),
//       "does not have a decodable method signature",
//     ],
//     [
//       "a property signature",
//       // PROPERTY | GENERIC, one generic parameter, no parameters, void.
//       { memberRefSignature: Buffer.from([0x18, 0x01, 0x00, 0x01]) },
//       Buffer.from([0x0a, 0x01, 0x0e]),
//       "does not have a decodable method signature",
//     ],
//     [
//       "a truncated signature",
//       // HASTHIS | GENERIC, one generic parameter, no parameters, no return type.
//       { memberRefSignature: Buffer.from([0x30, 0x01, 0x00]) },
//       Buffer.from([0x0a, 0x01, 0x0e]),
//       "does not have a decodable method signature",
//     ],
//     [
//       "a type argument naming a missing TypeRef",
//       { memberRefSignature: genericRef },
//       Buffer.from([0x0a, 0x01, 0x12, (9 << 2) | 1]),
//       "TypeDefOrRefOrSpec operand 0x25 is invalid",
//     ],
//     [
//       "an unmanaged-convention signature",
//       // C | GENERIC: a function pointer convention, not a MethodRefSig one.
//       { memberRefSignature: Buffer.from([0x11, 0x01, 0x00, 0x01]) },
//       Buffer.from([0x0a, 0x01, 0x0e]),
//       "does not have a decodable method signature",
//     ],
//   ])(
//     "reports a MethodSpec that instantiates %s",
//     (_case, options, methodSpecInstantiation, detail) => {
//       const result = inspect({
//         ...options,
//         methodSpecMethods: [(1 << 1) | 1],
//         methodSpecInstantiation,
//         ilBody: tokenBody([[call, 0x2b00_0001]]),
//       });
//
//       expect(result.coverage).toMatchObject({
//         state: "partial",
//         issues: [
//           {
//             code: "invalid-row",
//             scope: "metadata.MethodSpec:0x2b000001",
//             detail: expect.stringContaining(detail),
//           },
//         ],
//       });
//     },
//   );
//
//   it("never names a field through a MethodSpec", () => {
//     const result = inspect({
//       memberRefName: "Empty",
//       // FIELD string: a MethodSpec on it is malformed.
//       memberRefSignature: Buffer.from([0x06, 0x0e]),
//       methodSpecMethods: [(1 << 1) | 1],
//       ilBody: tokenBody([
//         [ldsfld, 0x2b00_0001],
//         [call, 0x2b00_0001],
//       ]),
//     });
//
//     expect(result.field_accesses).toMatchObject([
//       { field_name: null, field_declaring_type: null },
//     ]);
//     expect(result.call_edges).toMatchObject([
//       { target_name: null, target_declaring_type: null },
//     ]);
//     expect(result.coverage.state).toBe("partial");
//   });
//
//   it("keeps a readable MethodSpec method beside a malformed instantiation", () => {
//     const result = inspect({
//       methodSpecMethods: [(1 << 1) | 1, (9 << 1) | 1],
//       methodSpecInstantiation: Buffer.from([0x0a, 0x00]),
//       ilBody: tokenBody([
//         [call, 0x2b00_0001],
//         [call, 0x2b00_0002],
//       ]),
//     });
//
//     expect(
//       result.call_edges.map(({ target_name, target_declaring_type }) => [
//         target_name,
//         target_declaring_type,
//       ]),
//     ).toEqual([
//       [".ctor", attribute],
//       [null, null],
//     ]);
//     expect(result.coverage.state).toBe("partial");
//     expect(
export const _l = 260;
