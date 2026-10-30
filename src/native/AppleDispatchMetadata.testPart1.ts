export const __stub = 1;
// import { describe, expect, it } from "vitest";
// import { machoWithPropertyAttributes } from "../../tests/fixtures/objcPropertyMacho.js";
// import { decodeAppleDispatchMetadata } from "./AppleDispatchMetadata.js";
//
// const base = 0x100000000n;
// const fixture = (
//   relative = false,
//   category?: "partial-method" | "unmapped-pointer" | "unmapped-class",
// ) => {
//   const bytes = Buffer.alloc(4096);
//   const u32 = (offset: number, value: number) =>
//     bytes.writeUInt32LE(value, offset);
//   const ptr = (offset: number, target: number) =>
//     bytes.writeBigUInt64LE(base + BigInt(target), offset);
//   u32(0, 0xfeedfacf);
//   u32(4, 0x0100000c);
//   u32(16, 1);
//   u32(20, category === undefined ? 152 : 232);
//   u32(32, 0x19);
//   u32(36, category === undefined ? 152 : 232);
//   bytes.write("__DATA", 40);
//   ptr(56, 0);
//   bytes.writeBigUInt64LE(4096n, 64);
//   bytes.writeBigUInt64LE(4096n, 80);
//   u32(92, 5);
//   u32(96, category === undefined ? 1 : 2);
//   bytes.write("__objc_classlist", 104);
//   bytes.write("__DATA", 120);
//   ptr(136, 0x180);
//   bytes.writeBigUInt64LE(8n, 144);
//   if (category !== undefined) {
//     bytes.write("__objc_catlist", 184);
//     bytes.write("__DATA", 200);
//     ptr(216, 0xb00);
//     bytes.writeBigUInt64LE(8n, 224);
//     u32(232, 0xb00);
//   }
//   u32(152, 0x180);
//   ptr(0x180, 0x200);
//   ptr(0x200, 0x280);
//   ptr(0x220, 0x300);
//   ptr(0x2a0, 0x380);
//   u32(0x308, 16);
//   ptr(0x318, 0x450);
//   ptr(0x320, 0x480);
//   ptr(0x330, 0x500);
//   ptr(0x328, 0x700);
//   ptr(0x340, 0x600);
//   u32(0x380, 1);
//   ptr(0x398, 0x450);
//   bytes.write("Fixture\0", 0x450);
//   bytes.write("performAction:\0", 0x460);
//   u32(0x480, relative ? 0xc000000c : 24);
//   u32(0x484, 1);
//   if (relative) {
//     bytes.writeInt32LE(0x460 - 0x488, 0x488);
//     bytes.writeInt32LE(0x5c0 - 0x48c, 0x48c);
//     bytes.writeInt32LE(0x700 - 0x490, 0x490);
//   } else {
//     ptr(0x488, 0x460);
//     ptr(0x490, 0x5c0);
//     ptr(0x498, 0x700);
//   }
//   u32(0x500, 32);
//   u32(0x504, 1);
//   ptr(0x508, 0x580);
//   ptr(0x510, 0x5a0);
//   ptr(0x518, 0x5c0);
//   u32(0x580, 8);
//   bytes.write("state\0", 0x5a0);
//   bytes.write("i\0", 0x5c0);
//   u32(0x600, 16);
//   u32(0x604, 3);
//   ptr(0x608, 0x640);
//   ptr(0x610, 0x650);
//   ptr(0x618, 0x660);
//   ptr(0x620, 0x670);
//   ptr(0x628, 0x680);
//   ptr(0x630, 0x690);
//   bytes.write("atomicValue\0", 0x640);
//   bytes.write("Tq\0", 0x650);
//   bytes.write("nonatomicValue\0", 0x660);
//   bytes.write("Tq,N\0", 0x670);
//   bytes.write("unknownValue\0", 0x680);
//   bytes.writeBigUInt64LE(1n, 0x700);
//   ptr(0x708, 0x740);
//   ptr(0x748, 0x900);
//   ptr(0x758, 0x800);
//   ptr(0x768, 0x840);
//   u32(0x780, 72);
//   u32(0x800, 24);
//   u32(0x804, 1);
//   ptr(0x808, 0x920);
//   u32(0x840, 24);
//   u32(0x844, 1);
//   ptr(0x848, 0x940);
//   bytes.write("FixtureProtocol\0", 0x900);
//   bytes.write("requiredAction:\0", 0x920);
//   bytes.write("optionalAction:\0", 0x940);
//   if (category !== undefined) {
//     if (category === "unmapped-pointer") {
//       bytes.writeBigUInt64LE(0xffffffffffffffffn, 0xb00);
//     } else {
//       ptr(0xb00, 0xb40);
//       ptr(0xb40, 0xbc0);
//       if (category === "unmapped-class") ptr(0xb48, 0x5000);
//       else ptr(0xb48, 0x200);
//       ptr(0xb50, 0xb80);
//       u32(0xb80, 24);
//       u32(0xb84, 1);
//       ptr(0xb88, 0x460);
//       ptr(0xb90, 0x5c0);
//       if (category === "unmapped-class") ptr(0xb98, 0x700);
//       else bytes.writeBigUInt64LE(0xffffffffffffffffn, 0xb98);
//       bytes.write("FixtureCategory\0", 0xbc0);
//     }
//   }
//   return bytes;
// };
// const provenance = { path: "/fixture/app", sha256: "a".repeat(64) };
//
// const partialSiblingsFixture = (
//   options: {
//     readonly emptyMiddleClass?: boolean;
//   } = {},
// ) => {
//   const bytes = Buffer.alloc(4096);
//   const imageBase = 0x100000000n;
//   bytes.writeUInt32LE(0xfeedfacf, 0);
//   bytes.writeUInt32LE(0x0100000c, 4);
//   bytes.writeUInt32LE(2, 12);
//   bytes.writeUInt32LE(1, 16);
//   bytes.writeUInt32LE(232, 20);
//   bytes.writeUInt32LE(0x19, 32);
//   bytes.writeUInt32LE(232, 36);
//   bytes.write("__DATA", 40);
//   bytes.writeBigUInt64LE(imageBase, 56);
//   bytes.writeBigUInt64LE(4096n, 64);
//   bytes.writeBigUInt64LE(4096n, 80);
//   bytes.writeUInt32LE(5, 92);
//   bytes.writeUInt32LE(2, 96);
//   bytes.write("__objc_classlist", 104);
//   bytes.writeBigUInt64LE(imageBase + 0x200n, 136);
//   bytes.writeBigUInt64LE(24n, 144);
//   bytes.write("__objc_protolist", 184);
//   bytes.writeBigUInt64LE(imageBase + 0x300n, 216);
//   bytes.writeBigUInt64LE(8n, 224);
//   for (const [slot, record, ro, name] of [
//     [0x200, 0x400, 0x500, 0x600],
//     [0x208, 0x440, 0x540, 0x620],
//     [0x210, 0x480, 0x580, 0x640],
//   ] as const) {
//     bytes.writeBigUInt64LE(imageBase + BigInt(record), slot);
//     bytes.writeBigUInt64LE(imageBase + BigInt(ro), record + 32);
//     bytes.writeUInt32LE(2, ro);
//     bytes.writeUInt32LE(16, ro + 8);
//     bytes.writeBigUInt64LE(imageBase + BigInt(name), ro + 24);
//   }
//   bytes.write("KeptClass\0", 0x600);
//   if (!options.emptyMiddleClass) bytes.write("OtherClass\0", 0x620);
//   bytes.write("LaterClass\0", 0x640);
//   return bytes;
// };
//
// describe("Apple dispatch pointer fixup metadata", () => {
//   it.each([
//     { name: "unsupported opcode", operand: [0xd0] },
//     {
//       name: "oversized addend whose tail resembles DO_BIND",
//       operand: [0x60, ...Array<number>(10).fill(0x80), 0x90, 0x00],
//     },
//   ])(
//     "keeps decoded bindings when an independent stream has $name",
//     ({ operand }) => {
//       const bytes = fixture();
//       bytes.writeUInt32LE(2, 16);
//       bytes.writeUInt32LE(200, 20);
//       bytes.writeUInt32LE(0x80000022, 184);
//       bytes.writeUInt32LE(48, 188);
//       const bindings = Buffer.from([
//         0x40,
//         ...Buffer.from("_OBJC_CLASS_$_NSObject\0"),
//         0x70,
//         0x88,
//         0x04,
//         0x90,
//         0x00,
//       ]);
//       bindings.copy(bytes, 0xc00);
//       const invalid = Buffer.from([...bindings.subarray(0, -2), ...operand]);
//       invalid.copy(bytes, 0xc80);
//       bytes.writeUInt32LE(0xc00, 200);
//       bytes.writeUInt32LE(bindings.length, 204);
//       bytes.writeUInt32LE(0xc80, 208);
//       bytes.writeUInt32LE(invalid.length, 212);
//
//       const result = decodeAppleDispatchMetadata(bytes, 100, provenance);
//       expect(result.objc_classes[0]).toMatchObject({
//         name: "Fixture",
//         super_class: "NSObject",
//       });
//       expect(
//         result.coverage.find(({ facet }) => facet === "pointer_fixups"),
//       ).toMatchObject({ status: "partial", examined: 2, decoded: 1 });
//     },
//   );
//
//   it("keeps absolute metadata pointers between declared chained fixups", () => {
//     const bytes = fixture();
//     bytes.writeUInt32LE(2, 16);
//     bytes.writeUInt32LE(168, 20);
//     bytes.writeUInt32LE(0x80000034, 184);
//     bytes.writeUInt32LE(16, 188);
//     bytes.writeUInt32LE(0xa00, 192);
//     bytes.writeUInt32LE(64, 196);
//     // Only the class-list pointer needs rebasing. All remaining metadata
//     // pointers carry their stored absolute values, outside the single chain.
//     bytes.writeBigUInt64LE(0x200n, 0x180);
//     bytes.writeUInt32LE(28, 0xa04);
//     bytes.writeUInt32LE(60, 0xa08);
//     bytes.writeUInt32LE(60, 0xa0c);
//     bytes.writeUInt32LE(1, 0xa14);
//     bytes.writeUInt32LE(1, 0xa1c);
//     bytes.writeUInt32LE(8, 0xa20);
//     bytes.writeUInt32LE(24, 0xa24);
//     bytes.writeUInt16LE(0x1000, 0xa28);
//     bytes.writeUInt16LE(6, 0xa2a);
//     bytes.writeUInt16LE(1, 0xa38);
//     bytes.writeUInt16LE(0x180, 0xa3a);
//     const result = decodeAppleDispatchMetadata(bytes, 100, provenance);
//     expect(result.objc_classes[0]).toMatchObject({ name: "Fixture" });
//     expect(result.objc_dispatch_implementations[0]).toMatchObject({
//       selector: "performAction:",
//       implementation_address: "0x100000700",
//     });
//     expect(
//       result.coverage.find(({ facet }) => facet === "pointer_fixups"),
export const _l = 237;
