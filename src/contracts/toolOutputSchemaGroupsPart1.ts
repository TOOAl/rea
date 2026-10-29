export const __stub = 1;
// import { z } from "zod";
// import { byteSearchResultSchema } from "../domain/native/bytePattern.js";
// import {
//   artifactInventorySummaryViewResultSchema,
//   interfaceBuilderSummaryViewResultSchema,
//   machoSummaryViewResultSchema,
//   managedArtifactSummaryViewResultSchema,
//   managedMemberSummaryViewResultSchema,
// } from "../domain/analysisView/analysisView.js";
// import { evidenceBundleSummarySchema } from "../domain/evidenceRecordSummary.js";
// import { BINARY_ARCHITECTURES } from "../domain/binaryTargetTypes.js";
// import {
//   binaryArchitectureSchema,
//   rawBinaryEntryPointSchema,
// } from "../domain/rawBinary.js";
// import { nativeFunctionAnnotationsSchema } from "../domain/native/nativeFunctionAnnotations.js";
// import { nativeLoadImageSchema } from "../domain/native/nativeLoadImage.js";
// import { nativeUiResultSchema } from "../domain/native/nativeUiObservation.js";
// import { nativeValueTraceSchema } from "../domain/native/nativeValueTrace.js";
// import { nativeDataTypeSchema } from "../domain/native/nativeDataType.js";
// import { nativeCallObservationResultSchema } from "../domain/native/nativeCallObservation.js";
// import {
//   nativeInstructionSchema,
//   nativeCallTargetsSchema,
// } from "../domain/native/nativeInstruction.js";
// import { jsonValueSchema } from "../domain/jsonValue.js";
// import { residualUnknownSchema } from "../domain/residualUnknown.js";
// import { evidenceBundleSchema } from "../domain/evidenceBundle.js";
//
// import { processCaptureComparisonSchema } from "../domain/process/processComparison.js";
// import {
//   analysisBookmarkSchema,
//   functionInstructionWindowSchema,
//   referenceEdgeSchema,
//   unresolvedCallSchema,
//   analysisStringSchema,
//   procedureIdentitySchema,
// } from "../domain/hopperValues.js";
// import { nativeApiInspectionResultSchema } from "../domain/native/nativeApiBoundary.js";
// import {
//   demangleSwiftSchema,
//   inspectMachoSchema,
//   inspectPlistSchema,
//   inspectSignatureSchema,
//   listArchitecturesSchema,
// } from "../domain/native/nativeInspection.js";
// import { artifactExtractionResultSchema } from "../domain/artifactGraph.js";
// import { artifactInspectionResultSchema } from "../domain/artifactInspection.js";
// import { interfaceBuilderAnalysisSchema } from "../domain/apple/interfaceBuilderGraph.js";
// import { dylibResolutionResultSchema } from "../domain/apple/dylibResolution.js";
// import { keyedArchiveResultSchema } from "../domain/apple/keyedArchive.js";
// import { appleAssetCatalogResultSchema } from "../domain/apple/appleAssetCatalog.js";
// import {
//   managedArtifactInspectionSchema,
//   managedMemberInspectionSchema,
//   managedNativeBoundaryInspectionSchema,
// } from "../domain/managed/managedArtifact.js";
// import { managedMemberComparisonResultSchema } from "../domain/managed/managedMemberComparison.js";
// import { managedNativeVerificationResultSchema } from "../domain/managed/managedNativeVerificationSchemas.js";
// import { managedReconstructionImportResultSchema } from "../domain/managed/managedReconstruction.js";
// import { managedApplicationGraphResultSchema } from "../domain/managed/managedApplicationGraph.js";
// import { artifactComparisonResultSchema } from "../domain/artifactComparison.js";
// import { functionComparisonResultSchema } from "../domain/functionComparisonSchemas.js";
// import { bundleComparisonResultSchema } from "../domain/bundleComparison.js";
// import { changedBehaviorResultSchema } from "../domain/changedBehavior.js";
// import { callPathResultSchema } from "../domain/callPathSchemas.js";
// import { staticRuntimeCorrelationResultSchema } from "../domain/staticRuntimeCorrelation.js";
// import { reconstructionVerificationResultSchema } from "../domain/reconstructionVerificationSchemas.js";
// import { analysisErrorProjectionSchema } from "./errorSchemas.js";
// import { relationshipCoverageSchema } from "../domain/relationshipCoverage.js";
// import { nativeDispatchMetadataResultSchema } from "../domain/native/objcSwiftMetadata.js";
// import { nativeInvestigationTraceSchema } from "../domain/native/nativeInvestigationGraph.js";
// import {
//   addressList,
//   addressedValue,
//   addressedEntry,
//   containingProcedureResolution,
//   functionDossierOutput,
//   graphNode,
//   lifecycleResultOf,
//   nullableText,
//   procedureInfoOutput,
//   evidenceResultOf,
//   segmentOutput,
//   sessionProvider,
//   symbolDiscoveryOutput,
//   targetFormatSchema,
//   targetKindSchema,
// } from "./toolOutputSchemaPrimitives.js";
//
// import { processCaptureSchema } from "../domain/process/processCapture.js";
// import { electronFuseReportSchema } from "../domain/electron/electronFuses.js";
// const contextFacetSchema = z.discriminatedUnion("state", [
//   z.object({ state: z.literal("available"), value: jsonValueSchema }),
//   z.object({
//     state: z.literal("unavailable"),
//     reason: z.string(),
//     remediation: z.string(),
//   }),
// ]);
// const bookmarkFacetSchema = z.discriminatedUnion("state", [
//   z.object({
//     state: z.literal("available"),
//     value: z.array(analysisBookmarkSchema),
//   }),
//   z.object({
//     state: z.literal("unavailable"),
//     reason: z.string(),
//     remediation: z.string(),
//   }),
// ]);
//
// /** Exact structured-content schemas shared by direct analysis providers. */
// export const officialOutputSchemas: Readonly<Record<string, z.ZodObject>> = {
//   search_bytes: evidenceResultOf(byteSearchResultSchema),
//   annotate_native_function: evidenceResultOf(nativeFunctionAnnotationsSchema),
//   inspect_native_load_image: evidenceResultOf(nativeLoadImageSchema),
//   inspect_native_data_type: evidenceResultOf(nativeDataTypeSchema),
//   inspect_native_instruction: evidenceResultOf(nativeInstructionSchema),
//   resolve_native_call_targets: evidenceResultOf(nativeCallTargetsSchema),
//   address_name: evidenceResultOf(nullableText),
//   comment: evidenceResultOf(nullableText),
//   current_address: evidenceResultOf(z.string()),
//   current_procedure: evidenceResultOf(z.string()),
//   current_document: evidenceResultOf(z.string()),
//   goto_address: evidenceResultOf(z.string()),
//   inline_comment: evidenceResultOf(nullableText),
//   list_bookmarks: evidenceResultOf(z.array(analysisBookmarkSchema)),
//   list_documents: evidenceResultOf(z.array(z.string())),
//   list_names: evidenceResultOf(z.array(addressedValue)),
//   list_procedures: evidenceResultOf(z.array(addressedValue)),
//   list_segments: segmentOutput,
//   list_strings: evidenceResultOf(z.array(analysisStringSchema)),
//   next_address: evidenceResultOf(z.string()),
//   prev_address: evidenceResultOf(z.string()),
//   procedure_address: evidenceResultOf(z.string()),
//   procedure_assembly: evidenceResultOf(z.string()),
//   procedure_callees: evidenceResultOf(addressList),
//   procedure_callers: evidenceResultOf(addressList),
//   procedure_info: procedureInfoOutput,
//   read_function_instructions: evidenceResultOf(functionInstructionWindowSchema),
//   read_bytes: evidenceResultOf(
//     z.object({
//       address: z.string(),
//       requested_bytes: z.number().int().min(1),
//       returned_bytes: z.number().int().min(0),
//       bytes_hex: z.string().regex(/^(?:[a-f0-9]{2})*$/u),
//       complete: z.boolean(),
//     }),
//   ),
export const _l = 150;
