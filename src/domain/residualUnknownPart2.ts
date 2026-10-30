import { createHash } from "node:crypto";

import canonicalize from "canonicalize";
import { z } from "zod";
import {
  compareUnicodeCodePoints,
  compositeKey,
} from "./unicodeCodePointOrder.js";
import { functionComparisonDimensionNameSchema } from "./functionComparisonSchemas.js";

const residualUnknownValidatedSchema = residualUnknownObjectSchema.superRefine(
  (value, context) => {
    if (computeRevisionDigest(value) !== value.revision_digest)
      context.addIssue({
        code: "custom",
        message: "Residual unknown revision digest does not match",
        path: ["revision_digest"],
      });
    refineRevision(value, context);
  },
);

export const residualUnknownSchema = residualUnknownValidatedSchema;

const generatedRevisionSchema = residualUnknownObjectSchema
  .omit({ revision_digest: true })
  .superRefine(refineRevision);

export type UnknownStatus = ResidualUnknown["status"];

/** Input for deterministic creation of one residual unknown. */
export const recordUnknownInputSchema = residualUnknownObjectSchema
  .omit({
    unknown_id: true,
    revision: true,
    previous_revision_digest: true,
    revision_digest: true,
    scope_digest: true,
    status: true,
    supporting_evidence_ids: true,
    contradicting_evidence_ids: true,
    resolution: true,
    mutation_evidence_ids: true,
  })
  .extend({
    supporting_evidence_ids: z.array(evidenceIdSchema).default([]),
    contradicting_evidence_ids: z.array(evidenceIdSchema).default([]),
  })
  .strict();

export type RecordUnknownInput = z.infer<typeof recordUnknownInputSchema>;

/** Explicit optimistic-concurrency update command for one unknown. */
export const updateUnknownInputSchema = z.strictObject({
  unknown_id: unknownIdSchema,
  expected_revision: z.number().int().min(1),
  status: residualUnknownObjectSchema.shape.status,
  severity: residualUnknownObjectSchema.shape.severity,
  supporting_evidence_ids: z.array(evidenceIdSchema),
  contradicting_evidence_ids: z.array(evidenceIdSchema),
  required_authority: residualUnknownObjectSchema.shape.required_authority,
  required_confidence: residualUnknownObjectSchema.shape.required_confidence,
  required_environment: environmentRequirementSchema.nullable(),
  recommended_probes: z.array(probeSchema),
  relationships: z.array(relationshipSchema),
  resolution: resolutionSchema.nullable(),
});

export type UpdateUnknownInput = z.infer<typeof updateUnknownInputSchema>;

/** Create stable identity from immutable question and domain fields. */
export const createResidualUnknown = (
  input: RecordUnknownInput,
  mutationEvidenceId: string,
  scopeDigest: string | null,
): ResidualUnknown => {
  const question = input.question.replace(/\s+/gu, " ").trim();
  const domain = input.domain.trim();
  const comparisonConclusionScope =
    input.comparison_conclusion_scope === undefined
      ? undefined
      : {
          comparison_evidence_id:
            input.comparison_conclusion_scope.comparison_evidence_id,
          dimensions: input.comparison_conclusion_scope.dimensions,
        };
  const revision = {
    unknown_id: stableUnknownId(
      question,
      domain,
      scopeDigest,
      comparisonConclusionScope,
    ),
    revision: 1,
    previous_revision_digest: null,
    scope_digest: scopeDigest,
    question,
    status:
      input.contradicting_evidence_ids.length > 0 ? "contradicted" : "open",
    domain,
    ...(comparisonConclusionScope === undefined
      ? {}
      : { comparison_conclusion_scope: comparisonConclusionScope }),
    ...projectRevisionDetails(input),
    resolution: null,
    mutation_evidence_ids: [mutationEvidenceId],
  } satisfies Omit<ResidualUnknown, "revision_digest">;
  return createRevision(revision);
};

/** Apply a complete, revision-guarded replacement while preserving identity. */
export const updateResidualUnknown = (
  current: ResidualUnknown,
  input: UpdateUnknownInput,
  mutationEvidenceId: string,
): ResidualUnknown => {
  const revision = {
    unknown_id: current.unknown_id,
    revision: current.revision + 1,
    previous_revision_digest: current.revision_digest,
    scope_digest: current.scope_digest,
    question: current.question,
    status: input.status,
    domain: current.domain,
    ...(current.comparison_conclusion_scope === undefined
      ? {}
      : { comparison_conclusion_scope: current.comparison_conclusion_scope }),
    ...projectRevisionDetails(input),
    resolution: input.resolution,
    mutation_evidence_ids: sortedUnique([
      ...current.mutation_evidence_ids,
      mutationEvidenceId,
    ]),
  } satisfies Omit<ResidualUnknown, "revision_digest">;
  return createRevision(revision);
};

/** Validate and normalize owned revision fields before computing their digest. */
const createRevision = (value: UnknownRevision): ResidualUnknown => {
  const revision = generatedRevisionSchema.parse(value);
  return { ...revision, revision_digest: computeRevisionDigest(revision) };
};

type RevisionDetailsInput = Pick<
  ResidualUnknown,
  | "severity"
  | "supporting_evidence_ids"
  | "contradicting_evidence_ids"
  | "required_authority"
  | "required_confidence"
  | "required_environment"
  | "recommended_probes"
  | "relationships"
>;

const projectRevisionDetails = (input: RevisionDetailsInput) => ({
  severity: input.severity,
  supporting_evidence_ids: sortedUnique(input.supporting_evidence_ids),
  contradicting_evidence_ids: sortedUnique(input.contradicting_evidence_ids),
  required_authority: input.required_authority,
  required_confidence: input.required_confidence,
  required_environment: input.required_environment,
  recommended_probes: [...input.recommended_probes],
  relationships: sortedRelationships(input.relationships),
});

const computeRevisionDigest = (
  value: UnknownRevision | ResidualUnknown,
): string => {
  const { revision_digest: _revisionDigest, ...semantic } =
    "revision_digest" in value ? value : { ...value, revision_digest: "" };
  void _revisionDigest;
  return createHash("sha256").update(canonicalJson(semantic)).digest("hex");
};

const canonicalJson = (value: unknown): string => {
  const serialized = canonicalize(value);
  if (serialized === undefined) throw new TypeError("Unknown identity failed");
  return serialized;
};

const sortedUnique = (values: readonly string[]): string[] =>
  [...new Set(values)].sort(compareUnicodeCodePoints);
const sameOrderedValues = (
  left: readonly string[],
  right: readonly string[],
): boolean =>
  left.length === right.length &&
  left.every((value, index) => value === right[index]);

const sortedRelationships = (
  values: readonly z.infer<typeof relationshipSchema>[],
): z.infer<typeof relationshipSchema>[] =>
  [...values].sort((left, right) =>
    compareUnicodeCodePoints(
      compositeKey([left.type, left.unknown_id]),
      compositeKey([right.type, right.unknown_id]),
    ),
  );
