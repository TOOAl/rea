export const __stub = 1;
// import { managedDecodeBudget } from "./ManagedDecodeBudget.js";
// import { memberDeclaringTypeRowLookup } from "./ManagedMemberOwnership.js";
// import type { TypeMemberListFacts } from "./ManagedTypeMemberLists.js";
//
// import type {
//   ManagedArtifactInspection,
//   ManagedParseIssue,
// } from "../domain/managed/managedArtifact.js";
// import {
//   metadataRowOffset,
//   type ManagedMetadataLayout,
// } from "./ManagedMetadataLayout.js";
// import {
//   metadataRowCursor,
//   metadataCodedToken,
//   metadataCodedTokenInvalidReason,
//   metadataToken,
//   readMetadataBlob,
//   readMetadataGuid,
//   readMetadataString,
// } from "./ManagedMetadataHeaps.js";
// import { managedFailure, readManagedValue } from "./ManagedReaderFailure.js";
// import type { ManagedResourceDirectory } from "./ManagedMetadataInventory.js";
//
// type ModuleIdentity = NonNullable<ManagedArtifactInspection["module"]>;
// type AssemblyIdentity = NonNullable<ManagedArtifactInspection["assembly"]>;
// type AssemblyReference = ManagedArtifactInspection["references"][number];
// type ManagedResource = ManagedArtifactInspection["resources"][number];
// type CustomAttribute = ManagedArtifactInspection["attributes"][number];
//
// const HAS_CUSTOM_ATTRIBUTE_TABLES = [
//   6, 4, 1, 2, 8, 9, 10, 0, 14, 23, 20, 17, 26, 27, 32, 35, 38, 39, 40, 42, 44,
//   43,
// ] as const;
//
// const CUSTOM_ATTRIBUTE_TYPE_TABLES = [undefined, undefined, 6, 10] as const;
//
// const publicKeyIdentity = (
//   bytes: Buffer,
//   kind: "public-key" | "public-key-token",
//   layout: ManagedMetadataLayout,
// ): AssemblyIdentity["public_key"] => ({
//   kind: bytes.length === 0 ? "none" : kind,
//   byte_length: bytes.length,
//   sha256:
//     bytes.length === 0
//       ? null
//       : managedDecodeBudget(layout).digest(bytes, "sha256"),
//   token:
//     bytes.length === 0
//       ? null
//       : kind === "public-key"
//         ? Buffer.from(managedDecodeBudget(layout).digest(bytes, "sha1"), "hex")
//             .subarray(-8)
//             .reverse()
//             .toString("hex")
//         : bytes.length === 8
//           ? bytes.toString("hex")
//           : null,
// });
//
// export const readModule = (
//   bytes: Buffer,
//   layout: ManagedMetadataLayout,
//   heapExtent: number,
// ): ModuleIdentity | null => {
//   const table = layout.table(0);
//   if (table === undefined || table.rowCount === 0) return null;
//   const cursor = metadataRowCursor(bytes, layout, 0, 1);
//   const generation = cursor.readUInt16();
//   const name = readMetadataString(
//     bytes,
//     layout,
//     cursor.readIndex(layout.stringIndexSize),
//     heapExtent,
//   );
//   const mvid = readMetadataGuid(
//     bytes,
//     layout,
//     cursor.readIndex(layout.guidIndexSize),
//   );
//   const encId = readMetadataGuid(
//     bytes,
//     layout,
//     cursor.readIndex(layout.guidIndexSize),
//   );
//   const encBaseId = readMetadataGuid(
//     bytes,
//     layout,
//     cursor.readIndex(layout.guidIndexSize),
//   );
//   return {
//     name,
//     generation,
//     mvid,
//     enc_id: encId,
//     enc_base_id: encBaseId,
//     token: metadataToken(0, 1),
//     row_offset: table.offset,
//   };
// };
//
// export const readAssembly = (
//   bytes: Buffer,
//   layout: ManagedMetadataLayout,
//   heapExtent: number,
// ): AssemblyIdentity | null => {
//   const table = layout.table(32);
//   if (table === undefined || table.rowCount === 0) return null;
//   const cursor = metadataRowCursor(bytes, layout, 32, 1);
//   const hashAlgorithm = cursor.readUInt32();
//   const version = [
//     cursor.readUInt16(),
//     cursor.readUInt16(),
//     cursor.readUInt16(),
//     cursor.readUInt16(),
//   ].join(".");
//   const flags = cursor.readUInt32();
//   const key = readMetadataBlob(
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
export const _l = 135;
