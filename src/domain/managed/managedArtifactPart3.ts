export const __stub = 1;
//   code_type: z.enum(["il", "native", "optil", "runtime", "unknown"]),
//   managed_kind: z.enum(["managed", "unmanaged", "unknown"]),
//   pinvoke_declared: z.boolean(),
//   boundary_kind: z.enum([
//     "pinvoke",
//     "native-body",
//     "runtime-provided",
//     "unmanaged-method",
//     "mixed-or-unknown",
//   ]),
//   body_interpretation: z.enum([
//     "managed-cil",
//     "native-or-runtime",
//     "not-file-backed",
//     "unknown",
//   ]),
// });
//
// const managedCallEdgeSchema = z.object({
//   caller_token: tokenSchema,
//   caller: z.string().nullable(),
//   opcode: z.string(),
//   target_token: tokenSchema,
//   target_kind: z.enum(["method-def", "member-ref", "method-spec", "unknown"]),
//   target_name: z
//     .string()
//     .nullable()
//     .describe("Method name; a method-spec target reports its generic method"),
//   target_declaring_type: declaringTypeNameSchema.describe(
//     "Declaring type of the called method; null when unknown",
//   ),
// });
//
// const managedFieldAccessSchema = z.object({
//   method_token: tokenSchema,
//   method: z.string().nullable(),
//   opcode: z.string(),
//   field_token: tokenSchema,
//   field_name: z.string().nullable(),
//   field_declaring_type: declaringTypeNameSchema.describe(
//     "Declaring type of the accessed field; null when unknown",
//   ),
// });
//
// const managedParseIssueSchema = z.object({
//   code: z.enum([
//     "resource-limit",
//     "invalid-cli-header",
//     "invalid-directory",
//     "invalid-metadata-root",
//     "invalid-stream",
//     "missing-stream",
//     "invalid-tables",
//     "invalid-row",
//     "invalid-heap-index",
//     "invalid-string",
//     "invalid-blob",
//     "unsupported-signature",
//     "invalid-guid",
//     "invalid-resource",
//   ]),
//   scope: z.string().min(1),
//   offset: offsetSchema.nullable(),
//   detail: z.string().min(1),
// });
//
// /** Provider-neutral, execution-free PE/CLI triage and identity result. */
// export const managedArtifactInspectionSchema = z.object({
//   artifact: z.object({
//     path: z.string().min(1),
//     sha256: digestSchema,
//     byte_length: z.number().int().min(0),
//     format: z.literal("pe"),
//   }),
//   pe: z.object({
//     machine: z.number().int().min(0).max(0xffff),
//     machine_hex: z.string().regex(/^0x[0-9a-f]{4}$/u),
//     architecture: z.enum(["x86", "x86_64", "arm", "arm64"]),
//     optional_header: z.enum(["pe32", "pe32-plus"]),
//     section_count: z.number().int().min(1).max(0xffff),
//     characteristics: z.number().int().min(0).max(0xffff),
//     cli: z
//       .object({
//         header_offset: offsetSchema,
//         header_size: z.number().int().min(72),
//         runtime_version: z.string(),
//         flags: z.number().int().min(0).max(0xffff_ffff),
//         flag_names: z.array(z.string()),
//         entry_point: z.object({
//           kind: z.enum(["metadata-token", "native-rva", "none"]),
//           value: z.string().nullable(),
//         }),
//         metadata_rva: z.number().int().min(1).max(0xffff_ffff),
//         metadata_size: z.number().int().min(1).max(0xffff_ffff),
//         resources_rva: z.number().int().min(0).max(0xffff_ffff),
//         resources_size: z.number().int().min(0).max(0xffff_ffff),
//         strong_name_rva: z.number().int().min(0).max(0xffff_ffff),
//         strong_name_size: z.number().int().min(0).max(0xffff_ffff),
//         managed_native_header_rva: z.number().int().min(0).max(0xffff_ffff),
//         managed_native_header_size: z.number().int().min(0).max(0xffff_ffff),
//         ready_to_run_signature: z.boolean(),
//       })
//       .nullable(),
//   }),
//   classification: z.object({
//     status: z.enum(["managed", "not-managed", "malformed"]),
//     container: z.literal("pe"),
//     runtime_family: z.enum([
//       "dotnet-framework",
//       "modern-dotnet",
//       "unity-mono",
//       "mixed-clr-native",
//       "unknown",
//     ]),
//     implementation: z.enum([
//       "cil",
//       "cil-and-ready-to-run",
//       "cpp-cli-mixed",
//       "metadata-only",
//       "not-managed",
//       "unknown",
//     ]),
//     managed_architecture: z.enum([
//       "anycpu",
//       "anycpu-prefer-32",
//       "x86",
//       "x86_64",
//       "arm",
//       "arm64",
//       "unknown",
//     ]),
//     evidence: z.array(
//       z.object({
//         code: z.string().min(1),
//         detail: z.string().min(1),
//         file_offset: offsetSchema.nullable(),
//       }),
//     ),
//   }),
//   metadata: z.object({
//     status: z.enum(["absent", "complete", "partial", "malformed"]),
//     version: z.string().nullable(),
//     stream_names: z.array(z.string()),
//     table_row_counts: z.record(
//       z.string(),
//       z.number().int().min(0).max(0xffff_ffff),
//     ),
//   }),
export const _l = 148;
