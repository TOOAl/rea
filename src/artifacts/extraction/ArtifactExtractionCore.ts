import { realpath } from "node:fs/promises";

import { digestCanonicalValue } from "../../domain/canonicalDigest.js";
import {
  ArtifactPathRegistry,
  normalizeArtifactPath,
} from "../ArtifactPaths.js";
import {
  ArtifactReaderFailure,
  type ArtifactReader,
} from "../ArtifactReader.js";
import { abortIfNeeded } from "../ArtifactHash.js";
import { SafeOutputTree } from "../SafeOutputTree.js";
import { ZipArtifactReader } from "../ZipArtifactReader.js";
import { MachOSliceArtifactReader } from "../MachOSliceArtifactReader.js";
import type {
  ArtifactExtractionResult,
  ArtifactNode,
  ArtifactOccurrence,
} from "../../domain/artifactGraph.js";
import { AnalysisUnsupportedTargetError } from "../../domain/analysisErrorCore.js";
import type { ArtifactResourceScope } from "../ArtifactResourceScope.js";
import type { BinaryTarget } from "../../domain/binaryTargetTypes.js";
import type { ArtifactInventorySnapshot } from "../../domain/artifactInventorySnapshot.js";
import { scanArtifactInventoryInScope } from "../inventory/ArtifactInventory.js";
import type { ArtifactIntegrityPolicyName } from "../../domain/artifactIntegrityPolicy.js";

/** Local extraction input with the output root chosen by the adapter. */
export interface ArtifactExtractionInput {
  readonly inputPath: string;
  readonly inputFormat: BinaryTarget["format"];
  readonly outputRoot: string;
  readonly environment: Readonly<NodeJS.ProcessEnv>;
  readonly integrityPolicy: ArtifactIntegrityPolicyName;
  readonly resourceScope: ArtifactResourceScope;
}

/** Extract every regular inventory occurrence into an exclusively owned absent root. */
export const extractArtifact = async (
  input: ArtifactExtractionInput,
  signal?: AbortSignal,
): Promise<ArtifactExtractionResult> =>
  input.resourceScope.run(() => extractArtifactInScope(input, signal));

const extractArtifactInScope = async (
  input: ArtifactExtractionInput,
  signal?: AbortSignal,
): Promise<ArtifactExtractionResult> => {
  // Cancellation wins over every later refusal, including unsupported formats.
  abortIfNeeded(signal);
  const sourcePath = await realpath(input.inputPath);
  await requireExtractableFormat(sourcePath, input);
  const snapshot = await scanArtifactInventoryInScope(sourcePath, {
    resourceScope: input.resourceScope,
    signal,
    environment: input.environment,
    integrity: { mode: input.integrityPolicy },
  });
  return materializeArtifactInventoryInScope(
    input,
    sourcePath,
    snapshot,
    signal,
  );
};

/** Materialize a scanned inventory, verifying every current occurrence against it. */
export const materializeArtifactInventory = async (
  input: ArtifactExtractionInput,
  sourcePath: string,
  snapshot: ArtifactInventorySnapshot,
  signal?: AbortSignal,
): Promise<ArtifactExtractionResult> => {
  return input.resourceScope.run(() =>
    materializeArtifactInventoryInScope(input, sourcePath, snapshot, signal),
  );
};

const materializeArtifactInventoryInScope = async (
  input: ArtifactExtractionInput,
  sourcePath: string,
  snapshot: ArtifactInventorySnapshot,
  signal?: AbortSignal,
): Promise<ArtifactExtractionResult> => {
  abortIfNeeded(signal);
  const selectedOccurrences = snapshot.occurrences.filter(
    (occurrence) =>
      (occurrence.entry_kind === "file" || occurrence.entry_kind === "slice") &&
      occurrence.logical_path !== ".",
  );
  const regularPaths = new Set(
    selectedOccurrences.map(({ logical_path: path }) => path),
  );
  const activeOccurrences = selectedOccurrences.filter(({ logical_path }) => {
    // Nested members remain represented by their containing regular file;
    // only entries exposed by the active reader are materialized.
    let path = logical_path;
    for (
      let slash = path.lastIndexOf("/");
      slash >= 0;
      slash = path.lastIndexOf("/")
    ) {
      path = path.slice(0, slash);
      if (regularPaths.has(path)) return false;
    }
    return true;
  });
  const selectedIds = new Set(
    activeOccurrences.map(({ occurrence_id: id }) => id),
  );
  const neededNodes = new Set(
    activeOccurrences.map(({ artifact_id: id }) => id),
  );
  const nodes = new Map<string, ArtifactNode>();
  for (const node of snapshot.nodes)
    if (neededNodes.has(node.artifact_id)) nodes.set(node.artifact_id, node);
  const inventory: ExtractionInventory = {
    manifest: snapshot.manifest,
    integrityContradictions: snapshot.integrity_contradictions.filter(
      ({ occurrence_id: id }) => selectedIds.has(id),
    ),
  };
  const selected = activeOccurrences.map((occurrence) => {
    // REA never decrypts archive entries, so an encrypted entry makes the
    // complete extraction unsupported rather than the archive invalid.
    if (occurrence.encrypted)
      throw new AnalysisUnsupportedTargetError(
        "extract_artifact",
        input.inputPath,
        `Archive entry ${occurrence.logical_path} is encrypted; REA does not decrypt archive entries, so the archive cannot be extracted completely`,
      );
    // Inventory keeps an ASAR unpacked entry whose companion file is absent,
    // but extraction cannot materialize bytes it never observed.
    if (
      occurrence.entry_kind === "file" &&
      occurrence.artifact_id === null &&
      occurrence.hash_status === "unavailable"
    )
      throw new ArtifactReaderFailure(
        "unavailable",
        `ASAR unpacked companion bytes are unavailable for ${occurrence.logical_path}`,
        undefined,
        {
          logicalPath: occurrence.logical_path,
          declaredSha256: null,
          calculatedSha256: null,
          unpacked: true,
        },
      );
    if (
      (occurrence.entry_kind !== "file" && occurrence.entry_kind !== "slice") ||
      occurrence.artifact_id === null ||
      occurrence.logical_path === "."
    )
      throw new ArtifactReaderFailure(
        "format",
        `Selected occurrence is not an extractable regular child file: ${occurrence.logical_path} (${occurrence.occurrence_id})`,
      );
    const node = nodes.get(occurrence.artifact_id);
    if (node === undefined)
      throw new ArtifactReaderFailure(
        "integrity",
        `Selected occurrence has no inventory node: ${occurrence.occurrence_id}`,
      );
    return { occurrence, node };
  });
  return materializeSelection({
    input,
    sourcePath,
    inventory,
    selected,
    signal,
  });
};

interface SelectedOccurrence {
  readonly occurrence: ArtifactOccurrence;
  readonly node: ArtifactNode;
}

interface ExtractedOccurrence {
  readonly artifact_id: string;
  readonly relative_path: string;
  readonly sha256: string;
  readonly bytes_written: number;
  readonly created: true;
}
