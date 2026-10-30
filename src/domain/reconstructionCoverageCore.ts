import { z } from "zod";

import { evidenceBundleSchema } from "./evidenceBundle.js";
import type { Evidence } from "./evidence.js";
import { digestSchema } from "./../domain/digests.js";
import { prefixedDigestSchema } from "./../domain/digests.js";
import { offsetDateTimeSchema } from "./offsetDateTime.js";

const evidenceIdSchema = prefixedDigestSchema("ev");
const stableIdSchema = z
  .string()
  .regex(/^[A-Za-z][A-Za-z0-9._:\x2f\x2d]{0,199}$/u);
const boundedTextSchema = z.string().trim().min(1);

const authoritySchema = z.enum([
  "observed",
  "derived",
  "inferred",
  "historical",
  "external",
]);

const artifactSchema = z.strictObject({
  artifact_id: stableIdSchema,
  artifact_sha256: digestSchema,
  version: z.string().trim().min(1),
  environment_sha256: digestSchema,
  evidence_ids: z.array(evidenceIdSchema).min(1),
});

const surfaceSchema = z.strictObject({
  surface_id: stableIdSchema,
  family: z.string().trim().min(1),
  artifact_id: stableIdSchema,
  occurrence_id: z.string().trim().min(1).nullable(),
  location: boundedTextSchema,
  authority: authoritySchema,
  dependency_surface_ids: z.array(stableIdSchema),
  evidence_ids: z.array(evidenceIdSchema).min(1),
});

const implementationOwnerSchema = z.strictObject({
  disposition: z.literal("implemented"),
  owner_path: boundedTextSchema,
  owner_export: z.string().trim().min(1).nullable(),
  owner_sha256: digestSchema,
  path_state: z.enum(["present", "missing", "unknown"]),
  package_state: z.enum(["distributed", "missing", "unknown"]),
  authority_route: z.enum(["none", "detected", "unknown"]),
});

const externalOwnerSchema = z.strictObject({
  disposition: z.enum(["external", "non-goal"]),
  rationale: boundedTextSchema,
});

const ownerSchema = z.strictObject({
  surface_id: stableIdSchema,
  ownership: z.discriminatedUnion("disposition", [
    implementationOwnerSchema,
    externalOwnerSchema,
  ]),
});

const claimSchema = z.strictObject({
  claim_id: stableIdSchema,
  title: z.string().trim().min(1),
  kind: z.string().trim().min(1),
  surface_ids: z.array(stableIdSchema).min(1),
  required_dimensions: z.array(stableIdSchema).min(1),
  required_authority: z.enum([
    "shipped-artifact",
    "controlled-replay",
    "live-observation",
    "external",
  ]),
});

const verifierContractBaseSchema = z.strictObject({
  verifier_id: stableIdSchema,
  claim_ids: z.array(stableIdSchema).min(1),
  dimensions: z.array(stableIdSchema).min(1),
  authority: z.enum([
    "shipped-artifact",
    "controlled-replay",
    "live-observation",
    "external",
  ]),
  max_age_ms: z.number().int().min(1),
  minimum_repeats: z.number().int().min(1),
  normalization_sha256: digestSchema,
  normalization_removes_dimensions: z.literal(false),
});

const verifierContractSchema = verifierContractBaseSchema.extend({
  contract_sha256: digestSchema,
});

const verifierResultSchema = z.strictObject({
  verifier_id: stableIdSchema,
  contract_sha256: digestSchema,
  observed_at: offsetDateTimeSchema,
  status: z.enum([
    "pass",
    "fail",
    "unknown",
    "unsupported",
    "truncated",
    "skipped",
  ]),
  covered_claim_ids: z.array(stableIdSchema).min(1),
  covered_dimensions: z.array(stableIdSchema).min(1),
  artifact_sha256s: z.array(digestSchema).min(1),
  owner_sha256s: z.array(digestSchema),
  normalization_sha256: digestSchema,
  repeats: z.number().int().min(1),
  evidence_ids: z.array(evidenceIdSchema).min(1),
});

const contradictionSchema = z.strictObject({
  contradiction_id: stableIdSchema,
  status: z.enum(["active", "resolved"]),
  surface_ids: z.array(stableIdSchema),
  claim_ids: z.array(stableIdSchema),
  evidence_ids: z.array(evidenceIdSchema).min(2),
});

const packageProofSchema = z.strictObject({
  proof_id: stableIdSchema,
  kind: z.enum([
    "build",
    "clean-install",
    "package-contents",
    "runtime-routing",
    "authority-independence",
  ]),
  status: z.enum(["pass", "fail", "unknown", "unsupported", "skipped"]),
  artifact_sha256s: z.array(digestSchema).min(1),
  evidence_ids: z.array(evidenceIdSchema).min(1),
});

const boundarySchema = z.strictObject({
  boundary_id: stableIdSchema,
  title: z.string().trim().min(1),
  required_surface_ids: z.array(stableIdSchema).min(1),
  required_claim_ids: z.array(stableIdSchema).min(1),
  required_package_proof_kinds: z.array(packageProofSchema.shape.kind).min(1),
  allowed_dispositions: z.array(z.enum(["external", "non-goal"])),
  allowed_unknown_ids: z.array(stableIdSchema),
});

export const reconstructionCoverageDataSchema = z.strictObject({
  evidence_bundle: evidenceBundleSchema,
  artifacts: z.array(artifactSchema),
  surfaces: z.array(surfaceSchema),
  owners: z.array(ownerSchema),
  claims: z.array(claimSchema),
  verifier_contracts: z.array(verifierContractSchema),
  verifier_results: z.array(verifierResultSchema),
  residual_unknown_ids: z.array(stableIdSchema),
  contradictions: z.array(contradictionSchema),
  package_proofs: z.array(packageProofSchema),
  boundaries: z.array(boundarySchema),
});

export type ReconstructionCoverageData = z.infer<
  typeof reconstructionCoverageDataSchema
>;
export type ReconstructionVerifierContract = z.infer<
  typeof verifierContractSchema
>;

/** Owned coverage snapshot and its authenticated, unique lookup facts. */
export interface ParsedReconstructionCoverage {
  readonly coverage: ReconstructionCoverageData;
  readonly evidenceById: ReadonlyMap<string, Evidence>;
  readonly artifacts: ReadonlyMap<
    string,
    ReconstructionCoverageData["artifacts"][number]
  >;
  readonly surfaces: ReadonlyMap<
    string,
    ReconstructionCoverageData["surfaces"][number]
  >;
  readonly claims: ReadonlyMap<
    string,
    ReconstructionCoverageData["claims"][number]
  >;
  readonly ownersBySurface: ReadonlyMap<
    string,
    readonly ReconstructionCoverageData["owners"][number][]
  >;
}

/** Parse inline coverage data and validate every evidence and authority link. */
export const createReconstructionCoverageData = (
  input: unknown,
): ReconstructionCoverageData => parseCoverageData(input).coverage;

/** Retain authenticated Evidence facts alongside the validated coverage snapshot. */
const parseCoverageData = (input: unknown): ParsedReconstructionCoverage => {
  const coverage = reconstructionCoverageDataSchema.parse(input);
  return { coverage, ...validateCoverageReferences(coverage) };
};
