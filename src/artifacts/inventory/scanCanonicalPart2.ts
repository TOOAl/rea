import type { ArtifactInventorySnapshot } from "../../domain/artifactInventorySnapshot.js";
import { compareUnicodeCodePoints } from "../../domain/unicodeCodePointOrder.js";

import { AsarArtifactReader } from "../AsarArtifactReader.js";

import { lstat } from "node:fs/promises";
import type { Stats } from "node:fs";
import type { RootInventorySource } from "./classify.js";

import {
  ArtifactReaderFailure,
  type ArtifactReader,
  type ArtifactReaderTraversal,
} from "../ArtifactReader.js";
import type { ArtifactResourceOwner } from "../ArtifactResourceScope.js";
import {
  artifactInventoryResultSchema,
  type ArtifactInventoryResult,
  type ArtifactNode,
  type ArtifactOccurrence,
  type IntegrityContradiction,
} from "../../domain/artifactGraph.js";
import {
  createArtifactEdges,
  createRootNode,
  materializeDirectoryNodes,
  rekeyOccurrences,
  rootOccurrenceFor,
  type MutableOccurrence,
} from "./ArtifactGraphConstruction.js";
import {
  artifactContradictionId,
  artifactGraphDigest,
  artifactManifestId,
} from "../../domain/artifactIdentity.js";
import { classifyAndHashRootForInventory } from "./classify.js";
import { hostExecutableMarking } from "../hostExecutableMarking.js";
import type { HashResult } from "../ArtifactHash.js";
import {
  hashStableRootArtifact,
  hashStableRootArtifactHandle,
} from "./hashStableRootArtifact.js";
import { createReader, inventoryCoverage } from "./reader.js";
import {
  scanReader,
  type PendingIntegrityContradiction,
} from "./scanReader.js";
import {
  STRICT_INTEGRITY_POLICY,
  type ArtifactInventoryOptions,
} from "./types.js";

const buildInventorySnapshot = async (
  input: SnapshotBuildInput,
): Promise<ArtifactInventorySnapshot> => {
  const { path, metadata, rootFormat, rootDigest, rootSource, reader, signal } =
    input;
  materializeDirectoryNodes(input.occurrences, input.nodes);
  const rootNode = createRootNode({
    digest: rootDigest,
    occurrences: input.occurrences,
  });
  input.nodes.set(rootNode.artifact_id, rootNode);
  rekeyOccurrences(rootNode.artifact_id, input.occurrences);
  const rootOccurrence = rootOccurrenceFor(rootNode, {
    size: metadata.size,
    executable: hostExecutableMarking(path, metadata),
    format: rootFormat,
    path,
  });
  for (const occurrence of input.occurrences)
    if (
      occurrence.parent_occurrence_id === null &&
      !input.unknownParentOccurrences.has(occurrence)
    )
      occurrence.parent_occurrence_id = rootOccurrence.occurrence_id;
  input.occurrences.unshift(rootOccurrence);

  const occurrenceById = new Map(
    input.occurrences.map((occurrence) => [
      occurrence.occurrence_id,
      occurrence,
    ]),
  );
  const integrityContradictions = buildIntegrityContradictions(
    input.pendingContradictions,
    occurrenceById,
    rootNode,
  );
  const edgeResult = createArtifactEdges(
    rootNode.artifact_id,
    input.occurrences,
    reader?.provenance()[0],
  );
  const { edges } = edgeResult;
  const orderedNodes = sortNodes([...input.nodes.values()]);
  const orderedOccurrences = sortOccurrences(input.occurrences);
  const orderedEdges = sortEdges(edges).map((edge, ordinal) => ({
    ...edge,
    ordinal,
  }));

  await verifyRootDigest(
    path,
    rootDigest,
    rootSource,
    input.resourceScope,
    signal,
  );

  const graphSha256 = artifactGraphDigest({
    nodes: orderedNodes,
    occurrences: orderedOccurrences,
    edges: orderedEdges,
    contradictions: integrityContradictions,
  });
  const manifest = buildManifest({
    rootNode,
    rootFormat,
    graphSha256,
    orderedNodes,
    orderedOccurrences,
    orderedEdges,
  });
  const traversal = inventoryCoverage(rootFormat, reader, input.traversal);
  const coverage =
    edgeResult.limitations.length === 0
      ? traversal.coverage
      : { ...traversal.coverage, status: "unknown" as const };
  return {
    manifest,
    nodes: orderedNodes,
    occurrences: orderedOccurrences,
    edges: orderedEdges,
    provenance: reader?.provenance() ?? [],
    integrity_contradictions: integrityContradictions,
    coverage,
    limitations: buildLimitations(
      [...traversal.limitations, ...edgeResult.limitations],
      integrityContradictions,
      input.caseCollisionLimitation,
    ),
  };
};

const buildIntegrityContradictions = (
  pending: readonly PendingIntegrityContradiction[],
  occurrenceById: ReadonlyMap<string, MutableOccurrence>,
  rootNode: ArtifactNode,
): IntegrityContradiction[] =>
  pending.map((contradiction): IntegrityContradiction => {
    const occurrence = contradiction.occurrence;
    const parent =
      occurrence.parent_occurrence_id === null
        ? undefined
        : occurrenceById.get(occurrence.parent_occurrence_id);
    const parentArtifactId = parent?.artifact_id ?? rootNode.artifact_id;
    return {
      contradiction_id: artifactContradictionId({
        rootArtifactId: rootNode.artifact_id,
        logicalPath: occurrence.logical_path,
        declaredSha256: contradiction.declaredSha256,
        observedSha256: contradiction.observedSha256,
      }),
      occurrence_id: occurrence.occurrence_id,
      parent_artifact_id: parentArtifactId,
      logical_path: occurrence.logical_path,
      declared_sha256: contradiction.declaredSha256,
      observed_sha256: contradiction.observedSha256,
      entry_kind: contradiction.entryKind,
      unpacked: contradiction.unpacked,
      trust: "observed-untrusted",
      provenance: "container-integrity-metadata-versus-observed-bytes",
      limitations: [
        "Observed bytes contradict declared integrity metadata and cannot support equivalence.",
      ],
    };
  });

const verifyRootDigest = async (
  path: string,
  rootDigest: HashResult | null,
  rootSource: RootInventorySource | undefined,
  resourceScope: ArtifactInventoryOptions["resourceScope"],
  signal: AbortSignal | undefined,
): Promise<void> => {
  if (rootDigest === null) return;
  const verified =
    rootSource === undefined
      ? await hashStableRootArtifact(path, resourceScope, signal)
      : await hashStableRootArtifactHandle(
          path,
          rootSource.handle,
          rootSource.initial,
          signal,
        );
  if (
    verified.sha256 !== rootDigest.sha256 ||
    verified.bytes !== rootDigest.bytes
  )
    throw new ArtifactReaderFailure(
      "integrity",
      "Root artifact changed during inventory",
    );
};

const sortNodes = (nodes: ArtifactNode[]): ArtifactNode[] =>
  nodes.sort((left, right) =>
    compareUnicodeCodePoints(left.artifact_id, right.artifact_id),
  );

const sortOccurrences = (
  occurrences: MutableOccurrence[],
): MutableOccurrence[] =>
  occurrences.sort((left, right) =>
    compareUnicodeCodePoints(left.logical_path, right.logical_path),
  );

const sortEdges = <T extends { edge_id: string }>(edges: T[]): T[] =>
  edges.sort((left, right) =>
    compareUnicodeCodePoints(left.edge_id, right.edge_id),
  );

const buildManifest = ({
  rootNode,
  rootFormat,
  graphSha256,
  orderedNodes,
  orderedOccurrences,
  orderedEdges,
}: {
  readonly rootNode: ArtifactNode;
  readonly rootFormat: ArtifactOccurrence["artifact_format"];
  readonly graphSha256: string;
  readonly orderedNodes: readonly ArtifactNode[];
  readonly orderedOccurrences: readonly unknown[];
  readonly orderedEdges: readonly { edge_id: string }[];
}): ArtifactInventoryResult["manifest"] =>
  artifactInventoryResultSchema.shape.manifest.parse({
    manifest_id: artifactManifestId(rootNode.artifact_id, graphSha256),
    root_artifact_id: rootNode.artifact_id,
    root_sha256: rootNode.sha256,
    root_format: rootFormat,
    graph_sha256: graphSha256,
    node_count: orderedNodes.length,
    occurrence_count: orderedOccurrences.length,
    edge_count: orderedEdges.length,
  });

const buildLimitations = (
  scopeLimitations: readonly string[],
  integrityContradictions: readonly IntegrityContradiction[],
  caseCollisionLimitation: string | undefined,
): string[] => [
  ...scopeLimitations,
  ...(caseCollisionLimitation === undefined ? [] : [caseCollisionLimitation]),
  ...(integrityContradictions.length === 0
    ? []
    : [
        `${String(integrityContradictions.length)} integrity contradiction(s) were recorded; mismatched content is observed-untrusted.`,
      ]),
];
