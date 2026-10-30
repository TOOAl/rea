import { ManagedDecodeBudget } from "./ManagedDecodeBudget.js";
import { managedFailure } from "./ManagedReaderFailure.js";

export const METADATA_TABLE_NAMES = [
  "Module",
  "TypeRef",
  "TypeDef",
  "FieldPtr",
  "Field",
  "MethodPtr",
  "MethodDef",
  "ParamPtr",
  "Param",
  "InterfaceImpl",
  "MemberRef",
  "Constant",
  "CustomAttribute",
  "FieldMarshal",
  "DeclSecurity",
  "ClassLayout",
  "FieldLayout",
  "StandAloneSig",
  "EventMap",
  "EventPtr",
  "Event",
  "PropertyMap",
  "PropertyPtr",
  "Property",
  "MethodSemantics",
  "MethodImpl",
  "ModuleRef",
  "TypeSpec",
  "ImplMap",
  "FieldRVA",
  "ENCLog",
  "ENCMap",
  "Assembly",
  "AssemblyProcessor",
  "AssemblyOS",
  "AssemblyRef",
  "AssemblyRefProcessor",
  "AssemblyRefOS",
  "File",
  "ExportedType",
  "ManifestResource",
  "NestedClass",
  "GenericParam",
  "MethodSpec",
  "GenericParamConstraint",
] as const;

interface MetadataStream {
  readonly name: string;
  readonly offset: number;
  readonly size: number;
}

export interface MetadataTableLayout {
  readonly index: number;
  readonly name: string;
  readonly rowCount: number;
  readonly rowSize: number;
  readonly offset: number;
}

export interface ManagedMetadataLayout {
  readonly rootOffset: number;
  readonly size: number;
  readonly version: string;
  readonly streamNames: readonly string[];
  readonly strings: MetadataStream;
  readonly guid: MetadataStream;
  readonly blob: MetadataStream;
  /** Optional: assemblies without `ldstr` literals may omit #US. */
  readonly userStrings: MetadataStream | null;
  readonly tables: ReadonlyMap<number, MetadataTableLayout>;
  readonly rowCounts: readonly number[];
  readonly stringIndexSize: 2 | 4;
  readonly guidIndexSize: 2 | 4;
  readonly blobIndexSize: 2 | 4;
  table(index: number): MetadataTableLayout | undefined;
  tableIndexSize(index: number): 2 | 4;
  codedIndexSize(name: CodedIndexName): 2 | 4;
}

export type CodedIndexName = keyof typeof CODED_INDEXES;

const CODED_INDEXES = {
  TypeDefOrRef: { bits: 2, tables: [2, 1, 27] },
  HasConstant: { bits: 2, tables: [4, 8, 23] },
  HasCustomAttribute: {
    bits: 5,
    tables: [
      6, 4, 1, 2, 8, 9, 10, 0, 14, 23, 20, 17, 26, 27, 32, 35, 38, 39, 40, 42,
      44, 43,
    ],
  },
  HasFieldMarshal: { bits: 1, tables: [4, 8] },
  HasDeclSecurity: { bits: 2, tables: [2, 6, 32] },
  MemberRefParent: { bits: 3, tables: [2, 1, 26, 6, 27] },
  HasSemantics: { bits: 1, tables: [20, 23] },
  MethodDefOrRef: { bits: 1, tables: [6, 10] },
  MemberForwarded: { bits: 1, tables: [4, 6] },
  Implementation: { bits: 2, tables: [38, 35, 39] },
  CustomAttributeType: { bits: 3, tables: [6, 10] },
  ResolutionScope: { bits: 2, tables: [0, 26, 35, 1] },
  TypeOrMethodDef: { bits: 1, tables: [2, 6] },
} as const;

const SUPPORTED_TABLE_MASK = (1n << BigInt(METADATA_TABLE_NAMES.length)) - 1n;

/** Check a range within `bytes`, which start at artifact file offset `base`. */
const requireRange = (
  bytes: Buffer,
  base: number,
  offset: number,
  length: number,
  scope: string,
): void => {
  if (
    !Number.isSafeInteger(offset) ||
    !Number.isSafeInteger(length) ||
    offset < 0 ||
    length < 0 ||
    offset > bytes.length - length
  )
    throw managedFailure(
      "invalid-metadata-root",
      scope,
      `${scope} leaves the metadata byte range`,
      Number.isSafeInteger(base + offset) && offset >= 0 ? base + offset : null,
    );
};

const align4 = (value: number): number => Math.ceil(value / 4) * 4;

const readStreamName = (
  bytes: Buffer,
  offset: number,
): { readonly name: string; readonly next: number } => {
  const endLimit = Math.min(bytes.length, offset + 32);
  let end = offset;
  while (end < endLimit && bytes[end] !== 0) end += 1;
  if (end === endLimit)
    throw managedFailure(
      "invalid-stream",
      "metadata.stream-name",
      "Metadata stream name is missing a bounded terminator",
      offset,
    );
  const nameBytes = bytes.subarray(offset, end);
  if (nameBytes.some((byte) => byte < 0x20 || byte > 0x7e))
    throw managedFailure(
      "invalid-stream",
      "metadata.stream-name",
      "Metadata stream name is not printable ASCII",
      offset,
    );
  return {
    name: nameBytes.toString("ascii"),
    next: align4(end + 1),
  };
};

const streamByName = (
  streams: ReadonlyMap<string, MetadataStream>,
  names: readonly string[],
): MetadataStream | undefined => {
  for (const name of names) {
    const stream = streams.get(name);
    if (stream !== undefined) return stream;
  }
  return undefined;
};

const requireStream = (
  streams: ReadonlyMap<string, MetadataStream>,
  name: string,
): MetadataStream => {
  const stream = streams.get(name);
  if (stream === undefined)
    throw managedFailure(
      "missing-stream",
      `metadata.${name}`,
      `Required metadata stream ${name} is absent`,
    );
  return stream;
};

const codedSize = (
  name: CodedIndexName,
  rowCounts: readonly number[],
): 2 | 4 => {
  const descriptor = CODED_INDEXES[name];
  let maximum = 0;
  for (const table of descriptor.tables)
    maximum = Math.max(maximum, rowCounts[table] ?? 0);
  return maximum < 2 ** (16 - descriptor.bits) ? 2 : 4;
};

const tableSize = (index: number, rows: readonly number[]): 2 | 4 =>
  (rows[index] ?? 0) < 0x1_0000 ? 2 : 4;

interface ParsedStreams {
  readonly streams: ReadonlyMap<string, MetadataStream>;
  readonly version: string;
}

const readMetadataStreams = (
  bytes: Buffer,
  rootOffset: number,
  budget: ManagedDecodeBudget,
): ParsedStreams => {
  if (bytes.readUInt32LE(0) !== 0x424a_5342)
    throw managedFailure(
      "invalid-metadata-root",
      "metadata.signature",
      "CLI metadata signature is not BSJB",
      rootOffset,
    );
  const versionLength = bytes.readUInt32LE(12);
  requireRange(bytes, rootOffset, 16, versionLength, "metadata.version");
  const versionBytes = bytes.subarray(16, 16 + versionLength);
  const zero = versionBytes.indexOf(0);
  const decodedVersionLength = zero < 0 ? versionBytes.length : zero;
  budget.reserveString(decodedVersionLength, rootOffset + 16);
  const version = versionBytes
    .subarray(0, decodedVersionLength)
    .toString("utf8");
  let cursor = align4(16 + versionLength);
  requireRange(bytes, rootOffset, cursor, 4, "metadata.stream-count");
  const streamCount = bytes.readUInt16LE(cursor + 2);
  if (streamCount === 0 || streamCount > 64)
    throw managedFailure(
      "invalid-stream",
      "metadata.stream-count",
      "Metadata stream count is outside the admitted range",
      rootOffset + cursor + 2,
    );
  cursor += 4;
  const streams = new Map<string, MetadataStream>();
  for (let index = 0; index < streamCount; index += 1) {
    requireRange(bytes, rootOffset, cursor, 8, "metadata.stream-header");
    const relativeOffset = bytes.readUInt32LE(cursor);
    const streamSize = bytes.readUInt32LE(cursor + 4);
    const named = readStreamName(bytes, cursor + 8);
    if (streams.has(named.name))
      throw managedFailure(
        "invalid-stream",
        "metadata.stream-header",
        `Duplicate metadata stream ${named.name}`,
        rootOffset + cursor,
      );
    requireRange(
      bytes,
      rootOffset,
      relativeOffset,
      streamSize,
      `metadata.${named.name}`,
    );
    streams.set(named.name, {
      name: named.name,
      offset: rootOffset + relativeOffset,
      size: streamSize,
    });
    cursor = named.next;
  }
  return { streams, version };
};
