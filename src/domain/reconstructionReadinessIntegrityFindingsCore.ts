import {
  addMissingEvidenceFindings,
  readinessFinding as finding,
} from "./reconstructionReadinessFindingHelpers.js";
import type {
  ReadinessFinding,
  ReconstructionReadinessInput,
} from "./reconstructionReadinessSchemas.js";

export const readinessIntegrityFindings = (
  input: ReconstructionReadinessInput,
  evidenceIds: ReadonlySet<string>,
  sourceDigest: string,
): ReadinessFinding[] => [
  ...comparisonFindings(input, evidenceIds),
  ...contradictionFindings(input, evidenceIds),
  ...closureFindings(input, evidenceIds),
  ...cleanupFindings(input, evidenceIds),
  ...replayFindings(input, evidenceIds, sourceDigest),
];

const comparisonFindings = (
  input: ReconstructionReadinessInput,
  evidenceIds: ReadonlySet<string>,
): ReadinessFinding[] => {
  const findings: ReadinessFinding[] = [];
  for (const comparison of input.comparisons) {
    const unsafeEquivalent =
      comparison.verdict === "equivalent" &&
      (comparison.truncated ||
        comparison.unavailable_authority ||
        comparison.unstable ||
        comparison.contradiction_ids.length > 0);
    if (unsafeEquivalent)
      findings.push(
        finding(
          "false-equivalence",
          "compare-authority-candidate",
          "fail",
          `${comparison.comparison_id} claims equivalence across incomplete or contradicted Evidence.`,
          comparison.evidence_ids,
        ),
      );
    if (
      comparison.concurrent &&
      comparison.schedule_semantics === "total-order"
    )
      findings.push(
        finding(
          "unsafe-concurrency-semantics",
          "compare-authority-candidate",
          "fail",
          `${comparison.comparison_id} uses total-order semantics for concurrent behavior.`,
          comparison.evidence_ids,
        ),
      );
    if (
      comparison.deliberate_divergence_ref !== null &&
      !comparison.divergence_refs.includes(comparison.deliberate_divergence_ref)
    )
      findings.push(
        finding(
          "divergence-not-localized",
          "compare-authority-candidate",
          "fail",
          `${comparison.comparison_id} did not localize its deliberate primary divergence.`,
          comparison.evidence_ids,
        ),
      );
    addMissingEvidenceFindings(
      findings,
      "compare-authority-candidate",
      comparison.evidence_ids,
      evidenceIds,
    );
  }
  return findings;
};

const contradictionFindings = (
  input: ReconstructionReadinessInput,
  evidenceIds: ReadonlySet<string>,
): ReadinessFinding[] => {
  const findings: ReadinessFinding[] = [];
  const comparisons = new Map(
    input.comparisons.map((comparison) => [
      comparison.comparison_id,
      comparison,
    ]),
  );
  for (const contradiction of input.contradictions) {
    if (
      contradiction.declared_sha256 === contradiction.observed_sha256 ||
      new Set(contradiction.evidence_ids).size < 2
    )
      findings.push(
        finding(
          "contradiction-proof-incomplete",
          "preserve-contradictions",
          "fail",
          `${contradiction.contradiction_id} must preserve distinct hashes and Evidence records.`,
          contradiction.evidence_ids,
        ),
      );
    for (const comparisonId of contradiction.affected_comparison_ids) {
      const comparison = comparisons.get(comparisonId);
      if (comparison === undefined)
        findings.push(
          finding(
            "contradiction-comparison-missing",
            "preserve-contradictions",
            "unknown",
            `Contradiction references missing comparison ${comparisonId}.`,
            contradiction.evidence_ids,
          ),
        );
      else if (
        comparison.verdict === "equivalent" ||
        !comparison.contradiction_ids.includes(contradiction.contradiction_id)
      )
        findings.push(
          finding(
            "contradiction-equivalence-not-blocked",
            "preserve-contradictions",
            "fail",
            `${comparisonId} does not preserve contradiction ${contradiction.contradiction_id}.`,
            contradiction.evidence_ids,
          ),
        );
    }
    addMissingEvidenceFindings(
      findings,
      "preserve-contradictions",
      contradiction.evidence_ids,
      evidenceIds,
    );
  }
  return findings;
};

const closureFindings = (
  input: ReconstructionReadinessInput,
  evidenceIds: ReadonlySet<string>,
): ReadinessFinding[] => {
  const findings: ReadinessFinding[] = [];
  if (input.obligation_ledger.summary.required === 0)
    findings.push(
      finding(
        "reconstruction-obligations-empty",
        "verify-reconstruction-closure",
        "unknown",
        "A ready ledger must include at least one required reconstruction obligation.",
      ),
    );
  if (
    input.obligation_ledger.status !== "ready" ||
    input.obligation_ledger.summary.required_open > 0
  )
    findings.push(
      finding(
        "reconstruction-closure-open",
        "verify-reconstruction-closure",
        "unknown",
        `Obligation ledger is ${input.obligation_ledger.status} with ${String(input.obligation_ledger.summary.required_open)} required obligations open.`,
        input.obligation_ledger.evidence_links,
      ),
    );
  addMissingEvidenceFindings(
    findings,
    "verify-reconstruction-closure",
    input.obligation_ledger.evidence_links,
    evidenceIds,
  );
  evaluateClosureHistory(input, findings, evidenceIds);
  for (const check of input.delegation_checks) {
    if (check.delegates_to_authority)
      findings.push(
        finding(
          "candidate-delegates-to-authority",
          "verify-reconstruction-closure",
          "fail",
          `${check.candidate_id} delegates behavior back to the authority.`,
          check.evidence_ids,
        ),
      );
    addMissingEvidenceFindings(
      findings,
      "verify-reconstruction-closure",
      check.evidence_ids,
      evidenceIds,
    );
  }
  return findings;
};
