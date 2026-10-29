export const __stub = 1;
// import {
//   admitManagedProjection,
//   managedDecodeBudget,
//   managedJsonStringBytes,
//   type ManagedDecodeBudget,
// } from "./ManagedDecodeBudget.js";
// import type { ManagedPeLayout } from "./ManagedPeReader.js";
// import type { ManagedParseIssue } from "../domain/managed/managedArtifact.js";
// import type { ManagedMetadataLayout } from "./ManagedMetadataLayout.js";
// import {
//   signature,
//   signatureGenericArity,
//   type ManagedCallEdge,
//   type ManagedExportedType,
//   type ManagedField,
//   type ManagedFieldAccess,
//   type ManagedMemberRef,
//   type ManagedMethod,
//   type MemberCore,
//   type SignatureTypeName,
//   type TypeRange,
// } from "./ManagedMemberInspectorCore.js";
// import {
//   metadataToken,
//   metadataRowCursor,
//   metadataCodedToken,
//   metadataCodedTokenInvalidReason,
//   readMetadataBlob,
//   readMetadataString,
// } from "./ManagedMetadataHeaps.js";
// import { readManagedValue } from "./ManagedReaderFailure.js";
// import { methodBody } from "./ManagedMethodBodyReader.js";
// import { memberDeclaringTypeRowLookup } from "./ManagedMemberOwnership.js";
// import type { TypeMemberListFacts } from "./ManagedTypeMemberLists.js";
//
// /**
//  * Declaring-type tokens whose members are decoded in full; null selects every
//  * type. Unselected members keep only their name so edges stay labelled.
//  */
// export type SelectedTypeTokens = ReadonlySet<string> | null;
//
// const isSelected = (
//   selected: SelectedTypeTokens,
//   declared: { readonly token: string } | undefined,
// ): boolean =>
//   selected === null || (declared !== undefined && selected.has(declared.token));
//
// export const parseFields = (
//   bytes: Buffer,
//   layout: ManagedMetadataLayout,
//   ranges: readonly TypeRange[],
//   memberLists: TypeMemberListFacts,
//   {
//     signatureTypeName,
//     selected = null,
//   }: {
//     readonly signatureTypeName: SignatureTypeName;
//     readonly selected?: SelectedTypeTokens;
//   },
// ): {
//   readonly fields: readonly ManagedField[];
//   readonly core: ReadonlyMap<string, MemberCore>;
//   readonly issues: readonly ManagedParseIssue[];
// } => {
//   const fields: ManagedField[] = [];
//   const core = new Map<string, MemberCore>();
//   const issues: ManagedParseIssue[] = [];
//   const table = layout.table(4);
//   const ownerRow = readManagedValue(
//     () => memberDeclaringTypeRowLookup(bytes, layout, 4, memberLists),
//     issues,
//   );
//   for (let row = 1; row <= (table?.rowCount ?? 0); row += 1) {
//     readManagedValue(() => {
//       const cursor = metadataRowCursor(bytes, layout, 4, row);
//       const flags = cursor.readUInt16();
//       const name = readMetadataString(
//         bytes,
//         layout,
//         cursor.readIndex(layout.stringIndexSize),
//         layout.strings.size,
//       );
//       const owner =
//         ownerRow === undefined
//           ? 0
//           : (readManagedValue(() => ownerRow(row), issues) ?? 0);
//       const declared = ranges[owner - 1];
//       const token = metadataToken(4, row);
//       core.set(token, {
//         token,
//         name,
//         declaringType: declared?.fullName ?? null,
//         kind: "field",
//       });
//       if (!isSelected(selected, declared)) return;
//       const sig = readMetadataBlob(
//         bytes,
//         layout,
//         cursor.readIndex(layout.blobIndexSize),
//         layout.blob.size,
//       );
//       fields.push({
//         token,
//         row_offset: cursor.start,
//         declaring_type_token: declared?.token ?? null,
//         declaring_type: declared?.fullName ?? null,
//         name,
//         flags,
//         signature: budgetedSignature(sig, layout, signatureTypeName),
//       });
//     }, issues);
//   }
//   return { fields, core, issues };
// };
//
// const TYPE_FORWARDER_FLAG = 0x0020_0000;
//
// /** Read ExportedType rows, including type forwarders, as declared. */
// export const parseExportedTypes = (
//   bytes: Buffer,
//   layout: ManagedMetadataLayout,
// ): {
//   readonly exportedTypes: readonly ManagedExportedType[];
//   readonly issues: readonly ManagedParseIssue[];
// } => {
//   const exportedTypes: ManagedExportedType[] = [];
//   const issues: ManagedParseIssue[] = [];
export const _l = 127;
