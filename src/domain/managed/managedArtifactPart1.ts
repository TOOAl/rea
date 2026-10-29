export const __stub = 1;
// import { z } from "zod";
// import { digestSchema } from "../digests.js";
//
// const tokenSchema = z.string().regex(/^0x[0-9a-f]{8}$/u);
// const offsetSchema = z.number().int().min(0);
//
// /** A 16-byte CLI metadata GUID without RFC 4122 version/variant restrictions. */
// export const cliMetadataGuidSchema = z
//   .string()
//   .regex(/^[0-9a-fA-F]{8}(?:-[0-9a-fA-F]{4}){3}-[0-9a-fA-F]{12}$/u);
//
// const publicKeyIdentitySchema = z.object({
//   kind: z.enum(["none", "public-key", "public-key-token"]),
//   byte_length: z.number().int().min(0),
//   sha256: digestSchema.nullable(),
//   token: z
//     .string()
//     .regex(/^[a-f0-9]{16}$/u)
//     .nullable(),
// });
//
// const assemblyIdentitySchema = z.object({
//   name: z.string(),
//   version: z.string().regex(/^\d+\.\d+\.\d+\.\d+$/u),
//   culture: z.string().nullable(),
//   flags: z.number().int().min(0).max(0xffff_ffff),
//   hash_algorithm: z.number().int().min(0).max(0xffff_ffff),
//   public_key: publicKeyIdentitySchema,
//   token: tokenSchema,
//   row_offset: offsetSchema,
// });
//
// const moduleIdentitySchema = z.object({
//   name: z.string(),
//   generation: z.number().int().min(0).max(0xffff),
//   mvid: cliMetadataGuidSchema.nullable(),
//   enc_id: cliMetadataGuidSchema.nullable(),
//   enc_base_id: cliMetadataGuidSchema.nullable(),
//   token: tokenSchema,
//   row_offset: offsetSchema,
// });
//
// const assemblyReferenceSchema = z.object({
//   name: z.string(),
//   version: z.string().regex(/^\d+\.\d+\.\d+\.\d+$/u),
//   culture: z.string().nullable(),
//   flags: z.number().int().min(0).max(0xffff_ffff),
//   public_key_or_token: publicKeyIdentitySchema,
//   hash_value_sha256: digestSchema.nullable(),
//   hash_value_length: z.number().int().min(0),
//   token: tokenSchema,
//   row_offset: offsetSchema,
// });
//
// const managedResourceSchema = z.object({
//   name: z.string(),
//   flags: z.number().int().min(0).max(0xffff_ffff),
//   visibility: z.enum(["public", "private", "unknown"]),
//   implementation_token: tokenSchema.nullable(),
//   embedded: z.boolean(),
//   declared_offset: z.number().int().min(0).max(0xffff_ffff),
//   data_length: z.number().int().min(0).nullable(),
//   data_sha256: digestSchema.nullable(),
//   token: tokenSchema,
//   row_offset: offsetSchema,
// });
//
// const customAttributeSchema = z.object({
//   parent_token: tokenSchema,
//   constructor_token: tokenSchema.nullable(),
//   type_name: z.string().nullable(),
//   value_length: z.number().int().min(0),
//   value_sha256: digestSchema,
//   decoded_fixed_string: z.string().nullable(),
//   token: tokenSchema,
//   row_offset: offsetSchema,
// });
//
// const managedSignatureSchema = z.object({
//   raw_length: z.number().int().min(0),
//   raw_sha256: digestSchema,
//   // Evidence recorded before this field existed reads back as null.
//   resolved_sha256: digestSchema
//     .nullable()
//     .default(null)
//     .describe(
//       "SHA-256 of the raw signature with each TypeDef or TypeRef operand replaced by that type's namespace-qualified name; equals raw_sha256 when the signature names no types. Unlike raw_sha256 it does not depend on build-local metadata rows. Null when the signature could not be decoded or names a type REA could not resolve, such as a TypeSpec.",
//     ),
//   kind: z.enum(["method", "field", "unknown"]),
//   parse_status: z.enum(["decoded", "partial", "unsupported", "malformed"]),
//   calling_convention: z.string().nullable(),
//   generic_parameter_count: z.number().int().min(0).nullable(),
//   parameter_count: z.number().int().min(0).nullable(),
//   return_type: z.string().nullable(),
//   parameter_types: z.array(z.string()),
//   field_type: z.string().nullable(),
//   issue: z.string().nullable(),
// });
//
// const managedTypeSchema = z.object({
//   token: tokenSchema,
//   row_offset: offsetSchema,
//   namespace: z.string(),
//   name: z.string(),
//   full_name: z.string(),
//   name_sha256: digestSchema
//     .nullable()
//     .default(null)
//     .describe(
//       "Framed nominal namespace/name/enclosing-name digest, independent of build-local rows. Null for historical Evidence or unresolved nesting; defining assemblies and CLR runtime identity are not established.",
//     ),
//   flags: z.number().int().min(0).max(0xffff_ffff),
//   extends_token: tokenSchema.nullable(),
//   enclosing_type_token: tokenSchema
//     .nullable()
//     .default(null)
//     .describe(
//       "Observed enclosing TypeDef from NestedClass; null when no enclosing entry was available, which alone does not establish top-level identity.",
//     ),
//   field_list: z.object({
//     first_row: z.number().int().min(1).nullable(),
//     last_row: z.number().int().min(0).nullable(),
//     count: z.number().int().min(0),
//   }),
//   method_list: z.object({
//     first_row: z.number().int().min(1).nullable(),
//     last_row: z.number().int().min(0).nullable(),
//     count: z.number().int().min(0),
//   }),
// });
//
// /** One ExportedType row: a type this assembly exports from another module or forwards. */
// const managedExportedTypeSchema = z.object({
//   token: tokenSchema,
//   row_offset: offsetSchema,
//   namespace: z.string(),
//   name: z.string(),
//   flags: z.number().int().min(0).max(0xffff_ffff),
//   forwarder: z.boolean(),
//   type_def_id: z.number().int().min(0).max(0xffff_ffff),
//   implementation_token: tokenSchema.nullable(),
// });
//
// const managedFieldSchema = z.object({
//   token: tokenSchema,
//   row_offset: offsetSchema,
//   declaring_type_token: tokenSchema.nullable(),
//   declaring_type: z.string().nullable(),
export const _l = 148;
