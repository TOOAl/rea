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

const capabilityFindings = (
  input: ReconstructionReadinessInput,
): ReadinessFinding[] =>
  input.capabilities.flatMap((capability) => {
    const findings: ReadinessFinding[] = [];
    if (capability.bounded && capability.limits.length === 0)
      findings.push(
        finding(
          "bounded-limit-hidden",
          "discover-classify",
          "fail",
          `${capability.capability_id} is bounded but declares no exact limits.`,
        ),
      );
    if (!capability.available && capability.unavailable_reason === null)
      findings.push(
        finding(
          "unavailable-reason-missing",
          "discover-classify",
          "unknown",
          `${capability.capability_id} is unavailable without an actionable reason.`,
        ),
      );
    return findings;
  });

const workflowFindings = (
  input: ReconstructionReadinessInput,
): ReadinessFinding[] => {
  const findings: ReadinessFinding[] = [];
  for (const fixture of input.fixtures) {
    const selected = input.workflow_candidates.filter(
      ({ fixture_id: fixtureId, selected: isSelected }) =>
        fixtureId === fixture.fixture_id && isSelected,
    );
    if (selected.length !== 1 || selected[0]?.compatibility !== "compatible")
      findings.push(
        finding(
          "compatible-workflow-not-selected",
          "discover-classify",
          "fail",
          `${fixture.fixture_id} does not have exactly one compatible selected workflow.`,
        ),
      );
  }
  for (const candidate of input.workflow_candidates)
    if (candidate.invoked && candidate.compatibility !== "compatible")
      findings.push(
        finding(
          "incompatible-provider-invoked",
          "static-analysis",
          "fail",
          `${candidate.workflow_id} was invoked despite ${candidate.compatibility} routing.`,
        ),
      );
  return findings;
};

const authorityFindings = (
  input: ReconstructionReadinessInput,
): ReadinessFinding[] => {
  const deniedScopes = new Set(
    input.grants
      .filter(({ decision }) => ["denied", "cancelled"].includes(decision))
      .map(({ scope }) => scope),
  );
  const recoveredScopes = new Set(
    input.grants
      .filter(({ decision }) => decision === "granted")
      .map(({ scope }) => scope),
  );
  return [...deniedScopes].some((scope) => recoveredScopes.has(scope))
    ? []
    : [
        finding(
          "narrow-authority-recovery-missing",
          "acquire-authority",
          "fail",
          "No denied or cancelled scope was later recovered by a narrow grant.",
        ),
      ];
};

const outcomeFindings = (
  input: ReconstructionReadinessInput,
  evidenceIds: ReadonlySet<string>,
): ReadinessFinding[] => {
  const findings: ReadinessFinding[] = [];
  const parity = new Map<string, Set<"cli" | "mcp">>();
  for (const outcome of input.operation_outcomes) {
    const expectedCliExit = outcome.expected_success ? 0 : 1;
    if (
      outcome.surface === "cli" &&
      (outcome.cli_exit_code === null ||
        (expectedCliExit === 0
          ? outcome.cli_exit_code !== 0
          : outcome.cli_exit_code === 0))
    )
      findings.push(
        finding(
          "cli-status-mismatch",
          "export-replay",
          "fail",
          `${outcome.operation} CLI process status contradicts its structured outcome.`,
          outcome.evidence_ids,
        ),
      );
    if (
      outcome.surface === "mcp" &&
      outcome.mcp_status !==
        (outcome.expected_success ? "success" : "non-success")
    )
      findings.push(
        finding(
          "mcp-status-mismatch",
          "export-replay",
          "fail",
          `${outcome.operation} MCP status contradicts its structured outcome.`,
          outcome.evidence_ids,
        ),
      );
    const key = `${outcome.operation}:${outcome.call_kind}:${String(outcome.expected_success)}`;
    parity.set(key, new Set([...(parity.get(key) ?? []), outcome.surface]));
    addMissingEvidenceFindings(
      findings,
      "export-replay",
      outcome.evidence_ids,
      evidenceIds,
    );
  }
  for (const [key, surfaces] of parity)
    if (surfaces.size !== 2)
      findings.push(
        finding(
          "surface-parity-missing",
          "export-replay",
          "fail",
          `CLI/MCP outcome pair is incomplete: ${key}.`,
        ),
      );
  for (const [key, outcomes] of groupedOutcomes(input)) {
    const cli = outcomes.find(({ surface }) => surface === "cli");
    const mcp = outcomes.find(({ surface }) => surface === "mcp");
    if (
      cli !== undefined &&
      mcp !== undefined &&
      (cli.expected_success !== mcp.expected_success ||
        cli.error_code !== mcp.error_code)
    )
      findings.push(
        finding(
          "surface-semantic-drift",
          "export-replay",
          "fail",
          `CLI/MCP structured outcomes disagree: ${key}.`,
          [...cli.evidence_ids, ...mcp.evidence_ids],
        ),
      );
  }
  return findings;
};

const groupedOutcomes = (
  input: ReconstructionReadinessInput,
): ReadonlyMap<
  string,
  readonly ReconstructionReadinessInput["operation_outcomes"][number][]
> => {
  const grouped = new Map<
    string,
    ReconstructionReadinessInput["operation_outcomes"]
  >();
  for (const outcome of input.operation_outcomes) {
    const key = `${outcome.operation}:${outcome.call_kind}`;
    grouped.set(key, [...(grouped.get(key) ?? []), outcome]);
  }
  return grouped;
};
