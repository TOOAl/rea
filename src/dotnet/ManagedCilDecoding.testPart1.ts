export const __stub = 1;
// import { createHash } from "node:crypto";
//
// import { describe, expect, it } from "vitest";
//
// import { inspectManagedMembersBytes } from "./ManagedMemberInspector.js";
// import {
//   buildManagedPeFixture,
//   managedPeFixtureTarget,
// } from "./ManagedPe.fixture.js";
// import { parseExceptionRegions } from "./ManagedMemberInstructionDecoder.js";
//
// const managedBodyWithSections = (...sections: Buffer[]) => {
//   const header = Buffer.alloc(12);
//   header.writeUInt16LE(0x300b, 0);
//   header.writeUInt16LE(8, 2);
//   header.writeUInt32LE(1, 4);
//   const bytes = buildManagedPeFixture({
//     ilBody: Buffer.concat([
//       header,
//       Buffer.from([0x2a]),
//       Buffer.alloc(3),
//       ...sections,
//     ]),
//   });
//   return inspectManagedMembersBytes(bytes, managedPeFixtureTarget(bytes))
//     .methods[0]?.body;
// };
//
// const managedBodyWithRegion = ({
//   il,
//   flags = 0,
//   tryOffset = 0,
//   tryLength = 1,
//   handlerOffset,
//   handlerLength = 1,
//   extra = 0x0200_0001,
// }: {
//   readonly il: Buffer;
//   readonly flags?: number;
//   readonly tryOffset?: number;
//   readonly tryLength?: number;
//   readonly handlerOffset: number;
//   readonly handlerLength?: number;
//   readonly extra?: number;
// }) => {
//   const header = Buffer.alloc(12);
//   header.writeUInt16LE(0x300b, 0);
//   header.writeUInt16LE(8, 2);
//   header.writeUInt32LE(il.length, 4);
//   const section = Buffer.alloc(16);
//   section[0] = 0x01;
//   section[1] = section.length;
//   section.writeUInt16LE(flags, 4);
//   section.writeUInt16LE(tryOffset, 6);
//   section[8] = tryLength;
//   section.writeUInt16LE(handlerOffset, 9);
//   section[11] = handlerLength;
//   section.writeUInt32LE(extra, 12);
//   const bytes = buildManagedPeFixture({
//     ilBody: Buffer.concat([
//       header,
//       il,
//       Buffer.alloc((4 - (il.length % 4)) % 4),
//       section,
//     ]),
//   });
//   return inspectManagedMembersBytes(bytes, managedPeFixtureTarget(bytes))
//     .methods[0]?.body;
// };
//
// const fatBody = (il: Buffer) => {
//   const header = Buffer.alloc(12);
//   header.writeUInt16LE(0x3013, 0);
//   header.writeUInt16LE(8, 2);
//   header.writeUInt32LE(il.length, 4);
//   const bytes = buildManagedPeFixture({
//     ilBody: Buffer.concat([header, il]),
//   });
//   return inspectManagedMembersBytes(bytes, managedPeFixtureTarget(bytes))
//     .methods[0]?.body;
// };
//
// /** Build a tiny method body whose declared IL extent matches its supplied bytes. */
// const tinyBody = (il: readonly number[]) => {
//   const bytes = buildManagedPeFixture({
//     ilBody: Buffer.from([(il.length << 2) | 0x02, ...il]),
//   });
//   const inspection = inspectManagedMembersBytes(
//     bytes,
//     managedPeFixtureTarget(bytes),
//   );
//   return { body: inspection.methods[0]?.body, coverage: inspection.coverage };
// };
//
// describe("managed CIL decoding", () => {
//   it("reads fat method header size from the full flags-and-size word", () => {
//     const il = Buffer.from([
//       0x21, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x26, 0x22, 0x00,
//       0x00, 0x80, 0x3f, 0x26, 0x23, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xf0,
//       0x3f, 0x26, 0xfe, 0x06, 0x01, 0x00, 0x00, 0x06, 0x26, 0x2a,
//     ]);
//     const header = Buffer.alloc(12);
//     header.writeUInt16LE(0x3013, 0);
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
//     expect(result.methods[0]?.body).toMatchObject({
//       status: "present",
//       header_format: "fat",
//       il_size: il.length,
//       il_sha256: createHash("sha256").update(il).digest("hex"),
//       opcode_counts: {
//         "ldc.i8": 1,
//         pop: 4,
//         "ldc.r4": 1,
//         "ldc.r8": 1,
//         ldftn: 1,
//         ret: 1,
//       },
//       issue: null,
//     });
//   });
//
//   it("does not normalize reserved CIL opcodes as operand-free instructions", () => {
//     const bytes = buildManagedPeFixture({
//       ilBody: Buffer.from([0x0a, 0x24, 0x2a]),
//     });
//     const result = inspectManagedMembersBytes(
//       bytes,
//       managedPeFixtureTarget(bytes),
//     );
//
//     expect(result.methods[0]?.body).toMatchObject({
//       status: "malformed",
//       il_size: 2,
//       normalized_il_sha256: null,
//       decoded_instruction_count: 0,
//       issue: "Unsupported CIL opcode 0x24 at IL offset 0",
//     });
//   });
//
//   it("does not decode overlay bytes after the method's file-backed PE section", () => {
//     const original = buildManagedPeFixture();
//     const bytes = Buffer.concat([original, Buffer.from([0x2a])]);
//     const parsed = inspectManagedMembersBytes(
//       original,
//       managedPeFixtureTarget(original),
//     );
//     const methodRow = parsed.methods[0]?.row_offset;
//     expect(methodRow).toBeDefined();
//     if (methodRow === undefined) return;
//     bytes.writeUInt32LE(0x2dff, methodRow);
//     bytes[0xfff] = 0x06;
//     const result = inspectManagedMembersBytes(
//       bytes,
//       managedPeFixtureTarget(bytes),
//     );
//     expect(result.methods[0]?.body).toMatchObject({
//       status: "malformed",
//       header_format: "unknown",
//       issue: "Method body leaves file-backed PE section data",
//       anchors: [],
//     });
//   });
//
//   it("does not decode overlay exception sections after the file-backed PE section", () => {
//     const original = buildManagedPeFixture();
//     const overlay = Buffer.from([0x01, 0x04, 0x00, 0x00]);
//     const bytes = Buffer.concat([original, overlay]);
//     const parsed = inspectManagedMembersBytes(
//       original,
//       managedPeFixtureTarget(original),
//     );
//     const methodRow = parsed.methods[0]?.row_offset;
//     expect(methodRow).toBeDefined();
//     if (methodRow === undefined) return;
//     const body = Buffer.alloc(16);
//     body.writeUInt16LE(0x301b, 0);
//     body.writeUInt16LE(8, 2);
//     body.writeUInt32LE(1, 4);
//     body[12] = 0x2a;
//     body.copy(bytes, 0xff0);
//     bytes.writeUInt32LE(0x2df0, methodRow);
//     overlay.copy(bytes, 0x1000);
//     const result = inspectManagedMembersBytes(
//       bytes,
//       managedPeFixtureTarget(bytes),
//     );
//     expect(result.methods[0]?.body).toMatchObject({
//       status: "malformed",
//       issue: "Exception section header leaves artifact",
//       exception_regions: [],
//     });
//   });
//
//   it("keeps the documented decoded-CIL v1 golden vector stable", () => {
export const _l = 203;
