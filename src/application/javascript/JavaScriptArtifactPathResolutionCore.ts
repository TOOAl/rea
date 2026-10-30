// removed unused import: import { isBuiltin } from "node:module";  // isBuiltin unused
// removed unused import: import { posix } from "node:path";  // posix unused

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

type ArtifactPathResolutionContext =
  | "package-entrypoint"
  | "filesystem-expression"
  | "module-specifier"
  | "html-reference"
  | "url-reference";

type UnresolvedArtifactPathStatus =
  | "not-found"
  | "unavailable"
  | "external"
  | "rejected";

interface ArtifactPathResolutionBase {
  readonly declared_path: string;
  readonly resolution_context: ArtifactPathResolutionContext;
  readonly limitations: readonly string[];
  readonly conditional_resolutions?: readonly ConditionalModuleResolution[];
  readonly candidate_path?: string;
}

export interface ConditionalModuleResolution {
  readonly mode: "import" | "require";
  readonly resolution_status: UnresolvedArtifactPathStatus | "resolved";
  readonly resolved_path: string | null;
  readonly candidate_path?: string;
  readonly limitations: readonly string[];
}

/** Explicit outcome of artifact-confined path resolution. */
export type ArtifactPathResolution = ArtifactPathResolutionBase &
  (
    | {
        readonly resolved_path: string;
        readonly resolution_status: "resolved";
      }
    | {
        readonly resolved_path: null;
        readonly resolution_status: UnresolvedArtifactPathStatus;
      }
  );

/** Values needed to resolve a declaration without filesystem access. */
export interface ResolveArtifactPathInput {
  readonly declaredPath: string;
  readonly sourcePath: string;
  readonly context: ArtifactPathResolutionContext;
  readonly files: ReadonlyMap<string, JavaScriptArtifactFile>;
  /** Directory identities retained by the complete artifact inventory. */
  readonly directoryPaths?: ReadonlySet<string> | undefined;
  /** Inventoried files outside the JavaScript projection: present, never read. */
  readonly unanalyzedFiles?: JavaScriptUnanalyzedArtifactLookup | undefined;
  readonly htmlBaseHref?: string | null;
  /** Import/require semantics; runtime resource paths omit this provenance. */
  readonly moduleKind?: JavaScriptModuleResolutionMode;
  /** Runtime paths retain their loader owner independently of source imports. */
  readonly runtimePathKind?: "exact-file" | "node-entrypoint" | "url-resource";
}

/** Preserve an explicitly retained loader mode on graph relationships. */
export const moduleResolutionModeProperties = (
  mode: JavaScriptModuleResolutionMode | undefined,
): Readonly<Record<string, JavaScriptModuleResolutionMode>> =>
  mode === undefined ? {} : { resolution_mode: mode };

const _EXTENSIONS = [
  ".js",
  ".cjs",
  ".mjs",
  ".ts",
  ".tsx",
  ".json",
  ".html",
  ".node",
];

// A private URL namespace for logical artifact paths, including root packages.
// Encode inventory segments so filename punctuation remains literal in the base.
const PACKAGE_ARTIFACT_ROOT_URL = new URL("file:///rea-artifact/");
const encodePackageMetadataUrl = (path: string): URL =>
  new URL(
    path.split("/").map(encodeURIComponent).join("/"),
    PACKAGE_ARTIFACT_ROOT_URL,
  );
// URL identity cannot represent lone UTF-16 surrogates. Use request-local
// opaque segments only for structural admission, never inventory lookup. A
// target cannot spell these identities after URL's tab/newline preprocessing.
const _packageMetadataUrl = (
  path: string,
  relativeTarget: string,
): Result<
  URL,
  {
    readonly structuralUrl: URL;
    readonly structuralSegments: ReadonlySet<string>;
    readonly limitation: string;
  }
> => {
  try {
    return ok(encodePackageMetadataUrl(path));
  } catch (cause: unknown) {
    if (!(cause instanceof URIError)) throw cause;
    const reserved = new Set(
      `${path}\n${relativeTarget.replace(/[\t\n\r]/gu, "")}`.match(
        /rea-opaque-\d+/gu,
      ) ?? [],
    );
    const structuralSegments = new Set<string>();
    let nextIdentity = 0;
    const structuralPath = path
      .split("/")
      .map((segment) => {
        try {
          return encodeURIComponent(segment);
        } catch (segmentCause: unknown) {
          if (!(segmentCause instanceof URIError)) throw segmentCause;
          let identity: string;
          do identity = `rea-opaque-${nextIdentity++}`;
          while (reserved.has(identity));
          reserved.add(identity);
          structuralSegments.add(identity);
          return identity;
        }
      })
      .join("/");
    return err({
      structuralUrl: new URL(structuralPath, PACKAGE_ARTIFACT_ROOT_URL),
      structuralSegments,
      limitation: `Package metadata path ${JSON.stringify(path)} contains an unpaired UTF-16 surrogate and cannot be represented as a URL.`,
    });
  }
};

interface _PackageFileTarget {
  readonly value: string;
  /** Normalized URL retained until loader-specific validation and file lookup. */
  readonly url: URL;
  /** Structural validation remains possible when the inventory base has no URL identity. */
  readonly lookupLimitation?: string;
}

type CandidateResolution = {
  readonly limitations: readonly string[];
  readonly candidatePath?: string;
  readonly conditionalResolutions?: readonly ConditionalModuleResolution[];
} & (
  | { readonly resolvedPath: string; readonly status: "resolved" }
  | {
      readonly resolvedPath: null;
      readonly status: UnresolvedArtifactPathStatus;
      /** A truthy package main failed, so Node must not try ancestor packages. */
      readonly stopsAncestorLookup?: true;
    }
);

/** Resolve one declaration while preserving its original input identity. */
export const resolveArtifactPathByContext = (
  input: ResolveArtifactPathInput,
): ArtifactPathResolution => {
  const resolution = resolvePath(input);
  const facts = {
    declared_path: input.declaredPath,
    resolution_context: input.context,
    limitations: resolution.limitations,
    ...(resolution.candidatePath === undefined
      ? {}
      : { candidate_path: resolution.candidatePath }),
    ...(resolution.conditionalResolutions === undefined
      ? {}
      : { conditional_resolutions: resolution.conditionalResolutions }),
  };
  return resolution.status === "resolved"
    ? {
        ...facts,
        resolved_path: resolution.resolvedPath,
        resolution_status: resolution.status,
      }
    : { ...facts, resolved_path: null, resolution_status: resolution.status };
};

/** Project retained conditional identities without flattening them into display text. */
export const artifactPathResolutionProperties = (
  resolution: ArtifactPathResolution | undefined,
): Readonly<Record<string, JsonValue>> => ({
  ...(resolution?.candidate_path === undefined
    ? {}
    : { candidate_path: resolution.candidate_path }),
  ...(resolution?.conditional_resolutions === undefined
    ? {}
    : {
        conditional_resolutions: resolution.conditional_resolutions.map(
          (branch) => ({
            mode: branch.mode,
            resolution_status: branch.resolution_status,
            resolved_path: branch.resolved_path,
            limitations: [...branch.limitations],
            ...(branch.candidate_path === undefined
              ? {}
              : { candidate_path: branch.candidate_path }),
          }),
        ),
      }),
});

const conditionalResolution = (
  mode: "import" | "require",
  result: CandidateResolution,
): ConditionalModuleResolution => ({
  mode,
  resolution_status: result.status,
  resolved_path: result.resolvedPath,
  limitations: result.limitations,
  ...(result.candidatePath === undefined
    ? {}
    : { candidate_path: result.candidatePath }),
});

const resolvePath = (input: ResolveArtifactPathInput): CandidateResolution => {
  if (input.runtimePathKind === "node-entrypoint")
    return resolveNodeRuntimeEntrypoint(input);
  if (input.moduleKind === "compiler-dependent") {
    const imported = resolvePath({ ...input, moduleKind: "import" });
    const required = resolvePath({ ...input, moduleKind: "require" });
    const sameOutcome =
      imported.status === required.status &&
      imported.resolvedPath === required.resolvedPath &&
      imported.candidatePath === required.candidatePath;
    const limitation =
      "Static TypeScript loader mode is compiler-dependent without retained compiler options. " +
      (sameOutcome
        ? "Node import and require resolution agree on this outcome."
        : "Node import and require resolution disagree; neither branch is an established target.");
    return sameOutcome
      ? {
          ...imported,
          limitations: [
            ...new Set([
              ...imported.limitations,
              ...required.limitations,
              limitation,
            ]),
          ],
        }
      : {
          resolvedPath: null,
          status: "unavailable",
          limitations: [limitation],
          conditionalResolutions: [
            conditionalResolution("import", imported),
            conditionalResolution("require", required),
          ],
        };
  }
  if (input.runtimePathKind === "url-resource")
    return resolveExactUrlResource(input);
  if (input.runtimePathKind === "exact-file" && isRuntimePathDeclaration(input))
    return resolveRuntimeEntrypoint(input);
  // Package import keys are literal lookup identities, not artifact paths.
  // The selected target is admitted separately by resolveExportTarget.
  if (
    input.context === "module-specifier" &&
    input.declaredPath.startsWith("#")
  )
    return resolvePackageImportAlias(input, input.declaredPath);
  const candidate = contextualCandidate(input);
  if (typeof candidate !== "string") return candidate;
  const confined = confineCandidate(candidate);
  if (typeof confined !== "string") return confined;
  if (input.context === "html-reference" || input.context === "url-reference")
    return (
      resolveFileCandidates(input, [confined]) ??
      unresolvedCandidate("not-found", [
        `The exact ${input.context === "html-reference" ? "HTML" : "URL"} resource ${confined} was not found among the selected application files.`,
      ])
    );
  const isModuleUrlPath =
    input.context === "module-specifier" &&
    (isRelativeJavaScriptModuleSpecifier(input.declaredPath) ||
      input.declaredPath.startsWith("/") ||
      fileUrlPath(input.declaredPath) !== undefined);
  const emittedSourceCandidates =
    isModuleUrlPath && input.moduleKind !== undefined
      ? typescriptEmittedSourceCandidates(input.sourcePath, confined)
      : [];
  if (isModuleUrlPath && input.moduleKind === "import")
    return (
      resolveRuntimeSourceCandidates(
        input,
        confined,
        emittedSourceCandidates,
      ) ?? notFoundCandidate()
    );
  return resolveCandidate(input, confined, new Set(), emittedSourceCandidates);
};

const resolveExactUrlResource = (
  input: ResolveArtifactPathInput,
): CandidateResolution => {
  // Electron loadURL requires a protocol. A scheme-less string is not relative
  // to the calling script; filesystem paths belong to loadFile.
  if (!hasScheme(input.declaredPath))
    return unresolvedCandidate("unavailable", [
      "Electron loadURL requires a URL protocol; relative filesystem paths belong to loadFile.",
    ]);
  if (!/^file:/iu.test(input.declaredPath))
    return unresolvedCandidate("external", [
      "Only file URLs can be mapped to selected local application artifacts.",
    ]);
  const urlContextCandidate = contextualCandidate(input);
  if (typeof urlContextCandidate !== "string") return urlContextCandidate;
  const confined = confineCandidate(urlContextCandidate);
  if (typeof confined !== "string") return confined;
  return (
    resolveFileCandidates(input, [confined]) ?? {
      resolvedPath: null,
      status: "not-found",
      candidatePath: confined,
      limitations: [
        `The exact URL resource ${confined} was not found among the selected application files.`,
      ],
    }
  );
};

const isRuntimePathDeclaration = (input: ResolveArtifactPathInput): boolean =>
  input.context === "filesystem-expression" ||
  (input.context === "module-specifier" &&
    (isRelativeJavaScriptModuleSpecifier(input.declaredPath) ||
      input.declaredPath.startsWith("/") ||
      fileUrlPath(input.declaredPath) !== undefined));

const resolveNodeRuntimeEntrypoint = (
  input: ResolveArtifactPathInput,
): CandidateResolution => {
  const { runtimePathKind: _runtimePathKind, ...sourceInput } = input;
  const runtimeInput = { ...sourceInput, moduleKind: "require" as const };
  if (!isRuntimePathDeclaration(runtimeInput)) return resolvePath(runtimeInput);
  const candidate = contextualCandidate(runtimeInput);
  if (typeof candidate !== "string") return candidate;
  const confined = confineCandidate(candidate);
  if (typeof confined !== "string") return confined;
  // Node entrypoints use runtime file/directory probes. They do not originate
  // in emitted TypeScript import syntax and cannot select a source substitute.
  const resolution = resolveCandidate(runtimeInput, confined, new Set());
  // Runtime entrypoint analysis has no extension or directory fallback, but
  // retain the normalized loader path when that exact target is absent.
  return resolution.status === "not-found" &&
    resolution.candidatePath === undefined
    ? { ...resolution, candidatePath: confined }
    : resolution;
};

const resolveRuntimeEntrypoint = (
  input: ResolveArtifactPathInput,
): CandidateResolution => {
  const rejected = rejectDeclaration(input.declaredPath);
  if (rejected !== null) return rejected;
  if (hasScheme(input.declaredPath) || looksExternal(input.declaredPath))
    return unresolvedCandidate("external", [
      "Electron runtime entrypoints must identify local paths, not external URLs.",
    ]);
  const candidate = confineCandidate(
    relativeCandidate(input.sourcePath, input.declaredPath),
  );
  if (typeof candidate !== "string") return candidate;
  return (
    resolveFileCandidates(input, [candidate]) ?? {
      resolvedPath: null,
      status: "not-found",
      candidatePath: candidate,
      limitations: [
        `The declared Electron runtime entrypoint ${candidate} was not found as an exact file among the selected application files; extension and directory fallback were not attempted.`,
      ],
    }
  );
};

const resolveRuntimeSourceCandidates = (
  input: ResolveArtifactPathInput,
  exactPath: string,
  sourceCandidates: readonly TypeScriptEmittedSourceCandidate[],
): CandidateResolution | null => {
  const exactCandidate: TypeScriptEmittedSourceCandidate = {
    path: exactPath,
    kind: "implementation",
  };
  for (const candidate of [exactCandidate, ...sourceCandidates]) {
    const selected = findFileCandidate(input, candidate.path);
    if (selected === null) continue;
    return candidate.kind === "declaration"
      ? {
          resolvedPath: null,
          status: "unavailable",
          candidatePath: candidate.path,
          limitations: [
            "Only a TypeScript declaration fallback was found; it does not establish the requested runtime module.",
          ],
        }
      : selected;
  }
  return null;
};

const rejectDeclaration = (
  declared: string,
  literalPercent = false,
  allowEmptyPath = false,
): CandidateResolution | null => {
  if (declared.length === 0 && !allowEmptyPath)
    return unresolvedCandidate("rejected", ["The declared path is empty."]);
  if (declared.includes("\0") || declared.includes("\\"))
    return unresolvedCandidate("rejected", [
      "NUL and backslash path syntax are not admitted for canonical artifact paths.",
    ]);
  if (!literalPercent && !admitsCanonicalPathSyntax(declared))
    return unresolvedCandidate("rejected", [
      "Encoded dot or separator bytes are rejected before artifact path resolution.",
    ]);
  return null;
};

/**
 * Node's CommonJS loader never percent-decodes a request or a legacy package
 * main, so `%2e` and `%2f` there are literal filename bytes, not encoded dots
 * or separators. Root confinement still applies to the joined candidate.
 */
const _declaresLiteralPercent = (input: ResolveArtifactPathInput): boolean =>
  input.moduleKind === "require" &&
  (input.context === "module-specifier" ||
    input.context === "package-entrypoint");
