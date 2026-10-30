import { z } from "zod";

import { artifactComparisonResultSchema } from "./artifactComparison.js";
import { uniqueSorted } from "./canonicalOrdering.js";
import {
  compositeKey,
  compareUnicodeCodePoints,
} from "./unicodeCodePointOrder.js";
import {
  assertComparisonFindingLinks,
  comparisonSourceEvidenceIds,
} from "./comparisonSourceEvidence.js";
import { evidenceSchema, parseEvidence, type Evidence } from "./evidence.js";
import { functionComparisonResultSchema } from "./functionComparisonSchemas.js";
import {
  PROCESS_PROVIDER,
  isProcessEvidenceProvider,
} from "./process/processEvidenceProvider.js";
import {
  comparisonStatusSchema,
  deriveProcessComparisonStatus,
  PROCESS_COMPARISON_DIMENSIONS,
  processCaptureComparisonSchema,
} from "./process/processComparison.js";
import { prefixedDigestSchema } from "./../domain/digests.js";

const parseComparisonEvidence = (input: unknown): ParsedComparison => {
  const evidence = parseEvidence(input);
  if (!(evidence.operation in EXPECTED_PROVIDERS))
    throw new TypeError(
      "Changed-behavior analysis requires process, artifact, or function comparison Evidence",
    );
  const operation = z
    .enum([
      "compare_process_captures",
      "compare_artifacts",
      "compare_functions",
    ])
    .parse(evidence.operation);
  const expected = EXPECTED_PROVIDERS[operation];
  if (
    !acceptsPredicate(expected.predicates, evidence.predicate_type) ||
    (operation === "compare_process_captures"
      ? !isProcessEvidenceProvider(evidence.provider)
      : evidence.provider.id !== expected.id ||
        evidence.provider.name !== expected.name ||
        evidence.provider.version !== expected.version) ||
    evidence.confidence !== "derived" ||
    evidence.authority !== "analyst-inference" ||
    evidence.subject !== null
  )
    throw new TypeError(
      "Comparison Evidence operation, predicate, and provider disagree",
    );
  if (
    !comparisonSourceEvidenceIds(evidence).every((id) =>
      evidence.evidence_links.includes(id),
    )
  )
    throw new TypeError(
      "Comparison Evidence must cite both selected source observations",
    );
  return parseResult(evidence, operation);
};

const parseResult = (
  evidence: Evidence,
  operation:
    | "compare_process_captures"
    | "compare_artifacts"
    | "compare_functions",
): ParsedComparison => {
  if (operation === "compare_process_captures") {
    const result = processCaptureComparisonSchema.parse(
      evidence.normalized_result,
    );
    const expected = deriveProcessComparisonStatus(
      PROCESS_COMPARISON_DIMENSIONS.map((dimension) => result[dimension]),
    );
    if (result.status !== expected)
      throw new TypeError(
        "Process comparison status contradicts its dimensions",
      );
    return { operation, evidence, result };
  }
  if (operation === "compare_functions") {
    const result = functionComparisonResultSchema.parse(
      evidence.normalized_result,
    );
    assertComparisonFindingLinks(
      evidence,
      result.dimensions.flatMap(({ evidence_links: links }) => links),
    );
    return { operation, evidence, result };
  }
  const result = artifactComparisonResultSchema.parse(
    evidence.normalized_result,
  );
  assertComparisonFindingLinks(
    evidence,
    result.changes.flatMap(({ evidence_links: links }) => links),
  );
  return { operation, evidence, result };
};

const findingsFor = (comparison: ParsedComparison): Finding[] => {
  if (comparison.operation === "compare_process_captures")
    return processFindings(comparison);
  if (comparison.operation === "compare_functions")
    return functionFindings(comparison);
  return artifactFindings(comparison);
};

const processFindings = (
  comparison: Extract<
    ParsedComparison,
    { readonly operation: "compare_process_captures" }
  >,
): Finding[] => {
  const { evidence, result } = comparison;
  const dimensions = [
    ["terminal", result.terminal, "runtime"],
    ["interaction", result.interaction, "runtime"],
    ["exit", result.exit, "runtime"],
    ["filesystem", result.filesystem, "resource"],
    ["process", result.process, "runtime"],
  ] as const;
  return dimensions.flatMap(([dimension, status, scope]) =>
    status === "unchanged"
      ? []
      : [
          makeFinding({
            evidence,
            dimension,
            scope,
            status,
            classification: isChange(status)
              ? "observed_change"
              : "unresolved_branch",
            limitations: result.limitations,
          }),
        ],
  );
};

const functionFindings = (
  comparison: Extract<
    ParsedComparison,
    { readonly operation: "compare_functions" }
  >,
): Finding[] => {
  const { evidence, result } = comparison;
  return result.dimensions.flatMap((dimension) =>
    dimension.status === "unchanged"
      ? []
      : [
          makeFinding({
            evidence,
            dimension: dimension.dimension,
            scope: "static_candidate",
            status: dimension.status,
            classification:
              dimension.status === "unknown"
                ? "unresolved_branch"
                : dimension.conclusion_kind,
            limitations: dimension.limitations,
            links: dimension.evidence_links,
          }),
        ],
  );
};

const artifactFindings = (
  comparison: Extract<
    ParsedComparison,
    { readonly operation: "compare_artifacts" }
  >,
): Finding[] => {
  const { evidence, result } = comparison;
  const changes = result.changes.map((change) =>
    makeFinding({
      evidence,
      dimension: `artifact:${change.logical_path}`,
      scope: "static_candidate",
      status: change.classification,
      classification:
        change.classification === "contradiction"
          ? "contradiction"
          : change.classification === "unknown"
            ? "unresolved_branch"
            : "derived_relationship",
      limitations: result.limitations,
      links: change.evidence_links,
    }),
  );
  return (result.status === "unknown" || result.status === "truncated") &&
    !changes.some(
      ({ classification }) => classification === "unresolved_branch",
    )
    ? [
        ...changes,
        makeFinding({
          evidence,
          dimension: "artifact:coverage",
          scope: "static_candidate",
          status: result.status,
          classification: "unresolved_branch",
          limitations: result.limitations,
        }),
      ]
    : changes;
};

const makeFinding = (input: {
  readonly evidence: Evidence;
  readonly dimension: string;
  readonly scope: Finding["scope"];
  readonly status: Finding["status"];
  readonly classification: Finding["classification"];
  readonly limitations: readonly string[];
  readonly links?: readonly string[];
}): Finding =>
  findingSchema.parse({
    scope: input.scope,
    dimension: input.dimension,
    classification: input.classification,
    status: input.status,
    source_comparison_id: input.evidence.evidence_id,
    evidence_links: uniqueSorted([
      input.evidence.evidence_id,
      ...(input.links ?? input.evidence.evidence_links),
    ]),
    limitations: uniqueSorted(input.limitations),
  });

const behaviorStatus = (
  statuses: readonly RuntimeStatus[],
): ChangedBehaviorResult["behavior_status"] => {
  if (statuses.length === 0) return "unknown";
  if (statuses.includes("truncated")) return "truncated";
  if (statuses.includes("unknown")) return "unknown";
  return statuses.some(isChange) ? "observed_changed" : "observed_unchanged";
};

const isChange = (status: RuntimeStatus): boolean =>
  status === "added" || status === "removed" || status === "changed";

const count = (
  findings: readonly Finding[],
  classification: Finding["classification"],
): number =>
  findings.filter((finding) => finding.classification === classification)
    .length;

const compareFindings = (left: Finding, right: Finding): number =>
  compareUnicodeCodePoints(
    compositeKey([left.scope, left.dimension, left.source_comparison_id]),
    compositeKey([right.scope, right.dimension, right.source_comparison_id]),
  );

const assertUnique = (values: readonly string[], label: string): void => {
  if (new Set(values).size !== values.length)
    throw new TypeError(`Changed-behavior analysis rejects duplicate ${label}`);
};
