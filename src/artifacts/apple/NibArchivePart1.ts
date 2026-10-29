export const __stub = 1;
// import type { JsonValue } from "../../domain/jsonValue.js";
// import { hasNibArchiveSignature } from "../../domain/apple/appleArchiveFormat.js";
// import { TextDecoder } from "node:util";
// import {
//   InterfaceBuilderDecodeBudget,
//   InterfaceBuilderDecodeBudgetExceeded,
// } from "./InterfaceBuilderDecodeBudget.js";
//
// const DEFAULT_DECODE_BUDGET_BYTES = 128 * 1024 * 1024;
//
// interface NibObjectRecord {
//   readonly class_index: number;
//   readonly value_start: number;
//   readonly value_count: number;
// }
//
// interface NibValueRecord {
//   readonly key_index: number;
//   readonly value: JsonValue;
// }
//
// /** Parsed NIBArchive payload with the original object indices preserved. */
// export interface NibArchiveDocument {
//   readonly format_version: number;
//   readonly coder_version: number;
//   readonly object_count: number;
//   readonly connection_object_count: number;
//   readonly objects: readonly {
//     readonly id: number;
//     readonly class_name: string;
//     readonly values: Readonly<Record<string, JsonValue>>;
//   }[];
//   readonly classes: readonly string[];
//   readonly limitations: readonly string[];
// }
//
// /** Decode Apple's length-prefixed NIBArchive representation without loading UI classes. */
// export const decodeNibArchive = (
//   bytes: Buffer,
//   budget = new InterfaceBuilderDecodeBudget(DEFAULT_DECODE_BUDGET_BYTES),
// ): NibArchiveDocument => {
//   if (bytes.length < 50 || !hasNibArchiveSignature(bytes))
//     throw new TypeError("NIBArchive magic or header is invalid");
//
//   const formatVersion = readU32(bytes, 10);
//   const coderVersion = readU32(bytes, 14);
//   if (formatVersion !== 1)
//     throw new TypeError(
//       `Unsupported NIBArchive format version ${formatVersion}`,
//     );
//
//   const objectCount = readCount(bytes, 18, "object");
//   const objectsOffset = readOffset(bytes, 22, bytes.length, "object");
//   const keyCount = readCount(bytes, 26, "key");
//   const keysOffset = readOffset(bytes, 30, bytes.length, "key");
//   const valueCount = readCount(bytes, 34, "value");
//   const valuesOffset = readOffset(bytes, 38, bytes.length, "value");
//   const classCount = readCount(bytes, 42, "class");
//   const classesOffset = readOffset(bytes, 46, bytes.length, "class");
//
//   assertOrderedOffsets(bytes.length, [
//     objectsOffset,
//     keysOffset,
//     valuesOffset,
//     classesOffset,
//   ]);
//   const projectedFieldCount = preflightProjectedFieldCount(
//     bytes,
//     objectsOffset,
//     keysOffset,
//     objectCount,
//     valueCount,
//     classCount,
//     budget.remainingBytes,
//   );
//   budget.reserve(
//     objectCount * 96 + projectedFieldCount * 96,
//     "NIBArchive object and projected field counts exceed the aggregate Interface Builder decode budget",
//   );
//   const objectRecords = parseObjects(
//     bytes,
//     objectsOffset,
//     keysOffset,
//     objectCount,
//     valueCount,
//     classCount,
//   );
//   const keys = parseStrings(
//     bytes,
//     keysOffset,
//     valuesOffset,
//     keyCount,
//     "key",
//     budget,
//   );
//   const classes = parseClasses(
//     bytes,
//     classesOffset,
//     bytes.length,
//     classCount,
//     budget,
//   );
//   const neededValues = valueIndexes(objectRecords, valueCount);
//   const values = parseValues(
//     bytes,
//     valuesOffset,
//     classesOffset,
//     valueCount,
//     keyCount,
//     neededValues,
//     budget,
//   );
//   for (const { value } of values.values()) {
//     if (
//       typeof value === "object" &&
//       value !== null &&
//       !Array.isArray(value) &&
//       typeof value.$nib_object_ref === "number" &&
//       value.$nib_object_ref >= objectCount
//     )
//       throw new TypeError(
//         "NIBArchive object reference is outside the object table",
//       );
//   }
//   const objects = objectRecords.flatMap((object, id) => {
//     const className = classes[object.class_index];
//     if (className === undefined) return [];
//     const fields: Record<string, JsonValue> = {};
//     for (
//       let index = object.value_start;
//       index < object.value_start + object.value_count;
//       index += 1
//     ) {
//       const value = values.get(index);
//       if (value === undefined) continue;
//       const key = keys[value.key_index];
//       if (key !== undefined)
//         // Archive keys are data, including the legacy __proto__ setter name.
//         Object.defineProperty(fields, key, {
//           value: value.value,
//           enumerable: true,
//           configurable: true,
//           writable: true,
//         });
//     }
//     return [{ id, class_name: className, values: fields }];
//   });
//   let connectionObjectCount = 0;
export const _l = 148;
