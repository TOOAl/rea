import { lstat } from "node:fs/promises";

import { compareUnicodeCodePoints } from "../../domain/unicodeCodePointOrder.js";
import { digestCanonicalValue } from "../../domain/canonicalDigest.js";
import { AsarArtifactReader } from "../AsarArtifactReader.js";
import {
  ArtifactPathRegistry,
  normalizeArtifactPath,
} from "../ArtifactPaths.js";
import {
  ArtifactReaderFailure,
  type ArtifactEntry,
  type ArtifactReader,
} from "../ArtifactReader.js";
import { DirectoryArtifactReader } from "../DirectoryArtifactReader.js";
import { SafeOutputTree } from "../SafeOutputTree.js";
import { SafeOutputTreeCreationFailure } from "../SafeOutputTreeCreationFailure.js";
import { ZipArtifactReader } from "../ZipArtifactReader.js";
import { isZipPackageFormat } from "../../domain/zipPackageFormat.js";
import { MachOSliceArtifactReader } from "../MachOSliceArtifactReader.js";
import {
  artifactExtractionResultSchema,
  type ArtifactExtractionResult,
  type ArtifactGraphManifest,
  type ArtifactOccurrence,
  type IntegrityContradiction,
} from "../../domain/artifactGraph.js";
import { AnalysisUnsupportedTargetError } from "../../domain/analysisErrorCore.js";
import type {
  ArtifactResourceOwner,
  ArtifactResourceScope,
} from "../ArtifactResourceScope.js";
import { isMachOFormat } from "../../domain/binaryTargetTypes.js";

/** Local extraction input with the output root chosen by the adapter. */

const materializeSelection = async ({
  input,
  sourcePath,
  inventory,
  selected,
  signal,
}: {
  readonly input: ArtifactExtractionInput;
  readonly sourcePath: string;
  readonly inventory: ExtractionInventory;
  readonly selected: readonly SelectedOccurrence[];
  readonly signal: AbortSignal | undefined;
}): Promise<ArtifactExtractionResult> => {
  const byPath = new Map(
    selected.map((item) => [item.occurrence.logical_path, item]),
  );
  const reader = await createReader(sourcePath, input);
  const readerOwner: ArtifactResourceOwner = {
    kind: "reader" as const,
    reader,
    resource: `artifact reader for ${sourcePath}`,
  };
  let localReaderOwner: ArtifactResourceOwner | undefined = readerOwner;
  let output: SafeOutputTree | undefined;
  let completed: ArtifactExtractionResult | undefined;
  const extracted: ExtractedOccurrence[] = [];
  try {
    try {
      output = await SafeOutputTree.create(input.outputRoot);
    } catch (cause: unknown) {
      if (cause instanceof SafeOutputTreeCreationFailure) output = cause.tree;
      throw cause;
    }
    await writeSelectedEntries({ reader, output, byPath, extracted, signal });
    localReaderOwner = undefined;
    const closeAttempt = await input.resourceScope.release(readerOwner);
    if (closeAttempt.kind === "failed")
      throw ArtifactReaderFailure.withCleanup(
        closeAttempt.cause,
        ArtifactReaderFailure.cleanupObservation(
          closeAttempt.cause,
          readerOwner.resource,
        ),
      );
    extracted.sort((left, right) =>
      compareUnicodeCodePoints(left.relative_path, right.relative_path),
    );
    completed = createExtractionResult(input, inventory, selected, extracted);
    await output.commit(signal);
    return completed;
  } catch (cause: unknown) {
    const cleanupFailures = await releaseExtractionOwners(
      input.resourceScope,
      localReaderOwner,
      output,
      input.outputRoot,
    );
    if (cleanupFailures.length > 0) {
      const observations = cleanupFailures.map(
        ({ cause: cleanupCause, resource }) =>
          ArtifactReaderFailure.cleanupObservation(cleanupCause, resource),
      );
      throw ArtifactReaderFailure.withCleanup(
        cause,
        {
          reason: observations.map(({ reason }) => reason).join("; "),
          resources: [
            ...new Set(observations.flatMap(({ resources }) => resources)),
          ],
        },
        output?.published === true && completed !== undefined
          ? { kind: "artifact-extraction", extraction: completed }
          : undefined,
      );
    }
    if (output?.published === true && completed !== undefined) return completed;
    throw cause;
  }
};

const writeSelectedEntries = async ({
  reader,
  output,
  byPath,
  extracted,
  signal,
}: {
  readonly reader: ArtifactReader;
  readonly output: SafeOutputTree;
  readonly byPath: Map<string, SelectedOccurrence>;
  readonly extracted: ExtractedOccurrence[];
  readonly signal: AbortSignal | undefined;
}): Promise<void> => {
  const registry = new ArtifactPathRegistry();
  for await (const entry of reader.entries(signal)) {
    const path = normalizeArtifactPath(entry.path);
    registry.add(path, entry.kind);
    const selectedItem = byPath.get(path);
    if (selectedItem === undefined) {
      if (entry.kind === "file" || entry.kind === "slice")
        throw new ArtifactReaderFailure(
          "integrity",
          `Regular artifact entry is missing from inventory: ${path}`,
        );
      continue;
    }
    preflight(entry);
    const stream = await reader.open(entry, signal);
    const written = await output.write(
      path,
      stream,
      {
        sha256: selectedItem.node.sha256,
        bytes: selectedItem.node.size,
      },
      signal,
    );
    extracted.push({
      artifact_id: selectedItem.node.artifact_id,
      relative_path: written.relativePath,
      sha256: written.sha256,
      bytes_written: written.bytesWritten,
      created: true,
    });
    byPath.delete(path);
  }
  if (byPath.size > 0)
    throw new ArtifactReaderFailure(
      "integrity",
      `Inventoried regular artifact entries were not materialized: ${[...byPath.keys()].sort(compareUnicodeCodePoints).join(", ")}`,
    );
};

const releaseExtractionOwners = async (
  resourceScope: ArtifactResourceScope,
  readerOwner: ArtifactResourceOwner | undefined,
  output: SafeOutputTree | undefined,
  outputRoot: string,
): Promise<{ readonly cause: unknown; readonly resource: string }[]> => {
  const failures: { readonly cause: unknown; readonly resource: string }[] = [];
  if (readerOwner !== undefined) {
    const attempt = await resourceScope.release(readerOwner);
    if (attempt.kind === "failed")
      failures.push({ cause: attempt.cause, resource: readerOwner.resource });
  }
  if (output !== undefined) {
    const owner: ArtifactResourceOwner = {
      kind: "output-tree",
      tree: output,
      resource: outputRoot,
    };
    const attempt = await resourceScope.release(owner);
    if (attempt.kind === "failed")
      failures.push({ cause: attempt.cause, resource: owner.resource });
  }
  return failures;
};

const createExtractionResult = (
  input: ArtifactExtractionInput,
  inventory: ExtractionInventory,
  selected: readonly SelectedOccurrence[],
  extracted: readonly ExtractedOccurrence[],
): ArtifactExtractionResult => {
  const extractionSemantic = {
    source_manifest_id: inventory.manifest.manifest_id,
    selected_occurrence_ids: selected
      .map(({ occurrence }) => occurrence.occurrence_id)
      .sort(compareUnicodeCodePoints),
    files_sha256: digestCanonicalValue(extracted, "Artifact"),
    output_root_alias: "$OUTPUT_ROOT" as const,
  };
  return artifactExtractionResultSchema.parse({
    manifest: inventory.manifest,
    extraction_manifest: {
      ...extractionSemantic,
      extraction_id: `aex_${digestCanonicalValue(extractionSemantic, "Artifact")}`,
    },
    output_root: input.outputRoot,
    artifacts: extracted,
    containment_verified: true,
    cleanup: { attempted: false, verified: true, residual_paths: [] },
    provenance: [],
    integrity_contradictions: inventory.integrityContradictions,
    limitations: [
      "All regular files in the active artifact were materialized; nested archive contents remain represented by their containing file.",
      ...(inventory.integrityContradictions.length === 0
        ? []
        : [
            `${String(inventory.integrityContradictions.length)} extracted file(s) contradict declared integrity metadata; their bytes are observed-untrusted.`,
          ]),
    ],
  });
};

interface ExtractionInventory {
  readonly manifest: ArtifactGraphManifest;
  readonly integrityContradictions: readonly IntegrityContradiction[];
}

/**
 * Refuse a format without an extraction reader before inventory work starts.
 * The target kind, not the host, is unsupported by extraction. The error keeps
 * the caller's spelling of the path; I/O uses the canonical path.
 */
const requireExtractableFormat = async (
  path: string,
  input: Pick<ArtifactExtractionInput, "inputPath" | "inputFormat">,
): Promise<boolean> => {
  const format = input.inputFormat;
  const directory = (await lstat(path)).isDirectory();
  if (
    !directory &&
    format !== "asar" &&
    !isMachOFormat(format) &&
    !isZipPackageFormat(format)
  )
    throw new AnalysisUnsupportedTargetError(
      "extract_artifact",
      input.inputPath,
      `Artifact format has no extraction reader: ${format}`,
    );
  return directory;
};

const createReader = async (
  path: string,
  input: Pick<
    ArtifactExtractionInput,
    "inputPath" | "inputFormat" | "environment"
  >,
): Promise<ArtifactReader> => {
  const format = input.inputFormat;
  if (await requireExtractableFormat(path, input))
    return new DirectoryArtifactReader(path);
  if (format === "asar") return new AsarArtifactReader(path);
  if (isZipPackageFormat(format)) return new ZipArtifactReader(path, format);
  return new MachOSliceArtifactReader(path, input.environment);
};

const preflight = (entry: ArtifactEntry): void => {
  if ((entry.kind !== "file" && entry.kind !== "slice") || entry.encrypted)
    throw new ArtifactReaderFailure(
      "format",
      `Selected artifact entry cannot be read: ${entry.path}`,
    );
};
