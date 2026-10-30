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

type ComparisonContext = Pick<
  DimensionResultInput,
  "links" | "providersDiffer"
>;

export const compareDimensions = (
  left: FunctionSnapshot,
  right: FunctionSnapshot,
  context: ComparisonContext,
): FunctionDimension[] => {
  return [
    compareIdentity(left, right, context),
    compareText(
      "pseudocode",
      left.dossier.pseudocode,
      right.dossier.pseudocode,
      context,
    ),
    compareText(
      "assembly",
      left.dossier.assembly.join("\n"),
      right.dossier.assembly.join("\n"),
      context,
    ),
    compareComments(left, right, context),
    compareCalls(left, right, context),
    compareReferences(left, right, context),
    compareStringsAndNames(left, right, context),
    compareCfg(left, right, context),
  ].map((result) => {
    const limitations = [
      ...facetLimitations(left, result.dimension).map(
        (reason) => `Left: ${reason}`,
      ),
      ...facetLimitations(right, result.dimension).map(
        (reason) => `Right: ${reason}`,
      ),
    ];
    return limitations.length === 0
      ? result
      : unresolvedDimension({
          dimension: result.dimension,
          links: context.links,
          leftCount: null,
          rightCount: null,
          limitations: [...result.limitations, ...limitations],
        });
  });
};

/** An empty undeclared facet is not evidence of observed absence. */
const facetLimitations = (
  snapshot: FunctionSnapshot,
  dimension: DimensionName,
): string[] => {
  const { dossier } = snapshot;
  const fields = {
    identity: [],
    pseudocode: [["pseudocode", dossier.pseudocode.length]],
    assembly: [["assembly", dossier.assembly.length]],
    comments: [["comments", dossier.comments.length]],
    calls: [
      ["callers", dossier.callers.length],
      ["callees", dossier.callees.length],
    ],
    references: [
      [
        "references",
        dossier.incoming_references.length + dossier.outgoing_references.length,
      ],
    ],
    strings_names: [
      [
        "strings_names",
        dossier.referenced_strings.length + dossier.referenced_names.length,
      ],
    ],
    cfg: [["cfg", dossier.basic_blocks.length]],
  } satisfies Record<
    DimensionName,
    [keyof NonNullable<typeof dossier.facet_availability>, number][]
  >;
  return fields[dimension].flatMap(([field, count]) => {
    const availability = dossier.facet_availability?.[field];
    if (availability?.available === false)
      return [`${field}: ${availability.reason}`];
    return availability === undefined && count === 0
      ? [`${field}: Provider did not declare coverage for this empty facet.`]
      : [];
  });
};

const compareText = (
  dimension: "pseudocode" | "assembly",
  left: string,
  right: string,
  context: ComparisonContext,
): FunctionDimension => {
  const limitations = [
    "Exact provider text is compared without address or generated-name normalization; layout-only differences do not establish a behavior change.",
    ...(dimension === "assembly"
      ? [
          "Assembly is opaque provider text; relocation normalization is unavailable.",
        ]
      : []),
  ];
  if (context.providersDiffer)
    return unresolvedDimension({
      dimension,
      links: context.links,
      leftCount: [...left].length,
      rightCount: [...right].length,
      limitations: [
        ...limitations,
        "Exact text comparison requires one provider identity.",
      ],
    });
  const changes = diffLines(left, right, {
    timeout: 100,
    maxEditLength: 10_000,
  });
  if (changes === undefined)
    return unresolvedDimension({
      dimension,
      links: context.links,
      leftCount: [...left].length,
      rightCount: [...right].length,
      limitations: [
        ...limitations,
        "Bounded line diff exceeded its time or edit-distance limit.",
      ],
    });
  const delta = changes.reduce(
    (summary, change) => ({
      added_lines:
        summary.added_lines + (change.added ? (change.count ?? 0) : 0),
      removed_lines:
        summary.removed_lines + (change.removed ? (change.count ?? 0) : 0),
      hunks: summary.hunks + (change.added || change.removed ? 1 : 0),
    }),
    { added_lines: 0, removed_lines: 0, hunks: 0 },
  );
  return dimensionResult({
    dimension,
    status: delta.hunks === 0 ? "unchanged" : "changed",
    left,
    right,
    ...context,
    leftCount: [...left].length,
    rightCount: [...right].length,
    textDelta: delta,
    limitations,
  });
};

const compareComments = (
  left: FunctionSnapshot,
  right: FunctionSnapshot,
  context: ComparisonContext,
): FunctionDimension => {
  const leftValues = commentProjection(left);
  const rightValues = commentProjection(right);
  if (leftValues === null || rightValues === null)
    return unresolvedDimension({
      dimension: "comments",
      links: context.links,
      leftCount: left.dossier.comments.length,
      rightCount: right.dossier.comments.length,
      limitations: [
        "Comment locations could not be normalized relative to the function.",
      ],
    });
  return compareValues("comments", leftValues, rightValues, context);
};

const compareStringsAndNames = (
  left: FunctionSnapshot,
  right: FunctionSnapshot,
  context: ComparisonContext,
): FunctionDimension => {
  const complete =
    swiftLiteralCoverage(left) === swiftLiteralCoverage(right) &&
    swiftLiteralCoverage(left) !== "partial";
  // Facts both dossiers record decide a change before Swift literal coverage can.
  const leftValues = stringAndNameProjection(left, complete);
  const rightValues = stringAndNameProjection(right, complete);
  if (leftValues === null || rightValues === null)
    return unresolvedDimension({
      dimension: "strings_names",
      links: context.links,
      leftCount: null,
      rightCount: null,
      limitations: [
        "Reference source locations could not be normalized to function offsets.",
      ],
    });
  const compared = compareValues(
    "strings_names",
    leftValues,
    rightValues,
    context,
  );
  if (complete || compared.status === "changed") return compared;
  // A retained literal differs only when the opposite dossier establishes its absence.
  if (swiftLiteralSitesConflict(left, right)) {
    const leftAll = stringAndNameProjection(left);
    const rightAll = stringAndNameProjection(right);
    if (leftAll !== null && rightAll !== null)
      return compareValues("strings_names", leftAll, rightAll, context);
  }
  return unresolvedDimension({
    dimension: "strings_names",
    links: context.links,
    leftCount: null,
    rightCount: null,
    limitations: [
      "Swift String literal coverage differs or is partial; referenced strings and names match, and complete coverage does not establish a differing literal.",
    ],
  });
};
