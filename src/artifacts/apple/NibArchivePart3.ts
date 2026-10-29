export const __stub = 1;
//       cursor.offset,
//       next,
//       `class ${index}`,
//     ).replace(/\0+$/u, "");
//     cursor.offset = next;
//     output.push(name);
//   }
//   return output;
// };
//
// const parseValues = (
//   bytes: Buffer,
//   start: number,
//   end: number,
//   count: number,
//   keyCount: number,
//   needed: ReadonlySet<number>,
//   budget: InterfaceBuilderDecodeBudget,
// ): Map<number, NibValueRecord> => {
//   const cursor = { offset: start };
//   const output = new Map<number, NibValueRecord>();
//   for (let index = 0; index < count; index += 1) {
//     const keyIndex = readVarint(bytes, cursor, end);
//     if (keyIndex >= keyCount)
//       throw new TypeError(
//         `NIBArchive value ${index} references an invalid key`,
//       );
//     ensureRange(cursor.offset, 1, end, `value ${index} type`);
//     const type = bytes[cursor.offset++] ?? -1;
//     if (!needed.has(index)) {
//       skipValue(bytes, cursor, end, type, index);
//       continue;
//     }
//     budget.reserve(
//       64,
//       "NIBArchive decoded values exceed the aggregate Interface Builder decode budget",
//     );
//     const value = readValue(bytes, cursor, end, type, index, budget);
//     output.set(index, { key_index: keyIndex, value });
//   }
//   if (cursor.offset > end)
//     throw new TypeError("NIBArchive value table overlaps the next table");
//   return output;
// };
//
// const readValue = (
//   bytes: Buffer,
//   cursor: { offset: number },
//   end: number,
//   type: number,
//   index: number,
//   budget: InterfaceBuilderDecodeBudget,
// ): JsonValue => {
//   switch (type) {
//     case 0:
//       ensureRange(cursor.offset, 1, end, `value ${index}`);
//       return bytes.readInt8(cursor.offset++);
//     case 1:
//       ensureRange(cursor.offset, 2, end, `value ${index}`);
//       {
//         const value = bytes.readInt16LE(cursor.offset);
//         cursor.offset += 2;
//         return value;
//       }
//     case 2:
//       ensureRange(cursor.offset, 4, end, `value ${index}`);
//       {
//         const value = bytes.readInt32LE(cursor.offset);
//         cursor.offset += 4;
//         return value;
//       }
//     case 3:
//       ensureRange(cursor.offset, 8, end, `value ${index}`);
//       {
//         const value = bytes.readBigInt64LE(cursor.offset);
//         cursor.offset += 8;
//         return value <= BigInt(Number.MAX_SAFE_INTEGER) &&
//           value >= BigInt(Number.MIN_SAFE_INTEGER)
//           ? Number(value)
//           : value.toString();
//       }
//     case 4:
//       return true;
//     case 5:
//       return false;
//     case 6:
//       ensureRange(cursor.offset, 4, end, `value ${index}`);
//       {
//         const value = bytes.readFloatLE(cursor.offset);
//         cursor.offset += 4;
//         return Number.isFinite(value) ? value : null;
//       }
//     case 7:
//       ensureRange(cursor.offset, 8, end, `value ${index}`);
//       {
//         const value = bytes.readDoubleLE(cursor.offset);
//         cursor.offset += 8;
//         return Number.isFinite(value) ? value : null;
//       }
//     case 8: {
//       const length = readVarint(bytes, cursor, end);
//       const next = checkedEnd(
//         cursor.offset,
//         length,
//         end,
//         `value ${index} data`,
//       );
//       budget.reserve(
//         32 + 4 * Math.ceil(length / 3),
//         `NIBArchive data value ${index} exceeds the aggregate Interface Builder decode budget`,
//       );
//       const encoded = bytes.subarray(cursor.offset, next).toString("base64");
//       cursor.offset = next;
//       return { $nib_data_base64: encoded };
//     }
//     case 9:
//       return null;
//     case 10:
//       ensureRange(cursor.offset, 4, end, `value ${index} reference`);
//       {
//         const objectIndex = bytes.readUInt32LE(cursor.offset);
//         cursor.offset += 4;
//         return { $nib_object_ref: objectIndex };
//       }
//     default:
//       throw new TypeError(
//         `NIBArchive value ${index} has unsupported type ${type}`,
//       );
//   }
// };
//
// const skipValue = (
//   bytes: Buffer,
//   cursor: { offset: number },
//   end: number,
//   type: number,
//   index: number,
// ): void => {
//   switch (type) {
//     case 0:
//       ensureRange(cursor.offset, 1, end, `value ${index}`);
//       cursor.offset += 1;
//       return;
//     case 1:
//       ensureRange(cursor.offset, 2, end, `value ${index}`);
//       cursor.offset += 2;
//       return;
//     case 2:
export const _l = 148;
