import { posix } from "node:path";

import {
  compareUnicodeCodePoints,
  compositeKey,
} from "../unicodeCodePointOrder.js";
import type {
  SourceToBundleCandidate,
  SourceToBundleSignal,
} from "./sourceToBundleComparisonSchemas.js";

const candidateSignals = (
  source: SourceFile,
  current: CurrentProjection,
): SourceToBundleSignal[] => {
  const signals: SourceToBundleSignal[] = [];
  if (source.sha256 !== null && current.digests.has(source.sha256))
    signals.push(signal("exact-source-digest", source.sha256, [source.sha256]));
  const sourceMapPaths = matchingPaths(
    source.path,
    current.paths.filter(({ kind }) => kind === "source-map-original"),
  );
  if (sourceMapPaths.length > 0)
    signals.push(
      signal("source-map-original-path", source.path, sourceMapPaths),
    );
  const unicodeEquivalentPaths = matchingUnicodePaths(
    source.path,
    current.paths,
  );
  if (unicodeEquivalentPaths.length > 0)
    signals.push(
      signal("unicode-equivalent-path", source.path, unicodeEquivalentPaths),
    );
  const otherPaths = current.paths.filter(
    ({ kind }) => kind !== "source-map-original",
  );
  const exactPaths = otherPaths
    .filter(({ value }) => value === source.path)
    .map(({ value }) => value);
  if (exactPaths.length > 0)
    signals.push(signal("current-path-exact", source.path, exactPaths));
  const suffixPaths = otherPaths
    .filter(
      ({ value, allowSuffix }) =>
        allowSuffix &&
        value !== source.path &&
        value.endsWith(`/${source.path}`),
    )
    .map(({ value }) => value);
  if (suffixPaths.length > 0)
    signals.push(signal("current-path-suffix", source.path, suffixPaths));
  const basename = posix.basename(source.path);
  const basenamePaths = current.paths
    .filter(({ value }) => posix.basename(value) === basename)
    .map(({ value }) => value);
  if (basenamePaths.length > 0)
    signals.push(signal("basename-match", basename, basenamePaths));
  const extension = posix.extname(source.path).toLowerCase();
  const extensionPaths = current.paths
    .filter(({ value }) => posix.extname(value).toLowerCase() === extension)
    .map(({ value }) => value);
  if (extension !== "" && extensionPaths.length > 0)
    signals.push(signal("language-extension", extension, extensionPaths));
  return signals;
};

const signal = (
  kind: SourceToBundleSignal["kind"],
  sourceValue: string,
  currentValues: readonly string[],
): SourceToBundleSignal => ({
  kind,
  weight: signalWeight(kind),
  source_value: sourceValue,
  current_values: [...new Set(currentValues)].sort(compareUnicodeCodePoints),
});

const candidateConfidence = (
  signals: readonly SourceToBundleSignal[],
): SourceToBundleCandidate["confidence"] => {
  const kinds = new Set(signals.map(({ kind }) => kind));
  if (kinds.has("exact-source-digest")) return "exact";
  if (kinds.has("source-map-original-path") || kinds.has("current-path-exact"))
    return "high";
  return kinds.has("current-path-suffix") ? "medium" : "low";
};

const matchingPaths = (
  sourcePath: string,
  currentPaths: readonly CurrentPath[],
): string[] =>
  currentPaths
    .filter(
      ({ value, allowSuffix }) =>
        value === sourcePath ||
        (allowSuffix && value.endsWith(`/${sourcePath}`)),
    )
    .map(({ value }) => value);

const matchingUnicodePaths = (
  sourcePath: string,
  currentPaths: readonly CurrentPath[],
): string[] => {
  const canonicalSource = sourcePath.normalize("NFC");
  return currentPaths
    .filter(({ value, allowSuffix }) => {
      if (
        value === sourcePath ||
        (allowSuffix && value.endsWith(`/${sourcePath}`))
      )
        return false;
      const canonicalValue = value.normalize("NFC");
      return (
        canonicalValue === canonicalSource ||
        (allowSuffix && canonicalValue.endsWith(`/${canonicalSource}`))
      );
    })
    .map(({ value }) => value);
};

const addJsonPath = (
  paths: CurrentPath[],
  value: unknown,
  format: "artifact" | "reference",
): void => {
  if (typeof value === "string")
    addPath(paths, "observation-path", value, format);
};

const addPath = (
  paths: CurrentPath[],
  kind: CurrentPathKind,
  raw: string,
  format: "artifact" | "reference",
): void => {
  const value = normalizeCurrentPath(raw, format);
  if (value !== null) paths.push({ kind, value, allowSuffix: true });
};

const SCHEME_URL = /^[a-z][a-z0-9+.-]*:\/\//iu;
const SCHEME_URL_PREFIX = /^[a-z][a-z0-9+.-]*:\/\/+/iu;

const normalizeCurrentPath = (
  raw: string,
  format: "artifact" | "reference",
): string | null => {
  const withoutQuery =
    format === "reference" && SCHEME_URL.test(raw)
      ? (raw.split(/[?#]/u, 1)[0] ?? "")
      : raw;
  const portable =
    format === "artifact"
      ? withoutQuery
      : withoutQuery.replace(SCHEME_URL_PREFIX, "").replaceAll("\\", "/");
  const parts: string[] = [];
  for (const part of portable.split("/")) {
    if (part === "" || part === ".") continue;
    if (part === "..") {
      if (parts.length === 0) return null;
      parts.pop();
    } else parts.push(part);
  }
  if (parts.length === 0) return null;
  return parts.join("/");
};

const uniquePaths = (paths: readonly CurrentPath[]): CurrentPath[] =>
  [
    ...new Map(
      paths.map((path) => [
        compositeKey([path.kind, path.value, String(path.allowSuffix)]),
        path,
      ]),
    ).values(),
  ].sort((left, right) =>
    compareUnicodeCodePoints(
      compositeKey([left.kind, left.value]),
      compositeKey([right.kind, right.value]),
    ),
  );

const pathSuffixes = (path: string): string[] => {
  const parts = path.split("/");
  return parts.map((_, index) => parts.slice(index).join("/"));
};

const addIndexValue = (
  index: Map<string, Set<string>>,
  key: string,
  nodeId: string,
): void => {
  const values = index.get(key) ?? new Set<string>();
  values.add(nodeId);
  index.set(key, values);
};
