import { posix, win32 } from "node:path";

import type { ApplicationNode } from "./javascriptApplicationGraphSchemas.js";
import {
  logicalPathEscapesRoot,
  normalizeJoinedLogicalPath,
} from "../artifactIdentity.js";
import { compareUnicodeCodePoints } from "../unicodeCodePointOrder.js";
import type { ParsedStaticLayer } from "./javascriptRuntimeReconciliationParsing.js";
import type { RuntimeReconciliationEntity } from "./javascriptRuntimeReconciliationRuntime.js";

const usesApplicationFileDeclaration = (node: ApplicationNode): boolean =>
  node.kind === "electron-renderer" &&
  !hasOwnedArtifactPath(node) &&
  node.observations.some(isRawApplicationFileObservation);

const nativeDeclarationPaths = (
  node: ApplicationNode,
): StaticRuntimeCandidate["nativeDeclarationPaths"] => {
  if (hasOwnedArtifactPath(node)) return { posix: [], windows: [] };
  const declarations = node.observations.flatMap((observation) => {
    const { properties } = observation;
    return properties.resolution_context === "filesystem-expression" &&
      typeof properties.declared_path === "string" &&
      (isRawApplicationFileObservation(observation) ||
        properties.declared_path.includes("\\"))
      ? [
          {
            path: properties.declared_path,
            sourcePath: nativeDeclarationSource(observation),
          },
        ]
      : [];
  });
  const normalized = (windows: boolean) => {
    const values = declarations.flatMap(({ path, sourcePath }) => {
      if (windows && (win32.isAbsolute(path) || /^[a-z]:/iu.test(path)))
        return [];
      const normalizedPath = relativeLogicalPath(
        windows ? path.replaceAll("\\", "/") : path,
      );
      return normalizedPath === null
        ? []
        : [{ path: normalizedPath, sourcePath }];
    });
    return [
      ...new Map(
        values.map((value) => [JSON.stringify(value), value]),
      ).values(),
    ].sort(
      (left, right) =>
        compareUnicodeCodePoints(left.path, right.path) ||
        compareUnicodeCodePoints(left.sourcePath ?? "", right.sourcePath ?? ""),
    );
  };
  return { posix: normalized(false), windows: normalized(true) };
};

// A source anchor constrains the selected application namespace; it does not
// supply a module-relative base for the raw filesystem declaration.
const nativeDeclarationSource = (
  observation: ApplicationNode["observations"][number],
): string | null => {
  const location = observation.evidence.location;
  if (!location.available) return null;
  const source =
    location.value.kind === "source-range"
      ? location.value.source
      : location.value.kind === "artifact-path"
        ? location.value.path
        : null;
  return source === null || source === "artifact-root"
    ? null
    : relativeLogicalPath(source);
};

const candidateDigests = (
  node: ApplicationNode,
): StaticRuntimeCandidate["digests"] => {
  const values: StaticRuntimeCandidate["digests"][number][] = [];
  if (
    node.kind === "javascript-asset" &&
    node.identity.strategy === "content-digest"
  )
    values.push({
      sha256: node.identity.sha256,
      basis: "content-sha256",
    });
  if (node.kind === "javascript-module")
    for (const observation of node.observations) {
      const digest = observation.properties.source_sha256;
      if (typeof digest === "string" && /^[a-f0-9]{64}$/u.test(digest))
        values.push({ sha256: digest, basis: "module-source-sha256" });
    }
  return [
    ...new Map(
      values.map((value) => [`${value.basis}:${value.sha256}`, value]),
    ).values(),
  ];
};

const pathBelowRoot = (root: string, value: string): string | null => {
  const rootStyle = absoluteFilePathStyle(root);
  if (rootStyle === null || rootStyle !== absoluteFilePathStyle(value))
    return null;
  const remainder =
    rootStyle === "windows"
      ? win32.relative(root, value)
      : posix.relative(root, value);
  const portableRemainder =
    rootStyle === "windows" ? remainder.replaceAll("\\", "/") : remainder;
  if (
    remainder === "" ||
    (rootStyle === "windows" && win32.isAbsolute(remainder)) ||
    portableRemainder === ".." ||
    portableRemainder.startsWith("../")
  )
    return null;
  return relativeLogicalPath(portableRemainder);
};

const absoluteFilePathStyle = (path: string): "posix" | "windows" | null => {
  if (
    /^[a-z]:[\\/]/iu.test(path) ||
    /^(?:\\\\|\/\/)[^\\/]+[\\/][^\\/]+(?:[\\/]|$)/u.test(path)
  )
    return "windows";
  return path.startsWith("/") ? "posix" : null;
};

const pathBelowUrlPrefix = (prefix: string, value: string): string | null => {
  let base: URL;
  let candidate: URL;
  try {
    base = new URL(prefix);
    candidate = new URL(value);
  } catch (cause: unknown) {
    // Invalid input is represented by the null return.
    void cause;
    return null;
  }
  if (
    base.origin !== candidate.origin ||
    !candidate.pathname.startsWith(base.pathname)
  )
    return null;
  try {
    return relativeLogicalPath(
      decodeURIComponent(candidate.pathname.slice(base.pathname.length)),
    );
  } catch (cause: unknown) {
    // Undecodable path segments are represented by the null return.
    void cause;
    return null;
  }
};

const activeArtifactPrefixes = (
  layer: ParsedStaticLayer,
  entities: readonly RuntimeReconciliationEntity[],
): string[] => {
  const prefixes = new Set<string>();
  if (
    layer.result.format === "directory" &&
    entities.some(
      ({ location }) =>
        location.kind === "file" &&
        pathBelowRoot(layer.result.input_path, location.value) !== null,
    )
  )
    prefixes.add("");
  for (const mapping of layer.runtimeMappings)
    if (
      entities.some(({ location }) =>
        mapping.kind === "file-root" && location.kind === "file"
          ? pathBelowRoot(mapping.root, location.value) !== null
          : mapping.kind === "url-prefix" && location.kind === "url"
            ? pathBelowUrlPrefix(mapping.prefix, location.value) !== null
            : false,
      )
    )
      prefixes.add(normalizeArtifactPrefix(mapping.artifact_prefix));
  return [...prefixes].sort(compareUnicodeCodePoints);
};

const normalizeArtifactPrefix = (prefix: string): string =>
  prefix === "" ? "" : normalizeJoinedLogicalPath(prefix);

const pathWithinPrefix = (path: string, prefix: string): boolean =>
  prefix === "" || path === prefix || path.startsWith(`${prefix}/`);

const safeArtifactPath = (prefix: string, suffix: string): string | null =>
  relativeLogicalPath(prefix === "" ? suffix : posix.join(prefix, suffix));

const relativeLogicalPath = (value: string): string | null => {
  // These are artifact names or already parsed runtime paths, not declarations.
  const normalized = normalizeJoinedLogicalPath(value);
  return normalized !== "" &&
    normalized !== "." &&
    !logicalPathEscapesRoot(normalized)
    ? normalized
    : null;
};

const uniqueMappedPaths = (
  values: readonly MappedRuntimePath[],
): MappedRuntimePath[] =>
  [
    ...new Map(
      values.map((value) => [
        JSON.stringify([
          value.basis,
          value.path,
          value.fileStyle,
          value.nativeRelativePath,
          value.artifactPrefix,
        ]),
        value,
      ]),
    ).values(),
  ].sort(
    (left, right) =>
      compareUnicodeCodePoints(left.path, right.path) ||
      compareUnicodeCodePoints(left.basis, right.basis) ||
      compareUnicodeCodePoints(
        left.nativeRelativePath ?? "",
        right.nativeRelativePath ?? "",
      ) ||
      compareUnicodeCodePoints(left.artifactPrefix, right.artifactPrefix),
  );
