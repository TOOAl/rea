import { z } from "incur";

import type { ReferenceSourcePolicy } from "../domain/referenceSourcePolicy.js";
import { createHistoricalSourceSummary } from "../domain/referenceSourceSummary.js";
import { ArtifactReaderFailure } from "../artifacts/ArtifactReader.js";
import { ArtifactResourceScope } from "../artifacts/ArtifactResourceScope.js";
import { importReferenceSource } from "../application/ReferenceSourceImport.js";
import { projectReferenceSourceImportError } from "../application/ReferenceSourceImportTypes.js";
import type { AnalysisCleanupObservation } from "../domain/analysisErrorBase.js";
import { parseConfig } from "../config/parseConfig.js";
import { projectAnalysisError } from "../domain/analysisErrorProjection.js";
import { AnalysisInputError } from "../domain/analysisErrorCore.js";
import { safeParseJson } from "../domain/safeJson.js";
import { PRODUCT_IDENTITY } from "../identity.js";
import { logCliCommand } from "../cliLogging.js";
import { CLI_COMMANDS } from "../cliCommandNames.js";
import type { Logger } from "pino";
import { isReferenceSourceImportCliFailure } from "./referenceSourceImportStatus.js";
import type { CliInstance } from "./types.js";

const registerReferenceSourceCommand = (
  cli: CliInstance,
  logger: Logger,
  environment: Readonly<Record<string, string | undefined>>,
): void => {
  cli.command(CLI_COMMANDS.importReferenceSource, {
    description: "Import a source tree as historical reference only",
    args: z.object({
      root: z
        .string()
        .describe("Local source directory to import as historical reference"),
    }),
    options: z.object({
      detail: z
        .enum(["full", "summary"])
        .default("full")
        .describe(
          "Complete committed graph or compact historical-source summary",
        ),
      outlineDepth: z
        .number()
        .int()
        .safe()
        // After .safe(): its safe-range check overwrites an earlier minimum,
        // which advertised negative depths the parser rejects.
        .nonnegative()
        .optional()
        .describe(
          "Summary outline path depth (default: 2; 0 omits entries); requires --detail summary",
        ),
    }),
    run: ({ args, options }) =>
      logCliCommand(
        logger,
        "import-reference-source",
        async () => {
          if (
            options.outlineDepth !== undefined &&
            options.detail !== "summary"
          )
            return {
              error: "Import failed",
              ...projectAnalysisError(
                new AnalysisInputError(
                  "import-reference-source",
                  { userMessage: "--outline-depth requires --detail summary" },
                  [
                    {
                      path: ["outlineDepth"],
                      reason: "invalid_value",
                      message: "--outline-depth requires --detail summary",
                    },
                  ],
                ),
              ),
            };
          const config = parseConfig(environment);
          if (!config.ok)
            return {
              error: "Import failed",
              ...projectAnalysisError(config.error),
            };
          return runReferenceSourceImport(
            args.root,
            config.value.referenceSourcePolicy,
            options.detail === "summary"
              ? (options.outlineDepth ?? 2)
              : undefined,
          );
        },
        isReferenceSourceImportCliFailure,
      ),
  });
};

const runReferenceSourceImport = async (
  root: string,
  policy: ReferenceSourcePolicy,
  outlineDepth: number | undefined,
): Promise<unknown> => {
  const resources = new ArtifactResourceScope();
  let outcome:
    | {
        readonly kind: "result";
        readonly imported: Awaited<ReturnType<typeof importReferenceSource>>;
      }
    | { readonly kind: "thrown"; readonly cause: unknown };
  try {
    outcome = {
      kind: "result",
      imported: await importReferenceSource(
        {
          root,
          caller: "rea-cli",
          policy,
          importer: PRODUCT_IDENTITY.packageName,
          importerVersion: PRODUCT_IDENTITY.packageVersion,
        },
        resources,
      ),
    };
  } catch (cause: unknown) {
    outcome = { kind: "thrown", cause };
  }

  let closeOutcome:
    | { readonly kind: "closed" }
    | { readonly kind: "failed"; readonly cause: unknown };
  try {
    await resources.close();
    closeOutcome = { kind: "closed" };
  } catch (cause: unknown) {
    closeOutcome = { kind: "failed", cause };
  }

  if (outcome.kind === "thrown") {
    if (closeOutcome.kind === "failed")
      throw new AggregateError(
        [outcome.cause, closeOutcome.cause],
        "Reference source import and cleanup both failed",
        { cause: outcome.cause },
      );
    throw outcome.cause;
  }

  const imported = outcome.imported;
  if (!imported.ok) {
    const cleanup =
      closeOutcome.kind === "closed"
        ? imported.error.cleanup
        : mergeReferenceSourceCleanup(
            imported.error.cleanup,
            ArtifactReaderFailure.cleanupObservation(
              closeOutcome.cause,
              "reference source",
            ),
          );
    return {
      error: "Import failed",
      ...projectReferenceSourceImportError({
        ...imported.error,
        ...(cleanup === undefined ? {} : { cleanup }),
      }),
    };
  }

  if (closeOutcome.kind === "failed")
    return {
      error: "Import failed",
      ...projectReferenceSourceImportError({
        tag: "reference-source-import",
        code: "io",
        message: "Reference source cleanup failed after import",
        cleanup: ArtifactReaderFailure.cleanupObservation(
          closeOutcome.cause,
          "reference source",
        ),
        cause: closeOutcome.cause,
      }),
    };
  return outlineDepth === undefined
    ? imported.value
    : createHistoricalSourceSummary(imported.value, outlineDepth);
};

const mergeReferenceSourceCleanup = (
  first: AnalysisCleanupObservation | undefined,
  second: AnalysisCleanupObservation,
): AnalysisCleanupObservation =>
  first === undefined
    ? second
    : {
        reason: `${first.reason}; ${second.reason}`,
        resources: [...new Set([...first.resources, ...second.resources])],
      };
