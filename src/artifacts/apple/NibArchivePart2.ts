export const __stub = 1;
//   for (const object of objects)
//     if (
//       /(?:Outlet|Connection|Segue|ActionConnection)/iu.test(object.class_name)
//     )
//       connectionObjectCount += 1;
//
//   return {
//     format_version: formatVersion,
//     coder_version: coderVersion,
//     object_count: objectCount,
//     connection_object_count: connectionObjectCount,
//     objects,
//     classes,
//     limitations: [
//       "NIBArchive class extensions and unsupported value encodings are retained as unavailable fields.",
//       "NIBArchive object relationships are decoded from serialized references; runtime object creation and execution are not performed.",
//     ],
//   };
// };
//
// const parseObjects = (
//   bytes: Buffer,
//   start: number,
//   end: number,
//   count: number,
//   valueCount: number,
//   classCount: number,
// ): NibObjectRecord[] => {
//   const cursor = { offset: start };
//   const output: NibObjectRecord[] = [];
//   for (let index = 0; index < count; index += 1) {
//     const classIndex = readVarint(bytes, cursor, end);
//     const valueStart = readVarint(bytes, cursor, end);
//     const countForObject = readVarint(bytes, cursor, end);
//     if (
//       classIndex >= classCount ||
//       valueStart > valueCount ||
//       countForObject > valueCount - valueStart
//     )
//       throw new TypeError(
//         `NIBArchive object ${index} references an invalid table range`,
//       );
//     output.push({
//       class_index: classIndex,
//       value_start: valueStart,
//       value_count: countForObject,
//     });
//   }
//   if (cursor.offset > end)
//     throw new TypeError("NIBArchive object table overlaps the next table");
//   return output;
// };
//
// const preflightProjectedFieldCount = (
//   bytes: Buffer,
//   start: number,
//   end: number,
//   objectCount: number,
//   valueCount: number,
//   classCount: number,
//   maxBytes: number,
// ): number => {
//   if (objectCount * 96 > maxBytes)
//     throw new InterfaceBuilderDecodeBudgetExceeded(
//       "aggregate_decode_budget_exhausted",
//       "NIBArchive object count exceeds the aggregate Interface Builder decode budget",
//     );
//   const cursor = { offset: start };
//   let projectedFields = 0;
//   for (let index = 0; index < objectCount; index += 1) {
//     const classIndex = readVarint(bytes, cursor, end);
//     const valueStart = readVarint(bytes, cursor, end);
//     const fieldCount = readVarint(bytes, cursor, end);
//     if (
//       classIndex >= classCount ||
//       valueStart > valueCount ||
//       fieldCount > valueCount - valueStart
//     )
//       throw new TypeError(
//         `NIBArchive object ${index} references an invalid table range`,
//       );
//     projectedFields += fieldCount;
//     if (
//       !Number.isSafeInteger(projectedFields) ||
//       projectedFields * 96 > maxBytes - objectCount * 96
//     )
//       throw new InterfaceBuilderDecodeBudgetExceeded(
//         "aggregate_decode_budget_exhausted",
//         "NIBArchive projected field ranges exceed the aggregate Interface Builder decode budget",
//       );
//   }
//   return projectedFields;
// };
//
// const parseStrings = (
//   bytes: Buffer,
//   start: number,
//   end: number,
//   count: number,
//   label: string,
//   budget: InterfaceBuilderDecodeBudget,
// ): string[] => {
//   const cursor = { offset: start };
//   const output: string[] = [];
//   for (let index = 0; index < count; index += 1) {
//     const length = readVarint(bytes, cursor, end);
//     const next = checkedEnd(cursor.offset, length, end, `${label} ${index}`);
//     budget.reserve(
//       32 + length * 2,
//       `NIBArchive ${label} strings exceed the aggregate Interface Builder decode budget`,
//     );
//     const value = decodeUtf8(bytes, cursor.offset, next, `${label} ${index}`);
//     cursor.offset = next;
//     output.push(value);
//   }
//   return output;
// };
//
// const parseClasses = (
//   bytes: Buffer,
//   start: number,
//   end: number,
//   count: number,
//   budget: InterfaceBuilderDecodeBudget,
// ): string[] => {
//   const cursor = { offset: start };
//   const output: string[] = [];
//   for (let index = 0; index < count; index += 1) {
//     const length = readVarint(bytes, cursor, end);
//     const extraCount = readVarint(bytes, cursor, end);
//     if (extraCount > 16)
//       throw new TypeError(
//         `NIBArchive class ${index} has too many extension values`,
//       );
//     ensureRange(
//       cursor.offset,
//       extraCount * 4,
//       end,
//       `class ${index} extensions`,
//     );
//     cursor.offset += extraCount * 4;
//     const next = checkedEnd(cursor.offset, length, end, `class ${index}`);
//     budget.reserve(
//       32 + length * 2,
//       "NIBArchive class names exceed the aggregate Interface Builder decode budget",
//     );
//     const name = decodeUtf8(
//       bytes,
export const _l = 148;
