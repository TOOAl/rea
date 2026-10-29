import { z } from "zod";
import canonicalize from "canonicalize";

import { compareUnicodeCodePoints } from "./unicodeCodePointOrder.js";

import {
  evidenceSchema,
  immutableEvidence,
  parseEvidence,
  providerSchema,
  type Evidence,
} from "./evidence.js";
import {
  residualUnknownSchema,
  type ResidualUnknown,
} from "./residualUnknown.js";
import { freezeJsonSnapshot } from "./immutableJson.js";

const [detectedSubjectSchema, rawSubjectSchema] =
  evidenceSchema.shape.subject.unwrap().options;
const manifestFields = {
  digest: true,
  format: true,
  architecture: true,
} as const;
const artifactManifestSchema = z.discriminatedUnion("format", [
  detectedSubjectSchema.pick(manifestFields),
  rawSubjectSchema.pick(manifestFields),
]);
const providerManifestSchema = providerSchema;
const environmentManifestSchema = evidenceSchema.shape.environment.unwrap();
const scenarioManifestSchema = z.strictObject({
  evidence_id: evidenceSchema.shape.evidence_id,
  operation: z.string().min(1),
  authority: z.literal("controlled-replay"),
});
const captureManifestSchema = z.strictObject({
  evidence_id: evidenceSchema.shape.evidence_id,
  predicate_type: z.string().min(1),
});

export const evidenceBundleSchema = z.strictObject({
  artifacts: z.array(artifactManifestSchema),
  providers: z.array(providerManifestSchema),
  environments: z.array(environmentManifestSchema),
  scenarios: z.array(scenarioManifestSchema),
  captures: z.array(captureManifestSchema),
  unknowns: z.array(residualUnknownSchema),
  records: z.array(evidenceSchema),
});

export type EvidenceBundle = z.infer<typeof evidenceBundleSchema>;
const immutableBundles = new WeakMap<object, EvidenceBundle>();

/** Caller input has valid shape but is not in authenticated canonical form. */
export class NonCanonicalEvidenceBundleError extends TypeError {
  constructor() {
    super("Evidence bundle manifests are not canonical");
    this.name = "NonCanonicalEvidenceBundleError";
  }
}

/** Build and authenticate a sealed bundle while reusing immutable Evidence records. */
export const createImmutableEvidenceBundle = (
  records: readonly Evidence[],
  unknowns: readonly ResidualUnknown[] = [],
): EvidenceBundle => {
  const checkedRecords = records.map(immutableEvidence);
  if (
    new Set(checkedRecords.map(({ evidence_id }) => evidence_id)).size !==
    checkedRecords.length
  )
    throw new TypeError("Evidence bundle contains duplicate record IDs");
  const checkedUnknowns = unknowns.map((unknown) =>
    residualUnknownSchema.parse(unknown),
  );
  validateUnknownGraph(checkedUnknowns, checkedRecords);
  const bundle = freezeJsonSnapshot(
    createEvidenceBundle(checkedRecords, checkedUnknowns),
  );
  immutableBundles.set(bundle, bundle);
  return bundle;
};

/** Project records into a deterministic bundle whose order has no semantics. */
export const createEvidenceBundle = (
  records: readonly Evidence[],
  unknowns: readonly ResidualUnknown[] = [],
): EvidenceBundle => {
  const sortedRecords = [...records].sort((left, right) =>
    compareUnicodeCodePoints(left.evidence_id, right.evidence_id),
  );
  return {
    artifacts: uniqueSorted(
      sortedRecords.flatMap(({ subject }) =>
        subject === null
          ? []
          : [
              artifactManifestSchema.parse({
                digest: subject.digest,
                format: subject.format,
                architecture: subject.architecture,
              }),
            ],
      ),
    ),
    providers: uniqueSorted(sortedRecords.map(({ provider }) => provider)),
    environments: uniqueSorted(
      sortedRecords.flatMap(({ environment }) =>
        environment === null ? [] : [environment],
      ),
    ),
    scenarios: sortedRecords.flatMap((evidence) =>
      evidence.authority === "controlled-replay"
        ? [
            {
              evidence_id: evidence.evidence_id,
              operation: evidence.operation,
              authority: evidence.authority,
            },
          ]
        : [],
    ),
    captures: sortedRecords.flatMap((evidence) =>
      evidence.predicate_type === "rea.process-capture"
        ? [
            {
              evidence_id: evidence.evidence_id,
              predicate_type: evidence.predicate_type,
            },
          ]
        : [],
    ),
    unknowns: [...unknowns].sort(
      (left, right) =>
        compareUnicodeCodePoints(left.unknown_id, right.unknown_id) ||
        left.revision - right.revision,
    ),
    records: sortedRecords,
  };
};

/** Retain target records and eligible complete unknown histories with their mutation evidence. */
export const evidenceBundleForTarget = (
  bundle: EvidenceBundle,
  sha256: string,
): EvidenceBundle => {
  const recordsById = new Map(
    bundle.records.map((record) => [record.evidence_id, record]),
  );
  const histories = new Map<string, ResidualUnknown[]>();
  for (const unknown of bundle.unknowns) {
    const history = histories.get(unknown.unknown_id) ?? [];
    history.push(unknown);
    histories.set(unknown.unknown_id, history);
  }
  const retained = new Set<string>();
  const dependents = new Map<string, Set<string>>();
  const relationships = new Map<string, Set<string>>();
  for (const [id, history] of histories) {
    const eligible = history.every((unknown) => {
      if (unknown.scope_digest !== sha256) return false;
      const mutationEvidenceIds = new Set(unknown.mutation_evidence_ids);
      return referencedEvidenceIds(unknown).every((evidenceId) => {
        const record = recordsById.get(evidenceId);
        // Mutation subjects record the target active at the time of an edit,
        // which need not be the question's immutable investigation scope.
        return (
          record?.subject?.digest.sha256 === sha256 ||
          (mutationEvidenceIds.has(evidenceId) &&
            record?.predicate_type === "rea.residual-unknown-mutation")
        );
      });
    });
    if (!eligible) continue;
    retained.add(id);
    const relatedIds = new Set(
      history.flatMap((unknown) =>
        unknown.relationships.map(({ unknown_id }) => unknown_id),
      ),
    );
    relationships.set(id, relatedIds);
    for (const relatedId of relatedIds) {
      const references = dependents.get(relatedId) ?? new Set<string>();
      references.add(id);
      dependents.set(relatedId, references);
    }
  }
  const pending: string[] = [];
  for (const [id, relatedIds] of relationships)
    if ([...relatedIds].some((relatedId) => !retained.has(relatedId)))
      pending.push(id);
  for (let index = 0; index < pending.length; index += 1) {
    const id = pending[index];
    if (id === undefined || !retained.delete(id)) continue;
    for (const dependent of dependents.get(id) ?? []) pending.push(dependent);
  }
  const unknowns = bundle.unknowns.filter((unknown) =>
    retained.has(unknown.unknown_id),
  );
  const mutationIds = new Set(
    unknowns.flatMap(({ mutation_evidence_ids: ids }) => ids),
  );
  return createEvidenceBundle(
    bundle.records.filter(
      (record) =>
        record.subject?.digest.sha256 === sha256 ||
        mutationIds.has(record.evidence_id),
    ),
    unknowns,
  );
};

const referencedEvidenceIds = (unknown: ResidualUnknown): readonly string[] => [
  ...unknown.supporting_evidence_ids,
  ...unknown.contradicting_evidence_ids,
  ...unknown.mutation_evidence_ids,
  ...(unknown.resolution?.evidence_ids ?? []),
];

/**
 * Name the bundle constraint that failed and how to recover. A single
 * Evidence record, such as one command result, is not a bundle.
 */
export type EvidenceBundleFailureDescription =
  | { readonly kind: "single-record"; readonly message: string }
  | { readonly kind: "invalid-bundle"; readonly message: string };

export const describeEvidenceBundleFailure = (
  input: unknown,
  cause: unknown,
): EvidenceBundleFailureDescription => {
  try {
    const record = parseEvidence(input);
    return {
      kind: "single-record",
      message: `Expected an Evidence bundle with records and manifest arrays, but this JSON is one Evidence record (${record.evidence_id}). Export a session bundle with the MCP export_evidence_bundle tool and supply that file.`,
    };
  } catch {
    return {
      kind: "invalid-bundle",
      message:
        cause instanceof z.ZodError
          ? `Evidence bundle does not match the bundle schema ${describeValidationFailure(cause)}. Supply an unmodified bundle written by export_evidence_bundle or rea evidence-export.`
          : `Evidence bundle validation failed: ${describeValidationFailure(cause)}. Recreate or re-export the bundle, then try again.`,
    };
  }
};

/** Locate the first schema issue, or keep a thrown constraint message. */
export const describeValidationFailure = (cause: unknown): string => {
  if (!(cause instanceof z.ZodError))
    return cause instanceof Error ? cause.message : String(cause);
  const [first, ...rest] = cause.issues;
  const location =
    first === undefined || first.path.length === 0
      ? "the document root"
      : first.path.map(String).join(".");
  return `at ${location}: ${first?.message ?? "invalid value"}${rest.length === 0 ? "" : ` (${String(rest.length)} more issues)`}`;
};

/** Parse records, verify semantic IDs, and reject inconsistent manifests. */
export const parseEvidenceBundle = (input: unknown): EvidenceBundle => {
  return parseBundle(input, false);
};

/** Authenticate and seal file-owned payloads once for downstream zero-copy reuse. */
export const parseImmutableEvidenceBundle = (
  input: unknown,
): EvidenceBundle => {
  return parseBundle(input, true);
};

const parseBundle = (input: unknown, seal: boolean): EvidenceBundle => {
  if (typeof input === "object" && input !== null) {
    const owned = immutableBundles.get(input);
    if (owned !== undefined) return owned;
  }
  return authenticateBundle(evidenceBundleSchema.parse(input), seal);
};

/** Authenticate evidence and bundle invariants after the bundle shape is parsed. */
export const authenticateParsedEvidenceBundle = (
  parsed: EvidenceBundle,
): EvidenceBundle => authenticateBundle(parsed, false);

const authenticateBundle = (
  parsed: EvidenceBundle,
  seal: boolean,
): EvidenceBundle => {
  const recordIds = parsed.records.map(({ evidence_id: id }) => id);
  if (new Set(recordIds).size !== recordIds.length)
    throw new TypeError("Evidence bundle contains duplicate record IDs");
  validateUnknownGraph(parsed.unknowns, parsed.records);
  const canonical = createEvidenceBundle(
    parsed.records.map((record, index) => {
      try {
        if (!seal) return parseEvidence(record);
        // Schema parsing gave this boundary exclusive ownership. Register only
        // validated payloads before authenticating the complete record envelope.
        record.normalized_result = freezeJsonSnapshot(record.normalized_result);
        record.raw_result = freezeJsonSnapshot(record.raw_result);
        return immutableEvidence(record);
      } catch (cause: unknown) {
        if (cause instanceof z.ZodError)
          throw new z.ZodError(
            cause.issues.map((issue) => ({
              ...issue,
              path: ["records", index, ...issue.path],
            })),
          );
        throw cause;
      }
    }),
    parsed.unknowns,
  );
  if (JSON.stringify(parsed) !== JSON.stringify(canonical))
    throw new NonCanonicalEvidenceBundleError();
  if (seal) {
    freezeJsonSnapshot(canonical);
    immutableBundles.set(canonical, canonical);
  }
  return canonical;
};

const validateUnknownGraph = (
  unknowns: readonly ResidualUnknown[],
  records: readonly Evidence[],
): void => {
  const evidenceById = new Map(
    records.map((record) => [record.evidence_id, record]),
  );
  const histories = new Map<string, ResidualUnknown[]>();
  for (const unknown of unknowns) {
    const history = histories.get(unknown.unknown_id) ?? [];
    history.push(unknown);
    histories.set(unknown.unknown_id, history);
  }
  const unknownById = new Map<string, ResidualUnknown>();
  for (const [id, unordered] of histories) {
    const history = [...unordered].sort(
      (left, right) => left.revision - right.revision,
    );
    for (const [index, revision] of history.entries()) {
      if (revision.revision !== index + 1)
        throw new TypeError(
          `Residual unknown ${id} revision history has a gap`,
        );
      if (
        index > 0 &&
        revision.previous_revision_digest !==
          history[index - 1]?.revision_digest
      )
        throw new TypeError(`Residual unknown ${id} revision chain is broken`);
    }
    const head = history.at(-1);
    if (head === undefined)
      throw new TypeError("Residual unknown revision history is empty");
    unknownById.set(id, head);
  }
  for (const unknown of unknowns) {
    const referencedEvidence = [
      ...unknown.supporting_evidence_ids,
      ...unknown.contradicting_evidence_ids,
      ...unknown.mutation_evidence_ids,
      ...(unknown.resolution?.evidence_ids ?? []),
    ];
    for (const evidenceId of referencedEvidence)
      if (!evidenceById.has(evidenceId))
        throw new TypeError(
          `Residual unknown references missing evidence ${evidenceId}`,
        );
    for (const relationship of unknown.relationships)
      if (!unknownById.has(relationship.unknown_id))
        throw new TypeError(
          `Residual unknown references missing unknown ${relationship.unknown_id}`,
        );
    if (unknown.resolution?.disposition === "verified")
      validateVerifiedResolution(unknown, evidenceById);
  }
  rejectDependencyCycles(unknownById);
};

const validateVerifiedResolution = (
  unknown: ResidualUnknown,
  evidenceById: Pick<ReadonlyMap<string, Evidence>, "get">,
): void => {
  if (unknown.contradicting_evidence_ids.length > 0)
    throw new TypeError(
      `Residual unknown ${unknown.unknown_id} retains contradicting evidence`,
    );
  const qualifies = unknown.resolution?.evidence_ids.some((evidenceId) => {
    const evidence = evidenceById.get(evidenceId);
    return (
      unknown.supporting_evidence_ids.includes(evidenceId) &&
      evidence !== undefined &&
      evidence.predicate_type !== "rea.residual-unknown-mutation" &&
      evidenceQualifies(unknown, evidence)
    );
  });
  if (qualifies !== true)
    throw new TypeError(
      `Residual unknown ${unknown.unknown_id} has no qualifying resolution evidence`,
    );
};

/**
 * Validate one new residual-unknown revision against an already valid ledger.
 * This keeps ordinary mutations proportional to the affected revision while
 * full bundle imports continue to validate the complete graph.
 */
