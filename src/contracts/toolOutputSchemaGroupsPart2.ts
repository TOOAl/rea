export const __stub = 1;
//   address_to_file_offset: evidenceResultOf(
//     z.object({
//       address: z.string(),
//       file_offset: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER),
//       provider_file_offset: z
//         .number()
//         .int()
//         .min(0)
//         .max(Number.MAX_SAFE_INTEGER)
//         .exactOptional()
//         .describe(
//           "Original coordinate returned by the provider's mapping API.",
//         ),
//       image_base_file_offset: z
//         .number()
//         .int()
//         .min(0)
//         .max(Number.MAX_SAFE_INTEGER)
//         .exactOptional()
//         .describe(
//           "File offset of the loaded image within its source container; zero for a thin executable.",
//         ),
//       source_path: z
//         .string()
//         .exactOptional()
//         .describe(
//           "Observed original executable path used to verify the file mapping.",
//         ),
//     }),
//   ),
//   procedure_references: evidenceResultOf(
//     z.object({
//       procedure: procedureIdentitySchema,
//       direction: z.enum(["incoming", "outgoing"]),
//       reference_kinds_available: z.boolean(),
//       unresolved_calls: z.array(unresolvedCallSchema),
//       references: z.array(referenceEdgeSchema),
//     }),
//   ),
//   procedure_pseudo_code: evidenceResultOf(nullableText),
//   resolve_containing_procedure: evidenceResultOf(containingProcedureResolution),
//   search_procedures: evidenceResultOf(
//     z.array(z.object({ address: z.string(), value: z.string() })),
//   ),
//   search_strings: evidenceResultOf(z.array(analysisStringSchema)),
//   set_address_name: evidenceResultOf(z.boolean()),
//   set_addresses_names: evidenceResultOf(z.record(z.string(), z.boolean())),
//   set_bookmark: evidenceResultOf(z.boolean()),
//   set_comment: evidenceResultOf(z.boolean()),
//   set_inline_comment: evidenceResultOf(z.boolean()),
//   unset_bookmark: evidenceResultOf(z.boolean()),
//   xrefs: evidenceResultOf(addressList),
// };
//
// const literalTraceOutput = evidenceResultOf(
//   z.object({
//     query: z.string(),
//     search_mode: z.literal("literal"),
//     matches: z.array(
//       z.object({
//         type: z.enum(["string", "procedure"]),
//         address: z.string(),
//         value: z.string(),
//       }),
//     ),
//     references: z.array(
//       z.object({
//         target_address: z.string(),
//         source_address: z.string(),
//         containing_procedure: containingProcedureResolution,
//       }),
//     ),
//     truncated: z.boolean(),
//     residual_unknowns: z.array(z.string()),
//   }),
// );
//
// const callPathTraceOutput = evidenceResultOf(
//   z.object({
//     start: z.string(),
//     goal: z.string().nullable(),
//     direction: z.enum(["forward", "backward"]),
//     goal_status: z.enum(["not_requested", "reached", "not_reached", "unknown"]),
//     nodes: z.array(
//       z.object({
//         address: z.string(),
//         depth: z.number().int().min(0),
//       }),
//     ),
//     edges: z.array(
//       z.object({
//         source_address: z.string(),
//         target_address: z.string(),
//         discovery_depth: z.number().int().min(1),
//       }),
//     ),
//     traversal_path: z.array(z.string()),
//     failures: z.array(
//       z.object({
//         address: z.string(),
//         error: analysisErrorProjectionSchema,
//       }),
//     ),
//     relationship_coverage: z.record(z.string(), relationshipCoverageSchema),
//     traversal: z.object({
//       nodes_visited: z.number().int().min(1),
//     }),
//     truncated: z.boolean(),
//     residual_unknowns: z.array(z.string()),
//     limitations: z.array(z.string()),
//   }),
// );
//
// /** Identity facts attached to one requested batch selector. */
// const batchProcedureIdentity = z.discriminatedUnion("status", [
//   z.object({
//     status: z.literal("resolved"),
//     address: z.string().min(1).describe("Observed canonical procedure entry."),
//     name: z
//       .string()
//       .nullable()
//       .describe("Provider's entry label, or null when unavailable."),
//     name_error: analysisErrorProjectionSchema.optional(),
//   }),
//   z.object({
//     status: z.literal("unknown"),
//     error: analysisErrorProjectionSchema,
//   }),
// ]);
//
// /** Exact structured-content schemas for composed analysis workflows. */
// export const enhancedOutputSchemas: Readonly<Record<string, z.ZodObject>> = {
//   inspect_native_dispatch_metadata: evidenceResultOf(
//     nativeDispatchMetadataResultSchema,
//   ),
//   trace_native_values: evidenceResultOf(nativeValueTraceSchema),
//   trace_native_ui_action: evidenceResultOf(nativeInvestigationTraceSchema),
//   get_objc_classes: symbolDiscoveryOutput("classes"),
//   get_objc_protocols: symbolDiscoveryOutput("protocols"),
//   batch_decompile: evidenceResultOf(
//     z.object({
//       items: z.array(
//         z.discriminatedUnion("status", [
//           z.object({
//             address: z
//               .string()
//               .describe("Original caller-selected symbol or address."),
//             procedure: batchProcedureIdentity,
//             status: z.literal("ok"),
//             pseudocode: z.string().min(1),
export const _l = 150;
