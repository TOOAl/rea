import {
  parseEvidenceBundle,
  type EvidenceBundle,
} from "../domain/evidenceBundle.js";
import type {
  ReconstructionObligation,
  ReconstructionObligationManifest,
} from "../domain/reconstructionObligationLedgerSchemas.js";
import {
  reconstructionObligationDependencyGraph,
  reconstructionObligationLedgerStatus,
  hasReconstructionObligationDiagnostic as hasDiagnostic,
  reconstructionObligationReports,
} from "../domain/reconstructionObligationLedgerIntegrity.js";
import type { ReconstructionObligationCandidate } from "./ReconstructionObligationCandidates.js";
import {
  evidenceAuthoritySupportsProof,
  evidenceSupportsOriginalAuthority,
  proofAuthoritySatisfies,
} from "./ReconstructionObligationAuthority.js";
import {
  addObligationDiagnostic as addDiagnostic,
  groupManifestBindings,
  uniqueObligationDiagnostics as uniqueDiagnostics,
} from "./ReconstructionObligationLedgerDiagnostics.js";
import { originalCasesFor } from "./ReconstructionObligationOriginalCases.js";
import { compareUnicodeCodePoints } from "../domain/unicodeCodePointOrder.js";

const evaluateBinding = (
  candidate: ReconstructionObligationCandidate,
  binding: Binding,
  context: EvaluationContext,
  diagnostics: Diagnostic[],
): void => {
  if (candidate.requires_parser_type && binding.parser_type === null)
    addDiagnostic(
      diagnostics,
      "missing-parser-type",
      "This boundary requires an explicit parser, schema, and domain type.",
    );
  for (const caseKind of candidate.required_case_kinds) {
    const fixtures = binding.fixtures.filter(
      ({ case_kind: fixtureCase }) => fixtureCase === caseKind,
    );
    if (fixtures.length === 0) {
      addDiagnostic(
        diagnostics,
        "missing-case",
        `Required ${caseKind} fixture is missing.`,
      );
      continue;
    }
    for (const fixture of fixtures)
      for (const evidenceId of fixture.evidence_ids)
        if (!context.evidence.has(evidenceId))
          addDiagnostic(
            diagnostics,
            "missing-case",
            `${caseKind} fixture ${fixture.fixture_id} references Evidence ${evidenceId}, which is absent from the bundle.`,
          );
    if (
      !fixtures.some(
        (fixture) =>
          proofAuthoritySatisfies(
            fixture.authority,
            candidate.required_fixture_authority,
          ) &&
          fixture.evidence_ids.every((id) => {
            const evidence = context.evidence.get(id);
            return (
              evidence !== undefined &&
              evidenceAuthoritySupportsProof(evidence, fixture.authority, {
                obligationId: candidate.obligation_id,
                fixtureId: fixture.fixture_id,
                caseKind: fixture.case_kind,
              })
            );
          }),
      )
    )
      addDiagnostic(
        diagnostics,
        "weak-fixture-authority",
        `${caseKind} fixture lacks ${candidate.required_fixture_authority} authority or authenticated Evidence.`,
      );
  }
  evaluateVerifier(candidate, binding, context, diagnostics);
};

const evaluateVerifier = (
  candidate: ReconstructionObligationCandidate,
  binding: Binding,
  context: EvaluationContext,
  diagnostics: Diagnostic[],
): void => {
  const verifier = binding.verifier;
  if (verifier === null) {
    addDiagnostic(
      diagnostics,
      "missing-verifier",
      "No verifier claim is bound to this obligation.",
    );
    return;
  }
  if (!verifier.enumerated_obligation_ids.includes(candidate.obligation_id))
    addDiagnostic(
      diagnostics,
      "verifier-does-not-enumerate",
      "The verifier claim does not enumerate this obligation ID.",
    );
  const resultEvidence = context.evidence.get(verifier.result_evidence_id);
  if (resultEvidence === undefined)
    addDiagnostic(
      diagnostics,
      "missing-verifier-result",
      "The latest verifier result Evidence is absent from the bundle.",
    );
  if (
    !proofAuthoritySatisfies(
      verifier.authority,
      candidate.required_verifier_authority,
    ) ||
    (resultEvidence !== undefined &&
      !evidenceAuthoritySupportsProof(resultEvidence, verifier.authority, {
        obligationId: candidate.obligation_id,
        verifierId: verifier.verifier_id,
        claimId: verifier.claim_id,
      }))
  )
    addDiagnostic(
      diagnostics,
      "weak-verifier-authority",
      `Verifier authority does not satisfy ${candidate.required_verifier_authority}.`,
    );
  if (verifier.status !== "pass")
    addDiagnostic(
      diagnostics,
      "verifier-failed",
      `Latest verifier status is ${verifier.status}.`,
    );
};

const evaluateAuthority = (
  candidate: ReconstructionObligationCandidate,
  binding: Binding | null,
  context: EvaluationContext,
  diagnostics: Diagnostic[],
): void => {
  const referenceSatisfied = candidate.authority_references.some(
    (reference) => {
      const evidence = context.evidence.get(reference.evidence_id);
      return (
        evidence !== undefined &&
        (candidate.required_original_authority === "static"
          ? ["candidate", "observed"].includes(reference.state)
          : reference.state === "observed") &&
        evidenceSupportsOriginalAuthority(
          evidence,
          candidate.required_original_authority,
        )
      );
    },
  );
  const caseSatisfied = originalCasesFor(candidate, binding).some(
    ({ evidence_id: evidenceId }) => {
      const evidence = context.evidence.get(evidenceId);
      return (
        evidence !== undefined &&
        evidenceSupportsOriginalAuthority(
          evidence,
          candidate.required_original_authority,
        )
      );
    },
  );
  const satisfied = referenceSatisfied || caseSatisfied;
  if (!satisfied)
    addDiagnostic(
      diagnostics,
      "static-only",
      `No ${candidate.required_original_authority} authority characterizes the original finite behavior.`,
    );
};

const evaluateDisposition = (
  candidate: ReconstructionObligationCandidate,
  diagnostics: Diagnostic[],
): void => {
  if (candidate.disposition === "blocked")
    addDiagnostic(
      diagnostics,
      "blocked",
      "Reviewed disposition marks this obligation blocked.",
    );
  if (candidate.disposition === "out-of-scope")
    addDiagnostic(
      diagnostics,
      "out-of-scope",
      "Reviewed disposition marks this obligation out of scope; it remains visible.",
    );
};

const applyDependencyDiagnostics = (
  obligations: readonly ReconstructionObligation[],
  context: EvaluationContext,
): ReconstructionObligation[] => {
  let evaluated = [...obligations];
  for (let pass = 0; pass < obligations.length; pass += 1) {
    const statuses = new Map(
      evaluated.map(({ obligation_id: id, status }) => [id, status]),
    );
    let changed = false;
    evaluated = evaluated.map((obligation) => {
      const diagnostics = [...obligation.diagnostics];
      for (const dependencyId of obligation.dependency_obligation_ids) {
        const missing = !context.candidates.has(dependencyId);
        if (missing || statuses.get(dependencyId) !== "verified")
          addDiagnostic(
            diagnostics,
            missing ? "dependency-missing" : "dependency-open",
            `Dependency obligation is ${missing ? "missing" : "not verified"}: ${dependencyId}.`,
          );
      }
      const normalized = uniqueDiagnostics(diagnostics);
      const status = dependencyStatus(obligation.status, normalized);
      changed ||= status !== obligation.status;
      return { ...obligation, status, diagnostics: normalized };
    });
    if (!changed) break;
  }
  return evaluated;
};

const obligationStatus = (
  candidate: ReconstructionObligationCandidate,
  binding: Binding | null,
  diagnostics: readonly Diagnostic[],
): ReconstructionObligation["status"] => {
  if (hasDiagnostic(diagnostics, "out-of-scope")) return "out-of-scope";
  if (hasDiagnostic(diagnostics, "blocked")) return "blocked";
  if (hasDiagnostic(diagnostics, "contradiction")) return "contradicted";
  if (
    hasDiagnostic(diagnostics, "duplicate-definition") ||
    hasDiagnostic(diagnostics, "residual-unknown") ||
    hasDiagnostic(diagnostics, "unavailable-authority")
  )
    return "unknown";
  if (binding === null) return "unowned";
  if (diagnostics.length === 0) return "verified";
  return "implemented";
};

const dependencyStatus = (
  status: ReconstructionObligation["status"],
  diagnostics: readonly Diagnostic[],
): ReconstructionObligation["status"] =>
  (hasDiagnostic(diagnostics, "dependency-missing") ||
    hasDiagnostic(diagnostics, "dependency-open")) &&
  !["contradicted", "out-of-scope"].includes(status)
    ? "blocked"
    : status;
