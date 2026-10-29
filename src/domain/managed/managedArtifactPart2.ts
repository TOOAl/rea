export const __stub = 1;
//   name: z.string(),
//   flags: z.number().int().min(0).max(0xffff),
//   signature: managedSignatureSchema,
// });
//
// const managedExceptionRegionSchema = z.object({
//   flags: z.number().int().min(0).max(0xffff_ffff),
//   try_offset: z.number().int().min(0),
//   try_length: z.number().int().min(0),
//   handler_offset: z.number().int().min(0),
//   handler_length: z.number().int().min(0),
//   class_token: tokenSchema.nullable(),
//   filter_offset: z.number().int().min(0).nullable(),
// });
//
// const managedInstructionAnchorSchema = z.object({
//   il_offset: z.number().int().min(0),
//   opcode: z.string().min(1),
//   operand_kind: z.enum([
//     "none",
//     "branch",
//     "constant",
//     "field",
//     "method",
//     "signature",
//     "string",
//     "switch",
//     "token",
//     "type",
//     "variable",
//     "unknown",
//   ]),
//   operand: z.string().nullable(),
// });
//
// const managedMethodBodySchema = z.object({
//   status: z.enum(["present", "partial", "absent", "malformed"]),
//   header_format: z.enum(["tiny", "fat", "none", "unknown"]),
//   rva: z.number().int().min(0).max(0xffff_ffff),
//   file_offset: offsetSchema.nullable(),
//   max_stack: z.number().int().min(0).nullable(),
//   init_locals: z.boolean().nullable(),
//   local_var_sig_token: tokenSchema.nullable(),
//   il_size: z.number().int().min(0),
//   il_sha256: digestSchema
//     .nullable()
//     .describe(
//       "SHA-256 of exactly the raw il_size CIL bytes; excludes the method header, locals signature, alignment, and extra sections",
//     ),
//   normalized_il_sha256: digestSchema
//     .nullable()
//     .describe(
//       "Member-result-v1 SHA-256 of UTF-8 JSON [opcode, operand_kind, operand] tuples for a complete decode; retains build-local tokens, omits switch targets, and excludes headers, locals, and exception regions",
//     ),
//   instruction_count: z.number().int().min(0),
//   decoded_instruction_count: z.number().int().min(0),
//   truncated_instructions: z.number().int().min(0),
//   opcode_counts: z.record(z.string(), z.number().int().min(1)),
//   anchors: z.array(managedInstructionAnchorSchema),
//   exception_regions: z.array(managedExceptionRegionSchema),
//   issue: z.string().nullable(),
// });
//
// const managedMethodSchema = z.object({
//   token: tokenSchema,
//   row_offset: offsetSchema,
//   declaring_type_token: tokenSchema.nullable(),
//   declaring_type: z.string().nullable(),
//   name: z.string(),
//   rva: z.number().int().min(0).max(0xffff_ffff),
//   impl_flags: z.number().int().min(0).max(0xffff),
//   flags: z.number().int().min(0).max(0xffff),
//   signature: managedSignatureSchema,
//   body: managedMethodBodySchema,
// });
//
// // Declaring types are namespace-qualified like TypeDef `full_name`, nested
// // types keep bare names, and a generic instantiation names its generic type.
// // Evidence recorded before declaring types were named reads them as null.
// const declaringTypeNameSchema = z.string().nullable().default(null);
//
// const managedMemberReferenceSchema = z.object({
//   token: tokenSchema,
//   row_offset: offsetSchema,
//   parent_token: tokenSchema.nullable(),
//   parent_name: declaringTypeNameSchema.describe(
//     "Name of a TypeDef, TypeRef, or generic-instantiation TypeSpec parent; null for other parents or when unknown",
//   ),
//   name: z.string(),
//   signature: managedSignatureSchema,
// });
//
// const managedUserStringSchema = z.object({
//   token: tokenSchema,
//   offset: offsetSchema.describe("File offset of the #US item"),
//   value: z
//     .string()
//     .describe(
//       "Decoded UTF-16 code units, excluding the terminal flag byte; unpaired surrogates are kept",
//     ),
// });
//
// const managedModuleReferenceSchema = z.object({
//   token: tokenSchema,
//   row_offset: offsetSchema,
//   name: z.string(),
// });
//
// const managedNativeImportSchema = z.object({
//   token: tokenSchema,
//   row_offset: offsetSchema,
//   mapping_flags: z.number().int().min(0).max(0xffff),
//   mapping_flags_hex: z.string().regex(/^0x[0-9a-f]{4}$/u),
//   member_token: tokenSchema.nullable(),
//   member_kind: z.enum(["method", "field", "unknown"]),
//   member_name: z.string().nullable(),
//   import_name: z.string(),
//   import_scope_token: tokenSchema.nullable(),
//   import_scope_name: z.string().nullable(),
//   no_mangle: z.boolean(),
//   char_set: z.enum(["not-specified", "ansi", "unicode", "auto", "unknown"]),
//   call_convention: z.enum([
//     "not-specified",
//     "winapi",
//     "cdecl",
//     "stdcall",
//     "thiscall",
//     "fastcall",
//     "unknown",
//   ]),
//   supports_last_error: z.boolean(),
//   best_fit: z.enum(["assembly-default", "enabled", "disabled", "unknown"]),
//   throw_on_unmappable_char: z.enum([
//     "assembly-default",
//     "enabled",
//     "disabled",
//     "unknown",
//   ]),
//   verification: z.literal("managed-declaration-only"),
// });
//
// const managedNativeImplementationSchema = z.object({
//   token: tokenSchema,
//   row_offset: offsetSchema,
//   name: z.string(),
//   rva: z.number().int().min(0).max(0xffff_ffff),
//   flags: z.number().int().min(0).max(0xffff),
//   impl_flags: z.number().int().min(0).max(0xffff),
export const _l = 148;
