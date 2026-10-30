import { createHash } from "node:crypto";
import { isAbsolute } from "node:path";

import { z } from "zod";

import { ArtifactReaderFailure } from "../artifacts/ArtifactReader.js";
import type { ArtifactResourceScope } from "../artifacts/ArtifactResourceScope.js";
import { publishWebScripts } from "../browser/assets/PublishWebScripts.js";
import { selectScriptCapture } from "../browser/assets/ScriptCaptureAdapters.js";
import {
  AnalysisAccessDeniedError,
  AnalysisCancelledError,
  AnalysisInputError,
  AnalysisOutputError,
} from "../domain/analysisErrorCore.js";
import type { AnalysisError } from "../domain/analysisErrorBase.js";
import { createEvidence, type Evidence } from "../domain/evidence.js";
import { analysisErrorWithCleanupFailure } from "../domain/analysisErrorCleanup.js";
import { analysisInputErrorFromIssues } from "../domain/inputIssueProjection.js";
import { jsonValueSchema } from "../domain/jsonValue.js";
import { ProviderAdapterError } from "../domain/providerAdapterError.js";
import { ProviderCleanupError } from "../domain/providerCleanupError.js";
import { err, ok, type Result } from "../domain/result.js";
import { safeParseJson } from "../domain/safeJson.js";
import {
  exportWebScriptsInputSchema,
  type ExportWebScriptsInput,
} from "../domain/webScriptExport.js";
import { WebScriptExportError } from "../domain/webScriptExportError.js";
import type { ExecutionOptions } from "./AnalysisProvider.js";
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

const OPERATION = "export_web_scripts";

interface CaptureRead {
  readonly bytes: Buffer;
  readonly cleanup?: {
    readonly reason: string;
    readonly incomplete: boolean;
    readonly cause: unknown;
  };
}

interface PreparedCapture {
  readonly bytes: Buffer;
  readonly loaded: ReturnType<typeof selectScriptCapture>;
}

/** Export one local capture through the shared CLI/MCP application workflow. */
export const exportWebScripts = async (
  rawInput: unknown,
  resources: ArtifactResourceScope,
  options: ExecutionOptions = {},
): Promise<Result<Evidence, AnalysisError>> => {
  const input = exportWebScriptsInputSchema.safeParse(rawInput);
  return input.success
    ? exportWebScriptsValidated(input.data, resources, options)
    : err(
        analysisInputErrorFromIssues(OPERATION, input.error.issues, rawInput),
      );
};

/** Publish input already parsed by a named adapter contract. */
export const exportWebScriptsValidated = async (
  input: ExportWebScriptsInput,
  resources: ArtifactResourceScope,
  options: ExecutionOptions = {},
): Promise<Result<Evidence, AnalysisError>> => {
  if (!isAbsolute(input.capture_path) || !isAbsolute(input.output_directory))
    return err(
      new AnalysisInputError(OPERATION, undefined, [
        {
          path: [],
          reason: "invalid_format",
          message:
            "capture_path and output_directory must be absolute filesystem paths on this host.",
        },
      ]),
    );
  try {
    options.signal?.throwIfAborted();
    const prepared = await prepareCapture(
      input.capture_path,
      resources,
      options.signal,
    );
    if (!prepared.ok) return prepared;
    const { bytes, loaded } = prepared.value;
    options.signal?.throwIfAborted();
    const sha256 = createHash("sha256").update(bytes).digest("hex");
    const result = await publishWebScripts(input, loaded, sha256, {
      resources,
      ...(options.signal === undefined ? {} : { signal: options.signal }),
    });
    return ok(
      createEvidence(
        { path: input.capture_path, sha256, format: "file" },
        PROVIDER,
        {
          predicateType: "rea.web-script-export",
          operation: OPERATION,
          parameters: {
            capture_path: input.capture_path,
            output_directory: input.output_directory,
          },
          result: jsonValueSchema.parse(result),
          rawResult: null,
          confidence: "derived",
          authority: "historical-reference",
          limitations: result.limitations,
          locations: [{ kind: "artifact-path", path: result.manifest.path }],
          evidenceLinks:
            loaded.sourceEvidenceId === null ? [] : [loaded.sourceEvidenceId],
        },
      ),
    );
  } catch (cause: unknown) {
    return err(mapExportFailure(cause, input, options.signal));
  }
};

const prepareCapture = async (
  path: string,
  resources: ArtifactResourceScope,
  signal: AbortSignal | undefined,
): Promise<Result<PreparedCapture, AnalysisError>> => {
  const read = await resources.run(() => readCapture(path, resources, signal));
  if (!read.ok) return read;
  const cleanup = read.value.cleanup;
  const loaded = parseCapture(
    read.value.bytes,
    cleanup === undefined || cleanup.incomplete
      ? undefined
      : { cause: cleanup.cause },
  );
  if (!loaded.ok)
    return err(
      cleanup?.incomplete === true
        ? incompleteCaptureCleanup(loaded.error, path, cleanup)
        : loaded.error,
    );
  if (cleanup !== undefined) {
    const primary = new WebScriptExportError(
      "io",
      path,
      `Capture handle close failed: ${cleanup.reason}`,
      { cause: cleanup.cause },
    );
    return err(
      cleanup.incomplete
        ? incompleteCaptureCleanup(primary, path, cleanup)
        : primary,
    );
  }
  return ok({ bytes: read.value.bytes, loaded: loaded.value });
};
