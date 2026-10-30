import { z } from "zod";
import {
  bytePatternFields,
  validateBytePattern,
} from "../domain/native/bytePattern.js";

import type { AnalysisInputError } from "../domain/analysisErrorCore.js";
import type { JsonValue } from "../domain/jsonValue.js";
import { err, ok, type Result } from "../domain/result.js";
import { analysisInputErrorFromIssues } from "../domain/inputIssueProjection.js";

/**
 * Direct inventory operations admitted by the Ghidra adapter. All are reads
 * except the naming operations, which edit the ephemeral session database.
 */
export const GHIDRA_INVENTORY_OPERATIONS = [
  "inspect_native_load_image",
  "read_bytes",
  "search_bytes",
  "address_to_file_offset",
  "address_name",
  "list_documents",
  "list_names",
  "list_procedures",
  "list_segments",
  "list_strings",
  "procedure_address",
  "resolve_containing_procedure",
  "search_procedures",
  "search_strings",
  "set_address_name",
  "set_addresses_names",
] as const;

/** Inventory operations that write analyst names into the session database. */
export const GHIDRA_NAMING_OPERATIONS = [
  "set_address_name",
  "set_addresses_names",
] as const satisfies readonly GhidraInventoryOperation[];

/** One direct inventory operation implemented by the packaged Java bridge. */
export type GhidraInventoryOperation =
  (typeof GHIDRA_INVENTORY_OPERATIONS)[number];

const operationSet: ReadonlySet<string> = new Set(GHIDRA_INVENTORY_OPERATIONS);

/** Narrow an application operation to the Ghidra inventory surface. */
export const isGhidraInventoryOperation = (
  operation: string,
): operation is GhidraInventoryOperation => operationSet.has(operation);

export const ghidraIdentifierSchema = z.string().min(1);
const identifier = ghidraIdentifierSchema;
const document = identifier.nullable().default(null);
/** Caller address spelling; the bridge resolves its space and emits canonical output. */
export const ghidraInputAddressSchema = z
  .string()
  .regex(
    /^(?:(?:0[xX])?[0-9a-fA-F]+|(?:[A-Za-z0-9._~-]|%[0-9a-fA-F]{2})+:0[xX][0-9a-fA-F]+)$/u,
    "Use hexadecimal digits, optionally prefixed with 0x, or an encoded address-space name followed by :0x and hexadecimal digits",
  );
const explicitAddress = ghidraInputAddressSchema;
const filteredAddress = explicitAddress.nullable().default(null);
const searchInput = {
  pattern: z.string().min(1),
  mode: z.enum(["literal", "regex"]).default("literal"),
  case_sensitive: z.boolean().default(false),
  document,
};

const inputSchemas = {
  search_bytes: z
    .strictObject({
      ...bytePatternFields,
      document,
      start: explicitAddress.optional(),
      end: explicitAddress.optional(),
      limit: z.number().int().min(1).max(1000).default(100),
      cursor: z.string().min(1).optional(),
    })
    .superRefine(validateBytePattern),
  inspect_native_load_image: z.strictObject({}),
  read_bytes: z.strictObject({
    document,
    address: explicitAddress,
    length: z.number().int().min(1).max(Number.MAX_SAFE_INTEGER).default(256),
  }),
  address_to_file_offset: z.strictObject({
    document,
    address: explicitAddress,
  }),
  address_name: z.object({ document, address: explicitAddress }).strict(),
  list_documents: z.object({}).strict(),
  list_names: z.object({ document, address: filteredAddress }).strict(),
  list_procedures: z.object({ document }).strict(),
  list_segments: z.object({ document }).strict(),
  list_strings: z.object({ document, address: filteredAddress }).strict(),
  procedure_address: z.object({ document, procedure: identifier }).strict(),
  resolve_containing_procedure: z
    .object({ document, address: explicitAddress })
    .strict(),
  search_procedures: z.object(searchInput).strict(),
  search_strings: z.object(searchInput).strict(),
  set_address_name: z
    .object({ document, address: explicitAddress, name: z.string().min(1) })
    .strict(),
  set_addresses_names: z
    .object({
      document,
      names: z.record(explicitAddress, z.string().min(1)),
    })
    .strict()
    .refine(
      (value) => Object.keys(value.names).length > 0,
      "Supply at least one address name",
    ),
} satisfies Readonly<Record<GhidraInventoryOperation, z.ZodType>>;

/** Validate and default one provider request before it crosses the socket. */
export const parseGhidraInventoryInput = (
  operation: GhidraInventoryOperation,
  value: Readonly<Record<string, JsonValue>>,
): Result<Readonly<Record<string, JsonValue>>, AnalysisInputError> => {
  const parsed = inputSchemas[operation].safeParse(value);
  if (!parsed.success)
    return err(
      analysisInputErrorFromIssues(operation, parsed.error.issues, value, {
        cause: parsed.error,
      }),
    );
  return ok(parsed.data);
};

export const ghidraCanonicalAddressSchema = z
  .string()
  .regex(/^(?:0x[0-9a-f]+|(?:[A-Za-z0-9._~-]|%[0-9A-F]{2})+:0x[0-9a-f]+)$/u);
const canonicalAddress = ghidraCanonicalAddressSchema;
const symbolFacts = z
  .object({
    primary: z.boolean(),
    dynamic: z.boolean(),
    external: z.boolean(),
    type: z.string().min(1),
    source: z.enum(["default", "analysis", "ai", "imported", "user_defined"]),
  })
  .strict();
