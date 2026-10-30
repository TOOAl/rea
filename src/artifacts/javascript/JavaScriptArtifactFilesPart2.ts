import { createHash } from "node:crypto";
import { isAbsolute } from "node:path";
import type { Readable } from "node:stream";

import { compareUnicodeCodePoints } from "../../domain/unicodeCodePointOrder.js";
import { AsarArtifactReader } from "../AsarArtifactReader.js";
import type { ArtifactResourceScope } from "../ArtifactResourceScope.js";
import {
  ArtifactPathRegistry,
  normalizeArtifactPath,
} from "../ArtifactPaths.js";
import {
  ArtifactReaderFailure,
  type ArtifactEntry,
  type ArtifactReader,
} from "../ArtifactReader.js";
import { streamChunkToBuffer } from "../StreamBytes.js";
import { hashReadable } from "../ArtifactHash.js";
import type { ArtifactOccurrence } from "../../domain/artifactGraph.js";
import type { ArtifactInventorySnapshot } from "../../domain/artifactInventorySnapshot.js";

// src/artifacts/javascript/JavaScriptArtifactFilesPart2.ts
const expectedInventory = (
  snapshot: ArtifactInventorySnapshot,
): {
  readonly files: ReadonlyMap<string, ExpectedFile>;
  readonly containers: ReadonlyMap<string, ExpectedContainer>;
  readonly unavailableFiles: ReadonlySet<string>;
} => {
  const nodes = new Map(snapshot.nodes.map((node) => [node.artifact_id, node]));
  const files = new Map<string, ExpectedFile>();
  const containers = new Map<string, ExpectedContainer>();
  const unavailableFiles = new Set<string>();
  for (const occurrence of snapshot.occurrences) {
    if (occurrence.logical_path === ".") continue;
    const isNestedAsar =
      occurrence.entry_kind === "file" &&
      occurrence.logical_path.toLowerCase().endsWith(".asar");
    if (occurrence.artifact_id === null) {
      if (
        occurrence.entry_kind === "file" &&
        relevantKind(occurrence.logical_path) !== undefined
      )
        unavailableFiles.add(occurrence.logical_path);
      if (isNestedAsar)
        containers.set(occurrence.logical_path, {
          hash_status: occurrence.hash_status,
          format: occurrence.artifact_format,
          inventory: null,
        });
      continue;
    }
    const node = nodes.get(occurrence.artifact_id);
    if (node === undefined)
      throw new ArtifactReaderFailure(
        "integrity",
        `Artifact inventory node is missing: ${occurrence.logical_path}`,
      );
    // Inventory occurrences can have content identities for directories too.
    // Suffixes only describe file candidates; a directory such as
    // node_modules/@zip.js remains a graph node and must never be opened.
    if (occurrence.entry_kind !== "file") continue;
    if (isNestedAsar)
      containers.set(occurrence.logical_path, {
        hash_status: occurrence.hash_status,
        format: occurrence.artifact_format,
        inventory: {
          path: occurrence.logical_path,
          sha256: node.sha256,
          bytes: node.size,
          inventory_artifact_id: node.artifact_id,
        },
      });
    const kind = relevantKind(occurrence.logical_path);
    if (kind === undefined) continue;
    files.set(occurrence.logical_path, {
      path: occurrence.logical_path,
      sha256: node.sha256,
      bytes: node.size,
      inventoryArtifactId: node.artifact_id,
      kind,
    });
  }
  return { files, containers, unavailableFiles };
};

/** Canonical snapshot arrays are already ordered by code-point identity. */
const lowerBound = <T>(
  rows: readonly T[],
  key: string,
  identity: (row: T) => string,
): number => {
  let low = 0;
  let high = rows.length;
  while (low < high) {
    const middle = low + Math.floor((high - low) / 2);
    const row = rows[middle];
    if (row !== undefined && compareUnicodeCodePoints(identity(row), key) < 0)
      low = middle + 1;
    else high = middle;
  }
  return low;
};

const createUnanalyzedArtifactLookup = (
  snapshot: ArtifactInventorySnapshot,
  containers: readonly JavaScriptArtifactContainer[],
): JavaScriptUnanalyzedArtifactLookup => {
  const requested = new Map<
    string,
    JavaScriptUnanalyzedArtifactFile | undefined
  >();
  const directories = new Map<string, Map<string | undefined, boolean>>();
  const containerIds = new Map(
    containers.map((container) => [container.path, container.sha256]),
  );
  const containerFor = (path: string): string => {
    let prefix = path;
    for (;;) {
      const slash = prefix.lastIndexOf("/");
      if (slash < 0) return snapshot.manifest.root_sha256;
      prefix = prefix.slice(0, slash);
      const sha256 = containerIds.get(prefix);
      if (sha256 !== undefined) return sha256;
    }
  };
  const isOpaque = (occurrence: ArtifactOccurrence): boolean =>
    occurrence.entry_kind === "file" &&
    relevantKind(occurrence.logical_path) === undefined;
  const isUnavailableRelevant = (occurrence: ArtifactOccurrence): boolean =>
    occurrence.entry_kind === "file" &&
    occurrence.artifact_id === null &&
    relevantKind(occurrence.logical_path) !== undefined;
  return {
    get(path) {
      if (requested.has(path)) return requested.get(path);
      const occurrence =
        snapshot.occurrences[
          lowerBound(snapshot.occurrences, path, (entry) => entry.logical_path)
        ];
      const kind = relevantKind(path);
      const id =
        occurrence?.logical_path === path &&
        (isOpaque(occurrence) || isUnavailableRelevant(occurrence))
          ? occurrence.artifact_id
          : undefined;
      const candidate =
        id == null
          ? undefined
          : snapshot.nodes[
              lowerBound(snapshot.nodes, id, (entry) => entry.artifact_id)
            ];
      const node = candidate?.artifact_id === id ? candidate : undefined;
      const file =
        occurrence?.logical_path !== path ||
        (!isOpaque(occurrence) && !isUnavailableRelevant(occurrence))
          ? undefined
          : {
              path,
              container_sha256: containerFor(path),
              sha256: node?.sha256 ?? null,
              bytes: node?.size ?? occurrence.declared_size,
              inventory_artifact_id: occurrence.artifact_id,
              inventory_occurrence_id: occurrence.occurrence_id,
              ...(kind === undefined ? {} : { kind }),
              artifact_kind: occurrence.artifact_kind,
              hash_status: occurrence.hash_status,
              limitations: occurrence.limitations,
            };
      requested.set(path, file);
      return file;
    },
    hasDirectory(path, containerSha256) {
      let results = directories.get(path);
      const previous = results?.get(containerSha256);
      if (previous !== undefined) return previous;
      const prefix = `${path}/`;
      let present = false;
      for (
        let index = lowerBound(
          snapshot.occurrences,
          prefix,
          (entry) => entry.logical_path,
        );
        index < snapshot.occurrences.length;
        index += 1
      ) {
        const entry = snapshot.occurrences[index];
        if (entry === undefined || !entry.logical_path.startsWith(prefix))
          break;
        if (
          (isOpaque(entry) || isUnavailableRelevant(entry)) &&
          (containerSha256 === undefined ||
            containerFor(entry.logical_path) === containerSha256)
        ) {
          present = true;
          break;
        }
      }
      if (results === undefined) {
        results = new Map();
        directories.set(path, results);
      }
      results.set(containerSha256, present);
      return present;
    },
  };
};

const readAll = async (
  stream: Readable,
  signal?: AbortSignal,
): Promise<Buffer> => {
  const chunks: Buffer[] = [];
  let bytes = 0;
  for await (const raw of stream) {
    abortIfNeeded(signal);
    const chunk = streamChunkToBuffer(raw);
    bytes += chunk.length;
    chunks.push(chunk);
  }
  return Buffer.concat(chunks, bytes);
};

const assertExpectedFilesWereVisited = (
  expected: ReadonlyMap<string, ExpectedFile>,
  actual: readonly JavaScriptArtifactFile[],
): void => {
  const observed = new Set(actual.map(({ path }) => path));
  for (const path of expected.keys())
    if (!observed.has(path))
      throw new ArtifactReaderFailure(
        "integrity",
        `Relevant artifact entry disappeared after inventory: ${path}`,
      );
};

const relevantKind = (path: string): JavaScriptArtifactFileKind | undefined => {
  const lower = path.toLowerCase();
  if (lower === "package.json" || lower.endsWith("/package.json"))
    return "package-json";
  if (lower.endsWith(".json")) return "json";
  if (isJavaScriptSourcePath(path)) return "javascript";
  if (/\.html?$/u.test(lower)) return "html";
  if (lower.endsWith(".map")) return "source-map";
  if (lower.endsWith(".node")) return "native-addon";
  return undefined;
};

const isFilesystemAsar = (entry: ArtifactEntry, path: string): boolean =>
  entry.kind === "file" &&
  path.toLowerCase().endsWith(".asar") &&
  isAbsolute(entry.adapterKey);

const abortIfNeeded = (signal?: AbortSignal): void => {
  if (signal?.aborted === true)
    throw new ArtifactReaderFailure(
      "cancelled",
      "JavaScript artifact reconstruction cancelled",
    );
};
