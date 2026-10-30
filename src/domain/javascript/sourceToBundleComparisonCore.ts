import { uniqueSorted } from "../canonicalOrdering.js";
import { compareUnicodeCodePoints } from "../unicodeCodePointOrder.js";
import { absenceClaimable } from "../comparisonSemantics.js";
import { digestCanonicalValue } from "../canonicalDigest.js";

import type { JavaScriptApplicationGraph } from "./javascriptApplicationGraph.js";
import type { HistoricalSourceGraph } from "../referenceSourceGraph.js";
import {
  SOURCE_TO_BUNDLE_SIGNAL_WEIGHTS,
  sourceToBundleComparisonResultSchema,
  type SourceToBundleCandidate,
  type SourceToBundleComparisonItem,
  type SourceToBundleComparisonResult,
} from "./sourceToBundleComparisonSchemas.js";
import {
  buildSourceToBundleCandidateIndex,
  candidateHasDigest,
  candidateIdsForSource,
  historicalSourceFiles,
  scoreSourceToBundleCandidate,
  sourceBearingNodes,
  type SourceToBundleCandidateIndex,
} from "./sourceToBundleSignals.js";

interface SourceToBundleComparisonInput {
  readonly reference: HistoricalSourceGraph;
  readonly application: {
    readonly evidenceId: string;
    readonly rootArtifactSha256: string;
    readonly graph: JavaScriptApplicationGraph;
  };
}

interface ClassifiedMapping {
  readonly status: SourceToBundleComparisonItem["status"];
  readonly confidence: SourceToBundleComparisonItem["confidence"];
  readonly currentNodeIds: string[];
  readonly limitations: string[];
}

interface ComparisonProjection {
  readonly sources: ReturnType<typeof historicalSourceFiles>;
  readonly currentNodes: ReturnType<typeof sourceBearingNodes>;
  readonly index: SourceToBundleCandidateIndex;
  readonly absenceComplete: boolean;
  readonly factors: CoverageFactors;
}

interface MappingProjection {
  readonly items: SourceToBundleComparisonItem[];
  readonly candidateEvaluations: number;
}

/** Compare historical source files to static source-bearing application nodes. */
export const compareSourceToBundle = (
  input: SourceToBundleComparisonInput,
): SourceToBundleComparisonResult => {
  const projection = projectComparison(input);
  const mappings = compareMappings(input, projection);
  const factors = {
    ...projection.factors,
  };
  const mappedCurrentIds = new Set(
    mappings.items.flatMap(({ current_node_ids: nodeIds }) => nodeIds),
  );
  const unmappedCurrentNodeIds = projection.currentNodes
    .map(({ node_id: nodeId }) => nodeId)
    .filter((nodeId) => !mappedCurrentIds.has(nodeId));
  const semanticResult = {
    reference: {
      root_sha256: input.reference.root_sha256,
      inventory_state: input.reference.inventory_state,
    },
    application: {
      evidence_id: input.application.evidenceId,
      graph_id: input.application.graph.graph_id,
      root_artifact_sha256: input.application.rootArtifactSha256,
    },
    scoring: scoringModel(),
    summary: comparisonSummary(mappings.items),
    items: mappings.items,
    unmapped_current_node_ids: unmappedCurrentNodeIds,
    coverage: comparisonCoverage(projection, mappings, factors),
    evidence_links: [input.application.evidenceId],
    limitations: comparisonLimitations(factors),
  };
  return sourceToBundleComparisonResultSchema.parse({
    ...semanticResult,
    comparison_id: `stbc_${digestCanonicalValue(semanticResult, "Source-to-bundle comparison")}`,
  });
};

const projectComparison = (
  input: SourceToBundleComparisonInput,
): ComparisonProjection => {
  const allSources = historicalSourceFiles(input.reference);
  const allCurrentNodes = sourceBearingNodes(input.application.graph.nodes);
  const sources = allSources;
  const currentNodes = allCurrentNodes;
  const index = buildSourceToBundleCandidateIndex(currentNodes);
  return {
    sources,
    currentNodes,
    index,
    absenceComplete:
      input.reference.inventory_state === "complete" &&
      absenceClaimable(input.application.graph.coverage),
    factors: {
      input,
    },
  };
};

const compareMappings = (
  input: SourceToBundleComparisonInput,
  projection: ComparisonProjection,
): MappingProjection => {
  let candidateEvaluations = 0;
  const provisionalItems: SourceToBundleComparisonItem[] = [];
  for (const source of projection.sources) {
    const candidateIds = candidateIdsForSource(source, projection.index);
    candidateEvaluations += candidateIds.length;
    const scored = candidateIds
      .map((nodeId) =>
        scoreSourceToBundleCandidate(source, nodeId, projection.index),
      )
      .filter(
        (candidate): candidate is SourceToBundleCandidate => candidate !== null,
      )
      .sort(compareCandidates);
    const classification = classifyMapping(
      scored,
      projection.absenceComplete,
      (nodeId) =>
        source.sha256 !== null && candidateHasDigest(projection.index, nodeId),
    );
    const semantic = {
      source_path: source.path,
      source_sha256: source.sha256,
      source_language: source.language,
      status: classification.status,
      confidence: classification.confidence,
      current_node_ids: classification.currentNodeIds,
      candidates: scored,
      limitations: uniqueSorted([
        ...source.limitations,
        ...classification.limitations,
      ]),
    };
    provisionalItems.push({
      mapping_id: mappingId(input, semantic),
      ...semantic,
    });
  }
  return {
    items: markMergedMappings(input, provisionalItems),
    candidateEvaluations,
  };
};

const comparisonCoverage = (
  projection: ComparisonProjection,
  mappings: MappingProjection,
  factors: CoverageFactors,
): SourceToBundleComparisonResult["coverage"] => ({
  status: coverageStatus(factors),
  reference_inventory_state: factors.input.reference.inventory_state,
  application_graph_status: factors.input.application.graph.coverage.status,
  retained_source_files: projection.sources.length,
  retained_application_nodes: projection.currentNodes.length,
  candidate_evaluations: mappings.candidateEvaluations,
});

const scoringModel = (): SourceToBundleComparisonResult["scoring"] => ({
  algorithm: "rea-source-to-bundle-signals",
  minimum_candidate_score: 20,
  weights: SOURCE_TO_BUNDLE_SIGNAL_WEIGHTS.map(([signal, weight]) => ({
    signal,
    weight,
  })),
});
