import { parseEvidence, type Evidence } from "../../domain/evidence.js";
import { projectInputIssues } from "../../domain/inputIssueProjection.js";
import { err, ok, type Result } from "../../domain/result.js";
import { z } from "zod";
import {
  javascriptApplicationAnalysisResultSchema,
  type JavaScriptApplicationAnalysisResult,
} from "../../domain/javascript/javascriptApplicationAnalysis.js";
import { managedApplicationGraphResultSchema } from "../../domain/managed/managedApplicationGraph.js";

/** Supported immutable source for an application-level graph workflow. */

const managedApplicationSource = (
  evidence: Evidence,
  path: readonly (string | number)[],
): ApplicationGraphEvidenceSource => {
  if (
    evidence.authority !== "analyst-inference" ||
    evidence.confidence !== "inferred"
  )
    throw invalidEvidence(
      path,
      "authority",
      "Managed application graph Evidence must use analyst-inference authority and inferred confidence.",
    );
  const result = parseCallerValue(
    (input) => managedApplicationGraphResultSchema.parse(input),
    evidence.normalized_result,
    [...path, "normalized_result"],
  );
  const unmatchedLink = result.evidence_links.find(
    (evidenceId) => !evidence.evidence_links.includes(evidenceId),
  );
  if (unmatchedLink !== undefined)
    throw invalidEvidence(
      [...path, "normalized_result"],
      "evidence_links",
      `Managed application graph result references Evidence ${unmatchedLink} outside its envelope.`,
    );
  return {
    evidence,
    graph: result.graph,
    kind: "managed-application",
    rootArtifactSha256: result.root_artifact_sha256,
    semanticGraph: null,
  };
};

const assertApplicationSubject = (
  evidence: Evidence,
  result: JavaScriptApplicationAnalysisResult,
  path: readonly (string | number)[],
): void => {
  if (
    evidence.subject === null ||
    evidence.subject.digest.sha256 !== result.root_artifact_sha256 ||
    evidence.subject.format !== result.format ||
    evidence.subject.local_path !== result.input_path
  )
    throw invalidEvidence(
      path,
      "subject",
      "JavaScript application Evidence subject must match the analyzed artifact identity and input path.",
    );
};

const providerMatches = (
  evidence: Evidence,
  provider: {
    readonly id: string;
    readonly name: string;
    readonly version: string;
  },
): boolean =>
  evidence.provider.id === provider.id &&
  evidence.provider.name === provider.name &&
  evidence.provider.version === provider.version;

const requirePredicate = (
  evidence: Evidence,
  expected: string,
  path: readonly (string | number)[],
): void => {
  if (evidence.predicate_type !== expected)
    throw invalidEvidence(
      path,
      "predicate_type",
      `Expected predicate ${expected} for operation ${evidence.operation}.`,
    );
};

const requireProvider = (
  evidence: Evidence,
  expected: {
    readonly id: string;
    readonly name: string;
    readonly version: string;
  },
  path: readonly (string | number)[],
): void => {
  if (!providerMatches(evidence, expected))
    throw invalidEvidence(
      path,
      "provider",
      `Expected provider ${expected.id} v${expected.version} for operation ${evidence.operation}.`,
    );
};

/** Parse unique, artifact-bound Evidence that may extend a native handoff. */
export const parseNativeApplicationEvidence = (
  inputs: readonly unknown[],
  path: readonly (string | number)[] = [],
): Result<readonly Evidence[], ApplicationGraphEvidenceInputFailure> =>
  captureInputValidation(() => {
    const parsed = inputs.map((input, index) =>
      parseEvidenceInput(input, [...path, index]),
    );
    const withoutSubject = parsed.findIndex(({ subject }) => subject === null);
    if (withoutSubject !== -1)
      throw invalidEvidence(
        [...path, withoutSubject],
        "subject",
        "Native handoff Evidence requires an artifact subject.",
      );
    const ids = parsed.map(({ evidence_id: id }) => id);
    if (new Set(ids).size !== ids.length)
      throw invalidEvidence(
        path,
        "evidence_id",
        "Native handoff Evidence must be unique.",
      );
    return parsed;
  });

const captureInputValidation = <Value>(
  operation: () => Value,
): Result<Value, ApplicationGraphEvidenceInputFailure> => {
  try {
    return ok(operation());
  } catch (cause: unknown) {
    if (cause instanceof InvalidApplicationGraphEvidence)
      return err({ issues: cause.issues });
    throw cause;
  }
};

const parseEvidenceInput = (
  input: unknown,
  path: readonly (string | number)[],
): Evidence => {
  try {
    return parseEvidence(input);
  } catch (cause: unknown) {
    if (cause instanceof z.ZodError) throw zodInputFailure(cause, input, path);
    throw cause;
  }
};

const parseCallerValue = <Value>(
  parse: (input: unknown) => Value,
  input: unknown,
  path: readonly (string | number)[],
): Value => {
  try {
    return parse(input);
  } catch (cause: unknown) {
    if (cause instanceof z.ZodError) throw zodInputFailure(cause, input, path);
    throw cause;
  }
};

const zodInputFailure = (
  cause: z.ZodError,
  input: unknown,
  path: readonly (string | number)[],
): InvalidApplicationGraphEvidence =>
  new InvalidApplicationGraphEvidence(
    projectInputIssues(cause.issues, input).map((issue) => ({
      ...issue,
      path: [...path, ...issue.path],
    })),
  );

const invalidEvidence = (
  path: readonly (string | number)[],
  field: string,
  message: string,
): InvalidApplicationGraphEvidence =>
  new InvalidApplicationGraphEvidence([
    { path: [...path, field], reason: "invalid_value", message },
  ]);
