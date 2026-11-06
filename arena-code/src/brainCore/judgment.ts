export type ClaimPolarity = "positive" | "negative";
export type EvidenceRelation = "supports" | "contradicts" | "not-comparable";
export type EvidenceReason =
  | "claim-match"
  | "polarity-conflict"
  | "subject-mismatch"
  | "predicate-mismatch"
  | "object-mismatch"
  | "scope-mismatch"
  | "time-scope-mismatch";
export type JudgmentStatus = "supported" | "refuted" | "contested" | "insufficient";

export interface AtomicClaim {
  subject: string;
  predicate: string;
  object: string;
  polarity: ClaimPolarity;
  scope: string;
  timeScope: string;
}

export interface ClaimEvidence {
  id: string;
  sourceId: string;
  informationNeedId: string;
  collectionStepId: string;
  claim: AtomicClaim;
}

export interface EvidenceAssessment {
  evidenceId: string;
  sourceId: string;
  informationNeedId: string;
  collectionStepId: string;
  relation: EvidenceRelation;
  reason: EvidenceReason;
}

export interface JudgmentResult {
  status: JudgmentStatus;
  assessments: EvidenceAssessment[];
  supportingEvidenceIds: string[];
  contradictingEvidenceIds: string[];
  nonComparableEvidenceIds: string[];
}

function normalized(value: string): string {
  return value.normalize("NFC").trim().toLowerCase();
}

function compareClaim(target: AtomicClaim, evidence: AtomicClaim): EvidenceReason {
  if (normalized(target.subject) !== normalized(evidence.subject)) return "subject-mismatch";
  if (normalized(target.predicate) !== normalized(evidence.predicate)) return "predicate-mismatch";
  if (normalized(target.object) !== normalized(evidence.object)) return "object-mismatch";
  if (normalized(target.scope) !== normalized(evidence.scope)) return "scope-mismatch";
  if (normalized(target.timeScope) !== normalized(evidence.timeScope)) {
    return "time-scope-mismatch";
  }
  return target.polarity === evidence.polarity ? "claim-match" : "polarity-conflict";
}

/** Compare only explicit fields. This is not a source-truth or semantic verifier. */
export function judgeAtomicClaim(
  claim: AtomicClaim,
  evidence: readonly ClaimEvidence[],
): JudgmentResult {
  const assessments: EvidenceAssessment[] = evidence.map((item) => {
    const reason = compareClaim(claim, item.claim);
    const relation: EvidenceRelation =
      reason === "claim-match"
        ? "supports"
        : reason === "polarity-conflict"
          ? "contradicts"
          : "not-comparable";
    return {
      evidenceId: item.id,
      sourceId: item.sourceId,
      informationNeedId: item.informationNeedId,
      collectionStepId: item.collectionStepId,
      relation,
      reason,
    };
  });
  const supportingEvidenceIds = assessments
    .filter((item) => item.relation === "supports")
    .map((item) => item.evidenceId);
  const contradictingEvidenceIds = assessments
    .filter((item) => item.relation === "contradicts")
    .map((item) => item.evidenceId);
  const nonComparableEvidenceIds = assessments
    .filter((item) => item.relation === "not-comparable")
    .map((item) => item.evidenceId);

  const status: JudgmentStatus =
    supportingEvidenceIds.length > 0 && contradictingEvidenceIds.length > 0
      ? "contested"
      : supportingEvidenceIds.length > 0
        ? "supported"
        : contradictingEvidenceIds.length > 0
          ? "refuted"
          : "insufficient";

  return {
    status,
    assessments,
    supportingEvidenceIds,
    contradictingEvidenceIds,
    nonComparableEvidenceIds,
  };
}
