export const __stub = 1;
//   module: moduleIdentitySchema.nullable(),
//   assembly: assemblyIdentitySchema.nullable(),
//   target_frameworks: z.array(z.string()),
//   references: z.array(assemblyReferenceSchema),
//   resources: z.array(managedResourceSchema),
//   attributes: z.array(customAttributeSchema),
//   coverage: z.object({
//     state: z.enum(["complete", "partial", "unavailable"]),
//     issues: z.array(managedParseIssueSchema),
//   }),
//   limitations: z.array(z.string()),
// });
//
// /** Provider-neutral, execution-free metadata/signature/IL member inspection. */
// export const managedMemberInspectionSchema = z.object({
//   signature_resolution: z
//     .literal("type-names-v1")
//     .nullable()
//     .default(null)
//     .describe(
//       "Signature type-name resolution was examined, including unresolved operands; null means historical Evidence without this attestation.",
//     ),
//   artifact: z.object({
//     path: z.string().min(1),
//     sha256: digestSchema,
//     byte_length: z.number().int().min(0),
//     format: z.literal("pe"),
//   }),
//   module: moduleIdentitySchema.nullable(),
//   metadata: z.object({
//     status: z.enum(["absent", "complete", "partial", "malformed"]),
//     version: z.string().nullable(),
//     table_row_counts: z.record(
//       z.string(),
//       z.number().int().min(0).max(0xffff_ffff),
//     ),
//   }),
//   identity_scope: z.object({
//     token_identity: z.literal("build-local"),
//     requires_artifact_sha256: digestSchema,
//     requires_mvid: cliMetadataGuidSchema.nullable(),
//   }),
//   types: z.array(managedTypeSchema),
//   // Member Evidence recorded before NestedClass rows were read omits this
//   // field; null is historical uncertainty. False means a current NestedClass
//   // row was unreadable or invalid, not that no nested types exist.
//   nesting_read: z
//     .boolean()
//     .nullable()
//     .default(null)
//     .describe(
//       "Whether all NestedClass rows were read and valid. Null for historical Evidence; false means current nesting is incomplete. Individual name digests can remain unresolved for missing, cyclic or over-deep enclosing chains.",
//     ),
//   // Member Evidence recorded before ExportedType rows were read omits this
//   // field; null means the table was not examined, not that it was empty.
//   exported_types: z.array(managedExportedTypeSchema).nullable().default(null),
//   fields: z.array(managedFieldSchema),
//   methods: z.array(managedMethodSchema),
//   member_refs: z.array(managedMemberReferenceSchema),
//   call_edges: z.array(managedCallEdgeSchema),
//   field_accesses: z.array(managedFieldAccessSchema),
//   // Distinct #US literals loaded by ldstr in the inspected method bodies, in
//   // token order, with their own coverage: #US issues never enter the member
//   // coverage. null means they were not examined, not that there were none.
//   user_strings: z
//     .object({
//       state: z.enum(["complete", "partial"]),
//       literals: z.array(managedUserStringSchema),
//       issues: z.array(managedParseIssueSchema),
//     })
//     .nullable()
//     .default(null),
//   /** Caller-selected declaring types; null when every type was inspected. */
//   selection: z
//     .object({
//       type_names: z.array(z.string().min(1)).min(1),
//       unmatched_type_names: z.array(z.string().min(1)),
//     })
//     .nullable()
//     .default(null),
//   coverage: z.object({
//     state: z.enum(["complete", "partial", "unavailable"]),
//     issues: z.array(managedParseIssueSchema),
//   }),
//   limitations: z.array(z.string()),
// });
//
// /** Provider-neutral managed/native boundary observations from PE/CLI metadata. */
// export const managedNativeBoundaryInspectionSchema = z.object({
//   artifact: z.object({
//     path: z.string().min(1),
//     sha256: digestSchema,
//     byte_length: z.number().int().min(0),
//     format: z.literal("pe"),
//   }),
//   module: moduleIdentitySchema.nullable(),
//   metadata: z.object({
//     status: z.enum(["absent", "complete", "partial", "malformed"]),
//     version: z.string().nullable(),
//     table_row_counts: z.record(
//       z.string(),
//       z.number().int().min(0).max(0xffff_ffff),
//     ),
//   }),
//   identity_scope: z.object({
//     token_identity: z.literal("build-local"),
//     requires_artifact_sha256: digestSchema,
//     requires_mvid: cliMetadataGuidSchema.nullable(),
//   }),
//   cli_native: z
//     .object({
//       il_only: z.boolean(),
//       requires_32bit: z.boolean(),
//       strong_name_signed: z.boolean(),
//       native_entry_point: z.boolean(),
//       ready_to_run_signature: z.boolean(),
//       managed_native_header_rva: z.number().int().min(0).max(0xffff_ffff),
//       managed_native_header_size: z.number().int().min(0).max(0xffff_ffff),
//     })
//     .nullable(),
//   module_refs: z.array(managedModuleReferenceSchema),
//   pinvoke_imports: z.array(managedNativeImportSchema),
//   native_implementations: z.array(managedNativeImplementationSchema),
//   summary: z.object({
//     module_ref_count: z.number().int().min(0),
//     pinvoke_import_count: z.number().int().min(0),
//     native_implementation_count: z.number().int().min(0),
//     ready_to_run: z.boolean().nullable(),
//     mixed_mode_or_native_header: z.boolean().nullable(),
//   }),
//   coverage: z.object({
//     state: z.enum(["complete", "partial", "unavailable"]),
//     issues: z.array(managedParseIssueSchema),
//   }),
//   limitations: z.array(z.string()),
// });
//
// export type ManagedArtifactInspection = z.infer<
//   typeof managedArtifactInspectionSchema
// >;
// export type ManagedMemberInspection = z.infer<
//   typeof managedMemberInspectionSchema
// >;
// export type ManagedNativeBoundaryInspection = z.infer<
//   typeof managedNativeBoundaryInspectionSchema
// >;
// export type ManagedParseIssue = z.infer<typeof managedParseIssueSchema>;
export const _l = 147;
