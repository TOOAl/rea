import { z } from "zod";

import { ArtifactReaderFailure } from "../artifacts/ArtifactReader.js";
import type { ArtifactResourceScope } from "../artifacts/ArtifactResourceScope.js";
import { selectScriptCapture } from "../browser/assets/ScriptCaptureAdapters.js";
import {
  AnalysisAccessDeniedError,
  AnalysisCancelledError,
  AnalysisInputError,
  AnalysisOutputError,
} from "../domain/analysisErrorCore.js";
import type { AnalysisError } from "../domain/analysisErrorBase.js";
import { analysisErrorWithCleanupFailure } from "../domain/analysisErrorCleanup.js";
import { ProviderAdapterError } from "../domain/providerAdapterError.js";
import { ProviderCleanupError } from "../domain/providerCleanupError.js";
import { err, ok, type Result } from "../domain/result.js";
import { safeParseJson } from "../domain/safeJson.js";
import type { ExportWebScriptsInput } from "../domain/webScriptExport.js";
import { WebScriptExportError } from "../domain/webScriptExportError.js";
import { WEB_SCRIPT_EXPORT_PROVIDER as PROVIDER } from "./InvestigationProviders.js";
import {
  readRegularFile,
  RegularFileCleanupFailure,
  retryRegularFileCleanup,
} from "./RegularFileRead.js";
import {
  NonRegularFileReadError,
  RegularFileChangedError,
} from "../filesystem/RegularFile.js";

const mapExportFailure = (
  cause: unknown,
  input: ExportWebScriptsInput,
  signal: AbortSignal | undefined,
): AnalysisError => {
  if (cause instanceof WebScriptExportError) return cause;
  if (cause instanceof ArtifactReaderFailure && cause.cleanup !== undefined)
    return analysisErrorWithCleanupFailure(
      new WebScriptExportError(
        cause.reason,
        input.output_directory,
        cause.message,
        { cause },
      ),
      new ProviderCleanupError(
        PROVIDER.id,
        cause.cleanup.resources,
        { reason: cause.cleanup.reason },
        { cause, operation: OPERATION },
      ),
      OPERATION,
    );
  if (signal?.aborted === true)
    return new AnalysisCancelledError(OPERATION, { cause });
  if (cause instanceof ArtifactReaderFailure)
    return new WebScriptExportError(
      cause.reason,
      input.output_directory,
      cause.message,
      { cause },
    );
  if (cause instanceof z.ZodError)
    return new AnalysisOutputError(OPERATION, cause.message, { cause });
  if (
    cause instanceof Error &&
    "code" in cause &&
    typeof cause.code === "string"
  )
    return new WebScriptExportError(
      "io",
      `${input.capture_path} → ${input.output_directory}`,
      cause.message,
      { cause },
    );
  return new ProviderAdapterError(PROVIDER.id, OPERATION, {
    cause,
    diagnostics: {
      capture_path: input.capture_path,
      output_directory: input.output_directory,
      error_name: cause instanceof Error ? cause.name : "UnknownError",
      error_message:
        cause instanceof Error
          ? cause.message
          : typeof cause === "string"
            ? cause
            : "Unknown script export failure",
    },
  });
};

/**
 * Read the caller-selected capture. A missing, non-file or unreadable
 * selection is a caller or host-permission failure, not an export failure.
 */
const readCapture = async (
  path: string,
  resources: ArtifactResourceScope,
  signal: AbortSignal | undefined,
): Promise<Result<CaptureRead, AnalysisError>> => {
  try {
    return ok({ bytes: await readRegularFile(path, { signal }) });
  } catch (cause: unknown) {
    if (cause instanceof RegularFileCleanupFailure) {
      const retry = await retryRegularFileCleanup(cause, resources);
      const cleanup = {
        reason: retry.cleanup?.reason ?? errorMessage(cause.cleanupCause),
        incomplete: retry.cleanup !== undefined,
        cause: cause.cleanupCause,
      };
      if (cause.outcome.kind === "completed")
        return ok({ bytes: cause.outcome.value as Buffer, cleanup });
      const primary = captureReadFailure(
        path,
        cause.outcome.cause,
        signal,
        retry.cleanup === undefined ? { cause: cause.cleanupCause } : undefined,
      );
      return err(
        retry.cleanup === undefined
          ? primary
          : incompleteCaptureCleanup(primary, path, cleanup),
      );
    }
    return err(captureReadFailure(path, cause, signal));
  }
};

const captureReadFailure = (
  path: string,
  cause: unknown,
  signal: AbortSignal | undefined,
  closeFailure?: { readonly cause: unknown },
): AnalysisError => {
  const causeWithClose =
    closeFailure === undefined
      ? cause
      : new AggregateError(
          [cause, closeFailure.cause],
          "Capture read and file-handle close both failed",
          { cause },
        );
  if (signal?.aborted === true)
    return new AnalysisCancelledError(OPERATION, { cause: causeWithClose });
  const code =
    cause instanceof Error && "code" in cause ? String(cause.code) : "";
  if (code === "EACCES" || code === "EPERM")
    return new AnalysisAccessDeniedError(OPERATION, path, code, {
      cause: causeWithClose,
    });
  if (
    cause instanceof NonRegularFileReadError ||
    cause instanceof RegularFileChangedError ||
    code === "ENOENT" ||
    code === "ENOTDIR" ||
    code === "EISDIR" ||
    code === "ENXIO"
  )
    return new AnalysisInputError(OPERATION, { cause: causeWithClose }, [
      {
        path: ["capture_path"],
        reason: "invalid_value",
        message:
          cause instanceof NonRegularFileReadError && code !== "EISDIR"
            ? cause.message
            : code === "EISDIR"
              ? `Selected capture is a directory, not a file: ${path}`
              : `Selected capture could not be read (${code}): ${path}`,
      },
    ]);
  if (code !== "")
    return new WebScriptExportError("io", path, errorMessage(cause), {
      cause: causeWithClose,
    });
  return new ProviderAdapterError(PROVIDER.id, OPERATION, {
    cause: causeWithClose,
    diagnostics: {
      capture_path: path,
      error_name: cause instanceof Error ? cause.name : "UnknownError",
      error_message: cause instanceof Error ? cause.message : String(cause),
    },
  });
};

const incompleteCaptureCleanup = (
  primary: AnalysisError,
  path: string,
  cleanup: NonNullable<CaptureRead["cleanup"]>,
): AnalysisError =>
  analysisErrorWithCleanupFailure(
    primary,
    new ProviderCleanupError(
      PROVIDER.id,
      [path],
      { reason: cleanup.reason },
      { cause: cleanup.cause, operation: OPERATION },
    ),
    OPERATION,
  );

const errorMessage = (cause: unknown): string =>
  cause instanceof Error ? cause.message : String(cause);

const parseCapture = (
  bytes: Buffer,
  closeFailure?: { readonly cause: unknown },
): Result<ReturnType<typeof selectScriptCapture>, AnalysisError> => {
  try {
    const text = new TextDecoder("utf-8", {
      fatal: true,
      ignoreBOM: true,
    }).decode(bytes);
    const json = safeParseJson(text);
    if (!json.ok) throw new TypeError(json.error);
    return ok(selectScriptCapture(json.value));
  } catch (cause: unknown) {
    const causeWithClose =
      closeFailure === undefined
        ? cause
        : new AggregateError(
            [cause, closeFailure.cause],
            "Capture parse and file-handle close both failed",
            { cause },
          );
    return err(
      new AnalysisInputError(OPERATION, { cause: causeWithClose }, [
        {
          path: ["capture_path"],
          reason: "invalid_format",
          message:
            cause instanceof Error
              ? cause.message
              : "Capture is not valid UTF-8 JSON evidence.",
        },
      ]),
    );
  }
};
