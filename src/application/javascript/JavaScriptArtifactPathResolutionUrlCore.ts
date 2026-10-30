import { posix } from "node:path";

import type {
  JavaScriptArtifactFile,
  JavaScriptUnanalyzedArtifactLookup,
} from "../../domain/javascript/javascriptArtifactFiles.js";
import {
  hasScheme,
  htmlUrlText,
  looksExternal,
  percentDecodeUrlPath,
  stripQueryAndFragment,
} from "../../domain/artifactPathSyntax.js";
import type { _TypeScriptEmittedSourceCandidate } from "../TypeScriptEmittedSourceCandidates.js";
import { isRelativeJavaScriptModuleSpecifier } from "../../domain/javascript/javascriptModuleSpecifier.js";
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
