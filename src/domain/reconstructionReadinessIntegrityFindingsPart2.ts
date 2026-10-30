import {
  addMissingEvidenceFindings,
  readinessFinding as finding,
} from "./reconstructionReadinessFindingHelpers.js";
import type {
  ReadinessFinding,
  ReconstructionReadinessInput,
} from "./reconstructionReadinessSchemas.js";

const evaluateClosureHistory = (
  input: ReconstructionReadinessInput,
  findings: ReadinessFinding[],
  evidenceIds: ReadonlySet<string>,
): void => {
  const history = [...input.closure_history].sort(
    (left, right) => left.sequence - right.sequence,
  );
  if (
    new Set(history.map(({ sequence }) => sequence)).size !== history.length ||
    history.at(-1)?.ledger_digest !== input.obligation_ledger.closure_digest
  )
    findings.push(
      finding(
        "closure-history-identity-mismatch",
        "verify-reconstruction-closure",
        "fail",
        "Closure history sequences must be unique and end at the supplied ledger digest.",
      ),
    );
  if (
    history[0]?.required_open === 0 ||
    history.at(-1)?.required_open !== 0 ||
    history.at(-1)?.status !== "ready"
  )
    findings.push(
      finding(
        "incremental-closure-history-missing",
        "verify-reconstruction-closure",
        "unknown",
        "Closure history must begin partial and end ready with zero required obligations open.",
      ),
    );
  for (const [index, observation] of history.entries()) {
    const previous = history[index - 1];
    if (
      previous !== undefined &&
      (observation.required_open > previous.required_open ||
        observation.newly_verified_obligation_ids.length !==
          previous.required_open - observation.required_open)
    )
      findings.push(
        finding(
          "invalid-obligation-closure-transition",
          "verify-reconstruction-closure",
          "fail",
          `Closure observation ${String(observation.sequence)} does not match its newly verified obligations.`,
          observation.evidence_ids,
        ),
      );
    if (
      observation.newly_verified_obligation_ids.some(
        (obligationId) =>
          !input.obligation_ledger.obligations.some(
            ({ obligation_id: candidateId, status }) =>
              candidateId === obligationId && status === "verified",
          ),
      )
    )
      findings.push(
        finding(
          "closure-obligation-proof-missing",
          "verify-reconstruction-closure",
          "fail",
          `Closure observation ${String(observation.sequence)} names an obligation without verified ledger proof.`,
          observation.evidence_ids,
        ),
      );
    addMissingEvidenceFindings(
      findings,
      "verify-reconstruction-closure",
      observation.evidence_ids,
      evidenceIds,
    );
  }
};

const cleanupFindings = (
  input: ReconstructionReadinessInput,
  evidenceIds: ReadonlySet<string>,
): ReadinessFinding[] => {
  const findings: ReadinessFinding[] = [];
  for (const cleanup of input.cleanup) {
    if (cleanup.owned_resources_remaining > 0)
      findings.push(
        finding(
          "owned-resource-leak",
          "reactive-scenarios",
          "fail",
          `${cleanup.run_id} retained ${String(cleanup.owned_resources_remaining)} owned resources.`,
          cleanup.diagnostic_evidence_ids,
        ),
      );
    if (cleanup.cancelled && cleanup.diagnostic_evidence_ids.length === 0)
      findings.push(
        finding(
          "cancelled-diagnostic-evidence-missing",
          "reactive-scenarios",
          "unknown",
          `${cleanup.run_id} cancellation retained no diagnostic Evidence.`,
        ),
      );
    addMissingEvidenceFindings(
      findings,
      "reactive-scenarios",
      cleanup.diagnostic_evidence_ids,
      evidenceIds,
    );
  }
  for (const grant of input.grants) {
    if (
      ["denied", "cancelled"].includes(grant.decision) &&
      grant.launched_process
    )
      findings.push(
        finding(
          "denied-authority-launched-process",
          "acquire-authority",
          "fail",
          `${grant.grant_id} launched a process after ${grant.decision}.`,
          grant.evidence_ids,
        ),
      );
    addMissingEvidenceFindings(
      findings,
      "acquire-authority",
      grant.evidence_ids,
      evidenceIds,
    );
  }
  return findings;
};

const replayFindings = (
  input: ReconstructionReadinessInput,
  evidenceIds: ReadonlySet<string>,
  sourceDigest: string,
): ReadinessFinding[] => {
  const findings: ReadinessFinding[] = [];
  if (!input.replay.deterministic)
    findings.push(
      finding(
        "replay-nondeterministic",
        "export-replay",
        "fail",
        "Clean replay did not reproduce the same semantic report.",
        input.replay.evidence_ids,
      ),
    );
  if (!input.replay.tamper_detected)
    findings.push(
      finding(
        "tamper-not-detected",
        "export-replay",
        "fail",
        "The conformance replay did not reject a tampered input.",
        input.replay.evidence_ids,
      ),
    );
  if (!input.replay.stale_input_detected)
    findings.push(
      finding(
        "stale-input-not-detected",
        "export-replay",
        "fail",
        "The conformance replay did not reject a stale digest.",
        input.replay.evidence_ids,
      ),
    );
  if (
    input.replay.expected_source_digest !== null &&
    input.replay.expected_source_digest !== sourceDigest
  )
    findings.push(
      finding(
        "replay-source-digest-mismatch",
        "export-replay",
        "fail",
        `Expected ${input.replay.expected_source_digest}; observed ${sourceDigest}.`,
        input.replay.evidence_ids,
      ),
    );
  addMissingEvidenceFindings(
    findings,
    "export-replay",
    input.replay.evidence_ids,
    evidenceIds,
  );
  return findings;
};
