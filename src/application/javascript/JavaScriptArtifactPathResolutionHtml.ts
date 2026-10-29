import { isBuiltin } from "node:module";
import { posix } from "node:path";

import {
  normalizeJoinedLogicalPath,
  logicalPathEscapesRoot,
} from "../../domain/artifactIdentity.js";
import type {
  JavaScriptArtifactFile,
  JavaScriptUnanalyzedArtifactLookup,
} from "../../domain/javascript/javascriptArtifactFiles.js";
import {
  admitsCanonicalPathSyntax,
  hasScheme,
  htmlUrlText,
  looksExternal,
  percentDecodeUrlPath,
  stripQueryAndFragment,
} from "../../domain/artifactPathSyntax.js";
import {
  classifyPackageImportSpecifier,
  classifyPackageImportTargetString,
  lookupExactPackageImport,
} from "../../domain/javascript/javascriptPackageImportAliases.js";
import {
  typescriptEmittedSourceCandidates,
  type TypeScriptEmittedSourceCandidate,
} from "../TypeScriptEmittedSourceCandidates.js";
import { isRelativeJavaScriptModuleSpecifier } from "../../domain/javascript/javascriptModuleSpecifier.js";
import type { JavaScriptModuleResolutionMode } from "../../domain/javascript/javascriptModuleResolutionMode.js";
import type { JsonValue } from "../../domain/jsonValue.js";
import { err, ok, type Result } from "../../domain/result.js";

type ArtifactPathResolutionContext = "package-entrypoint";

// JavaScriptArtifactPathResolutionHtml.ts 1112-1448
const htmlCandidate = (
  input: ResolveArtifactPathInput,
): string | CandidateResolution => {
  const declared = stripQueryAndFragment(htmlUrlText(input.declaredPath));
  // HTML owns URL-text normalization and pathname admission. A nonempty URL
  // reference may have no pathname; suffix bytes remain declaration evidence.
  // HTML references are URL text, so percent bytes still encode.
  const rejected = rejectDeclaration(
    declared,
    false,
    input.declaredPath !== "",
  );
  if (rejected !== null) return rejected;
  if (looksExternal(declared))
    return unresolvedCandidate("external", [
      "External HTML references are not mapped to local artifact assets.",
    ]);
  const rawBase = input.htmlBaseHref;
  const base =
    rawBase === undefined || rawBase === null
      ? rawBase
      : stripQueryAndFragment(htmlUrlText(rawBase));
  if (base !== undefined && base !== null && looksExternal(base))
    return unresolvedCandidate("external", [
      "The document base href is external, so its script reference is not a local artifact path.",
    ]);
  const declaredPath = percentDecodeUrlPath(declared);
  if (declaredPath === null)
    return unresolvedCandidate("rejected", [
      "The HTML reference path percent-decodes to NUL or to bytes that are not UTF-8.",
    ]);
  if (declaredPath.startsWith("/"))
    return urlRelativeCandidate("", declaredPath);
  if (base === undefined || base === null || base === "")
    return declaredPath === ""
      ? input.sourcePath
      : urlRelativeCandidate(posix.dirname(input.sourcePath), declaredPath);
  // A local base href is a second untrusted path input; apply the same
  // admission rules a declared path gets so it cannot smuggle traversal or
  // separator syntax past canonicalization.
  if (!admitsCanonicalPathSyntax(base))
    return unresolvedCandidate("rejected", [
      "The document base href uses NUL, backslash, or encoded dot and separator bytes that are not admitted for canonical artifact paths.",
    ]);
  const decodedBase = percentDecodeUrlPath(base);
  if (decodedBase === null)
    return unresolvedCandidate("rejected", [
      "The document base href path percent-decodes to NUL or to bytes that are not UTF-8.",
    ]);
  // Keep the base's empty segments and escapes until the reference is
  // applied; only the final path must name a canonical artifact file.
  const baseState = applyUrlReference(
    urlDirectoryState(posix.dirname(input.sourcePath)),
    decodedBase,
  );
  if (declaredPath === "") {
    const basePath = urlPathCandidate(baseState);
    return typeof basePath === "string"
      ? exactUrlPathCandidate(decodedBase, basePath, "HTML")
      : basePath;
  }
  return urlPathCandidate(
    applyUrlReference(urlBaseDirectory(baseState), declaredPath),
  );
};

const exactUrlPathCandidate = (
  declared: string,
  candidate: string,
  kind: "HTML" | "URL" | "module URL",
): string | CandidateResolution => {
  if (!urlPathIsDirectory(declared)) return candidate;
  const confined = confineCandidate(candidate);
  if (typeof confined !== "string") return confined;
  return unresolvedCandidate("not-found", [
    `The ${kind} reference resolves to directory ${confined || "."}, not an exact selected application file.`,
  ]);
};

/** Whether a URL path retains directory form after dot-segment normalization. */
const urlPathIsDirectory = (path: string): boolean =>
  path.endsWith("/") ||
  path.endsWith("/.") ||
  path.endsWith("/..") ||
  path === "." ||
  path === "..";

const confineCandidate = (candidate: string): string | CandidateResolution => {
  const normalized = normalizeJoinedLogicalPath(candidate);
  if (logicalPathEscapesRoot(normalized))
    return unresolvedCandidate("rejected", [
      "The resolved candidate escapes the canonical artifact root.",
    ]);
  return normalized === "." ? "" : normalized;
};

type PackageMetadata =
  | {
      readonly kind: "available";
      readonly path: string;
      readonly name: string | undefined;
      readonly exports: string | object | undefined;
      readonly imports: object | undefined;
      readonly main: unknown;
      readonly module: unknown;
    }
  | { readonly kind: "absent" }
  | { readonly kind: "unavailable"; readonly limitation: string };

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
