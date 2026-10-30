import { z } from "zod";
import { digestSchema } from "../digests.js";

const tokenSchema = z.string().regex(/^0x[0-9a-f]{8}$/u);
const offsetSchema = z.number().int().min(0);

/** A 16-byte CLI metadata GUID without RFC 4122 version/variant restrictions. */
export const cliMetadataGuidSchema = z
  .string()
  .regex(/^[0-9a-fA-F]{8}(?:-[0-9a-fA-F]{4}){3}-[0-9a-fA-F]{12}$/u);

const publicKeyIdentitySchema = z.object({
  kind: z.enum(["none", "public-key", "public-key-token"]),
  byte_length: z.number().int().min(0),
  sha256: digestSchema.nullable(),
  token: z
    .string()
    .regex(/^[a-f0-9]{16}$/u)
    .nullable(),
});

const assemblyIdentitySchema = z.object({
  name: z.string(),
  version: z.string().regex(/^\d+\.\d+\.\d+\.\d+$/u),
  culture: z.string().nullable(),
  flags: z.number().int().min(0).max(0xffff_ffff),
  hash_algorithm: z.number().int().min(0).max(0xffff_ffff),
  public_key: publicKeyIdentitySchema,
  token: tokenSchema,
  row_offset: offsetSchema,
});

const moduleIdentitySchema = z.object({
  name: z.string(),
  generation: z.number().int().min(0).max(0xffff),
  mvid: cliMetadataGuidSchema.nullable(),
  enc_id: cliMetadataGuidSchema.nullable(),
  enc_base_id: cliMetadataGuidSchema.nullable(),
  token: tokenSchema,
  row_offset: offsetSchema,
});

const assemblyReferenceSchema = z.object({
  name: z.string(),
  version: z.string().regex(/^\d+\.\d+\.\d+\.\d+$/u),
  culture: z.string().nullable(),
  flags: z.number().int().min(0).max(0xffff_ffff),
  public_key_or_token: publicKeyIdentitySchema,
  hash_value_sha256: digestSchema.nullable(),
  hash_value_length: z.number().int().min(0),
  token: tokenSchema,
  row_offset: offsetSchema,
});

const managedResourceSchema = z.object({
  name: z.string(),
  flags: z.number().int().min(0).max(0xffff_ffff),
  visibility: z.enum(["public", "private", "unknown"]),
  implementation_token: tokenSchema.nullable(),
  embedded: z.boolean(),
  declared_offset: z.number().int().min(0).max(0xffff_ffff),
  data_length: z.number().int().min(0).nullable(),
  data_sha256: digestSchema.nullable(),
  token: tokenSchema,
  row_offset: offsetSchema,
});

const customAttributeSchema = z.object({
  parent_token: tokenSchema,
  constructor_token: tokenSchema.nullable(),
  type_name: z.string().nullable(),
  value_length: z.number().int().min(0),
  value_sha256: digestSchema,
  decoded_fixed_string: z.string().nullable(),
  token: tokenSchema,
  row_offset: offsetSchema,
});

const managedSignatureSchema = z.object({
  raw_length: z.number().int().min(0),
  raw_sha256: digestSchema,
  // Evidence recorded before this field existed reads back as null.
  resolved_sha256: digestSchema
    .nullable()
    .default(null)
    .describe(
      "SHA-256 of the raw signature with each TypeDef or TypeRef operand replaced by that type's namespace-qualified name; equals raw_sha256 when the signature names no types. Unlike raw_sha256 it does not depend on build-local metadata rows. Null when the signature could not be decoded or names a type REA could not resolve, such as a TypeSpec.",
    ),
  kind: z.enum(["method", "field", "unknown"]),
  parse_status: z.enum(["decoded", "partial", "unsupported", "malformed"]),
  calling_convention: z.string().nullable(),
  generic_parameter_count: z.number().int().min(0).nullable(),
  parameter_count: z.number().int().min(0).nullable(),
  return_type: z.string().nullable(),
  parameter_types: z.array(z.string()),
  field_type: z.string().nullable(),
  issue: z.string().nullable(),
});

const managedTypeSchema = z.object({
  token: tokenSchema,
  row_offset: offsetSchema,
  namespace: z.string(),
  name: z.string(),
  full_name: z.string(),
  name_sha256: digestSchema
    .nullable()
    .default(null)
    .describe(
      "Framed nominal namespace/name/enclosing-name digest, independent of build-local rows. Null for historical Evidence or unresolved nesting; defining assemblies and CLR runtime identity are not established.",
    ),
  flags: z.number().int().min(0).max(0xffff_ffff),
  extends_token: tokenSchema.nullable(),
  enclosing_type_token: tokenSchema
    .nullable()
    .default(null)
    .describe(
      "Observed enclosing TypeDef from NestedClass; null when no enclosing entry was available, which alone does not establish top-level identity.",
    ),
  field_list: z.object({
    first_row: z.number().int().min(1).nullable(),
    last_row: z.number().int().min(0).nullable(),
    count: z.number().int().min(0),
  }),
  method_list: z.object({
    first_row: z.number().int().min(1).nullable(),
    last_row: z.number().int().min(0).nullable(),
    count: z.number().int().min(0),
  }),
});

/** One ExportedType row: a type this assembly exports from another module or forwards. */
const managedExportedTypeSchema = z.object({
  token: tokenSchema,
  row_offset: offsetSchema,
  namespace: z.string(),
  name: z.string(),
  flags: z.number().int().min(0).max(0xffff_ffff),
  forwarder: z.boolean(),
  type_def_id: z.number().int().min(0).max(0xffff_ffff),
  implementation_token: tokenSchema.nullable(),
});

const managedFieldSchema = z.object({
  token: tokenSchema,
  row_offset: offsetSchema,
  declaring_type_token: tokenSchema.nullable(),
  declaring_type: z.string().nullable(),
  name: z.string(),
  flags: z.number().int().min(0).max(0xffff),
  signature: managedSignatureSchema,
});

const managedExceptionRegionSchema = z.object({
  flags: z.number().int().min(0).max(0xffff_ffff),
  try_offset: z.number().int().min(0),
  try_length: z.number().int().min(0),
  handler_offset: z.number().int().min(0),
  handler_length: z.number().int().min(0),
  class_token: tokenSchema.nullable(),
  filter_offset: z.number().int().min(0).nullable(),
});

const managedInstructionAnchorSchema = z.object({
  il_offset: z.number().int().min(0),
  opcode: z.string().min(1),
  operand_kind: z.enum([
    "none",
    "branch",
    "constant",
    "field",
    "method",
    "signature",
    "string",
    "switch",
    "token",
    "type",
    "variable",
    "unknown",
  ]),
  operand: z.string().nullable(),
});

const managedMethodBodySchema = z.object({
  status: z.enum(["present", "partial", "absent", "malformed"]),
  header_format: z.enum(["tiny", "fat", "none", "unknown"]),
  rva: z.number().int().min(0).max(0xffff_ffff),
  file_offset: offsetSchema.nullable(),
  max_stack: z.number().int().min(0).nullable(),
  init_locals: z.boolean().nullable(),
  local_var_sig_token: tokenSchema.nullable(),
  il_size: z.number().int().min(0),
  il_sha256: digestSchema
    .nullable()
    .describe(
      "SHA-256 of exactly the raw il_size CIL bytes; excludes the method header, locals signature, alignment, and extra sections",
    ),
  normalized_il_sha256: digestSchema
    .nullable()
    .describe(
      "Member-result-v1 SHA-256 of UTF-8 JSON [opcode, operand_kind, operand] tuples for a complete decode; retains build-local tokens, omits switch targets, and excludes headers, locals, and exception regions",
    ),
  instruction_count: z.number().int().min(0),
  decoded_instruction_count: z.number().int().min(0),
  truncated_instructions: z.number().int().min(0),
  opcode_counts: z.record(z.string(), z.number().int().min(1)),
  anchors: z.array(managedInstructionAnchorSchema),
  exception_regions: z.array(managedExceptionRegionSchema),
  issue: z.string().nullable(),
});

const managedMethodSchema = z.object({
  token: tokenSchema,
  row_offset: offsetSchema,
  declaring_type_token: tokenSchema.nullable(),
  declaring_type: z.string().nullable(),
  name: z.string(),
  rva: z.number().int().min(0).max(0xffff_ffff),
  impl_flags: z.number().int().min(0).max(0xffff),
  flags: z.number().int().min(0).max(0xffff),
  signature: managedSignatureSchema,
  body: managedMethodBodySchema,
});

// Declaring types are namespace-qualified like TypeDef `full_name`, nested
// types keep bare names, and a generic instantiation names its generic type.
// Evidence recorded before declaring types were named reads them as null.
const declaringTypeNameSchema = z.string().nullable().default(null);

const managedMemberReferenceSchema = z.object({
  token: tokenSchema,
  row_offset: offsetSchema,
  parent_token: tokenSchema.nullable(),
  parent_name: declaringTypeNameSchema.describe(
    "Name of a TypeDef, TypeRef, or generic-instantiation TypeSpec parent; null for other parents or when unknown",
  ),
  name: z.string(),
  signature: managedSignatureSchema,
});

const managedUserStringSchema = z.object({
  token: tokenSchema,
  offset: offsetSchema.describe("File offset of the #US item"),
  value: z
    .string()
    .describe(
      "Decoded UTF-16 code units, excluding the terminal flag byte; unpaired surrogates are kept",
    ),
});

const managedModuleReferenceSchema = z.object({
  token: tokenSchema,
  row_offset: offsetSchema,
  name: z.string(),
});

const managedNativeImportSchema = z.object({
  token: tokenSchema,
  row_offset: offsetSchema,
  mapping_flags: z.number().int().min(0).max(0xffff),
  mapping_flags_hex: z.string().regex(/^0x[0-9a-f]{4}$/u),
  member_token: tokenSchema.nullable(),
  member_kind: z.enum(["method", "field", "unknown"]),
  member_name: z.string().nullable(),
  import_name: z.string(),
  import_scope_token: tokenSchema.nullable(),
  import_scope_name: z.string().nullable(),
  no_mangle: z.boolean(),
  char_set: z.enum(["not-specified", "ansi", "unicode", "auto", "unknown"]),
  call_convention: z.enum([
    "not-specified",
    "winapi",
    "cdecl",
    "stdcall",
    "thiscall",
    "fastcall",
    "unknown",
  ]),
  supports_last_error: z.boolean(),
  best_fit: z.enum(["assembly-default", "enabled", "disabled", "unknown"]),
  throw_on_unmappable_char: z.enum([
    "assembly-default",
    "enabled",
    "disabled",
    "unknown",
  ]),
  verification: z.literal("managed-declaration-only"),
});

const managedNativeImplementationSchema = z.object({
  token: tokenSchema,
  row_offset: offsetSchema,
  name: z.string(),
  rva: z.number().int().min(0).max(0xffff_ffff),
  flags: z.number().int().min(0).max(0xffff),
  impl_flags: z.number().int().min(0).max(0xffff),
  code_type: z.enum(["il", "native", "optil", "runtime", "unknown"]),
  managed_kind: z.enum(["managed", "unmanaged", "unknown"]),
  pinvoke_declared: z.boolean(),
  boundary_kind: z.enum([
    "pinvoke",
    "native-body",
    "runtime-provided",
    "unmanaged-method",
    "mixed-or-unknown",
  ]),
  body_interpretation: z.enum([
    "managed-cil",
    "native-or-runtime",
    "not-file-backed",
    "unknown",
  ]),
});

const managedCallEdgeSchema = z.object({
  caller_token: tokenSchema,
  caller: z.string().nullable(),
  opcode: z.string(),
  target_token: tokenSchema,
  target_kind: z.enum(["method-def", "member-ref", "method-spec", "unknown"]),
  target_name: z
    .string()
    .nullable()
    .describe("Method name; a method-spec target reports its generic method"),
  target_declaring_type: declaringTypeNameSchema.describe(
    "Declaring type of the called method; null when unknown",
  ),
});

const managedFieldAccessSchema = z.object({
  method_token: tokenSchema,
  method: z.string().nullable(),
  opcode: z.string(),
  field_token: tokenSchema,
  field_name: z.string().nullable(),
  field_declaring_type: declaringTypeNameSchema.describe(
    "Declaring type of the accessed field; null when unknown",
  ),
});

const managedParseIssueSchema = z.object({
  code: z.enum([
    "resource-limit",
    "invalid-cli-header",
    "invalid-directory",
    "invalid-metadata-root",
    "invalid-stream",
    "missing-stream",
    "invalid-tables",
    "invalid-row",
    "invalid-heap-index",
    "invalid-string",
    "invalid-blob",
    "unsupported-signature",
    "invalid-guid",
    "invalid-resource",
  ]),
  scope: z.string().min(1),
  offset: offsetSchema.nullable(),
  detail: z.string().min(1),
});

/** Provider-neutral, execution-free PE/CLI triage and identity result. */
