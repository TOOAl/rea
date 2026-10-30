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

export const scanCanonicalArtifactInventory = async (
  path: string,
  options: ArtifactInventoryOptions,
  readerFactory: typeof createReader = createReader,
): Promise<ArtifactInventorySnapshot> =>
  options.resourceScope.run(() =>
    scanCanonicalArtifactInventoryInScope(path, options, readerFactory),
  );

export const scanCanonicalArtifactInventoryInScope = async (
  path: string,
  options: ArtifactInventoryOptions,
  readerFactory: typeof createReader = createReader,
): Promise<ArtifactInventorySnapshot> => {
  const integrity = options.integrity ?? STRICT_INTEGRITY_POLICY;
  const metadata = await lstat(path);
  const {
    format: rootFormat,
    digest: rootDigest,
    rootSource,
  } = await classifyAndHashRootForInventory(
    path,
    metadata.isDirectory(),
    metadata,
    options,
  );
  let reader: ArtifactReader | undefined;
  let readerCreationFailure: { readonly cause: unknown } | undefined;
  try {
    reader = readerFactory(
      path,
      rootFormat,
      options.environment ?? {},
      rootSource,
    );
  } catch (cause: unknown) {
    readerCreationFailure = { cause };
  }
  const ownedReaders: ArtifactReader[] = reader === undefined ? [] : [reader];
  let outcome: InventoryScanOutcome;
  try {
    if (readerCreationFailure !== undefined) throw readerCreationFailure.cause;
    if (reader instanceof AsarArtifactReader)
      await reader.prepareContainer(rootDigest?.sha256, options.signal);
    const {
      nodes,
      occurrences,
      pendingContradictions,
      caseCollisionLimitation,
      unknownParentOccurrences,
      traversal,
    } = await scanReader(reader, ownedReaders, options.signal, integrity);
    outcome = {
      kind: "completed",
      snapshot: await buildInventorySnapshot({
        path,
        metadata,
        rootFormat,
        rootDigest,
        rootSource,
        resourceScope: options.resourceScope,
        reader,
        signal: options.signal,
        nodes,
        occurrences,
        pendingContradictions,
        caseCollisionLimitation,
        unknownParentOccurrences,
        traversal,
      }),
    };
  } catch (cause: unknown) {
    outcome = { kind: "failed", cause };
  }
  const cleanupFailure = await cleanupInventoryOwners({
    path,
    options,
    rootSource,
    ownedReaders,
    outcome,
  });
  if (cleanupFailure !== undefined) throw cleanupFailure;
  if (outcome.kind === "failed") throw outcome.cause;
  return outcome.snapshot;
};

type InventoryScanOutcome =
  | {
      readonly kind: "completed";
      readonly snapshot: ArtifactInventorySnapshot;
    }
  | { readonly kind: "failed"; readonly cause: unknown };

const cleanupInventoryOwners = async ({
  path,
  options,
  rootSource,
  ownedReaders,
  outcome,
}: {
  readonly path: string;
  readonly options: ArtifactInventoryOptions;
  readonly rootSource: RootInventorySource | undefined;
  readonly ownedReaders: readonly ArtifactReader[];
  readonly outcome: InventoryScanOutcome;
}): Promise<ArtifactReaderFailure | undefined> => {
  let cleanupFailure: ArtifactReaderFailure | undefined;
  const owners: ArtifactResourceOwner[] = [...ownedReaders]
    .reverse()
    .map((reader) => ({
      kind: "reader" as const,
      reader,
      resource: `artifact reader for ${path}`,
    }));
  if (rootSource !== undefined)
    owners.push({
      kind: "file-handle",
      handle: rootSource.owner,
      resource: `root artifact descriptor for ${path}`,
    });
  for (const owner of owners) {
    const attempt = await options.resourceScope.release(owner);
    if (attempt.kind === "released") continue;
    const primary =
      cleanupFailure ??
      (outcome.kind === "failed" ? outcome.cause : attempt.cause);
    cleanupFailure = ArtifactReaderFailure.withCleanup(
      primary,
      ArtifactReaderFailure.cleanupObservation(attempt.cause, owner.resource),
      outcome.kind === "completed"
        ? { kind: "artifact-inventory", inventory: outcome.snapshot }
        : undefined,
    );
  }
  return cleanupFailure;
};

interface SnapshotBuildInput {
  readonly resourceScope: ArtifactInventoryOptions["resourceScope"];
  readonly path: string;
  readonly metadata: Stats;
  readonly rootFormat: ArtifactOccurrence["artifact_format"];
  readonly rootDigest: HashResult | null;
  readonly rootSource: RootInventorySource | undefined;
  readonly reader: ArtifactReader | undefined;
  readonly signal: AbortSignal | undefined;
  readonly nodes: Map<string, ArtifactNode>;
  readonly occurrences: MutableOccurrence[];
  readonly pendingContradictions: PendingIntegrityContradiction[];
  readonly caseCollisionLimitation: string | undefined;
  readonly unknownParentOccurrences: ReadonlySet<MutableOccurrence>;
  readonly traversal: ArtifactReaderTraversal;
}
