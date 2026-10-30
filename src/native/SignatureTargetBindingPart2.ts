import { createHash } from "node:crypto";
import { constants, type BigIntStats } from "node:fs";
import { lstat, open, type FileHandle } from "node:fs/promises";
import type { BinaryTarget } from "../domain/binaryTargetTypes.js";
import { AnalysisError } from "../domain/analysisErrorBase.js";
import {
  AnalysisArtifactChangedError,
  AnalysisCancelledError,
  AnalysisResourceConstraintError,
} from "../domain/analysisErrorCore.js";
import { ProviderAdapterError } from "../domain/providerAdapterError.js";
import { err, ok, type Result } from "../domain/result.js";
import { OwnedFileHandle } from "../filesystem/OwnedFileHandle.js";
import { ArtifactResourceScope } from "../artifacts/ArtifactResourceScope.js";
import { NATIVE_MACOS_PROVIDER_IDENTITY } from "./NativeMacOSProviderMetadata.js";

/** Binding of commands to the selected executable's registered content/version. */

const snapshotFailure = (
  target: BinaryTarget,
  phase: string,
  cause: unknown,
): AnalysisError =>
  new ProviderAdapterError(
    NATIVE_MACOS_PROVIDER_IDENTITY.id,
    "inspect_signature",
    {
      cause,
      diagnostics: {
        path: target.path,
        phase: `signature-snapshot-${phase}`,
        reason: cause instanceof Error ? cause.message : String(cause),
      },
    },
  );

const snapshotIO = async <T>(
  target: BinaryTarget,
  phase: string,
  operation: () => Promise<T>,
): Promise<T> => {
  try {
    return await operation();
  } catch (cause: unknown) {
    throw snapshotFailure(target, phase, cause);
  }
};

const copySignatureBytes = async (
  target: BinaryTarget,
  source: { readonly file: FileHandle; readonly stat: BigIntStats },
  snapshot: FileHandle,
  signal?: AbortSignal,
): Promise<string> => {
  const size = Number(source.stat.size);
  if (!Number.isSafeInteger(size))
    throw new AnalysisResourceConstraintError(
      "inspect_signature",
      "file-size",
      `Signature target size is not exactly representable: ${target.path}`,
      null,
    );
  const hash = createHash("sha256");
  const chunk = Buffer.alloc(64 * 1024);
  let position = 0;
  while (position < size) {
    signal?.throwIfAborted();
    const { bytesRead } = await source.file.read(
      chunk,
      0,
      Math.min(chunk.length, size - position),
      position,
    );
    signal?.throwIfAborted();
    if (bytesRead === 0)
      throw new AnalysisArtifactChangedError(
        "inspect_signature",
        target.path,
        `Signature target was truncated while hashing: ${target.path}`,
      );
    const bytes = chunk.subarray(0, bytesRead);
    hash.update(bytes);
    // writeFile retries short writes; memory remains bounded to this chunk.
    await snapshotIO(target, "write", () => snapshot.writeFile(bytes));
    position += bytesRead;
  }
  return hash.digest("hex");
};

/** Hash and copy the same descriptor bytes, without reopening the mutable path. */
const bindSignatureTarget = async (
  target: BinaryTarget,
  snapshotPath: string,
  resources: ArtifactResourceScope,
  signal?: AbortSignal,
): Promise<Result<SignatureTargetBinding, AnalysisError>> => {
  let sourceOwner: OwnedFileHandle | undefined;
  let snapshotOwner: OwnedFileHandle | undefined;
  const perform = async (): Promise<
    Result<SignatureTargetBinding, AnalysisError>
  > => {
    try {
      signal?.throwIfAborted();
      const before = await lstat(target.path, { bigint: true });
      signal?.throwIfAborted();
      if (!before.isFile() || before.isSymbolicLink())
        return changedTarget(
          target,
          `Signature target is no longer a regular file: ${target.path}`,
        );
      const file = await open(
        target.path,
        constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK,
      );
      sourceOwner = new OwnedFileHandle(file);
      const opened = await file.stat({ bigint: true });
      signal?.throwIfAborted();
      if (identity(opened) !== identity(before))
        return changedTarget(
          target,
          `Signature target changed before open: ${target.path}`,
        );
      const snapshot = await snapshotIO(target, "create-file", () =>
        open(snapshotPath, "wx", 0o600),
      );
      snapshotOwner = new OwnedFileHandle(snapshot);
      const observed = await copySignatureBytes(
        target,
        { file, stat: opened },
        snapshot,
        signal,
      );
      if (observed !== target.sha256)
        return changedTarget(
          target,
          `Signature target digest changed: ${target.path}; expected ${target.sha256}, observed ${observed}`,
        );
      const after = await file.stat({ bigint: true });
      const current = await lstat(target.path, { bigint: true });
      signal?.throwIfAborted();
      if (
        identity(after) !== identity(opened) ||
        identity(current) !== identity(opened)
      )
        return changedTarget(
          target,
          `Signature target changed while establishing its version: ${target.path}`,
        );
      await snapshotIO(target, "seal", () => snapshot.chmod(0o400));
      return ok({ identity: identity(opened), snapshotPath });
    } catch (cause: unknown) {
      return err(
        signal?.aborted
          ? new AnalysisCancelledError("inspect_signature")
          : signatureReadFailure(target, cause),
      );
    }
  };
  let result = await perform();
  const cleanupFailures: {
    readonly path: string;
    readonly cause: unknown;
  }[] = [];
  for (const [owner, path] of [
    [snapshotOwner, snapshotPath],
    [sourceOwner, target.path],
  ] as const) {
    if (owner === undefined) continue;
    const cleanup = await resources.release({
      kind: "file-handle",
      handle: owner,
      resource: path,
    });
    if (cleanup.kind === "failed")
      cleanupFailures.push({ path, cause: cleanup.cause });
  }
  if (cleanupFailures.length > 0) {
    const cause = new AggregateError(
      cleanupFailures.map(({ cause: failure }) => failure),
      "Signature snapshot file handles could not be closed",
    );
    result = combineCleanupFailure(
      target,
      result,
      cleanupFailures.map(({ path }) => path),
      cause,
      "close",
    );
  }
  return result;
};

/** Reject target drift across signature command captures. */
export const verifySignatureTarget = async (
  target: BinaryTarget,
  binding: SignatureTargetBinding,
  signal?: AbortSignal,
): Promise<Result<void, AnalysisError>> => {
  try {
    signal?.throwIfAborted();
    const current = await lstat(target.path, { bigint: true });
    signal?.throwIfAborted();
    return current.isFile() && identity(current) === binding.identity
      ? ok(undefined)
      : changedTarget(
          target,
          `Signature target changed during inspection: ${target.path}`,
        );
  } catch (cause: unknown) {
    return err(
      signal?.aborted
        ? new AnalysisCancelledError("inspect_signature")
        : signatureReadFailure(target, cause),
    );
  }
};
