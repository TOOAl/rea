import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { join } from "node:path";
import type { z } from "zod";
import { SafeOutputTree } from "../artifacts/SafeOutputTree.js";
import { SafeOutputTreeCreationFailure } from "../artifacts/SafeOutputTreeCreationFailure.js";
import { AnalysisOutputError } from "../domain/analysisErrorCore.js";
import { ProviderCleanupError } from "../domain/providerCleanupError.js";
import { jsonValueSchema } from "../domain/jsonValue.js";
import { firmwareResultSchemas } from "../domain/firmware/firmwareAnalysis.js";
import { hashFirmwareFile, type FirmwareEntry } from "./FirmwareFiles.js";
import type { normalizeUnblobReport } from "./FirmwareReports.js";
import type { extractionGap } from "../domain/firmware/firmwareAnalysis.js";

type ExtractionGap = z.infer<typeof extractionGap>;

/** Static, truthful continuations that use already configured capabilities. */
const GAP_CONTINUATIONS: Record<ExtractionGap["kind"], string> = {
  "missing-extractor-dependency":
    "REA installs nothing. Add the named dependency to your own environment and rerun extract_firmware on the same immutable input with a fresh output_directory to re-evaluate the affected region; otherwise it stays unextracted.",
  "unknown-chunk-handler":
    "If Binwalk is configured with REA_BINWALK_COMMAND, run inspect_firmware_regions on the same input for signature hypotheses. Without configured Binwalk that inspection is unavailable. Alternatively, select a materially narrower range with extract_firmware and a fresh output_directory; the region is not decoded content.",
  "encrypted-chunk":
    "No static extraction continues past encryption; treat the region as unexamined rather than empty or corrupt.",
  "extractor-failure":
    "The producer retained this chunk's extraction problem in diagnostics. Review the reported failure, then rerun extract_firmware on the same immutable input with a fresh output_directory; the region is not decoded content.",
  "depth-limited":
    "Rerun extract_firmware with a higher max_depth (up to 10) and a fresh output_directory to descend into this path.",
  "unpublished-entry":
    "The entry is retained as metadata; only regular files are published, without executable permission bits.",
};

const UNNAMED_DEPENDENCY_CONTINUATION =
  "The producer reported a missing extractor dependency without naming it; its identity is unavailable in this evidence. No specific installation or rerun can be prescribed from this report. Retain the gap as unextracted unless additional provider evidence establishes the dependency. REA installs nothing.";

import { FIRMWARE_LIMITS } from "./FirmwareRelease.js";

/** The depth ceiling cannot be raised past the input schema maximum. */
const MAX_EXTRACTION_DEPTH = 10;

const depthContinuation = (
  maxDepth: number,
  publishedChildPaths: readonly string[],
): string =>
  maxDepth < MAX_EXTRACTION_DEPTH
    ? GAP_CONTINUATIONS["depth-limited"]
    : publishedChildPaths.length > 0
      ? `This extraction already ran at the lane's maximum depth. To continue, rerun extract_firmware with path set to any eligible published child below this path and a fresh output directory; each child listed here restarts the depth budget: ${publishedChildPaths.map((path) => JSON.stringify(path)).join(", ")}.`
      : `This extraction already ran at the lane's maximum depth, and no published child under this path is both nonempty and within the ${FIRMWARE_LIMITS.inputBytes}-byte firmware input limit, so the depth budget cannot be restarted from this output. Treat the region below this path as unexamined.`;

// Use a different analyzer on the actual published child; repeating the same
// whole-child extraction with unchanged handlers would reproduce this gap.
const nestedUnknownContinuation = (
  publishedFile: { readonly path: string; readonly size: number } | undefined,
): string => {
  const base =
    "This unknown chunk was carved from a nested extraction, so its range is relative to the published child named by this gap's input_path, not to the original input.";
  return publishedFile !== undefined &&
    publishedFile.size > 0 &&
    publishedFile.size <= FIRMWARE_LIMITS.inputBytes
    ? `${base} Run inspect_firmware_regions with path set to that published child for signature hypotheses only if Binwalk is configured with REA_BINWALK_COMMAND. This inspection step is unavailable without configured Binwalk; retain the region as unexamined. Repeating the same whole-child extraction with unchanged handlers would not advance analysis.`
    : `${base} That published child is not a nonempty file within the ${FIRMWARE_LIMITS.inputBytes}-byte firmware input limit, so inspect_firmware_regions cannot accept it as a fresh input; treat the region as unexamined.`;
};

const emptyGap = {
  relative_path: null,
  handler: null,
  provider_id: null,
  range: null,
  root_file_range: null,
  dependencies: [],
};

const gapSortKey = (gap: ExtractionGap): string =>
  [
    gap.input_path,
    gap.kind,
    gap.provider_id ?? "",
    gap.relative_path ?? "",
  ].join("\u0000");

/** Publish verified regular files, preserving links as metadata and rolling back failed writes. */
export const publishFirmwareExtraction = async (context: {
  outputDirectory: string;
  entries: readonly FirmwareEntry[];
  normalized: ReturnType<typeof normalizeUnblobReport>;
  selection: { offset: number; length: number; sha256: string };
  /** Caller-selected extraction depth, for boundary-aware continuations. */
  maxDepth: number;
  engine: z.infer<typeof firmwareResultSchemas.extract_firmware>["engine"];
  signal: AbortSignal;
  retainCleanup: (tree: SafeOutputTree) => void;
}) => {
  let tree: SafeOutputTree | undefined;
  let result:
    | z.infer<typeof firmwareResultSchemas.extract_firmware>
    | undefined;
  try {
    const materialized = new Set(
      context.entries
        .filter((entry) => entry.kind === "file")
        .map((entry) => `$output/${entry.relativePath}`),
    );
    for (const path of context.normalized.files.keys()) {
      if (path !== "$input" && !materialized.has(path))
        throw new AnalysisOutputError(
          "extract_firmware",
          `Reported regular file is absent from materialized output: ${path}`,
        );
    }
    const files = [];
    const unpublished = [];
    tree = await SafeOutputTree.create(context.outputDirectory);
    for (const entry of context.entries) {
      if (entry.kind !== "file") {
        unpublished.push({
          relative_path: entry.relativePath,
          kind: entry.kind,
          link_target: entry.linkTarget,
        });
        continue;
      }
      const logicalPath = `$output/${entry.relativePath}`;
      const reported = context.normalized.files.get(logicalPath);
      const sha256 = await hashFirmwareFile(entry.path, context.signal);
      if (
        (reported?.sha256 !== null &&
          reported?.sha256 !== undefined &&
          reported.sha256 !== sha256) ||
        (context.normalized.sizes.has(logicalPath) &&
          context.normalized.sizes.get(logicalPath) !== entry.size)
      )
        throw new AnalysisOutputError(
          "extract_firmware",
          `Extracted bytes disagree with provider report: ${entry.relativePath}`,
        );
      await tree.write(
        entry.relativePath,
        createReadStream(entry.path),
        { sha256, bytes: entry.size },
        context.signal,
      );
      files.push({
        relative_path: entry.relativePath,
        path: join(tree.outputRoot, entry.relativePath),
        size: entry.size,
        sha256,
        reported_sha256: reported?.sha256 ?? null,
        mime_type: reported?.mimeType ?? null,
        analysis_depth: reported?.depth ?? null,
        runtime_address: null,
        original_file_range: null,
      });
    }
    result = firmwareResultSchemas.extract_firmware.parse({
      engine: context.engine,
      selection: context.selection,
      output_directory: tree.outputRoot,
      coverage:
        unpublished.length > 0 ? "partial" : context.normalized.coverage,
      files,
      unpublished_entries: unpublished,
      chunks: context.normalized.chunks,
      derivations: context.normalized.derivations,
      depth_limited_paths: context.normalized.depth_limited_paths,
      diagnostics: context.normalized.diagnostics,
      ...extractionGaps(
        unpublished,
        files,
        context.normalized,
        context.maxDepth,
      ),
      published_bytes: files.reduce((sum, file) => sum + file.size, 0),
    });
    context.signal.throwIfAborted();
    await tree.commit(context.signal);
    return result;
  } catch (cause: unknown) {
    if (cause instanceof SafeOutputTreeCreationFailure) tree = cause.tree;
    try {
      await tree?.rollback();
    } catch (cleanupCause: unknown) {
      if (tree !== undefined) context.retainCleanup(tree);
      const publishedResult =
        tree?.published === true && result !== undefined
          ? {
              kind: "firmware" as const,
              result: jsonValueSchema.parse(result),
            }
          : undefined;
      throw new ProviderCleanupError(
        "unblob",
        [context.outputDirectory],
        {
          reason:
            cleanupCause instanceof Error
              ? cleanupCause.message
              : String(cleanupCause),
          previous_error:
            cause instanceof Error ? cause.message : String(cause),
        },
        {
          cause: cleanupCause,
          operation: "extract_firmware",
          ...(publishedResult === undefined
            ? {}
            : { partialObservation: publishedResult }),
        },
      );
    }
    if (tree?.published === true && result !== undefined) return result;
    throw cause;
  }
};

/** Derive explicit recovery rows from retained report facts; no new claims. */
/** Gap rows for missing-dependency reports: chunk-nested rows keep their owning chunk. */
const dependencyExtractionGaps = (
  normalized: ReturnType<typeof normalizeUnblobReport>,
  continuation: (instruction: string) => string,
): ExtractionGap[] => {
  // Chunk-nested dependency reports name the chunk that could not extract;
  // task-wide reports (standalone or multi-file) attach to the task.
  // One index over the chunk list keeps dependency-row resolution linear.
  const chunksByKey = new Map(
    normalized.chunks.map((chunk) => [
      JSON.stringify([chunk.input_path, chunk.provider_id]),
      chunk,
    ]),
  );
  return [
    ...normalized.chunk_missing_dependencies.flatMap(
      ({ input_path, provider_id, dependencies }): ExtractionGap[] => {
        const affected = chunksByKey.get(
          JSON.stringify([input_path, provider_id]),
        );
        return [
          {
            kind: "missing-extractor-dependency",
            input_path,
            ...emptyGap,
            ...(affected === undefined
              ? {}
              : {
                  handler: affected.handler,
                  provider_id,
                  range: affected.range,
                  root_file_range: affected.root_file_range,
                }),
            dependencies: [...dependencies],
            continuation_id: continuation(
              dependencies.length > 0
                ? GAP_CONTINUATIONS["missing-extractor-dependency"]
                : UNNAMED_DEPENDENCY_CONTINUATION,
            ),
          },
        ];
      },
    ),
    ...normalized.failed_extraction_stages
      .filter(({ kind }) => kind === "missing-extractor-dependency")
      .map(
        ({
          input_path,
          provider_id,
          handler,
          dependencies,
        }): ExtractionGap => ({
          kind: "missing-extractor-dependency",
          input_path,
          ...emptyGap,
          handler,
          provider_id,
          dependencies: [...dependencies],
          continuation_id: continuation(
            dependencies.length > 0
              ? GAP_CONTINUATIONS["missing-extractor-dependency"]
              : UNNAMED_DEPENDENCY_CONTINUATION,
          ),
        }),
      ),
    // Standalone reports name only the task; do not borrow another stage's id.
    ...normalized.missing_dependencies.map(
      ({ input_path, dependencies }): ExtractionGap => ({
        kind: "missing-extractor-dependency",
        input_path,
        ...emptyGap,
        dependencies: [...dependencies],
        continuation_id: continuation(
          dependencies.length > 0
            ? GAP_CONTINUATIONS["missing-extractor-dependency"]
            : UNNAMED_DEPENDENCY_CONTINUATION,
        ),
      }),
    ),
  ];
};
