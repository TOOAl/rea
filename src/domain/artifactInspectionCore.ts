import { z } from "zod";

import {
  artifactInventoryResultSchema,
  type ArtifactInventoryResult,
} from "./artifactGraph.js";
import { digestCanonicalValue } from "./canonicalDigest.js";
import { uniqueSorted } from "./canonicalOrdering.js";
import { evidenceSchema, parseEvidence, type Evidence } from "./evidence.js";
import { jsonValueSchema } from "./jsonValue.js";
import { prefixedDigestSchema } from "./../domain/digests.js";

const textSchema = z.string().min(1);
const evidenceIdSchema = prefixedDigestSchema("ev");
const artifactIdSchema = prefixedDigestSchema("art");

const inspectionObservationSchema = z.strictObject({
  observation_id: prefixedDigestSchema("aio"),
  kind: z.enum(["root-manifest", "integrity"]),
  subject: textSchema,
  value: jsonValueSchema,
  evidence_id: evidenceIdSchema,
});

const inspectionHypothesisSchema = z.strictObject({
  hypothesis_id: prefixedDigestSchema("aih"),
  statement: textSchema,
  confidence: z.enum(["medium", "low"]),
  basis_evidence_ids: z.array(evidenceIdSchema).min(1),
  limitation: textSchema,
});

const inspectionContradictionSchema = z.strictObject({
  contradiction_id: prefixedDigestSchema("aic"),
  statement: textSchema,
  occurrence_id: prefixedDigestSchema("occ"),
  declared_sha256: z.string().regex(/^[a-f0-9]{64}$/u),
  observed_sha256: z.string().regex(/^[a-f0-9]{64}$/u),
  evidence_id: evidenceIdSchema,
});

const nextProbeSchema = z.strictObject({
  operation: textSchema,
  rationale: textSchema,
  authority: z.enum([
    "artifact-bytes",
    "managed-static-analysis",
    "native-analysis-provider",
    "ast-static-analysis",
  ]),
});

const unexploredBranchSchema = z.strictObject({
  branch_id: prefixedDigestSchema("aib"),
  reason: z.enum(["format-specific-analysis-required", "unknown-format"]),
  detail: textSchema,
  next_probe: nextProbeSchema.nullable(),
  evidence_id: evidenceIdSchema,
});

/** Provider-neutral inspection result with its atomic source Evidence. */
export const artifactInspectionResultSchema = z.strictObject({
  inspection_id: prefixedDigestSchema("ai"),
  subject: z.strictObject({
    manifest_id: prefixedDigestSchema("agm"),
    root_artifact_id: artifactIdSchema,
    root_sha256: z.string().regex(/^[a-f0-9]{64}$/u),
    root_format: textSchema,
  }),
  substeps: z
    .array(
      z.strictObject({
        substep_id: prefixedDigestSchema("ais"),
        operation: z.literal("inventory_artifact"),
        status: z.literal("completed"),
        evidence_id: evidenceIdSchema,
        evidence: evidenceSchema.safeExtend({
          operation: z.literal("inventory_artifact"),
          normalized_result: artifactInventoryResultSchema,
        }),
      }),
    )
    .min(1),
  observations: z.array(inspectionObservationSchema),
  hypotheses: z.array(inspectionHypothesisSchema),
  contradictions: z.array(inspectionContradictionSchema),
  unexplored_branches: z.array(unexploredBranchSchema),
  next_probes: z.array(nextProbeSchema),
  coverage: z.strictObject({
    status: z.enum(["complete-within-substeps", "partial", "truncated"]),
    substeps_completed: z.number().int().min(1),
    observations_retained: z.number().int().min(0),
    observations_omitted: z.number().int().min(0),
    hypotheses_retained: z.number().int().min(0),
    hypotheses_omitted: z.number().int().min(0),
    unexplored_branches_retained: z.number().int().min(0),
    unexplored_branches_omitted: z.number().int().min(0),
    next_probes_retained: z.number().int().min(0),
    next_probes_omitted: z.number().int().min(0),
  }),
  evidence_links: z.array(evidenceIdSchema).min(1),
  limitations: z.array(textSchema),
});

export type ArtifactInspectionResult = z.infer<
  typeof artifactInspectionResultSchema
>;

/** Project one successful inventory Evidence record into an inspection report. */
export const createArtifactInspection = (
  inventoryInput: unknown,
): ArtifactInspectionResult => {
  const inventoryEvidence = parseInventoryEvidence(inventoryInput);
  const inventory = artifactInventoryResultSchema.parse(
    inventoryEvidence.normalized_result,
  );
  const observations = allObservations(
    inventory,
    inventoryEvidence.evidence_id,
  );
  const hypotheses = allHypotheses(inventory, inventoryEvidence.evidence_id);
  const nextProbes = probesFor(inventory);
  const branches = allUnexploredBranches(
    inventory,
    inventoryEvidence.evidence_id,
    nextProbes,
  );
  const retained = {
    observations,
    hypotheses,
    branches,
    probes: nextProbes,
  };
  const omissions = {
    observations: 0,
    hypotheses: 0,
    branches: 0,
    probes: 0,
  };
  const semantic = {
    subject: {
      manifest_id: inventory.manifest.manifest_id,
      root_artifact_id: inventory.manifest.root_artifact_id,
      root_sha256: inventory.manifest.root_sha256,
      root_format: inventory.manifest.root_format,
    },
    substeps: [
      {
        substep_id: `ais_${digestCanonicalValue(
          {
            operation: "inventory_artifact",
            evidence_id: inventoryEvidence.evidence_id,
          },
          "Artifact inspection",
        )}`,
        operation: "inventory_artifact" as const,
        status: "completed" as const,
        evidence_id: inventoryEvidence.evidence_id,
        evidence: inventoryEvidence,
      },
    ],
    observations: retained.observations,
    hypotheses: retained.hypotheses,
    contradictions: contradictions(inventory, inventoryEvidence.evidence_id),
    unexplored_branches: retained.branches,
    next_probes: retained.probes,
    coverage: {
      status: inspectionCoverage(inventory, omissions),
      substeps_completed: 1 as const,
      observations_retained: retained.observations.length,
      observations_omitted: omissions.observations,
      hypotheses_retained: retained.hypotheses.length,
      hypotheses_omitted: omissions.hypotheses,
      unexplored_branches_retained: retained.branches.length,
      unexplored_branches_omitted: omissions.branches,
      next_probes_retained: retained.probes.length,
      next_probes_omitted: omissions.probes,
    },
    evidence_links: [inventoryEvidence.evidence_id],
    limitations: uniqueSorted([
      ...inventory.limitations,
      "Inspection derives bounded static hypotheses and next probes; it does not execute the artifact or claim format-specific semantics.",
    ]),
  };
  return artifactInspectionResultSchema.parse({
    ...semantic,
    inspection_id: `ai_${digestCanonicalValue(semantic, "Artifact inspection")}`,
  });
};

const parseInventoryEvidence = (input: unknown): Evidence => {
  const evidence = parseEvidence(input);
  if (evidence.operation !== "inventory_artifact")
    throw new TypeError(
      "Artifact inspection substep requires inventory_artifact Evidence",
    );
  return evidence;
};

// Artifact, occurrence, and edge records stay in the nested inventory Evidence;
// restating each one here would repeat the complete graph in every result.
const allObservations = (
  inventory: ArtifactInventoryResult,
  evidenceId: string,
): ArtifactInspectionResult["observations"] => [
  observation(
    "root-manifest",
    inventory.manifest.root_artifact_id,
    inventory.manifest,
    evidenceId,
  ),
  ...inventory.integrity_contradictions.map((value) =>
    observation("integrity", value.contradiction_id, value, evidenceId),
  ),
];
