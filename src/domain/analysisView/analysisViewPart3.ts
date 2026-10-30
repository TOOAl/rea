export const __stub = 1;
//
// /** Exact member selection, coverage and counts for the selected delivery. */
// export const managedMemberSummaryViewResultSchema = z.strictObject({
//   ...summaryViewResultBase,
//   parent_operation: z.literal("inspect_managed_members"),
//   summary: managedMemberSummarySchema,
// });
//
// /** Exact historical capture summary, with no body or member-inventory payload. */
// export const webNetworkCaptureSummaryViewResultSchema = z.strictObject({
//   ...summaryViewResultBase,
//   parent_operation: z.literal("inspect_web_network_capture"),
//   summary: captureSummarySchema,
// });
//
// /** Exact package declarations with retained decoded manifest text. */
// export const androidPackageSummaryViewResultSchema = z.strictObject({
//   ...summaryViewResultBase,
//   parent_operation: z.literal("inspect_android_package"),
//   summary: androidPackageSummarySchema,
// });
//
// export const pcapCaptureSummaryViewResultSchema = z.strictObject({
//   ...summaryViewResultBase,
//   parent_operation: z.literal("inspect_pcap_capture"),
//   summary: pcapSummarySchema,
// });
//
// /** Exact snapshot and pool-coverage carrier for selected AOT delivery. */
// export const dartAotSummaryViewResultSchema = z.strictObject({
//   ...summaryViewResultBase,
//   parent_operation: z.literal("inspect_dart_aot"),
//   summary: dartAotSummarySchema,
// });
//
// /** Projected facts for one selected view of retained analysis Evidence. */
// export const analysisViewResultSchema = z.discriminatedUnion("kind", [
//   z.strictObject({
//     ...viewResultBase,
//     ...apiSurfaceFields,
//     kind: z.literal("api-surface"),
//     parent_operation: z.literal("inspect_web_network_capture"),
//     view: apiSurfaceViewSchema,
//     artifact: z.strictObject({
//       path: z.string(),
//       sha256: digestSchema.nullable(),
//     }),
//   }),
//   z.strictObject({
//     ...summaryViewResultBase,
//     summary: z.union([
//       layoutSummarySchema,
//       javascriptSummarySchema,
//       inventorySummarySchema,
//       wasmSummarySchema,
//       machoSummarySchema,
//       interfaceBuilderSummarySchema,
//       evmSummarySchema,
//       managedSummarySchema,
//       managedMemberSummarySchema,
//       captureSummarySchema,
//       androidPackageSummarySchema,
//       pcapSummarySchema,
//       dartAotSummarySchema,
//     ]),
//   }),
//   z.strictObject({
//     kind: z.literal("capture"),
//     view: captureViewRequestSchema,
//     items: captureViewItemsSchema,
//     ...viewResultBase,
//     parent_operation: z.literal("inspect_web_network_capture"),
//   }),
//   z.strictObject({
//     kind: z.literal("qlog"),
//     view: qlogViewRequestSchema,
//     page: qlogViewPageSchema,
//     context: qlogViewContextSchema,
//     ...viewResultBase,
//     parent_operation: z.literal("inspect_web_network_capture"),
//   }),
//   z.strictObject({
//     kind: z.literal("pcap"),
//     view: pcapViewRequestSchema,
//     page: pcapViewPageSchema,
//     source_coverage: z.enum(["complete", "partial"]),
//     ...viewResultBase,
//     parent_operation: z.literal("inspect_pcap_capture"),
//   }),
//   z.strictObject({
//     kind: z.literal("facet"),
//     view: facetViewSchema,
//     facet: jsonValueSchema,
//     ...viewResultBase,
//   }),
//   z.strictObject({
//     kind: z.literal("item"),
//     view: itemViewSchema,
//     item: jsonValueSchema,
//     ...viewResultBase,
//   }),
//   z.strictObject({
//     kind: z.literal("page"),
//     view: pageViewSchema,
//     items: z.array(jsonValueSchema),
//     ...viewResultBase,
//   }),
//   javascriptModuleReferencesViewResultSchema,
//   z.strictObject({
//     kind: z.literal("native"),
//     view: nativeViewSchema,
//     procedure_address: z.string().nullable(),
//     item: jsonValueSchema,
//     ...viewResultBase,
//   }),
//   z.strictObject({
//     kind: z.literal("wasm"),
//     view: wasmViewRequestSchema,
//     item: wasmViewItemSchema,
//     ...viewResultBase,
//   }),
//   z.strictObject({
//     kind: z.literal("macho"),
//     view: machoViewRequestSchema,
//     item: machoViewItemSchema,
//     ...viewResultBase,
//     ...machoViewContextSchema.shape,
//     parent_operation: z.literal("inspect_macho"),
//   }),
//   z.strictObject({
//     kind: z.literal("interface-builder"),
//     view: interfaceBuilderViewRequestSchema,
//     items: interfaceBuilderViewItemsSchema,
//     ...viewResultBase,
//     ...interfaceBuilderViewContextSchema.shape,
//     parent_operation: z.literal("decode_interface_builder"),
//   }),
//   z.strictObject({
//     kind: z.literal("evm"),
//     view: evmViewRequestSchema,
//     item: evmViewItemSchema,
//     ...viewResultBase,
//     parent_operation: z.literal("inspect_evm_interface"),
//   }),
//   z.strictObject({
//     kind: z.literal("managed"),
//     view: managedViewRequestSchema,
//     item: managedViewItemSchema,
//     ...viewResultBase,
//     ...managedViewContextSchema.shape,
//     parent_operation: z.literal("inspect_managed_artifact"),
//   }),
//   z.strictObject({
//     kind: z.literal("managed-members"),
//     view: managedMembersViewRequestSchema,
//     page: managedMembersViewPageSchema,
//     ...viewResultBase,
//     ...managedMembersViewContextSchema.shape,
//     parent_operation: z.literal("inspect_managed_members"),
//   }),
//   z.strictObject({
//     kind: z.literal("android"),
//     view: androidViewRequestSchema,
//     item: androidManifestViewItemSchema,
//     ...viewResultBase,
//     parent_operation: z.literal("inspect_android_package"),
//   }),
//   z.strictObject({
//     kind: z.literal("dart-aot"),
//     view: dartAotViewRequestSchema,
//     items: z.array(z.string()),
//     ...viewResultBase,
//     ...dartAotViewContextSchema.shape,
//     parent_operation: z.literal("inspect_dart_aot"),
//   }),
//   z.strictObject({
//     kind: z.literal("inventory"),
//     view: inventoryViewSchema,
//     manifest: artifactGraphManifestSchema,
//     inventory_evidence_ids: z.array(prefixedDigestSchema("ev")).min(1),
//     source_complete: z.boolean(),
//     items: z.array(
//       z.union([
//         artifactNodeSchema,
//         artifactOccurrenceSchema,
//         artifactEdgeSchema,
//         integrityContradictionSchema,
//       ]),
//     ),
//     ...viewResultBase,
//   }),
// ]);
//
// export type AnalysisViewRequest = z.output<typeof analysisViewRequestSchema>;
// export type InspectAnalysisViewInput = z.output<
//   typeof inspectAnalysisViewInputSchema
// >;
// export type AnalysisViewResult = z.output<typeof analysisViewResultSchema>;
// export type AnalysisViewCoverage = z.output<typeof coverageSchema>;
//
// /** Parent record already resolved from inline Evidence or a session reference. */
// export interface AnalysisViewParent {
//   readonly evidenceId: string;
//   readonly operation: string;
//   readonly normalizedResult: unknown;
//   /** The owner proved normalizedResult belongs to a sealed, deep-frozen Evidence snapshot. */
//   readonly sealedResult?: boolean;
//   /** Preserve the authenticated source identity, including explicit absence. */
//   readonly subject?: Evidence["subject"];
//   readonly limitations: readonly string[];
//   readonly artifact?: { readonly path: string; readonly sha256: string } | null;
//   /** Parent Evidence parameters, when the parent operation records them. */
//   readonly parameters?: unknown;
// }
//
// /** View payload before the content digest is attached. */
// export type UnsignedAnalysisView =
//   | Omit<
//       Extract<AnalysisViewResult, { readonly kind: "api-surface" }>,
export const _l = 219;
