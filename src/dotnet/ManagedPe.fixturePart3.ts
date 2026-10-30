export const __stub = 1;
//   widths: FixtureIndexWidths,
// ): readonly (readonly [number, readonly Buffer[]])[] => [
//   ...(indexes.typeSpecSignatures.length === 0
//     ? []
//     : ([
//         [
//           27,
//           indexes.typeSpecSignatures.map((signature) =>
//             metadataIndex(signature, heapSizes.blobs),
//           ),
//         ],
//       ] as const)),
//   ...(options.methodSpecMethods === undefined
//     ? []
//     : ([
//         [
//           43,
//           options.methodSpecMethods.map((method) =>
//             Buffer.concat([
//               metadataIndex(method, widths.coded([6, 10], 1)),
//               metadataIndex(indexes.methodSpecInstantiation, heapSizes.blobs),
//             ]),
//           ),
//         ],
//       ] as const)),
// ];
//
// const fixtureIndexWidths = ({
//   options,
//   referenceStringIndexes,
//   indexes,
// }: FixtureMetadataRowContext): FixtureIndexWidths => {
//   const rowCounts = new Map<number, number>([
//     [0, options.moduleRowCount ?? 1],
//     [1, indexes.typeReferences.length + 1],
//     [2, indexes.additionalTypeNames.length + 1],
//     [4, 1],
//     [6, options.methodRowCount ?? 1],
//     [8, 0],
//     [10, 1],
//     [
//       12,
//       options.targetFramework === null
//         ? 0
//         : (options.customAttributeRowCount ?? 1),
//     ],
//     ...(indexes.pinvokeModuleName === null ? [] : ([[26, 1]] as const)),
//     ...(indexes.pinvokeImportName === null ? [] : ([[28, 1]] as const)),
//     [27, indexes.typeSpecSignatures.length],
//     [32, options.assemblyRowCount ?? 1],
//     [35, referenceStringIndexes.length],
//     [39, indexes.exportedTypes.length],
//     [40, 1],
//     [41, options.nestedTypes?.length ?? 0],
//     [43, options.methodSpecMethods?.length ?? 0],
//   ]);
//   const count = (table: number): number => rowCounts.get(table) ?? 0;
//   const table = (index: number): MetadataIndexSize => indexSize(count(index));
//   const coded = (
//     tables: readonly number[],
//     tagBits: number,
//   ): MetadataIndexSize => codedIndexSize(tables.map(count), tagBits);
//   return {
//     table,
//     coded,
//     resolutionScope: coded([0, 26, 35, 1], 2),
//     typeDefOrRef: coded([2, 1, 27], 2),
//     memberRefParent: coded([2, 1, 26, 6, 27], 3),
//     hasCustomAttribute: coded(
//       [
//         6, 4, 1, 2, 8, 9, 10, 0, 14, 23, 20, 17, 26, 27, 32, 35, 38, 39, 40, 42,
//         44, 43,
//       ],
//       5,
//     ),
//     customAttributeType: coded([6, 10], 3),
//     implementation: coded([38, 35, 39], 2),
//   };
// };
//
// const fixtureMetadataRows = ({
//   options,
//   methodRva,
//   referenceStringIndexes,
//   indexes,
//   heapSizes,
// }: FixtureMetadataRowContext): ReadonlyMap<number, readonly Buffer[]> => {
//   const widths = fixtureIndexWidths({
//     options,
//     methodRva,
//     referenceStringIndexes,
//     indexes,
//     heapSizes,
//   });
//   const nestedRows = new Set(
//     (options.nestedTypes ?? []).map(([nested]) => nested),
//   );
//   const rows = new Map<number, readonly Buffer[]>([
//     [
//       0,
//       repeatedRows(options.moduleRowCount ?? 1, () =>
//         moduleRow(indexes.moduleName, heapSizes.strings, heapSizes.guids),
//       ),
//     ],
//     typeRefTable(options, indexes, heapSizes, widths),
//     [
//       2,
//       [...indexes.additionalTypeNames, indexes.typeName].map((name, index) =>
//         typeDefRow({
//           name,
//           flags: nestedRows.has(index + 1) ? 0x0010_0002 : 0x0010_0001,
//           namespace: indexes.typeNamespace,
//           fieldList: 1,
//           methodList: 1,
//           stringSize: heapSizes.strings,
//           typeDefOrRefSize: widths.typeDefOrRef,
//           fieldListSize: widths.table(4),
//           methodListSize: widths.table(6),
//           ...(options.extendsRaw === undefined
//             ? {}
//             : { extendsRaw: options.extendsRaw }),
//         }),
//       ),
//     ],
//     [
//       4,
//       [
//         fieldRow(
//           indexes.fieldName,
//           indexes.fieldSignature,
//           heapSizes.strings,
//           heapSizes.blobs,
//         ),
//       ],
//     ],
//     [
//       6,
//       repeatedRows(options.methodRowCount ?? 1, () =>
//         methodDefRow({
//           name: indexes.methodName,
//           signature: indexes.methodSignature,
//           stringSize: heapSizes.strings,
//           blobSize: heapSizes.blobs,
//           parameterSize: widths.table(8),
//           rva: methodRva,
//           flags:
//             options.methodFlags ??
//             (options.pinvoke === undefined ? 0x0016 : 0x2016),
//         }),
//       ),
//     ],
//     [
//       10,
//       [
//         memberRefRow({
//           name: indexes.constructorName,
//           signature: indexes.constructorSignature,
//           stringSize: heapSizes.strings,
//           blobSize: heapSizes.blobs,
//           parentSize: widths.memberRefParent,
//           ...(options.memberRefParentRaw === undefined
//             ? {}
//             : { parentRaw: options.memberRefParentRaw }),
//         }),
//       ],
//     ],
//     [12, customAttributeRows({ options, indexes, heapSizes }, widths)],
//     ...(indexes.pinvokeModuleName === null
//       ? []
//       : ([
//           [26, [moduleRefRow(indexes.pinvokeModuleName, heapSizes.strings)]],
//         ] as const)),
//     ...(indexes.pinvokeImportName === null
//       ? []
//       : ([
//           [
//             28,
//             [
//               implMapRow(
//                 indexes.pinvokeImportName,
//                 1,
//                 options.pinvoke?.mappingFlags ?? 0x0344,
//                 heapSizes.strings,
//                 widths.coded([4, 6], 1),
//                 widths.table(26),
//                 options.pinvoke?.memberForwardedRaw ?? (1 << 1) | 1,
//               ),
//             ],
//           ],
//         ] as const)),
//     [
//       32,
//       repeatedRows(options.assemblyRowCount ?? 1, () =>
//         assemblyRow(indexes.assemblyName, heapSizes.strings, heapSizes.blobs),
//       ),
//     ],
//     [
//       35,
//       referenceStringIndexes.map((name, index) =>
//         assemblyRefRow(
//           name,
//           indexes.tokenBlob,
//           options.malformedAssemblyReferenceRows?.includes(index + 1) ?? false,
//           heapSizes.strings,
//           heapSizes.blobs,
//         ),
//       ),
//     ],
//     ...exportedTypeTable(options, indexes, heapSizes, widths),
//     ...specTables(options, indexes, heapSizes, widths),
//     ...nestedClassTable(options, widths),
//     [
//       40,
//       [
//         manifestResourceRow(
//           indexes.resourceName,
//           heapSizes.strings,
//           widths.implementation,
//           options.resourceImplementationRaw ?? 0,
//         ),
//       ],
//     ],
//   ]);
//   return rows;
// };
//
// /** Blob indexes for the MemberRef and optional spec rows; defaults leave the heap unchanged. */
// const referenceBlobIndexes = (
//   blobs: BlobHeap,
//   options: ManagedPeFixtureOptions,
// ): Pick<
//   FixtureMetadataRowContext["indexes"],
//   "constructorSignature" | "typeSpecSignatures" | "methodSpecInstantiation"
// > => ({
//   constructorSignature: blobs.add(
//     options.memberRefSignature ?? Buffer.from([0x20, 0x01, 0x01, 0x0e]),
//   ),
//   typeSpecSignatures: (options.typeSpecSignatures ?? []).map((signature) =>
//     blobs.add(signature),
//   ),
//   // Defaults to GENERICINST with one string type argument.
//   methodSpecInstantiation:
//     options.methodSpecMethods === undefined
//       ? 0
//       : blobs.add(
//           options.methodSpecInstantiation ?? Buffer.from([0x0a, 0x01, 0x0e]),
//         ),
// });
//
// const buildManagedFixtureMetadata = (
//   options: ManagedPeFixtureOptions,
//   methodRva: number,
// ): Buffer => {
//   const strings = new StringHeap();
//   const blobs = new BlobHeap();
//   const moduleName = strings.add("Fixture.dll");
//   const assemblyName = strings.add("Fixture.Managed");
//   const attributeName = strings.add("TargetFrameworkAttribute");
//   const attributeNamespace = strings.add("System.Runtime.Versioning");
//   const constructorName = strings.add(options.memberRefName ?? ".ctor");
//   const typeName = strings.add(options.typeName ?? "Program");
//   const additionalTypeNames = Array.from(
//     { length: options.additionalEmptyTypes ?? 0 },
//     (_, index) => strings.add(`Empty${String(index)}`),
//   );
//   const typeNamespace = strings.add(options.typeNamespace ?? "Fixture");
//   const fieldName = strings.add(options.fieldName ?? "counter");
//   const methodName = strings.add(options.methodName ?? "Main");
//   const pinvokeModuleName =
//     options.pinvoke === undefined
//       ? null
//       : strings.add(options.pinvoke.moduleName ?? "user32.dll");
//   const pinvokeImportName =
//     options.pinvoke === undefined
//       ? null
//       : strings.add(options.pinvoke.importName ?? "MessageBoxW");
//   const resourceName = strings.add("Fixture.resources");
//   const exportedTypes = (options.exportedTypes ?? []).map(
//     ({ namespace, name }) => ({
//       name: strings.add(name),
//       namespace: strings.add(namespace),
//     }),
//   );
//   const typeReferences = (options.typeReferences ?? []).map(
//     ({ namespace, name, enclosingRow }) => ({
//       name: strings.add(name),
//       namespace: strings.add(namespace),
//       ...(enclosingRow === undefined ? {} : { enclosingRow }),
//     }),
//   );
//   const referenceNames = options.references ?? ["System.Runtime"];
//   const referenceStringIndexes = referenceNames.map((name) =>
//     strings.add(name),
//   );
//   const tokenBlob = blobs.add(Buffer.from("b77a5c561934e089", "hex"));
//   const fieldSignature = blobs.add(
//     options.fieldSignature ?? Buffer.from([0x06, 0x08]),
//   );
//   const methodSignature = blobs.add(
//     options.methodSignature ?? Buffer.from([0x00, 0x00, 0x01]),
//   );
//   const referenceBlobs = referenceBlobIndexes(blobs, options);
//   const attributeBlob = blobs.add(
//     fixedStringAttributeBlob(
//       options.targetFramework === null
//         ? ".NETCoreApp,Version=v8.0"
//         : (options.targetFramework ?? ".NETCoreApp,Version=v8.0"),
//     ),
//   );
//   const stringSize = indexSize(strings.size);
//   const blobSize = indexSize(blobs.size);
//   const guidSize = indexSize(guidHeap(options.mvid).length);
//   const rows = fixtureMetadataRows({
//     options,
//     methodRva,
//     referenceStringIndexes,
//     indexes: {
//       moduleName,
//       assemblyName,
//       attributeName,
//       attributeNamespace,
//       constructorName,
//       typeName,
//       additionalTypeNames,
//       typeNamespace,
//       fieldName,
//       methodName,
//       pinvokeModuleName,
//       pinvokeImportName,
//       resourceName,
//       exportedTypes,
//       typeReferences,
//       tokenBlob,
//       fieldSignature,
//       methodSignature,
//       attributeBlob,
//       ...referenceBlobs,
//     },
//     heapSizes: { strings: stringSize, blobs: blobSize, guids: guidSize },
//   });
//   const heapFlags =
//     (stringSize === 4 ? 0x01 : 0) |
//     (guidSize === 4 ? 0x02 : 0) |
//     (blobSize === 4 ? 0x04 : 0);
//   const metadata = metadataRoot({
//     tables: tablesStream(
//       rows,
//       options.metadataValidMaskExtra ?? 0n,
//       heapFlags,
//       options.metadataExtraData,
//     ),
//     strings: strings.toBuffer(),
//     guid: guidHeap(options.mvid),
//     blob: blobs.toBuffer(),
//     userStrings: options.userStringHeap,
//   });
//   if (options.corruptMetadataSignature === true) metadata.writeUInt32LE(0, 0);
//   return metadata;
// };
//
// const buildManagedFixtureImage = (
//   options: ManagedPeFixtureOptions,
//   buildMetadata: (methodRva: number) => Buffer,
// ): Buffer => {
//   const resourceData = options.resourceData ?? Buffer.from("resource-data");
//   const resourceDirectory = Buffer.concat([
//     u32(resourceData.length),
export const _l = 367;
