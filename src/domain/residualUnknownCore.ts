import { createHash } from "node:crypto";

import canonicalize from "canonicalize";
import { z } from "zod";
import {
  compareUnicodeCodePoints,
  compositeKey,
} from "./unicodeCodePointOrder.js";
import { prefixedDigestSchema } from "./../domain/digests.js";
import { functionComparisonDimensionNameSchema } from "./functionComparisonSchemas.js";

const evidenceIdSchema = prefixedDigestSchema("ev");
const unknownIdSchema = prefixedDigestSchema("unk");
const text = z.string().trim().min(1);
const environmentRequirementSchema = z.strictObject({
  id: z.string().min(1).nullable(),
  platform: z.string().min(1).nullable(),
  architecture: z.string().min(1).nullable(),
  isolation: z
    .enum(["none", "process", "container", "virtual-machine"])
    .nullable(),
});
const stableUnknownId = (
  question: string,
  domain: string,
  scopeDigest: string | null,
  comparisonConclusionScope?: z.infer<typeof comparisonConclusionScopeSchema>,
): string =>
  `unk_${createHash("sha256")
    .update(
      canonicalJson({
        domain: domain.trim(),
        question: question.replace(/\s+/gu, " ").trim(),
        scope_digest: scopeDigest,
        ...(comparisonConclusionScope === undefined
          ? {}
          : { comparison_conclusion_scope: comparisonConclusionScope }),
      }),
    )
    .digest("hex")}`;

const probeSchema = z.strictObject({
  operation: z.string().min(1),
  rationale: text,
});
const comparisonConclusionScopeSchema = z
  .object({
    comparison_evidence_id: evidenceIdSchema,
    dimensions: z
      .array(
        z.union([z.literal("overall"), functionComparisonDimensionNameSchema]),
      )
      .min(1),
  })
  .strict()
  .superRefine(({ dimensions }, context) => {
    if (!sameOrderedValues(dimensions, sortedUnique(dimensions)))
      context.addIssue({
        code: "custom",
        message: "Comparison dimensions must be sorted and unique",
      });
  });
const relationshipSchema = z.strictObject({
  type: z.enum(["depends-on", "related-to", "contradicts"]),
  unknown_id: unknownIdSchema,
});
const resolutionSchema = z.discriminatedUnion("disposition", [
  z.strictObject({
    disposition: z.literal("verified"),
    rationale: text,
    evidence_ids: z.array(evidenceIdSchema).min(1),
  }),
  z.strictObject({
    disposition: z.enum(["withdrawn", "out-of-scope"]),
    rationale: text,
    evidence_ids: z.array(evidenceIdSchema),
  }),
]);

/** Strict durable record for one unresolved or evidence-qualified question. */
const residualUnknownObjectSchema = z.strictObject({
  unknown_id: unknownIdSchema,
  revision: z.number().int().min(1),
  previous_revision_digest: z
    .string()
    .regex(/^[a-f0-9]{64}$/u)
    .nullable(),
  revision_digest: z.string().regex(/^[a-f0-9]{64}$/u),
  scope_digest: z
    .string()
    .regex(/^[a-f0-9]{64}$/u)
    .nullable(),
  question: text,
  status: z.enum([
    "open",
    "investigating",
    "blocked",
    "contradicted",
    "resolved",
  ]),
  severity: z.enum(["low", "medium", "high", "critical"]),
  domain: text,
  comparison_conclusion_scope: comparisonConclusionScopeSchema.exactOptional(),
  supporting_evidence_ids: z.array(evidenceIdSchema),
  contradicting_evidence_ids: z.array(evidenceIdSchema),
  required_authority: z
    .enum([
      "shipped-artifact",
      "controlled-replay",
      "historical-reference",
      "external-service",
      "analyst-inference",
    ])
    .nullable(),
  required_confidence: z.enum(["observed", "derived", "inferred"]),
  required_environment: environmentRequirementSchema.nullable(),
  recommended_probes: z.array(probeSchema),
  relationships: z.array(relationshipSchema),
  resolution: resolutionSchema.nullable(),
  mutation_evidence_ids: z.array(evidenceIdSchema).min(1),
});

export type ResidualUnknown = z.infer<typeof residualUnknownSchema>;

type UnknownRevision = Omit<
  z.infer<typeof residualUnknownObjectSchema>,
  "revision_digest"
>;

const refineRevision = (value: UnknownRevision, context: z.RefinementCtx) => {
  if (
    value.unknown_id !==
    stableUnknownId(
      value.question,
      value.domain,
      value.scope_digest,
      value.comparison_conclusion_scope,
    )
  )
    context.addIssue({
      code: "custom",
      message: "Residual unknown ID does not match its immutable identity",
      path: ["unknown_id"],
    });
  if ((value.revision === 1) !== (value.previous_revision_digest === null))
    context.addIssue({
      code: "custom",
      message: "Only the first revision has no predecessor",
      path: ["previous_revision_digest"],
    });
  if ((value.status === "resolved") !== (value.resolution !== null))
    context.addIssue({
      code: "custom",
      message: "Only resolved unknowns carry a resolution",
      path: ["resolution"],
    });
  if (
    value.status === "contradicted" &&
    value.contradicting_evidence_ids.length === 0
  )
    context.addIssue({
      code: "custom",
      message: "Contradicted status requires contradicting evidence",
      path: ["contradicting_evidence_ids"],
    });
  if (
    value.relationships.some(
      (relationship) => relationship.unknown_id === value.unknown_id,
    )
  )
    context.addIssue({
      code: "custom",
      message: "An unknown cannot relate to itself",
      path: ["relationships"],
    });
  for (const ids of [
    value.supporting_evidence_ids,
    value.contradicting_evidence_ids,
    value.mutation_evidence_ids,
  ])
    if (new Set(ids).size !== ids.length)
      context.addIssue({
        code: "custom",
        message: "Evidence IDs must be unique",
      });
  if (
    value.comparison_conclusion_scope !== undefined &&
    ![
      ...value.supporting_evidence_ids,
      ...value.contradicting_evidence_ids,
    ].includes(value.comparison_conclusion_scope.comparison_evidence_id)
  )
    context.addIssue({
      code: "custom",
      message:
        "Scoped comparison Evidence must support or contradict the unknown",
      path: ["comparison_conclusion_scope"],
    });
  if (
    value.comparison_conclusion_scope !== undefined &&
    value.domain !== "function-comparison"
  )
    context.addIssue({
      code: "custom",
      message:
        "Comparison conclusion scope requires function-comparison domain",
      path: ["comparison_conclusion_scope"],
    });
  const contradictingEvidence = new Set(value.contradicting_evidence_ids);
  if (value.supporting_evidence_ids.some((id) => contradictingEvidence.has(id)))
    context.addIssue({
      code: "custom",
      message: "Evidence cannot simultaneously support and contradict",
    });
  const relationships = value.relationships.map(
    (relationship) => `${relationship.type}:${relationship.unknown_id}`,
  );
  if (new Set(relationships).size !== relationships.length)
    context.addIssue({
      code: "custom",
      message: "Relationships must be unique",
      path: ["relationships"],
    });
};
