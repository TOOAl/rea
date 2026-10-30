// removed unused import: import { isBuiltin } from "node:module";  // isBuiltin unused
import { posix } from "node:path";

import type {
  JavaScriptArtifactFile,
  JavaScriptUnanalyzedArtifactLookup,
} from "../../domain/javascript/javascriptArtifactFiles.js";
import {
  classifyPackageImportSpecifier,
  classifyPackageImportTargetString,
  lookupExactPackageImport,
} from "../../domain/javascript/javascriptPackageImportAliases.js";
import type { TypeScriptEmittedSourceCandidate } from "../TypeScriptEmittedSourceCandidates.js";
// removed unused import: import { isRelativeJavaScriptModuleSpecifier } from "../../domain/javascript/javascriptModuleSpecifier.js";  // isRelativeJavaScriptModuleSpecifier unused
import type { JsonValue } from "../../domain/jsonValue.js";
// removed unused import: import { type Result } from "../../domain/result.js";  // Result unused

const readPackageMetadata = (
  input: ResolveArtifactPathInput,
  directory: string,
): PackageMetadata => {
  const path = posix.join(directory, "package.json");
  const file = input.files.get(path);
  const source = input.files.get(input.sourcePath);
  if (file === undefined) {
    const unavailable = input.unanalyzedFiles?.get(path);
    if (
      source !== undefined &&
      unavailable?.container_sha256 === source.container_sha256
    )
      return {
        kind: "unavailable",
        limitation:
          unavailable.limitations?.[0] ??
          `Directory package metadata ${path} was inventoried but its bytes are unavailable.`,
      };
    return { kind: "absent" };
  }
  if (source !== undefined && file.container_sha256 !== source.container_sha256)
    return { kind: "absent" };
  if (!file.text.included)
    return {
      kind: "unavailable",
      limitation: `Directory package metadata ${path} was inventoried but its text is unavailable: ${file.text.reason}.`,
    };
  let value: unknown;
  try {
    value = JSON.parse(file.text.value);
  } catch (cause: unknown) {
    void cause;
    return {
      kind: "unavailable",
      limitation: `Directory package metadata ${path} is not valid package JSON.`,
    };
  }
  if (typeof value !== "object" || value === null)
    return {
      kind: "unavailable",
      limitation: `Directory package metadata ${path} is not valid package JSON.`,
    };
  const name = Reflect.get(value, "name");
  const exports = Reflect.get(value, "exports");
  const imports = Reflect.get(value, "imports");
  const main = Reflect.get(value, "main");
  return {
    kind: "available",
    path,
    name: typeof name === "string" ? name : undefined,
    // Node's package reader ignores scalar root exports other than strings.
    // Nested targets retain their raw values for exports validation.
    exports:
      typeof exports === "string" ||
      (typeof exports === "object" && exports !== null)
        ? exports
        : undefined,
    // Import maps must be non-array objects; other shapes are not a map.
    imports:
      typeof imports === "object" && imports !== null && !Array.isArray(imports)
        ? imports
        : undefined,
    main:
      input.moduleKind !== undefined && typeof main !== "string"
        ? undefined
        : main,
    module: Reflect.get(value, "module"),
  };
};

/** File and directory lookup never interprets a nested directory's exports. */
const resolveCandidate = (
  input: ResolveArtifactPathInput,
  candidate: string,
  packageChain: ReadonlySet<string>,
  emittedSourceCandidates: readonly TypeScriptEmittedSourceCandidate[] = [],
): CandidateResolution => {
  if (!commonJsDirectoryRequest(input)) {
    const file =
      resolveFileCandidates(
        input,
        fileCandidates(candidate, input.moduleKind),
      ) ??
      resolveRuntimeSourceCandidates(input, candidate, emittedSourceCandidates);
    if (file !== null) return file;
  }
  return resolveDirectory(
    input,
    candidate,
    readPackageMetadata(input, candidate),
    packageChain,
  );
};

const commonJsDirectoryRequest = (input: ResolveArtifactPathInput): boolean =>
  input.context === "module-specifier" &&
  input.moduleKind === "require" &&
  (input.declaredPath.endsWith("/") ||
    /(?:^|\/)\.{1,2}$/u.test(input.declaredPath));

const resolveDirectory = (
  input: ResolveArtifactPathInput,
  directory: string,
  metadata: PackageMetadata,
  packageChain: ReadonlySet<string>,
): CandidateResolution => {
  if (metadata.kind === "absent")
    return (
      resolveFileCandidates(
        input,
        indexCandidates(directory, input.moduleKind),
      ) ?? notFoundCandidate()
    );
  if (metadata.kind === "unavailable")
    return unresolvedCandidate("unavailable", [metadata.limitation]);
  if (packageChain.has(metadata.path))
    return unresolvedCandidate("unavailable", [
      `Directory package entrypoint cycle includes ${metadata.path}.`,
    ]);
  const entry =
    metadata.main === ""
      ? undefined
      : metadata.main !== undefined
        ? metadata.main
        : input.moduleKind === undefined
          ? metadata.module
          : undefined;
  if (entry === undefined)
    return (
      resolveFileCandidates(
        input,
        indexCandidates(directory, input.moduleKind),
      ) ?? notFoundCandidate()
    );
  if (typeof entry !== "string" || entry.length === 0)
    return unresolvedCandidate("unavailable", [
      `Directory package metadata ${metadata.path} is not valid package JSON.`,
    ]);
  const entryInput: ResolveArtifactPathInput = {
    declaredPath: entry,
    sourcePath: metadata.path,
    context: "package-entrypoint",
    files: input.files,
    ...(input.directoryPaths === undefined
      ? {}
      : { directoryPaths: input.directoryPaths }),
    ...(input.unanalyzedFiles === undefined
      ? {}
      : { unanalyzedFiles: input.unanalyzedFiles }),
    ...(input.moduleKind === undefined ? {} : { moduleKind: input.moduleKind }),
  };
  const candidate = contextualCandidate(entryInput);
  if (typeof candidate !== "string") return candidate;
  const confined = confineCandidate(candidate);
  if (typeof confined !== "string") return confined;
  if (input.moduleKind !== undefined)
    return resolveNodePackageMain(entryInput, directory, confined);
  const selected =
    resolveFileCandidates(entryInput, [
      ...fileCandidates(confined, entryInput.moduleKind),
      ...indexCandidates(confined, entryInput.moduleKind),
    ]) ??
    resolveFileCandidates(input, indexCandidates(directory, input.moduleKind));
  if (selected !== null) return selected;
  return resolveCandidate(
    entryInput,
    confined,
    new Set([...packageChain, metadata.path]),
  );
};

const resolveNodePackageMain = (
  input: ResolveArtifactPathInput,
  directory: string,
  mainPath: string,
): CandidateResolution => {
  const normalizedMain = mainPath.replace(/\/$/u, "");
  for (const suffix of NODE_PACKAGE_MAIN_SUFFIXES) {
    const isDirectoryIndex = suffix.startsWith("/");
    if (normalizedMain === "" && !isDirectoryIndex) continue;
    const selected = resolveFileCandidates(input, [
      isDirectoryIndex
        ? posix.join(normalizedMain, suffix.slice(1))
        : posix.normalize(`${normalizedMain}${suffix}`),
    ]);
    if (selected === null) continue;
    if (input.moduleKind === "require") return selected;
    // ESM probes the normalized main, then appends the selected suffix to
    // the original declaration before finalizing the resulting file path.
    const finalized = confineCandidate(
      relativeCandidate(input.sourcePath, `${input.declaredPath}${suffix}`),
    );
    if (typeof finalized !== "string") return finalized;
    const finalizedFile = resolveFileCandidates(input, [
      finalized.replace(/\/$/u, ""),
    ]);
    if (finalizedFile !== null) return finalizedFile;
    const source = input.files.get(input.sourcePath);
    if (
      hasContainerDirectory(
        input.files,
        finalized,
        source?.container_sha256,
        input.directoryPaths,
        input.unanalyzedFiles,
      )
    )
      return {
        ...unresolvedCandidate("rejected", [
          `The selected legacy ESM package main finalizes to directory ${finalized}; directory imports are unsupported and no later main or index candidate was tried.`,
        ]),
        candidatePath: finalized,
      };
    return unresolvedCandidate("not-found", [
      `The selected legacy ESM package main finalizes to ${finalized}, which is not an inventoried file; no later main or index candidate was tried.`,
    ]);
  }
  const fallback = resolveFileCandidates(
    input,
    indexCandidates(directory, input.moduleKind),
  );
  if (fallback !== null) return fallback;
  return input.moduleKind === "require"
    ? { ...notFoundCandidate(), stopsAncestorLookup: true }
    : notFoundCandidate();
};
