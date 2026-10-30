import { createHash } from "node:crypto";

import canonicalize from "canonicalize";
import { z } from "zod";

import {
  compareUnicodeCodePoints,
  compositeKey,
} from "./unicodeCodePointOrder.js";

import {
  authenticateParsedEvidenceBundle,
  evidenceBundleSchema,
} from "./evidenceBundle.js";
import type { Evidence } from "./evidence.js";
import {
  evaluateReconstructionClaims,
  evaluateReconstructionPackageProofs,
  evaluateReconstructionSurfaces,
  evaluateReconstructionCoverageRisks,
  recommendedReconstructionProbes,
  type ReconstructionEvaluationContext,
} from "./reconstructionCoverageEvaluation.js";
import { digestSchema } from "./../domain/digests.js";
import { prefixedDigestSchema } from "./../domain/digests.js";
import {
  offsetDateTimeInstantFromEpochMilliseconds,
  offsetDateTimeSchema,
} from "./offsetDateTime.js";

const closureReasonSchema = z.strictObject({
  code: z.enum([
    "surface-missing",
    "owner-missing",
    "owner-duplicate",
    "owner-path-missing",
    "owner-path-unknown",
    "owner-undistributed",
    "owner-distribution-unknown",
    "authority-routing-detected",
    "authority-routing-unknown",
    "disposition-not-allowed",
    "dependency-surface-missing",
    "claim-missing",
    "verifier-missing",
    "verifier-duplicate",
    "verifier-result-missing",
    "verifier-result-stale",
    "verifier-result-incompatible",
    "verifier-result-ambiguous",
    "verifier-failed",
    "verifier-unknown",
    "active-unknown",
    "active-contradiction",
    "package-proof-missing",
    "package-proof-failed",
    "package-proof-unknown",
  ]),
  subject_id: stableIdSchema,
  detail: boundedTextSchema,
});

export const reconstructionClosureResultSchema = z.strictObject({
  boundary_id: stableIdSchema,
  status: z.enum(["partial", "failed", "unknown", "ready"]),
  summary: z.strictObject({
    required_surfaces: z.number().int().min(0),
    required_claims: z.number().int().min(0),
    reasons: z.number().int().min(0),
  }),
  reasons: z.array(closureReasonSchema),
  recommended_probes: z.array(
    z.strictObject({
      operation: stableIdSchema,
      subject_id: stableIdSchema,
      rationale: boundedTextSchema,
    }),
  ),
  evidence_ids: z.array(evidenceIdSchema),
});

export type ReconstructionClosureResult = z.infer<
  typeof reconstructionClosureResultSchema
>;

type ClosureReason = z.infer<typeof closureReasonSchema>;

/** Build a verifier contract whose digest prevents retrospective coverage edits. */
export const createReconstructionVerifierContract = (
  input: z.input<typeof verifierContractBaseSchema>,
): ReconstructionVerifierContract => {
  const parsed = verifierContractBaseSchema.parse(input);
  return verifierContractSchema.parse({
    ...parsed,
    contract_sha256: digest(parsed),
  });
};

/** Evaluate inline coverage data against one named fail-closed boundary. */
export const evaluateReconstructionClosure = (
  coverageInput: unknown,
  boundaryId: string,
  nowEpochMs: number,
): ReconstructionClosureResult => {
  const parsed = parseCoverageData(coverageInput);
  const boundary = parsed.coverage.boundaries.find(
    ({ boundary_id: id }) => id === boundaryId,
  );
  if (boundary === undefined)
    throw new TypeError(`Unknown reconstruction boundary: ${boundaryId}`);
  const nowInstant = offsetDateTimeInstantFromEpochMilliseconds(nowEpochMs);
  const context: ReconstructionEvaluationContext = {
    ...parsed,
    boundary,
    nowEpochMs,
    nowInstant,
    reasons: [],
    evidenceIds: new Set<string>(),
  };
  evaluateReconstructionSurfaces(context);
  evaluateReconstructionClaims(context);
  evaluateReconstructionCoverageRisks(context);
  evaluateReconstructionPackageProofs(context);
  const reasons = [...context.reasons].sort(reasonOrder);
  return reconstructionClosureResultSchema.parse({
    boundary_id: boundary.boundary_id,
    status: closureStatus(reasons),
    summary: {
      required_surfaces: boundary.required_surface_ids.length,
      required_claims: boundary.required_claim_ids.length,
      reasons: reasons.length,
    },
    reasons,
    recommended_probes: recommendedReconstructionProbes(reasons),
    evidence_ids: [...context.evidenceIds].sort(),
  });
};

const validateCoverageReferences = (
  workspace: ReconstructionCoverageData,
): Omit<ParsedReconstructionCoverage, "coverage"> => {
  const evidenceBundle = authenticateParsedEvidenceBundle(
    workspace.evidence_bundle,
  );
  const evidenceById = new Map(
    evidenceBundle.records.map((record) => [record.evidence_id, record]),
  );
  const unknownIds = new Set(
    evidenceBundle.unknowns.map(({ unknown_id: id }) => id),
  );
  const artifacts = indexUnique(workspace.artifacts, "artifact_id");
  const surfaces = indexUnique(workspace.surfaces, "surface_id");
  const claims = indexUnique(workspace.claims, "claim_id");
  const contracts = indexUnique(workspace.verifier_contracts, "verifier_id");
  indexUnique(workspace.contradictions, "contradiction_id");
  indexUnique(workspace.package_proofs, "proof_id");
  indexUnique(workspace.boundaries, "boundary_id");
  for (const contract of workspace.verifier_contracts) {
    const { contract_sha256: contractSha256, ...base } = contract;
    if (contractSha256 !== digest(verifierContractBaseSchema.parse(base)))
      throw new TypeError(
        `Verifier contract digest is invalid: ${contract.verifier_id}`,
      );
  }
  for (const surface of workspace.surfaces)
    if (!artifacts.has(surface.artifact_id))
      throw new TypeError(`Surface artifact is missing: ${surface.surface_id}`);
  const ownersBySurface = new Map<
    string,
    ReconstructionCoverageData["owners"][number][]
  >();
  for (const owner of workspace.owners) {
    if (!surfaces.has(owner.surface_id))
      throw new TypeError(`Owner surface is missing: ${owner.surface_id}`);
    const owners = ownersBySurface.get(owner.surface_id);
    if (owners === undefined) ownersBySurface.set(owner.surface_id, [owner]);
    else owners.push(owner);
  }
  for (const claim of workspace.claims)
    if (claim.surface_ids.some((id) => !surfaces.has(id)))
      throw new TypeError(`Claim surface is missing: ${claim.claim_id}`);
  for (const contract of workspace.verifier_contracts)
    if (contract.claim_ids.some((id) => !claims.has(id)))
      throw new TypeError(`Verifier claim is missing: ${contract.verifier_id}`);
  for (const result of workspace.verifier_results)
    if (!contracts.has(result.verifier_id))
      throw new TypeError(
        `Verifier result contract is missing: ${result.verifier_id}`,
      );
  const referencedEvidenceIds = [
    ...workspace.artifacts.flatMap(({ evidence_ids: ids }) => ids),
    ...workspace.surfaces.flatMap(({ evidence_ids: ids }) => ids),
    ...workspace.verifier_results.flatMap(({ evidence_ids: ids }) => ids),
    ...workspace.contradictions.flatMap(({ evidence_ids: ids }) => ids),
    ...workspace.package_proofs.flatMap(({ evidence_ids: ids }) => ids),
  ];
  const danglingEvidence = referencedEvidenceIds.find(
    (id) => !evidenceById.has(id),
  );
  if (danglingEvidence !== undefined)
    throw new TypeError(
      `Coverage workspace Evidence is missing: ${danglingEvidence}`,
    );
  const danglingUnknown = workspace.residual_unknown_ids.find(
    (id) => !unknownIds.has(id),
  );
  if (danglingUnknown !== undefined)
    throw new TypeError(
      `Coverage workspace residual unknown is missing: ${danglingUnknown}`,
    );
  return { evidenceById, artifacts, surfaces, claims, ownersBySurface };
};

const indexUnique = <Item extends Record<Key, string>, Key extends keyof Item>(
  items: readonly Item[],
  key: Key,
): ReadonlyMap<string, Item> => {
  const values = new Map<string, Item>();
  for (const item of items) {
    if (values.has(item[key]))
      throw new TypeError(`Duplicate reconstruction coverage ${String(key)}`);
    values.set(item[key], item);
  }
  return values;
};

const closureStatus = (
  reasons: readonly ClosureReason[],
): ReconstructionClosureResult["status"] => {
  if (reasons.length === 0) return "ready";
  if (
    reasons.some(({ code }) =>
      [
        "verifier-failed",
        "active-contradiction",
        "authority-routing-detected",
        "owner-path-missing",
        "owner-undistributed",
        "package-proof-failed",
      ].includes(code),
    )
  )
    return "failed";
  if (
    reasons.some(({ code }) =>
      [
        "verifier-result-stale",
        "verifier-result-incompatible",
        "verifier-result-ambiguous",
        "verifier-unknown",
        "active-unknown",
        "owner-path-unknown",
        "owner-distribution-unknown",
        "authority-routing-unknown",
        "package-proof-unknown",
      ].includes(code),
    )
  )
    return "unknown";
  return "partial";
};

const reasonOrder = (left: ClosureReason, right: ClosureReason): number =>
  compareUnicodeCodePoints(
    compositeKey([left.code, left.subject_id]),
    compositeKey([right.code, right.subject_id]),
  );

const digest = (value: unknown): string => {
  const encoded = canonicalize(value);
  if (encoded === undefined)
    throw new TypeError("Reconstruction coverage value is not canonical JSON");
  return createHash("sha256").update(encoded).digest("hex");
};
