import type { JsonValue } from "../../domain/jsonValue.js";
import { TextDecoder } from "node:util";

const DEFAULT_DECODE_BUDGET_BYTES = 128 * 1024 * 1024;

interface NibObjectRecord {
  readonly class_index: number;
  readonly value_start: number;
  readonly value_count: number;
}

interface NibValueRecord {
  readonly key_index: number;
  readonly value: JsonValue;
}

// src/artifacts/apple/NibArchivePart2.ts
const skipValue = (
  bytes: Buffer,
  cursor: { offset: number },
  end: number,
  type: number,
  index: number,
): void => {
  switch (type) {
    case 0:
      ensureRange(cursor.offset, 1, end, `value ${index}`);
      cursor.offset += 1;
      return;
    case 1:
      ensureRange(cursor.offset, 2, end, `value ${index}`);
      cursor.offset += 2;
      return;
    case 2:
    case 10:
      ensureRange(cursor.offset, 4, end, `value ${index}`);
      cursor.offset += 4;
      return;
    case 3:
    case 7:
      ensureRange(cursor.offset, 8, end, `value ${index}`);
      cursor.offset += 8;
      return;
    case 6:
      ensureRange(cursor.offset, 4, end, `value ${index}`);
      cursor.offset += 4;
      return;
    case 4:
    case 5:
    case 9:
      return;
    case 8: {
      const length = readVarint(bytes, cursor, end);
      cursor.offset = checkedEnd(
        cursor.offset,
        length,
        end,
        `value ${index} data`,
      );
      return;
    }
    default:
      throw new TypeError(
        `NIBArchive value ${index} has unsupported type ${type}`,
      );
  }
};

const valueIndexes = (
  objects: readonly NibObjectRecord[],
  total: number,
): ReadonlySet<number> => {
  const indexes = new Set<number>();
  for (const object of objects)
    for (
      let index = object.value_start;
      index < object.value_start + object.value_count;
      index += 1
    )
      indexes.add(index);
  if (indexes.size > total)
    throw new TypeError(
      "NIBArchive object value ranges exceed the value table",
    );
  return indexes;
};

const readCount = (bytes: Buffer, offset: number, label: string): number => {
  const count = readU32(bytes, offset);
  if (count > bytes.length)
    throw new TypeError(`NIBArchive ${label} count exceeds the archive length`);
  return count;
};

const readOffset = (
  bytes: Buffer,
  offset: number,
  fileLength: number,
  label: string,
): number => {
  const value = readU32(bytes, offset);
  if (value < 50 || value > fileLength)
    throw new TypeError(`NIBArchive ${label} table offset is invalid`);
  return value;
};

const readU32 = (bytes: Buffer, offset: number): number => {
  ensureRange(offset, 4, bytes.length, "header");
  return bytes.readUInt32LE(offset);
};

const decodeUtf8 = (
  bytes: Buffer,
  start: number,
  end: number,
  label: string,
): string => {
  try {
    // These are length-prefixed names, not standalone text documents.
    return new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(
      bytes.subarray(start, end),
    );
  } catch (cause: unknown) {
    throw new TypeError(`NIBArchive ${label} is not valid UTF-8`, {
      cause,
    });
  }
};

const readVarint = (
  bytes: Buffer,
  cursor: { offset: number },
  end: number,
): number => {
  let value = 0;
  let shift = 0;
  for (let index = 0; index < 5; index += 1) {
    ensureRange(cursor.offset, 1, end, "variable integer");
    const byte = bytes[cursor.offset++] ?? 0;
    value += (byte & 0x7f) * 2 ** shift;
    if ((byte & 0x80) !== 0) {
      if (value > 0x7fff_ffff)
        throw new TypeError("NIBArchive variable integer is out of range");
      return value;
    }
    shift += 7;
  }
  throw new TypeError("NIBArchive variable integer is too long");
};

const checkedEnd = (
  start: number,
  length: number,
  limit: number,
  label: string,
): number => {
  if (!Number.isSafeInteger(length) || length < 0 || start + length > limit)
    throw new TypeError(`NIBArchive ${label} exceeds its table`);
  return start + length;
};

const ensureRange = (
  start: number,
  length: number,
  limit: number,
  label: string,
): void => {
  checkedEnd(start, length, limit, label);
};

const assertOrderedOffsets = (length: number, offsets: readonly number[]) => {
  let previous = 50;
  for (const offset of offsets) {
    if (offset < previous || offset > length)
      throw new TypeError("NIBArchive table offsets are out of order");
    previous = offset;
  }
};
