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
export const _l = 258;
