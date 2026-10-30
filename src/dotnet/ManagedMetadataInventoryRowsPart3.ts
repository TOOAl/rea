export const __stub = 1;
//   const tag = rawType & 7;
//   const row = Math.floor(rawType / 8);
//   if (row === 0) return null;
//   if (tag === 2)
//     return declaringTypeForMethod(bytes, layout, row, heapExtent, memberLists);
//   if (tag !== 3) return null;
//   const memberRefs = layout.table(10);
//   if (memberRefs === undefined || row > memberRefs.rowCount) return null;
//   const cursor = metadataRowCursor(bytes, layout, 10, row);
//   const parent = cursor.readIndex(layout.codedIndexSize("MemberRefParent"));
//   const parentTag = parent & 7;
//   const parentRow = Math.floor(parent / 8);
//   if (parentTag === 0)
//     return readTypeName({
//       bytes,
//       layout,
//       table: 2,
//       row: parentRow,
//       heapExtent,
//     });
//   if (parentTag === 1)
//     return readTypeName({
//       bytes,
//       layout,
//       table: 1,
//       row: parentRow,
//       heapExtent,
//     });
//   if (parentTag === 3)
//     return declaringTypeForMethod(
//       bytes,
//       layout,
//       parentRow,
//       heapExtent,
//       memberLists,
//     );
//   return null;
// };
//
// const decodeCompressedLength = (
//   blob: Buffer,
//   offset: number,
// ): { readonly length: number; readonly prefix: number } | undefined => {
//   const first = blob[offset];
//   if (first === undefined) return undefined;
//   if ((first & 0x80) === 0) return { length: first, prefix: 1 };
//   if ((first & 0xc0) === 0x80 && blob[offset + 1] !== undefined)
//     return {
//       length: ((first & 0x3f) << 8) | (blob[offset + 1] ?? 0),
//       prefix: 2,
//     };
//   if (
//     (first & 0xe0) === 0xc0 &&
//     blob[offset + 1] !== undefined &&
//     blob[offset + 2] !== undefined &&
//     blob[offset + 3] !== undefined
//   )
//     return {
//       length:
//         (first & 0x1f) * 0x01_00_00_00 +
//         (blob[offset + 1] ?? 0) * 0x01_00_00 +
//         (blob[offset + 2] ?? 0) * 0x0100 +
//         (blob[offset + 3] ?? 0),
//       prefix: 4,
//     };
//   return undefined;
// };
//
// const decodeFixedString = (
//   blob: Buffer,
//   layout: ManagedMetadataLayout,
// ): string | null => {
//   if (blob.length < 3 || blob.readUInt16LE(0) !== 1 || blob[2] === 0xff)
//     return null;
//   const length = decodeCompressedLength(blob, 2);
//   if (length === undefined) return null;
//   const start = 2 + length.prefix;
//   if (start > blob.length - length.length) return null;
//   managedDecodeBudget(layout).reserveString(length.length, layout.blob.offset);
//   try {
//     return new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(
//       blob.subarray(start, start + length.length),
//     );
//   } catch (cause: unknown) {
//     // Invalid UTF-8 blobs decode as null.
//     void cause;
//     return null;
//   }
// };
//
// export const readCustomAttribute = (
//   bytes: Buffer,
//   layout: ManagedMetadataLayout,
//   row: number,
//   heapExtent: number,
//   issues: ManagedParseIssue[],
//   memberLists: TypeMemberListFacts,
// ): CustomAttribute => {
//   const cursor = metadataRowCursor(bytes, layout, 12, row);
//   const parentRaw = cursor.readIndex(
//     layout.codedIndexSize("HasCustomAttribute"),
//   );
//   const typeOffset = cursor.offset;
//   const typeRaw = cursor.readIndex(
//     layout.codedIndexSize("CustomAttributeType"),
//   );
//   const value = readMetadataBlob(
//     bytes,
//     layout,
//     cursor.readIndex(layout.blobIndexSize),
//     heapExtent,
//   );
//   const parent = metadataCodedToken(
//     parentRaw,
//     5,
//     HAS_CUSTOM_ATTRIBUTE_TABLES,
//     layout.rowCounts,
//   );
//   if (parent === null) {
//     const parentReason = metadataCodedTokenInvalidReason(
//       parentRaw,
//       5,
//       HAS_CUSTOM_ATTRIBUTE_TABLES,
//       layout.rowCounts,
//     );
//     throw managedFailure(
//       "invalid-row",
//       `metadata.CustomAttribute:${metadataToken(12, row)}`,
//       `CustomAttribute parent coded index 0x${parentRaw.toString(16)} is invalid${parentReason === null ? " because the required parent is null" : `: ${parentReason}`}`,
//       cursor.start,
//     );
//   }
//   const constructor = metadataCodedToken(
//     typeRaw,
//     3,
export const _l = 135;
