// removed unused import: import { isBuiltin } from "node:module";  // isBuiltin unused
import { posix } from "node:path";

import {
  normalizeJoinedLogicalPath,
  logicalPathEscapesRoot,
} from "../../domain/artifactIdentity.js";
import {
  admitsCanonicalPathSyntax,
  htmlUrlText,
  looksExternal,
  percentDecodeUrlPath,
  stripQueryAndFragment,
} from "../../domain/artifactPathSyntax.js";
// removed unused import: import { isRelativeJavaScriptModuleSpecifier } from "../../domain/javascript/javascriptModuleSpecifier.js";  // isRelativeJavaScriptModuleSpecifier unused
// removed unused import: import { type Result } from "../../domain/result.js";  // Result unused

type _ArtifactPathResolutionContext = "package-entrypoint";

// JavaScriptArtifactPathResolutionHtml.ts 1112-1448
const _htmlCandidate = (
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
