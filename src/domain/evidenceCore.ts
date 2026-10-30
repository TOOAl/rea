import { z } from "zod";

import { canonicalJsonDigestSteps } from "./canonicalJsonDigestSteps.js";
import { nulFreeStringSchema } from "./localPath.js";

import { analysisProfileSchema } from "./analysisProfile.js";
import {
  BINARY_ARCHITECTURES,
  type BinaryArchitecture,
} from "./binaryTargetTypes.js";
import {
  jsonObjectSchema,
  jsonValueSchema,
  jsonValueValidationIssue,
  type JsonValue,
} from "./jsonValue.js";
import { isImmutableJsonSnapshot } from "./immutableJson.js";
import { digestSchema } from "./../domain/digests.js";
import { prefixedDigestSchema } from "./../domain/digests.js";
import { relationshipCoverageSchema } from "./relationshipCoverage.js";

/** Provider identity schema shared by evidence-bearing persistence formats. */
export const providerSchema = z.strictObject({
  id: z.string().min(1),
  name: z.string().min(1),
  version: z.string().nullable(),
});
const subjectFormatSchema = z.enum([
  "hopper",
  "analysis-database",
  "mach-o",
  "elf",
  "pe",
  "dos-mz",
  "dos-com",
  "raw-binary",
  "zip",
  "ipa",
  "apk",
  "msix",
  "appx",
  "hap",
  "hsp",
  "app-pack",
  "asar",
  "dmg",
  "pkg",
  "plist",
  "javascript",
  "source-map",
  "directory",
  "file",
  "unknown",
  "mach-o-universal",
  "javascript-bundle",
  "entitlements",
]);
const subjectBaseSchema = z.strictObject({
  name: z.string().min(1),
  digest: z.strictObject({ sha256: digestSchema }),
  local_path: nulFreeStringSchema,
});
// The format owns the architecture claim, including nested Evidence subjects.
const subjectSchema = z.discriminatedUnion("format", [
  subjectBaseSchema.extend({
    format: subjectFormatSchema.exclude(["raw-binary"]),
    architecture: z.enum(BINARY_ARCHITECTURES).exclude(["6502"]).nullable(),
  }),
  subjectBaseSchema.extend({
    format: z.literal("raw-binary"),
    architecture: z.enum(BINARY_ARCHITECTURES).nullable(),
  }),
]);
/** Source location attached to an evidence observation. */
/** Source-location schema shared by evidence-bearing persistence formats. */
export const evidenceLocationSchema = z.discriminatedUnion("kind", [
  z.strictObject({ kind: z.literal("address"), address: z.string().min(1) }),
  z.strictObject({
    kind: z.literal("address-range"),
    start: z.string().min(1),
    end: z.string().min(1),
  }),
  z.strictObject({ kind: z.literal("artifact-path"), path: z.string().min(1) }),
  z.strictObject({
    kind: z.literal("file-offset"),
    offset: z.number().int().min(0),
  }),
  z.strictObject({
    kind: z.literal("file-offset-range"),
    start: z.number().int().min(0),
    end: z.number().int().min(0),
  }),
]);

const evidenceAuthoritySchema = z.enum([
  "shipped-artifact",
  "controlled-replay",
  "historical-reference",
  "external-service",
  "analyst-inference",
]);

const executionEnvironmentSchema = z.strictObject({
  id: z.string().min(1),
  platform: z.string().min(1),
  architecture: z.string().min(1),
  isolation: z.enum(["none", "process", "container", "virtual-machine"]),
});

const evidenceBaseSchema = z
  .object({
    evidence_id: prefixedDigestSchema("ev"),
    subject: subjectSchema.nullable(),
    provider: providerSchema,
    analysis_profile: analysisProfileSchema.nullable(),
    predicate_type: z.string().min(1),
    operation: z.string().min(1),
    parameters: jsonObjectSchema,
    raw_result: jsonValueSchema.nullable(),
    normalized_result: jsonValueSchema,
    confidence: z.enum(["observed", "derived", "inferred"]),
    authority: evidenceAuthoritySchema,
    environment: executionEnvironmentSchema.nullable(),
    limitations: z.array(z.string()),
    relationship_coverage: relationshipCoverageSchema.nullable(),
    locations: z.array(evidenceLocationSchema),
    evidence_links: z.array(prefixedDigestSchema("ev")),
  })
  .strict();

/** Require a reported analysis profile to identify the observation provider. */
export const validateAnalysisProfileProvider = (
  evidence: Pick<
    z.infer<typeof evidenceBaseSchema>,
    "analysis_profile" | "provider"
  >,
  context: z.RefinementCtx,
): void => {
  const profile = evidence.analysis_profile;
  if (
    profile !== null &&
    (profile.provider.id !== evidence.provider.id ||
      profile.provider.name !== evidence.provider.name ||
      profile.provider.version !== evidence.provider.version)
  )
    context.addIssue({
      code: "custom",
      path: ["analysis_profile", "provider"],
      message: "Analysis profile provider does not match Evidence provider",
    });
};

/** Strict, provider-neutral record for one successful public observation. */
export const evidenceSchema = evidenceBaseSchema.superRefine(
  validateAnalysisProfileProvider,
);

const authenticatedEvidenceSchema = evidenceSchema.superRefine(
  (evidence, context) => {
    const { evidence_id: evidenceId, ...withoutId } = evidence;
    if (computeEvidenceId(withoutId) !== evidenceId)
      context.addIssue({
        code: "custom",
        path: ["evidence_id"],
        message: "Evidence semantic identifier does not match its record",
      });
  },
);

/** Complete observation whose normalized payload retains its operation-specific type. */
type EvidenceSchemaValue = z.infer<typeof evidenceSchema>;
export type Evidence<Result extends JsonValue = JsonValue> =
  EvidenceSchemaValue & {
    readonly normalized_result: Result;
  };
const immutableEvidenceSnapshots = new WeakMap<object, Evidence>();
const immutableResultSchema = z
  .custom<JsonValue>(isImmutableJsonSnapshot)
  .superRefine((value, context) => {
    const issue = jsonValueValidationIssue(value);
    if (issue !== undefined)
      context.addIssue({ code: "custom", message: issue });
  });
export type EvidenceLocation = z.infer<typeof evidenceLocationSchema>;

/** Candidate local artifact identity validated by the Evidence subject schema. */
export interface EvidenceSubjectTarget {
  readonly path: string;
  readonly sha256: string;
  readonly format: z.infer<typeof subjectSchema>["format"];
  readonly architecture?: BinaryArchitecture;
}

/** Rebind a matching immutable artifact subject to the caller's selected path. */
export const rebindEvidenceSubjectTargetPath = (
  subject: EvidenceSubjectTarget,
  target: EvidenceSubjectTarget,
): EvidenceSubjectTarget =>
  subject.sha256 === target.sha256 &&
  subject.format === target.format &&
  (subject.architecture ?? null) === (target.architecture ?? null)
    ? { ...subject, path: target.path }
    : subject;

type EvidenceAuthority = z.infer<typeof evidenceAuthoritySchema>;
type ExecutionEnvironment = z.infer<typeof executionEnvironmentSchema>;

export interface EvidenceProvider {
  readonly id: string;
  readonly name: string;
  readonly version: string | null;
}
