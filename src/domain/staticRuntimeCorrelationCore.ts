import { createHash } from "node:crypto";

import canonicalize from "canonicalize";
import { z } from "zod";

import { artifactComparisonResultSchema } from "./artifactComparison.js";
import { uniqueSorted } from "./canonicalOrdering.js";
import { compareUnicodeCodePoints } from "./unicodeCodePointOrder.js";
import {
  comparisonSourceEvidenceIds,
  assertComparisonFindingLinks,
} from "./comparisonSourceEvidence.js";
import { evidenceSchema, parseEvidence, type Evidence } from "./evidence.js";
import { functionComparisonResultSchema } from "./functionComparisonSchemas.js";
import {
  PROCESS_PROVIDER,
  isProcessEvidenceProvider,
} from "./process/processEvidenceProvider.js";
import type { JsonValue } from "./jsonValue.js";
import {
  comparisonStatusSchema,
  processCaptureComparisonSchema,
} from "./process/processComparison.js";
import { PROCESS_COMPARISON_DIMENSIONS } from "./process/processComparison.js";
import { prefixedDigestSchema } from "./../domain/digests.js";

const evidenceIdSchema = prefixedDigestSchema("ev");
const functionDimensionSchema = z.enum([
  "identity",
  "pseudocode",
  "assembly",
  "comments",
  "calls",
  "references",
  "strings_names",
  "cfg",
]);
const runtimeDimensionSchema = z.enum(PROCESS_COMPARISON_DIMENSIONS);
const expectedPatternSchema = z.enum([
  "cochanged",
  "static_only",
  "runtime_only",
  "both_unchanged",
]);
const observedPatternSchema = z.enum([
  ...expectedPatternSchema.options,
  "unknown",
  "truncated",
]);

const artifactSelectorSchema = z
  .object({
    kind: z.literal("artifact"),
    logical_path: z.string().min(1),
  })
  .strict();
const functionSelectorSchema = z
  .object({ kind: z.literal("function"), dimension: functionDimensionSchema })
  .strict();
const staticSelectorSchema = z.discriminatedUnion("kind", [
  artifactSelectorSchema,
  functionSelectorSchema,
]);

const mappingSchema = z
  .object({
    static: z
      .object({
        comparison_evidence_id: evidenceIdSchema,
        selector: staticSelectorSchema,
      })
      .strict(),
    runtime: z
      .object({
        comparison_evidence_id: evidenceIdSchema,
        dimension: runtimeDimensionSchema,
      })
      .strict(),
    side_alignment: z.enum(["left_to_left", "left_to_right"]),
    hypothesis: z
      .object({
        statement: z.string().trim().min(1),
        expected_pattern: expectedPatternSchema,
      })
      .strict(),
  })
  .strict();

/** Strict input for explicit static/runtime hypothesis correlation. */
export const staticRuntimeCorrelationInputSchema = z
  .object({
    static_comparisons: z.array(evidenceSchema).min(1),
    runtime_comparisons: z.array(evidenceSchema).min(1),
    mappings: z.array(mappingSchema).min(1),
  })
  .strict();

const correlationItemSchema = z.object({
  correlation_id: prefixedDigestSchema("cor"),
  static: z.object({
    comparison_evidence_id: evidenceIdSchema,
    selector: staticSelectorSchema,
    status: comparisonStatusSchema,
    conclusion_kind: z.enum([
      "derived_relationship",
      "contradiction",
      "unresolved_branch",
    ]),
  }),
  runtime: z.object({
    comparison_evidence_id: evidenceIdSchema,
    dimension: runtimeDimensionSchema,
    status: comparisonStatusSchema,
  }),
  side_alignment: z.enum(["left_to_left", "left_to_right"]),
  hypothesis: z.object({
    statement: z.string().min(1),
    expected_pattern: expectedPatternSchema,
  }),
  observed_pattern: observedPatternSchema,
  classification: z.enum(["hypothesis", "contradiction", "unresolved_branch"]),
  evidence_links: z.array(evidenceIdSchema).min(2),
  limitations: z.array(z.string()),
});

/** Deterministic static/runtime correlation payload. */
export const staticRuntimeCorrelationResultSchema = z.object({
  status: z.enum(["correlated", "contradicted", "unknown", "truncated"]),
  summary: z.object({
    hypotheses: z.number().int().min(0),
    contradictions: z.number().int().min(0),
    unresolved: z.number().int().min(0),
  }),
  correlations: z.object({
    items: z.array(correlationItemSchema),
  }),
  evidence_links: z.array(evidenceIdSchema).min(2),
  limitations: z.array(z.string()),
});

export type StaticRuntimeCorrelationResult = z.infer<
  typeof staticRuntimeCorrelationResultSchema
>;
type Mapping = z.infer<typeof mappingSchema>;
type CorrelationItem = z.infer<typeof correlationItemSchema>;
type ComparisonStatus = z.infer<typeof comparisonStatusSchema>;

type ComparisonIdentity = readonly [string | readonly string[], string, string];

const EXPECTED: Readonly<Record<string, ComparisonIdentity>> = {
  compare_artifacts: [
    "rea.artifact-comparison",
    "rea-artifact-comparison",
    "REA artifact comparison",
  ],
  compare_functions: [
    "rea.function-comparison",
    "rea-function-comparison",
    "REA function comparison",
  ],
  compare_process_captures: [
    "rea.process-comparison",
    PROCESS_PROVIDER.id,
    PROCESS_PROVIDER.name,
  ],
};

/** Correlate only caller-declared static/runtime hypotheses. */
export const correlateStaticAndRuntime = (
  input: unknown,
): StaticRuntimeCorrelationResult => {
  const parsed = staticRuntimeCorrelationInputSchema.parse(input);
  const staticEvidence = parsed.static_comparisons.map(parseStatic);
  const runtimeEvidence = parsed.runtime_comparisons.map(parseRuntime);
  assertUnique(staticEvidence, "static comparison Evidence");
  assertUnique(runtimeEvidence, "runtime comparison Evidence");
  const staticById = byId(staticEvidence);
  const runtimeById = byId(runtimeEvidence);
  const correlations = parsed.mappings
    .map((mapping) => correlate(mapping, staticById, runtimeById))
    .sort((left, right) =>
      compareUnicodeCodePoints(left.correlation_id, right.correlation_id),
    );
  if (
    new Set(correlations.map(({ correlation_id: id }) => id)).size !==
    correlations.length
  )
    throw new TypeError(
      "Static/runtime correlation rejects duplicate mappings",
    );
  const links = uniqueSorted(
    correlations.flatMap(({ evidence_links: evidenceLinks }) => evidenceLinks),
  );
  const unresolved = correlations.filter(
    ({ classification }) => classification === "unresolved_branch",
  );
  const contradictions = correlations.filter(
    ({ classification }) => classification === "contradiction",
  );
  return staticRuntimeCorrelationResultSchema.parse({
    status: correlations.some(
      ({ observed_pattern: pattern }) => pattern === "truncated",
    )
      ? "truncated"
      : unresolved.length > 0
        ? "unknown"
        : contradictions.length > 0
          ? "contradicted"
          : "correlated",
    summary: {
      hypotheses:
        correlations.length - contradictions.length - unresolved.length,
      contradictions: contradictions.length,
      unresolved: unresolved.length,
    },
    correlations: {
      items: correlations,
    },
    evidence_links: links,
    limitations: [
      "Mappings are caller-declared hypotheses; consistency does not establish causality.",
      "Only explicit mappings were evaluated; similar unmapped observations were not correlated.",
    ],
  });
};
