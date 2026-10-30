export const __stub = 1;
//     CUSTOM_ATTRIBUTE_TYPE_TABLES,
//     layout.rowCounts,
//   );
//   if (constructor === null) {
//     const typeReason = metadataCodedTokenInvalidReason(
//       typeRaw,
//       3,
//       CUSTOM_ATTRIBUTE_TYPE_TABLES,
//       layout.rowCounts,
//     );
//     issues.push({
//       code: "invalid-row",
//       scope: `metadata.CustomAttribute:${metadataToken(12, row)}`,
//       offset: typeOffset,
//       detail:
//         typeReason === null
//           ? "CustomAttribute constructor coded index 0x0 is null, but Type must reference a MethodDef or MemberRef row"
//           : `CustomAttribute constructor coded index 0x${typeRaw.toString(16)} is invalid: ${typeReason}`,
//     });
//   }
//   let typeName: string | null = null;
//   if (constructor !== null)
//     typeName =
//       readManagedValue(
//         () =>
//           attributeTypeName(bytes, layout, typeRaw, heapExtent, memberLists),
//         issues,
//       ) ?? null;
//   return {
//     parent_token: parent,
//     constructor_token: constructor,
//     type_name: typeName,
//     value_length: value.length,
//     value_sha256: managedDecodeBudget(layout).digest(value, "sha256"),
//     decoded_fixed_string:
//       typeName === "System.Runtime.Versioning.TargetFrameworkAttribute"
//         ? decodeFixedString(value, layout)
//         : null,
//     token: metadataToken(12, row),
//     row_offset: cursor.start,
//   };
// };
//
// interface ReadResourceContext {
//   readonly bytes: Buffer;
//   readonly layout: ManagedMetadataLayout;
//   readonly row: number;
//   readonly directory: ManagedResourceDirectory | null;
//   readonly issues: ManagedParseIssue[];
// }
//
// export const readResource = ({
//   bytes,
//   layout,
//   row,
//   directory,
//   issues,
// }: ReadResourceContext): ManagedResource => {
//   const cursor = metadataRowCursor(bytes, layout, 40, row);
//   const declaredOffset = cursor.readUInt32();
//   const flags = cursor.readUInt32();
//   const name = readMetadataString(
//     bytes,
//     layout,
//     cursor.readIndex(layout.stringIndexSize),
//     Math.max(layout.strings.size, layout.blob.size),
//   );
//   const implementationOffset = cursor.offset;
//   const implementationRaw = cursor.readIndex(
//     layout.codedIndexSize("Implementation"),
//   );
//   const implementationToken = metadataCodedToken(
//     implementationRaw,
//     2,
//     [38, 35, 39],
//     layout.rowCounts,
//   );
//   const implementationReason = metadataCodedTokenInvalidReason(
//     implementationRaw,
//     2,
//     [38, 35, 39],
//     layout.rowCounts,
//   );
//   if (implementationReason !== null)
//     issues.push({
//       code: "invalid-row",
//       scope: `metadata.ManifestResource:${metadataToken(40, row)}`,
//       offset: implementationOffset,
//       detail: `ManifestResource implementation coded index 0x${implementationRaw.toString(16)} is invalid: ${implementationReason}`,
//     });
//   let dataLength: number | null = null;
//   let dataSha256: string | null = null;
//   if (implementationRaw === 0) {
//     if (directory === null || declaredOffset > directory.size - 4) {
//       issues.push({
//         code: "invalid-resource",
//         scope: `metadata.ManifestResource:${metadataToken(40, row)}`,
//         offset: directory?.offset ?? null,
//         detail: "Embedded resource offset leaves the CLI resources directory",
//       });
//     } else {
//       const start = directory.offset + declaredOffset;
//       dataLength = bytes.readUInt32LE(start);
//       if (dataLength > directory.size - declaredOffset - 4) {
//         issues.push({
//           code: "invalid-resource",
//           scope: `metadata.ManifestResource:${metadataToken(40, row)}`,
//           offset: start,
//           detail: "Embedded resource length leaves the CLI resources directory",
//         });
//       } else {
//         dataSha256 = managedDecodeBudget(layout).digest(
//           bytes.subarray(start + 4, start + 4 + dataLength),
//           "sha256",
//         );
//       }
//     }
//   }
//   return {
//     name,
//     flags,
//     visibility:
//       (flags & 7) === 1 ? "public" : (flags & 7) === 2 ? "private" : "unknown",
//     implementation_token: implementationToken,
//     embedded: implementationRaw === 0,
//     declared_offset: declaredOffset,
//     data_length: dataLength,
//     data_sha256: dataSha256,
//     token: metadataToken(40, row),
//     row_offset: cursor.start,
//   };
// };
export const _l = 132;
