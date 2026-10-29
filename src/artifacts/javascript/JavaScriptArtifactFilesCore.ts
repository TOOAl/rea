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
import { AnalysisInputError } from "../../domain/analysisErrorCore.js";
import { isJavaScriptSourcePath } from "../../domain/javascript/javascriptArtifactFiles.js";

import type {
  JavaScriptArtifactFileKind,
  JavaScriptArtifactFile,
  JavaScriptArtifactContainer,
  JavaScriptUnanalyzedArtifactFile,
  JavaScriptUnanalyzedArtifactLookup,
  JavaScriptArtifactFileSet,
} from "../../domain/javascript/javascriptArtifactFiles.js";

interface ExpectedFile {
  readonly path: string;
  readonly sha256: string;
  readonly bytes: number;
  readonly inventoryArtifactId: string;
  readonly kind: JavaScriptArtifactFileKind;
}

interface ExpectedContainer {
  readonly hash_status: ArtifactOccurrence["hash_status"];
  readonly format: ArtifactOccurrence["artifact_format"];
  readonly inventory: JavaScriptArtifactContainer | null;
}

interface ReadContext {
  readonly resources: ArtifactResourceScope;
  readonly expected: ReadonlyMap<string, ExpectedFile>;
  readonly expectedContainers: ReadonlyMap<string, ExpectedContainer>;
  readonly registry: ArtifactPathRegistry;
  readonly files: JavaScriptArtifactFile[];
  readonly containers: JavaScriptArtifactContainer[];
  readonly signal: AbortSignal | undefined;
  readonly selectedPaths: ReadonlyMap<string, number> | undefined;
  textBytes: number;
  invalidUtf8: number;
}

interface ReadTextInput {
  readonly reader: ArtifactReader;
  readonly entry: ArtifactEntry;
  readonly expected: ExpectedFile;
}

/** Verify inventoried entries; acquire text only inside the caller's scope. */
export const readJavaScriptArtifactFiles = async (
  reader: ArtifactReader,
  snapshot: ArtifactInventorySnapshot,
  resources: ArtifactResourceScope,
  signal?: AbortSignal,
  sourcePaths?: readonly string[],
): Promise<JavaScriptArtifactFileSet> => {
  const inventory = expectedInventory(snapshot);
  const expected = inventory.files;
  const selectedPaths =
    sourcePaths === undefined
      ? undefined
      : new Map([...new Set(sourcePaths)].map((path, index) => [path, index]));
  const issues = (sourcePaths ?? []).flatMap((path, index) =>
    expected.has(path) || inventory.unavailableFiles.has(path)
      ? []
      : [
          {
            path: ["source_paths", index],
            reason: "invalid_value" as const,
            message:
              "Select an exact relevant file path from the artifact inventory; no globs or path aliases.",
          },
        ],
  );
  if (issues.length > 0)
    throw new AnalysisInputError(
      "analyze_javascript_application",
      undefined,
      issues,
    );
  const unavailablePath = sourcePaths?.find((path) =>
    inventory.unavailableFiles.has(path),
  );
  if (unavailablePath !== undefined)
    throw new ArtifactReaderFailure(
      "unavailable",
      `Selected inventoried source bytes are unavailable: ${unavailablePath}`,
      {
        partialObservation: { kind: "artifact-inventory", inventory: snapshot },
      },
    );
  if (reader instanceof AsarArtifactReader) {
    const root = snapshot.nodes.find(
      ({ artifact_id }) => artifact_id === snapshot.manifest.root_artifact_id,
    );
    if (root === undefined)
      throw new ArtifactReaderFailure(
        "integrity",
        "Root artifact node is missing",
      );
    await verifyEntryBytes(
      await reader.openContainer(signal),
      { path: ".", sha256: root.sha256, bytes: root.size },
      signal,
    );
  }
  const context: ReadContext = {
    resources,
    expected,
    expectedContainers: inventory.containers,
    registry: new ArtifactPathRegistry(),
    files: [],
    containers: [],
    signal,
    selectedPaths,
    textBytes: 0,
    invalidUtf8: 0,
  };
  await visitReader(reader, "", snapshot.manifest.root_sha256, context);
  const files = context.files.sort((left, right) => {
    const leftPriority = selectedPaths?.get(left.path) ?? Infinity;
    const rightPriority = selectedPaths?.get(right.path) ?? Infinity;
    if (leftPriority !== rightPriority) return leftPriority - rightPriority;
    return compareUnicodeCodePoints(left.path, right.path);
  });
  const unanalyzedFiles = createUnanalyzedArtifactLookup(
    snapshot,
    context.containers,
  );
  const unavailableRelevantFiles = [...inventory.unavailableFiles]
    .sort(compareUnicodeCodePoints)
    .flatMap((path) => {
      const unavailable = unanalyzedFiles.get(path);
      return unavailable === undefined ? [] : [unavailable];
    });
  assertExpectedFilesWereVisited(expected, files);
  return {
    files,
    unanalyzed_files: unanalyzedFiles,
    unavailable_relevant_files: unavailableRelevantFiles,
    containers: context.containers.sort((left, right) =>
      compareUnicodeCodePoints(left.path, right.path),
    ),
    text_bytes_read: context.textBytes,
    invalid_utf8_files: context.invalidUtf8,
    ...(sourcePaths === undefined
      ? {}
      : {
          source_selection: {
            requested_paths: [...sourcePaths],
            unselected_files: files.filter(
              ({ text }) =>
                !text.included && text.reason === "outside-analysis-scope",
            ).length,
          },
        }),
  };
};

const visitReader = async (
  reader: ArtifactReader,
  prefix: string,
  containerSha256: string,
  context: ReadContext,
): Promise<void> => {
  const stack: Array<{
    readonly reader: ArtifactReader;
    readonly prefix: string;
    readonly containerSha256: string;
    readonly iterator: AsyncIterator<ArtifactEntry>;
  }> = [
    {
      reader,
      prefix,
      containerSha256,
      iterator: reader.entries(context.signal)[Symbol.asyncIterator](),
    },
  ];
  const ownedReaders: {
    readonly reader: ArtifactReader;
    readonly path: string;
  }[] = [];
  let failure: { readonly cause: unknown } | undefined;
  try {
    while (stack.length > 0) {
      const frame = stack.at(-1);
      if (frame === undefined) break;
      const next = await frame.iterator.next();
      if (next.done) {
        stack.pop();
        continue;
      }
      const entry = next.value;
      abortIfNeeded(context.signal);
      const path = normalizeArtifactPath(
        frame.prefix === "" ? entry.path : `${frame.prefix}/${entry.path}`,
      );
      const nestedAsar = isFilesystemAsar(entry, path);
      context.registry.add(path, nestedAsar ? "directory" : entry.kind);
      if (nestedAsar) {
        const container = context.expectedContainers.get(path);
        // Inventory deliberately does not expand unverified or unavailable
        // nested archives. Keep the same boundary here when reconstruction
        // reads the active entries again.
        if (container === undefined)
          throw new ArtifactReaderFailure(
            "integrity",
            `Nested ASAR was not present in inventory: ${path}`,
          );
        if (container.hash_status === "mismatched") continue;
        if (container.hash_status === "unavailable")
          throw new ArtifactReaderFailure(
            "unavailable",
            `Nested ASAR bytes were unavailable during inventory: ${path}`,
          );
        if (container.hash_status !== "verified")
          throw new ArtifactReaderFailure(
            "integrity",
            `Nested ASAR was not integrity-verified: ${path}`,
          );
        // Inventory expands an ASAR-named file only when its bytes are an
        // ASAR. One it recorded as ordinary bytes has no members to read.
        if (container.format !== "asar") continue;
        const inventory = container.inventory;
        if (inventory === null)
          throw new ArtifactReaderFailure(
            "integrity",
            `Verified nested ASAR has no inventory node: ${path}`,
          );
        await verifyEntryBytes(
          await frame.reader.open(entry, context.signal),
          inventory,
          context.signal,
        );
        context.containers.push(inventory);
        const nested = new AsarArtifactReader(entry.adapterKey);
        ownedReaders.push({ reader: nested, path });
        stack.push({
          reader: nested,
          prefix: path,
          containerSha256: inventory.sha256,
          iterator: nested.entries(context.signal)[Symbol.asyncIterator](),
        });
        await nested.prepareContainer(inventory.sha256, context.signal);
        continue;
      }
      const expected = context.expected.get(path);
      if (expected === undefined) continue;
      const text = await readText(context, {
        reader: frame.reader,
        entry,
        expected,
      });
      context.files.push({
        path,
        container_sha256: frame.containerSha256,
        sha256: expected.sha256,
        bytes: expected.bytes,
        inventory_artifact_id: expected.inventoryArtifactId,
        kind: expected.kind,
        unpacked: entry.unpacked,
        text,
      });
    }
  } catch (cause: unknown) {
    failure = { cause };
  } finally {
    for (const { iterator, prefix, reader } of stack.reverse()) {
      try {
        await iterator.return?.();
      } catch (cause: unknown) {
        failure = {
          cause: ArtifactReaderFailure.withCleanup(
            failure === undefined ? cause : failure.cause,
            ArtifactReaderFailure.cleanupObservation(
              cause,
              `JavaScript artifact traversal for ${prefix || reader.format}`,
            ),
          ),
        };
      }
    }
    for (const owned of ownedReaders.reverse()) {
      const resource = `nested ASAR reader for ${owned.path}`;
      const cleanup = await context.resources.release({
        kind: "reader",
        reader: owned.reader,
        resource,
      });
      if (cleanup.kind === "failed") {
        failure = {
          cause: ArtifactReaderFailure.withCleanup(
            failure === undefined ? cleanup.cause : failure.cause,
            ArtifactReaderFailure.cleanupObservation(cleanup.cause, resource),
          ),
        };
      }
    }
  }
  if (failure !== undefined) throw failure.cause;
};

const readText = async (
  context: ReadContext,
  input: ReadTextInput,
): Promise<JavaScriptArtifactFile["text"]> => {
  if (
    context.selectedPaths !== undefined &&
    !context.selectedPaths.has(input.expected.path)
  ) {
    // Keep the inventory/acquisition identity check without allocating or
    // decoding an unrelated source's text.
    await verifyEntryBytes(
      await input.reader.open(input.entry, context.signal),
      input.expected,
      context.signal,
    );
    return { included: false, reason: "outside-analysis-scope" };
  }
  if (input.expected.kind === "native-addon") {
    await verifyEntryBytes(
      await input.reader.open(input.entry, context.signal),
      input.expected,
      context.signal,
    );
    return { included: false, reason: "not-applicable" };
  }
  const bytes = await readAll(
    await input.reader.open(input.entry, context.signal),
    context.signal,
  );
  const digest = createHash("sha256").update(bytes).digest("hex");
  if (digest !== input.expected.sha256 || bytes.length !== input.expected.bytes)
    throw new ArtifactReaderFailure(
      "integrity",
      `Artifact entry changed after inventory: ${input.expected.path}`,
    );
  context.textBytes += bytes.length;
  try {
    return {
      included: true,
      value: new TextDecoder("utf-8", {
        fatal: true,
        ignoreBOM:
          input.expected.kind === "javascript" ||
          input.expected.kind === "html",
      }).decode(bytes),
    };
  } catch (cause: unknown) {
    // Non-UTF8 bytes are counted; the fixed reason preserves the schema.
    void cause;
    context.invalidUtf8 += 1;
    return { included: false, reason: "invalid-utf8" };
  }
};

const verifyEntryBytes = async (
  stream: Readable,
  expected: Pick<ExpectedFile, "path" | "sha256" | "bytes">,
  signal?: AbortSignal,
): Promise<void> => {
  try {
    const digest = await hashReadable(stream, signal);
    if (digest.sha256 !== expected.sha256 || digest.bytes !== expected.bytes)
      throw new ArtifactReaderFailure(
        "integrity",
        `Artifact entry changed after inventory: ${expected.path}`,
      );
  } catch (cause: unknown) {
    abortIfNeeded(signal);
    throw cause;
  }
};

