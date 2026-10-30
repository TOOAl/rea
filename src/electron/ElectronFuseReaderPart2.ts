import type { ResolvedElectronFuseFile } from "./ElectronFusePath.js";
import { createHash } from "node:crypto";
import { lstat } from "node:fs/promises";

import {
  hasMachoMagic,
  readMachoImage,
} from "../artifacts/apple/MachoLoadCommandReader.js";
import type { ReadAt } from "../artifacts/apple/MachoLoadCommandReader.js";
import {
  electronFuseName,
  electronFuseState,
  ELECTRON_FUSE_SENTINEL,
  type ElectronFuseSentinel,
  type ElectronFuseSlice,
} from "../domain/electron/electronFuses.js";
import {
  openRegularFile,
  RegularFileChangedError,
  sameRegularFileState,
} from "../filesystem/RegularFile.js";

/** Admission and search bounds for one Electron executable. */

const identifyMacho = async (
  readAt: ReadAt,
  size: number,
  head: Uint8Array,
  path: string,
): Promise<{
  readonly format: ElectronFuseContainerFormat;
  readonly slices: readonly SliceRange[];
}> => {
  const facts = await readMachoImage(readAt, size);
  if (facts.status !== "parsed") {
    const reason =
      facts.status === "not-mach-o"
        ? `Selected artifact ${path} does not contain a Mach-O, ELF, or PE container.`
        : facts.reason;
    throw new ElectronFuseFormatFailure(
      facts.status === "malformed" ? "malformed" : "unsupported",
      reason,
    );
  }
  const format = isFat(head) ? "mach-o-universal" : "mach-o";
  const slices = facts.slices.map((slice, index) => ({
    index,
    fileOffset: slice.slice_offset,
    size: slice.slice_size,
    architecture: slice.architecture,
  }));
  assertNonOverlappingSlices(slices);
  return {
    format,
    slices,
  };
};

/** A FAT architecture owns a distinct byte range; overlap is malformed. */
const assertNonOverlappingSlices = (ranges: readonly SliceRange[]): void => {
  const ordered = [...ranges].sort(
    (left, right) => left.fileOffset - right.fileOffset,
  );
  for (let index = 1; index < ordered.length; index += 1) {
    const previous = ordered[index - 1];
    const current = ordered[index];
    if (
      previous !== undefined &&
      current !== undefined &&
      current.fileOffset < previous.fileOffset + previous.size
    )
      throw new ElectronFuseFormatFailure(
        "malformed",
        `Mach-O slices ${previous.index} and ${current.index} overlap.`,
      );
  }
};

const scanSlices = async (
  handle: Awaited<ReturnType<typeof openRegularFile>>,
  path: string,
  size: number,
  ranges: readonly SliceRange[],
  chunkBytes: number,
  signal: AbortSignal | undefined,
): Promise<{
  readonly sha256: string;
  readonly slices: readonly ElectronFuseSlice[];
}> => {
  const states = ranges.map((slice) => ({
    slice,
    carry: Buffer.alloc(0),
    hits: [] as number[],
  }));
  const hash = createHash("sha256");
  const chunk = Buffer.allocUnsafe(chunkBytes);
  let position = 0;
  while (position < size) {
    signal?.throwIfAborted();
    const length = Math.min(chunkBytes, size - position);
    const read = await handle.read(chunk, 0, length, position);
    if (read.bytesRead !== length) throw new RegularFileChangedError(path);
    const piece = chunk.subarray(0, length);
    hash.update(piece);
    absorbChunk(states, piece, position);
    position += length;
  }
  if (position !== size) throw new RegularFileChangedError(path);
  const slices: ElectronFuseSlice[] = [];
  for (const state of states) {
    const sentinels: ElectronFuseSentinel[] = [];
    for (const offset of state.hits)
      sentinels.push(
        await parseWire(
          handle,
          path,
          offset,
          state.slice.fileOffset + state.slice.size,
          signal,
        ),
      );
    slices.push({
      index: state.slice.index,
      file_offset: state.slice.fileOffset,
      size: state.slice.size,
      architecture: state.slice.architecture,
      sentinel_count: sentinels.length,
      sentinels,
    });
  }
  return { sha256: hash.digest("hex"), slices };
};

const absorbChunk = (
  states: readonly {
    readonly slice: SliceRange;
    carry: Buffer;
    readonly hits: number[];
  }[],
  chunk: Buffer,
  position: number,
): void => {
  const chunkEnd = position + chunk.length;
  for (const state of states) {
    const start = Math.max(position, state.slice.fileOffset);
    const end = Math.min(chunkEnd, state.slice.fileOffset + state.slice.size);
    if (start >= end) continue;
    const piece = chunk.subarray(start - position, end - position);
    const carryLength = state.carry.length;
    const window =
      carryLength === 0 ? piece : Buffer.concat([state.carry, piece]);
    const windowFileStart = start - carryLength;
    let from = 0;
    while (from <= window.length - SENTINEL.length) {
      const found = window.indexOf(SENTINEL, from);
      if (found < 0) break;
      const sentinelOffset = windowFileStart + found;
      if (!state.hits.includes(sentinelOffset)) {
        if (state.hits.length >= ELECTRON_FUSE_LIMITS.maximumSentinelsPerSlice)
          throw new ElectronFuseResourceFailure(
            "capacity",
            `Slice ${state.slice.index} contains more than ${ELECTRON_FUSE_LIMITS.maximumSentinelsPerSlice} Electron fuse sentinels.`,
          );
        state.hits.push(sentinelOffset);
      }
      from = found + 1;
    }
    const tail = SENTINEL.length - 1;
    state.carry =
      window.length <= tail
        ? Buffer.from(window)
        : Buffer.from(window.subarray(window.length - tail));
  }
};

const parseWire = async (
  handle: Awaited<ReturnType<typeof openRegularFile>>,
  path: string,
  sentinelOffset: number,
  sliceEnd: number,
  signal: AbortSignal | undefined,
): Promise<ElectronFuseSentinel> => {
  const wireStart = sentinelOffset + SENTINEL.length;
  const available = sliceEnd - wireStart;
  if (available < 1)
    return {
      sentinel_offset: sentinelOffset,
      wire_version: null,
      declared_length: null,
      fuses: [],
      complete: false,
    };
  const header = await readExact(
    handle,
    path,
    wireStart,
    Math.min(available, 2),
    signal,
  );
  const wireVersion = header[0];
  if (wireVersion === undefined || header.length < 2)
    return {
      sentinel_offset: sentinelOffset,
      wire_version: wireVersion ?? null,
      declared_length: null,
      fuses: [],
      complete: false,
    };
  const declared = header[1] ?? 0;
  const fuseLength = Math.min(declared, available - 2);
  const fuseBytes =
    fuseLength === 0
      ? Buffer.alloc(0)
      : await readExact(handle, path, wireStart + 2, fuseLength, signal);
  return {
    sentinel_offset: sentinelOffset,
    wire_version: wireVersion,
    declared_length: declared,
    fuses: [...fuseBytes].map((raw, index) => ({
      index,
      name: electronFuseName(wireVersion, index),
      state: electronFuseState(raw),
      raw_byte: raw,
    })),
    complete: fuseBytes.length === declared,
  };
};

const readExact = async (
  handle: Awaited<ReturnType<typeof openRegularFile>>,
  path: string,
  offset: number,
  length: number,
  signal: AbortSignal | undefined,
): Promise<Buffer> => {
  signal?.throwIfAborted();
  const buffer = Buffer.alloc(length);
  const read = await handle.read(buffer, 0, length, offset);
  if (read.bytesRead !== length) throw new RegularFileChangedError(path);
  return buffer;
};

const isElf = (head: Uint8Array): boolean =>
  head.length >= 4 &&
  head[0] === 0x7f &&
  head[1] === 0x45 &&
  head[2] === 0x4c &&
  head[3] === 0x46;

const isFat = (head: Uint8Array): boolean => {
  if (head.length < 4) return false;
  const magic = Buffer.from(head.buffer, head.byteOffset, 4).readUInt32BE(0);
  return FAT_MAGICS.has(magic);
};

const isPe = async (readAt: ReadAt, size: number): Promise<boolean> => {
  if (size < 64) return false;
  const header = await readAt(0, 64);
  if (header.length < 64 || header[0] !== 0x4d || header[1] !== 0x5a)
    return false;
  const offset = Buffer.from(
    header.buffer,
    header.byteOffset,
    header.byteLength,
  ).readUInt32LE(0x3c);
  if (
    !Number.isSafeInteger(offset) ||
    offset < 64 ||
    offset > ELECTRON_FUSE_LIMITS.maximumPeHeaderOffset ||
    offset > size - 4
  )
    return false;
  const signature = await readAt(offset, 4);
  return (
    signature.length === 4 &&
    signature[0] === 0x50 &&
    signature[1] === 0x45 &&
    signature[2] === 0 &&
    signature[3] === 0
  );
};

const isMissingPath = (cause: unknown): boolean =>
  cause instanceof Error &&
  "code" in cause &&
  ["ENOENT", "ENOTDIR"].includes(String(cause.code));
