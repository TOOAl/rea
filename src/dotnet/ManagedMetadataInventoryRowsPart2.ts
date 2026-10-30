export const __stub = 1;
//   );
//   return {
//     name,
//     version,
//     culture: culture.length === 0 ? null : culture,
//     flags,
//     hash_algorithm: hashAlgorithm,
//     public_key: publicKeyIdentity(
//       key,
//       (flags & 1) === 0 ? "public-key-token" : "public-key",
//       layout,
//     ),
//     token: metadataToken(32, 1),
//     row_offset: table.offset,
//   };
// };
//
// export const readAssemblyReference = (
//   bytes: Buffer,
//   layout: ManagedMetadataLayout,
//   row: number,
//   heapExtent: number,
// ): AssemblyReference => {
//   const cursor = metadataRowCursor(bytes, layout, 35, row);
//   const version = [
//     cursor.readUInt16(),
//     cursor.readUInt16(),
//     cursor.readUInt16(),
//     cursor.readUInt16(),
//   ].join(".");
//   const flags = cursor.readUInt32();
//   const keyOrToken = readMetadataBlob(
//     bytes,
//     layout,
//     cursor.readIndex(layout.blobIndexSize),
//     heapExtent,
//   );
//   const name = readMetadataString(
//     bytes,
//     layout,
//     cursor.readIndex(layout.stringIndexSize),
//     heapExtent,
//   );
//   const culture = readMetadataString(
//     bytes,
//     layout,
//     cursor.readIndex(layout.stringIndexSize),
//     heapExtent,
//   );
//   const hashValue = readMetadataBlob(
//     bytes,
//     layout,
//     cursor.readIndex(layout.blobIndexSize),
//     heapExtent,
//   );
//   return {
//     name,
//     version,
//     culture: culture.length === 0 ? null : culture,
//     flags,
//     public_key_or_token: publicKeyIdentity(
//       keyOrToken,
//       (flags & 1) === 0 ? "public-key-token" : "public-key",
//       layout,
//     ),
//     hash_value_sha256:
//       hashValue.length === 0
//         ? null
//         : managedDecodeBudget(layout).digest(hashValue, "sha256"),
//     hash_value_length: hashValue.length,
//     token: metadataToken(35, row),
//     row_offset: metadataRowOffset(layout, 35, row),
//   };
// };
//
// interface ReadTypeNameContext {
//   readonly bytes: Buffer;
//   readonly layout: ManagedMetadataLayout;
//   readonly table: 1 | 2;
//   readonly row: number;
//   readonly heapExtent: number;
// }
//
// const readTypeName = ({
//   bytes,
//   layout,
//   table,
//   row,
//   heapExtent,
// }: ReadTypeNameContext): string | null => {
//   const descriptor = layout.table(table);
//   if (descriptor === undefined || row < 1 || row > descriptor.rowCount)
//     return null;
//   const cursor = metadataRowCursor(bytes, layout, table, row);
//   if (table === 1) cursor.readIndex(layout.codedIndexSize("ResolutionScope"));
//   else cursor.readUInt32();
//   const name = readMetadataString(
//     bytes,
//     layout,
//     cursor.readIndex(layout.stringIndexSize),
//     heapExtent,
//   );
//   const namespace = readMetadataString(
//     bytes,
//     layout,
//     cursor.readIndex(layout.stringIndexSize),
//     heapExtent,
//   );
//   return namespace.length === 0 ? name : `${namespace}.${name}`;
// };
//
// const declaringTypeForMethod = (
//   bytes: Buffer,
//   layout: ManagedMetadataLayout,
//   methodRow: number,
//   heapExtent: number,
//   memberLists: TypeMemberListFacts,
// ): string | null => {
//   const owner = memberDeclaringTypeRowLookup(
//     bytes,
//     layout,
//     6,
//     memberLists,
//   )(methodRow);
//   if (owner === 0) return null;
//   return readTypeName({ bytes, layout, table: 2, row: owner, heapExtent });
// };
//
// const attributeTypeName = (
//   bytes: Buffer,
//   layout: ManagedMetadataLayout,
//   rawType: number,
//   heapExtent: number,
//   memberLists: TypeMemberListFacts,
// ): string | null => {
export const _l = 135;
