import { z } from "zod";
import { providerSchema } from "../evidence.js";
import { isSwiftMangledSymbolName } from "../swiftSymbolClassification.js";

import {
  compareUnicodeCodePoints,
  compositeKey,
} from "../unicodeCodePointOrder.js";

/** Objective-C method type. */

/** Swift access level. */
export const swiftAccessLevelSchema = z.enum([
  "private",
  "fileprivate",
  "internal",
  "public",
  "open",
]);
/** Swift declaration metadata. */
export const swiftDeclSchema = z.strictObject({
  kind: swiftDeclKindSchema,
  name: z.string().min(1),
  module: z.string().nullable(),
  access_level: swiftAccessLevelSchema.default("internal"),
  super_class: z.string().nullable(),
  protocols: z.array(z.string()).default([]),
  is_final: z.boolean().default(false),
  is_required: z.boolean().default(false),
  is_convenience_init: z.boolean().default(false),
  is_override: z.boolean().default(false),
});

/** Database save/read operation type. */
export const dbOperationSchema = z.enum([
  "save",
  "readback",
  "open_database",
  "close_database",
  "export",
  "import",
]);
/** Database save operation result. */
export const dbSaveResultSchema = z.strictObject({
  operation: dbOperationSchema,
  succeeded: z.boolean(),
  preserved_names: z.number().int().nonnegative().default(0),
  preserved_comments: z.number().int().nonnegative().default(0),
  preserved_bookmarks: z.number().int().nonnegative().default(0),
  database_path: z.string().nullable(),
  error: z.string().nullable(),
});

/** Result of deeper ObjC/Swift metadata extraction. */
export const objcSwiftMetadataSchema = z.strictObject({
  objc_classes: z.array(objcClassSchema).default([]),
  objc_protocols: z.array(objcProtocolSchema).default([]),
  objc_categories: z.array(objcCategorySchema).default([]),
  swift_decls: z.array(swiftDeclSchema).default([]),
  objc_ivars: z.array(objcIvarSchema).default([]),
  objc_protocol_records: z.array(objcProtocolRecordSchema).default([]),
  objc_dispatch_implementations: z
    .array(objcDispatchImplementationSchema)
    .default([]),
  swift_conformances: z.array(swiftConformanceSchema).default([]),
  swift_dispatch_slots: z.array(swiftDispatchSlotSchema).default([]),
  swift_symbols: z.array(swiftSymbolSchema).default([]),
  relative_pointers: z.array(relativePointerSchema).default([]),
  coverage: z.array(nativeMetadataCoverageSchema).default([]),
  db_save_result: dbSaveResultSchema.nullable(),
});
export type ObjcSwiftMetadata = z.infer<typeof objcSwiftMetadataSchema>;

/** Provider and target identity for one normalized dispatch-metadata result. */
export const nativeDispatchMetadataResultSchema = z.strictObject({
  target_sha256: z
    .string()
    .regex(/^[a-f0-9]{64}$/u)
    .nullable(),
  provider: z.strictObject({
    id: z.string().min(1),
    name: z.string().min(1),
    version: z.string().nullable(),
  }),
  analysis_profile_digest: z.string().min(1).nullable(),
  result: objcSwiftMetadataSchema,
});

/** Decode only facts visible in a provider's existing name inventory. */
export const inspectNativeDispatchMetadata = (
  names: readonly { readonly address: string; readonly name: string }[],
  maxRecords = 5_000,
): ObjcSwiftMetadata => {
  const symbolEvidence = (name: string, address: string) => [
    {
      kind: "symbol" as const,
      description: `Provider symbol ${name}`,
      location: { address, file_offset: null },
      artifact_path: null,
      artifact_sha256: null,
    },
  ];
  const classNames = new Set<string>();
  const implementations = new Map<string, ObjcDispatchImplementation>();
  const swiftSymbols: SwiftSymbol[] = [];

  const examinedNames = names.slice(0, maxRecords);
  for (const entry of examinedNames) {
    const classMatch = /(?:OBJC_CLASS_|OBJC_METACLASS_)\$_([^\s]+)/u.exec(
      entry.name,
    );
    if (classMatch?.[1] !== undefined) classNames.add(classMatch[1]);

    const methodMatch = /^([+-])\[([^\s\]]+)\s+([^\]]+)\]$/u.exec(entry.name);
    if (methodMatch?.[1] !== undefined && methodMatch[2] && methodMatch[3]) {
      const methodType = methodMatch[1] === "+" ? "class" : "instance";
      const selector = methodMatch[3];
      implementations.set(`${methodMatch[2]}:${selector}:${methodType}`, {
        class_name: methodMatch[2],
        selector,
        method_type: methodType,
        implementation_address: entry.address,
        location: { address: entry.address, file_offset: null },
        decode: { status: "partial", reason: "symbol_name_only" },
        evidence: symbolEvidence(entry.name, entry.address),
      });
      classNames.add(methodMatch[2]);
    }

    if (isSwiftMangledSymbolName(entry.name) || entry.name.startsWith("_Tt"))
      swiftSymbols.push({
        mangled_name: entry.name,
        address: entry.address,
        decode: { status: "partial", reason: "mangled_symbol_not_demangled" },
        evidence: symbolEvidence(entry.name, entry.address),
      });
  }

  const methodsByClass = new Map<string, ObjcMethod[]>();
  for (const implementation of implementations.values()) {
    const methods = methodsByClass.get(implementation.class_name) ?? [];
    methods.push({
      selector: implementation.selector,
      method_type: implementation.method_type,
      address: parseMetadataAddress(implementation.implementation_address),
      is_required: null,
      is_optional: null,
    });
    methodsByClass.set(implementation.class_name, methods);
  }
  const classes: ObjcClass[] = [...classNames].sort().map((name) => ({
    name,
    super_class: null,
    is_meta_class: null,
    is_root_class: null,
    methods: methodsByClass.get(name) ?? [],
    properties: [],
    protocols: [],
    ivar_count: null,
    instance_size: null,
  }));
  const decodedImplementations = [...implementations.values()].sort(
    (left, right) =>
      compareUnicodeCodePoints(
        compositeKey([left.class_name, left.selector]),
        compositeKey([right.class_name, right.selector]),
      ),
  );
  const swift = swiftSymbols.length > 0;

  return objcSwiftMetadataSchema.parse({
    objc_classes: classes,
    objc_dispatch_implementations: decodedImplementations,
    swift_symbols: swiftSymbols,
    coverage: [
      {
        facet: "objc_class_symbols",
        status: "partial",
        reason:
          names.length > examinedNames.length
            ? "record_limit_reached_and_symbol_names_are_not_runtime_class_metadata"
            : "symbol_names_do_not_recover_all_runtime_class_metadata",
        examined: examinedNames.length,
        decoded: classes.length,
      },
      {
        facet: "objc_dispatch_implementations",
        status: decodedImplementations.length > 0 ? "partial" : "unsupported",
        reason:
          names.length > examinedNames.length
            ? "record_limit_reached_and_only_symbolized_methods_are_resolved"
            : decodedImplementations.length > 0
              ? "only_symbolized_methods_are_resolved"
              : "provider_name_inventory_has_no_objc_method_symbols",
        examined: examinedNames.length,
        decoded: decodedImplementations.length,
      },
      {
        facet: "objc_ivar_layouts",
        status: "unsupported",
        reason: "symbol_inventory_does_not_expose_runtime_ivar_layouts",
        examined: 0,
        decoded: 0,
      },
      {
        facet: "swift_declarations",
        status: swift ? "partial" : "unsupported",
        reason: swift
          ? "symbols_are_not_demangled_declarations"
          : "no_swift_symbols_observed",
        examined: swiftSymbols.length,
        decoded: 0,
      },
      {
        facet: "swift_dispatch_tables",
        status: "unsupported",
        reason:
          "provider_name_inventory_does_not_decode_witness_or_class_vtables",
        examined: 0,
        decoded: 0,
      },
      {
        facet: "relative_pointers",
        status: "unsupported",
        reason:
          "provider_name_inventory_does_not_decode_binary_relative_pointers",
        examined: 0,
        decoded: 0,
      },
    ],
    db_save_result: null,
  });
};

const parseMetadataAddress = (address: string | null): number | null => {
  if (address === null) return null;
  const match = /(?:^|:)0x([0-9a-f]+)$/iu.exec(address);
  if (match?.[1] === undefined) return null;
  const value = Number.parseInt(match[1], 16);
  return Number.isSafeInteger(value) ? value : null;
};
