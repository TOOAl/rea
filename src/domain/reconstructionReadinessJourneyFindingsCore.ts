import {
  addMissingEvidenceFindings,
  readinessFinding as finding,
} from "./reconstructionReadinessFindingHelpers.js";
import {
  readinessStageIdSchema,
  type ReadinessFinding,
  type ReadinessStageId,
  type ReconstructionReadinessInput,
} from "./reconstructionReadinessSchemas.js";

export const READINESS_REQUIRED_CHECKS: Readonly<
  Record<ReadinessStageId, readonly string[]>
> = {
  "discover-classify": [
    "target-free-start",
    "artifact-inventory",
    "compatible-workflow-selected",
    "limits-visible",
  ],
  "diagnose-environment": [
    "broken-runtime-distinguished",
    "version-skew-detected",
    "revision-changed-after-recovery",
  ],
  "acquire-authority": [
    "missing-scope-reported",
    "narrow-grant-resumed",
    "expansion-reprompted",
    "denial-launched-nothing",
  ],
  "static-analysis": [
    "native-routed",
    "javascript-routed",
    "unknowns-preserved",
  ],
  "reactive-scenarios": [
    "predicate-driven",
    "descendant-settled",
    "electron-correlated",
    "cancel-cleanup-preserved-evidence",
  ],
  "compare-authority-candidate": [
    "partial-order-accepted",
    "divergence-localized",
    "incomplete-is-unknown",
  ],
  "preserve-contradictions": [
    "record-and-continue",
    "affected-equivalence-blocked",
    "unaffected-comparison-continued",
  ],
  "verify-reconstruction-closure": [
    "incomplete-detected",
    "incremental-verifier-closure",
    "delegation-rejected",
  ],
  "export-replay": [
    "cli-mcp-parity",
    "failure-status-parity",
    "deterministic-replay",
    "tamper-detected",
    "stale-input-detected",
  ],
};

export const READINESS_STAGE_IDS = readinessStageIdSchema.options;

export const readinessJourneyFindings = (
  input: ReconstructionReadinessInput,
  evidenceIds: ReadonlySet<string>,
): ReadinessFinding[] => [
  ...identityFindings(input),
  ...fixtureFindings(input),
  ...stageFindings(input, evidenceIds),
  ...capabilityFindings(input),
  ...workflowFindings(input),
  ...authorityFindings(input),
  ...outcomeFindings(input, evidenceIds),
];

const identityFindings = (
  input: ReconstructionReadinessInput,
): ReadinessFinding[] => {
  const findings: ReadinessFinding[] = [];
  if (!input.identity.versions.some(({ state }) => state === "stale"))
    findings.push(
      finding(
        "version-skew-observation-missing",
        "diagnose-environment",
        "fail",
        "The journey did not preserve a stale version observation.",
      ),
    );
  if (!input.identity.versions.some(({ state }) => state === "current"))
    findings.push(
      finding(
        "corrected-version-observation-missing",
        "diagnose-environment",
        "fail",
        "The journey did not preserve corrected current version state.",
      ),
    );
  if (!input.identity.providers.some(({ state }) => state === "broken-host"))
    findings.push(
      finding(
        "broken-host-observation-missing",
        "diagnose-environment",
        "fail",
        "The journey did not distinguish a broken host dependency.",
      ),
    );
  return findings;
};

const fixtureFindings = (
  input: ReconstructionReadinessInput,
): ReadinessFinding[] => {
  const requiredKinds = [
    "native",
    "javascript-cli",
    "electron",
    "incomplete-reconstruction",
    "broken-runtime",
  ] as const;
  return requiredKinds.flatMap((kind) =>
    input.fixtures.some(({ kind: fixtureKind }) => fixtureKind === kind)
      ? []
      : [
          finding(
            "representative-fixture-missing",
            "discover-classify",
            "fail",
            `The required ${kind} fixture is missing.`,
          ),
        ],
  );
};

const stageFindings = (
  input: ReconstructionReadinessInput,
  evidenceIds: ReadonlySet<string>,
): ReadinessFinding[] => {
  const findings: ReadinessFinding[] = [];
  for (const stageId of READINESS_STAGE_IDS) {
    const matching = input.stages.filter(({ stage_id: id }) => id === stageId);
    if (matching.length !== 1) {
      findings.push(
        finding(
          "stage-cardinality",
          stageId,
          "fail",
          `Expected exactly one ${stageId} stage; observed ${String(matching.length)}.`,
        ),
      );
      continue;
    }
    const stage = matching[0];
    if (stage === undefined) continue;
    if (!stage.required)
      findings.push(
        finding(
          "required-stage-disabled",
          stageId,
          "fail",
          "The public conformance journey requires this stage.",
        ),
      );
    const checks = new Map(
      stage.checks.map((check) => [check.check_id, check]),
    );
    if (checks.size !== stage.checks.length)
      findings.push(
        finding(
          "duplicate-stage-check",
          stageId,
          "fail",
          "Stage check IDs must be unique.",
        ),
      );
    addMissingEvidenceFindings(
      findings,
      stageId,
      [
        ...stage.evidence_ids,
        ...stage.checks.flatMap((check) => check.evidence_ids),
      ],
      evidenceIds,
    );
    for (const checkId of READINESS_REQUIRED_CHECKS[stageId]) {
      const check = checks.get(checkId);
      if (check === undefined) {
        findings.push(
          finding(
            "missing-stage-check",
            stageId,
            "fail",
            `Required conformance check is missing: ${checkId}.`,
          ),
        );
        continue;
      }
      if (check.status !== "pass")
        findings.push(
          finding(
            "stage-check-not-pass",
            stageId,
            check.status === "fail" ? "fail" : "unknown",
            `${checkId} is ${check.status}: ${check.detail}`,
            check.evidence_ids,
          ),
        );
      if (check.evidence_ids.length === 0)
        findings.push(
          finding(
            "stage-check-evidence-missing",
            stageId,
            "unknown",
            `${checkId} has no attributable Evidence.`,
          ),
        );
    }
  }
  return findings;
};
