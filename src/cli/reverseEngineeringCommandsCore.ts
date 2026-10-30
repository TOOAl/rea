import { z } from "incur";
import type { Logger } from "pino";

import { createReverseEngineeringService } from "../composition/reverseEngineering.js";
import { AnalysisError } from "../domain/analysisErrorBase.js";
import {
  AnalysisInputError,
  AnalysisOutputError,
} from "../domain/analysisErrorCore.js";
import { evidenceSchema, type Evidence } from "../domain/evidence.js";
import type { Result } from "../domain/result.js";
import { err } from "../domain/result.js";
import { projectAnalysisError } from "../domain/analysisErrorProjection.js";
import { logCliCommand } from "../cliLogging.js";
import type { CliInstance } from "./types.js";
import { withCommandCancellation } from "./commandCancellation.js";
import { CLI_COMMANDS } from "../cliCommandNames.js";
import type { ReverseEngineeringService } from "../application/reverse/ReverseEngineeringService.js";
import {
  GdbSessionManager,
  gdbOneShotCommandMayInvalidateDetachProof,
} from "../gdb/GdbSessionManager.js";
import { RizinDebugSessionManager } from "../rizin/RizinDebugSessionManager.js";

const executeWithCleanup = async (
  service: ReverseEngineeringService,
  execute: () => Promise<Result<Evidence, AnalysisError>>,
): Promise<Result<Evidence, AnalysisError>> => {
  let result: Result<Evidence, AnalysisError>;
  try {
    result = await execute();
  } catch (cause) {
    await service.close().catch(() => undefined);
    throw cause;
  }
  const hadIncompleteCleanup = !result.ok && result.error.cleanupIncomplete;
  try {
    await service.close();
  } catch (cause) {
    if (result.ok) return err(asCleanupError(cause));
    const cleanup = cause instanceof AnalysisError ? cause.cleanup : undefined;
    const error = new AnalysisOutputError(
      "reverse_engineering_cleanup",
      "Provider cleanup remains incomplete after the command failed.",
      {
        cause: result.error,
        ...(cleanup === undefined ? {} : { cleanup }),
        ...(result.error.capturedOutput === undefined
          ? {}
          : { capturedOutput: result.error.capturedOutput }),
        ...(result.error.partialObservation === undefined
          ? {}
          : { partialObservation: result.error.partialObservation }),
      },
    );
    return err(error);
  }
  if (!result.ok && hadIncompleteCleanup && !result.error.cleanupIncomplete) {
    const evidence = cleanupOnlyCompleteEvidence(result.error);
    if (evidence !== undefined) return { ok: true, value: evidence };
  }
  return result;
};

const cleanupOnlyCompleteEvidence = (
  error: AnalysisError,
): Evidence | undefined => {
  if (
    !(error instanceof AnalysisOutputError) ||
    !error.cleanupOnly ||
    error.partialObservation === undefined
  )
    return undefined;
  const parsed = evidenceSchema.safeParse(error.partialObservation);
  if (!parsed.success) return undefined;
  const normalized = parsed.data.normalized_result;
  return typeof normalized === "object" &&
    normalized !== null &&
    !Array.isArray(normalized) &&
    normalized.completion_status === "complete"
    ? parsed.data
    : undefined;
};

const asCleanupError = (cause: unknown): AnalysisError =>
  cause instanceof AnalysisError
    ? cause
    : new AnalysisOutputError(
        "reverse_engineering_cleanup",
        "Provider process cleanup failed.",
        { cause },
      );

/** Add one-shot reverse-engineering commands using the shared service layer. */
