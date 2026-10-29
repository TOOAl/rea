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

// JavaScriptArtifactPathResolutionPackage.ts 852-1111
const packageSelfCandidate = (
  input: ResolveArtifactPathInput,
  request: BarePackageRequest,
): CandidateResolution | null => {
  if (input.moduleKind === undefined || !input.files.has(input.sourcePath))
    return null;
  const metadata = enclosingPackageMetadata(input);
  if (metadata.kind === "none") return null;
  if (metadata.kind === "unavailable")
    return unresolvedCandidate("unavailable", [metadata.limitation]);
  if (metadata.name === undefined || metadata.exports === undefined)
    return null;
  let subpath: string;
  if (input.moduleKind === "import") {
    if (metadata.name !== request.packageName) return null;
    subpath = request.packageSubpath;
  } else if (input.declaredPath === metadata.name) {
    subpath = ".";
  } else if (input.declaredPath.startsWith(`${metadata.name}/`)) {
    subpath = `.${input.declaredPath.slice(metadata.name.length)}`;
  } else return null;
  // Self resolution does not apply the CommonJS dependency-name matcher.
  return resolvePackageExports(input, metadata.path, subpath, metadata.exports);
};

/** Resolve an installed dependency using one parsed request and its metadata. */
const resolvePackageDependency = (
  input: ResolveArtifactPathInput,
  directory: string,
  request: BarePackageRequest,
  metadata: PackageMetadata,
): CandidateResolution => {
  const subpath = request.packageSubpath;
  if (request.dependencyExportsEligible && metadata.kind === "unavailable")
    return unresolvedCandidate("unavailable", [metadata.limitation]);
  const rawExports =
    request.dependencyExportsEligible && metadata.kind === "available"
      ? metadata.exports
      : undefined;
  if (rawExports === undefined) {
    if (subpath === ".")
      return (
        (input.moduleKind === "import"
          ? null
          : resolveFileCandidates(
              input,
              fileCandidates(directory, input.moduleKind),
            )) ?? resolveDirectory(input, directory, metadata, new Set())
      );
    if (input.moduleKind === "import")
      return resolveLegacyEsmSubpath(input, directory, subpath);
    const candidate = confineCandidate(`${directory}/${subpath.slice(2)}`);
    return typeof candidate === "string"
      ? resolveCandidate(input, candidate, new Set())
      : candidate;
  }
  return resolvePackageExports(
    input,
    posix.join(directory, "package.json"),
    subpath,
    rawExports,
  );
};

/** Legacy ESM package subpaths are exact URLs, never extension or directory lookups. */
const resolveLegacyEsmSubpath = (
  input: ResolveArtifactPathInput,
  directory: string,
  subpath: string,
): CandidateResolution => {
  const declarationRejection = rejectDeclaration(
    stripQueryAndFragment(htmlUrlText(subpath)),
  );
  if (declarationRejection !== null) return declarationRejection;
  const metadataUrl = packageMetadataUrl(
    posix.join(directory, "package.json"),
    subpath,
  );
  const url = new URL(
    subpath,
    metadataUrl.ok ? metadataUrl.value : metadataUrl.error.structuralUrl,
  );
  if (!url.pathname.startsWith(PACKAGE_ARTIFACT_ROOT_URL.pathname))
    return unresolvedCandidate("rejected", [
      "The resolved candidate escapes the canonical artifact root.",
    ]);
  const encodedPath = url.pathname.slice(
    PACKAGE_ARTIFACT_ROOT_URL.pathname.length,
  );
  const rejected = rejectDeclaration(encodedPath);
  if (rejected !== null) return rejected;
  const decoded = decodeModuleUrlPath(encodedPath);
  if (typeof decoded !== "string") return decoded;
  const candidate = confineCandidate(decoded);
  if (typeof candidate !== "string") return candidate;
  if (urlPathIsDirectory(url.pathname))
    return unresolvedCandidate("rejected", [
      `ESM package subpath ${JSON.stringify(input.declaredPath)} has URL directory form; directory imports are unsupported and no exact-file, package main or index lookup was attempted.`,
    ]);
  const unrepresentableBase = metadataUrl.ok ? undefined : metadataUrl.error;
  if (
    unrepresentableBase !== undefined &&
    url.pathname
      .split("/")
      .some((segment) => unrepresentableBase.structuralSegments.has(segment))
  )
    return unresolvedCandidate("unavailable", [unrepresentableBase.limitation]);
  const file = resolveFileCandidates(input, [candidate]);
  if (file !== null) return file;
  const source = input.files.get(input.sourcePath);
  if (
    hasContainerDirectory(
      input.files,
      candidate,
      source?.container_sha256,
      input.directoryPaths,
      input.unanalyzedFiles,
    )
  )
    return unresolvedCandidate("rejected", [
      `ESM package subpath ${candidate} names a directory; directory imports are unsupported and package main or index lookup was not attempted.`,
    ]);
  return exactPackageTargetNotFound(candidate, "ESM subpath");
};

const resolvePackageExports = (
  input: ResolveArtifactPathInput,
  packagePath: string,
  subpath: string,
  rawExports: string | object,
): CandidateResolution => {
  const exported = selectPackageExport(
    rawExports,
    subpath,
    input.moduleKind,
    packagePath,
  );
  if (exported.status === "rejected")
    return unresolvedCandidate("rejected", [
      `Package metadata ${packagePath}: ${exported.limitation}`,
    ]);
  if (exported.status === "unmatched")
    return unresolvedCandidate("external", [
      `Directory package metadata ${packagePath} declares no exports target ${subpath === "." ? "for the active conditions" : `for subpath ${subpath}`}; exports encapsulation permits no file or index lookup. It declares ${exported.declared.join(", ") || "a root target only"}.`,
    ]);
  if (exported.status === "blocked")
    return unresolvedCandidate("external", [
      `Directory package metadata ${packagePath} blocks subpath ${subpath} with ${exported.cause === "null" ? "an explicit null exports target" : "an empty exports target array"}.`,
    ]);
  return resolveExportTarget(input, packagePath, exported);
};

/** An exports or import target is a URL naming one exact file for both Node loaders. */
const resolveExportTarget = (
  input: ResolveArtifactPathInput,
  packagePath: string,
  target: PackageFileTarget,
  mapKind: "exports" | "imports" = "exports",
): CandidateResolution => {
  const withTargetSource = (
    outcome: CandidateResolution,
  ): CandidateResolution => ({
    ...outcome,
    limitations: outcome.limitations.map(
      (reason) =>
        `Package metadata ${packagePath}, ${mapKind} target ${JSON.stringify(target.value)}: ${reason}`,
    ),
  });
  // Node's CommonJS finalizer checks the serialized URL, including suffixes;
  // its ESM finalizer checks only the pathname. Neither error retries arrays.
  if (input.moduleKind === "require" && /%(?:2f|5c)/iu.test(target.url.href))
    return withTargetSource(
      unresolvedCandidate("rejected", [
        "The selected package URL contains encoded separator bytes.",
      ]),
    );
  const encodedPath = target.url.pathname.slice(
    PACKAGE_ARTIFACT_ROOT_URL.pathname.length,
  );
  // Package targets are URLs for both loaders, so their percent bytes encode.
  const rejected = rejectDeclaration(encodedPath, false);
  if (rejected !== null) return withTargetSource(rejected);
  const decoded = decodeModuleUrlPath(encodedPath);
  if (typeof decoded !== "string") return withTargetSource(decoded);
  const candidate = confineCandidate(decoded);
  if (typeof candidate !== "string") return withTargetSource(candidate);
  if (target.lookupLimitation !== undefined)
    return unresolvedCandidate("unavailable", [target.lookupLimitation]);
  return (
    resolveFileCandidates(input, [candidate]) ??
    withTargetSource(exactPackageTargetNotFound(candidate, mapKind))
  );
};

/** Derived package identity and dependency policy; input retains the raw request. */
interface BarePackageRequest {
  readonly packageName: string;
  readonly packageSubpath: string;
  readonly dependencyExportsEligible: boolean;
}

const parseBarePackageRequest = (
  specifier: string,
  moduleKind: ResolveArtifactPathInput["moduleKind"],
): BarePackageRequest | null => {
  const segments = specifier.split("/");
  let packageName = segments[0] ?? "";
  if (packageName === "") return null;
  if (specifier.startsWith("@")) {
    const packageSegment = segments[1];
    if (packageSegment === undefined || packageSegment === "") return null;
    packageName = `${packageName}/${packageSegment}`;
  }
  // Node's CommonJS exports matcher excludes percent-containing package names.
  // Compare the captured name so a scoped name cannot fall back to its scope.
  const dependencyExportsEligible =
    moduleKind !== "require" ||
    /^((?:@[^/\\%]+\/)?[^./\\%][^/\\%]*)(\/.*)?$/.exec(specifier)?.[1] ===
      packageName;
  return {
    packageName,
    packageSubpath: `.${specifier.slice(packageName.length)}`,
    dependencyExportsEligible,
  };
};

const hasContainerDirectory = (
  files: ReadonlyMap<string, JavaScriptArtifactFile>,
  candidate: string,
  containerSha256: string | undefined,
  directoryPaths: ReadonlySet<string> | undefined,
  unanalyzedFiles?: JavaScriptUnanalyzedArtifactLookup,
): boolean => {
  if (directoryPaths?.has(candidate) === true) return true;
  if (
    [...indexCandidates(candidate), posix.join(candidate, "package.json")].some(
      (path) => {
        const file = files.get(path);
        return (
          file !== undefined &&
          (containerSha256 === undefined ||
            file.container_sha256 === containerSha256)
        );
      },
    )
  )
    return true;
  // Inventory has files rather than directory entries. Any same-container
  // descendant establishes a package directory even without package.json.
  const prefix = `${candidate}/`;
  for (const [path, file] of files)
    if (
      path.startsWith(prefix) &&
      (containerSha256 === undefined ||
        file.container_sha256 === containerSha256)
    )
      return true;
  return unanalyzedFiles?.hasDirectory(candidate, containerSha256) ?? false;
};
