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
  type _TypeScriptEmittedSourceCandidate,
} from "../TypeScriptEmittedSourceCandidates.js";
import { isRelativeJavaScriptModuleSpecifier } from "../../domain/javascript/javascriptModuleSpecifier.js";
import type { JavaScriptModuleResolutionMode } from "../../domain/javascript/javascriptModuleResolutionMode.js";
import type { JsonValue } from "../../domain/jsonValue.js";
// removed unused import: import { type Result } from "../../domain/result.js";  // Result unused

type _ArtifactPathResolutionContext = "package-entrypoint";

// JavaScriptArtifactPathResolutionUrl.ts 465-851
const _contextualCandidate = (
  input: ResolveArtifactPathInput,
): string | CandidateResolution => {
  const { context } = input;
  if (context === "html-reference") return htmlCandidate(input);
  // URL suffixes are evidence, not pathname bytes. Admit only the path while
  // retaining the complete declaration on the resolution result.
  let declared =
    context === "url-reference"
      ? stripQueryAndFragment(input.declaredPath)
      : input.declaredPath;
  if (context === "url-reference" && declared.length === 0)
    return input.runtimePathKind === "url-resource"
      ? unresolvedCandidate("unavailable", [
          "A suffix-only runtime URL requires the window's current document URL; the calling script does not establish that base.",
        ])
      : unresolvedCandidate("rejected", [
          "The URL reference contains no pathname, and its base document is not established by this analysis.",
        ]);
  if (context === "module-specifier" && /^file:/iu.test(declared)) {
    const fileUrl = fileUrlPath(declared);
    if (fileUrl === null)
      return unresolvedCandidate("rejected", [
        "The file URL path contains syntax that cannot identify a canonical artifact path.",
      ]);
    if (fileUrl !== undefined)
      return input.moduleKind === "require"
        ? unresolvedCandidate("external", [
            "Node CommonJS require specifiers do not resolve file URLs as local artifacts.",
          ])
        : fileUrl;
    return unresolvedCandidate("external", [
      "File URL authorities or invalid file URL forms cannot be mapped to artifact-local paths.",
    ]);
  }
  const hasUrlPathSemantics =
    context === "module-specifier" && input.moduleKind === "import";
  if (hasUrlPathSemantics) declared = htmlUrlText(declared);
  const rejected = rejectDeclaration(
    declared,
    declaresLiteralPercent(input) || hasUrlPathSemantics,
  );
  if (rejected !== null) return rejected;
  if (context === "module-specifier") {
    if (hasScheme(declared))
      return unresolvedCandidate("external", [
        "URL and Node builtin schemes are outside static artifact module resolution.",
      ]);
    if (
      !isRelativeJavaScriptModuleSpecifier(declared) &&
      !declared.startsWith("/")
    )
      return bareModuleCandidate(input);
    if (input.moduleKind !== "require") {
      if (/%(?:2f|5c)/iu.test(stripQueryAndFragment(declared)))
        return unresolvedCandidate("rejected", [
          "ES module URL paths cannot contain percent-encoded slash or backslash bytes.",
        ]);
      const decoded = decodeModuleUrlPath(stripQueryAndFragment(declared));
      if (typeof decoded !== "string") return decoded;
      declared = decoded;
    }
  } else if (looksExternal(declared))
    return unresolvedCandidate("external", [
      "URL schemes and protocol-relative URLs are outside this local artifact path context.",
    ]);
  if (context === "url-reference") {
    // A file base gives raw drive-letter segments special meaning, including
    // after dot segments reach the root. Parse before percent decoding so an
    // encoded drive-like filename stays literal. The synthetic base establishes
    // only this ambiguity; it does not establish the source's runtime scheme.
    const sourceUrlPath = input.sourcePath
      .split("/")
      .map(encodeURIComponent)
      .join("/");
    const fileReference = URL.parse(declared, `file:///${sourceUrlPath}`);
    if (fileReference === null)
      return unresolvedCandidate("rejected", [
        "The URL reference cannot be parsed as a URL.",
      ]);
    if (/^\/[A-Za-z]:(?:\/|$)/u.test(fileReference.pathname))
      return unresolvedCandidate("unavailable", [
        "Drive-letter URL paths cannot be mapped without the source URL scheme and filesystem root.",
      ]);
    const decoded = percentDecodeUrlPath(declared);
    if (decoded === null)
      return unresolvedCandidate("rejected", [
        "The URL reference path percent-decodes to NUL or to bytes that are not UTF-8.",
      ]);
    const candidate = urlRelativeCandidate(
      posix.dirname(input.sourcePath),
      decoded,
    );
    return typeof candidate === "string"
      ? exactUrlPathCandidate(decoded, candidate, "URL")
      : candidate;
  }
  if (context === "module-specifier" && input.moduleKind === "import") {
    const candidate = urlRelativeCandidate(
      posix.dirname(input.sourcePath),
      declared,
    );
    return typeof candidate === "string"
      ? exactUrlPathCandidate(declared, candidate, "module URL")
      : candidate;
  }
  return relativeCandidate(input.sourcePath, declared);
};

const decodeModuleUrlPath = (
  declared: string,
): string | CandidateResolution => {
  let decoded: string;
  try {
    decoded = decodeURIComponent(declared);
  } catch (cause: unknown) {
    void cause;
    return unresolvedCandidate("rejected", [
      "The module URL path contains malformed percent encoding.",
    ]);
  }
  return decoded.includes("\0")
    ? unresolvedCandidate("rejected", [
        "The decoded module URL path contains NUL.",
      ])
    : decoded;
};

const relativeCandidate = (sourcePath: string, declared: string): string =>
  declared.startsWith("/")
    ? declared.slice(1)
    : posix.join(posix.dirname(sourcePath), declared);

/**
 * A URL path during reference resolution. Above-root `..` markers are kept
 * apart from segments, so a later `..` cannot cancel an escape, while empty
 * segments stay removable until the final path is formed.
 */
interface UrlPathState {
  readonly escapes: number;
  readonly segments: readonly string[];
}

const urlDirectoryState = (directory: string): UrlPathState => ({
  escapes: 0,
  segments: directory === "" || directory === "." ? [] : directory.split("/"),
});

/**
 * Apply URL dot segments: `..` removes the previous segment even when it is
 * empty, so `assets//../app.js` names `assets/app.js`. A final `.` or `..`
 * leaves directory form, as the URL parser does.
 */
const applyUrlReference = (
  base: UrlPathState,
  reference: string,
): UrlPathState => {
  const absolute = reference.startsWith("/");
  const segments = absolute ? [] : [...base.segments];
  let escapes = absolute ? 0 : base.escapes;
  const parts = (absolute ? reference.slice(1) : reference).split("/");
  for (const [index, part] of parts.entries()) {
    if (part !== "." && part !== "..") {
      segments.push(part);
      continue;
    }
    if (part === "..")
      if (segments.length > 0) segments.pop();
      else escapes += 1;
    if (index === parts.length - 1) segments.push("");
  }
  return { escapes, segments };
};

/** A relative reference replaces the base URL's final path segment. */
const _urlBaseDirectory = (base: UrlPathState): UrlPathState => ({
  escapes: base.escapes,
  segments: base.segments.slice(0, -1),
});

/**
 * Form the artifact candidate. A remaining empty segment cannot name a
 * canonical artifact file; a trailing one is directory form. Confinement
 * rejects a candidate that keeps an above-root marker.
 */
const urlPathCandidate = (path: UrlPathState): string | CandidateResolution => {
  const segments =
    path.segments.at(-1) === "" ? path.segments.slice(0, -1) : path.segments;
  if (segments.includes(""))
    return unresolvedCandidate("unavailable", [
      "Repeated URL path separators cannot be mapped to an exact canonical artifact file.",
    ]);
  return [
    ...Array.from({ length: path.escapes }, () => ".."),
    ...segments,
  ].join("/");
};

/** Resolve a URL path reference against a canonical directory. */
const urlRelativeCandidate = (
  directory: string,
  reference: string,
): string | CandidateResolution =>
  urlPathCandidate(applyUrlReference(urlDirectoryState(directory), reference));

const bareModuleCandidate = (
  input: ResolveArtifactPathInput,
): CandidateResolution => {
  const request = parseBarePackageRequest(input.declaredPath, input.moduleKind);
  if (request === null || isBuiltin(input.declaredPath))
    return unresolvedCandidate("external", [
      "The bare specifier is a Node builtin or invalid package name.",
    ]);
  if (
    input.moduleKind === "import" &&
    (request.packageName.startsWith(".") || request.packageName.includes("%"))
  )
    return unresolvedCandidate("rejected", [
      "ES module package names cannot start with a dot or contain percent signs.",
    ]);
  const self = packageSelfCandidate(input, request);
  if (self !== null) return self;
  // ESM constructs a package.json URL; its parsed identity is not a literal
  // dependency directory. Self resolution above still uses the exact name.
  let dependencyDirectory = posix.join("node_modules", request.packageName);
  if (input.moduleKind === "import") {
    const metadataUrl = new URL(
      `./node_modules/${request.packageName}/package.json`,
      PACKAGE_ARTIFACT_ROOT_URL,
    );
    if (!metadataUrl.pathname.endsWith("/package.json"))
      return unresolvedCandidate("external", [
        `ESM package name ${JSON.stringify(request.packageName)} produces a dependency URL whose pathname does not name package.json; no literal or suffix-stripped package directory was searched.`,
      ]);
    const decoded = decodeModuleUrlPath(
      metadataUrl.pathname.slice(PACKAGE_ARTIFACT_ROOT_URL.pathname.length),
    );
    if (typeof decoded !== "string") return decoded;
    const confined = confineCandidate(decoded);
    if (typeof confined !== "string") return confined;
    dependencyDirectory = posix.dirname(confined);
  }
  const source = input.files.get(input.sourcePath);
  let nearestNotFound: CandidateResolution | null = null;
  for (const directory of packageLookupDirectories(input)) {
    const candidate = posix.join(directory, dependencyDirectory);
    const metadata = readPackageMetadata(input, candidate);
    const continueCommonJsLookup =
      input.moduleKind === "require" &&
      (metadata.kind === "absent" ||
        (metadata.kind === "available" &&
          (!request.dependencyExportsEligible ||
            metadata.exports === undefined)));
    const packageResolution =
      metadata.kind !== "absent" ||
      hasContainerDirectory(
        input.files,
        candidate,
        source?.container_sha256,
        input.directoryPaths,
        input.unanalyzedFiles,
      )
        ? resolvePackageDependency(input, candidate, request, metadata)
        : request.packageSubpath === "." && input.moduleKind !== "import"
          ? resolveFileCandidates(
              input,
              fileCandidates(candidate, input.moduleKind),
            )
          : null;
    if (packageResolution !== null) {
      if (
        continueCommonJsLookup &&
        packageResolution.status === "not-found" &&
        packageResolution.stopsAncestorLookup !== true
      ) {
        nearestNotFound ??= packageResolution;
      } else return packageResolution;
    }
  }
  if (nearestNotFound !== null) return nearestNotFound;
  return unresolvedCandidate("external", [
    "No matching bare package was inventoried in an enclosing node_modules directory.",
  ]);
};

function* packageLookupDirectories(
  input: ResolveArtifactPathInput,
): Generator<string> {
  let directory = posix.dirname(input.sourcePath);
  while (true) {
    if (
      input.moduleKind !== "require" ||
      posix.basename(directory) !== "node_modules"
    )
      yield directory;
    if (directory === "." || directory === "") return;
    directory = posix.dirname(directory);
  }
}

/**
 * Nearest same-container package.json, stopping at a `node_modules` directory
 * so a nested package cannot inherit an ancestor's map.
 */
const enclosingPackageMetadata = (
  input: ResolveArtifactPathInput,
):
  | Extract<PackageMetadata, { readonly kind: "available" | "unavailable" }>
  | { readonly kind: "none" } => {
  let directory = posix.dirname(input.sourcePath);
  while (posix.basename(directory) !== "node_modules") {
    const metadata = readPackageMetadata(input, directory);
    if (metadata.kind !== "absent") return metadata;
    if (directory === "." || directory === "") break;
    directory = posix.dirname(directory);
  }
  return { kind: "none" };
};

/**
 * Resolve an exact `#alias` against the importer's enclosing `imports` map.
 * Selected relative targets are exact files; patterns, recursive aliases, and
 * external-package targets stay unresolved without falling through.
 */
const _resolvePackageImportAlias = (
  input: ResolveArtifactPathInput,
  specifier: string,
): CandidateResolution => {
  const classified = classifyPackageImportSpecifier(specifier);
  if (classified.kind === "invalid")
    return unresolvedCandidate("rejected", [
      `The package import specifier ${JSON.stringify(specifier)} is invalid; "#" and specifiers that end with "/" are not valid import aliases.`,
    ]);
  if (classified.kind === "pattern")
    return unresolvedCandidate("external", [
      `Wildcard and directory package import aliases remain unresolved; ${JSON.stringify(specifier)} is not an exact imports key.`,
    ]);
  const metadata = enclosingPackageMetadata(input);
  if (metadata.kind === "none")
    return unresolvedCandidate("external", [
      `No enclosing package.json defines package import alias ${specifier}; package import maps do not cross package scopes.`,
    ]);
  if (metadata.kind === "unavailable")
    return unresolvedCandidate("unavailable", [metadata.limitation]);
  const lookup = lookupExactPackageImport(metadata.imports, specifier);
  if (lookup.kind === "undefined-map")
    return unresolvedCandidate("external", [
      `Package metadata ${metadata.path} does not define package import alias ${specifier}.`,
    ]);
  if (lookup.kind === "missing-key")
    return unresolvedCandidate("external", [
      `Package metadata ${metadata.path} does not define package import alias ${specifier}; it declares ${lookup.declared.join(", ") || "no imports keys"}.`,
    ]);
  if (lookup.kind === "pattern-unresolved")
    return unresolvedCandidate("external", [
      `Wildcard package import aliases remain unresolved; package metadata ${metadata.path} has no exact imports key ${specifier}.`,
    ]);
  const selected = selectExportTarget(
    lookup.target,
    packageExportConditions(input.moduleKind),
    metadata.path,
    "imports",
  );
  if (selected.kind === "invalid" || selected.kind === "invalid-config")
    return unresolvedCandidate("rejected", [
      `Package metadata ${metadata.path}: ${selected.limitation}`,
    ]);
  if (selected.kind === "unmatched")
    return unresolvedCandidate("external", [
      `Package metadata ${metadata.path} declares no imports target for alias ${specifier} under the active conditions; it declares ${selected.declared.join(", ") || "no conditions"}.`,
    ]);
  if (selected.kind === "blocked")
    return unresolvedCandidate("external", [
      `Package metadata ${metadata.path} blocks import alias ${specifier} with ${selected.cause === "null" ? "an explicit null imports target" : "an empty imports target array"}.`,
    ]);
  if (selected.kind === "non-relative") {
    const target = classifyPackageImportTargetString(selected.value);
    return unresolvedCandidate("external", [
      target.kind === "recursive"
        ? `Recursive package import aliases remain unresolved; package metadata ${metadata.path} maps ${specifier} to ${JSON.stringify(target.target)}.`
        : `External-package import targets remain unresolved; package metadata ${metadata.path} maps ${specifier} to ${JSON.stringify(target.target)}.`,
    ]);
  }
  return resolveExportTarget(input, metadata.path, selected, "imports");
};

/** Self references use the nearest package scope before dependency lookup. */
