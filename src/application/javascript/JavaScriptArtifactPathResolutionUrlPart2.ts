import { isBuiltin } from "node:module";
import { posix } from "node:path";
import {
  classifyPackageImportSpecifier,
  classifyPackageImportTargetString,
  lookupExactPackageImport,
} from "../../domain/javascript/javascriptPackageImportAliases.js";
// removed unused import: import { type Result } from "../../domain/result.js";  // Result unused

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
