export const __stub = 1;
//       value: String(il.readInt32LE(offset)),
//     })),
//   ],
//   [
//     "i8",
//     fixed(8, (il, offset) => ({
//       next: offset + 8,
//       anchorKind: "constant",
//       value: il.readBigInt64LE(offset).toString(),
//     })),
//   ],
//   [
//     "r4",
//     fixed(4, (il, offset) => ({
//       next: offset + 4,
//       anchorKind: "constant",
//       value: floatingPointOperand(il.readFloatLE(offset)),
//     })),
//   ],
//   [
//     "r8",
//     fixed(8, (il, offset) => ({
//       next: offset + 8,
//       anchorKind: "constant",
//       value: floatingPointOperand(il.readDoubleLE(offset)),
//     })),
//   ],
//   [
//     "short-branch",
//     fixed(1, (il, offset) => ({
//       next: offset + 1,
//       anchorKind: "branch",
//       value: String(offset + 1 + il.readInt8(offset)),
//     })),
//   ],
//   [
//     "branch",
//     fixed(4, (il, offset) => ({
//       next: offset + 4,
//       anchorKind: "branch",
//       value: String(offset + 4 + il.readInt32LE(offset)),
//     })),
//   ],
// ]);
//
// const TOKEN_OPERAND_KINDS = new Map<
//   string,
//   ManagedInstructionAnchor["operand_kind"]
// >([
//   ["method", "method"],
//   ["field", "field"],
//   ["type", "type"],
//   ["string", "string"],
//   ["signature", "signature"],
// ]);
//
// /** Every token operand is a 4-byte metadata token. */
// const TOKEN_OPERAND_WIDTH = 4;
//
// /**
//  * Bytes the operand at `offset` occupies, or `null` when the extent itself
//  * cannot be read from `il`. This is the single extent authority: `readOperand`
//  * must never be called for an operand whose extent it cannot bound, so no
//  * operand read can leave the method body.
//  */
// const operandExtent = (
//   il: Buffer,
//   offset: number,
//   kind: string,
// ): number | null => {
//   const fixedOperand = FIXED_OPERAND_READERS.get(kind);
//   if (fixedOperand !== undefined) return fixedOperand.width;
//   if (kind === "switch") {
//     if (offset > il.length - 4) return null;
//     return 4 + il.readUInt32LE(offset) * 4;
//   }
//   return TOKEN_OPERAND_KINDS.has(kind) || kind === "token"
//     ? TOKEN_OPERAND_WIDTH
//     : 0;
// };
//
// /**
//  * Read an operand whose extent is already known to fit. `next` is always
//  * `offset + operandExtent(il, offset, kind)`; callers bound the read first.
//  */
// const readOperand = (
//   il: Buffer,
//   offset: number,
//   kind: string,
// ): OperandResult => {
//   const fixedOperand = FIXED_OPERAND_READERS.get(kind);
//   if (fixedOperand !== undefined) return fixedOperand.read(il, offset);
//   if (kind === "switch") {
//     const count = il.readUInt32LE(offset);
//     return {
//       next: offset + 4 + count * 4,
//       anchorKind: "switch",
//       value: String(count),
//     };
//   }
//   if (!TOKEN_OPERAND_KINDS.has(kind) && kind !== "token")
//     return { next: offset, anchorKind: "unknown", value: null };
//   const raw = il.readUInt32LE(offset);
//   const token = `0x${raw.toString(16).padStart(8, "0")}`;
//   return {
//     next: offset + TOKEN_OPERAND_WIDTH,
//     anchorKind: TOKEN_OPERAND_KINDS.get(kind) ?? tokenKind(token),
//     value: token,
//   };
// };
//
// export const decodeInstructions = (
//   il: Buffer,
//   admitInstruction?: (offset: number) => void,
// ): {
//   readonly parsed: readonly ParsedInstruction[];
//   readonly instructionStarts: readonly number[];
//   readonly count: number;
//   readonly truncated: number;
//   readonly issue: string | null;
// } => {
//   const parsed: ParsedInstruction[] = [];
//   const instructionStarts: number[] = [];
//   let offset = 0;
//   let prefixStart: number | null = null;
//   let issue: string | null = null;
//   try {
//     while (offset < il.length) {
//       const start = offset;
//       const first = il.readUInt8(offset);
//       offset += 1;
//       if (first === 0xfe && offset >= il.length) {
//         issue = `Two-byte CIL opcode at IL offset ${String(start)} leaves method body`;
//         break;
//       }
//       const code = first === 0xfe ? 0xfe00 + il.readUInt8(offset++) : first;
//       const descriptor = OPCODES.get(code);
//       if (descriptor === undefined) {
//         issue = `Unsupported CIL opcode 0x${code.toString(16)} at IL offset ${String(start)}`;
//         break;
//       }
//       // Bound the operand extent before reading its value. Reading first would
//       // throw a raw Buffer RangeError out of a truncated body and replace this
//       // diagnostic with the runtime message, losing the instruction identity.
//       const extent = operandExtent(il, offset, descriptor.operand);
//       if (extent === null || offset + extent > il.length) {
//         issue = `Instruction ${descriptor.name} at IL offset ${String(start)} leaves method body`;
//         break;
//       }
//       const operand = readOperand(il, offset, descriptor.operand);
//       // Charge each actual instruction before growing the decoded arrays.
//       // A multi-byte operand must not consume a full record per raw IL byte.
//       admitInstruction?.(start);
//       offset = operand.next;
//       if (PREFIX_OPCODES.has(descriptor.name)) {
//         prefixStart ??= start;
//       } else {
//         instructionStarts.push(prefixStart ?? start);
//         prefixStart = null;
//       }
//       parsed.push({
//         offset: start,
//         opcode: descriptor.name,
export const _l = 163;
