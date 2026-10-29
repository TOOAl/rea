export const __stub = 1;
//   const table = layout.table(39);
//   for (let row = 1; row <= (table?.rowCount ?? 0); row += 1) {
//     readManagedValue(() => {
//       const cursor = metadataRowCursor(bytes, layout, 39, row);
//       const flags = cursor.readUInt32();
//       const typeDefId = cursor.readUInt32();
//       const name = readMetadataString(
//         bytes,
//         layout,
//         cursor.readIndex(layout.stringIndexSize),
//         layout.strings.size,
//       );
//       const namespace = readMetadataString(
//         bytes,
//         layout,
//         cursor.readIndex(layout.stringIndexSize),
//         layout.strings.size,
//       );
//       const implementationOffset = cursor.offset;
//       const implementationRaw = cursor.readIndex(
//         layout.codedIndexSize("Implementation"),
//       );
//       const token = metadataToken(39, row);
//       const implementationReason = metadataCodedTokenInvalidReason(
//         implementationRaw,
//         2,
//         [38, 35, 39],
//         layout.rowCounts,
//       );
//       if (implementationReason !== null || implementationRaw === 0)
//         issues.push({
//           code: "invalid-row",
//           scope: `metadata.ExportedType:${token}`,
//           offset: implementationOffset,
//           detail:
//             implementationReason === null
//               ? "ExportedType implementation coded index 0x0 is null, but the Implementation column must reference a row"
//               : `ExportedType implementation coded index 0x${implementationRaw.toString(16)} is invalid: ${implementationReason}`,
//         });
//       exportedTypes.push({
//         token,
//         row_offset: cursor.start,
//         namespace,
//         name,
//         flags,
//         forwarder: (flags & TYPE_FORWARDER_FLAG) !== 0,
//         type_def_id: typeDefId,
//         implementation_token: metadataCodedToken(
//           implementationRaw,
//           2,
//           [38, 35, 39],
//           layout.rowCounts,
//         ),
//       });
//     }, issues);
//   }
//   return { exportedTypes, issues };
// };
//
// export const parseMemberRefs = (
//   bytes: Buffer,
//   layout: ManagedMetadataLayout,
//   typeName: (token: string | null) => string | null,
//   signatureTypeName: SignatureTypeName,
// ): {
//   readonly refs: readonly ManagedMemberRef[];
//   readonly core: ReadonlyMap<string, MemberCore>;
//   readonly issues: readonly ManagedParseIssue[];
// } => {
//   const refs: ManagedMemberRef[] = [];
//   const core = new Map<string, MemberCore>();
//   const issues: ManagedParseIssue[] = [];
//   const table = layout.table(10);
//   for (let row = 1; row <= (table?.rowCount ?? 0); row += 1) {
//     readManagedValue(() => {
//       const cursor = metadataRowCursor(bytes, layout, 10, row);
//       const parentRaw = cursor.readIndex(
//         layout.codedIndexSize("MemberRefParent"),
//       );
//       const name = readMetadataString(
//         bytes,
//         layout,
//         cursor.readIndex(layout.stringIndexSize),
//         layout.strings.size,
//       );
//       const sig = readMetadataBlob(
//         bytes,
//         layout,
//         cursor.readIndex(layout.blobIndexSize),
//         layout.blob.size,
//       );
//       const token = metadataToken(10, row);
//       const parentReason = metadataCodedTokenInvalidReason(
//         parentRaw,
//         3,
//         [2, 1, 26, 6, 27],
//         layout.rowCounts,
//       );
//       if (parentReason !== null || parentRaw === 0)
//         issues.push({
//           code: "invalid-row",
//           scope: `metadata.MemberRef:${token}`,
//           offset: cursor.start,
//           detail:
//             parentReason === null
//               ? "MemberRef parent coded index 0x0 is null, but the Class column must reference a row"
//               : `MemberRef parent coded index 0x${parentRaw.toString(16)} is invalid: ${parentReason}`,
//         });
//       const parentToken = metadataCodedToken(
//         parentRaw,
//         3,
//         [2, 1, 26, 6, 27],
//         layout.rowCounts,
//       );
//       const parentName = typeName(parentToken);
//       const decoded = budgetedSignature(sig, layout, signatureTypeName);
//       refs.push({
//         token,
//         row_offset: cursor.start,
//         parent_token: parentToken,
//         parent_name: parentName,
//         name,
//         signature: decoded,
//       });
//       core.set(token, {
//         token,
//         name,
export const _l = 127;
