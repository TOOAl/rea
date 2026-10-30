import { z } from "zod";

export type ArtifactInventoryCoverage = z.infer<
  typeof artifactInventoryCoverageSchema
>;

/** Current inventory observation containing the stable artifact graph. */
export const artifactInventoryResultSchema = z.strictObject({
  manifest: artifactGraphManifestSchema,
  nodes: z.array(artifactNodeSchema),
  occurrences: z.array(artifactOccurrenceSchema),
  edges: z.array(artifactEdgeSchema),
  provenance: z.array(artifactCommandSchema),
  integrity_contradictions: z.array(integrityContradictionSchema),
  coverage: artifactInventoryCoverageSchema,
  limitations: z.array(z.string()),
});

/** One safely materialized artifact beneath caller-approved output root. */
const extractedArtifactSchema = z.object({
  artifact_id: artifactIdSchema,
  relative_path: boundedRelativePathSchema,
  sha256: sha256Schema,
  bytes_written: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER),
  created: z.boolean(),
});

/** Path-independent commitment to one selected extraction operation. */
const artifactExtractionManifestSchema = z.object({
  extraction_id: extractionIdSchema,
  source_manifest_id: manifestIdSchema,
  selected_occurrence_ids: z.array(occurrenceIdSchema),
  files_sha256: sha256Schema,
  output_root_alias: z.literal("$OUTPUT_ROOT"),
});

/** Safe extraction observation with containment and cleanup verification. */
export const artifactExtractionResultSchema = z.object({
  manifest: artifactGraphManifestSchema,
  extraction_manifest: artifactExtractionManifestSchema,
  output_root: z.string().min(1),
  artifacts: z.array(extractedArtifactSchema),
  containment_verified: z.boolean(),
  cleanup: z.object({
    attempted: z.boolean(),
    verified: z.boolean(),
    residual_paths: z.array(boundedRelativePathSchema),
  }),
  provenance: z.array(artifactCommandSchema),
  integrity_contradictions: z.array(integrityContradictionSchema),
  limitations: z.array(z.string()),
});

/** Parsed artifact graph node. */
export type ArtifactNode = z.infer<typeof artifactNodeSchema>;

/** Parsed artifact derivation edge. */
export type ArtifactEdge = z.infer<typeof artifactEdgeSchema>;

/** Parsed artifact occurrence. */
export type ArtifactOccurrence = z.infer<typeof artifactOccurrenceSchema>;
export type IntegrityContradiction = z.infer<
  typeof integrityContradictionSchema
>;

/** Parsed deterministic artifact graph manifest. */
export type ArtifactGraphManifest = z.infer<typeof artifactGraphManifestSchema>;

/** Parsed paginated inventory result. */
export type ArtifactInventoryResult = z.infer<
  typeof artifactInventoryResultSchema
>;

/** Parsed paginated extraction result. */
export type ArtifactExtractionResult = z.infer<
  typeof artifactExtractionResultSchema
>;
