import { createHash } from "node:crypto";
import { constants as fsConstants } from "node:fs";
import { lstat, open, opendir, readlink } from "node:fs/promises";
import { join, relative } from "node:path";
import type { FileHandle } from "node:fs/promises";
import type { ProcessScenario } from "../../domain/process/processScenario.js";
import type { FilesystemCoverage } from "../../domain/process/processCaptureCoverage.js";
import type { Stats } from "node:fs";
import type {
  FileState,
  ProcessFilesystemSnapshot,
} from "../../domain/process/processCapture.js";

const hasSameIdentity = (
  before: Stats,
  after: Stats,
  expected: "directory" | "symlink",
): boolean =>
  before.dev === after.dev &&
  before.ino === after.ino &&
  (expected === "directory" ? after.isDirectory() : after.isSymbolicLink());

const hasSameFileState = (before: Stats, after: Stats): boolean =>
  before.dev === after.dev &&
  before.ino === after.ino &&
  before.isFile() &&
  after.isFile() &&
  before.mode === after.mode &&
  before.size === after.size &&
  before.mtimeMs === after.mtimeMs &&
  before.ctimeMs === after.ctimeMs;

const fileUnavailableSystemCode = (cause: unknown): string | undefined => {
  if (!(cause instanceof Error) || !("code" in cause)) return undefined;
  const code = cause.code;
  return typeof code === "string" &&
    [
      "EACCES",
      "EISDIR",
      "ELOOP",
      "ENOTDIR",
      "ENOENT",
      "EPERM",
      "ESTALE",
    ].includes(code)
    ? code
    : undefined;
};

const lstatIfPresent = async (
  path: string,
  previouslyObservedRoot = false,
  signal?: AbortSignal,
): Promise<Stats | undefined> => {
  signal?.throwIfAborted();
  try {
    const stats = await lstat(path);
    signal?.throwIfAborted();
    return stats;
  } catch (cause: unknown) {
    if (
      cause instanceof Error &&
      "code" in cause &&
      (cause.code === "ENOENT" ||
        (previouslyObservedRoot && cause.code === "ENOTDIR"))
    ) {
      signal?.throwIfAborted();
      return undefined;
    }
    throw cause;
  }
};

/** Reports a complete digest or an explicit per-file reason hashing was omitted. */
export type FileHashOutcome =
  | { readonly state: "hashed"; readonly sha256: string }
  | {
      readonly state: "omitted";
      readonly reason: "file_changed_or_short_read" | "file_unavailable";
      readonly system_code: string | null;
    };

/** Hash a file only when its opened descriptor still matches the captured path state. */
export const hashFile = async (
  path: string,
  expected: Stats,
  maxBytes: number,
  signal?: AbortSignal,
): Promise<FileHashOutcome> => {
  signal?.throwIfAborted();
  const noFollowAvailable =
    typeof fsConstants.O_NOFOLLOW === "number" && fsConstants.O_NOFOLLOW !== 0;
  let handle: FileHandle;
  try {
    handle = await open(
      path,
      fsConstants.O_RDONLY |
        (noFollowAvailable ? fsConstants.O_NOFOLLOW : 0) |
        (fsConstants.O_NONBLOCK ?? 0),
    );
  } catch (cause: unknown) {
    signal?.throwIfAborted();
    const systemCode = fileUnavailableSystemCode(cause);
    if (systemCode === undefined) throw cause;
    return {
      state: "omitted",
      reason: "file_unavailable",
      system_code: systemCode,
    };
  }
  try {
    signal?.throwIfAborted();
    // On hosts without O_NOFOLLOW, compare the leaf's identity with the
    // captured regular file. Ancestor aliases do not change file identity.
    if (!noFollowAvailable) {
      const named = await lstat(path);
      signal?.throwIfAborted();
      if (!hasSameFileState(expected, named))
        return {
          state: "omitted",
          reason: "file_changed_or_short_read",
          system_code: null,
        };
    }
    const stats = await handle.stat();
    signal?.throwIfAborted();
    if (!hasSameFileState(expected, stats) || stats.size > maxBytes)
      return {
        state: "omitted",
        reason: "file_changed_or_short_read",
        system_code: null,
      };
    const hash = createHash("sha256");
    const buffer = Buffer.allocUnsafe(Math.min(64 * 1024, maxBytes));
    let position = 0;
    while (position < stats.size) {
      signal?.throwIfAborted();
      const { bytesRead } = await handle.read(
        buffer,
        0,
        Math.min(buffer.length, stats.size - position),
        position,
      );
      if (bytesRead === 0)
        return {
          state: "omitted",
          reason: "file_changed_or_short_read",
          system_code: null,
        };
      hash.update(buffer.subarray(0, bytesRead));
      position += bytesRead;
    }
    const after = await handle.stat();
    signal?.throwIfAborted();
    let unchanged = hasSameFileState(stats, after);
    if (unchanged && !noFollowAvailable) {
      const namedAfter = await lstat(path);
      signal?.throwIfAborted();
      unchanged = hasSameFileState(after, namedAfter);
    }
    if (!unchanged)
      return {
        state: "omitted",
        reason: "file_changed_or_short_read",
        system_code: null,
      };
    return { state: "hashed", sha256: hash.digest("hex") };
  } catch (cause: unknown) {
    signal?.throwIfAborted();
    const systemCode = fileUnavailableSystemCode(cause);
    if (systemCode === undefined) throw cause;
    return {
      state: "omitted",
      reason: "file_unavailable",
      system_code: systemCode,
    };
  } finally {
    await handle.close();
  }
};

/** Capture bounded, root-aliased filesystem state without following symlinks. */
