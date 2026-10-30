export const __stub = 1;
//     const il = Buffer.from([0x00, 0x2a]);
//     const tinyBytes = buildManagedPeFixture({
//       ilBody: Buffer.from([0x0a, ...il]),
//     });
//     const fatHeader = Buffer.alloc(12);
//     fatHeader.writeUInt16LE(0x3013, 0);
//     fatHeader.writeUInt16LE(32, 2);
//     fatHeader.writeUInt32LE(il.length, 4);
//     fatHeader.writeUInt32LE(0x1100_0001, 8);
//     const fatBytes = buildManagedPeFixture({
//       ilBody: Buffer.concat([fatHeader, il]),
//     });
//     const tiny = inspectManagedMembersBytes(
//       tinyBytes,
//       managedPeFixtureTarget(tinyBytes),
//     );
//     const fat = inspectManagedMembersBytes(
//       fatBytes,
//       managedPeFixtureTarget(fatBytes),
//     );
//
//     expect(tiny.methods[0]?.body).toMatchObject({
//       status: "present",
//       header_format: "tiny",
//       max_stack: 8,
//       init_locals: false,
//       local_var_sig_token: null,
//       il_size: 2,
//       il_sha256: createHash("sha256").update(il).digest("hex"),
//       normalized_il_sha256:
//         "5e5fad7741cb44bca3a4f045546b7449990da343f612f5f34c0ca30e9eee0636",
//       opcode_counts: { nop: 1, ret: 1 },
//       exception_regions: [],
//     });
//     expect(fat.methods[0]?.body).toMatchObject({
//       header_format: "fat",
//       max_stack: 32,
//       init_locals: true,
//       local_var_sig_token: "0x11000001",
//       il_sha256: tiny.methods[0]?.body.il_sha256,
//       normalized_il_sha256: tiny.methods[0]?.body.normalized_il_sha256,
//     });
//   });
// });
//
// describe("managed operand extent diagnostics", () => {
//   it.each([
//     [[0x20], 0, "Instruction ldc.i4 at IL offset 0 leaves method body"],
//     [
//       [0x00, 0x20, 0x01],
//       1,
//       "Instruction ldc.i4 at IL offset 1 leaves method body",
//     ],
//     [[0x2b], 0, "Instruction br.s at IL offset 0 leaves method body"],
//     [[0x45, 0x02], 0, "Instruction switch at IL offset 0 leaves method body"],
//     [
//       [0xfe, 0x09, 0x00],
//       0,
//       "Instruction ldarg at IL offset 0 leaves method body",
//     ],
//     [[0x00, 0xfe], 1, "Two-byte CIL opcode at IL offset 1 leaves method body"],
//   ] as const)(
//     "reports the instruction and IL offset for tiny IL %j",
//     (il, decoded, issue) => {
//       const { body, coverage } = tinyBody(il);
//       expect(body).toMatchObject({
//         status: "malformed",
//         header_format: "tiny",
//         il_size: il.length,
//         decoded_instruction_count: decoded,
//         normalized_il_sha256: null,
//         issue,
//       });
//       expect(coverage.state).toBe("partial");
//     },
//   );
//
//   it.each([
//     ["short variable", Buffer.from([0x0e]), "ldarg.s"],
//     ["wide variable", Buffer.from([0xfe, 0x09]), "ldarg"],
//     ["int32 constant", Buffer.from([0x20]), "ldc.i4"],
//     ["int64 constant", Buffer.from([0x21]), "ldc.i8"],
//     ["float32 constant", Buffer.from([0x22]), "ldc.r4"],
//     ["float64 constant", Buffer.from([0x23]), "ldc.r8"],
//     ["short branch", Buffer.from([0x2b]), "br.s"],
//     ["long branch", Buffer.from([0x38]), "br"],
//     ["prefixed short constant", Buffer.from([0xfe, 0x12]), "unaligned."],
//     ["string token", Buffer.from([0x72]), "ldstr"],
//     ["type token", Buffer.from([0x71]), "ldobj"],
//     ["field token", Buffer.from([0x7b]), "ldfld"],
//     ["method token", Buffer.from([0x28]), "call"],
//   ] as const)(
//     "reports a truncated %s operand at its own instruction",
//     (_label, il, name) => {
//       expect(fatBody(il)).toMatchObject({
//         status: "malformed",
//         decoded_instruction_count: 0,
//         normalized_il_sha256: null,
//         issue: `Instruction ${name} at IL offset 0 leaves method body`,
//       });
//     },
//   );
//
//   // A width declared too small still passes the extent check when no operand
//   // bytes are present, so the zero-byte cases above cannot catch it. Supplying
//   // one byte less than the real width makes a wrong width let the read run,
//   // which surfaces as the raw Buffer error rather than the diagnostic.
//   it.each([
//     ["wide variable", Buffer.from([0xfe, 0x09]), 2, "ldarg"],
//     ["int32 constant", Buffer.from([0x20]), 4, "ldc.i4"],
//     ["int64 constant", Buffer.from([0x21]), 8, "ldc.i8"],
//     ["float32 constant", Buffer.from([0x22]), 4, "ldc.r4"],
//     ["float64 constant", Buffer.from([0x23]), 8, "ldc.r8"],
//     ["long branch", Buffer.from([0x38]), 4, "br"],
//     ["method token", Buffer.from([0x28]), 4, "call"],
//     ["type token", Buffer.from([0x71]), 4, "ldobj"],
//     ["string token", Buffer.from([0x72]), 4, "ldstr"],
//     ["field token", Buffer.from([0x7b]), 4, "ldfld"],
//   ] as const)(
//     "rejects a %s operand one byte short of its declared width",
//     (_label, opcode, width, name) => {
//       expect(
//         fatBody(Buffer.concat([opcode, Buffer.alloc(width - 1)])),
//       ).toMatchObject({
//         status: "malformed",
//         decoded_instruction_count: 0,
//         normalized_il_sha256: null,
//         issue: `Instruction ${name} at IL offset 0 leaves method body`,
//       });
//     },
//   );
// });
//
// describe("managed complete operand decoding", () => {
//   // The extent check must also reject nothing that fits, so every multi-byte
//   // width is exercised at exactly its own size with a known value. Each body
//   // ends at its operand, so a width declared too large turns a valid operand
//   // into the leaves-method-body diagnostic and these value assertions catch it.
//   // The -0 constants keep the floating-point sign fix covered through this same
//   // path.
//   it.each([
//     ["wide variable", [0xfe, 0x09], [0x01, 0x00], "variable", "1"],
//     ["int32 constant", [0x20], [0x01, 0x00, 0x00, 0x00], "constant", "1"],
//     [
//       "int64 constant",
//       [0x21],
//       [0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00],
//       "constant",
//       "1",
//     ],
//     ["float32 constant", [0x22], [0x00, 0x00, 0x00, 0x80], "constant", "-0"],
//     [
//       "float64 constant",
//       [0x23],
//       [0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x80],
//       "constant",
//       "-0",
//     ],
//     ["long branch", [0x38], [0x00, 0x00, 0x00, 0x00], "branch", "5"],
//     ["method token", [0x28], [0x01, 0x00, 0x00, 0x00], "method", "0x00000001"],
//     ["type token", [0x71], [0x02, 0x00, 0x00, 0x00], "type", "0x00000002"],
//     ["string token", [0x72], [0x03, 0x00, 0x00, 0x00], "string", "0x00000003"],
//     ["field token", [0x7b], [0x04, 0x00, 0x00, 0x00], "field", "0x00000004"],
//   ] as const)(
//     "decodes a %s operand at exactly its declared width",
//     (_label, opcode, operand, operandKind, value) => {
//       expect(fatBody(Buffer.from([...opcode, ...operand]))).toMatchObject({
//         status: "present",
//         issue: null,
//         decoded_instruction_count: 1,
//         anchors: [{ il_offset: 0, operand_kind: operandKind, operand: value }],
//       });
//     },
//   );
//
//   it("reports a switch whose target table is missing", () => {
//     expect(
//       fatBody(Buffer.from([0x00, 0x45, 0x02, 0x00, 0x00, 0x00])),
//     ).toMatchObject({
//       status: "malformed",
//       decoded_instruction_count: 1,
//       opcode_counts: { nop: 1 },
//       issue: "Instruction switch at IL offset 1 leaves method body",
//     });
//   });
//
//   it("reports a switch whose target count is itself truncated", () => {
//     expect(fatBody(Buffer.from([0x45, 0x02]))).toMatchObject({
//       status: "malformed",
//       decoded_instruction_count: 0,
//       issue: "Instruction switch at IL offset 0 leaves method body",
//     });
//   });
//
//   it("preserves instructions decoded before a truncated operand", () => {
//     expect(fatBody(Buffer.from([0x00, 0x20]))).toMatchObject({
//       status: "malformed",
//       il_size: 2,
//       decoded_instruction_count: 1,
//       opcode_counts: { nop: 1 },
//       issue: "Instruction ldc.i4 at IL offset 1 leaves method body",
//     });
//   });
export const _l = 203;
