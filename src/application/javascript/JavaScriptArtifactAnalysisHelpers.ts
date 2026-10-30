import { createHash } from "node:crypto";

import { resolveJavaScriptSourceMapReferences } from "../../domain/javascript/javascriptSourceMapPaths.js";
import { htmlArtifactReferences } from "../../domain/javascript/htmlArtifactReferences.js";
import {
  sourceMapJsonText,
  flattenSourceMapLeaves,
} from "../../domain/sourceMapEnvelope.js";
import { hasValidSourceMapContents } from "../../domain/sourceMapContents.js";
import type { JavaScriptStaticAnalysis } from "../../domain/javascript/javascriptStaticAnalysisTypes.js";
import type { JavaScriptArtifactFile } from "../../domain/javascript/javascriptArtifactFiles.js";
import type {
  JavaScriptArtifactAnalysis,
  JavaScriptPackageObservation,
  JavaScriptJsonModuleObservation,
  JavaScriptHtmlScriptObservation,
  JavaScriptHtmlInlineScriptsObservation,
  JavaScriptSourceMapObservation,
  JavaScriptSourceMapOriginal,
  JavaScriptModuleSemanticIr,
} from "./JavaScriptArtifactAnalysisTypes.js";
import { analyzeJavaScriptJsonModule } from "./JavaScriptJsonModules.js";
import type { JavaScriptSemanticGraphProjection } from "./JavaScriptSemanticGraphBuilder.js";

export interface MutableArtifactAnalysis<
  SemanticIr extends JavaScriptModuleSemanticIr,
> {
  readonly files: import("./JavaScriptArtifactAnalysisTypes.js").AnalyzedJavaScriptArtifactFile<SemanticIr>[];
  readonly packages: JavaScriptPackageObservation[];
  readonly jsonModules: JavaScriptJsonModuleObservation[];
  readonly htmlScripts: JavaScriptHtmlScriptObservation[];
  readonly htmlInlineScripts: JavaScriptHtmlInlineScriptsObservation[];
  readonly sourceMaps: JavaScriptSourceMapObservation[];
  visitedNodes: number;
  findings: number;
  modules: number;
  parseFailures: number;
}

export const emptyArtifactAnalysis = <
  SemanticIr extends JavaScriptModuleSemanticIr,
>(): MutableArtifactAnalysis<SemanticIr> => ({
  files: [],
  packages: [],
  jsonModules: [],
  htmlScripts: [],
  htmlInlineScripts: [],
  sourceMaps: [],
  visitedNodes: 0,
  findings: 0,
  modules: 0,
  parseFailures: 0,
});

export const classifyOutsideAnalysisScope = <
  SemanticIr extends JavaScriptModuleSemanticIr,
>(
  file: JavaScriptArtifactFile,
  state: MutableArtifactAnalysis<SemanticIr>,
  projection?: JavaScriptSemanticGraphProjection,
): boolean => {
  if (file.text.included || file.text.reason !== "outside-analysis-scope")
    return false;
  state.files.push({ file, javascript: null, semantic: null });
  if (file.kind === "javascript")
    projection?.recordUnavailableFile(
      file,
      "Source was not analyzed because it is outside the caller-selected source_paths.",
      null,
      "incomplete-module",
    );
  return true;
};

export const addSourceMap = (
  file: JavaScriptArtifactFile,
  context: {
    readonly state: MutableArtifactAnalysis<JavaScriptModuleSemanticIr>;
  },
): void => {
  const sourceMap = parseSourceMap(file);
  context.state.sourceMaps.push(sourceMap);
};

export const addStructuredObservations = (
  file: JavaScriptArtifactFile,
  state: MutableArtifactAnalysis<JavaScriptModuleSemanticIr>,
): void => {
  if (file.kind === "package-json") state.packages.push(parsePackage(file));
  if (file.kind !== "json") return;
  const json = analyzeJavaScriptJsonModule(file);
  state.jsonModules.push(json);
  if (json.status === "invalid") state.parseFailures += 1;
};

export const parsePackage = (
  file: JavaScriptArtifactFile,
): JavaScriptPackageObservation => {
  if (!file.text.included)
    return unavailablePackage(file, "Package metadata text was unavailable.");
  let value: unknown;
  try {
    value = JSON.parse(file.text.value);
  } catch (cause: unknown) {
    void cause;
    return invalidPackage(file, "package.json is not valid JSON.");
  }
  if (!isRecord(value))
    return invalidPackage(file, "package.json root is not an object.");
  return {
    path: file.path,
    sha256: file.sha256,
    status: "included",
    name: optionalString(value.name),
    version: optionalString(value.version),
    main: optionalString(value.main),
    renderer:
      optionalString(value.renderer) ??
      optionalString(value.browser) ??
      optionalString(value.module),
    limitation: null,
  };
};

export const invalidPackage = (
  file: JavaScriptArtifactFile,
  limitation: string,
): JavaScriptPackageObservation => ({
  ...unavailablePackage(file, limitation),
  status: "invalid",
});

export const unavailablePackage = (
  file: JavaScriptArtifactFile,
  limitation: string,
): JavaScriptPackageObservation & { readonly status: "unavailable" } => ({
  path: file.path,
  sha256: file.sha256,
  status: "unavailable",
  name: null,
  version: null,
  main: null,
  renderer: null,
  limitation,
});

export const parseHtmlScripts = (
  path: string,
  text: string,
): {
  readonly scripts: JavaScriptHtmlScriptObservation[];
  readonly inlineScripts: JavaScriptHtmlInlineScriptsObservation | null;
} => {
  const { scripts, inlineScripts, inlineScriptCount, baseHref } =
    htmlArtifactReferences(text);
  return {
    scripts: scripts.map(({ scriptPath, location }) => ({
      html_path: path,
      script_path: scriptPath,
      base_href: baseHref,
      location,
    })),
    inlineScripts:
      inlineScriptCount === 0
        ? null
        : {
            path,
            script_count: inlineScriptCount,
            scripts: inlineScripts.map(({ scriptType, location }) => ({
              script_type: scriptType,
              location,
            })),
          },
  };
};

export const parseSourceMap = (
  file: JavaScriptArtifactFile,
): JavaScriptSourceMapObservation => {
  if (!file.text.included) return unavailableSourceMap(file);
  let value: unknown;
  try {
    value = JSON.parse(sourceMapJsonText(file.text.value));
  } catch (cause: unknown) {
    void cause;
    return invalidSourceMap(file, "Source map is not valid JSON.");
  }
  const maps = flattenSourceMapLeaves(value);
  if (maps === undefined)
    return invalidSourceMap(file, "Source map is not a version 3 map.");
  return collectSourceMapOriginals(file, maps);
};

export const collectSourceMapOriginals = (
  file: JavaScriptArtifactFile,
  maps: readonly Readonly<Record<string, unknown>>[],
): JavaScriptSourceMapObservation => {
  const sources: JavaScriptSourceMapOriginal[] = [];
  let declarationIndex = 0;
  for (const map of maps) {
    const names = map.sources;
    if (!Array.isArray(names))
      return invalidSourceMap(file, "Source map has no sources array.");
    const contents = map.sourcesContent;
    if (!hasValidSourceMapContents(contents))
      return invalidSourceMap(
        file,
        "Source map sourcesContent must be an array of strings or null entries.",
      );
    if (map.sourceRoot != null && typeof map.sourceRoot !== "string")
      return invalidSourceMap(
        file,
        "Source map sourceRoot must be a string or null.",
      );
    const root = typeof map.sourceRoot === "string" ? map.sourceRoot : null;
    const sourceNames: (string | null)[] = [];
    for (const raw of names) {
      if (raw !== null && typeof raw !== "string")
        return invalidSourceMap(
          file,
          "Source map contains a non-string source name.",
        );
      sourceNames.push(raw);
    }
    const references = resolveJavaScriptSourceMapReferences(
      sourceNames,
      root,
      file.path,
    );
    for (const [index, reference] of references.entries()) {
      const rawContent = Array.isArray(contents) ? contents[index] : undefined;
      const content = typeof rawContent === "string" ? rawContent : null;
      sources.push({
        source_index: index,
        declaration_index: declarationIndex++,
        reference,
        content,
        content_sha256: content === null ? null : sha256(content),
      });
    }
  }
  return {
    path: file.path,
    sha256: file.sha256,
    status: "included",
    sources,
    limitation: null,
  };
};

/** Name the HTML file and lines whose inline JavaScript was not analyzed. */
export const htmlInlineScriptLimitation = ({
  path,
  script_count: count,
  scripts,
}: JavaScriptHtmlInlineScriptsObservation): string => {
  const lines = scripts
    .slice(0, HTML_INLINE_SCRIPT_LIMITATION_LINES)
    .map(({ location }) => String(location.start.line));
  const unnamed = count - lines.length;
  const one = count === 1;
  return `${path} has ${String(count)} inline JavaScript ${one ? "body" : "bodies"} starting at line${one ? "" : "s"} ${lines.join(", ")}${unnamed > 0 ? ` and ${String(unnamed)} more` : ""} that ${one ? "was" : "were"} not analyzed; endpoints, storage, imports and other facts in ${one ? "it" : "them"} are absent from the evidence.`;
};

const HTML_INLINE_SCRIPT_LIMITATION_LINES = 10;

export const unavailableSourceMap = (
  file: JavaScriptArtifactFile,
): JavaScriptSourceMapObservation => {
  if (file.text.included)
    throw new TypeError("Expected unavailable source-map text");
  return {
    path: file.path,
    sha256: file.sha256,
    status: "invalid",
    sources: [],
    limitation: "Source-map text could not be decoded as UTF-8.",
  };
};

export const invalidSourceMap = (
  file: JavaScriptArtifactFile,
  limitation: string,
): JavaScriptSourceMapObservation => ({
  path: file.path,
  sha256: file.sha256,
  status: "invalid",
  sources: [],
  limitation,
});

export const findingCount = (analysis: JavaScriptStaticAnalysis): number =>
  analysis.references.length +
  analysis.endpoints.length +
  analysis.storage.length +
  analysis.role_paths.length +
  analysis.source_map_urls.length +
  analysis.bundler_registrations.length +
  analysis.electron.browser_windows.length +
  analysis.electron.context_bridge_apis.length +
  analysis.electron.ipc.length +
  analysis.electron.sender_validations.length +
  analysis.electron.utility_processes.length +
  analysis.electron.native_addon_bindings.length;

export const optionalString = (value: unknown): string | null =>
  typeof value === "string" && value.length > 0 ? value : null;

export const sha256 = (value: string): string =>
  createHash("sha256").update(value).digest("hex");

export const isRecord = (
  value: unknown,
): value is Readonly<Record<string, unknown>> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export const finalizeArtifactAnalysis = <
  SemanticIr extends JavaScriptModuleSemanticIr,
>(
  state: MutableArtifactAnalysis<SemanticIr>,
): JavaScriptArtifactAnalysis<SemanticIr> => {
  return {
    files: state.files,
    packages: state.packages,
    json_modules: state.jsonModules,
    html_scripts: state.htmlScripts,
    html_inline_scripts: state.htmlInlineScripts,
    source_maps: state.sourceMaps,
    visited_ast_nodes: state.visitedNodes,
    findings:
      state.findings +
      state.htmlScripts.length +
      state.htmlInlineScripts.reduce(
        (count, { script_count }) => count + script_count,
        0,
      ),
    modules: state.modules,
    parse_failures: state.parseFailures,
    limitations: [
      "JavaScript and HTML were parsed as inert text; bundle bootstrap code was never executed.",
      "Static paths and relationships may remain unresolved when expressions are dynamic or obfuscated.",
      ...state.htmlInlineScripts.map(htmlInlineScriptLimitation),
      ...state.files.flatMap(
        ({ analysis_failure, application_projection_failure }) =>
          [analysis_failure, application_projection_failure].flatMap(
            (failure) => (failure === undefined ? [] : [failure.reason]),
          ),
      ),
    ],
  };
};
