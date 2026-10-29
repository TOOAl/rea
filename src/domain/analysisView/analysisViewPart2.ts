export const __stub = 1;
//   summaryViewSchema,
//   facetViewSchema,
//   itemViewSchema,
//   pageViewSchema,
//   javascriptModuleReferencesRequestSchema,
//   nativeViewSchema,
//   inventoryViewSchema,
//   wasmViewRequestSchema,
//   machoViewRequestSchema,
//   interfaceBuilderViewRequestSchema,
//   evmViewRequestSchema,
//   managedViewRequestSchema,
//   managedMembersViewRequestSchema,
//   androidViewRequestSchema,
//   apiSurfaceViewSchema,
//   captureViewRequestSchema,
//   qlogViewRequestSchema,
//   pcapViewRequestSchema,
//   dartAotViewRequestSchema,
// ]);
//
// // The application owns admission and authenticated Evidence parsing. SDK and
// // CLI envelope parsing must borrow this unknown value rather than clone it
// // before admission. Advertise the owning Evidence contract in both dialects.
// const inlineEvidenceInputSchema = z.unknown().nonoptional();
// inlineEvidenceInputSchema._zod.processJSONSchema =
//   evidenceSchema._zod.processJSONSchema;
//
// /** Unauthenticated inline input or an exact same-session retained reference. */
// export const analysisViewSourceSchema = z.discriminatedUnion("kind", [
//   z.strictObject({
//     kind: z.literal("retained-evidence"),
//     evidence_id: prefixedDigestSchema("ev"),
//   }),
//   z.strictObject({
//     kind: z.literal("inline"),
//     evidence: inlineEvidenceInputSchema,
//   }),
// ]);
//
// /** Public inspect_analysis_view input. */
// export const inspectAnalysisViewInputSchema = z.strictObject({
//   source: analysisViewSourceSchema,
//   view: analysisViewRequestSchema,
// });
//
// const coverageSchema = z.strictObject({
//   status: z.enum(["complete-within-view", "page", "empty"]),
//   examined: z.number().int().nonnegative(),
//   total: z.number().int().nonnegative(),
//   next_offset: z.number().int().nonnegative().nullable(),
//   exhausted: z.boolean(),
// });
//
// const artifactSchema = z.strictObject({
//   path: z
//     .string()
//     .describe("Exact recorded artifact path, including an empty string."),
//   sha256: digestSchema.nullable(),
// });
//
// const layoutSummarySchema = z.strictObject({
//   bytes: z.number().int().nonnegative(),
//   format: z.literal("elf"),
//   architecture: z.strictObject({
//     machine: z.literal("EM_X86_64"),
//     bits: z.literal(64),
//     byte_order: z.literal("little"),
//   }),
//   image_type: z.enum(["ET_EXEC", "ET_DYN", "ET_REL"]),
//   entry: z.strictObject({
//     reported_value: z.string().min(1),
//     meaning: z.enum(["linked-virtual-address", "not-applicable", "absent"]),
//     execution_status: z.literal("unknown"),
//   }),
//   counts: z.strictObject({
//     sections: z.number().int().nonnegative(),
//     segments: z.number().int().nonnegative(),
//     symbols: z.number().int().nonnegative(),
//     relocations: z.number().int().nonnegative(),
//   }),
//   limitation_count: z.number().int().nonnegative(),
// });
//
// const javascriptSummarySchema = z.strictObject({
//   input_path: z.string().min(1),
//   format: z.enum(["asar", "directory"]),
//   root_artifact_sha256: digestSchema,
//   source_selection: javaScriptSourceSelectionSchema.exactOptional(),
//   statistics: jsonObjectSchema,
//   electron: jsonObjectSchema,
//   coverage: jsonObjectSchema,
//   limitation_count: z.number().int().nonnegative(),
// });
//
// const inventorySummarySchema = z.strictObject({
//   manifest: artifactGraphManifestSchema,
//   available_counts: z.strictObject({
//     nodes: z.number().int().nonnegative(),
//     occurrences: z.number().int().nonnegative(),
//     edges: z.number().int().nonnegative(),
//     integrity_contradictions: z.number().int().nonnegative(),
//   }),
//   observed_entry_kind_counts: z.strictObject({
//     file: z.number().int().nonnegative(),
//     directory: z.number().int().nonnegative(),
//     symlink: z.number().int().nonnegative(),
//     slice: z.number().int().nonnegative(),
//   }),
//   source_complete: z.boolean(),
//   inventory_evidence_ids: z.array(prefixedDigestSchema("ev")).min(1),
//   inspection: z
//     .strictObject({
//       coverage: artifactInspectionResultSchema.shape.coverage,
//       unexplored_branches:
//         artifactInspectionResultSchema.shape.unexplored_branches,
//     })
//     .nullable(),
//   limitation_count: z.number().int().nonnegative(),
// });
//
// const viewResultBase = {
//   parent_evidence_id: prefixedDigestSchema("ev"),
//   parent_operation: z.enum([
//     "inspect_binary_layout",
//     "analyze_javascript_application",
//     "analyze_function",
//     "inspect_artifact",
//     "inventory_artifact",
//     "inspect_wasm_artifact",
//     "inspect_macho",
//     "decode_interface_builder",
//     "inspect_evm_interface",
//     "inspect_managed_artifact",
//     "inspect_managed_members",
//     "inspect_web_network_capture",
//     "inspect_android_package",
//     "inspect_pcap_capture",
//     "inspect_dart_aot",
//   ]),
//   parent_digest: digestSchema,
//   view_digest: digestSchema,
//   artifact: artifactSchema,
//   coverage: coverageSchema,
//   limitations: z.array(z.string()),
//   unknowns: z.array(z.string()),
// } as const;
//
// const summaryViewResultBase = {
//   kind: z.literal("summary"),
//   view: summaryViewSchema,
//   ...viewResultBase,
// } as const;
//
// /** Summary `inspect_binary_layout` detail returns; no other view kind. */
// export const binaryLayoutSummaryViewResultSchema = z.strictObject({
//   ...summaryViewResultBase,
//   summary: layoutSummarySchema,
//   parent_operation: z.literal("inspect_binary_layout"),
// });
//
// /** Summary `analyze_javascript_application` detail returns; no other view kind. */
// export const javascriptApplicationSummaryViewResultSchema = z.strictObject({
//   ...summaryViewResultBase,
//   summary: javascriptSummarySchema,
//   parent_operation: z.literal("analyze_javascript_application"),
// });
//
// /** Typed reference page; full item observations remain available separately. */
// export const javascriptModuleReferencesViewResultSchema = z.strictObject({
//   ...viewResultBase,
//   kind: z.literal("javascript"),
//   view: javascriptModuleReferencesRequestSchema,
//   parent_operation: z.literal("analyze_javascript_application"),
//   rows: z.array(javascriptModuleReferenceSchema),
//   source_coverage: javascriptModuleSourceCoverageSchema,
// });
//
// /** Exact summary carrier for artifact inspection's optional delivery contract. */
// export const artifactInventorySummaryViewResultSchema = z.strictObject({
//   ...summaryViewResultBase,
//   parent_operation: z.enum(["inspect_artifact", "inventory_artifact"]),
//   summary: inventorySummarySchema,
// });
//
// /** Exact summary carrier for WASM inspection's optional delivery contract. */
// export const wasmArtifactSummaryViewResultSchema = z.strictObject({
//   ...summaryViewResultBase,
//   parent_operation: z.literal("inspect_wasm_artifact"),
//   summary: wasmSummarySchema,
// });
//
// /** Exact slice identity and collection counts for Mach-O's selected delivery. */
// export const machoSummaryViewResultSchema = z.strictObject({
//   ...summaryViewResultBase,
//   parent_operation: z.literal("inspect_macho"),
//   summary: machoSummarySchema,
// });
//
// /** Decoded documents and graph counts for Interface Builder's selected delivery. */
// export const interfaceBuilderSummaryViewResultSchema = z.strictObject({
//   ...summaryViewResultBase,
//   parent_operation: z.literal("decode_interface_builder"),
//   summary: interfaceBuilderSummarySchema,
// });
//
// /** Exact inferred-interface summary for EVM's caller-selected delivery. */
// export const evmInterfaceSummaryViewResultSchema = z.strictObject({
//   ...summaryViewResultBase,
//   parent_operation: z.literal("inspect_evm_interface"),
//   summary: evmSummarySchema,
// });
//
// /** Exact metadata overview for the managed artifact's selected delivery. */
// export const managedArtifactSummaryViewResultSchema = z.strictObject({
//   ...summaryViewResultBase,
//   parent_operation: z.literal("inspect_managed_artifact"),
//   summary: managedSummarySchema,
// });
export const _l = 219;
