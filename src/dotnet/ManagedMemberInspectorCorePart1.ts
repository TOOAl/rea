export const __stub = 1;
// import { createHash } from "node:crypto";
//
// import {
//   managedFailure,
//   ManagedReaderFailure,
//   readManagedValue,
// } from "./ManagedReaderFailure.js";
// import type {
//   ManagedMemberInspection,
//   ManagedParseIssue,
// } from "../domain/managed/managedArtifact.js";
// import { managedDecodeBudget } from "./ManagedDecodeBudget.js";
// import {
//   readManagedTypeNesting,
//   type ManagedTypeNesting,
// } from "./ManagedTypeNesting.js";
// import type {
//   ManagedMetadataLayout,
//   MetadataTableLayout,
// } from "./ManagedMetadataLayout.js";
// import {
//   metadataRowCursor,
//   metadataCodedToken,
//   metadataCodedTokenInvalidReason,
//   metadataToken,
//   readMetadataString,
//   sha256Bytes,
// } from "./ManagedMetadataHeaps.js";
// import { memberListTable } from "./ManagedMemberPointers.js";
// import type { TypeMemberListFacts } from "./ManagedTypeMemberLists.js";
//
// export type ManagedType = ManagedMemberInspection["types"][number];
// export type ManagedExportedType = NonNullable<
//   ManagedMemberInspection["exported_types"]
// >[number];
// export type ManagedField = ManagedMemberInspection["fields"][number];
// export type ManagedMethod = ManagedMemberInspection["methods"][number];
// export type ManagedMemberRef = ManagedMemberInspection["member_refs"][number];
// export type ManagedCallEdge = ManagedMemberInspection["call_edges"][number];
// export type ManagedFieldAccess =
//   ManagedMemberInspection["field_accesses"][number];
// export type ManagedUserString = NonNullable<
//   ManagedMemberInspection["user_strings"]
// >["literals"][number];
// export type ManagedSignature = ManagedMethod["signature"];
// export type ManagedMethodBody = ManagedMethod["body"];
// export type ManagedInstructionAnchor = ManagedMethodBody["anchors"][number];
// export type ManagedExceptionRegion =
//   ManagedMethodBody["exception_regions"][number];
//
// export interface TypeRange {
//   readonly token: string;
//   readonly fullName: string | null;
//   readonly fieldStart: number | null;
//   readonly fieldEnd: number | null;
//   readonly methodStart: number | null;
//   readonly methodEnd: number | null;
// }
//
// /**
//  * Name and declaring type of a field, method, member reference, or method
//  * specification, keyed by its token so edges resolve any target uniformly.
//  */
// export interface MemberCore {
//   readonly token: string;
//   readonly name: string;
//   readonly declaringType: string | null;
//   /** Fields and methods by table; member references by decoded signature. */
//   readonly kind: ManagedSignature["kind"];
//   /**
//    * Generic arity from the owner's decoded signature (see
//    * `signatureGenericArity`); absent when no owner decoded it, as for a
//    * MethodDef outside the type selection.
//    */
//   readonly genericArity?: number | null;
// }
//
// export interface ParsedInstruction {
//   readonly offset: number;
//   readonly opcode: string;
//   readonly operandKind: ManagedInstructionAnchor["operand_kind"];
//   readonly operand: string | null;
// }
//
// const rowRange = (
//   table: MetadataTableLayout | undefined,
//   start: number | null,
//   end: number | null,
// ): {
//   readonly first: number | null;
//   readonly last: number | null;
//   readonly count: number;
// } => {
//   const total = table?.rowCount ?? 0;
//   if (start === null || end === null)
//     return { first: null, last: null, count: 0 };
//   const lastExclusive = Math.min(end, total + 1);
//   if (start >= lastExclusive) return { first: null, last: null, count: 0 };
//   return {
//     first: start,
//     last: lastExclusive - 1,
//     count: lastExclusive - start,
//   };
// };
//
// export const fullName = (namespace: string, name: string): string =>
//   namespace.length === 0 ? name : `${namespace}.${name}`;
//
// const readTypeRange = (
//   bytes: Buffer,
//   layout: ManagedMetadataLayout,
//   row: number,
//   issues: ManagedParseIssue[],
//   memberLists: TypeMemberListFacts,
// ): TypeRange => {
//   const cursor = metadataRowCursor(bytes, layout, 2, row);
//   cursor.readUInt32();
//   const nameIndex = cursor.readIndex(layout.stringIndexSize);
//   const namespaceIndex = cursor.readIndex(layout.stringIndexSize);
//   const declaredName =
//     readManagedValue(
//       () =>
//         fullName(
//           readMetadataString(
//             bytes,
//             layout,
//             namespaceIndex,
//             layout.strings.size,
//           ),
//           readMetadataString(bytes, layout, nameIndex, layout.strings.size),
//         ),
//       issues,
//     ) ?? null;
//   cursor.readIndex(layout.codedIndexSize("TypeDefOrRef"));
//   const current = memberLists.entries[row - 1];
//   return {
//     token: metadataToken(2, row),
//     fullName: declaredName,
//     fieldStart: current?.field.start.value ?? null,
//     fieldEnd: current?.field.end ?? null,
//     methodStart: current?.method.start.value ?? null,
//     methodEnd: current?.method.end ?? null,
//   };
// };
//
// export const typeRanges = (
//   bytes: Buffer,
//   layout: ManagedMetadataLayout,
//   issues: ManagedParseIssue[],
//   memberLists: TypeMemberListFacts,
// ): readonly TypeRange[] => {
//   issues.push(...memberLists.issues);
//   const typeTable = layout.table(2);
//   const ranges: TypeRange[] = [];
//   for (let row = 1; row <= (typeTable?.rowCount ?? 0); row += 1)
//     ranges.push(readTypeRange(bytes, layout, row, issues, memberLists));
//   return ranges;
// };
//
// /**
//  * Enclosing TypeDef row of each nested TypeDef row, from the NestedClass
//  * table. Nesting is complete only when every row was read and valid.
//  */
// export const parseTypes = (
//   bytes: Buffer,
//   layout: ManagedMetadataLayout,
//   ranges: readonly TypeRange[],
// ): {
//   readonly types: readonly ManagedType[];
//   readonly issues: readonly ManagedParseIssue[];
//   readonly nesting: ManagedTypeNesting;
// } => {
//   const typeTable = layout.table(2);
//   const fields = memberListTable(layout, 4);
//   const methods = memberListTable(layout, 6);
//   const items: ManagedType[] = [];
//   const issues: ManagedParseIssue[] = [];
//   const nesting = readManagedTypeNesting(bytes, layout, issues);
//   for (let row = 1; row <= (typeTable?.rowCount ?? 0); row += 1) {
//     readManagedValue(() => {
//       const cursor = metadataRowCursor(bytes, layout, 2, row);
//       const flags = cursor.readUInt32();
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
//       const extendsOffset = cursor.offset;
//       const extendsRaw = cursor.readIndex(
//         layout.codedIndexSize("TypeDefOrRef"),
//       );
//       const currentRange = ranges[row - 1] ?? null;
//       const fieldRange = rowRange(
//         fields,
//         currentRange?.fieldStart ?? null,
//         currentRange?.fieldEnd ?? null,
//       );
//       const methodRange = rowRange(
//         methods,
//         currentRange?.methodStart ?? null,
//         currentRange?.methodEnd ?? null,
//       );
//       const extendsReason = metadataCodedTokenInvalidReason(
//         extendsRaw,
//         2,
//         [2, 1, 27],
//         layout.rowCounts,
//       );
//       if (extendsReason !== null)
//         issues.push({
//           code: "invalid-row",
//           scope: `metadata.TypeDef:${metadataToken(2, row)}`,
//           offset: extendsOffset,
//           detail: `TypeDef Extends coded index 0x${extendsRaw.toString(16)} is invalid: ${extendsReason}`,
//         });
//       const enclosingRow = nesting.enclosing.get(row);
//       items.push({
//         token: metadataToken(2, row),
//         row_offset: cursor.start,
export const _l = 226;
