import type {
  ReconstructionClosureResult,
  ReconstructionCoverageData,
  ReconstructionVerifierContract,
  ParsedReconstructionCoverage,
} from "./reconstructionCoverage.js";
import {
  packageProofHasComparableEvidence,
  verifierHasComparableEvidence,
} from "./reconstructionCoverageEvidence.js";
import {
  compareOffsetDateTimeInstants,
  offsetDateTimeInstantFromEpochMilliseconds,
  type OffsetDateTimeInstant,
} from "./offsetDateTime.js";
import {
  latestVerifierObservationsByVerifier,
  sameVerifierAssessment,
  type VerifierObservation,
} from "./reconstructionCoverageVerifierResults.js";
import type { ReconstructionEvaluationContext } from "./reconstructionCoverageEvaluationCore.js";
import type { ClosureReason } from "./reconstructionCoverageEvaluationCore.js";
export const evaluateReconstructionCoverageRisks = (
  context: ReconstructionEvaluationContext,
): void => {
  for (const unknownId of context.coverage.residual_unknown_ids)
    if (!context.boundary.allowed_unknown_ids.includes(unknownId))
      addReason(
        context,
        "active-unknown",
        unknownId,
        "Active residual unknown is not permitted by the completion boundary.",
      );
  for (const contradiction of context.coverage.contradictions)
    if (
      contradiction.status === "active" &&
      (contradiction.surface_ids.some((id) =>
        context.boundary.required_surface_ids.includes(id),
      ) ||
        contradiction.claim_ids.some((id) =>
          context.boundary.required_claim_ids.includes(id),
        ))
    ) {
      addEvidence(context, contradiction.evidence_ids);
      addReason(
        context,
        "active-contradiction",
        contradiction.contradiction_id,
        "Active contradiction affects the completion boundary.",
      );
    }
};

export const evaluateReconstructionPackageProofs = (
  context: ReconstructionEvaluationContext,
): void => {
  const requiredArtifactDigests = context.boundary.required_surface_ids.flatMap(
    (surfaceId) => {
      const surface = context.surfaces.get(surfaceId);
      const artifact =
        surface === undefined
          ? undefined
          : context.artifacts.get(surface.artifact_id);
      return artifact === undefined ? [] : [artifact.artifact_sha256];
    },
  );
  for (const kind of context.boundary.required_package_proof_kinds) {
    const proofs = context.coverage.package_proofs.filter(
      (proof) => proof.kind === kind,
    );
    const applicable = (
      proof: ReconstructionCoverageData["package_proofs"][number],
    ): boolean =>
      requiredArtifactDigests.every((digest) =>
        proof.artifact_sha256s.includes(digest),
      ) && packageProofHasComparableEvidence(proof, context.evidenceById);
    const passing = proofs.find(
      (proof) => proof.status === "pass" && applicable(proof),
    );
    if (passing !== undefined) {
      addEvidence(context, passing.evidence_ids);
      continue;
    }
    const failing = proofs.find(
      (proof) => proof.status === "fail" && applicable(proof),
    );
    if (failing !== undefined) {
      addEvidence(context, failing.evidence_ids);
      addReason(
        context,
        "package-proof-failed",
        kind,
        "Required package or integration proof failed.",
      );
    } else if (proofs.length > 0) {
      addEvidence(
        context,
        proofs.flatMap(({ evidence_ids }) => evidence_ids),
      );
      addReason(
        context,
        "package-proof-unknown",
        kind,
        "Required package or integration proof has no qualifying passing Evidence.",
      );
    } else
      addReason(
        context,
        "package-proof-missing",
        kind,
        "Required package or integration proof is missing.",
      );
  }
};

const addReason = (
  context: ReconstructionEvaluationContext,
  code: ClosureReason["code"],
  subjectId: string,
  detail: string,
): void => {
  context.reasons.push({ code, subject_id: subjectId, detail });
};

const addEvidence = (
  context: ReconstructionEvaluationContext,
  evidenceIds: readonly string[],
): void => {
  for (const evidenceId of evidenceIds) context.evidenceIds.add(evidenceId);
};
