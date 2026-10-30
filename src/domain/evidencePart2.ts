import { basename } from "node:path";

import { digestCanonicalValue } from "./canonicalDigest.js";
import { canonicalJsonDigestSteps } from "./canonicalJsonDigestSteps.js";

import type { AnalysisProfileCommitment } from "./analysisProfile.js";
import type { BinaryArchitecture, BinaryTarget } from "./binaryTargetTypes.js";
import {
  jsonValueSchema,
  jsonValueValidationSteps,
  type JsonValue,
} from "./jsonValue.js";
import {
  freezeJsonSnapshot,
  isImmutableJsonSnapshot,
} from "./immutableJson.js";
import type { RelationshipCoverage } from "./relationshipCoverage.js";

/** Provider identity schema shared by evidence-bearing persistence formats. */

export interface EvidenceObservation {
  readonly predicateType?: string;
  readonly operation: string;
  readonly parameters: Readonly<Record<string, JsonValue>>;
  readonly result: JsonValue;
  readonly analysisProfile?: AnalysisProfileCommitment;
  readonly rawResult?: JsonValue;
  readonly confidence?: "observed" | "derived" | "inferred";
  readonly authority?: EvidenceAuthority;
  readonly environment?: ExecutionEnvironment | null;
  readonly limitations?: readonly string[];
  readonly relationshipCoverage?: RelationshipCoverage;
  /** Reason the subject identity is unavailable, when no target identity is supplied. */
  readonly subjectUnavailableReason?: string;
  readonly locations?: readonly EvidenceLocation[];
  readonly evidenceLinks?: readonly string[];
}

type EvidenceWithoutId = Omit<EvidenceSchemaValue, "evidence_id">;

const semanticProjection = (evidence: EvidenceWithoutId): JsonValue => ({
  subject:
    evidence.subject === null
      ? null
      : {
          digest: evidence.subject.digest,
          format: evidence.subject.format,
          architecture: evidence.subject.architecture,
        },
  provider: evidence.provider,
  analysis_profile: evidence.analysis_profile,
  predicate_type: evidence.predicate_type,
  operation: evidence.operation,
  parameters: evidence.parameters,
  raw_result: evidence.raw_result,
  normalized_result: evidence.normalized_result,
  confidence: evidence.confidence,
  authority: evidence.authority,
  environment: evidence.environment,
  limitations: evidence.limitations,
  relationship_coverage: evidence.relationship_coverage,
  locations: evidence.locations,
  evidence_links: evidence.evidence_links,
});

/** Hash semantic content, including raw results and excluding display-subject fields. */
const computeEvidenceId = (evidence: EvidenceWithoutId): string =>
  `ev_${digestCanonicalValue(semanticProjection(evidence), "Evidence")}`;

/** Parse evidence and reject a syntactically valid but tampered semantic ID. */
export const parseEvidence = (input: unknown): Evidence => {
  const immutable =
    typeof input === "object" && input !== null
      ? immutableEvidenceSnapshots.get(input)
      : undefined;
  if (immutable !== undefined) return immutable;
  return authenticatedEvidenceSchema.parse(input);
};

/** Authenticate and seal a ledger-owned snapshot; external mutable values are copied first. */
export const immutableEvidence = (input: unknown): Evidence =>
  rememberImmutableEvidence(parseEvidence(input));

/** Rebind display path metadata when an authenticated record names this target. */
export const rebindEvidenceToTargetPath = (
  evidence: Evidence,
  target: EvidenceSubjectTarget,
): Evidence => {
  const subject = evidence.subject;
  if (subject === null) return evidence;
  const rebound = rebindEvidenceSubjectTargetPath(
    {
      path: subject.local_path,
      sha256: subject.digest.sha256,
      format: subject.format,
      ...(subject.architecture === null
        ? {}
        : { architecture: subject.architecture }),
    },
    target,
  );
  if (rebound.path === subject.local_path) return evidence;
  const reboundSubject = subjectSchema.parse({
    ...subject,
    name: basename(target.path) || "artifact",
    local_path: target.path,
  });
  const reboundEvidence = { ...evidence, subject: reboundSubject };
  if (!isImmutableEvidence(evidence)) return immutableEvidence(reboundEvidence);

  // The original authenticated Evidence owns immutable payloads. Only the
  // small display subject and envelope are new, so preserve those payloads
  // without reparsing a potentially large analysis result.
  Object.freeze(reboundSubject.digest);
  Object.freeze(reboundSubject);
  Object.freeze(reboundEvidence);
  immutableEvidenceSnapshots.set(reboundEvidence, reboundEvidence);
  return reboundEvidence;
};

/** Recognize authenticated Evidence whose complete reachable JSON data is immutable. */
export const isImmutableEvidence = (evidence: Evidence): boolean =>
  immutableEvidenceSnapshots.has(evidence);

const rememberImmutableEvidence = (evidence: Evidence): Evidence => {
  freezeJsonSnapshot(evidence);
  immutableEvidenceSnapshots.set(evidence, evidence);
  return evidence;
};

/** Build deterministic Evidence from an immutable artifact subject. */
export const createEvidence = (
  target: EvidenceSubjectTarget | BinaryTarget | undefined,
  provider: EvidenceProvider,
  observation: EvidenceObservation,
): Evidence => {
  const { normalized, sharedResult } = normalizeEvidenceObservation(
    target,
    provider,
    observation,
  );
  const evidence = {
    ...normalized,
    evidence_id: computeEvidenceId(normalized),
  };
  return sharedResult ? rememberImmutableEvidence(evidence) : evidence;
};

/** Create Evidence from owned immutable JSON while exposing cooperative computation steps. */
export function* createImmutableEvidenceSteps(
  target: EvidenceSubjectTarget | BinaryTarget | undefined,
  provider: EvidenceProvider,
  observation: EvidenceObservation,
): Generator<void, Evidence> {
  if (!isImmutableJsonSnapshot(observation.result))
    throw new TypeError(
      "Cooperative Evidence requires an authenticated immutable result",
    );
  // The envelope parser below retains its usual diagnostics, using the completed
  // immutable validation rather than traversing the payload synchronously again.
  yield* jsonValueValidationSteps(observation.result);
  const { normalized } = normalizeEvidenceObservation(
    target,
    provider,
    observation,
  );
  const digest = yield* canonicalJsonDigestSteps(
    semanticProjection(normalized),
  );
  return rememberImmutableEvidence({
    ...normalized,
    evidence_id: `ev_${digest}`,
  });
}

const normalizeEvidenceObservation = (
  target: EvidenceSubjectTarget | BinaryTarget | undefined,
  provider: EvidenceProvider,
  observation: EvidenceObservation,
) => {
  const subject =
    target === undefined
      ? null
      : {
          name: basename(target.path) || "artifact",
          digest: { sha256: target.sha256 },
          format: target.format,
          architecture: target.architecture ?? null,
          local_path: target.path,
        };
  const semantic = {
    subject:
      subject === null
        ? null
        : {
            digest: subject.digest,
            format: subject.format,
            architecture: subject.architecture,
          },
    provider: {
      id: provider.id,
      name: provider.name,
      version: provider.version,
    },
    analysis_profile: observation.analysisProfile ?? null,
    predicate_type: observation.predicateType ?? "rea.analysis",
    operation: observation.operation,
    parameters: observation.parameters,
    raw_result: observation.rawResult ?? null,
    normalized_result: observation.result,
    confidence: observation.confidence ?? "observed",
    authority: observation.authority ?? "shipped-artifact",
    environment: observation.environment ?? null,
    limitations: [
      ...(target === undefined
        ? [
            observation.subjectUnavailableReason ??
              "Artifact identity is unavailable for this observation.",
          ]
        : []),
      ...(observation.limitations ?? []),
    ],
    ...(observation.relationshipCoverage === undefined
      ? { relationship_coverage: null }
      : { relationship_coverage: observation.relationshipCoverage }),
    locations: [...(observation.locations ?? [])],
    evidence_links: [...(observation.evidenceLinks ?? [])],
  } satisfies JsonValue;
  const sharedResult =
    typeof observation.result === "object" &&
    observation.result !== null &&
    isImmutableJsonSnapshot(observation.result);
  const selectedSchema = sharedResult
    ? evidenceSchema.safeExtend({ normalized_result: immutableResultSchema })
    : evidenceSchema;
  const normalized = selectedSchema.parse({
    ...semantic,
    evidence_id: `ev_${"0".repeat(64)}`,
    subject,
  });
  // The envelope has already been parsed into an independent snapshot. Only
  // its derived identifier changes here; parsing again clones the full payload
  // and recomputes the same digest while the previous snapshot is still live.
  return { normalized, sharedResult };
};
