import type { BigIntStats, Dir, Dirent } from "node:fs";
import { opendir, readlink, realpath } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { ArtifactReaderFailure } from "../artifacts/ArtifactReader.js";
import type { ArtifactCleanupAttempt } from "../artifacts/ArtifactResourceScope.js";
import { OwnedDirectoryHandle } from "../filesystem/OwnedDirectoryHandle.js";
import { err, ok } from "../domain/result.js";

import {
  cancelled,
  entryFailure,
  failure,
  filesystemFailureDetail,
  safeSize,
} from "./ReferenceSourceReaderErrors.js";
import { isPathWithinRoot } from "../domain/localPath.js";
import { pathFromRoot } from "./ReferenceSourceReaderPaths.js";
import { readStableFile } from "./ReferenceSourceReaderFile.js";
import {
  isAborted,
  sameFile,
  validateDirectory,
  bigLstat,
} from "./ReferenceSourceReaderValidate.js";
import type {
  PendingDirectory,
  ReferenceSourceEntry,
  ReferenceSourceExclusionKind,
  ReferenceSourceResult,
  TraversalState,
} from "./ReferenceSourceReaderTypes.js";

export const traverseDirectory = async (
  state: TraversalState,
  current: PendingDirectory,
): Promise<ReferenceSourceResult<undefined>> => {
  const before = await validateDirectory(
    state.root,
    state.rootIdentity,
    current.path,
    state.signal,
  );
  if (isAborted(state.signal)) return { ok: false, error: cancelled() };
  if (!before.ok) {
    state.entries.push(
      entryFailure(
        pathFromRoot(state.root, current.path),
        "directory",
        before.code,
        before.message,
      ),
    );
    return { ok: true, value: undefined };
  }
  const directories: PendingDirectory[] = [];
  let readFailure: string | undefined;
  let handle: Dir | undefined;
  try {
    handle = await opendir(current.path);
  } catch (cause: unknown) {
    readFailure = directoryReadFailure(cause);
  }
  if (handle !== undefined) {
    const owner = new OwnedDirectoryHandle(handle);
    let result: ReferenceSourceResult<undefined> = ok(undefined);
    let cleanup: ArtifactCleanupAttempt;
    try {
      for (;;) {
        let child: Dirent | null;
        try {
          child = await handle.read();
        } catch (cause: unknown) {
          readFailure = directoryReadFailure(cause);
          break;
        }
        if (child === null) break;
        result = await processEntry(state, current, child.name, directories);
        if (!result.ok) break;
      }
    } finally {
      cleanup = await state.resources.release({
        kind: "directory-handle",
        handle: owner,
        resource: current.path,
      });
    }
    if (cleanup.kind === "failed") {
      if (result.ok && !isAborted(state.signal) && readFailure !== undefined)
        state.entries.push(
          entryFailure(
            pathFromRoot(state.root, current.path),
            "directory",
            "io",
            readFailure,
          ),
        );
      const observation = ArtifactReaderFailure.cleanupObservation(
        cleanup.cause,
        current.path,
      );
      const previous = result.ok ? undefined : result.error.cleanup;
      const primary = result.ok
        ? isAborted(state.signal)
          ? cancelled()
          : failure(
              "io",
              readFailure ??
                `Reference directory cleanup failed: ${current.path}`,
            )
        : result.error;
      return err({
        ...primary,
        cleanup:
          previous === undefined
            ? observation
            : {
                reason: `${previous.reason}; ${observation.reason}`,
                resources: [
                  ...new Set([...previous.resources, ...observation.resources]),
                ],
              },
        cause: primary.cause ?? cleanup.cause,
      });
    }
    if (!result.ok) return result;
  }
  if (isAborted(state.signal)) return { ok: false, error: cancelled() };
  if (readFailure !== undefined) {
    state.entries.push(
      entryFailure(
        pathFromRoot(state.root, current.path),
        "directory",
        "io",
        readFailure,
      ),
    );
    return { ok: true, value: undefined };
  }
  const after = await validateDirectory(
    state.root,
    state.rootIdentity,
    current.path,
    state.signal,
  );
  if (isAborted(state.signal)) return { ok: false, error: cancelled() };
  if (!after.ok || !sameFile(before.stats, after.stats)) {
    state.entries.push(
      entryFailure(
        pathFromRoot(state.root, current.path),
        "directory",
        "changed",
        "Directory changed while it was read",
      ),
    );
    return { ok: true, value: undefined };
  }
  if (current.path !== state.root)
    state.entries.push({
      status: "read",
      kind: "directory",
      path: pathFromRoot(state.root, current.path),
    });
  directories.reverse();
  state.pending.push(...directories);
  return { ok: true, value: undefined };
};

const directoryReadFailure = (cause: unknown): string => {
  const message = filesystemFailureDetail(cause, "Directory could not be read");
  if (message === undefined) throw cause;
  return message;
};

const readMetadata = async (
  path: string,
): Promise<
  | { readonly ok: true; readonly value: BigIntStats }
  | { readonly ok: false; readonly message: string }
> => {
  try {
    return { ok: true, value: await bigLstat(path) };
  } catch (cause: unknown) {
    const message = filesystemFailureDetail(
      cause,
      "Entry metadata could not be read",
    );
    if (message === undefined) throw cause;
    return { ok: false, message };
  }
};
