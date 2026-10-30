import { canonicalJson } from "./comparisonSemantics.js";
import { diffLines } from "diff";

import type { FunctionSnapshot } from "./functionDossierEvidence.js";
import {
  commentProjection,
  identityProjection,
  isAutoName,
  normalizeCfg,
  referenceKindProjection,
  referenceProjection,
  sorted,
  stringAndNameProjection,
  swiftLiteralSitesConflict,
} from "./functionComparisonNormalization.js";
import type {
  DimensionName,
  FunctionDimension,
} from "./functionComparisonSchemas.js";
import {
  dimensionResult,
  unresolvedDimension,
  type DimensionResultInput,
} from "./functionComparisonResults.js";

const swiftLiteralCoverage = (
  snapshot: FunctionSnapshot,
): "absent" | "complete" | "partial" =>
  (snapshot.dossier.swift_string_literal_omissions ?? []).length > 0
    ? "partial"
    : snapshot.dossier.swift_string_literals === undefined
      ? "absent"
      : "complete";

const hasUnnamedEndpoint = (snapshot: FunctionSnapshot): boolean =>
  [
    ...snapshot.dossier.incoming_references,
    ...snapshot.dossier.outgoing_references,
  ].some(
    (edge) => edge.source_procedure === null || edge.target_procedure === null,
  );

const compareReferences = (
  left: FunctionSnapshot,
  right: FunctionSnapshot,
  context: ComparisonContext,
): FunctionDimension => {
  const sameArtifact =
    left.subject.digest.sha256 === right.subject.digest.sha256;
  const leftProjection = referenceProjection(left, sameArtifact);
  const rightProjection = referenceProjection(right, sameArtifact);
  if (leftProjection.length === 0 && rightProjection.length === 0)
    return compareValues(
      "references",
      leftProjection,
      rightProjection,
      context,
    );
  if (
    canonicalJson(leftProjection, "Function comparison") !==
    canonicalJson(rightProjection, "Function comparison")
  )
    return dimensionResult({
      dimension: "references",
      status: "changed",
      left: leftProjection,
      right: rightProjection,
      ...context,
      leftCount: leftProjection.length,
      rightCount: rightProjection.length,
      textDelta: null,
      limitations: [
        "Reference endpoints differ independently of provider reference-kind metadata.",
      ],
    });
  const leftKinds = referenceKindProjection(left, sameArtifact);
  const rightKinds = referenceKindProjection(right, sameArtifact);
  const kindsKnown = leftKinds !== null && rightKinds !== null;
  // Differing known edge kinds are a change whatever the endpoint identity.
  if (
    kindsKnown &&
    canonicalJson(leftKinds, "Function comparison") !==
      canonicalJson(rightKinds, "Function comparison")
  )
    return compareValues("references", leftKinds, rightKinds, context);
  // Equal projections with unknown endpoints do not establish equal targets.
  if (!sameArtifact && (hasUnnamedEndpoint(left) || hasUnnamedEndpoint(right)))
    return unresolvedDimension({
      dimension: "references",
      links: context.links,
      leftCount: leftProjection.length,
      rightCount: rightProjection.length,
      limitations: [
        "Unnamed reference endpoints have no stable identity across different artifacts, so equal named endpoints do not establish equal references.",
      ],
    });
  if (kindsKnown)
    return compareValues("references", leftKinds, rightKinds, context);
  return unresolvedDimension({
    dimension: "references",
    links: context.links,
    leftCount: leftProjection.length,
    rightCount: rightProjection.length,
    limitations: [
      "At least one provider did not expose reference kinds, so equal endpoints do not prove equal edge semantics.",
    ],
  });
};

const compareIdentity = (
  left: FunctionSnapshot,
  right: FunctionSnapshot,
  context: ComparisonContext,
): FunctionDimension => {
  if (
    isAutoName(left.dossier.procedure.name) ||
    isAutoName(right.dossier.procedure.name)
  )
    return unresolvedDimension({
      dimension: "identity",
      links: context.links,
      leftCount: null,
      rightCount: null,
      limitations: [
        "Address-derived function names are not stable cross-version identity.",
      ],
    });
  return compareValues(
    "identity",
    identityProjection(left),
    identityProjection(right),
    context,
  );
};

const compareCalls = (
  left: FunctionSnapshot,
  right: FunctionSnapshot,
  context: ComparisonContext,
): FunctionDimension => {
  const leftValues = callProjection(left);
  const rightValues = callProjection(right);
  const coverageLimitations = [
    ...left.callCoverageBlockers.map((reason) => `Left: ${reason}`),
    ...right.callCoverageBlockers.map((reason) => `Right: ${reason}`),
  ];
  const coverageDiagnostics = [
    ...left.callCoverageDiagnostics.map((reason) => `Left: ${reason}`),
    ...right.callCoverageDiagnostics.map((reason) => `Right: ${reason}`),
  ];
  if (coverageLimitations.length > 0)
    return unresolvedDimension({
      dimension: "calls",
      links: context.links,
      leftCount: leftValues.length,
      rightCount: rightValues.length,
      limitations: [...coverageLimitations, ...coverageDiagnostics],
    });
  if ([...leftValues, ...rightValues].some(({ name }) => isAutoName(name)))
    return unresolvedDimension({
      dimension: "calls",
      links: context.links,
      leftCount: leftValues.length,
      rightCount: rightValues.length,
      limitations: [
        "Address-derived callee or caller names cannot be matched safely.",
        ...coverageDiagnostics,
      ],
    });
  return compareValues(
    "calls",
    sorted(leftValues),
    sorted(rightValues),
    context,
    coverageDiagnostics,
  );
};

const callProjection = (snapshot: FunctionSnapshot) => [
  ...snapshot.dossier.callers.map(({ name }) => ({
    direction: "in" as const,
    name,
  })),
  ...snapshot.dossier.callees.map(({ name }) => ({
    direction: "out" as const,
    name,
  })),
];

const compareCfg = (
  left: FunctionSnapshot,
  right: FunctionSnapshot,
  context: ComparisonContext,
): FunctionDimension => {
  const leftBlocks = left.dossier.basic_blocks;
  const rightBlocks = right.dossier.basic_blocks;
  const leftGraph = normalizeCfg(leftBlocks);
  const rightGraph = normalizeCfg(rightBlocks);
  if (leftGraph === null || rightGraph === null)
    return unresolvedDimension({
      dimension: "cfg",
      links: context.links,
      leftCount: leftBlocks.length,
      rightCount: rightBlocks.length,
      limitations: [
        "CFG addresses could not be normalized to local block indices.",
      ],
    });
  return compareValues("cfg", leftGraph, rightGraph, context);
};

const compareValues = (
  dimension: DimensionName,
  left: unknown,
  right: unknown,
  context: ComparisonContext,
  limitations: readonly string[] = [],
): FunctionDimension => {
  const leftJson = canonicalJson(left, "Function comparison");
  const rightJson = canonicalJson(right, "Function comparison");
  return dimensionResult({
    dimension,
    status: leftJson === rightJson ? "unchanged" : "changed",
    left,
    right,
    ...context,
    leftCount: Array.isArray(left) ? left.length : null,
    rightCount: Array.isArray(right) ? right.length : null,
    textDelta: null,
    limitations,
  });
};
