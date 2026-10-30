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

const evidenceIdSchema = prefixedDigestSchema("ev");

/** Input for aggregating existing comparison Evidence. */
export const changedBehaviorInputSchema = z.strictObject({
  comparisons: z.array(evidenceSchema).min(1),
});

const findingSchema = z.object({
  scope: z.enum(["runtime", "protocol", "resource", "static_candidate"]),
  dimension: z.string().min(1),
  classification: z.enum([
    "observed_change",
    "derived_relationship",
    "contradiction",
    "unresolved_branch",
  ]),
  status: comparisonStatusSchema,
  source_comparison_id: evidenceIdSchema,
  evidence_links: z.array(evidenceIdSchema).min(2),
  limitations: z.array(z.string()),
});

/** Truthful aggregate: runtime observations remain separate from static candidates. */
export const changedBehaviorResultSchema = z
  .object({
    behavior_status: z.enum([
      "observed_changed",
      "observed_unchanged",
      "unknown",
      "truncated",
    ]),
    summary: z.object({
      observed_changes: z.number().int().min(0),
      static_candidates: z.number().int().min(0),
      contradictions: z.number().int().min(0),
      unresolved: z.number().int().min(0),
    }),
    findings: z.object({
      items: z.array(findingSchema),
    }),
    evidence_links: z.array(evidenceIdSchema).min(2),
    limitations: z.array(z.string()),
  })
  .superRefine((result, context) => {
    const summaryTotal = Object.values(result.summary).reduce(
      (total, count) => total + count,
      0,
    );
    if (summaryTotal !== result.findings.items.length)
      context.addIssue({
        code: "custom",
        message: "Finding classification counts must equal the finding total",
        path: ["summary"],
      });
    if (
      (result.behavior_status === "observed_changed" &&
        result.summary.observed_changes === 0) ||
      (result.behavior_status === "observed_unchanged" &&
        result.summary.observed_changes > 0)
    )
      context.addIssue({
        code: "custom",
        message: "Observed-change status must agree with runtime findings",
        path: ["behavior_status"],
      });
  });

export type ChangedBehaviorResult = z.infer<typeof changedBehaviorResultSchema>;
type Finding = z.infer<typeof findingSchema>;
type RuntimeStatus = z.infer<typeof processCaptureComparisonSchema>["status"];
type ParsedComparison =
  | {
      readonly operation: "compare_process_captures";
      readonly evidence: Evidence;
      readonly result: z.infer<typeof processCaptureComparisonSchema>;
    }
  | {
      readonly operation: "compare_functions";
      readonly evidence: Evidence;
      readonly result: z.infer<typeof functionComparisonResultSchema>;
    }
  | {
      readonly operation: "compare_artifacts";
      readonly evidence: Evidence;
      readonly result: z.infer<typeof artifactComparisonResultSchema>;
    };

const EXPECTED_PROVIDERS = {
  compare_process_captures: {
    predicates: ["rea.process-comparison"],
    ...PROCESS_PROVIDER,
  },
  compare_artifacts: {
    predicates: ["rea.artifact-comparison"],
    id: "rea-artifact-comparison",
    name: "REA artifact comparison",
    version: "1",
  },
  compare_functions: {
    predicates: ["rea.function-comparison"],
    id: "rea-function-comparison",
    name: "REA function comparison",
    version: "1",
  },
} as const;

const acceptsPredicate = (
  expected: readonly string[],
  actual: string,
): boolean => expected.some((predicate) => predicate === actual);

/** Find observed runtime changes and separately report static change candidates. */
interface FoundChangedBehavior {
  readonly result: ChangedBehaviorResult;
  /** Authenticated IDs retained from the comparisons used to compute result. */
  readonly comparisonEvidenceIds: readonly string[];
}

export const findChangedBehavior = (input: unknown): FoundChangedBehavior => {
  // The public input schema remains available to clients; this internal
  // admission only checks the list shape because parseEvidence below owns
  // validation and authentication of each retained Evidence item.
  const { comparisons } = z
    .strictObject({ comparisons: z.array(z.unknown()).min(1) })
    .parse(input);
  const evidence = comparisons.map(parseComparisonEvidence);
  assertUnique(
    evidence.map(({ evidence: { evidence_id: id } }) => id),
    "comparison Evidence",
  );
  const findings = evidence.flatMap(findingsFor).sort(compareFindings);
  const runtimeStatuses = evidence.flatMap((comparison) =>
    comparison.operation === "compare_process_captures"
      ? [comparison.result.status]
      : [],
  );
  const links = uniqueSorted(
    evidence.flatMap(({ evidence: item }) => [
      item.evidence_id,
      ...item.evidence_links,
    ]),
  );
  const result = changedBehaviorResultSchema.parse({
    behavior_status: behaviorStatus(runtimeStatuses),
    summary: {
      observed_changes: count(findings, "observed_change"),
      static_candidates: count(findings, "derived_relationship"),
      contradictions: count(findings, "contradiction"),
      unresolved: count(findings, "unresolved_branch"),
    },
    findings: {
      items: findings,
    },
    evidence_links: links,
    limitations: uniqueSorted([
      ...evidence.flatMap(({ evidence: item }) => item.limitations),
      ...(evidence.some(
        ({ operation }) => operation !== "compare_process_captures",
      )
        ? [
            "Static differences are behavior candidates, not runtime observations.",
          ]
        : []),
      ...(runtimeStatuses.length === 0
        ? ["No process comparison Evidence was supplied."]
        : []),
    ]),
  });
  return {
    result,
    comparisonEvidenceIds: evidence.map(
      ({ evidence: { evidence_id } }) => evidence_id,
    ),
  };
};
