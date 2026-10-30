import { z } from "zod";
import { providerSchema } from "../evidence.js";
import { isSwiftMangledSymbolName } from "../swiftSymbolClassification.js";

import {
  compareUnicodeCodePoints,
  compositeKey,
} from "../unicodeCodePointOrder.js";

/** Objective-C method type. */
export const objcMethodTypeSchema = z.enum([
  "instance",
  "class",
  "ivar_getter",
  "ivar_setter",
]);

/** Objective-C property attribute. */
export const objcPropertyAttributeSchema = z.strictObject({
  name: z.string().min(1),
  value: z.string(),
});

/** Objective-C method metadata. */
export const objcMethodSchema = z.strictObject({
  selector: z.string().min(1),
  method_type: objcMethodTypeSchema,
  address: z.number().int().nullable(),
  is_required: z.boolean().nullable(),
  is_optional: z.boolean().nullable(),
});
type ObjcMethod = z.infer<typeof objcMethodSchema>;

/** Objective-C property metadata. */
export const objcPropertySchema = z.strictObject({
  name: z.string().min(1),
  type_encoding: z.string().nullable(),
  attributes: z.array(objcPropertyAttributeSchema),
  atomicity: z.enum(["atomic", "nonatomic"]).nullable(),
  is_readonly: z.boolean().nullable(),
  getter: z.string().nullable(),
  setter: z.string().nullable(),
});

/** Objective-C protocol metadata. */
export const objcProtocolSchema = z.strictObject({
  name: z.string().min(1),
  methods: z.array(objcMethodSchema).default([]),
  optional_methods: z.array(objcMethodSchema).default([]),
  properties: z.array(objcPropertySchema).default([]),
});

/** Objective-C class metadata. */
export const objcClassSchema = z.strictObject({
  name: z.string().min(1),
  super_class: z.string().nullable(),
  is_meta_class: z.boolean().nullable(),
  is_root_class: z.boolean().nullable(),
  methods: z.array(objcMethodSchema).default([]),
  properties: z.array(objcPropertySchema).default([]),
  protocols: z.array(z.string()).default([]),
  ivar_count: z.number().int().nonnegative().nullable(),
  instance_size: z.number().int().nonnegative().nullable(),
  location: z
    .object({
      address: z.string().nullable(),
      file_offset: z.number().int().nonnegative().nullable(),
    })
    .optional(),
  superclass_address: z.string().nullable().optional(),
  metaclass_address: z.string().nullable().optional(),
  decode: z
    .object({
      status: z.enum(["decoded", "partial", "unsupported", "invalid"]),
      reason: z.string().nullable(),
    })
    .optional(),
  evidence: z
    .array(
      z.object({
        kind: z.literal("binary_metadata"),
        description: z.string(),
        location: z.object({
          address: z.string().nullable(),
          file_offset: z.number().int().nonnegative().nullable(),
        }),
        artifact_path: z.string(),
        artifact_sha256: z.string(),
      }),
    )
    .optional(),
});
type ObjcClass = z.infer<typeof objcClassSchema>;

/** Exact location of a decoded native metadata value when the provider knows it. */
export const nativeMetadataLocationSchema = z.strictObject({
  address: z.string().nullable(),
  file_offset: z.number().int().nonnegative().nullable(),
});
export type NativeMetadataLocation = z.infer<
  typeof nativeMetadataLocationSchema
>;

/** Provider-neutral decode state; absence never silently means unsupported. */
export const nativeMetadataDecodeSchema = z.strictObject({
  status: z.enum(["decoded", "partial", "unsupported", "invalid"]),
  reason: z.string().nullable(),
});

/** Evidence attached to one dispatch edge or metadata record. */
export const nativeMetadataEvidenceSchema = z.strictObject({
  kind: z.enum([
    "binary_metadata",
    "interface_builder_resource",
    "symbol",
    "reference",
    "decompiler",
  ]),
  description: z.string().min(1),
  provider: providerSchema.optional(),
  location: nativeMetadataLocationSchema,
  artifact_path: z.string().min(1).nullable().default(null),
  artifact_sha256: z
    .string()
    .regex(/^[a-f0-9]{64}$/u)
    .nullable()
    .default(null),
});
export type NativeMetadataEvidence = z.infer<
  typeof nativeMetadataEvidenceSchema
>;

/** Objective-C ivar layout, retaining encoded type and exact storage offset. */
export const objcIvarSchema = z.strictObject({
  class_name: z.string().min(1),
  name: z.string().min(1),
  type_encoding: z.string().nullable(),
  offset: z.number().int().nonnegative().nullable(),
  size: z.number().int().nonnegative().nullable().default(null),
  alignment: z.number().int().positive().nullable().default(null),
  location: nativeMetadataLocationSchema,
  decode: nativeMetadataDecodeSchema,
  evidence: z.array(nativeMetadataEvidenceSchema).min(1),
});

/** Encoded Objective-C protocol declaration with required and optional method facts. */
export const objcProtocolRecordSchema = z.strictObject({
  name: z.string(),
  adopted_protocols: z.array(z.string()),
  methods: z.array(objcMethodSchema),
  optional_methods: z.array(objcMethodSchema),
  location: nativeMetadataLocationSchema,
  decode: nativeMetadataDecodeSchema,
  evidence: z.array(nativeMetadataEvidenceSchema).min(1),
});

/** Selector implementation resolved from a class or metaclass method list. */
export const objcDispatchImplementationSchema = z.strictObject({
  class_name: z.string().min(1),
  selector: z.string().min(1),
  method_type: z.enum(["instance", "class"]),
  implementation_address: z.string().nullable(),
  /** Category that adds this method, when it is not defined by the class itself. */
  category: z.string().nullable().optional(),
  location: nativeMetadataLocationSchema,
  decode: nativeMetadataDecodeSchema,
  evidence: z.array(nativeMetadataEvidenceSchema).min(1),
});
type ObjcDispatchImplementation = z.infer<
  typeof objcDispatchImplementationSchema
>;

/** Objective-C category: methods, protocols and properties added to a class. */
export const objcCategorySchema = z.strictObject({
  name: z.string().min(1),
  /** Extended class; external classes come from the category's bind symbol. */
  class_name: z.string().min(1).nullable(),
  class_source: z.enum(["local", "external", "unresolved"]),
  instance_methods: z.array(z.string()),
  class_methods: z.array(z.string()),
  protocols: z.array(z.string()),
  properties: z.array(objcPropertySchema),
  location: nativeMetadataLocationSchema,
  decode: nativeMetadataDecodeSchema,
  evidence: z.array(nativeMetadataEvidenceSchema).min(1),
});

/** Swift protocol conformance and its associated witness-table location. */
export const swiftConformanceSchema = z.strictObject({
  type_name: z.string().min(1),
  protocol_name: z.string().min(1),
  module: z.string().nullable(),
  witness_table: nativeMetadataLocationSchema,
  location: nativeMetadataLocationSchema,
  decode: nativeMetadataDecodeSchema,
  evidence: z.array(nativeMetadataEvidenceSchema).min(1),
});

/** A typed slot in a Swift protocol witness table or class vtable. */
export const swiftDispatchSlotSchema = z.strictObject({
  owner: z.string().min(1),
  table_kind: z.enum(["witness_table", "class_vtable"]),
  slot_index: z.number().int().nonnegative(),
  requirement: z.string().nullable(),
  implementation: z.string().nullable(),
  implementation_address: z.string().nullable(),
  thunk_address: z.string().nullable(),
  location: nativeMetadataLocationSchema,
  decode: nativeMetadataDecodeSchema,
  evidence: z.array(nativeMetadataEvidenceSchema).min(1),
});

/** Signed-relative pointer as stored in an Apple binary metadata structure. */
export const relativePointerSchema = z.strictObject({
  field: nativeMetadataLocationSchema,
  target: nativeMetadataLocationSchema,
  displacement: z.number().int(),
  indirectable: z.boolean(),
  indirect: z.boolean().nullable(),
  decode: nativeMetadataDecodeSchema,
  evidence: z.array(nativeMetadataEvidenceSchema).min(1),
});

/** A raw Swift-mangled symbol when a provider has not decoded its metadata. */
export const swiftSymbolSchema = z.strictObject({
  mangled_name: z.string().min(1),
  address: z.string().min(1),
  decode: nativeMetadataDecodeSchema,
  evidence: z.array(nativeMetadataEvidenceSchema).min(1),
});
type SwiftSymbol = z.infer<typeof swiftSymbolSchema>;

/** Per-facet coverage; empty arrays are meaningful only with this record. */
export const nativeMetadataCoverageSchema = z.strictObject({
  facet: z.string().min(1),
  status: z.enum(["complete", "partial", "unsupported", "not_requested"]),
  reason: z.string().nullable(),
  examined: z.number().int().nonnegative(),
  decoded: z.number().int().nonnegative(),
});

/** Swift declaration kind. */
export const swiftDeclKindSchema = z.enum([
  "class",
  "struct",
  "enum",
  "protocol",
  "extension",
  "actor",
  "global_var",
  "global_func",
]);
