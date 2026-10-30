export const __stub = 1;
//   [0x91, { name: "ldelem.u1", operand: "none" }],
//   [0x92, { name: "ldelem.i2", operand: "none" }],
//   [0x93, { name: "ldelem.u2", operand: "none" }],
//   [0x94, { name: "ldelem.i4", operand: "none" }],
//   [0x95, { name: "ldelem.u4", operand: "none" }],
//   [0x96, { name: "ldelem.i8", operand: "none" }],
//   [0x97, { name: "ldelem.i", operand: "none" }],
//   [0x98, { name: "ldelem.r4", operand: "none" }],
//   [0x99, { name: "ldelem.r8", operand: "none" }],
//   [0x9a, { name: "ldelem.ref", operand: "none" }],
//   [0x9b, { name: "stelem.i", operand: "none" }],
//   [0x9c, { name: "stelem.i1", operand: "none" }],
//   [0x9d, { name: "stelem.i2", operand: "none" }],
//   [0x9e, { name: "stelem.i4", operand: "none" }],
//   [0x9f, { name: "stelem.i8", operand: "none" }],
//   [0xa0, { name: "stelem.r4", operand: "none" }],
//   [0xa1, { name: "stelem.r8", operand: "none" }],
//   [0xa2, { name: "stelem.ref", operand: "none" }],
//   [0xa3, { name: "ldelem", operand: "type" }],
//   [0xa4, { name: "stelem", operand: "type" }],
//   [0xa5, { name: "unbox.any", operand: "type" }],
//   [0xb3, { name: "conv.ovf.i1", operand: "none" }],
//   [0xb4, { name: "conv.ovf.u1", operand: "none" }],
//   [0xb5, { name: "conv.ovf.i2", operand: "none" }],
//   [0xb6, { name: "conv.ovf.u2", operand: "none" }],
//   [0xb7, { name: "conv.ovf.i4", operand: "none" }],
//   [0xb8, { name: "conv.ovf.u4", operand: "none" }],
//   [0xb9, { name: "conv.ovf.i8", operand: "none" }],
//   [0xba, { name: "conv.ovf.u8", operand: "none" }],
//   [0xc2, { name: "refanyval", operand: "type" }],
//   [0xc3, { name: "ckfinite", operand: "none" }],
//   [0xc6, { name: "mkrefany", operand: "type" }],
//   [0xd0, { name: "ldtoken", operand: "token" }],
//   [0xd1, { name: "conv.u2", operand: "none" }],
//   [0xd2, { name: "conv.u1", operand: "none" }],
//   [0xd3, { name: "conv.i", operand: "none" }],
//   [0xd4, { name: "conv.ovf.i", operand: "none" }],
//   [0xd5, { name: "conv.ovf.u", operand: "none" }],
//   [0xd6, { name: "add.ovf", operand: "none" }],
//   [0xd7, { name: "add.ovf.un", operand: "none" }],
//   [0xd8, { name: "mul.ovf", operand: "none" }],
//   [0xd9, { name: "mul.ovf.un", operand: "none" }],
//   [0xda, { name: "sub.ovf", operand: "none" }],
//   [0xdb, { name: "sub.ovf.un", operand: "none" }],
//   [0xdc, { name: "endfinally", operand: "none" }],
//   [0xdd, { name: "leave", operand: "branch" }],
//   [0xde, { name: "leave.s", operand: "short-branch" }],
//   [0xdf, { name: "stind.i", operand: "none" }],
//   [0xe0, { name: "conv.u", operand: "none" }],
//   [0xfe00, { name: "arglist", operand: "none" }],
//   [0xfe01, { name: "ceq", operand: "none" }],
//   [0xfe02, { name: "cgt", operand: "none" }],
//   [0xfe03, { name: "cgt.un", operand: "none" }],
//   [0xfe04, { name: "clt", operand: "none" }],
//   [0xfe05, { name: "clt.un", operand: "none" }],
//   [0xfe06, { name: "ldftn", operand: "method" }],
//   [0xfe07, { name: "ldvirtftn", operand: "method" }],
//   [0xfe09, { name: "ldarg", operand: "var" }],
//   [0xfe0a, { name: "ldarga", operand: "var" }],
//   [0xfe0b, { name: "starg", operand: "var" }],
//   [0xfe0c, { name: "ldloc", operand: "var" }],
//   [0xfe0d, { name: "ldloca", operand: "var" }],
//   [0xfe0e, { name: "stloc", operand: "var" }],
//   [0xfe0f, { name: "localloc", operand: "none" }],
//   [0xfe11, { name: "endfilter", operand: "none" }],
//   [0xfe12, { name: "unaligned.", operand: "short-i" }],
//   [0xfe13, { name: "volatile.", operand: "none" }],
//   [0xfe14, { name: "tail.", operand: "none" }],
//   [0xfe15, { name: "initobj", operand: "type" }],
//   [0xfe16, { name: "constrained.", operand: "type" }],
//   [0xfe17, { name: "cpblk", operand: "none" }],
//   [0xfe18, { name: "initblk", operand: "none" }],
//   [0xfe19, { name: "no.", operand: "short-i" }],
//   [0xfe1a, { name: "rethrow", operand: "none" }],
//   [0xfe1c, { name: "sizeof", operand: "type" }],
//   [0xfe1d, { name: "refanytype", operand: "none" }],
//   [0xfe1e, { name: "readonly.", operand: "none" }],
// ]);
//
// const tokenKind = (token: string): ManagedInstructionAnchor["operand_kind"] => {
//   if (
//     token.startsWith("0x06") ||
//     token.startsWith("0x0a") ||
//     token.startsWith("0x2b")
//   )
//     return "method";
//   if (token.startsWith("0x04")) return "field";
//   if (token.startsWith("0x70")) return "string";
//   if (token.startsWith("0x11")) return "signature";
//   if (
//     token.startsWith("0x01") ||
//     token.startsWith("0x02") ||
//     token.startsWith("0x1b")
//   )
//     return "type";
//   return "token";
// };
//
// type OperandResult = {
//   readonly next: number;
//   readonly anchorKind: ManagedInstructionAnchor["operand_kind"];
//   readonly value: string | null;
// };
//
// type OperandReader = (il: Buffer, offset: number) => OperandResult;
//
// // String(-0) loses a CIL constant's sign in both anchors and normalized hashes.
// const floatingPointOperand = (value: number): string =>
//   Object.is(value, -0) ? "-0" : String(value);
//
// /**
//  * A fixed-width operand declares its byte width next to its reader so the
//  * extent check can bound the read before any value is consumed. Keeping both
//  * facts in one entry is what stops the width and the reader from drifting.
//  */
// type FixedOperand = {
//   readonly width: number;
//   readonly read: OperandReader;
// };
//
// const fixed = (width: number, read: OperandReader): FixedOperand => ({
//   width,
//   read,
// });
//
// const FIXED_OPERAND_READERS = new Map<string, FixedOperand>([
//   [
//     "none",
//     fixed(0, (_il, offset) => ({
//       next: offset,
//       anchorKind: "none",
//       value: null,
//     })),
//   ],
//   [
//     "short-var",
//     fixed(1, (il, offset) => ({
//       next: offset + 1,
//       anchorKind: "variable",
//       value: String(il.readUInt8(offset)),
//     })),
//   ],
//   [
//     "var",
//     fixed(2, (il, offset) => ({
//       next: offset + 2,
//       anchorKind: "variable",
//       value: String(il.readUInt16LE(offset)),
//     })),
//   ],
//   [
//     "short-i",
//     fixed(1, (il, offset) => ({
//       next: offset + 1,
//       anchorKind: "constant",
//       value: String(il.readInt8(offset)),
//     })),
//   ],
//   [
//     "i",
//     fixed(4, (il, offset) => ({
//       next: offset + 4,
//       anchorKind: "constant",
export const _l = 163;
