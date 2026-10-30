import { createHash } from "node:crypto";

import canonicalize from "canonicalize";

import type { Evidence } from "../domain/evidence.js";
import type {
  ReconstructionObligation,
  ReviewedReconstructionObligation,
} from "../domain/reconstructionObligationLedgerSchemas.js";
import {
  semanticObligationPolicy,
  type ReconstructionObligationCandidatePolicy,
} from "./ReconstructionObligationPolicies.js";
import { compareUnicodeCodePoints } from "../domain/unicodeCodePointOrder.js";

interface GeneratedCandidateInput {
  readonly key: string;
  readonly title: string;
  readonly policy: ReconstructionObligationCandidatePolicy;
  readonly artifactSha256: string;
  readonly applicationNodeId: string | null;
  readonly semanticNodeId: string | null;
  readonly location: string;
  readonly authorityReferences: ReconstructionObligation["authority_references"];
}

const generatedCandidate = ({
  key,
  title,
  policy: candidatePolicy,
  artifactSha256,
  applicationNodeId,
  semanticNodeId,
  location,
  authorityReferences,
}: GeneratedCandidateInput): ReconstructionObligationCandidate => ({
  obligation_id: obligationId(key),
  obligation_version: 1,
  title,
  origin: "generated",
  application_layer: candidatePolicy.applicationLayer,
  family: candidatePolicy.family,
  target: {
    artifact_sha256: artifactSha256,
    application_node_id: applicationNodeId,
    semantic_node_id: semanticNodeId,
    location,
  },
  authority_references: authorityReferences,
  source_state: sourceState(authorityReferences),
  observed_cases: [],
  required: true,
  required_case_kinds: candidatePolicy.cases,
  required_original_authority: candidatePolicy.originalAuthority,
  required_fixture_authority: candidatePolicy.fixtureAuthority,
  required_verifier_authority: candidatePolicy.verifierAuthority,
  requires_parser_type: candidatePolicy.requiresParserType,
  dependency_obligation_ids: [],
  residual_unknown_ids: [],
  unavailable_authority: [],
  required_next_evidence: [
    `Obtain ${candidatePolicy.originalAuthority} authority for this finite ${candidatePolicy.family} claim.`,
  ],
  definitionCount: 1,
  disposition: "active",
});

const reviewedCandidate = (
  obligation: ReviewedReconstructionObligation,
  records: ReadonlyMap<string, Evidence>,
): ReconstructionObligationCandidate => {
  const {
    review_evidence_ids: reviewEvidenceIds,
    disposition,
    ...definition
  } = obligation;
  return {
    ...definition,
    origin: "reviewed",
    authority_references: reviewEvidenceIds.map((evidenceId) => {
      const evidence = records.get(evidenceId);
      if (evidence === undefined)
        throw new TypeError(
          `Reviewed obligation Evidence is missing: ${evidenceId}`,
        );
      return {
        evidence_id: evidenceId,
        authority: evidence.authority,
        state: reviewedEvidenceState(evidence),
        location: `/evidence/${evidenceId}`,
      };
    }),
    source_state: "reviewed",
    observed_cases: [],
    definitionCount: 1,
    disposition,
  };
};

const graphReference = (
  envelope: Evidence,
  records: ReadonlyMap<string, Evidence>,
  graphEvidence: {
    readonly authority: string;
    readonly state: string;
    readonly evidence_ids: readonly string[];
  },
  location: string,
): ReconstructionObligation["authority_references"][number] => {
  const linkedId =
    graphEvidence.evidence_ids.find((evidenceId) => records.has(evidenceId)) ??
    envelope.evidence_id;
  const linked = records.get(linkedId) ?? envelope;
  const runtimeAuthority = [
    "passive-cdp-runtime",
    "controlled-replay",
  ].includes(graphEvidence.authority);
  return {
    evidence_id: linked.evidence_id,
    authority: linked.authority,
    state:
      runtimeAuthority && graphEvidence.state === "observed"
        ? "observed"
        : graphEvidence.state === "unknown" ||
            graphEvidence.state === "unavailable"
          ? "unknown"
          : "candidate",
    location,
  };
};

const reviewedEvidenceState = (
  evidence: Evidence,
): ReconstructionObligation["authority_references"][number]["state"] => {
  if (
    evidence.operation === "capture_process_scenario" &&
    evidence.predicate_type === "rea.process-capture" &&
    evidence.confidence === "observed"
  )
    return "observed";
  if (
    evidence.authority === "external-service" &&
    evidence.confidence === "observed"
  )
    return "observed";
  if (evidence.authority === "shipped-artifact") return "candidate";
  return "reviewed";
};

const addCandidate = (
  candidates: Map<string, ReconstructionObligationCandidate>,
  candidate: ReconstructionObligationCandidate,
): void => {
  const current = candidates.get(candidate.obligation_id);
  if (current === undefined) {
    candidates.set(candidate.obligation_id, candidate);
    return;
  }
  candidates.set(candidate.obligation_id, {
    ...current,
    authority_references: uniqueBy(
      [...current.authority_references, ...candidate.authority_references],
      (reference) =>
        `${reference.evidence_id}:${reference.state}:${reference.location}`,
    ),
    observed_cases: uniqueBy(
      [...current.observed_cases, ...candidate.observed_cases],
      (item) => `${item.kind}:${item.evidence_id}:${item.location}`,
    ),
    source_state: sourceState([
      ...current.authority_references,
      ...candidate.authority_references,
    ]),
    // Each observation keeps its own unresolved authority and next steps.
    unavailable_authority: uniqueBy(
      [...current.unavailable_authority, ...candidate.unavailable_authority],
      (item) => item,
    ),
    required_next_evidence: uniqueBy(
      [...current.required_next_evidence, ...candidate.required_next_evidence],
      (item) => item,
    ),
    // A generated ID digests its derivation key, so two generated candidates
    // with one ID are the same claim seen by several records. Only another
    // reviewed definition can introduce a competing definition.
    definitionCount:
      current.origin === "generated" && candidate.origin === "generated"
        ? current.definitionCount
        : current.definitionCount + candidate.definitionCount,
  });
};

const sourceState = (
  references: ReconstructionObligation["authority_references"],
): ReconstructionObligation["source_state"] => {
  if (references.some(({ state }) => state === "observed")) return "observed";
  if (references.some(({ state }) => state === "candidate")) return "candidate";
  if (references.some(({ state }) => state === "reviewed")) return "reviewed";
  return "unknown";
};

const uniqueBy = <Value>(
  values: readonly Value[],
  key: (value: Value) => string,
): Value[] =>
  [...new Map(values.map((value) => [key(value), value])).values()].sort(
    (left, right) => compareUnicodeCodePoints(key(left), key(right)),
  );

const obligationId = (key: string): string =>
  `obl_${digest({ schema: "ReconstructionObligation", key })}`;

const digest = (value: unknown): string => {
  const encoded = canonicalize(value);
  if (encoded === undefined)
    throw new TypeError("Reconstruction obligation key is not canonical JSON");
  return createHash("sha256").update(encoded).digest("hex");
};

const errorMessage = (cause: unknown): string =>
  cause instanceof Error ? cause.message : "unknown validation failure";
