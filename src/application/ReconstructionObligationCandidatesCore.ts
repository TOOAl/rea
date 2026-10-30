import type { Evidence } from "../domain/evidence.js";
import {
  parseEvidenceBundle,
  type EvidenceBundle,
} from "../domain/evidenceBundle.js";
import { parseProcessCapture } from "../domain/process/processCaptureParsing.js";
import type {
  ReconstructionObligation,
  ReviewedReconstructionObligation,
} from "../domain/reconstructionObligationLedgerSchemas.js";
import { parseApplicationGraphEvidence } from "./javascript/JavaScriptApplicationEvidenceGraph.js";
import {
  applicationObligationPolicy,
  semanticObligationPolicy,
} from "./ReconstructionObligationPolicies.js";
import { compareUnicodeCodePoints } from "../domain/unicodeCodePointOrder.js";

type CandidateFields = Omit<
  ReconstructionObligation,
  "binding" | "status" | "diagnostics"
>;

/** Internal generated or reviewed obligation before manifest closure evaluation. */
export interface ReconstructionObligationCandidate extends CandidateFields {
  readonly definitionCount: number;
  readonly disposition: "active" | "blocked" | "out-of-scope";
}

export interface ReconstructionObligationCandidateSet {
  readonly candidates: readonly ReconstructionObligationCandidate[];
  readonly limitations: readonly string[];
}

/** Derive conservative candidates from graph, process, and reviewed inputs. */
export const deriveReconstructionObligationCandidates = (
  bundleInput: EvidenceBundle,
  reviewed: readonly ReviewedReconstructionObligation[],
): ReconstructionObligationCandidateSet => {
  const bundle = parseEvidenceBundle(bundleInput);
  const records = new Map(
    bundle.records.map((record) => [record.evidence_id, record]),
  );
  const candidates = new Map<string, ReconstructionObligationCandidate>();
  const limitations = new Set<string>();
  for (const evidence of bundle.records) {
    deriveApplicationCandidates(evidence, records, candidates, limitations);
    deriveProcessCandidate(evidence, candidates, limitations);
  }
  for (const obligation of reviewed)
    addCandidate(candidates, reviewedCandidate(obligation, records));
  return {
    candidates: [...candidates.values()].sort((left, right) =>
      compareUnicodeCodePoints(left.obligation_id, right.obligation_id),
    ),
    limitations: [...limitations].sort(),
  };
};

const deriveApplicationCandidates = (
  evidence: Evidence,
  records: ReadonlyMap<string, Evidence>,
  candidates: Map<string, ReconstructionObligationCandidate>,
  limitations: Set<string>,
): void => {
  if (
    ![
      "analyze_javascript_application",
      "reconcile_javascript_runtime",
      "project_managed_application_graph",
    ].includes(evidence.operation)
  )
    return;
  try {
    const parsed = parseApplicationGraphEvidence(evidence);
    if (!parsed.ok) {
      limitations.add(
        `Application Evidence ${evidence.evidence_id} could not generate candidates because it failed graph validation.`,
      );
      return;
    }
    const source = parsed.value;
    for (const node of source.graph.nodes) {
      const candidatePolicy = applicationObligationPolicy(node.kind);
      if (candidatePolicy === undefined) {
        if (node.kind === "unknown")
          limitations.add(
            `Application graph ${source.graph.graph_id} contains unresolved node ${node.node_id}; reconstruction obligations remain unknown.`,
          );
        continue;
      }
      const reference = node.observations.map((observation) =>
        graphReference(
          evidence,
          records,
          observation.evidence,
          `${source.graph.graph_id}/node/${node.node_id}/observation/${observation.observation_id}`,
        ),
      );
      addCandidate(
        candidates,
        generatedCandidate({
          key: `application:${node.node_id}:${candidatePolicy.family}`,
          title: node.observations[0]?.label ?? `${node.kind} boundary`,
          policy: candidatePolicy,
          artifactSha256: source.rootArtifactSha256,
          applicationNodeId: node.node_id,
          semanticNodeId: null,
          location: `application-graph:${source.graph.graph_id}/nodes/${node.node_id}`,
          authorityReferences: reference,
        }),
      );
    }
    if (source.semanticGraph !== null) {
      const evidenceContexts = new Map(
        source.semanticGraph.evidence_contexts.map((context) => [
          context.context_id,
          context,
        ]),
      );
      for (const node of source.semanticGraph.nodes) {
        const candidatePolicy = semanticObligationPolicy(node.kind);
        if (candidatePolicy === undefined) continue;
        const evidenceContext = evidenceContexts.get(node.evidence.context_id);
        if (evidenceContext === undefined)
          throw new TypeError(
            "Semantic evidence reference names an absent context",
          );
        addCandidate(
          candidates,
          generatedCandidate({
            key: `semantic:${node.node_id}:${candidatePolicy.family}`,
            title: node.label ?? `${node.kind} semantic boundary`,
            policy: candidatePolicy,
            artifactSha256: node.identity.artifact_sha256,
            applicationNodeId: node.application_node_ids[0] ?? null,
            semanticNodeId: node.node_id,
            location: `semantic-graph:${source.semanticGraph.graph_id}/nodes/${node.node_id}`,
            authorityReferences: [
              graphReference(
                evidence,
                records,
                evidenceContext,
                `${source.semanticGraph.graph_id}/node/${node.node_id}`,
              ),
            ],
          }),
        );
      }
    }
    if (source.graph.coverage.status !== "complete")
      limitations.add(
        `Application graph ${source.graph.graph_id} coverage is ${source.graph.coverage.status}; omitted candidates remain unknown.`,
      );
  } catch (cause: unknown) {
    limitations.add(
      `Application Evidence ${evidence.evidence_id} could not generate candidates: ${errorMessage(cause)}`,
    );
  }
};

const deriveProcessCandidate = (
  evidence: Evidence,
  candidates: Map<string, ReconstructionObligationCandidate>,
  limitations: Set<string>,
): void => {
  if (
    evidence.operation !== "capture_process_scenario" ||
    evidence.predicate_type !== "rea.process-capture"
  )
    return;
  try {
    const capture = parseProcessCapture(evidence.normalized_result);
    const observedCases: ReconstructionObligation["observed_cases"] = [
      {
        kind: capture.exit.code === 0 ? "positive" : "negative",
        evidence_id: evidence.evidence_id,
        location: "/normalized_result/exit",
      },
      {
        kind: "teardown",
        evidence_id: evidence.evidence_id,
        location: "/normalized_result/settlement",
      },
      ...(capture.exit.signal !== null || capture.exit.reason !== "exited"
        ? [
            {
              kind: "cancellation" as const,
              evidence_id: evidence.evidence_id,
              location: "/normalized_result/exit",
            },
          ]
        : []),
    ];
    if (capture.manifest.executable_sha256 === null) {
      limitations.add(
        `Process capture ${evidence.evidence_id} has no validated executable artifact identity; packaged-process lifecycle obligation was not bound to an artifact.`,
      );
      return;
    }
    addCandidate(candidates, {
      obligation_id: obligationId(
        `process:${capture.manifest.executable_sha256}:${capture.manifest.full_scenario_sha256}`,
      ),
      obligation_version: 1,
      title: "Captured packaged-process lifecycle",
      origin: "generated",
      application_layer: "process",
      family: "packaged-process-lifecycle",
      target: {
        artifact_sha256: capture.manifest.executable_sha256,
        application_node_id: null,
        semantic_node_id: null,
        location: `/evidence/${evidence.evidence_id}/normalized_result`,
      },
      authority_references: [
        {
          evidence_id: evidence.evidence_id,
          authority: evidence.authority,
          state: "observed",
          location: "/normalized_result",
        },
      ],
      source_state: "observed",
      observed_cases: observedCases,
      required: true,
      required_case_kinds: ["positive", "negative", "cancellation", "teardown"],
      required_original_authority: "process",
      required_fixture_authority: "packaged-process",
      required_verifier_authority: "packaged-process",
      requires_parser_type: false,
      dependency_obligation_ids: [],
      residual_unknown_ids: [],
      unavailable_authority: capture.residual_unknowns.map(
        ({ scope, reason }) => `${scope}: ${reason}`,
      ),
      required_next_evidence: capture.truncated
        ? ["Repeat the packaged-process capture without truncation."]
        : [],
      definitionCount: 1,
      disposition: "active",
    });
    if (capture.truncated)
      limitations.add(
        `Process Evidence ${evidence.evidence_id} is truncated; absence and upper bounds remain unknown.`,
      );
  } catch (cause: unknown) {
    limitations.add(
      `Process Evidence ${evidence.evidence_id} could not generate candidates: ${errorMessage(cause)}`,
    );
  }
};
