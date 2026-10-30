import type { Evidence } from "../domain/evidence.js";
import {
  parseEvidenceBundle,
  type EvidenceBundle,
} from "../domain/evidenceBundle.js";
import {
  reconstructionObligationLedgerSchema,
  type ReconstructionObligation,
  type ReconstructionObligationLedger,
  type ReconstructionObligationManifest,
} from "../domain/reconstructionObligationLedgerSchemas.js";
import { digestCanonicalValue } from "../domain/canonicalDigest.js";
import {
  reconstructionObligationCoverage,
  reconstructionObligationDependencyGraph,
  reconstructionObligationLedgerClosureDigest,
  reconstructionObligationLedgerStatus,
  reconstructionObligationOwnershipGraph,
  reconstructionObligationReports,
  summarizeReconstructionObligations,
} from "../domain/reconstructionObligationLedgerIntegrity.js";
import type { ReconstructionObligationCandidate } from "./ReconstructionObligationCandidates.js";
import {
  addObligationDiagnostic as addDiagnostic,
  contradictionDiagnostics,
  groupManifestBindings,
  groupManifestContradictions,
  uniqueObligationDiagnostics as uniqueDiagnostics,
} from "./ReconstructionObligationLedgerDiagnostics.js";
import {
  originalCaseDiagnostics,
  originalCasesFor,
} from "./ReconstructionObligationOriginalCases.js";
import { obligationLedgerEvidenceLinks } from "./ReconstructionObligationLedgerProjection.js";
import { compareUnicodeCodePoints } from "../domain/unicodeCodePointOrder.js";

type Diagnostic = ReconstructionObligation["diagnostics"][number];
type Binding = NonNullable<ReconstructionObligation["binding"]>;

interface EvaluationContext {
  readonly candidates: ReadonlyMap<string, ReconstructionObligationCandidate>;
  readonly evidence: ReadonlyMap<string, Evidence>;
  readonly bindings: ReadonlyMap<string, readonly Binding[]>;
  readonly contradictions: ReadonlyMap<string, readonly string[]>;
}

export const evaluateReconstructionObligationLedger = ({
  candidates: candidatesInput,
  bundle: bundleInput,
  manifest,
  generationLimitations,
}: {
  readonly candidates: readonly ReconstructionObligationCandidate[];
  readonly bundle: EvidenceBundle;
  readonly manifest: ReconstructionObligationManifest;
  readonly generationLimitations: readonly string[];
}): ReconstructionObligationLedger => {
  const bundle = parseEvidenceBundle(bundleInput);
  const allCandidates = [...candidatesInput].sort((left, right) =>
    compareUnicodeCodePoints(left.obligation_id, right.obligation_id),
  );
  const orphanManifestIds = findOrphanManifestIds(allCandidates, manifest);
  const candidates = allCandidates;
  const context = createEvaluationContext(candidates, bundle, manifest);
  const obligations = applyDependencyDiagnostics(
    candidates.map((candidate) => evaluateObligation(candidate, context)),
    context,
  );
  const ownershipGraph = reconstructionObligationOwnershipGraph(obligations);
  const dependencyGraph = reconstructionObligationDependencyGraph(obligations);
  const evidenceLinks = obligationLedgerEvidenceLinks(obligations, manifest);
  const limitations = ledgerLimitations(
    generationLimitations,
    allCandidates.length,
    orphanManifestIds,
  );
  const coverage = reconstructionObligationCoverage(limitations);
  const semantic = {
    coverage,
    summary: summarizeReconstructionObligations(obligations),
    reports: reconstructionObligationReports(obligations),
    ownership_graph: ownershipGraph,
    dependency_graph: dependencyGraph,
    obligations,
    evidence_links: evidenceLinks,
    limitations,
  };
  const status = reconstructionObligationLedgerStatus(obligations, limitations);
  const closureDigest = reconstructionObligationLedgerClosureDigest({
    status,
    ...semantic,
  });
  return reconstructionObligationLedgerSchema.parse({
    schema: "ReconstructionObligationLedger",
    ledger_id: `rol_${digestCanonicalValue(
      {
        schema: "ReconstructionObligationLedger",
        evidence_ids: bundle.records.map(({ evidence_id: id }) => id),
        obligation_ids: obligations.map(({ obligation_id: id }) => id),
        closure_digest: closureDigest,
      },
      "Reconstruction obligation ledger",
    )}`,
    closure_digest: closureDigest,
    status,
    ...semantic,
  });
};

const createEvaluationContext = (
  candidates: readonly ReconstructionObligationCandidate[],
  bundle: EvidenceBundle,
  manifest: ReconstructionObligationManifest,
): EvaluationContext => ({
  candidates: new Map(
    candidates.map((candidate) => [candidate.obligation_id, candidate]),
  ),
  evidence: new Map(
    bundle.records.map((evidence) => [evidence.evidence_id, evidence]),
  ),
  bindings: groupManifestBindings(manifest),
  contradictions: groupManifestContradictions(manifest),
});

const findOrphanManifestIds = (
  candidates: readonly ReconstructionObligationCandidate[],
  manifest: ReconstructionObligationManifest,
): string[] => {
  const candidateIds = new Set(
    candidates.map(({ obligation_id: obligationId }) => obligationId),
  );
  return [
    ...new Set(
      [
        ...manifest.bindings.map(
          ({ obligation_id: obligationId }) => obligationId,
        ),
        ...manifest.contradictions.map(
          ({ obligation_id: obligationId }) => obligationId,
        ),
      ].filter((obligationId) => !candidateIds.has(obligationId)),
    ),
  ].sort();
};

const ledgerLimitations = (
  generationLimitations: readonly string[],
  candidateCount: number,
  orphanManifestIds: readonly string[],
): string[] =>
  [
    ...new Set([
      ...generationLimitations,
      ...(candidateCount === 0
        ? [
            "No reconstruction obligations were derived; closure cannot be claimed.",
          ]
        : []),
      ...(orphanManifestIds.length > 0
        ? [
            `Manifest entries reference unknown obligations: ${orphanManifestIds.join(", ")}.`,
          ]
        : []),
    ]),
  ].sort();

const evaluateObligation = (
  candidate: ReconstructionObligationCandidate,
  context: EvaluationContext,
): ReconstructionObligation => {
  const bindings = context.bindings.get(candidate.obligation_id) ?? [];
  const binding = bindings.length === 1 ? (bindings[0] ?? null) : null;
  const diagnostics: Diagnostic[] = [];
  if (candidate.definitionCount > 1)
    addDiagnostic(
      diagnostics,
      "duplicate-definition",
      "Multiple candidate definitions share this obligation ID.",
    );
  if (bindings.length === 0)
    addDiagnostic(
      diagnostics,
      "missing-owner",
      "No reconstruction manifest binding owns this obligation.",
    );
  if (bindings.length > 1)
    addDiagnostic(
      diagnostics,
      "ambiguous-owner",
      "Multiple reconstruction manifest bindings claim this obligation.",
    );
  if (binding !== null)
    evaluateBinding(candidate, binding, context, diagnostics);
  diagnostics.push(
    ...originalCaseDiagnostics(candidate, binding, context.evidence),
  );
  evaluateAuthority(candidate, binding, context, diagnostics);
  evaluateDisposition(candidate, diagnostics);
  diagnostics.push(
    ...contradictionDiagnostics(
      candidate.obligation_id,
      context.contradictions,
      context.evidence,
    ),
  );
  for (const unknownId of candidate.residual_unknown_ids)
    addDiagnostic(
      diagnostics,
      "residual-unknown",
      `Residual unknown remains visible: ${unknownId}.`,
    );
  for (const unavailable of candidate.unavailable_authority)
    addDiagnostic(diagnostics, "unavailable-authority", unavailable);
  return {
    obligation_id: candidate.obligation_id,
    obligation_version: candidate.obligation_version,
    title: candidate.title,
    origin: candidate.origin,
    application_layer: candidate.application_layer,
    family: candidate.family,
    target: candidate.target,
    authority_references: candidate.authority_references,
    source_state: candidate.source_state,
    observed_cases: originalCasesFor(candidate, binding),
    required: candidate.required,
    required_case_kinds: candidate.required_case_kinds,
    required_original_authority: candidate.required_original_authority,
    required_fixture_authority: candidate.required_fixture_authority,
    required_verifier_authority: candidate.required_verifier_authority,
    requires_parser_type: candidate.requires_parser_type,
    dependency_obligation_ids: candidate.dependency_obligation_ids,
    residual_unknown_ids: candidate.residual_unknown_ids,
    unavailable_authority: candidate.unavailable_authority,
    required_next_evidence: candidate.required_next_evidence,
    binding,
    status: obligationStatus(candidate, binding, diagnostics),
    diagnostics: uniqueDiagnostics(diagnostics),
  };
};
