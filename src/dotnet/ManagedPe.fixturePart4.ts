export const __stub = 1;
//     resourceData,
//   ]);
//   const initialMetadata = buildMetadata(0);
//   const resourceOffset = Math.max(
//     0x0800,
//     Math.ceil((0x0300 + initialMetadata.length) / 0x0200) * 0x0200,
//   );
//   const resourceRva = 0x2000 + resourceOffset - 0x0200;
//   const bodyOffset = Math.max(
//     0x0a00,
//     Math.ceil((resourceOffset + resourceDirectory.length) / 0x0200) * 0x0200,
//   );
//   const methodRva = 0x2000 + bodyOffset - 0x0200;
//   const metadata = buildMetadata(methodRva);
//   const body =
//     options.ilBody ??
//     Buffer.from([
//       0x32, 0x02, 0x7b, 0x01, 0x00, 0x00, 0x04, 0x28, 0x01, 0x00, 0x00, 0x0a,
//       0x2a,
//     ]);
//   const legacyReadyToRunOffset = 0x0900;
//   const metadataEnd = 0x0300 + metadata.length;
//   const resourceEnd = resourceOffset + resourceDirectory.length;
//   const bodyEnd = bodyOffset + body.length;
//   const overlapsReadyToRun = (start: number, end: number): boolean =>
//     legacyReadyToRunOffset < end && legacyReadyToRunOffset + 4 > start;
//   const readyToRunOffset =
//     options.readyToRun === true
//       ? overlapsReadyToRun(0x0300, metadataEnd) ||
//         overlapsReadyToRun(resourceOffset, resourceEnd) ||
//         overlapsReadyToRun(bodyOffset, bodyEnd)
//         ? Math.ceil(Math.max(metadataEnd, resourceEnd, bodyEnd) / 4) * 4
//         : legacyReadyToRunOffset
//       : null;
//   const rawSectionSize =
//     Math.ceil(
//       Math.max(
//         0x0e00,
//         0x0100 + metadata.length,
//         bodyOffset - 0x0200 + body.length,
//         readyToRunOffset === null ? 0 : readyToRunOffset - 0x0200 + 4,
//       ) / 0x0200,
//     ) * 0x0200;
//   const virtualSectionSize =
//     options.virtualSectionSize ?? Math.max(0x1000, rawSectionSize);
//   const image = Buffer.alloc(0x0200 + rawSectionSize);
//   image.write("MZ", 0, "ascii");
//   image.writeUInt32LE(0x80, 0x3c);
//   image.writeUInt32LE(0x0000_4550, 0x80);
//   const coff = 0x84;
//   image.writeUInt16LE(0x014c, coff);
//   image.writeUInt16LE(1, coff + 2);
//   image.writeUInt16LE(0x00e0, coff + 16);
//   image.writeUInt16LE(0x0102, coff + 18);
//   const optional = coff + 20;
//   image.writeUInt16LE(0x010b, optional);
//   image.writeUInt32LE(0x2000, optional + 20);
//   image.writeUInt32LE(0x0040_0000, optional + 28);
//   image.writeUInt32LE(0x1000, optional + 32);
//   image.writeUInt32LE(0x200, optional + 36);
//   image.writeUInt32LE(
//     Math.ceil((0x2000 + virtualSectionSize) / 0x1000) * 0x1000,
//     optional + 56,
//   );
//   image.writeUInt32LE(0x200, optional + 60);
//   image.writeUInt32LE(16, optional + 92);
//   image.writeUInt32LE(0x2000, optional + 96 + 14 * 8);
//   image.writeUInt32LE(72, optional + 96 + 14 * 8 + 4);
//   const section = optional + 0x00e0;
//   image.write(".text\0\0\0", section, "ascii");
//   image.writeUInt32LE(virtualSectionSize, section + 8);
//   image.writeUInt32LE(0x2000, section + 12);
//   image.writeUInt32LE(rawSectionSize, section + 16);
//   image.writeUInt32LE(0x0200, section + 20);
//   image.writeUInt32LE(0x6000_0020, section + 36);
//   const cli = 0x0200;
//   image.writeUInt32LE(72, cli);
//   image.writeUInt16LE(2, cli + 4);
//   image.writeUInt16LE(5, cli + 6);
//   image.writeUInt32LE(0x2100, cli + 8);
//   image.writeUInt32LE(metadata.length, cli + 12);
//   image.writeUInt32LE(options.cliFlags ?? 1, cli + 16);
//   image.writeUInt32LE(0x0600_0001, cli + 20);
//   image.writeUInt32LE(resourceRva, cli + 24);
//   image.writeUInt32LE(resourceDirectory.length, cli + 28);
//   if (readyToRunOffset !== null) {
//     image.writeUInt32LE(0x2000 + readyToRunOffset - 0x0200, cli + 64);
//     image.writeUInt32LE(4, cli + 68);
//     image.write("RTR\0", readyToRunOffset, "ascii");
//   }
//   body.copy(image, bodyOffset);
//   metadata.copy(image, 0x0300);
//   resourceDirectory.copy(image, resourceOffset);
//   return image;
// };
//
// /** Build a source-owned PE32/CLI fixture without committing compiled binaries. */
// export const buildManagedPeFixture = (
//   options: ManagedPeFixtureOptions = {},
// ): Buffer =>
//   buildManagedFixtureImage(options, (methodRva) =>
//     buildManagedFixtureMetadata(options, methodRva),
//   );
//
// /** Two attribute classes whose pointer-table slots can reorder physical members. */
// export const buildManagedMemberPointerFixture = (
//   options: {
//     readonly fieldPointers?: readonly number[] | null;
//     readonly methodPointers?: readonly number[] | null;
//     readonly streamName?: "#~" | "#-";
//   } = {},
// ): Buffer => {
//   const fieldPointers =
//     options.fieldPointers === undefined ? [2, 1] : options.fieldPointers;
//   const methodPointers =
//     options.methodPointers === undefined ? [2, 1] : options.methodPointers;
//   // Both instance constructors call System.Attribute::.ctor(), then return.
//   const body = Buffer.from([0x1e, 0x02, 0x28, 0x01, 0, 0, 0x0a, 0x2a]);
//   const image = buildManagedFixtureImage({ ilBody: body }, (methodRva) => {
//     const strings = new StringHeap();
//     const blobs = new BlobHeap();
//     const moduleName = strings.add("MemberPointers.dll");
//     const assemblyName = strings.add("Fixture.MemberPointers");
//     const namespace = strings.add("Fixture");
//     const typeNames = ["<Module>", "A", "B"].map((name) => strings.add(name));
//     const fieldNames = ["firstField", "secondField"].map((name) =>
//       strings.add(name),
//     );
//     const constructorName = strings.add(".ctor");
//     const attributeName = strings.add("Attribute");
//     const systemNamespace = strings.add("System");
//     const runtimeName = strings.add("System.Runtime");
//     const fieldSignature = blobs.add(Buffer.from([0x06, 0x08]));
//     const constructorSignature = blobs.add(
//       Buffer.from([0x20, 0x01, 0x01, 0x0e]),
//     );
//     const baseConstructorSignature = blobs.add(Buffer.from([0x20, 0, 0x01]));
//     const attributeValue = blobs.add(fixedStringAttributeBlob("fixture"));
//     const rows = new Map<number, readonly Buffer[]>([
//       [0, [moduleRow(moduleName, 2, 2)]],
//       // ResolutionScope selects AssemblyRef 1, which contains System.Attribute.
//       [
//         1,
//         [
//           Buffer.concat([
//             u16((1 << 2) | 2),
//             u16(attributeName),
//             u16(systemNamespace),
//           ]),
//         ],
//       ],
//       [
//         2,
//         typeNames.map((name, index) =>
//           typeDefRow({
//             name,
//             namespace: index === 0 ? 0 : namespace,
//             fieldList: index === 2 ? 2 : 1,
//             methodList: index === 2 ? 2 : 1,
//             stringSize: 2,
//             typeDefOrRefSize: 2,
//             fieldListSize: 2,
//             methodListSize: 2,
//             extendsRaw: index === 0 ? 0 : (1 << 2) | 1,
//             flags: index === 0 ? 0 : 0x0010_0001,
//           }),
//         ),
//       ],
//       [4, fieldNames.map((name) => fieldRow(name, fieldSignature, 2, 2))],
//       [
//         6,
//         [1, 2].map(() =>
//           methodDefRow({
//             name: constructorName,
//             signature: constructorSignature,
//             stringSize: 2,
//             blobSize: 2,
//             parameterSize: 2,
//             parameterList: 1,
//             rva: methodRva,
//             flags: 0x1886,
//           }),
//         ),
//       ],
//       [
//         10,
//         [
//           memberRefRow({
//             name: constructorName,
//             signature: baseConstructorSignature,
//             stringSize: 2,
//             blobSize: 2,
//             parentSize: 2,
//           }),
//         ],
//       ],
//       // The assembly attribute constructor is physical MethodDef row 1.
//       [
//         12,
//         [
//           customAttributeRow({
//             value: attributeValue,
//             options: { customAttributeTypeRaw: (1 << 3) | 2 },
//             parentIndexSize: 2,
//             typeIndexSize: 2,
//             blobSize: 2,
//             row: 1,
//           }),
//         ],
//       ],
//       [32, [assemblyRow(assemblyName, 2, 2)]],
//       [35, [assemblyRefRow(runtimeName, 0, false, 2, 2)]],
//     ]);
//     if (fieldPointers !== null) rows.set(3, fieldPointers.map(u16));
//     if (methodPointers !== null) rows.set(5, methodPointers.map(u16));
//     return metadataRoot(
//       {
//         tables: tablesStream(rows, 0n, 0),
//         strings: strings.toBuffer(),
//         guid: guidHeap(),
//         blob: blobs.toBuffer(),
//       },
//       options.streamName ?? "#-",
//     );
//   });
//   // The shared PE shell defaults to an executable; this fixture is a DLL.
//   image.writeUInt16LE(image.readUInt16LE(0x84 + 18) | 0x2000, 0x84 + 18);
//   image.writeUInt32LE(0, 0x0200 + 20);
//   return image;
// };
//
// /**
//  * Two top-level types A and B, each enclosing a nested type named Inner with
//  * one method M and one field F; the first Inner also encloses Leaf with a
//  * method M. Every method shares the fixture body. Swapping the enclosing
//  * types keeps every row but moves each Inner, with its Leaf, under the other
//  * top-level type. NestedClass rows pair a nested TypeDef row with its
//  * enclosing row and may be replaced to exercise malformed metadata.
//  */
// export const buildManagedNestedTypeFixture = ({
//   swapEnclosing = false,
//   nestedClassRows,
//   literalTopLevelName,
//   topLevelTypes = false,
// }: {
//   readonly swapEnclosing?: boolean;
//   readonly nestedClassRows?: readonly (readonly [number, number])[];
//   readonly literalTopLevelName?: string;
//   readonly topLevelTypes?: boolean;
// } = {}): Buffer => {
//   const image = buildManagedFixtureImage({}, (methodRva) => {
//     const strings = new StringHeap();
//     const blobs = new BlobHeap();
//     const moduleName = strings.add("Nested.dll");
//     const assemblyName = strings.add("Fixture.Nested");
//     const namespace = strings.add("Fixture");
//     const typeNames = [
//       "<Module>",
//       "A",
//       "B",
//       "Inner",
//       literalTopLevelName ?? (topLevelTypes ? "OtherInner" : "Inner"),
//       "Leaf",
//     ].map((name) => strings.add(name));
//     const methodName = strings.add("M");
//     const fieldName = strings.add("F");
//     const objectName = strings.add("Object");
//     const systemNamespace = strings.add("System");
//     const runtimeName = strings.add("System.Runtime");
//     const methodSignature = blobs.add(Buffer.from([0x20, 0, 0x08]));
//     const fieldSignature = blobs.add(Buffer.from([0x06, 0x08]));
//     // TypeDef rows 4 and 5 own one method and one field each; row 6 owns a method.
//     const memberList = [1, 1, 1, 1, 2, 3];
//     const rows = new Map<number, readonly Buffer[]>([
//       [0, [moduleRow(moduleName, 2, 2)]],
//       [
//         1,
//         [
//           Buffer.concat([
//             u16((1 << 2) | 2),
//             u16(objectName),
//             u16(systemNamespace),
//           ]),
//         ],
//       ],
//       [
//         2,
//         typeNames.map((name, index) =>
//           typeDefRow({
//             name,
//             namespace: index === 1 || index === 2 ? namespace : 0,
//             fieldList: Math.min(memberList[index] ?? 1, 3),
//             methodList: memberList[index] ?? 1,
//             stringSize: 2,
//             typeDefOrRefSize: 2,
//             fieldListSize: 2,
//             methodListSize: 2,
//             extendsRaw: index === 0 ? 0 : (1 << 2) | 1,
//             flags:
//               index <= 2 ||
//               topLevelTypes ||
//               (index === 4 && literalTopLevelName !== undefined)
//                 ? 0x0010_0001
//                 : 0x0010_0002,
//           }),
//         ),
//       ],
//       [4, [1, 2].map(() => fieldRow(fieldName, fieldSignature, 2, 2))],
//       [
//         6,
//         [1, 2, 3].map(() =>
//           methodDefRow({
//             name: methodName,
//             signature: methodSignature,
//             stringSize: 2,
//             blobSize: 2,
//             parameterSize: 2,
//             parameterList: 1,
//             rva: methodRva,
//             flags: 0x0086,
//           }),
//         ),
//       ],
//       [
//         41,
//         (
//           nestedClassRows ??
//           (topLevelTypes
//             ? []
//             : [
//                 [4, swapEnclosing ? 3 : 2],
//                 [5, swapEnclosing ? 2 : 3],
//                 [6, 4],
//               ])
//         )
//           .filter(
//             ([nested]) => literalTopLevelName === undefined || nested !== 5,
//           )
//           .map(([nested, enclosing]) =>
//             Buffer.concat([u16(nested), u16(enclosing)]),
//           ),
//       ],
//       [32, [assemblyRow(assemblyName, 2, 2)]],
//       [35, [assemblyRefRow(runtimeName, 0, false, 2, 2)]],
//     ]);
//     return metadataRoot({
//       tables: tablesStream(rows, 0n, 0),
//       strings: strings.toBuffer(),
//       guid: guidHeap(),
//       blob: blobs.toBuffer(),
//     });
//   });
//   // The shared PE shell defaults to an executable; this fixture is a DLL.
//   image.writeUInt16LE(image.readUInt16LE(0x84 + 18) | 0x2000, 0x84 + 18);
//   image.writeUInt32LE(0, 0x0200 + 20);
//   return image;
// };
//
// /** Build a syntactically valid PE32 fixture with no CLI directory. */
// export const buildNativePeFixture = (): Buffer => {
//   const image = buildManagedPeFixture();
//   const cliDirectory = 0x84 + 20 + 96 + 14 * 8;
//   image.writeUInt32LE(0, cliDirectory);
//   image.writeUInt32LE(0, cliDirectory + 4);
//   return image;
// };
export const _l = 366;
