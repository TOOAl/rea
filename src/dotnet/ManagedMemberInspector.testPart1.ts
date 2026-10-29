export const __stub = 1;
// import { describe, expect, it } from "vitest";
//
// import { inspectManagedMembersBytes } from "./ManagedMemberInspector.js";
// import {
//   ManagedDecodeBudget,
//   managedDecodeBudget,
// } from "./ManagedDecodeBudget.js";
// import {
//   metadataRowOffset,
//   readManagedMetadataLayout,
//   type ManagedMetadataLayout,
// } from "./ManagedMetadataLayout.js";
// import { readManagedPeLayout } from "./ManagedPeReader.js";
// import { memberListIndexSize } from "./ManagedMemberPointers.js";
// import { edges } from "./ManagedMemberRows.js";
// import { parseUserStrings } from "./ManagedUserStrings.js";
// import { signature, type ManagedMethod } from "./ManagedMemberInspectorCore.js";
// import { ManagedReaderFailure } from "./ManagedReaderFailure.js";
// import { managedMemberInspectionSchema } from "../domain/managed/managedArtifact.js";
// import { comparisonLimitations } from "../domain/managed/managedMemberComparisonCoverage.js";
// import { buildManagedPeFixture as buildMultiMethodManagedPeFixture } from "../../scripts/fixtures/managed/pe.mjs";
//
// import {
//   buildManagedNestedTypeFixture,
//   buildManagedPeFixture,
//   buildNativePeFixture,
//   fixtureUserStringHeap,
//   managedPeFixtureTarget,
// } from "./ManagedPe.fixture.js";
//
// /** A tiny-header body that loads each `ldstr` token, discards it, and returns. */
// const ldstrBody = (tokens: readonly string[]): Buffer => {
//   const il = Buffer.concat([
//     ...tokens.map((token) => {
//       const instruction = Buffer.from([0x72, 0, 0, 0, 0, 0x26]);
//       instruction.writeUInt32LE(Number.parseInt(token, 16), 1);
//       return instruction;
//     }),
//     Buffer.from([0x2a]),
//   ]);
//   return Buffer.concat([Buffer.from([(il.length << 2) | 2]), il]);
// };
//
// describe("managed member inspection", () => {
//   it("keeps metadata handles distinct from calls and field accesses", () => {
//     const il = Buffer.from([
//       0xd0, 0x01, 0, 0, 0x06, 0x26, 0xd0, 0x01, 0, 0, 0x04, 0x26, 0x28, 0x01, 0,
//       0, 0x0a, 0x7b, 0x01, 0, 0, 0x04, 0x26, 0x2a,
//     ]);
//     const bytes = buildManagedPeFixture({
//       ilBody: Buffer.concat([Buffer.from([(il.length << 2) | 2]), il]),
//     });
//     const result = inspectManagedMembersBytes(
//       bytes,
//       managedPeFixtureTarget(bytes),
//     );
//
//     expect(result.methods[0]?.body.anchors.map(({ opcode }) => opcode)).toEqual(
//       ["ldtoken", "ldtoken", "call", "ldfld"],
//     );
//     expect(result.call_edges.map(({ opcode }) => opcode)).toEqual(["call"]);
//     expect(result.field_accesses.map(({ opcode }) => opcode)).toEqual([
//       "ldfld",
//     ]);
//   });
//
//   it("inspects metadata members, signatures, CIL hashes, call edges, and field anchors", () => {
//     const bytes = buildManagedPeFixture();
//     const result = inspectManagedMembersBytes(
//       bytes,
//       managedPeFixtureTarget(bytes),
//     );
//
//     expect(result.identity_scope).toEqual({
//       token_identity: "build-local",
//       requires_artifact_sha256: managedPeFixtureTarget(bytes).sha256,
//       requires_mvid: "00112233-4455-6677-8899-aabbccddeeff",
//     });
//     expect(result.types).toEqual([
//       expect.objectContaining({
//         token: "0x02000001",
//         full_name: "Fixture.Program",
//         field_list: { first_row: 1, last_row: 1, count: 1 },
//         method_list: { first_row: 1, last_row: 1, count: 1 },
//       }),
//     ]);
//     expect(result.fields).toEqual([
//       expect.objectContaining({
//         token: "0x04000001",
//         declaring_type: "Fixture.Program",
//         name: "counter",
//         signature: expect.objectContaining({
//           kind: "field",
//           parse_status: "decoded",
//           field_type: "i4",
//         }),
//       }),
//     ]);
//     expect(result.methods).toEqual([
//       expect.objectContaining({
//         token: "0x06000001",
//         declaring_type: "Fixture.Program",
//         name: "Main",
//         rva: 0x2800,
//         signature: expect.objectContaining({
//           kind: "method",
//           parse_status: "decoded",
//           return_type: "void",
//           parameter_types: [],
//         }),
//         body: expect.objectContaining({
//           status: "present",
//           header_format: "tiny",
//           file_offset: 0x0a00,
//           il_size: 12,
//           instruction_count: 4,
//           decoded_instruction_count: 4,
//           truncated_instructions: 0,
//           opcode_counts: { "ldarg.0": 1, ldfld: 1, call: 1, ret: 1 },
//           anchors: [
//             {
//               il_offset: 1,
//               opcode: "ldfld",
//               operand_kind: "field",
//               operand: "0x04000001",
//             },
//             {
//               il_offset: 6,
//               opcode: "call",
//               operand_kind: "method",
//               operand: "0x0a000001",
//             },
//           ],
//         }),
//       }),
//     ]);
//     expect(result.member_refs).toEqual([
//       expect.objectContaining({
//         token: "0x0a000001",
//         parent_token: "0x01000001",
//         parent_name: "System.Runtime.Versioning.TargetFrameworkAttribute",
//         name: ".ctor",
//         signature: expect.objectContaining({
//           kind: "method",
//           parse_status: "decoded",
//           parameter_types: ["string"],
//         }),
//       }),
//     ]);
//     expect(result.call_edges).toEqual([
//       {
//         caller_token: "0x06000001",
//         caller: "Fixture.Program.Main",
//         opcode: "call",
//         target_token: "0x0a000001",
//         target_kind: "member-ref",
//         target_name: ".ctor",
//         target_declaring_type:
//           "System.Runtime.Versioning.TargetFrameworkAttribute",
//       },
//     ]);
//     expect(result.field_accesses).toEqual([
//       {
//         method_token: "0x06000001",
//         method: "Fixture.Program.Main",
//         opcode: "ldfld",
//         field_token: "0x04000001",
//         field_name: "counter",
//         field_declaring_type: "Fixture.Program",
//       },
//     ]);
//     expect(result.coverage).toMatchObject({ state: "complete", issues: [] });
//   });
// });
//
// /** A tiny-header body of token-operand instructions followed by `ret`. */
// const tokenBody = (
//   instructions: readonly (readonly [opcode: number, token: number])[],
// ): Buffer => {
//   const il = Buffer.concat([
//     ...instructions.map(([opcode, token]) => {
//       const instruction = Buffer.alloc(5);
//       instruction.writeUInt8(opcode, 0);
//       instruction.writeUInt32LE(token, 1);
//       return instruction;
//     }),
//     Buffer.from([0x2a]),
//   ]);
//   return Buffer.concat([Buffer.from([(il.length << 2) | 2]), il]);
// };
//
// const attribute = "System.Runtime.Versioning.TargetFrameworkAttribute";
// const inspect = (options: Parameters<typeof buildManagedPeFixture>[0]) => {
//   const bytes = buildManagedPeFixture(options);
//   return inspectManagedMembersBytes(bytes, managedPeFixtureTarget(bytes));
// };
// const call = 0x28;
// const ldsfld = 0x7e;
// const memberRefOnTypeSpec = (signature: Buffer) =>
//   inspect({
//     typeSpecSignatures: [signature],
//     memberRefParentRaw: (1 << 3) | 4,
//   });
//
// // HASTHIS | GENERIC, one generic parameter, no parameters, void.
// const genericRef = Buffer.from([0x30, 0x01, 0x00, 0x01]);
// // GENERIC, one generic parameter, no parameters, void.
// const genericDef = Buffer.from([0x10, 0x01, 0x00, 0x01]);
//
// describe("managed edge target declaring types", () => {
//   it("names a generic TypeSpec parent by its generic type and leaves other TypeSpecs unknown", () => {
//     // GENERICINST CLASS TypeRef(1) <string>
//     const generic = memberRefOnTypeSpec(
//       Buffer.from([0x15, 0x12, (1 << 2) | 1, 0x01, 0x0e]),
//     );
//     expect(generic.member_refs[0]?.parent_name).toBe(attribute);
//     expect(generic.call_edges[0]?.target_declaring_type).toBe(attribute);
//
//     // SZARRAY i4
//     const array = memberRefOnTypeSpec(Buffer.from([0x1d, 0x08]));
//     expect(array.member_refs[0]?.parent_name).toBeNull();
//     expect(array.coverage).toEqual({ state: "complete", issues: [] });
//   });
//
//   it.each([
//     [
//       "names a TypeSpec as its generic type",
//       [0x15, 0x12, (1 << 2) | 2, 0x01, 0x0e],
//       "invalid-row",
//       "metadata.TypeSpec:0x1b000001",
//     ],
//     [
//       "has no type arguments",
//       [0x15, 0x12, (1 << 2) | 1],
//       "invalid-blob",
//       "metadata.TypeSpec:0x1b000001",
//     ],
//     [
//       "names a missing TypeRef",
//       [0x15, 0x12, (9 << 2) | 1, 0x01, 0x0e],
//       "invalid-row",
//       "metadata.TypeSpec:0x1b000001",
//     ],
//     [
//       "names a missing TypeDef",
//       [0x15, 0x12, (9 << 2) | 0, 0x01, 0x0e],
//       "invalid-row",
//       "metadata.TypeSpec:0x1b000001",
//     ],
//     [
//       "has a type argument naming a missing TypeRef",
//       [0x15, 0x12, (1 << 2) | 1, 0x01, 0x12, (9 << 2) | 1],
//       "invalid-row",
//       "metadata.TypeSpec:0x1b000001",
//     ],
//   ])(
//     "reports a generic TypeSpec parent that %s and leaves it unknown",
//     (_case, signature, code, scope) => {
//       const result = memberRefOnTypeSpec(Buffer.from(signature));
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
export const _l = 519;
