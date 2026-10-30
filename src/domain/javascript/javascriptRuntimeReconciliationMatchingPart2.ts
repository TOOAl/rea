import { createJavaScriptApplicationEdge } from "./javascriptApplicationGraph.js";
import type { ApplicationGraphEvidence } from "./javascriptApplicationEvidenceSchemas.js";
import { digestCanonicalValue } from "../canonicalDigest.js";
import type { ParsedStaticLayer } from "./javascriptRuntimeReconciliationParsing.js";
import type { JavaScriptRuntimeReconciliationItem } from "./javascriptRuntimeReconciliationSchemas.js";
import type { RuntimeReconciliationEntity } from "./javascriptRuntimeReconciliationRuntime.js";
import type {
  MappedRuntimePath,
  StaticRuntimeCandidate,
} from "./javascriptRuntimeStaticCandidates.js";

const indexCandidates = (
  candidates: readonly StaticRuntimeCandidate[],
): CandidateIndex => {
  const byCategoryDigest = new Map<string, StaticRuntimeCandidate[]>();
  const byLayerCategoryPath = new Map<string, StaticRuntimeCandidate[]>();
  const byNativeDeclarationPath = new Map<
    string,
    { candidate: StaticRuntimeCandidate; sourcePath: string | null }[]
  >();
  for (const candidate of candidates) {
    for (const { sha256 } of candidate.digests)
      appendIndex(
        byCategoryDigest,
        categoryDigestKey(candidate.category, sha256),
        candidate,
      );
    for (const path of candidate.paths)
      appendIndex(
        byLayerCategoryPath,
        layerCategoryPathKey(candidate.layer.layerId, candidate.category, path),
        candidate,
      );
    for (const style of ["posix", "windows"] as const)
      for (const { path, sourcePath } of candidate.nativeDeclarationPaths[
        style
      ])
        appendIndex(
          byNativeDeclarationPath,
          `${style}\0${layerCategoryPathKey(candidate.layer.layerId, candidate.category, path)}`,
          { candidate, sourcePath },
        );
  }
  return { byCategoryDigest, byLayerCategoryPath, byNativeDeclarationPath };
};

const appendIndex = <Value>(
  index: Map<string, Value[]>,
  key: string,
  candidate: Value,
): void => {
  const values = index.get(key);
  if (values === undefined) index.set(key, [candidate]);
  else values.push(candidate);
};

const categoryDigestKey = (category: string, digest: string): string =>
  `${category}\0${digest}`;

const layerCategoryPathKey = (
  layerId: string,
  category: string,
  path: string,
): string => `${layerId}\0${category}\0${path}`;

const matched = (
  entity: RuntimeReconciliationEntity,
  candidate: StaticRuntimeCandidate,
  input: Pick<ItemInput, "basis" | "confidence" | "reason">,
): EvaluatedMatch => {
  const item = createItem(entity, {
    layer: candidate.layer,
    staticNodeId: candidate.node.node_id,
    status: "matched",
    basis: input.basis,
    confidence: input.confidence,
    reason: input.reason,
    candidates: [candidate],
  });
  return {
    item,
    edge: createJavaScriptApplicationEdge({
      source_node_id: candidate.node.node_id,
      target_node_id: entity.node.node_id,
      relation: "observed_as",
      properties: {
        reconciliation_id: item.reconciliation_id,
        basis: input.basis,
        static_layer_id: candidate.layer.layerId,
      },
      evidence: reconciliationEvidence(
        entity,
        candidate.layer,
        input.basis,
        input.confidence,
      ),
    }),
  };
};

const unresolved = (
  entity: RuntimeReconciliationEntity,
  input: Pick<ItemInput, "basis" | "confidence" | "reason" | "candidates"> & {
    readonly status: Exclude<
      JavaScriptRuntimeReconciliationItem["status"],
      "matched"
    >;
  },
): EvaluatedMatch => ({
  item: createItem(entity, {
    layer: null,
    staticNodeId: null,
    status: input.status,
    basis: input.basis,
    confidence: input.confidence,
    reason: input.reason,
    candidates: input.candidates,
  }),
  edge: null,
});

type ItemInput = {
  readonly basis: JavaScriptRuntimeReconciliationItem["basis"];
  readonly confidence: JavaScriptRuntimeReconciliationItem["confidence"];
  readonly reason: JavaScriptRuntimeReconciliationItem["reason"];
  readonly candidates: readonly StaticRuntimeCandidate[];
} & (
  | {
      readonly layer: ParsedStaticLayer;
      readonly staticNodeId: string;
      readonly status: "matched";
    }
  | {
      readonly layer: null;
      readonly staticNodeId: null;
      readonly status: Exclude<
        JavaScriptRuntimeReconciliationItem["status"],
        "matched"
      >;
    }
);

const createItem = (
  entity: RuntimeReconciliationEntity,
  input: ItemInput,
): JavaScriptRuntimeReconciliationItem => {
  const candidateReferences = uniqueCandidateReferences(input.candidates);
  const staticMatch =
    input.status === "matched"
      ? {
          static_layer_id: input.layer.layerId,
          static_node_id: input.staticNodeId,
          status: input.status,
        }
      : {
          static_layer_id: null,
          static_node_id: null,
          status: input.status,
        };
  const semantic = {
    entity_kind: entity.kind,
    runtime_evidence_id: entity.capture.evidence.evidence_id,
    runtime_node_id: entity.node.node_id,
    ...staticMatch,
    basis: input.basis,
    confidence: input.confidence,
    reason: input.reason,
    candidate_static_count: candidateReferences.count,
    candidate_static_nodes: candidateReferences.items,
  } satisfies Omit<JavaScriptRuntimeReconciliationItem, "reconciliation_id">;
  return {
    reconciliation_id: `jrr_item_${digestCanonicalValue(semantic, "Runtime reconciliation")}`,
    ...semantic,
  };
};

const reconciliationEvidence = (
  entity: RuntimeReconciliationEntity,
  layer: ParsedStaticLayer,
  basis: JavaScriptRuntimeReconciliationItem["basis"],
  confidence: JavaScriptRuntimeReconciliationItem["confidence"],
): ApplicationGraphEvidence => {
  const observation = entity.node.observations.at(0);
  if (observation === undefined)
    throw new TypeError("Runtime reconciliation entity has no observation");
  return {
    authority: "cross-layer-reconciliation",
    state: "inferred",
    confidence: confidence === "medium" ? "medium" : "high",
    artifact:
      entity.sourceSha256 === null
        ? {
            available: false,
            reason: "not-observed",
            detail: "Runtime source bytes were not captured for this mapping.",
          }
        : {
            available: true,
            artifact_id: `art_${entity.sourceSha256}`,
            sha256: entity.sourceSha256,
          },
    location: observation.evidence.location,
    extractor: {
      name: "rea-javascript-runtime-reconciliation",
      version: "1",
      operation: "reconcile_javascript_runtime",
      executable_sha256: null,
    },
    coverage:
      layer.graph.coverage.status === "complete" &&
      entity.capture.scriptsCompleteWithinScope
        ? { status: "complete", truncated: false, omitted_count: 0, limits: [] }
        : {
            status: "partial",
            truncated: false,
            omitted_count: null,
            limits: [],
          },
    limitations: [
      basis === "content-sha256" ||
      basis === "module-source-sha256" ||
      basis === "content-and-location"
        ? "Equal content digests establish byte identity, not execution causality."
        : "Location correspondence is inferred from an artifact root or caller-declared mapping.",
      "Passive script parsing or target presence does not prove feature execution.",
    ],
    evidence_ids: [
      layer.evidence.evidence_id,
      entity.capture.evidence.evidence_id,
    ].sort(),
  };
};

const strongestLocationBasis = (
  values: readonly LocatedCandidate[],
): JavaScriptRuntimeReconciliationItem["basis"] => {
  const bases = new Set(values.map(({ mapping }) => mapping.basis));
  if (bases.has("artifact-path")) return "artifact-path";
  if (bases.has("operator-file-mapping")) return "operator-file-mapping";
  return "operator-url-mapping";
};

const candidateKey = (candidate: StaticRuntimeCandidate): string =>
  `${candidate.layer.layerId}:${candidate.node.node_id}`;

const uniqueCandidateReferences = (
  candidates: readonly StaticRuntimeCandidate[],
): {
  readonly count: number;
  readonly items: JavaScriptRuntimeReconciliationItem["candidate_static_nodes"];
} => {
  const seen = new Set<string>();
  let count = 0;
  const items: JavaScriptRuntimeReconciliationItem["candidate_static_nodes"] =
    [];
  for (const { layer, node } of candidates) {
    const key = `${layer.layerId}:${node.node_id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    count += 1;
    items.push({
      static_layer_id: layer.layerId,
      static_node_id: node.node_id,
    });
  }
  return { count, items };
};
