export const __stub = 1;
//           }),
//           z.object({
//             address: z
//               .string()
//               .describe("Original caller-selected symbol or address."),
//             procedure: batchProcedureIdentity,
//             status: z.literal("error"),
//             error: analysisErrorProjectionSchema,
//           }),
//         ]),
//       ),
//       total: z.number().int().min(0),
//       succeeded: z.number().int().min(0),
//       failed: z.number().int().min(0),
//     }),
//   ),
//   get_call_graph: evidenceResultOf(
//     z.strictObject({
//       graph: z.record(z.string(), z.array(graphNode)),
//       limitations: z.array(z.string()),
//     }),
//   ),
//   analyze_swift_types: evidenceResultOf(
//     z.object({
//       total: z.number().int().min(0),
//       categories: z.record(
//         z.string(),
//         z.object({
//           count: z.number().int().min(0),
//           items: z.array(
//             addressedEntry.extend({
//               mangled_names: z.array(z.string()),
//             }),
//           ),
//         }),
//       ),
//       unclassified: z.array(
//         addressedEntry.extend({
//           mangled_names: z.array(z.string()),
//           reason: z.enum(["category_not_decoded", "conflicting_categories"]),
//         }),
//       ),
//       limitations: z.array(z.string()),
//       symbol_inventory_error: analysisErrorProjectionSchema.exactOptional(),
//     }),
//   ),
//   find_xrefs_to_name: evidenceResultOf(
//     z.discriminatedUnion("status", [
//       z.object({
//         status: z.literal("resolved"),
//         name: z.string(),
//         address: z.string(),
//         xrefs: addressList,
//       }),
//       z.object({
//         status: z.literal("unresolved"),
//         name: z.string(),
//         reason: z.literal("name_not_found"),
//       }),
//     ]),
//   ),
//   binary_overview: evidenceResultOf(
//     z.object({
//       document: z.string(),
//       image_base: z.string().min(1).optional(),
//       segments: z
//         .array(
//           z.object({
//             name: z.string(),
//             start: z.string(),
//             end: z.string(),
//             length: z.number().min(0).nullable(),
//             image_base: z.string().exactOptional(),
//             address_space: z.string().exactOptional(),
//           }),
//         )
//         .optional(),
//       segment_count: z.number().int().min(0).optional(),
//       procedure_count: z.number().int().min(0),
//       string_count: z.number().int().min(0),
//     }),
//   ),
//   analyze_function: functionDossierOutput,
//   inspect_native_api: evidenceResultOf(nativeApiInspectionResultSchema),
//   trace_feature: literalTraceOutput,
//   trace_call_path: callPathTraceOutput,
// };
//
// /** Exact Evidence schemas for provider-neutral native inspection. */
// export const nativeOutputSchemas: Readonly<Record<string, z.ZodObject>> = {
//   observe_native_ui: evidenceResultOf(nativeUiResultSchema),
//   capture_native_ui_scenario: evidenceResultOf(nativeUiResultSchema),
//   observe_native_calls: evidenceResultOf(nativeCallObservationResultSchema),
//   inspect_macho: evidenceResultOf(
//     z.union([inspectMachoSchema, machoSummaryViewResultSchema]),
//   ),
//   inspect_signature: evidenceResultOf(inspectSignatureSchema),
//   inspect_plist: evidenceResultOf(inspectPlistSchema),
//   list_architectures: evidenceResultOf(listArchitecturesSchema),
//   demangle_swift: evidenceResultOf(demangleSwiftSchema),
// };
//
// /** Exact Evidence schemas for provider-neutral artifact graph operations. */
// export const artifactOutputSchemas: Readonly<Record<string, z.ZodObject>> = {
//   inspect_artifact: evidenceResultOf(
//     z.union([
//       artifactInspectionResultSchema,
//       artifactInventorySummaryViewResultSchema,
//     ]),
//   ),
//   extract_artifact: evidenceResultOf(artifactExtractionResultSchema),
//   decode_interface_builder: evidenceResultOf(
//     z.union([
//       interfaceBuilderAnalysisSchema,
//       interfaceBuilderSummaryViewResultSchema,
//     ]),
//   ),
//   inspect_keyed_archive: evidenceResultOf(keyedArchiveResultSchema),
//   inspect_asset_catalog: evidenceResultOf(appleAssetCatalogResultSchema),
//   trace_dylib_resolution: evidenceResultOf(dylibResolutionResultSchema),
// };
//
// /** Exact Evidence schema for execution-free managed static analysis. */
// export const managedOutputSchemas: Readonly<Record<string, z.ZodObject>> = {
//   inspect_managed_artifact: evidenceResultOf(
//     z.union([
//       managedArtifactInspectionSchema,
//       managedArtifactSummaryViewResultSchema,
//     ]),
//   ),
//   inspect_managed_members: evidenceResultOf(
//     z.union([
//       managedMemberInspectionSchema,
//       managedMemberSummaryViewResultSchema,
//     ]),
//   ),
//   inspect_managed_native_boundaries: evidenceResultOf(
//     managedNativeBoundaryInspectionSchema,
//   ),
// };
//
// /** Exact Evidence schema for provider-neutral managed workflows. */
// export const managedWorkflowOutputSchemas: Readonly<
//   Record<string, z.ZodObject>
// > = {
//   compare_managed_members: evidenceResultOf(
//     managedMemberComparisonResultSchema,
//   ),
//   verify_managed_native_boundaries: evidenceResultOf(
//     managedNativeVerificationResultSchema,
export const _l = 150;
