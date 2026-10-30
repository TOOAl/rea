import { z } from "zod";
import { digestSchema } from "../digests.js";
import { prefixedDigestSchema } from "../digests.js";

const applicationGraphEvidenceBaseSchema = z.strictObject({
  authority: applicationEvidenceAuthoritySchema,
  state: applicationFactStateSchema,
  confidence: applicationConfidenceSchema,
  artifact: applicationArtifactReferenceSchema,
  location: applicationLocationReferenceSchema,
  extractor: applicationExtractorSchema,
  coverage: applicationCoverageSchema,
  limitations: z.array(boundedTextSchema),
  evidence_ids: z.array(prefixedDigestSchema("ev")),
});

/** Shared provenance fields apart from the fact-specific evidence location. */
export const applicationGraphEvidenceContextSchema =
  applicationGraphEvidenceBaseSchema.omit({ location: true });

/** Exact coordinates retained on each graph fact. */
export const applicationGraphEvidenceLocationSchema =
  applicationLocationReferenceSchema;

type EvidenceValue = z.infer<typeof applicationGraphEvidenceBaseSchema>;

const checkAuthorityState = (
  evidence: EvidenceValue,
  context: z.RefinementCtx,
): void => {
  if (
    evidence.authority === "static-relationship-inference" &&
    evidence.state !== "inferred"
  )
    context.addIssue({
      code: "custom",
      path: ["state"],
      message: "Static relationship authority must remain inferred",
    });
  if (
    evidence.authority === "cross-layer-reconciliation" &&
    evidence.state !== "inferred"
  )
    context.addIssue({
      code: "custom",
      path: ["state"],
      message: "Cross-layer reconciliation authority must remain inferred",
    });
  if (
    evidence.authority === "cross-version-comparison" &&
    evidence.state !== "inferred"
  )
    context.addIssue({
      code: "custom",
      path: ["state"],
      message: "Cross-version comparison authority must remain inferred",
    });
  if (
    evidence.authority === "unknown" &&
    !["unknown", "unavailable"].includes(evidence.state)
  )
    context.addIssue({
      code: "custom",
      path: ["state"],
      message: "Unknown authority cannot claim an observed fact",
    });
};

const checkStateConfidence = (
  evidence: EvidenceValue,
  context: z.RefinementCtx,
): void => {
  if (
    ["unknown", "unavailable"].includes(evidence.state) &&
    (evidence.confidence !== "unknown" || evidence.limitations.length === 0)
  )
    context.addIssue({
      code: "custom",
      message:
        "Unknown and unavailable facts require unknown confidence and an explicit limitation",
    });
  if (evidence.state === "observed" && evidence.confidence === "unknown")
    context.addIssue({
      code: "custom",
      path: ["confidence"],
      message: "Observed facts require a bounded non-unknown confidence",
    });
  if (
    evidence.state === "inferred" &&
    !["high", "medium", "low"].includes(evidence.confidence)
  )
    context.addIssue({
      code: "custom",
      path: ["confidence"],
      message: "Inferred facts require high, medium, or low confidence",
    });
  if (evidence.confidence === "exact" && evidence.state !== "observed")
    context.addIssue({
      code: "custom",
      path: ["confidence"],
      message: "Exact confidence is reserved for observed facts",
    });
};

const checkTraceability = (
  evidence: EvidenceValue,
  context: z.RefinementCtx,
): void => {
  if (evidence.state === "observed" && !evidence.location.available)
    context.addIssue({
      code: "custom",
      path: ["location"],
      message: "Observed facts require an actionable location",
    });
  if (evidence.state === "inferred" && evidence.limitations.length === 0)
    context.addIssue({
      code: "custom",
      path: ["limitations"],
      message: "Inferred facts require an explicit limitation",
    });
  if (
    evidence.coverage.status !== "complete" &&
    evidence.limitations.length === 0
  )
    context.addIssue({
      code: "custom",
      path: ["limitations"],
      message: "Non-complete coverage requires an explicit limitation",
    });
};

const checkArtifactBacking = (
  evidence: EvidenceValue,
  context: z.RefinementCtx,
): void => {
  const artifactBacked = [
    "artifact-bytes",
    "ast-static-analysis",
    "controlled-replay",
    "native-analysis-provider",
    "managed-static-analysis",
  ].includes(evidence.authority);
  if (
    artifactBacked &&
    evidence.state !== "unavailable" &&
    !evidence.artifact.available
  )
    context.addIssue({
      code: "custom",
      path: ["artifact"],
      message: "Artifact-backed facts require a content digest",
    });
};

/** Provenance, authority, uncertainty, and bounds for one graph fact. */
export const applicationGraphEvidenceSchema =
  applicationGraphEvidenceBaseSchema.superRefine((evidence, context) => {
    checkAuthorityState(evidence, context);
    checkStateConfidence(evidence, context);
    checkTraceability(evidence, context);
    checkArtifactBacking(evidence, context);
  });

/** Stable node identifier strategies and their explicit scope. */
export const applicationNodeIdentitySchema = z.discriminatedUnion("strategy", [
  z.strictObject({
    strategy: z.literal("content-digest"),
    stability: z.literal("global-exact"),
    sha256: digestSchema,
  }),
  z.strictObject({
    strategy: z.literal("source-map-original"),
    stability: z.literal("source-map-exact"),
    source_map_sha256: digestSchema,
    // The exact `sources` entry; `""` is a legal relative reference.
    original_source: z.string(),
    // Exact leaf-local root; null means omitted or explicitly null.
    source_root: z.string().nullable(),
    source_sha256: digestSchema.nullable(),
  }),
  z.strictObject({
    strategy: z.literal("canonical-path"),
    stability: z.literal("artifact-version"),
    artifact_sha256: digestSchema,
    path: relativePathSchema,
  }),
  z.strictObject({
    strategy: z.literal("structural-fingerprint"),
    stability: z.literal("cross-version-inference"),
    algorithm: z.string().min(1),
    fingerprint_sha256: digestSchema,
    basis: z
      .array(
        z.enum([
          "syntax-tree",
          "control-flow",
          "imports",
          "exports",
          "literals",
          "api-usage",
        ]),
      )
      .min(1),
  }),
  z.strictObject({
    strategy: z.literal("artifact-local-key"),
    stability: z.literal("artifact-version"),
    artifact_sha256: digestSchema,
    namespace: boundedKeySchema,
    // The exact artifact-local value, such as `""` from `fetch("")`.
    key: z.string(),
  }),
  z.strictObject({
    strategy: z.literal("runtime-instance"),
    stability: z.literal("capture-only"),
    capture_sha256: digestSchema,
    runtime_key: boundedTextSchema,
  }),
  z.strictObject({
    strategy: z.literal("observation-fingerprint"),
    stability: z.literal("observation-only"),
    observation_sha256: digestSchema,
    scope: boundedTextSchema,
  }),
]);

/** Evidence coordinates attached to one graph observation or edge. */
export type ApplicationGraphEvidence = z.infer<
  typeof applicationGraphEvidenceSchema
>;

/** Provenance shared by facts with the same non-location evidence. */
export type ApplicationGraphEvidenceContext = z.infer<
  typeof applicationGraphEvidenceContextSchema
>;

/** Explicit stable identity strategy for one application entity. */
export type ApplicationNodeIdentity = z.infer<
  typeof applicationNodeIdentitySchema
>;
