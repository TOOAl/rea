import type { ApplicationEdge } from "./javascriptApplicationGraphSchemas.js";
import { digestCanonicalValue } from "../canonicalDigest.js";
import type { ParsedStaticLayer } from "./javascriptRuntimeReconciliationParsing.js";
import { compareUnicodeCodePoints } from "../unicodeCodePointOrder.js";
import type { JavaScriptRuntimeReconciliationItem } from "./javascriptRuntimeReconciliationSchemas.js";
import type { RuntimeReconciliationEntity } from "./javascriptRuntimeReconciliationRuntime.js";
import {
  mappedRuntimePaths,
  type MappedRuntimePath,
  type StaticRuntimeCandidate,
} from "./javascriptRuntimeStaticCandidates.js";

export interface RuntimeMatchingProjection {
  readonly items: readonly JavaScriptRuntimeReconciliationItem[];
  readonly edges: readonly ApplicationEdge[];
  readonly omittedItems: number;
}

/** Match runtime entities conservatively and emit only inferred observed_as edges. */
export const reconcileRuntimeEntities = (input: {
  readonly entities: readonly RuntimeReconciliationEntity[];
  readonly candidates: readonly StaticRuntimeCandidate[];
  readonly layers: readonly ParsedStaticLayer[];
}): RuntimeMatchingProjection => {
  const index = indexCandidates(input.candidates);
  const evaluated = input.entities.map((entity) =>
    reconcileEntity(entity, index, input.layers),
  );
  const retained = evaluated.sort((left, right) =>
    compareUnicodeCodePoints(
      left.item.reconciliation_id,
      right.item.reconciliation_id,
    ),
  );
  return {
    items: retained.map(({ item }) => item),
    edges: retained.flatMap(({ edge }) => (edge === null ? [] : [edge])),
    omittedItems: 0,
  };
};

interface EvaluatedMatch {
  readonly item: JavaScriptRuntimeReconciliationItem;
  readonly edge: ApplicationEdge | null;
}

interface CandidateIndex {
  readonly byCategoryDigest: ReadonlyMap<
    string,
    readonly StaticRuntimeCandidate[]
  >;
  readonly byNativeDeclarationPath: ReadonlyMap<
    string,
    readonly {
      readonly candidate: StaticRuntimeCandidate;
      readonly sourcePath: string | null;
    }[]
  >;
  readonly byLayerCategoryPath: ReadonlyMap<
    string,
    readonly StaticRuntimeCandidate[]
  >;
}

const reconcileEntity = (
  entity: RuntimeReconciliationEntity,
  index: CandidateIndex,
  layers: readonly ParsedStaticLayer[],
): EvaluatedMatch => {
  if (entity.location.kind === "unresolved")
    return unresolved(entity, {
      status: "unknown",
      basis: "none",
      confidence: "unknown",
      reason: "runtime-location-unresolved",
      candidates: [],
    });
  const locations = candidatesWithLocation(entity, index, layers);
  if (entity.sourceSha256 !== null)
    return reconcileCapturedSource(
      entity,
      entity.sourceSha256,
      locations,
      index,
    );

  const location = locations.at(0);
  if (locations.length === 1 && location !== undefined) {
    const located = location;
    return matched(entity, located.candidate, {
      basis: located.mapping.basis,
      confidence: "medium",
      reason: "unique-location-match",
    });
  }
  if (locations.length > 1)
    return unresolved(entity, {
      status: "ambiguous",
      basis: strongestLocationBasis(locations),
      confidence: "unknown",
      reason: "ambiguous-static-candidates",
      candidates: locations.map(({ candidate }) => candidate),
    });
  const mapped = layers.some(
    (layer) => mappedRuntimePaths(layer, entity).length > 0,
  );
  return unresolved(entity, {
    status: mapped ? "unmatched" : "unknown",
    basis: "none",
    confidence: "unknown",
    reason: mapped
      ? "no-static-content-match"
      : "no-authorized-location-mapping",
    candidates: [],
  });
};

interface LocatedCandidate {
  readonly candidate: StaticRuntimeCandidate;
  readonly mapping: MappedRuntimePath;
}

const reconcileCapturedSource = (
  entity: RuntimeReconciliationEntity,
  sourceSha256: string,
  locations: readonly LocatedCandidate[],
  index: CandidateIndex,
): EvaluatedMatch => {
  // A known mapped candidate owns the comparison. Unrelated equal bytes cannot
  // repair a disagreement or establish the content of a candidate without a digest.
  const content =
    locations.length > 0
      ? locations
          .map(({ candidate }) => candidate)
          .filter(({ digests }) =>
            digests.some(({ sha256 }) => sha256 === sourceSha256),
          )
      : (index.byCategoryDigest.get(
          categoryDigestKey(entity.staticKind, sourceSha256),
        ) ?? []);
  const candidate = content.at(0);
  if (content.length === 1 && candidate !== undefined)
    return matched(entity, candidate, {
      basis:
        locations.length > 0
          ? "content-and-location"
          : (candidate.digests.find(({ sha256 }) => sha256 === sourceSha256)
              ?.basis ?? "content-sha256"),
      confidence: "high",
      reason:
        locations.length > 0
          ? "content-and-location-match"
          : "unique-content-match",
    });
  if (content.length > 1)
    return unresolved(entity, {
      status: "ambiguous",
      basis: locations.length > 0 ? "content-and-location" : "none",
      confidence: "unknown",
      reason: "ambiguous-static-candidates",
      candidates: content,
    });
  if (locations.length > 0) {
    const digestUnavailable = locations.some(
      ({ candidate: { digests } }) => digests.length === 0,
    );
    return unresolved(entity, {
      status: digestUnavailable ? "unknown" : "unmatched",
      basis: strongestLocationBasis(locations),
      confidence: digestUnavailable ? "unknown" : "high",
      reason: digestUnavailable
        ? "static-or-runtime-coverage-incomplete"
        : "captured-content-disagrees-with-static-location",
      candidates: locations.map(({ candidate: located }) => located),
    });
  }
  return unresolved(entity, {
    status: "unmatched",
    basis: "none",
    confidence: "high",
    reason: "no-static-content-match",
    candidates: [],
  });
};

const candidatesWithLocation = (
  entity: RuntimeReconciliationEntity,
  index: CandidateIndex,
  layers: readonly ParsedStaticLayer[],
): LocatedCandidate[] => {
  const located = new Map<string, LocatedCandidate>();
  for (const layer of layers)
    for (const mapping of mappedRuntimePaths(layer, entity))
      for (const candidate of [
        ...(index.byLayerCategoryPath.get(
          layerCategoryPathKey(layer.layerId, entity.staticKind, mapping.path),
        ) ?? []),
        ...(mapping.fileStyle === null || mapping.nativeRelativePath === null
          ? []
          : (
              index.byNativeDeclarationPath.get(
                `${mapping.fileStyle}\0${layerCategoryPathKey(layer.layerId, entity.staticKind, mapping.nativeRelativePath)}`,
              ) ?? []
            )
              .filter(
                ({ sourcePath }) =>
                  mapping.artifactPrefix === "" ||
                  (sourcePath !== null &&
                    sourcePath.startsWith(`${mapping.artifactPrefix}/`)),
              )
              .map(({ candidate }) => candidate)),
      ]) {
        const key = candidateKey(candidate);
        if (!located.has(key)) located.set(key, { candidate, mapping });
      }
  return [...located.values()].sort((left, right) =>
    compareUnicodeCodePoints(
      candidateKey(left.candidate),
      candidateKey(right.candidate),
    ),
  );
};
