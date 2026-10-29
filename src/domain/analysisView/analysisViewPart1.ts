export const __stub = 1;
// import { z } from "zod";
// import {
//   javascriptModuleReferencesRequestSchema,
//   javascriptModuleReferenceSchema,
//   javascriptModuleSourceCoverageSchema,
// } from "./javascriptModuleReferences.js";
// import { javaScriptSourceSelectionSchema } from "../javascript/javascriptSourceSelection.js";
//
// import {
//   // removed unused: AnalysisInputError, (AnalysisInputError)
//   AnalysisUnsupportedTargetError,
// } from "../analysisErrorCore.js";
// import {
//   INSPECT_ANALYSIS_VIEW_OPERATION,
//   analysisViewInputError,
// } from "./analysisViewErrors.js";
// import { digestCanonicalValue } from "../canonicalDigest.js";
// import { digestSchema, prefixedDigestSchema } from "../digests.js";
// import { evidenceSchema, type Evidence } from "../evidence.js";
// import { jsonObjectSchema, jsonValueSchema } from "../jsonValue.js";
// import { err, ok, type Result } from "../result.js";
// import type { AnalysisError } from "../analysisErrorBase.js";
// import { binaryLayoutSchema } from "../native/binaryLayout.js";
// import { functionDossierSchema } from "../hopperValues.js";
// import {
//   artifactGraphManifestSchema,
//   artifactNodeSchema,
//   artifactOccurrenceSchema,
//   artifactEdgeSchema,
//   integrityContradictionSchema,
// } from "../artifactGraph.js";
// import { artifactInspectionResultSchema } from "../artifactInspection.js";
// import {
//   parseOwnedJavaScriptApplicationAnalysisSteps,
//   type JavaScriptApplicationAnalysisResult,
// } from "../javascript/javascriptApplicationAnalysis.js";
// import { analysisInputErrorFromIssues } from "../inputIssueProjection.js";
// import { projectBinaryLayoutView } from "./binaryLayoutView.js";
// import { projectJavaScriptApplicationView } from "./javascriptApplicationView.js";
// import {
//   projectWebNetworkApiSurfaceView,
//   apiSurfaceFields,
//   apiSurfaceViewSchema,
// } from "./webNetworkApiSurfaceView.js";
// import { projectNativeFunctionView } from "./nativeFunctionView.js";
// import {
//   projectEvmInterfaceView,
//   evmViewRequestSchema,
//   evmViewItemSchema,
//   evmSummarySchema,
// } from "./evmInterfaceView.js";
// import { projectArtifactInventoryView } from "./artifactInventoryView.js";
// import {
//   projectManagedArtifactView,
//   managedViewRequestSchema,
//   managedViewItemSchema,
//   managedSummarySchema,
//   managedViewContextSchema,
// } from "./managedArtifactView.js";
// import {
//   projectManagedMemberView,
//   managedMembersViewRequestSchema,
//   managedMembersViewPageSchema,
//   managedMemberSummarySchema,
//   managedMembersViewContextSchema,
// } from "./managedMemberView.js";
// import {
//   projectWasmArtifactView,
//   wasmViewRequestSchema,
//   wasmViewItemSchema,
//   wasmSummarySchema,
// } from "./wasmArtifactView.js";
// import {
//   machoSummarySchema,
//   machoViewContextSchema,
//   machoViewItemSchema,
//   machoViewRequestSchema,
//   projectMachoView,
// } from "./machoView.js";
// import {
//   interfaceBuilderSummarySchema,
//   interfaceBuilderViewContextSchema,
//   interfaceBuilderViewItemsSchema,
//   interfaceBuilderViewRequestSchema,
//   projectInterfaceBuilderView,
// } from "./interfaceBuilderView.js";
// import {
//   projectWebNetworkCaptureView,
//   captureViewRequestSchema,
//   captureViewItemsSchema,
//   captureSummarySchema,
// } from "./webNetworkCaptureView.js";
// import type { WebNetworkApiSurfaceAccumulator } from "./WebNetworkApiSurfaceAccumulator.js";
// import {
//   pcapViewRequestSchema,
//   pcapViewPageSchema,
//   pcapSummarySchema,
//   projectPcapCaptureView,
// } from "./pcapCaptureView.js";
// import {
//   qlogViewRequestSchema,
//   qlogViewPageSchema,
//   qlogViewContextSchema,
// } from "./qlogCaptureView.js";
// import {
//   projectAndroidPackageView,
//   androidPackageSummarySchema,
//   androidViewRequestSchema,
//   androidManifestViewItemSchema,
// } from "./androidPackageView.js";
// import {
//   projectDartAotView,
//   dartAotSummarySchema,
//   dartAotViewRequestSchema,
//   dartAotViewContextSchema,
// } from "./dartAotView.js";
//
// const summaryViewSchema = z.strictObject({ kind: z.literal("summary") });
// const facetViewSchema = z.strictObject({
//   kind: z.literal("facet"),
//   facet: z.enum(["mitigations", "linkage"]),
// });
// const indexSelectorSchema = z.strictObject({
//   index: z.number().int().nonnegative(),
// });
// const nameSelectorSchema = z.strictObject({ name: z.string() });
// const pathSelectorSchema = z.strictObject({
//   path: z
//     .string()
//     .describe(
//       "Exact observed module path or original source-map reference from a module page; an empty reference is valid.",
//     ),
// });
// const nodeIdSelectorSchema = z.strictObject({
//   node_id: prefixedDigestSchema("jag_node"),
// });
// const moduleItemViewSchema = z.strictObject({
//   kind: z.literal("item"),
//   collection: z.literal("modules"),
//   selector: z.union([pathSelectorSchema, nodeIdSelectorSchema]),
// });
// const sectionOrSymbolItemViewSchema = z.strictObject({
//   kind: z.literal("item"),
//   collection: z.enum(["sections", "symbols"]),
//   selector: z.union([indexSelectorSchema, nameSelectorSchema]),
// });
// /**
//  * The collection-specific selector alternatives are expressed in the owning
//  * contract so the advertised JSON Schema preserves them: modules accept
//  * path/node_id, sections and symbols accept index/name. Refinement-only
//  * constraints do not survive JSON Schema conversion, so the advertised
//  * schema previously accepted combinations that runtime input validation
//  * rejects.
//  */
// const itemViewSchema = z.discriminatedUnion("collection", [
//   moduleItemViewSchema,
//   sectionOrSymbolItemViewSchema,
// ]);
// const pageViewSchema = z.strictObject({
//   kind: z.literal("page"),
//   collection: z.enum(["sections", "symbols", "modules"]),
//   offset: z.number().int().nonnegative(),
//   limit: z.number().int().positive(),
// });
//
// /** Bounded native function facets of already authenticated analyze_function Evidence. */
// const nativeViewSchema = z.strictObject({
//   kind: z.literal("native"),
//   facet: z.enum([
//     "procedure",
//     "pseudocode",
//     "assembly",
//     "basic_blocks",
//     "comments",
//     "callers",
//     "callees",
//     "incoming_references",
//     "outgoing_references",
//     "unresolved_calls",
//     "referenced_strings",
//     "referenced_names",
//     "swift_string_literals",
//     "swift_string_literal_omissions",
//     "native_api",
//     "value_flow_summary",
//     "value_flow_operations",
//     "value_flow_def_use",
//     "value_flow_effects",
//     "value_flow_parameters",
//     "value_flow_parameter_uses",
//   ]),
//   offset: z.number().int().nonnegative().default(0),
//   limit: z.number().int().positive().default(64),
// });
//
// /** Original inventory records in stable order, optionally matching exact paths. */
// const inventoryViewSchema = z.discriminatedUnion("collection", [
//   z.strictObject({
//     kind: z.literal("inventory"),
//     collection: z.literal("occurrences"),
//     logical_paths: z
//       .array(z.string())
//       .optional()
//       .describe(
//         "Exact recorded logical paths. Omitted selects all available occurrences; an empty array selects none. This does not resolve filesystem paths.",
//       ),
//     offset: z.number().int().nonnegative().default(0),
//     limit: z.number().int().positive().default(64),
//   }),
//   z.strictObject({
//     kind: z.literal("inventory"),
//     collection: z.enum(["nodes", "edges", "integrity_contradictions"]),
//     offset: z.number().int().nonnegative().default(0),
//     limit: z.number().int().positive().default(64),
//   }),
// ]);
//
// /** Caller-selected projection of already completed analysis Evidence. */
// export const analysisViewRequestSchema = z.discriminatedUnion("kind", [
export const _l = 219;
