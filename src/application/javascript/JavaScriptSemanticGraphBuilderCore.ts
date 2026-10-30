import {
  createJavaScriptSemanticGraph,
  createJavaScriptSemanticGraphUnknown,
  sealTransferredJavaScriptSemanticGraphSteps,
  type JavaScriptSemanticGraph,
} from "../../domain/javascript/javascriptSemanticGraph.js";
import {
  JAVASCRIPT_SEMANTIC_RELATION_FAMILIES,
  JAVASCRIPT_SEMANTIC_RELATION_FAMILY,
  JAVASCRIPT_SEMANTIC_RELATIONS,
} from "../../domain/javascript/javascriptSemanticGraphSchemas.js";
import type { JavaScriptArtifactFile } from "../../domain/javascript/javascriptArtifactFiles.js";
import type { JavaScriptSemanticIr } from "../../domain/javascript/javascriptSemanticIr.js";
import { observedSemanticEvidence } from "./JavaScriptSemanticGraphEvidence.js";
import {
  partialApplicationCoverage,
  type ApplicationCoverage,
} from "../../domain/javascript/javascriptApplicationEvidenceSchemas.js";
import {
  JAVASCRIPT_ANALYSIS_RESOURCE_DEFAULTS,
  JAVASCRIPT_SEMANTIC_NODE_MAXIMUM,
  javaScriptAnalysisCoverageLimits,
} from "../../domain/javascript/javascriptAnalysisResourceControls.js";
import { semanticFamilyStatus } from "./JavaScriptSemanticGraphProjection.js";
import {
  addSemanticFallbackRoot as addFallbackRoot,
  retainSemanticGraphNode as retainNode,
  createSemanticGraphProjectionState as emptyState,
  bindSemanticGraphApplicationNodes,
} from "./JavaScriptSemanticGraphConstruction.js";
import type { ElectronCallPath } from "../../domain/javascript/electronStaticAnalysisTypes.js";
import { projectFileSteps } from "./JavaScriptSemanticGraphBuilderFileSteps.js";
import type { BuilderInput } from "./JavaScriptSemanticGraphBuilderTypes.js";
/**
 * Resource-safety ceiling on retained semantic nodes.
 *
 * The semantic projection emits one node per AST expression, call site, binding
 * and property slot. That is unbounded in input size. A small tree of five files
 * already yields on the order of 170,000 nodes, and larger trees yield millions,
 * exhausting the heap before the result can be serialized.
 *
 * This is a real resource-safety constraint, not a presentation preference, so
 * the ceiling is applied and reported through the graph's own `coverage` fields
 * (`truncated`, `omitted_nodes`, `omitted_relations`, `limits`) rather than
 * silently dropping data.
 *
 * Defaults bound work even when ample heap is available. Callers may raise the
 * capacities explicitly; isolated worker heap, bounded record transport and
 * parent result admission independently constrain actual retained memory. The
 * result uses incremental serialization rather than a single JSON string.
 */
export const SEMANTIC_GRAPH_NODE_CEILING =
  JAVASCRIPT_ANALYSIS_RESOURCE_DEFAULTS.semanticNodes;

/**
 * Per-file share of the semantic node budget.
 *
 * Bound each source file independently so one large bundled library cannot
 * consume the whole tree's budget and starve the application's own modules.
 */
export const SEMANTIC_GRAPH_FILE_NODE_CEILING =
  JAVASCRIPT_ANALYSIS_RESOURCE_DEFAULTS.semanticNodesPerFile;

export const buildJavaScriptSemanticGraph = ({
  rootArtifactSha256,
  applicationGraph,
  analysis,
}: BuilderInput): JavaScriptSemanticGraph => {
  const projection = createJavaScriptSemanticGraphProjection();
  for (const analyzed of analysis.files) {
    if (analyzed.semantic !== null)
      projection.projectFile(
        analyzed.file,
        analyzed.semantic.ir,
        analyzed.javascript?.electron.call_paths,
      );
    else if (
      !analyzed.file.text.included &&
      analyzed.file.text.reason === "outside-analysis-scope"
    )
      projection.recordUnavailableFile(
        analyzed.file,
        "Source was not analyzed because it is outside the caller-selected source_paths.",
        null,
        "incomplete-module",
      );
  }
  return projection.finish(rootArtifactSha256, applicationGraph);
};

/** File-local semantic projection that does not retain consumed source IR. */
export interface JavaScriptSemanticGraphProjection {
  /** Node capacity offered to the next independently analyzed source file. */
  readonly remainingFileNodeBudget: () => number;
  /** Adopt decoded file-local facts; final validation and proof remain in this realm. */
  readonly adoptFileProjection: (
    projection: JavaScriptSemanticFileProjection,
  ) => void;
  /** Preserve source-bound unknowns for an execution or result-retention failure. */
  readonly recordUnavailableFile: (
    file: JavaScriptArtifactFile,
    reason: string,
    limits: Readonly<Record<string, JsonValue>> | null,
    unknownReason: "resource-limit" | "incomplete-module",
  ) => void;
  readonly projectFile: (
    file: JavaScriptArtifactFile,
    ir: JavaScriptSemanticIr,
    paths?: readonly ElectronCallPath[],
  ) => void;
  /** Project one file in steps between its projection passes. */
  readonly projectFileSteps: (
    file: JavaScriptArtifactFile,
    ir: JavaScriptSemanticIr,
    paths?: readonly ElectronCallPath[],
  ) => Generator<void, void>;
  readonly finish: (
    rootArtifactSha256: string,
    applicationGraph: BuilderInput["applicationGraph"],
  ) => JavaScriptSemanticGraph;
  readonly finishImmutableSteps: (
    rootArtifactSha256: string,
    applicationGraph: BuilderInput["applicationGraph"],
  ) => Generator<void, JavaScriptSemanticGraph>;
}

/** Accumulate semantic nodes while each source IR is still file-local. */
