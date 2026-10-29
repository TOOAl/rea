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

const invalidExportTarget = (
  value: unknown,
  reason: string,
  mapKind: "exports" | "imports" = "exports",
): ExportTargetOutcome => ({
  kind: "invalid",
  limitation: `The package ${mapKind === "imports" ? "import" : "exports"} target ${JSON.stringify(value) ?? String(value)} ${reason}.`,
});

// Node checks raw target segments before URL normalization. Compare encoded
// segment names here; full URL decoding follows array target selection.
const forbiddenExportSegment = (value: string): string | undefined =>
  value
    .slice(2)
    .split(/[\\/]/u)
    .find((raw) => {
      const segment = raw.replace(/%[0-9a-f]{2}/giu, (encoded) =>
        String.fromCharCode(Number.parseInt(encoded.slice(1), 16)),
      );
      return (
        segment === "." ||
        segment === ".." ||
        segment.toLowerCase() === "node_modules"
      );
    });

const selectStringPackageTarget = (
  value: string,
  packagePath: string,
  mapKind: "exports" | "imports",
): ExportTargetOutcome => {
  if (mapKind === "imports") {
    const target = classifyPackageImportTargetString(value);
    if (target.kind === "invalid")
      return invalidExportTarget(
        value,
        "cannot be parent-relative, absolute, or a URL",
        mapKind,
      );
    if (target.kind !== "relative") return { kind: "non-relative", value };
  } else if (!value.startsWith("./"))
    return invalidExportTarget(value, 'must start with "./"', mapKind);
  const forbidden = forbiddenExportSegment(value);
  if (forbidden !== undefined)
    return invalidExportTarget(
      value,
      `contains forbidden path segment ${JSON.stringify(forbidden)} before URL normalization`,
      mapKind,
    );
  const metadataUrl = packageMetadataUrl(packagePath, value);
  const packageUrl = metadataUrl.ok
    ? metadataUrl.value
    : metadataUrl.error.structuralUrl;
  // Node constructs the URL before deciding whether this array entry is an
  // invalid package target. Tabs/newlines and dot segments normalize here;
  // percent decoding and existence checks belong after target selection.
  const url = new URL(value, packageUrl);
  if (!url.pathname.startsWith(new URL(".", packageUrl).pathname))
    return invalidExportTarget(
      value,
      "escapes the package root after URL normalization",
      mapKind,
    );
  return {
    kind: "value",
    value,
    url,
    ...(metadataUrl.ok
      ? {}
      : {
          lookupLimitation: metadataUrl.error.limitation,
        }),
  };
};

const selectArrayPackageTarget = (
  value: readonly unknown[],
  conditions: ReadonlySet<string>,
  packagePath: string,
  mapKind: "exports" | "imports",
): ExportTargetOutcome => {
  if (value.length === 0) return { kind: "blocked", cause: "empty-array" };
  let lastRefusal:
    | Extract<ExportTargetOutcome, { readonly kind: "invalid" | "blocked" }>
    | undefined;
  const declared = new Set<string>();
  for (const entry of value) {
    const nested = selectExportTarget(entry, conditions, packagePath, mapKind);
    // Node's array fallback catches invalid targets, not invalid configuration.
    if (nested.kind === "invalid-config") return nested;
    if (nested.kind === "unmatched") {
      for (const condition of nested.declared) declared.add(condition);
      continue;
    }
    if (nested.kind === "invalid" || nested.kind === "blocked") {
      lastRefusal = nested;
      continue;
    }
    return nested;
  }
  return lastRefusal ?? { kind: "unmatched", declared: [...declared] };
};

/**
 * Resolve a target in Node's declared order. Explicit null blocks an active
 * condition, whereas an unmatched nested object permits the next condition.
 * An array skips unmatched and invalid entries, stops at its first string, and
 * preserves the last invalid/null outcome if no string is selected. A nonempty
 * array of unmatched conditions stays unmatched; an empty array blocks.
 */
const selectExportTarget = (
  value: unknown,
  conditions: ReadonlySet<string>,
  packagePath: string,
  mapKind: "exports" | "imports" = "exports",
): ExportTargetOutcome => {
  if (typeof value === "string")
    return selectStringPackageTarget(value, packagePath, mapKind);
  if (value === null) return { kind: "blocked", cause: "null" };
  if (Array.isArray(value))
    return selectArrayPackageTarget(value, conditions, packagePath, mapKind);
  if (typeof value !== "object")
    return invalidExportTarget(
      value,
      "must be a relative string, object, array, or null",
      mapKind,
    );
  for (const key of Object.keys(value)) {
    const numeric = Number(key);
    if (String(numeric) === key && numeric >= 0 && numeric < 0xffff_ffff)
      return {
        kind: "invalid-config",
        limitation: `The package exports configuration contains numeric condition key ${JSON.stringify(key)}.`,
      };
  }
  const declared = new Set<string>();
  for (const [condition, target] of Object.entries(value)) {
    declared.add(condition);
    if (!conditions.has(condition)) continue;
    const nested = selectExportTarget(target, conditions, packagePath, mapKind);
    if (nested.kind !== "unmatched") return nested;
    for (const name of nested.declared) declared.add(name);
  }
  return { kind: "unmatched", declared: [...declared] };
};

/**
 * Node selects an exports target by walking the declared keys in order and
 * taking the first whose condition is active for the calling resolver.
 * "default" is always active, and "node" plus "node-addons" are active for the
 * built-in resolver that owns installed-package imports and requires. The
 * supported Node runtimes also activate "module-sync" for both loaders.
 */
const packageExportConditions = (
  moduleKind: ResolveArtifactPathInput["moduleKind"],
): ReadonlySet<string> =>
  new Set([
    "node",
    "node-addons",
    "module-sync",
    ...(moduleKind === undefined ? [] : [moduleKind]),
    "default",
  ]);

const _notFoundCandidate = (): Extract<
  CandidateResolution,
  { readonly resolvedPath: null }
> => ({
  resolvedPath: null,
  status: "not-found",
  limitations: [
    "No extension, directory package, or index candidate exists in the inventoried artifact container.",
  ],
});

const _exactPackageTargetNotFound = (
  path: string,
  targetKind: "exports" | "imports" | "ESM subpath",
): CandidateResolution => ({
  resolvedPath: null,
  status: "not-found",
  limitations: [
    `The selected package ${targetKind === "imports" ? "import" : targetKind} target ${path} does not exist in the inventoried artifact container; ${targetKind === "imports" ? "import" : targetKind} targets are exact files, so no extension or directory index was tried.`,
  ],
});

const _fileUrlPath = (value: string): string | null | undefined => {
  if (!/^file:\/\//iu.test(value)) return undefined;
  // URL parsing removes tabs and newlines and normalizes encoded dot segments.
  // Check the raw path first, excluding URL identity suffixes, then check the
  // parsed pathname so parser normalization cannot introduce a separator.
  const rawPath = stripQueryAndFragment(value);
  if (
    value.includes("\0") ||
    value.includes("\\") ||
    /[\t\n\r]/u.test(rawPath) ||
    !admitsCanonicalPathSyntax(rawPath)
  )
    return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "file:" || url.hostname !== "") return undefined;
    if (!admitsCanonicalPathSyntax(url.pathname)) return null;
    const decoded = decodeURIComponent(url.pathname);
    if (decoded.includes("\0")) return null;
    return decoded.replace(/^\/+/, "");
  } catch (cause: unknown) {
    // Unparseable file URLs have no path to resolve.
    void cause;
    return undefined;
  }
};

const _unresolvedCandidate = (
  status: UnresolvedArtifactPathStatus,
  limitations: readonly string[],
): CandidateResolution => ({ resolvedPath: null, status, limitations });
