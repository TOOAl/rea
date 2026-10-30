import { uniqueSorted } from "../canonicalOrdering.js";
import { compareUnicodeCodePoints } from "../unicodeCodePointOrder.js";
import { digestCanonicalValue } from "../canonicalDigest.js";

import type { HistoricalSourceGraph } from "../referenceSourceGraph.js";
import {
  sourceToBundleComparisonResultSchema,
  type SourceToBundleCandidate,
  type SourceToBundleComparisonItem,
  type SourceToBundleComparisonResult,
} from "./sourceToBundleComparisonSchemas.js";

const classifyMapping = (
  candidates: readonly SourceToBundleCandidate[],
  absenceComplete: boolean,
  digestComparable: (nodeId: string) => boolean,
): ClassifiedMapping => {
  const exact = candidates.filter((candidate) =>
    hasSignal(candidate, "exact-source-digest"),
  );
  if (exact.length === 1)
    return {
      status: "unchanged",
      confidence: "exact",
      currentNodeIds: [exact[0]?.current_node_id ?? ""].filter(Boolean),
      limitations: [
        "Exact byte identity does not establish equivalent load context or runtime behavior.",
      ],
    };
  if (exact.length > 1)
    return {
      status: "duplicated",
      confidence: "exact",
      currentNodeIds: exact.map(({ current_node_id: nodeId }) => nodeId),
      limitations: [
        "The same historical source digest occurs in multiple current graph nodes.",
      ],
    };
  const pathCandidates = candidates.filter((candidate) =>
    candidate.signals.some(({ kind }) =>
      [
        "source-map-original-path",
        "current-path-exact",
        "current-path-suffix",
      ].includes(kind),
    ),
  );
  const topScore = pathCandidates[0]?.score;
  const topPathCandidates =
    topScore === undefined
      ? []
      : pathCandidates.filter(({ score }) => score === topScore);
  if (topPathCandidates.length === 1) {
    const candidate = topPathCandidates[0];
    if (candidate !== undefined && digestComparable(candidate.current_node_id))
      return {
        status: "modified",
        confidence: candidate.confidence === "high" ? "high" : "medium",
        currentNodeIds: [candidate.current_node_id],
        limitations: [
          "Location evidence links the source to the current node, but their source digests differ.",
        ],
      };
    return {
      status: "unknown",
      confidence: "unknown",
      currentNodeIds:
        candidate === undefined ? [] : [candidate.current_node_id],
      limitations: [
        "Location evidence links the source to the current node, but comparable source digests are unavailable.",
      ],
    };
  }
  if (topPathCandidates.length > 1)
    return {
      status: "split",
      confidence: "medium",
      currentNodeIds: topPathCandidates.map(
        ({ current_node_id: nodeId }) => nodeId,
      ),
      limitations: [
        "Multiple equally scored current nodes retain the historical source path; this is a static split inference, not runtime proof.",
      ],
    };
  if (candidates.length > 0)
    return {
      status: "unknown",
      confidence: "unknown",
      currentNodeIds: [],
      limitations: [
        candidates.some((candidate) =>
          hasSignal(candidate, "unicode-equivalent-path"),
        )
          ? "Unicode-equivalent paths are inferred candidates only; filesystem paths with distinct Unicode spellings may identify different files, so no mapping was forced."
          : "Only weak basename or extension signals were available; no mapping was forced.",
      ],
    };
  return absenceComplete
    ? {
        status: "removed",
        confidence: "high",
        currentNodeIds: [],
        limitations: [
          "No retained current node matched exact digest or path signals within complete static inventories.",
        ],
      }
    : {
        status: "unknown",
        confidence: "unknown",
        currentNodeIds: [],
        limitations: [
          "No candidate was observed, but incomplete input or graph coverage prevents a removal claim.",
        ],
      };
};

const markMergedMappings = (
  input: SourceToBundleComparisonInput,
  items: readonly SourceToBundleComparisonItem[],
): SourceToBundleComparisonItem[] => {
  const sourcesByNode = new Map<string, SourceToBundleComparisonItem[]>();
  for (const item of items) {
    if (item.status !== "unchanged" || item.current_node_ids.length !== 1)
      continue;
    const nodeId = item.current_node_ids[0];
    if (nodeId === undefined) continue;
    sourcesByNode.set(nodeId, [...(sourcesByNode.get(nodeId) ?? []), item]);
  }
  const mergedSources = new Set(
    [...sourcesByNode.values()]
      .filter((group) => group.length > 1)
      .flatMap((group) => group.map(({ source_path: path }) => path)),
  );
  return items.map((item) => {
    if (!mergedSources.has(item.source_path)) return item;
    const { mapping_id: previousMappingId, ...base } = item;
    void previousMappingId;
    const semantic = {
      ...base,
      status: "merged" as const,
      confidence: "exact" as const,
      limitations: uniqueSorted([
        ...item.limitations,
        "Multiple historical source paths have exact digest identity with the same current graph node.",
      ]),
    };
    return { ...semantic, mapping_id: mappingId(input, semantic) };
  });
};

const mappingId = (
  input: SourceToBundleComparisonInput,
  item: Omit<SourceToBundleComparisonItem, "mapping_id">,
): string =>
  `stbc_item_${digestCanonicalValue(
    {
      reference_root_sha256: input.reference.root_sha256,
      application_graph_id: input.application.graph.graph_id,
      ...item,
    },
    "Source-to-bundle comparison",
  )}`;

const comparisonSummary = (
  items: readonly SourceToBundleComparisonItem[],
): SourceToBundleComparisonResult["summary"] => ({
  unchanged: countStatus(items, "unchanged"),
  modified: countStatus(items, "modified"),
  removed: countStatus(items, "removed"),
  split: countStatus(items, "split"),
  merged: countStatus(items, "merged"),
  duplicated: countStatus(items, "duplicated"),
  unknown: countStatus(items, "unknown"),
});

const countStatus = (
  items: readonly SourceToBundleComparisonItem[],
  status: SourceToBundleComparisonItem["status"],
): number => items.filter((item) => item.status === status).length;

interface CoverageFactors {
  readonly input: SourceToBundleComparisonInput;
}

const coverageStatus = (
  factors: CoverageFactors,
): SourceToBundleComparisonResult["coverage"]["status"] => {
  return factors.input.reference.inventory_state === "complete" &&
    factors.input.application.graph.coverage.status === "complete"
    ? "complete-within-inputs"
    : "partial";
};

const comparisonLimitations = (factors: CoverageFactors): string[] =>
  uniqueSorted([
    "Static digest and location signals do not establish runtime behavior, semantic equivalence, or absence of dynamically generated modules.",
    ...factors.input.reference.limitations,
    ...factors.input.application.graph.limitations,
    ...(factors.input.reference.inventory_state === "complete"
      ? []
      : [
          `Historical source inventory is ${factors.input.reference.inventory_state}; unmatched files remain unknown.`,
        ]),
    ...(factors.input.application.graph.coverage.status === "complete"
      ? []
      : [
          `Application graph coverage is ${factors.input.application.graph.coverage.status}; unmatched files remain unknown.`,
        ]),
  ]);

const hasSignal = (
  candidate: SourceToBundleCandidate,
  kind: SourceToBundleCandidate["signals"][number]["kind"],
): boolean => candidate.signals.some((signal) => signal.kind === kind);

const compareCandidates = (
  left: SourceToBundleCandidate,
  right: SourceToBundleCandidate,
): number =>
  right.score - left.score ||
  compareUnicodeCodePoints(left.current_node_id, right.current_node_id);
