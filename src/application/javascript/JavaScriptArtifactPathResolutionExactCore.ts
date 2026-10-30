// removed unused import: import { isBuiltin } from "node:module";  // isBuiltin unused
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
  type _TypeScriptEmittedSourceCandidate,
} from "../TypeScriptEmittedSourceCandidates.js";
// removed unused import: import { isRelativeJavaScriptModuleSpecifier } from "../../domain/javascript/javascriptModuleSpecifier.js";  // isRelativeJavaScriptModuleSpecifier unused
import type { JavaScriptModuleResolutionMode } from "../../domain/javascript/javascriptModuleResolutionMode.js";
import type { JsonValue } from "../../domain/jsonValue.js";
// removed unused import: import { type Result } from "../../domain/result.js";  // Result unused

type _ArtifactPathResolutionContext = "package-entrypoint";

// JavaScriptArtifactPathResolutionExact.ts 1449-1827
const _resolveFileCandidates = (
  input: ResolveArtifactPathInput,
  candidates: readonly string[],
): CandidateResolution | null => {
  for (const path of candidates) {
    const selected = findFileCandidate(input, path);
    if (selected === null) continue;
    return selected.status === "resolved" &&
      isRuntimeDeclarationPath(input, path)
      ? {
          resolvedPath: null,
          status: "unavailable",
          candidatePath: path,
          limitations: [
            `The TypeScript declaration ${path} is compile-time evidence and cannot identify a runtime module implementation.`,
          ],
        }
      : selected;
  }
  return null;
};

/** Own candidate presence and container identity independently of loader policy. */
const findFileCandidate = (
  input: ResolveArtifactPathInput,
  path: string,
): CandidateResolution | null => {
  const source = input.files.get(input.sourcePath);
  const target = input.files.get(path);
  if (
    target !== undefined &&
    (source === undefined ||
      target.container_sha256 === source.container_sha256)
  )
    return { resolvedPath: path, status: "resolved", limitations: [] };
  const unanalyzed = input.unanalyzedFiles?.get(path);
  if (
    unanalyzed !== undefined &&
    (source === undefined ||
      unanalyzed.container_sha256 === source.container_sha256)
  )
    return {
      resolvedPath: null,
      status: "unavailable",
      candidatePath: path,
      limitations: [
        ...(unanalyzed.limitations ?? []),
        unanalyzed.kind === undefined
          ? `${path} exists in the inventoried artifact container (sha256 ${unanalyzed.sha256 ?? "unknown"}, ${unanalyzed.bytes === null ? "unknown size" : `${String(unanalyzed.bytes)} bytes`}) but is not a JavaScript, JSON, HTML, source map, or native add-on file; its contents were not analyzed.`
          : `${path} is an inventoried ${unanalyzed.kind} file, but its bytes are unavailable (hash status ${unanalyzed.hash_status ?? "unknown"}); resolution cannot be confirmed.`,
      ],
    };
  return null;
};

const isRuntimeDeclarationPath = (
  input: ResolveArtifactPathInput,
  path: string,
): boolean =>
  input.moduleKind !== undefined && /\.d\.(?:ts|mts|cts)$/iu.test(path);

const NODE_MODULE_EXTENSIONS = [".js", ".json", ".node"] as const;
const _NODE_PACKAGE_MAIN_SUFFIXES = [
  "",
  ...NODE_MODULE_EXTENSIONS,
  ...NODE_MODULE_EXTENSIONS.map((extension) => `/index${extension}`),
];

const _fileCandidates = (
  candidate: string,
  moduleKind?: ResolveArtifactPathInput["moduleKind"],
): readonly string[] => [
  candidate,
  ...(moduleKind === undefined ? EXTENSIONS : NODE_MODULE_EXTENSIONS).map(
    (extension) => `${candidate}${extension}`,
  ),
];

const _indexCandidates = (
  candidate: string,
  moduleKind?: ResolveArtifactPathInput["moduleKind"],
): readonly string[] =>
  (moduleKind === undefined ? EXTENSIONS : NODE_MODULE_EXTENSIONS).map(
    (extension) => posix.join(candidate, `index${extension}`),
  );

type PackageTargetBlockCause = "null" | "empty-array";

type PackageExportOutcome =
  | ({ readonly status: "value" } & PackageFileTarget)
  | { readonly status: "rejected"; readonly limitation: string }
  | { readonly status: "blocked"; readonly cause: PackageTargetBlockCause }
  | { readonly status: "unmatched"; readonly declared: readonly string[] };

/** Only exact non-directory keys participate; wildcard expansion is unsupported. */
const _selectPackageExport = (
  value: unknown,
  subpath: string,
  moduleKind: ResolveArtifactPathInput["moduleKind"],
  packagePath: string,
): PackageExportOutcome => {
  let target = value;
  let declared: string[] = [];
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    const keys = Object.keys(value);
    const hasSubpaths = keys.some((key) => key.startsWith("."));
    if (hasSubpaths && keys.some((key) => !key.startsWith(".")))
      return {
        status: "rejected",
        limitation:
          "The package exports configuration mixes subpath keys and condition keys.",
      };
    declared = keys;
    if (hasSubpaths) {
      if (
        subpath.endsWith("/") ||
        subpath.includes("*") ||
        !Object.hasOwn(value, subpath)
      )
        return { status: "unmatched", declared };
      target = Reflect.get(value, subpath);
    } else if (subpath !== ".") return { status: "unmatched", declared };
  } else if (subpath !== ".") return { status: "unmatched", declared };
  const selected = selectExportTarget(
    target,
    packageExportConditions(moduleKind),
    packagePath,
  );
  if (selected.kind === "invalid" || selected.kind === "invalid-config")
    return { status: "rejected", limitation: selected.limitation };
  if (selected.kind === "unmatched")
    return {
      status: "unmatched",
      declared: selected.declared,
    };
  if (selected.kind === "blocked")
    return { status: "blocked", cause: selected.cause };
  if (selected.kind === "non-relative")
    return {
      status: "rejected",
      limitation: `The package exports target ${JSON.stringify(selected.value)} must start with "./".`,
    };
  return {
    status: "value",
    value: selected.value,
    url: selected.url,
    ...(selected.lookupLimitation === undefined
      ? {}
      : {
          lookupLimitation: selected.lookupLimitation,
        }),
  };
};

type ExportTargetOutcome =
  | ({ readonly kind: "value" } & PackageFileTarget)
  | { readonly kind: "non-relative"; readonly value: string }
  | { readonly kind: "blocked"; readonly cause: PackageTargetBlockCause }
  | { readonly kind: "unmatched"; readonly declared: readonly string[] }
  | { readonly kind: "invalid"; readonly limitation: string }
  | { readonly kind: "invalid-config"; readonly limitation: string };
