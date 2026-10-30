import { z } from "zod";
import { digestSchema } from "../digests.js";
import { prefixedDigestSchema } from "../digests.js";

const boundedTextSchema = z.string().min(1);
const boundedKeySchema = z.string().min(1);
const unsafePathSegments = new Set(["", ".", ".."]);
const isSafeRelativePath = (path: string): boolean => {
  if (path.startsWith("/")) return false;
  return path.split("/").every((part) => !unsafePathSegments.has(part));
};
const relativePathSchema = z
  .string()
  .min(1)
  .refine(
    isSafeRelativePath,
    "Expected a normalized relative POSIX path without traversal",
  );

/** Authority that produced one node observation or relationship. */
const applicationEvidenceAuthoritySchema = z.enum([
  "artifact-bytes",
  "ast-static-analysis",
  "static-relationship-inference",
  "passive-cdp-runtime",
  "cross-layer-reconciliation",
  "cross-version-comparison",
  "controlled-replay",
  "native-analysis-provider",
  "managed-static-analysis",
  "historical-reference",
  "user-assertion",
  "unknown",
]);

/** Epistemic state kept separate from the evidence source. */
const applicationFactStateSchema = z.enum([
  "observed",
  "inferred",
  "unknown",
  "unavailable",
]);

/** Confidence assigned without promoting inference into observation. */
const applicationConfidenceSchema = z.enum([
  "exact",
  "high",
  "medium",
  "low",
  "unknown",
]);

/** Why an artifact or source location was not available to an extractor. */
const applicationUnavailableReasonSchema = z.enum([
  "not-applicable",
  "not-observed",
  "truncated",
  "provider-unavailable",
  "unresolved",
  "unknown",
]);

const unavailableFactSchema = z.strictObject({
  available: z.literal(false),
  reason: applicationUnavailableReasonSchema,
  detail: boundedTextSchema,
});

const availableArtifactSchema = z
  .strictObject({
    available: z.literal(true),
    artifact_id: prefixedDigestSchema("art"),
    sha256: digestSchema,
  })
  .superRefine((artifact, context) => {
    if (artifact.artifact_id !== `art_${artifact.sha256}`)
      context.addIssue({
        code: "custom",
        path: ["artifact_id"],
        message: "Artifact identifier must commit the same SHA-256 digest",
      });
  });

/** Explicit content-addressed artifact availability for one graph fact. */
const applicationArtifactReferenceSchema = z.discriminatedUnion("available", [
  availableArtifactSchema,
  unavailableFactSchema,
]);

const sourceRangeSchema = z
  .strictObject({
    kind: z.literal("source-range"),
    source: boundedTextSchema,
    start: z.strictObject({
      line: z.number().int().min(1),
      column: z.number().int().min(0),
    }),
    end: z.strictObject({
      line: z.number().int().min(1),
      column: z.number().int().min(0),
    }),
  })
  .superRefine((location, context) => {
    if (
      location.end.line < location.start.line ||
      (location.end.line === location.start.line &&
        location.end.column < location.start.column)
    )
      context.addIssue({
        code: "custom",
        path: ["end"],
        message: "Source range end must not precede its start",
      });
  });

const fileOffsetRangeSchema = z
  .strictObject({
    kind: z.literal("file-offset-range"),
    start: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER),
    end: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER),
  })
  .superRefine((location, context) => {
    if (location.end < location.start)
      context.addIssue({
        code: "custom",
        path: ["end"],
        message: "File offset range end must not precede its start",
      });
  });

/** A deterministic artifact, source, runtime, package, or native location. */
const applicationLocationSchema = z.discriminatedUnion("kind", [
  z.strictObject({
    kind: z.literal("artifact-path"),
    path: relativePathSchema,
  }),
  sourceRangeSchema,
  fileOffsetRangeSchema,
  z.strictObject({
    kind: z.literal("url"),
    url: z.string().min(1),
  }),
  z.strictObject({
    kind: z.literal("runtime"),
    capture_sha256: digestSchema,
    target_key: boundedKeySchema,
    frame_key: boundedKeySchema.nullable(),
    script_key: boundedKeySchema.nullable(),
  }),
  z.strictObject({
    kind: z.literal("native-address"),
    address: boundedKeySchema,
    symbol: boundedTextSchema.nullable(),
  }),
  z.strictObject({
    kind: z.literal("package-export"),
    package_name: boundedKeySchema,
    export_path: boundedTextSchema,
  }),
]);

/** Explicit source-location availability for one graph fact. */
const applicationLocationReferenceSchema = z.discriminatedUnion("available", [
  z.strictObject({
    available: z.literal(true),
    value: applicationLocationSchema,
  }),
  unavailableFactSchema,
]);

/** Versioned extractor coordinates attached to every graph fact. */
const applicationExtractorSchema = z.strictObject({
  name: z.string().min(1),
  version: z.string().min(1),
  operation: z.string().min(1),
  executable_sha256: digestSchema.nullable(),
});

const applicationLimitSchema = z.strictObject({
  name: z.string().min(1),
  value: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER),
  unit: z.enum([
    "items",
    "bytes",
    "milliseconds",
    "depth",
    "characters",
    "instructions",
    "other",
  ]),
});

/** Bounded collection coverage without treating omission as absence. */
const coverageLimitsSchema = z.array(applicationLimitSchema);
const omittedCountSchema = z.number().int().min(0).max(Number.MAX_SAFE_INTEGER);

export const applicationCoverageSchema = z.union([
  z.strictObject({
    status: z.literal("complete"),
    truncated: z.literal(false),
    omitted_count: z.literal(0),
    limits: coverageLimitsSchema,
  }),
  z.strictObject({
    status: z.literal("partial"),
    truncated: z.literal(false),
    omitted_count: omittedCountSchema.nullable(),
    limits: coverageLimitsSchema,
  }),
  z.strictObject({
    status: z.literal("partial"),
    truncated: z.literal(true),
    omitted_count: z.union([omittedCountSchema.positive(), z.null()]),
    limits: z.array(applicationLimitSchema).min(1),
  }),
  z.strictObject({
    status: z.enum(["unknown", "unavailable"]),
    truncated: z.literal(false),
    omitted_count: z.null(),
    limits: coverageLimitsSchema,
  }),
]);
export type ApplicationCoverage = z.infer<typeof applicationCoverageSchema>;

/** Construct complete bounded coverage under the stated configured limits. */
export const completeApplicationCoverage = (
  limits: ApplicationCoverage["limits"] = [],
): ApplicationCoverage =>
  applicationCoverageSchema.parse({
    status: "complete",
    truncated: false,
    omitted_count: 0,
    limits,
  });

/** Construct partial non-truncated coverage without inventing omissions. */
export const partialApplicationCoverage = (
  limits: ApplicationCoverage["limits"],
  omittedCount: number | null,
): ApplicationCoverage =>
  applicationCoverageSchema.parse({
    status: "partial",
    truncated: false,
    omitted_count: omittedCount,
    limits,
  });

/** Construct limit-truncated coverage with a named bound. */
export const truncatedApplicationCoverage = (
  limits: ApplicationCoverage["limits"],
  omittedCount: number | null,
): ApplicationCoverage =>
  applicationCoverageSchema.parse({
    status: "partial",
    truncated: true,
    omitted_count: omittedCount,
    limits,
  });
