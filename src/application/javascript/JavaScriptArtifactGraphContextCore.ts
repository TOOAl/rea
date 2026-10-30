import type { ArtifactInventorySnapshot } from "../../domain/artifactInventorySnapshot.js";
import type { JsonValue } from "../../domain/jsonValue.js";
import { compositeKey } from "../../domain/unicodeCodePointOrder.js";
import {
  completeApplicationCoverage,
  partialApplicationCoverage,
  truncatedApplicationCoverage,
  type ApplicationGraphEvidence,
} from "../../domain/javascript/javascriptApplicationEvidenceSchemas.js";
import type { ApplicationNode } from "../../domain/javascript/javascriptApplicationGraphSchemas.js";
import type { JavaScriptSourceRange } from "../../domain/javascript/javascriptStaticAnalysisTypes.js";
import type {
  JavaScriptHtmlInlineScriptsObservation,
  JavaScriptModuleArtifactAnalysis,
} from "./JavaScriptArtifactAnalysisTypes.js";
import type { JavaScriptUnanalyzedArtifactLookup } from "../../domain/javascript/javascriptArtifactFiles.js";
import { HTML_INLINE_SCRIPT_LOCATION_LIMIT } from "../../domain/javascript/htmlArtifactReferences.js";
import type {
  JavaScriptArtifactFile,
  JavaScriptArtifactFileSet,
  JavaScriptArtifactFileKind,
} from "../../domain/javascript/javascriptArtifactFiles.js";
import { JavaScriptArtifactGraphAccumulator } from "./JavaScriptArtifactGraphAccumulator.js";
import {
  artifactObservationEvidence,
  astObservationEvidence,
  staticInferenceEvidence,
  unavailableAstEvidence,
} from "./JavaScriptArtifactGraphEvidence.js";
import {
  artifactPathResolutionProperties,
  resolveArtifactPathByContext,
  type ArtifactPathResolution,
} from "./JavaScriptArtifactPathResolution.js";

/** Mutable graph-construction state scoped to one reconstruction. */
export interface JavaScriptArtifactGraphContext {
  readonly accumulator: JavaScriptArtifactGraphAccumulator;
  readonly snapshot: ArtifactInventorySnapshot;
  readonly fileSet: JavaScriptArtifactFileSet;
  readonly analysis: JavaScriptModuleArtifactAnalysis;
  readonly directoryPaths: ReadonlySet<string>;
  readonly root: ApplicationNode;
  readonly filesByPath: ReadonlyMap<string, JavaScriptArtifactFile>;
  /** Borrowed inventory lookup for present files outside the source projection. */
  readonly unanalyzedFiles: JavaScriptUnanalyzedArtifactLookup | undefined;
  readonly fileNodes: Map<string, ApplicationNode>;
  readonly assetNodes: Map<string, ApplicationNode>;
  readonly sourceModuleNodes: Map<string, ApplicationNode>;
  readonly chunkNodes: Map<string, ApplicationNode>;
  readonly moduleNodes: Map<string, ApplicationNode>;
  readonly containerNodes: Map<string, ApplicationNode>;
}

/** Evidence coverage shape shared by reconstruction graph helpers. */
export type JavaScriptArtifactGraphCoverage =
  ApplicationGraphEvidence["coverage"];

/** Direct artifact-containment edge values. */
export interface ContainsEdgeInput {
  readonly source: ApplicationNode;
  readonly target: ApplicationNode;
  readonly file: JavaScriptArtifactFile;
  readonly operation: string;
}

/** Exact AST containment edge values. */
export interface AstEdgeInput {
  readonly source: ApplicationNode;
  readonly target: ApplicationNode;
  readonly file: JavaScriptArtifactFile;
  readonly range: JavaScriptSourceRange;
  readonly coverage: JavaScriptArtifactGraphCoverage;
  readonly properties: Readonly<Record<string, unknown>>;
}

/** Inferred static relationship edge values. */
export interface InferenceEdgeInput extends AstEdgeInput {
  readonly limitations?: readonly string[];
  readonly confidence?: "high" | "medium" | "low";
  readonly relation:
    | "imports"
    | "loads"
    | "maps_to"
    | "exposes"
    | "calls"
    | "persists_to";
}

/** Electron role identity and static discovery evidence. */
export interface RoleNodeInput {
  readonly kind: "electron-main" | "electron-preload" | "electron-renderer";
  readonly anchor: JavaScriptArtifactFile;
  readonly resolution: ArtifactPathResolution;
  readonly mechanism: string;
  readonly range?: JavaScriptSourceRange;
  readonly coverage?: JavaScriptArtifactGraphCoverage;
}

/** Resolution from an inferred Electron role to an artifact asset. */
export interface RoleAssetLinkInput {
  readonly role: ApplicationNode;
  readonly anchor: JavaScriptArtifactFile;
  readonly resolution: ArtifactPathResolution;
  readonly range?: JavaScriptSourceRange;
  readonly coverage?: JavaScriptArtifactGraphCoverage;
}

/** Explicit package, JavaScript, or source-map parse gap. */
export interface UnavailableParseInput {
  readonly file: JavaScriptArtifactFile;
  readonly asset: ApplicationNode;
  readonly operation: string;
  readonly limitation: string;
  readonly failure?: JsonValue;
  readonly limits?: JavaScriptArtifactGraphCoverage["limits"];
  /** Items a named limit dropped from this gap's own record, when known. */
  readonly omittedCount?: number;
  /** Structured details of the gap, such as the exact omitted locations. */
  readonly details?: Readonly<Record<string, JsonValue>>;
}

/** The per-file bound on retained inline HTML script locations. */
export const HTML_INLINE_SCRIPT_LOCATION_COVERAGE_LIMIT = {
  name: "html_inline_script_locations_per_file",
  value: HTML_INLINE_SCRIPT_LOCATION_LIMIT,
  unit: "items",
} as const;

/** Count inline HTML script locations dropped by the per-file bound. */
export const omittedHtmlInlineScriptLocations = (
  files: readonly JavaScriptHtmlInlineScriptsObservation[],
): number =>
  files.reduce(
    (omitted, { script_count, scripts }) =>
      omitted + script_count - scripts.length,
    0,
  );

/** Add a direct artifact-containment edge. */
export const addArtifactContainsEdge = (
  context: JavaScriptArtifactGraphContext,
  input: ContainsEdgeInput,
): void => {
  context.accumulator.addEdge({
    source_node_id: input.source.node_id,
    target_node_id: input.target.node_id,
    relation: "contains",
    properties: { path: input.file.path },
    evidence: artifactObservationEvidence({
      sha256:
        input.operation === "inventory-entry"
          ? input.file.container_sha256
          : input.file.sha256,
      path: input.file.path,
      operation: input.operation,
      coverage: completeApplicationCoverage(),
    }),
  });
};

/** Add an exact AST containment edge. */
export const addAstContainsEdge = (
  context: JavaScriptArtifactGraphContext,
  input: AstEdgeInput,
): void => {
  context.accumulator.addEdge({
    source_node_id: input.source.node_id,
    target_node_id: input.target.node_id,
    relation: "contains",
    properties: input.properties,
    evidence: astObservationEvidence({
      sha256: input.file.sha256,
      path: input.file.path,
      range: input.range,
      operation: "map-bundler-structure",
      coverage: input.coverage,
    }),
  });
};

/** Add an explicitly inferred static relationship edge. */
export const addStaticInferenceEdge = (
  context: JavaScriptArtifactGraphContext,
  input: InferenceEdgeInput,
): void => {
  context.accumulator.addEdge({
    source_node_id: input.source.node_id,
    target_node_id: input.target.node_id,
    relation: input.relation,
    properties: input.properties,
    evidence: staticInferenceEvidence({
      sha256: input.file.sha256,
      path: input.file.path,
      range: input.range,
      operation: "map-static-relationship",
      coverage: input.coverage,
      ...(input.confidence === undefined
        ? {}
        : { confidence: input.confidence }),
      ...(input.limitations === undefined
        ? {}
        : { limitations: input.limitations }),
    }),
  });
};

/** Preserve a static parse or approval gap as an explicit unknown scope. */
