import { z } from "zod";

import { localPathStringSchema } from "../localPath.js";
import { CANONICAL_BASE64_PATTERN } from "../stringPatterns.js";

const unsignedHex = z.string().regex(/^0x(?:0|[1-9a-f][0-9a-f]{0,15})$/);
const index = z.number().int().nonnegative();
const scalar = z.union([z.string(), z.number().int()]);
const range = z.strictObject({ offset: unsignedHex, bytes: unsignedHex });
const canonicalBase64 = z.string().regex(CANONICAL_BASE64_PATTERN);
const name = z.strictObject({
  display: z.string(),
  bytes_base64: canonicalBase64.nullable(),
  location: range.nullable(),
  unknown_reason: z.string().nullable(),
});

/** Explicit local object selection, independent of an active disassembler target. */
export const inspectBinaryLayoutInputSchema = z.strictObject({
  path: localPathStringSchema.describe(
    "Absolute filesystem path to the selected binary",
  ),
});

/** File and linked-image evidence; numeric ELF values never pass through unsafe JSON numbers. */
const binaryLayoutObjectSchema = z.strictObject({
  artifact: z.strictObject({
    path: z.string().min(1),
    sha256: z.string().regex(/^[a-f0-9]{64}$/),
    bytes: index,
  }),
  format: z.literal("elf"),
  architecture: z.strictObject({
    machine: z.literal("EM_X86_64"),
    bits: z.literal(64),
    byte_order: z.literal("little"),
  }),
  image_type: z.enum(["ET_EXEC", "ET_DYN", "ET_REL"]),
  entry_point: z.strictObject({
    reported_value: unsignedHex,
    meaning: z.enum(["linked-virtual-address", "not-applicable", "absent"]),
    execution_status: z.literal("unknown"),
  }),
  runtime_load_base: z.null(),
  sections: z.array(
    z.strictObject({
      index,
      name,
      name_offset: unsignedHex,
      type: scalar,
      header_location: range,
      address: unsignedHex,
      offset: unsignedHex,
      size: unsignedHex,
      alignment: unsignedHex,
      flags: unsignedHex,
      link: index,
      info: index,
      entry_size: unsignedHex,
      file_backing: z.enum(["file", "none"]),
    }),
  ),
  segments: z.array(
    z.strictObject({
      index,
      type: scalar,
      header_location: range,
      offset: unsignedHex,
      file_size: unsignedHex,
      memory_size: unsignedHex,
      virtual_address: unsignedHex,
      physical_address: unsignedHex,
      alignment: unsignedHex,
      flags: unsignedHex,
      file_backing: z.enum(["file", "none"]),
      permissions: z
        .strictObject({
          read: z.boolean(),
          write: z.boolean(),
          execute: z.boolean(),
        })
        .nullable(),
    }),
  ),
  symbols: z.array(
    z.strictObject({
      table_index: index,
      entry_index: index,
      name,
      name_offset: unsignedHex,
      location: range,
      value: unsignedHex,
      value_meaning: z.enum([
        "undefined",
        "alignment",
        "absolute-value",
        "no-address",
        "unknown-section-index",
        "section-offset",
        "tls-offset",
        "linked-virtual-address",
      ]),
      size: unsignedHex,
      binding: scalar,
      type: scalar,
      visibility: scalar,
      section_index: scalar,
    }),
  ),
  relocations: z.array(
    z.strictObject({
      section_index: index,
      entry_index: index,
      reported_offset: unsignedHex,
      target: z.discriminatedUnion("kind", [
        z.strictObject({
          kind: z.literal("section-offset"),
          section_index: index,
          offset: unsignedHex,
        }),
        z.strictObject({
          kind: z.literal("linked-virtual-address"),
          address: unsignedHex,
        }),
        z.strictObject({
          kind: z.literal("unknown-section"),
          reported_section_index: index,
          offset: unsignedHex,
          unknown_reason: z.enum([
            "undefined-section-reference",
            "inactive-section-header",
          ]),
        }),
      ]),
      location: range,
      type: index,
      symbol_table_index: index,
      symbol_index: index,
      symbol_reference_meaning: z.enum([
        "zero-symbol-value",
        "symbol-table-entry",
      ]),
      addend: z
        .string()
        .regex(/^-?(?:0|[1-9][0-9]{0,18})$/)
        .nullable(),
    }),
  ),
  packed_relative_relocations: z.array(
    z.strictObject({
      section_index: index,
      location: range,
      encoded_bytes_base64: canonicalBase64,
      entries: z.array(
        z.strictObject({ decoded_index: index, reported_offset: unsignedHex }),
      ),
      offset_meaning: z.enum(["linked-virtual-address", "unknown"]),
      evidence_kind: z.literal("derived"),
      entry_source_locations: z.null(),
      addends: z.null(),
    }),
  ),
  relocation_inventory_completeness: z.literal("unknown"),
  linkage: z.strictObject({
    needed_libraries: z.array(name),
    interpreters: z.array(name),
    got: z.array(
      z.strictObject({ display_name: z.string(), address: unsignedHex }),
    ),
    plt: z.array(
      z.strictObject({ display_name: z.string(), address: unsignedHex }),
    ),
    convenience_maps_completeness: z.literal("unknown"),
    runtime_library_paths: z.null(),
  }),
  mitigations: z.strictObject({
    evidence_kind: z.literal("inferred"),
    position_independent: z.boolean(),
    nx_indicator: z.boolean().nullable(),
    executable_stack_indicator: z.boolean(),
    stack_canary_indicator: z.boolean(),
    relro: z.enum(["Partial", "Full"]).nullable(),
  }),
  diagnostics: z.strictObject({
    stdout: z.string(),
    stderr: z.string(),
    truncated: z.boolean(),
  }),
  limitations: z.array(z.string()),
});

/** Decoder payload excludes the artifact identity observed by the owning process boundary. */
export const binaryLayoutPayloadSchema = binaryLayoutObjectSchema.omit({
  artifact: true,
  diagnostics: true,
});

/** Check source ranges again at the public boundary, independently of upstream parsing. */
