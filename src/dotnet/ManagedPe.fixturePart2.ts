export const __stub = 1;
// }: {
//   readonly value: number;
//   readonly options: ManagedPeFixtureOptions;
//   readonly parentIndexSize: 2 | 4;
//   readonly typeIndexSize: MetadataIndexSize;
//   readonly blobSize: MetadataIndexSize;
//   readonly row: number;
// }): Buffer =>
//   Buffer.concat([
//     parentIndexSize === 2
//       ? u16(
//           options.malformedCustomAttributeRows?.includes(row)
//             ? 0xffff
//             : (1 << 5) | 14,
//         )
//       : u32(
//           options.malformedCustomAttributeRows?.includes(row)
//             ? 0xffff_ffff
//             : (1 << 5) | 14,
//         ),
//     metadataIndex(
//       options.customAttributeTypeRaw ?? (1 << 3) | 3,
//       typeIndexSize,
//     ),
//     metadataIndex(value, blobSize),
//   ]);
//
// const manifestResourceRow = (
//   name: number,
//   stringSize: MetadataIndexSize,
//   implementationSize: MetadataIndexSize,
//   implementationRaw: number,
// ): Buffer =>
//   Buffer.concat([
//     u32(0),
//     u32(2),
//     metadataIndex(name, stringSize),
//     metadataIndex(implementationRaw, implementationSize),
//   ]);
//
// const exportedTypeRow = (
//   exported: { readonly name: number; readonly namespace: number },
//   flags: number,
//   stringSize: MetadataIndexSize,
//   implementationSize: MetadataIndexSize,
//   implementationRaw: number,
// ): Buffer =>
//   Buffer.concat([
//     u32(flags),
//     u32(0),
//     metadataIndex(exported.name, stringSize),
//     metadataIndex(exported.namespace, stringSize),
//     metadataIndex(implementationRaw, implementationSize),
//   ]);
//
// const fixedStringAttributeBlob = (value: string): Buffer => {
//   const bytes = Buffer.from(textEncoder.encode(value));
//   if (bytes.length > 0x7f)
//     throw new RangeError("Managed PE fixture target framework is too long");
//   return Buffer.concat([Buffer.from([1, 0, bytes.length]), bytes, u16(0)]);
// };
//
// /**
//  * Lay out ECMA-335 #US items (compressed length, UTF-16LE, terminal flag byte)
//  * and return the `ldstr` token that names each value.
//  */
// // ECMA-335 II.24.2.4 terminal flag: 1 when a code unit has a high byte or a
// // low byte in 0x01-0x08, 0x0E-0x1F, 0x27, 0x2D, or 0x7F.
// const userStringFlag = (text: Buffer): number => {
//   for (let index = 0; index < text.length; index += 2) {
//     const unit = text.readUInt16LE(index);
//     if (
//       unit > 0xff ||
//       (unit >= 0x01 && unit <= 0x08) ||
//       (unit >= 0x0e && unit <= 0x1f) ||
//       unit === 0x27 ||
//       unit === 0x2d ||
//       unit === 0x7f
//     )
//       return 1;
//   }
//   return 0;
// };
//
// /** A #US heap whose items carry the ECMA-335 terminal flag, and their tokens. */
// export const fixtureUserStringHeap = (
//   values: readonly string[],
// ): { readonly heap: Buffer; readonly tokens: readonly string[] } => {
//   const items: Buffer[] = [Buffer.from([0])];
//   const tokens: string[] = [];
//   let size = 1;
//   for (const value of values) {
//     const text = Buffer.from(value, "utf16le");
//     const length = text.length + 1;
//     if (length > 0x3fff)
//       throw new RangeError("Managed PE fixture user string is too long");
//     const prefix =
//       length < 0x80
//         ? Buffer.from([length])
//         : Buffer.from([0x80 | (length >> 8), length & 0xff]);
//     tokens.push(`0x70${size.toString(16).padStart(6, "0")}`);
//     const item = Buffer.concat([
//       prefix,
//       text,
//       Buffer.from([userStringFlag(text)]),
//     ]);
//     items.push(item);
//     size += item.length;
//   }
//   return { heap: Buffer.concat(items), tokens };
// };
//
// const metadataStreamHeader = (
//   relativeOffset: number,
//   size: number,
//   name: string,
// ): Buffer => {
//   const named = cString(name);
//   const paddedName = Buffer.alloc(align4(named.length));
//   named.copy(paddedName);
//   return Buffer.concat([u32(relativeOffset), u32(size), paddedName]);
// };
//
// const metadataRoot = (
//   {
//     tables,
//     strings,
//     guid,
//     blob,
//     userStrings,
//   }: {
//     readonly tables: Buffer;
//     readonly strings: Buffer;
//     readonly guid: Buffer;
//     readonly blob: Buffer;
//     readonly userStrings?: Buffer | undefined;
//   },
//   tableStreamName: "#~" | "#-" = "#~",
// ): Buffer => {
//   const streams: readonly (readonly [string, Buffer])[] = [
//     [tableStreamName, tables],
//     ["#Strings", strings],
//     ...(userStrings === undefined ? [] : [["#US", userStrings] as const]),
//     ["#GUID", guid],
//     ["#Blob", blob],
//   ];
//   const version = Buffer.from("v4.0.30319\0\0", "utf8");
//   const header = Buffer.concat([
//     u32(0x424a_5342),
//     u16(1),
//     u16(1),
//     u32(0),
//     u32(version.length),
//     version,
//     u16(0),
//     u16(streams.length),
//   ]);
//   const streamHeaderSize = streams.reduce(
//     (total, [name]) => total + metadataStreamHeader(0, 0, name).length,
//     0,
//   );
//   let offset = align4(header.length + streamHeaderSize);
//   const placed = streams.map(([name, data]) => {
//     const at = offset;
//     offset = align4(offset + data.length);
//     return { name, data, at };
//   });
//   const headers = Buffer.concat(
//     placed.map(({ name, data, at }) =>
//       metadataStreamHeader(at, data.length, name),
//     ),
//   );
//   const root = Buffer.alloc(offset);
//   header.copy(root, 0);
//   headers.copy(root, header.length);
//   for (const { data, at } of placed) data.copy(root, at);
//   return root;
// };
//
// const tablesStream = (
//   rows: ReadonlyMap<number, readonly Buffer[]>,
//   extraValidMask: bigint,
//   heapSizes: number,
//   extraData?: number,
// ): Buffer => {
//   let valid = extraValidMask;
//   for (const table of rows.keys()) valid |= 1n << BigInt(table);
//   const header = Buffer.alloc(24);
//   header.writeUInt8(2, 4);
//   header.writeUInt8(heapSizes | (extraData === undefined ? 0 : 0x40), 6);
//   header.writeUInt8(1, 7);
//   header.writeBigUInt64LE(valid, 8);
//   const counts: Buffer[] = [];
//   for (let index = 0; index <= 44; index += 1) {
//     const tableRows = rows.get(index);
//     if (tableRows === undefined) continue;
//     counts.push(u32(tableRows.length));
//   }
//   const data: Buffer[] = [];
//   for (let index = 0; index <= 44; index += 1) {
//     const tableRows = rows.get(index);
//     if (tableRows === undefined) continue;
//     data.push(...tableRows);
//   }
//   return Buffer.concat([
//     header,
//     ...counts,
//     ...(extraData === undefined ? [] : [u32(extraData)]),
//     ...data,
//   ]);
// };
//
// interface FixtureMetadataRowContext {
//   readonly options: ManagedPeFixtureOptions;
//   readonly methodRva: number;
//   readonly referenceStringIndexes: readonly number[];
//   readonly indexes: {
//     readonly moduleName: number;
//     readonly assemblyName: number;
//     readonly attributeName: number;
//     readonly attributeNamespace: number;
//     readonly constructorName: number;
//     readonly typeName: number;
//     readonly additionalTypeNames: readonly number[];
//     readonly typeNamespace: number;
//     readonly fieldName: number;
//     readonly methodName: number;
//     readonly pinvokeModuleName: number | null;
//     readonly pinvokeImportName: number | null;
//     readonly resourceName: number;
//     readonly exportedTypes: readonly {
//       readonly name: number;
//       readonly namespace: number;
//     }[];
//     readonly typeReferences: readonly {
//       readonly name: number;
//       readonly namespace: number;
//       readonly enclosingRow?: number;
//     }[];
//     readonly tokenBlob: number;
//     readonly fieldSignature: number;
//     readonly methodSignature: number;
//     readonly constructorSignature: number;
//     readonly attributeBlob: number;
//     readonly typeSpecSignatures: readonly number[];
//     readonly methodSpecInstantiation: number;
//   };
//   readonly heapSizes: {
//     readonly strings: MetadataIndexSize;
//     readonly blobs: MetadataIndexSize;
//     readonly guids: MetadataIndexSize;
//   };
// }
//
// interface FixtureIndexWidths {
//   readonly table: (index: number) => MetadataIndexSize;
//   readonly coded: (
//     tables: readonly number[],
//     tagBits: number,
//   ) => MetadataIndexSize;
//   readonly resolutionScope: MetadataIndexSize;
//   readonly typeDefOrRef: MetadataIndexSize;
//   readonly memberRefParent: MetadataIndexSize;
//   readonly hasCustomAttribute: MetadataIndexSize;
//   readonly customAttributeType: MetadataIndexSize;
//   readonly implementation: MetadataIndexSize;
// }
//
// const repeatedRows = (
//   count: number,
//   createRow: () => Buffer,
// ): readonly Buffer[] => Array.from({ length: count }, createRow);
//
// const customAttributeRows = (
//   {
//     options,
//     indexes,
//     heapSizes,
//   }: Pick<FixtureMetadataRowContext, "options" | "indexes" | "heapSizes">,
//   widths: FixtureIndexWidths,
// ): readonly Buffer[] =>
//   options.targetFramework === null
//     ? []
//     : Array.from({ length: options.customAttributeRowCount ?? 1 }, (_, index) =>
//         customAttributeRow({
//           value: indexes.attributeBlob,
//           options,
//           parentIndexSize: widths.hasCustomAttribute,
//           typeIndexSize: widths.customAttributeType,
//           blobSize: heapSizes.blobs,
//           row: index + 1,
//         }),
//       );
//
// const exportedTypeTable = (
//   options: ManagedPeFixtureOptions,
//   indexes: FixtureMetadataRowContext["indexes"],
//   heapSizes: FixtureMetadataRowContext["heapSizes"],
//   widths: FixtureIndexWidths,
// ): readonly (readonly [number, readonly Buffer[]])[] =>
//   indexes.exportedTypes.length === 0
//     ? []
//     : [
//         [
//           39,
//           indexes.exportedTypes.map((exported, index) =>
//             exportedTypeRow(
//               exported,
//               options.exportedTypes?.[index]?.flags ?? 0,
//               heapSizes.strings,
//               widths.implementation,
//               options.exportedTypes?.[index]?.implementationRaw ?? 0,
//             ),
//           ),
//         ],
//       ];
//
// const typeRefTable = (
//   options: ManagedPeFixtureOptions,
//   indexes: FixtureMetadataRowContext["indexes"],
//   heapSizes: FixtureMetadataRowContext["heapSizes"],
//   widths: FixtureIndexWidths,
// ): readonly [number, readonly Buffer[]] => [
//   1,
//   [
//     typeRefRow(
//       indexes.attributeName,
//       indexes.attributeNamespace,
//       heapSizes.strings,
//       metadataIndex(options.typeRefScopeRaw ?? 0, widths.resolutionScope),
//     ),
//     ...indexes.typeReferences.map(({ name, namespace, enclosingRow }) =>
//       typeRefRow(
//         name,
//         namespace,
//         heapSizes.strings,
//         metadataIndex(
//           enclosingRow === undefined ? 0 : (enclosingRow << 2) | 3,
//           widths.resolutionScope,
//         ),
//       ),
//     ),
//   ],
// ];
//
// const nestedClassTable = (
//   options: ManagedPeFixtureOptions,
//   widths: FixtureIndexWidths,
// ): readonly (readonly [number, readonly Buffer[]])[] =>
//   (options.nestedTypes?.length ?? 0) === 0
//     ? []
//     : [
//         [
//           41,
//           (options.nestedTypes ?? []).map(([nested, enclosing]) =>
//             Buffer.concat([
//               metadataIndex(nested, widths.table(2)),
//               metadataIndex(enclosing, widths.table(2)),
//             ]),
//           ),
//         ],
//       ];
//
// const specTables = (
//   options: ManagedPeFixtureOptions,
//   indexes: FixtureMetadataRowContext["indexes"],
//   heapSizes: FixtureMetadataRowContext["heapSizes"],
export const _l = 367;
