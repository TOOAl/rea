import { z } from "zod";
import { byteSearchResultSchema } from "../domain/native/bytePattern.js";
import {
  artifactInventorySummaryViewResultSchema,
  interfaceBuilderSummaryViewResultSchema,
  machoSummaryViewResultSchema,
  managedArtifactSummaryViewResultSchema,
  managedMemberSummaryViewResultSchema,
} from "../domain/analysisView/analysisView.js";
import { evidenceBundleSummarySchema } from "../domain/evidenceRecordSummary.js";
import { BINARY_ARCHITECTURES } from "../domain/binaryTargetTypes.js";
import {
  binaryArchitectureSchema,
  rawBinaryEntryPointSchema,
} from "../domain/rawBinary.js";
import { nativeFunctionAnnotationsSchema } from "../domain/native/nativeFunctionAnnotations.js";
import { nativeLoadImageSchema } from "../domain/native/nativeLoadImage.js";
import { nativeUiResultSchema } from "../domain/native/nativeUiObservation.js";
import { nativeValueTraceSchema } from "../domain/native/nativeValueTrace.js";
import { nativeDataTypeSchema } from "../domain/native/nativeDataType.js";

// src/contracts/toolOutputSchemaGroupsPart2.ts
export const managedWorkflowOutputSchemas: Readonly<
  Record<string, z.ZodObject>
> = {
  compare_managed_members: evidenceResultOf(
    managedMemberComparisonResultSchema,
  ),
  verify_managed_native_boundaries: evidenceResultOf(
    managedNativeVerificationResultSchema,
  ),
  import_managed_reconstruction: evidenceResultOf(
    managedReconstructionImportResultSchema,
  ),
  project_managed_application_graph: evidenceResultOf(
    managedApplicationGraphResultSchema,
  ),
};

const lifecycleTargetFields = {
  path: z.string(),
  kind: targetKindSchema,
  sha256: z.string().regex(/^[a-f0-9]{64}$/u),
};
const detectedLifecycleTargetSchema = z.object({
  ...lifecycleTargetFields,
  format: targetFormatSchema.exclude(["raw-binary"]),
  architecture: z.enum(BINARY_ARCHITECTURES).exclude(["6502"]).nullable(),
});
const rawLifecycleTargetSchema = z.object({
  ...lifecycleTargetFields,
  format: z.literal("raw-binary"),
  kind: z.literal("executable"),
  architecture: binaryArchitectureSchema,
  entry_point: rawBinaryEntryPointSchema.describe(
    "Canonical caller-selected address where raw file offset 0 is mapped and execution is seeded.",
  ),
});

/** Exact structured-content schemas for target lifecycle operations. */
export const sessionOutputSchemas = {
  open_binary: lifecycleResultOf(
    z.discriminatedUnion("format", [
      detectedLifecycleTargetSchema,
      rawLifecycleTargetSchema,
    ]),
  ),
  close_binary: lifecycleResultOf(
    z.union([
      z.null(),
      z.object({
        path: z.string(),
        bytes: z.number().int().min(0),
        primitive_entries: z
          .number()
          .int()
          .min(0)
          .describe("Retained eligible primitive query bindings."),
        workflow_entries: z
          .number()
          .int()
          .min(0)
          .describe("Retained eligible composed workflow bindings."),
        evidence_records: z
          .number()
          .int()
          .min(0)
          .describe(
            "All retained Evidence records, including observations without replay bindings.",
          ),
      }),
    ]),
  ),
  binary_session: lifecycleResultOf(
    z.union([
      sessionProvider.extend({ open: z.literal(false) }),
      sessionProvider.extend({
        open: z.literal(true),
        ...detectedLifecycleTargetSchema.shape,
      }),
      sessionProvider.extend({
        open: z.literal(true),
        ...rawLifecycleTargetSchema.shape,
      }),
    ]),
  ),
  export_evidence_bundle: lifecycleResultOf(
    z.object({
      path: z.string(),
      bytes: z.number().int().min(0),
      records: z.number().int().min(0),
      unknowns: z.number().int().min(0),
    }),
  ),
  get_evidence_bundle: lifecycleResultOf(
    z.union([evidenceBundleSchema, evidenceBundleSummarySchema]),
  ),
  get_navigation_context: lifecycleResultOf(
    z.object({
      document: z.string(),
      address: z.string(),
      procedure: z.union([z.string(), z.null()]),
    }),
  ),
  inspect_address_context: lifecycleResultOf(
    z.object({
      address: z.string(),
      document: z.string().nullable(),
      name: contextFacetSchema,
      procedure: contextFacetSchema,
      comment: contextFacetSchema,
      inline_comment: contextFacetSchema,
      bookmarks: bookmarkFacetSchema,
    }),
  ),
  import_evidence_bundle: lifecycleResultOf(
    z.object({
      imported: z.number().int().min(0),
      unknowns_added: z.number().int().min(0),
      total: z.number().int().min(0),
    }),
  ),
  capture_process_scenario: evidenceResultOf(processCaptureSchema),
  compare_process_captures: evidenceResultOf(processCaptureComparisonSchema),
  compare_artifacts: evidenceResultOf(artifactComparisonResultSchema),
  compare_functions: evidenceResultOf(functionComparisonResultSchema),
  compare_bundles: evidenceResultOf(bundleComparisonResultSchema),
  find_changed_behavior: evidenceResultOf(changedBehaviorResultSchema),
  build_call_path: evidenceResultOf(callPathResultSchema),
  correlate_static_and_runtime: evidenceResultOf(
    staticRuntimeCorrelationResultSchema,
  ),
  verify_reconstruction: evidenceResultOf(
    reconstructionVerificationResultSchema,
  ),
  list_unknowns: lifecycleResultOf(
    z.object({
      items: z.array(residualUnknownSchema),
      total: z.number().int().min(0),
      offset: z.number().int().min(0),
      next_offset: z.number().int().min(0).nullable(),
    }),
  ),
  record_unknown: lifecycleResultOf(residualUnknownSchema),
  update_unknown: lifecycleResultOf(residualUnknownSchema),
  verify_unknown_resolution: lifecycleResultOf(
    z.object({
      valid: z.boolean(),
      truthVerified: z.boolean(),
      unknown: residualUnknownSchema,
    }),
  ),
} satisfies Readonly<Record<string, z.ZodObject>>;

/** Exact Evidence schema for read-only Electron fuse inspection. */
export const electronFuseOutputSchemas = {
  inspect_electron_fuses: evidenceResultOf(electronFuseReportSchema),
};
