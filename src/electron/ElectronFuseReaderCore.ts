import type { ResolvedElectronFuseFile } from "./ElectronFusePath.js";
import { lstat } from "node:fs/promises";

import { hasMachoMagic } from "../artifacts/apple/MachoLoadCommandReader.js";
import type { ReadAt } from "../artifacts/apple/MachoLoadCommandReader.js";
import {
  electronFuseState,
  ELECTRON_FUSE_SENTINEL,
  type ElectronFuseSlice,
} from "../domain/electron/electronFuses.js";
import {
  openRegularFile,
  RegularFileChangedError,
  sameRegularFileState,
} from "../filesystem/RegularFile.js";

/** Admission and search bounds for one Electron executable. */
export const ELECTRON_FUSE_LIMITS = {
  maximumFileBytes: 1024 * 1024 * 1024,
  chunkBytes: 256 * 1024,
  maximumSentinelsPerSlice: 32,
  maximumPeHeaderOffset: 1024 * 1024,
} as const;

const SENTINEL = Buffer.from(ELECTRON_FUSE_SENTINEL, "ascii");
const FAT_MAGICS = new Set([0xcafebabe, 0xcafebabf, 0xbebafeca, 0xbfbafeca]);

/** Container identity and per-slice fuse wires. Offsets are file-absolute. */
export interface ElectronFuseImage {
  readonly sha256: string;
  readonly bytes: number;
  readonly format: "mach-o" | "mach-o-universal" | "pe" | "elf";
  readonly slices: readonly ElectronFuseSlice[];
}

type ElectronFuseContainerFormat = ElectronFuseImage["format"];

interface SliceRange {
  readonly index: number;
  readonly fileOffset: number;
  readonly size: number;
  readonly architecture: string | null;
}

/** The selected container is malformed or outside the supported formats. */
export class ElectronFuseFormatFailure extends Error {
  constructor(
    readonly kind: "malformed" | "unsupported",
    message: string,
  ) {
    super(message);
    this.name = "ElectronFuseFormatFailure";
  }
}

/** A measured bound was hit before a complete fuse report could be returned. */
export class ElectronFuseResourceFailure extends Error {
  constructor(
    readonly boundary: "file-size" | "capacity",
    message: string,
  ) {
    super(message);
    this.name = "ElectronFuseResourceFailure";
  }
}

/**
 * Hash one admitted regular file and search each slice for the fuse sentinel.
 * The search keeps only a sentinel-sized overlap between chunks.
 */
export const readElectronFuseImage = async (
  path: string,
  options?: {
    readonly signal?: AbortSignal;
    readonly chunkBytes?: number;
    readonly selection?: ResolvedElectronFuseFile;
  },
): Promise<ElectronFuseImage> => {
  const signal = options?.signal;
  signal?.throwIfAborted();
  const selection = options?.selection;
  const recheckPath = async (candidate: string) => {
    signal?.throwIfAborted();
    try {
      const metadata = await lstat(candidate, { bigint: true });
      signal?.throwIfAborted();
      return metadata;
    } catch (cause: unknown) {
      if (selection !== undefined && isMissingPath(cause))
        throw new RegularFileChangedError(path);
      throw cause;
    }
  };
  const assertPathNodes = async (): Promise<void> => {
    if (selection === undefined) return;
    if (selection.path !== path) throw new RegularFileChangedError(path);
    for (const node of selection.nodes) {
      const current = await recheckPath(node.path);
      if (
        current.dev !== node.metadata.dev ||
        current.ino !== node.metadata.ino ||
        current.isDirectory() !== node.metadata.isDirectory() ||
        current.isSymbolicLink() !== node.metadata.isSymbolicLink()
      )
        throw new RegularFileChangedError(path);
    }
  };
  await assertPathNodes();
  const before = await recheckPath(path);
  if (
    selection !== undefined &&
    !sameRegularFileState(selection.metadata, before)
  )
    throw new RegularFileChangedError(path);
  if (!before.isFile() || before.isSymbolicLink())
    throw new ElectronFuseFormatFailure(
      "unsupported",
      `Expected a regular file without a symlink: ${path}`,
    );
  if (before.size > BigInt(ELECTRON_FUSE_LIMITS.maximumFileBytes))
    throw new ElectronFuseResourceFailure(
      "file-size",
      `Selected artifact exceeds ${ELECTRON_FUSE_LIMITS.maximumFileBytes} bytes: ${path}`,
    );
  const size = Number(before.size);
  const chunkBytes = options?.chunkBytes ?? ELECTRON_FUSE_LIMITS.chunkBytes;
  if (
    !Number.isSafeInteger(chunkBytes) ||
    chunkBytes < 1 ||
    chunkBytes > ELECTRON_FUSE_LIMITS.chunkBytes
  )
    throw new TypeError(
      `chunkBytes must be an integer between 1 and ${ELECTRON_FUSE_LIMITS.chunkBytes}.`,
    );
  const handle = await openRegularFile(path, { symlinks: "reject", signal });
  try {
    const opened = await handle.stat({ bigint: true });
    if (!sameRegularFileState(before, opened))
      throw new RegularFileChangedError(path);
    await assertPathNodes();
    const readAt = readerFor(handle, size, path, signal);
    const container = await identifyContainer(readAt, size, path);
    const scanned = await scanSlices(
      handle,
      path,
      size,
      container.slices,
      chunkBytes,
      signal,
    );
    const current = await recheckPath(path);
    if (!sameRegularFileState(before, current))
      throw new RegularFileChangedError(path);
    await assertPathNodes();
    return {
      sha256: scanned.sha256,
      bytes: size,
      format: container.format,
      slices: scanned.slices,
    };
  } finally {
    await handle.close();
  }
};

/** Sentence describing the file and sentinel bounds enforced by this reader. */
export const electronFuseReadLimitation = (): string =>
  `The selected file is admitted as one regular file of at most 1 GiB. Sentinel search uses ${ELECTRON_FUSE_LIMITS.chunkBytes}-byte windows, and each slice keeps at most ${ELECTRON_FUSE_LIMITS.maximumSentinelsPerSlice} sentinels.`;

const readerFor =
  (
    handle: Awaited<ReturnType<typeof openRegularFile>>,
    size: number,
    path: string,
    signal: AbortSignal | undefined,
  ): ReadAt =>
  async (offset, length) => {
    signal?.throwIfAborted();
    if (length <= 0 || offset < 0 || offset >= size) return new Uint8Array();
    const bounded = Math.min(length, size - offset);
    const buffer = Buffer.alloc(bounded);
    const read = await handle.read(buffer, 0, bounded, offset);
    if (read.bytesRead !== bounded) throw new RegularFileChangedError(path);
    return buffer.subarray(0, read.bytesRead);
  };

const identifyContainer = async (
  readAt: ReadAt,
  size: number,
  path: string,
): Promise<{
  readonly format: ElectronFuseContainerFormat;
  readonly slices: readonly SliceRange[];
}> => {
  const head = await readAt(0, Math.min(size, 8));
  if (hasMachoMagic(head)) return identifyMacho(readAt, size, head, path);
  if (isElf(head))
    return {
      format: "elf",
      slices: [{ index: 0, fileOffset: 0, size, architecture: null }],
    };
  if (await isPe(readAt, size))
    return {
      format: "pe",
      slices: [{ index: 0, fileOffset: 0, size, architecture: null }],
    };
  throw new ElectronFuseFormatFailure(
    "unsupported",
    `Selected artifact ${path} does not contain a Mach-O, ELF, or PE container.`,
  );
};
