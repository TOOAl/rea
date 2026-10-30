export const __stub = 1;
//         declaringType: parentName,
//         kind: decoded.kind,
//         genericArity: signatureGenericArity(decoded),
//       });
//     }, issues);
//   }
//   return { refs, core, issues };
// };
//
// interface ParseMethodsInput {
//   readonly bytes: Buffer;
//   readonly layout: ManagedMetadataLayout;
//   readonly pe: ManagedPeLayout;
//   readonly ranges: readonly TypeRange[];
//   readonly signatureTypeName: SignatureTypeName;
//   readonly memberLists: TypeMemberListFacts;
//   readonly selected?: SelectedTypeTokens;
//   readonly methodOffset?: number;
//   readonly methodLimit?: number;
// }
//
// export const parseMethods = ({
//   bytes,
//   layout,
//   pe,
//   ranges,
//   signatureTypeName,
//   memberLists,
//   selected = null,
//   methodOffset = 0,
//   methodLimit = Number.MAX_SAFE_INTEGER,
// }: ParseMethodsInput): {
//   readonly methods: readonly ManagedMethod[];
//   readonly core: ReadonlyMap<string, MemberCore>;
//   readonly issues: readonly ManagedParseIssue[];
//   /**
//    * Methods that may belong to a selected type but whose CIL was not fully
//    * scanned: rows that produced no method, or bodies whose decoding stopped.
//    */
//   readonly unscannedMethods: number;
// } => {
//   const methods: ManagedMethod[] = [];
//   const core = new Map<string, MemberCore>();
//   const issues: ManagedParseIssue[] = [];
//   let unscannedMethods = 0;
//   const table = layout.table(6);
//   const ownerRow = readManagedValue(
//     () => memberDeclaringTypeRowLookup(bytes, layout, 6, memberLists),
//     issues,
//   );
//   for (let row = 1; row <= (table?.rowCount ?? 0); row += 1) {
//     // The owner is read first: a row that produced no method hides a selected
//     // body only when its owner is selected, unknown, or unreadably named.
//     const owner =
//       ownerRow === undefined
//         ? undefined
//         : readManagedValue(() => ownerRow(row), issues);
//     const declared = owner === undefined ? undefined : ranges[owner - 1];
//     const inPage = row > methodOffset && row - methodOffset <= methodLimit;
//     const mayBeSelected =
//       inPage &&
//       (selected === null ||
//         owner === undefined ||
//         isSelected(selected, declared) ||
//         // A type whose name is unreadable may be one the caller requested.
//         declared?.fullName === null);
//     const produced = methods.length;
//     readManagedValue(() => {
//       const cursor = metadataRowCursor(bytes, layout, 6, row);
//       const rva = cursor.readUInt32();
//       const implFlags = cursor.readUInt16();
//       const flags = cursor.readUInt16();
//       const name = readMetadataString(
//         bytes,
//         layout,
//         cursor.readIndex(layout.stringIndexSize),
//         layout.strings.size,
//       );
//       const token = metadataToken(6, row);
//       const member = {
//         token,
//         name,
//         declaringType: declared?.fullName ?? null,
//         kind: "method",
//       } as const;
//       core.set(token, member);
//       if (!inPage) return;
//       if (!isSelected(selected, declared)) return;
//       const sig = readMetadataBlob(
//         bytes,
//         layout,
//         cursor.readIndex(layout.blobIndexSize),
//         layout.blob.size,
//       );
//       cursor.readIndex(layout.tableIndexSize(8));
//       const decoded = budgetedSignature(sig, layout, signatureTypeName);
//       core.set(token, {
//         ...member,
//         genericArity: signatureGenericArity(decoded),
//       });
//       const read = methodBody(
//         bytes,
//         pe,
//         rva,
//         { implFlags, flags },
//         managedDecodeBudget(layout),
//       );
//       if (!read.scanned) unscannedMethods += 1;
//       methods.push({
//         token,
//         row_offset: cursor.start,
//         declaring_type_token: declared?.token ?? null,
//         declaring_type: declared?.fullName ?? null,
//         name,
//         rva,
//         impl_flags: implFlags,
//         flags,
//         signature: decoded,
//         body: read.body,
//       });
//     }, issues);
//     if (mayBeSelected && methods.length === produced) unscannedMethods += 1;
//   }
//   return { methods, core, issues, unscannedMethods };
// };
//
// /**
export const _l = 127;
