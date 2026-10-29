export const __stub = 1;
// import { createHash } from "node:crypto";
//
// import type { BinaryTarget } from "../domain/binaryTargetTypes.js";
//
// interface ManagedPeFixtureOptions {
//   readonly additionalEmptyTypes?: number;
//   readonly customAttributeRowCount?: number;
//   readonly cliFlags?: number;
//   readonly corruptMetadataSignature?: boolean;
//   readonly customAttributeTypeRaw?: number;
//   readonly extendsRaw?: number;
//   readonly exportedTypes?: readonly {
//     readonly namespace: string;
//     readonly name: string;
//     readonly flags: number;
//     readonly implementationRaw: number;
//   }[];
//   readonly fieldName?: string;
//   readonly fieldSignature?: Buffer;
//   readonly ilBody?: Buffer;
//   readonly malformedAssemblyReferenceRows?: readonly number[];
//   readonly malformedCustomAttributeRows?: readonly number[];
//   readonly metadataExtraData?: number;
//   readonly metadataValidMaskExtra?: bigint;
//   readonly methodRowCount?: number;
//   readonly methodName?: string;
//   readonly methodFlags?: number;
//   readonly methodSignature?: Buffer;
//   readonly moduleRowCount?: number;
//   readonly assemblyRowCount?: number;
//   readonly memberRefParentRaw?: number;
//   readonly memberRefName?: string;
//   readonly memberRefSignature?: Buffer;
//   /** Raw MethodDefOrRef coded values, one MethodSpec row each. */
//   readonly methodSpecMethods?: readonly number[];
//   /** Instantiation blob shared by every MethodSpec row. */
//   readonly methodSpecInstantiation?: Buffer;
//   /** TypeSpec signature blobs, one TypeSpec row each. */
//   readonly typeSpecSignatures?: readonly Buffer[];
//   /** Raw ResolutionScope coded value of the TypeRef row; null by default. */
//   readonly typeRefScopeRaw?: number;
//   readonly mvid?: Buffer;
//   readonly pinvoke?: {
//     readonly importName?: string;
//     readonly memberForwardedRaw?: number;
//     readonly mappingFlags?: number;
//     readonly moduleName?: string;
//   };
//   readonly readyToRun?: boolean;
//   readonly references?: readonly string[];
//   readonly resourceImplementationRaw?: number;
//   readonly resourceData?: Buffer;
//   readonly targetFramework?: string | null;
//   readonly typeName?: string;
//   readonly typeNamespace?: string;
//   /** NestedClass rows as [nested, enclosing] TypeDef rows. */
//   readonly nestedTypes?: readonly (readonly [number, number])[];
//   /** TypeRef rows after the TargetFrameworkAttribute row, from row 2. */
//   readonly typeReferences?: readonly {
//     readonly namespace: string;
//     readonly name: string;
//     /** TypeRef row of the enclosing type, for a nested type. */
//     readonly enclosingRow?: number;
//   }[];
//   /** Raw #US stream bytes; omitted means the metadata has no #US stream. */
//   readonly userStringHeap?: Buffer;
//   readonly virtualSectionSize?: number;
// }
//
// const textEncoder = new TextEncoder();
//
// const align4 = (value: number): number => (value + 3) & ~3;
//
// const cString = (value: string): Buffer => Buffer.from(`${value}\0`, "utf8");
//
// class StringHeap {
//   readonly #chunks: Buffer[] = [Buffer.from([0])];
//   #size = 1;
//
//   get size(): number {
//     return this.#size;
//   }
//
//   add(value: string): number {
//     if (value.length === 0) return 0;
//     const index = this.#size;
//     const chunk = cString(value);
//     this.#chunks.push(chunk);
//     this.#size += chunk.length;
//     return index;
//   }
//
//   toBuffer(): Buffer {
//     return Buffer.concat(this.#chunks);
//   }
// }
//
// class BlobHeap {
//   readonly #chunks: Buffer[] = [Buffer.from([0])];
//   #size = 1;
//
//   get size(): number {
//     return this.#size;
//   }
//
//   add(value: Buffer): number {
//     if (value.length === 0) return 0;
//     const index = this.#size;
//     const prefix =
//       value.length <= 0x7f
//         ? Buffer.from([value.length])
//         : value.length <= 0x3fff
//           ? Buffer.from([0x80 | (value.length >> 8), value.length & 0xff])
//           : Buffer.from([
//               0xc0 | (value.length >> 24),
//               (value.length >> 16) & 0xff,
//               (value.length >> 8) & 0xff,
//               value.length & 0xff,
//             ]);
//     this.#chunks.push(prefix, value);
//     this.#size += value.length + prefix.length;
//     return index;
//   }
//
//   toBuffer(): Buffer {
//     return Buffer.concat(this.#chunks);
//   }
// }
//
// const DEFAULT_MVID = Buffer.from([
//   0x33, 0x22, 0x11, 0x00, 0x55, 0x44, 0x77, 0x66, 0x88, 0x99, 0xaa, 0xbb, 0xcc,
//   0xdd, 0xee, 0xff,
// ]);
//
// /** Describe fixture bytes as the managed PE target consumed by static inspectors. */
// export const managedPeFixtureTarget = (
//   bytes: Buffer,
//   path = "/fixture.exe",
// ): BinaryTarget => ({
//   path,
//   sha256: createHash("sha256").update(bytes).digest("hex"),
//   kind: "executable",
//   format: "pe",
//   architecture: "x86",
//   availableArchitectures: ["x86"],
//   executableRole: "application",
//   managed: true,
// });
//
// const guidHeap = (mvid: Buffer = DEFAULT_MVID): Buffer => {
//   if (mvid.length !== 16)
//     throw new RangeError("Managed PE fixture MVID must be 16 bytes");
//   return Buffer.from(mvid);
// };
//
// const u16 = (value: number): Buffer => {
//   const bytes = Buffer.alloc(2);
//   bytes.writeUInt16LE(value, 0);
//   return bytes;
// };
//
// const u32 = (value: number): Buffer => {
//   const bytes = Buffer.alloc(4);
//   bytes.writeUInt32LE(value, 0);
//   return bytes;
// };
//
// type MetadataIndexSize = 2 | 4;
//
// const indexSize = (rows: number, codedTagBits = 0): MetadataIndexSize =>
//   rows < 2 ** (16 - codedTagBits) ? 2 : 4;
//
// const metadataIndex = (value: number, size: MetadataIndexSize): Buffer =>
//   size === 2 ? u16(value) : u32(value);
//
// const codedIndexSize = (
//   rows: readonly number[],
//   tagBits: number,
// ): MetadataIndexSize => indexSize(Math.max(...rows), tagBits);
//
// const moduleRow = (
//   name: number,
//   stringSize: MetadataIndexSize,
//   guidSize: MetadataIndexSize,
// ): Buffer =>
//   Buffer.concat([
//     u16(0),
//     metadataIndex(name, stringSize),
//     metadataIndex(1, guidSize),
//     metadataIndex(0, guidSize),
//     metadataIndex(0, guidSize),
//   ]);
//
// const typeRefRow = (
//   name: number,
//   namespace: number,
//   stringSize: MetadataIndexSize,
//   resolutionScope: Buffer,
// ): Buffer =>
//   Buffer.concat([
//     resolutionScope,
//     metadataIndex(name, stringSize),
//     metadataIndex(namespace, stringSize),
//   ]);
//
// const typeDefRow = ({
//   name,
//   namespace,
//   fieldList,
//   methodList,
//   stringSize,
//   typeDefOrRefSize,
//   fieldListSize,
//   methodListSize,
//   extendsRaw = (1 << 2) | 1,
//   flags = 0x0010_0001,
// }: {
//   readonly name: number;
//   readonly namespace: number;
//   readonly fieldList: number;
//   readonly methodList: number;
//   readonly stringSize: MetadataIndexSize;
//   readonly typeDefOrRefSize: MetadataIndexSize;
//   readonly fieldListSize: MetadataIndexSize;
//   readonly methodListSize: MetadataIndexSize;
//   readonly extendsRaw?: number;
//   readonly flags?: number;
// }): Buffer =>
//   Buffer.concat([
//     u32(flags),
//     metadataIndex(name, stringSize),
//     metadataIndex(namespace, stringSize),
//     metadataIndex(extendsRaw, typeDefOrRefSize),
//     metadataIndex(fieldList, fieldListSize),
//     metadataIndex(methodList, methodListSize),
//   ]);
//
// const fieldRow = (
//   name: number,
//   signature: number,
//   stringSize: MetadataIndexSize,
//   blobSize: MetadataIndexSize,
// ): Buffer =>
//   Buffer.concat([
//     u16(0x0001),
//     metadataIndex(name, stringSize),
//     metadataIndex(signature, blobSize),
//   ]);
//
// interface MethodDefRowInput {
//   readonly name: number;
//   readonly signature: number;
//   readonly stringSize: MetadataIndexSize;
//   readonly blobSize: MetadataIndexSize;
//   readonly parameterSize: MetadataIndexSize;
//   readonly rva?: number;
//   readonly flags?: number;
//   readonly implFlags?: number;
//   readonly parameterList?: number;
// }
//
// const methodDefRow = ({
//   name,
//   signature,
//   stringSize,
//   blobSize,
//   parameterSize,
//   rva = 0,
//   flags = 0x0016,
//   implFlags = 0,
//   parameterList = 0,
// }: MethodDefRowInput): Buffer =>
//   Buffer.concat([
//     u32(rva),
//     u16(implFlags),
//     u16(flags),
//     metadataIndex(name, stringSize),
//     metadataIndex(signature, blobSize),
//     metadataIndex(parameterList, parameterSize),
//   ]);
//
// const memberRefRow = ({
//   name,
//   signature,
//   stringSize,
//   blobSize,
//   parentSize,
//   parentRaw = (1 << 3) | 1,
// }: {
//   readonly name: number;
//   readonly signature: number;
//   readonly stringSize: MetadataIndexSize;
//   readonly blobSize: MetadataIndexSize;
//   readonly parentSize: MetadataIndexSize;
//   readonly parentRaw?: number;
// }): Buffer =>
//   Buffer.concat([
//     metadataIndex(parentRaw, parentSize),
//     metadataIndex(name, stringSize),
//     metadataIndex(signature, blobSize),
//   ]);
//
// const moduleRefRow = (name: number, stringSize: MetadataIndexSize): Buffer =>
//   Buffer.concat([metadataIndex(name, stringSize)]);
//
// const implMapRow = (
//   importName: number,
//   importScope: number,
//   mappingFlags: number,
//   stringSize: MetadataIndexSize,
//   memberForwardedSize: MetadataIndexSize,
//   moduleRefSize: MetadataIndexSize,
//   memberForwardedRaw: number,
// ): Buffer =>
//   Buffer.concat([
//     u16(mappingFlags),
//     metadataIndex(memberForwardedRaw, memberForwardedSize),
//     metadataIndex(importName, stringSize),
//     metadataIndex(importScope, moduleRefSize),
//   ]);
//
// const assemblyRow = (
//   name: number,
//   stringSize: MetadataIndexSize,
//   blobSize: MetadataIndexSize,
// ): Buffer =>
//   Buffer.concat([
//     u32(0x0000_8004),
//     u16(1),
//     u16(2),
//     u16(3),
//     u16(4),
//     u32(0),
//     metadataIndex(0, blobSize),
//     metadataIndex(name, stringSize),
//     metadataIndex(0, stringSize),
//   ]);
//
// const assemblyRefRow = (
//   name: number,
//   keyOrToken: number,
//   malformedName: boolean,
//   stringSize: MetadataIndexSize,
//   blobSize: MetadataIndexSize,
// ): Buffer =>
//   Buffer.concat([
//     u16(8),
//     u16(0),
//     u16(0),
//     u16(0),
//     u32(0),
//     metadataIndex(keyOrToken, blobSize),
//     metadataIndex(
//       malformedName ? (stringSize === 2 ? 0xffff : 0xffff_ffff) : name,
//       stringSize,
//     ),
//     metadataIndex(0, stringSize),
//     metadataIndex(0, blobSize),
//   ]);
//
// const customAttributeRow = ({
//   value,
//   options,
//   parentIndexSize,
//   typeIndexSize,
//   blobSize,
//   row,
export const _l = 367;
