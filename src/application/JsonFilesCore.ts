import { dirname, resolve } from "node:path";

import { EvidenceFileError } from "../domain/evidenceErrors.js";
import {
  AnalysisCancelledError,
  AnalysisResourceConstraintError,
} from "../domain/analysisErrorCore.js";
import { err, ok, type Result } from "../domain/result.js";
import {
  readJsonInputFile,
  readJsonObjectFile,
  type JsonObjectMemberReader,
} from "./JsonInputFile.js";
import { NonRegularFileReadError } from "../filesystem/RegularFile.js";
import { RegularFileCleanupFailure } from "./RegularFileRead.js";
import type { ArtifactResourceScope } from "../artifacts/ArtifactResourceScope.js";
import { ArtifactReaderFailure } from "../artifacts/ArtifactReader.js";

/** Request control and its owning operation for an interruptible atomic write. */

export interface TextWriteCancellation {
  readonly signal: AbortSignal;
  readonly operation: string;
}

type TextWriteResult<Failure = EvidenceFileError | AnalysisCancelledError> =
  Result<{ readonly path: string; readonly bytes: number }, Failure>;

/** Read JSON data from a regular file at the caller-supplied path. */
export const readJsonFile = async (
  path: string,
  signal?: AbortSignal,
  resources?: ArtifactResourceScope,
): Promise<
  Result<unknown, EvidenceFileError | AnalysisResourceConstraintError>
> =>
  readJsonFileInput(
    path,
    (selected) =>
      readJsonInputFile(selected, "read_evidence_file", signal, resources),
    signal,
  );

/** Read selected JSON members through the same regular-file error boundary. */
export const readJsonObjectMembersFile = (
  path: string,
  scans: readonly ReadonlyMap<string, JsonObjectMemberReader>[],
  signal?: AbortSignal,
  resources?: ArtifactResourceScope,
): Promise<
  Result<
    void,
    EvidenceFileError | AnalysisResourceConstraintError | AnalysisCancelledError
  >
> =>
  readJsonFileInput(
    path,
    (selected) =>
      readJsonObjectFile(
        selected,
        "read_evidence_file",
        scans,
        signal,
        resources,
      ),
    signal,
  );

const readJsonFileInput = async <Value>(
  path: string,
  read: (
    selected: string,
  ) => Promise<
    Result<
      Value,
      | import("../domain/analysisErrorCore.js").AnalysisInputError
      | AnalysisResourceConstraintError
    >
  >,
  signal?: AbortSignal,
): Promise<
  Result<Value, EvidenceFileError | AnalysisResourceConstraintError>
> => {
  const requestedPath = resolve(path);
  try {
    const decoded = await read(requestedPath);
    if (!decoded.ok) {
      if (decoded.error instanceof AnalysisResourceConstraintError)
        return err(decoded.error);
      return err(
        new EvidenceFileError("read", "invalid-json", {
          cause:
            decoded.error.cause ??
            new SyntaxError(
              decoded.error.issues[0]?.message ?? decoded.error.message,
            ),
          path: requestedPath,
        }),
      );
    }
    return ok(decoded.value);
  } catch (cause: unknown) {
    if (cause instanceof RegularFileCleanupFailure) throw cause;
    if (cause instanceof AnalysisResourceConstraintError) return err(cause);
    if (signal?.aborted === true) throw cause;
    return err(
      new EvidenceFileError(
        "read",
        cause instanceof NonRegularFileReadError
          ? "not-file"
          : missingOrIo(cause),
        {
          cause,
          path: requestedPath,
        },
      ),
    );
  }
};

/** Atomically write text to the caller-supplied path. */
export const writeTextFile = async (
  encoded: string,
  path: string,
  overwrite: boolean,
  resources: ArtifactResourceScope,
): Promise<TextWriteResult<EvidenceFileError>> =>
  writeTextParts([encoded], path, overwrite, resources);

/** Publish streamed text atomically unless cancellation wins before publication. */
export function writeTextParts(
  parts: Iterable<string>,
  path: string,
  overwrite: boolean,
  resources: ArtifactResourceScope,
): Promise<TextWriteResult<EvidenceFileError>>;
export function writeTextParts(
  parts: Iterable<string>,
  path: string,
  overwrite: boolean,
  resources: ArtifactResourceScope,
  cancellation: TextWriteCancellation | undefined,
): Promise<TextWriteResult>;
export function writeTextParts(
  parts: Iterable<string>,
  path: string,
  overwrite: boolean,
  resources: ArtifactResourceScope,
  cancellation?: TextWriteCancellation,
): Promise<TextWriteResult> {
  return resources
    .run(() =>
      writeTextPartsOwned(parts, path, overwrite, resources, cancellation),
    )
    .catch((cause: unknown) => {
      const cleanup =
        cause instanceof ArtifactReaderFailure && cause.cleanup !== undefined
          ? cause.cleanup
          : undefined;
      return err(
        new EvidenceFileError("write", "io", {
          cause,
          path: resolve(path),
          ...(cleanup === undefined ? {} : { cleanup }),
        }),
      );
    });
}
