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

const extractionGaps = (
  unpublished: z.infer<
    typeof firmwareResultSchemas.extract_firmware
  >["unpublished_entries"],
  files: readonly z.infer<
    typeof firmwareResultSchemas.extract_firmware
  >["files"][number][],
  normalized: ReturnType<typeof normalizeUnblobReport>,
  maxDepth: number,
) => {
  // Intern before row construction: N gaps retain N identities, while K unique
  // recovery instructions consume prose only K times in the public result.
  const instructions = new Map<string, string>();
  const continuation = (instruction: string): string => {
    const known = instructions.get(instruction);
    if (known !== undefined) return known;
    const id = createHash("sha256").update(instruction).digest("hex");
    instructions.set(instruction, id);
    return id;
  };
  const dependencyGaps = dependencyExtractionGaps(normalized, continuation);
  const publishedFiles = new Map(
    files.map((file) => [`$output/${file.relative_path}`, file]),
  );
  const nestedContinuationId = (inputPath: string): string => {
    return continuation(
      nestedUnknownContinuation(publishedFiles.get(inputPath)),
    );
  };
  const chunkGaps = (
    kind: ExtractionGap["kind"],
    matches: (chunk: (typeof normalized.chunks)[number]) => boolean,
  ): ExtractionGap[] =>
    normalized.chunks.filter(matches).map((chunk) => ({
      kind,
      input_path: chunk.input_path,
      ...emptyGap,
      handler: chunk.handler,
      provider_id: chunk.provider_id,
      range: chunk.range,
      root_file_range: chunk.root_file_range,
      dependencies: [],
      continuation_id:
        kind === "unknown-chunk-handler" &&
        chunk.input_path.startsWith("$output/")
          ? nestedContinuationId(chunk.input_path)
          : continuation(GAP_CONTINUATIONS[kind]),
    }));
  // Chunks whose failure a dependency row already covers stay out of the
  // generic extractor-failure emission.
  const dependencyChunkKeys = new Set(
    normalized.chunk_missing_dependencies.map(({ input_path, provider_id }) =>
      JSON.stringify([input_path, provider_id]),
    ),
  );
  // A depth ceiling can only be re-rooted through a published child that a
  // fresh firmware input could actually accept; the index is only needed
  // when a depth row will actually consult it.
  const ceilingReached =
    maxDepth >= MAX_EXTRACTION_DEPTH &&
    normalized.depth_limited_paths.length > 0;
  const reRootablePaths = new Map<string, Set<string>>();
  if (ceilingReached)
    for (const [filePath, file] of [...publishedFiles].sort(
      ([left], [right]) => (left < right ? -1 : left > right ? 1 : 0),
    )) {
      const size = file.size;
      if (size <= 0 || size > FIRMWARE_LIMITS.inputBytes) continue;
      // The published file itself can re-root a fresh run; so can every
      // directory containing it.
      const segments = filePath.split("/");
      while (segments.length > 1) {
        const ancestor = segments.join("/");
        const childPaths = reRootablePaths.get(ancestor) ?? new Set<string>();
        childPaths.add(file.path);
        reRootablePaths.set(ancestor, childPaths);
        segments.pop();
      }
    }
  const depthContinuationIds = new Map<string, string>();
  const depthContinuationId = (inputPath: string): string => {
    const existing = depthContinuationIds.get(inputPath);
    if (existing !== undefined) return existing;
    const id = continuation(
      depthContinuation(
        maxDepth,
        [...(reRootablePaths.get(inputPath) ?? [])].sort(),
      ),
    );
    depthContinuationIds.set(inputPath, id);
    return id;
  };
  const gaps: ExtractionGap[] = [
    ...dependencyGaps,
    ...normalized.failed_extraction_stages
      .filter(({ kind }) => kind === "extractor-failure")
      .map(({ input_path, provider_id, handler }): ExtractionGap => ({
        kind: "extractor-failure",
        input_path,
        ...emptyGap,
        handler,
        provider_id,
        dependencies: [],
        continuation_id: continuation(
          "The producer retained this extraction stage's failure in diagnostics. Review the stage report and correct the reported cause before rerunning extract_firmware on the same immutable input with a fresh output_directory; this report establishes no byte-region ownership.",
        ),
      })),
    ...chunkGaps("unknown-chunk-handler", (chunk) => chunk.handler === null),
    ...chunkGaps("encrypted-chunk", (chunk) => chunk.encrypted === true),
    ...chunkGaps(
      "extractor-failure",
      (chunk) =>
        chunk.extraction_failed === true &&
        chunk.handler !== null &&
        chunk.encrypted !== true &&
        // The chunk's own dependency row already carries its recovery; a
        // task-wide dependency names no region and replaces nothing.
        !dependencyChunkKeys.has(
          JSON.stringify([chunk.input_path, chunk.provider_id]),
        ),
    ),
    ...normalized.depth_limited_paths.map((input_path): ExtractionGap => ({
      kind: "depth-limited",
      input_path,
      ...emptyGap,
      dependencies: [],
      continuation_id: depthContinuationId(input_path),
    })),
    ...unpublished.map((entry): ExtractionGap => ({
      kind: "unpublished-entry",
      input_path: `$output/${entry.relative_path}`,
      ...emptyGap,
      relative_path: entry.relative_path,
      dependencies: [],
      continuation_id: continuation(GAP_CONTINUATIONS["unpublished-entry"]),
    })),
  ];
  gaps.sort((left, right) =>
    gapSortKey(left) < gapSortKey(right)
      ? -1
      : gapSortKey(left) > gapSortKey(right)
        ? 1
        : 0,
  );
  return {
    extraction_gaps: gaps,
    extraction_continuations: [...instructions].map(([instruction, id]) => ({
      id,
      instruction,
    })),
  };
};
