import {
  AnalysisInputError,
  type AnalysisInputIssue,
} from "../analysisErrorCore.js";
import type { AnalysisError } from "../analysisErrorBase.js";
import type { JsonValue } from "../jsonValue.js";
import type { JavaScriptApplicationAnalysisResult } from "../javascript/javascriptApplicationAnalysis.js";
import type { ApplicationNode } from "../javascript/javascriptApplicationGraphSchemas.js";
import type { JavaScriptModuleReference } from "./javascriptModuleReferences.js";
import type { AnalysisViewRequest } from "./analysisView.js";

const OPERATION = "inspect_analysis_view";

const inputError = (
  issues: readonly AnalysisInputIssue[],
): AnalysisInputError => new AnalysisInputError(OPERATION, undefined, issues);

const jsIncompatible = (detail: string): AnalysisError =>
  inputError([
    {
      path: ["view"],
      reason: "invalid_value",
      message: detail,
    },
  ]);

/** Exact module path or original source-map reference, when available. */
export const javascriptModulePath = (node: ApplicationNode): string | null => {
  if (node.identity.strategy === "canonical-path") return node.identity.path;
  if (node.identity.strategy === "source-map-original")
    return node.identity.original_source;
  for (const observation of node.observations) {
    const path = observation.properties.path;
    if (typeof path === "string") return path;
    const location = observation.evidence.location;
    if (location.available && location.value.kind === "artifact-path")
      return location.value.path;
    if (location.available && location.value.kind === "source-range")
      return location.value.source;
  }
  return null;
};

interface ModuleEntry {
  readonly node: ApplicationNode & {
    readonly kind: JavaScriptModuleReference["kind"];
  };
  readonly path: string | null;
}

const isModuleNode = (node: ApplicationNode): node is ModuleEntry["node"] =>
  node.kind === "javascript-asset" ||
  node.kind === "javascript-module" ||
  node.kind === "source-module";

/** One owner for the module kinds and path semantics of every module view. */
function* moduleEntries(
  nodes: readonly ApplicationNode[],
): Generator<ModuleEntry> {
  for (const node of nodes) {
    if (isModuleNode(node)) yield { node, path: javascriptModulePath(node) };
  }
}

/** Scan retained order once; materialize only the requested matching page. */
const modulePage = (
  nodes: readonly ApplicationNode[],
  view: {
    readonly offset: number;
    readonly limit: number;
    readonly where?: Extract<
      AnalysisViewRequest,
      { kind: "javascript" }
    >["where"];
  },
): { entries: ModuleEntry[]; total: number } => {
  const entries: ModuleEntry[] = [];
  let total = 0;
  for (const entry of moduleEntries(nodes)) {
    if (view.where?.kind !== undefined && entry.node.kind !== view.where.kind)
      continue;
    if (view.where?.path !== undefined && entry.path !== view.where.path)
      continue;
    if (total >= view.offset && entries.length < view.limit)
      entries.push(entry);
    total += 1;
  }
  return { entries, total };
};

const exportNames = (node: ApplicationNode): readonly string[] => {
  const names = new Set<string>();
  for (const observation of node.observations) {
    const value =
      observation.properties.export_names ?? observation.properties.exports;
    if (!Array.isArray(value)) continue;
    for (const entry of value) if (typeof entry === "string") names.add(entry);
  }
  return [...names];
};

const nodeHashes = (node: ApplicationNode): readonly string[] => {
  const hashes = new Set<string>();
  const { identity } = node;
  if (identity.strategy === "content-digest") hashes.add(identity.sha256);
  if (identity.strategy === "canonical-path")
    hashes.add(identity.artifact_sha256);
  if (identity.strategy === "source-map-original") {
    hashes.add(identity.source_map_sha256);
    if (identity.source_sha256 !== null) hashes.add(identity.source_sha256);
  }
  for (const observation of node.observations) {
    for (const key of [
      "sha256",
      "container_sha256",
      "entry_sha256",
      "source_sha256",
    ] as const) {
      const value = observation.properties[key];
      if (typeof value === "string" && /^[a-f0-9]{64}$/u.test(value))
        hashes.add(value);
    }
  }
  return [...hashes];
};

const sourceRanges = (node: ApplicationNode): readonly JsonValue[] =>
  node.observations.flatMap((observation) => {
    const location = observation.evidence.location;
    return location.available && location.value.kind === "source-range"
      ? [location.value]
      : [];
  });

const moduleItem = (node: ApplicationNode): JsonValue => ({
  node_id: node.node_id,
  kind: node.kind,
  path: javascriptModulePath(node),
  identity: node.identity,
  hashes: [...nodeHashes(node)],
  exports: [...exportNames(node)],
  source_ranges: [...sourceRanges(node)],
  observations: node.observations.map((observation) => ({
    observation_id: observation.observation_id,
    label: observation.label,
    properties: observation.properties,
    evidence: {
      ...observation.evidence,
      location: observation.evidence.location,
    },
  })),
});

const moduleReference = ({
  node,
  path,
}: ModuleEntry): JavaScriptModuleReference => {
  let ranges = 0;
  const support = new Map<string, JavaScriptModuleReference["basis"][number]>();
  for (const { evidence } of node.observations) {
    if (
      evidence.location.available &&
      evidence.location.value.kind === "source-range"
    )
      ranges += 1;
    const { authority, state, confidence } = evidence;
    support.set(`${authority}:${state}:${confidence}`, {
      authority,
      state,
      confidence,
    });
  }
  return {
    node_id: node.node_id,
    kind: node.kind,
    path,
    identity: node.identity,
    retained_source_range_count: ranges,
    basis: [...support.values()],
  };
};

const applicationUnknownCount = (
  analysis: JavaScriptApplicationAnalysisResult,
): number =>
  analysis.graph.nodes.reduce(
    (count, node) => count + Number(node.kind === "unknown"),
    0,
  );

const javascriptCoverageUnknowns = (
  analysis: JavaScriptApplicationAnalysisResult,
): readonly string[] => {
  const unknowns: string[] = [];
  if (analysis.graph.coverage.status !== "complete")
    unknowns.push(`graph.coverage.status is ${analysis.graph.coverage.status}`);
  if (analysis.semantic_graph.coverage.status !== "complete")
    unknowns.push(
      `semantic_graph.coverage.status is ${analysis.semantic_graph.coverage.status}`,
    );
  const applicationUnknowns = applicationUnknownCount(analysis);
  if (applicationUnknowns > 0)
    unknowns.push(
      `${String(applicationUnknowns)} application graph unknowns remain in the parent Evidence.`,
    );
  if (analysis.semantic_graph.unknowns.length > 0)
    unknowns.push(
      `${String(analysis.semantic_graph.unknowns.length)} semantic graph unknowns remain in the parent Evidence.`,
    );
  return unknowns;
};
