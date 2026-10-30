import {
  attachManagedDecodeBudget,
  ManagedDecodeBudget,
} from "./ManagedDecodeBudget.js";
import { managedFailure } from "./ManagedReaderFailure.js";
import {
  computeRowSize,
  type RowSizeContext,
} from "./ManagedMetadataRowSizes.js";

interface HeapSizes {
  readonly string: 2 | 4;
  readonly guid: 2 | 4;
  readonly blob: 2 | 4;
}

interface ParsedTablesHeader {
  readonly tableBytes: Buffer;
  readonly tablesOffset: number;
  readonly heaps: HeapSizes;
  readonly valid: bigint;
}

const readTablesHeader = (
  bytes: Buffer,
  streams: ReadonlyMap<string, MetadataStream>,
): ParsedTablesHeader => {
  const tablesStream = streamByName(streams, ["#~", "#-"]);
  if (tablesStream === undefined)
    throw managedFailure(
      "missing-stream",
      "metadata.tables",
      "Required metadata table stream #~ or #- is absent",
    );
  const tableBytes = bytes.subarray(
    tablesStream.offset,
    tablesStream.offset + tablesStream.size,
  );
  requireRange(
    tableBytes,
    tablesStream.offset,
    0,
    24,
    "metadata.tables-header",
  );
  const heapSizes = tableBytes[6] ?? 0;
  const heaps = {
    string: (heapSizes & 0x01) === 0 ? (2 as const) : (4 as const),
    guid: (heapSizes & 0x02) === 0 ? (2 as const) : (4 as const),
    blob: (heapSizes & 0x04) === 0 ? (2 as const) : (4 as const),
  };
  const valid = tableBytes.readBigUInt64LE(8);
  if ((valid & ~SUPPORTED_TABLE_MASK) !== 0n)
    throw managedFailure(
      "invalid-tables",
      "metadata.valid-mask",
      "Metadata valid mask names unsupported tables outside the admitted ECMA-335 range",
      tablesStream.offset + 8,
    );
  return { tableBytes, tablesOffset: tablesStream.offset, heaps, valid };
};

const readRowCounts = (
  tableBytes: Buffer,
  tablesOffset: number,
  valid: bigint,
): readonly number[] => {
  const rowCounts = Array<number>(METADATA_TABLE_NAMES.length).fill(0);
  let tableCursor = 24;
  for (let index = 0; index < METADATA_TABLE_NAMES.length; index += 1) {
    if ((valid & (1n << BigInt(index))) === 0n) continue;
    requireRange(
      tableBytes,
      tablesOffset,
      tableCursor,
      4,
      "metadata.table-row-count",
    );
    const count = tableBytes.readUInt32LE(tableCursor);
    rowCounts[index] = count;
    tableCursor += 4;
  }
  return rowCounts;
};

const buildRowSizeContext = (
  rowCounts: readonly number[],
  heaps: HeapSizes,
): RowSizeContext => ({
  tableSize: (index) => tableSize(index, rowCounts),
  codedSize: (name) => codedSize(name, rowCounts),
  stringSize: heaps.string,
  guidSize: heaps.guid,
  blobSize: heaps.blob,
});

const buildMetadataTables = ({
  tableBytes,
  rowCounts,
  heaps,
  valid,
  tablesOffset,
}: {
  readonly tableBytes: Buffer;
  readonly rowCounts: readonly number[];
  readonly heaps: HeapSizes;
  readonly valid: bigint;
  readonly tablesOffset: number;
}): ReadonlyMap<number, MetadataTableLayout> => {
  const tables = new Map<number, MetadataTableLayout>();
  const context = buildRowSizeContext(rowCounts, heaps);
  let tableCursor = 24;
  for (let index = 0; index < METADATA_TABLE_NAMES.length; index += 1) {
    if ((valid & (1n << BigInt(index))) === 0n) continue;
    tableCursor += 4;
  }
  // CLR readers honor an optional extra-data word after the row counts.
  // Its value is opaque; it is not a length or part of the first table row.
  if (((tableBytes[6] ?? 0) & 0x40) !== 0) {
    if (tableCursor > tableBytes.length - 4)
      throw managedFailure(
        "invalid-metadata-root",
        "metadata.tables-extra-data",
        "Metadata tables extra-data word is truncated",
        tablesOffset + tableCursor,
      );
    tableCursor += 4;
  }
  for (let index = 0; index < METADATA_TABLE_NAMES.length; index += 1) {
    const count = rowCounts[index] ?? 0;
    if ((valid & (1n << BigInt(index))) === 0n) continue;
    const sizeOfRow = computeRowSize(index, context);
    const byteLength = count * sizeOfRow;
    if (!Number.isSafeInteger(byteLength))
      throw managedFailure(
        "invalid-tables",
        "metadata.tables",
        "Metadata table byte size overflowed",
        tablesOffset + tableCursor,
      );
    requireRange(
      tableBytes,
      tablesOffset,
      tableCursor,
      byteLength,
      "metadata.table-data",
    );
    tables.set(index, {
      index,
      name: METADATA_TABLE_NAMES[index] ?? `Table${String(index)}`,
      rowCount: count,
      rowSize: sizeOfRow,
      offset: tablesOffset + tableCursor,
    });
    tableCursor += byteLength;
  }
  return tables;
};

/** Parse ECMA-335 stream and table layout with checked byte extents. */
export const readManagedMetadataLayout = (
  artifact: Buffer,
  rootOffset: number,
  size: number,
): ManagedMetadataLayout => {
  if (size < 20 || rootOffset < 0 || rootOffset > artifact.length - size)
    throw managedFailure(
      "invalid-metadata-root",
      "metadata.root",
      "CLI metadata directory leaves the artifact byte range",
      rootOffset,
    );
  const bytes = artifact.subarray(rootOffset, rootOffset + size);
  const budget = new ManagedDecodeBudget();
  const { streams, version } = readMetadataStreams(bytes, rootOffset, budget);
  const { tableBytes, tablesOffset, heaps, valid } = readTablesHeader(
    artifact,
    streams,
  );
  const rowCounts = readRowCounts(tableBytes, tablesOffset, valid);
  const tables = buildMetadataTables({
    tableBytes,
    rowCounts,
    heaps,
    valid,
    tablesOffset,
  });
  const layout: ManagedMetadataLayout = {
    rootOffset,
    size,
    version,
    streamNames: [...streams.keys()].sort(),
    strings: requireStream(streams, "#Strings"),
    guid: requireStream(streams, "#GUID"),
    blob: requireStream(streams, "#Blob"),
    userStrings: streams.get("#US") ?? null,
    tables,
    rowCounts,
    stringIndexSize: heaps.string,
    guidIndexSize: heaps.guid,
    blobIndexSize: heaps.blob,
    table: (index) => tables.get(index),
    tableIndexSize: (index) => tableSize(index, rowCounts),
    codedIndexSize: (name) => codedSize(name, rowCounts),
  };
  attachManagedDecodeBudget(layout, budget);
  return layout;
};

/** Resolve a one-based metadata row to its exact file offset. */
export const metadataRowOffset = (
  layout: ManagedMetadataLayout,
  table: number,
  row: number,
): number => {
  const descriptor = layout.table(table);
  if (descriptor === undefined || row < 1 || row > descriptor.rowCount)
    throw managedFailure(
      "invalid-row",
      `metadata.${METADATA_TABLE_NAMES[table] ?? String(table)}`,
      `Metadata row ${String(row)} is outside its table`,
    );
  return descriptor.offset + (row - 1) * descriptor.rowSize;
};
