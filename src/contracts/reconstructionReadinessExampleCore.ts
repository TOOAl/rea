import { createEvidence } from "../domain/evidence.js";
import { reconstructionObligationLedgerClosureDigest } from "../domain/reconstructionObligationLedgerIntegrity.js";
import type { ReconstructionObligationLedger } from "../domain/reconstructionObligationLedgerSchemas.js";

const HASH = "a".repeat(64);
const sourceEvidence = (variant: string) =>
  createEvidence(
    undefined,
    {
      id: "rea-readiness-fixture",
      name: "REA readiness fixture",
      version: "1",
    },
    {
      predicateType: "rea.reconstruction-readiness-fixture",
      operation: "run_reconstruction_readiness_fixture",
      parameters: { variant },
      result: { passed: true, variant },
      confidence: "observed",
      authority: "controlled-replay",
    },
  );
const SOURCE = sourceEvidence("authority");
const CONTRADICTING_SOURCE = sourceEvidence("contradiction");
const EVIDENCE_ID = SOURCE.evidence_id;
const CASES = [
  "positive",
  "negative",
  "malformed",
  "cancellation",
  "teardown",
] as const;
const FIXTURES = [
  "native",
  "javascript-cli",
  "electron",
  "incomplete-reconstruction",
  "broken-runtime",
] as const;
const STATUSES = [
  "unowned",
  "characterized",
  "implemented",
  "verified",
  "contradicted",
  "blocked",
  "out-of-scope",
  "unknown",
] as const;
const LAYERS = [
  "cli",
  "protocol",
  "electron",
  "persistence",
  "process",
  "runtime",
  "packaging",
  "native-abi",
  "application",
  "other",
] as const;
const EVIDENCE_STATES = [
  "candidate",
  "observed",
  "reviewed",
  "unknown",
] as const;
const READINESS_OBLIGATION_LEDGER = (() => {
  const ledger: Omit<ReconstructionObligationLedger, "closure_digest"> = {
    schema: "ReconstructionObligationLedger",
    ledger_id: `rol_${HASH}`,
    status: "ready",
    coverage: {
      status: "complete",
    },
    summary: {
      total: 1,
      required: 1,
      verified: 1,
      required_open: 0,
      by_status: STATUSES.map((key) => ({
        key,
        count: key === "verified" ? 1 : 0,
      })),
      by_application_layer: LAYERS.map((key) => ({
        key,
        count: key === "process" ? 1 : 0,
      })),
      by_evidence_authority: EVIDENCE_STATES.map((key) => ({
        key,
        count: key === "observed" ? 1 : 0,
      })),
    },
    reports: {
      missing_owner_obligation_ids: [],
      missing_verifier_obligation_ids: [],
      contradicted_obligation_ids: [],
      residual_unknown_ids: [],
    },
    ownership_graph: [
      {
        obligation_id: "obl.readiness",
        module_path: "src/readiness.ts",
        symbol: "runReadiness",
      },
    ],
    dependency_graph: [],
    obligations: [
      {
        obligation_id: "obl.readiness",
        obligation_version: 1,
        title: "Preserve the packaged readiness fixture lifecycle",
        origin: "reviewed",
        application_layer: "process",
        family: "packaged-process-lifecycle",
        target: {
          artifact_sha256: HASH,
          application_node_id: null,
          semantic_node_id: null,
          location: "/fixture",
        },
        authority_references: [
          {
            evidence_id: EVIDENCE_ID,
            authority: "controlled-replay",
            state: "observed",
            location: "/fixture",
          },
        ],
        source_state: "observed",
        observed_cases: CASES.map((kind) => ({
          kind,
          evidence_id: EVIDENCE_ID,
          location: `/original/${kind}`,
        })),
        required: true,
        required_case_kinds: [...CASES],
        required_original_authority: "process",
        required_fixture_authority: "packaged-process",
        required_verifier_authority: "packaged-process",
        requires_parser_type: false,
        dependency_obligation_ids: [],
        residual_unknown_ids: [],
        unavailable_authority: [],
        required_next_evidence: [],
        binding: {
          obligation_id: "obl.readiness",
          owner: {
            module_path: "src/readiness.ts",
            symbol: "runReadiness",
            owner_sha256: HASH,
          },
          parser_type: null,
          original_cases: CASES.map((kind) => ({
            kind,
            evidence_id: EVIDENCE_ID,
            location: `/original/${kind}`,
          })),
          fixtures: CASES.map((kind) => ({
            fixture_id: `fixture.${kind}`,
            case_kind: kind,
            authority: "packaged-process",
            evidence_ids: [EVIDENCE_ID],
          })),
          verifier: {
            verifier_id: "verifier.readiness",
            claim_id: "claim.readiness",
            command: "npm run verify:readiness",
            authority: "packaged-process",
            status: "pass",
            result_evidence_id: EVIDENCE_ID,
            enumerated_obligation_ids: ["obl.readiness"],
            nondeterminism: {
              mode: "partial-order",
              specification: "Startup precedes teardown.",
            },
          },
        },
        status: "verified",
        diagnostics: [],
      },
    ],
    evidence_links: [EVIDENCE_ID],
    limitations: [],
  };
  return {
    ...ledger,
    closure_digest: reconstructionObligationLedgerClosureDigest(ledger),
  };
})();

/** Complete synthetic input shared by docs, tests, CLI, MCP, and verifier. */
