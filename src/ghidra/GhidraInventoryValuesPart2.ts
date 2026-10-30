import { z } from "zod";
import {
  validateBytePattern,
  byteSearchResultSchema,
} from "../domain/native/bytePattern.js";
import { nativeLoadImageObservationSchema } from "../domain/native/nativeLoadImage.js";

import { AnalysisOutputError } from "../domain/analysisErrorCore.js";
import {
  functionBodySchema,
  functionBodyEntryAgrees,
} from "../domain/hopperValues.js";
import { jsonValueSchema, type JsonValue } from "../domain/jsonValue.js";
import { err, ok, type Result } from "../domain/result.js";

/**
 * Direct inventory operations admitted by the Ghidra adapter. All are reads
 * except the naming operations, which edit the ephemeral session database.
 */

const procedureFacts = z
  .object({
    external: z.boolean(),
    thunk: z.boolean(),
    thunk_target: canonicalAddress.nullable(),
  })
  .strict();
/** Ghidra FunctionManager classification, independent of body ownership inference. */
export const ghidraFunctionClassificationSchema = procedureFacts
  .extend({ provenance: z.literal("ghidra-function-manager") })
  .strict();
/** Require complete canonical AddressSet evidence on every Ghidra function identity. */
export const ghidraFunctionBodySchema = functionBodySchema.superRefine(
  (body, context) => {
    if (
      !body.available ||
      body.provenance !== "ghidra-function-body-address-set" ||
      body.ranges.some(
        ({ start, end }) =>
          !ghidraCanonicalAddressSchema.safeParse(start).success ||
          !ghidraCanonicalAddressSchema.safeParse(end).success,
      )
    )
      context.addIssue({
        code: "custom",
        message:
          "Ghidra omitted complete canonical function-body AddressSet evidence",
      });
  },
);

/** Strict provider identity shared by inventory and function-analysis results. */
export const ghidraProcedureIdentitySchema = z
  .object({
    address: ghidraCanonicalAddressSchema,
    name: z.string().min(1),
    classification: ghidraFunctionClassificationSchema,
    body: ghidraFunctionBodySchema,
  })
  .strict()
  .superRefine((value, context) => {
    if (
      !functionBodyEntryAgrees(value.body, value.address) ||
      (value.body.available &&
        !value.classification.external &&
        !value.body.contains_entry)
    )
      context.addIssue({
        code: "custom",
        message: "Ghidra function body disagrees with its entry point",
      });
  });

const stringFacts = z
  .object({
    encoding: z.string().min(1),
    termination: z.enum(["missing", "present_or_not_required"]),
    byte_length: z.number().int().min(0),
  })
  .strict();
const baseItem = {
  address: canonicalAddress,
  value: z.string(),
};
const symbolItem = z.object({ ...baseItem, symbol: symbolFacts }).strict();
const procedureItem = z
  .object({ ...baseItem, procedure: procedureFacts })
  .strict();
const stringItem = z.object({ ...baseItem, string: stringFacts }).strict();
const searchItem = z.object(baseItem).strict();

const availablePermissions = z
  .object({
    available: z.literal(true),
    source: z.literal("ghidra-memory-block"),
  })
  .strict();
const memoryRegion = z
  .object({
    name: z.string(),
    start: canonicalAddress,
    end: canonicalAddress,
    readable: z.boolean(),
    writable: z.boolean(),
    executable: z.boolean(),
    permissions: availablePermissions,
    provenance: z.literal("ghidra-memory-block"),
    address_space: z.string().min(1),
    image_base: canonicalAddress,
    initialized: z.boolean(),
    overlay: z.boolean(),
  })
  .strict();
const segment = memoryRegion
  .extend({ sections: z.array(memoryRegion) })
  .strict();
const containingProcedure = z.discriminatedUnion("found", [
  z
    .object({
      query_address: canonicalAddress,
      found: z.literal(true),
      procedure: ghidraProcedureIdentitySchema,
    })
    .strict()
    .superRefine((value, context) => {
      const body = value.procedure.body;
      const exactExternalEntry =
        value.procedure.classification.external &&
        value.query_address === value.procedure.address;
      if (
        !exactExternalEntry &&
        body.available &&
        !functionBodyEntryAgrees(
          { ...body, contains_entry: true },
          value.query_address,
        )
      )
        context.addIssue({
          code: "custom",
          message:
            "Found containing procedure body does not contain the query address",
        });
    }),
  z
    .object({
      query_address: canonicalAddress,
      found: z.literal(false),
      procedure: z.null(),
      reason: z.enum(["outside_segments", "not_in_procedure"]),
    })
    .strict(),
]);

const resultSchemas = {
  search_bytes: byteSearchResultSchema.superRefine((value, context) => {
    const addresses = [
      ...value.matches.flatMap((match) => [
        match.address,
        ...(match.procedure === null ? [] : [match.procedure.address]),
      ]),
      ...[
        ...value.searched.blocks,
        ...value.searched.skipped_uninitialized,
        ...value.searched.skipped_not_loaded,
      ].flatMap((block) => [block.start, block.end]),
    ];
    if (addresses.some((value) => !canonicalAddress.safeParse(value).success))
      context.addIssue({
        code: "custom",
        message: "Byte search addresses must be canonical",
      });
  }),
  inspect_native_load_image: nativeLoadImageObservationSchema,
  read_bytes: z
    .strictObject({
      address: canonicalAddress,
      requested_bytes: z.number().int().min(1),
      returned_bytes: z.number().int().min(0),
      bytes_hex: z.string().regex(/^(?:[a-f0-9]{2})*$/u),
      complete: z.boolean(),
    })
    .superRefine((value, context) => {
      if (
        value.returned_bytes * 2 !== value.bytes_hex.length ||
        value.returned_bytes > value.requested_bytes ||
        value.complete !== (value.returned_bytes === value.requested_bytes)
      )
        context.addIssue({
          code: "custom",
          message: "Read-byte length and completeness disagree",
        });
    }),
  address_to_file_offset: z.strictObject({
    address: canonicalAddress,
    file_offset: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER),
  }),
  address_name: z.string().nullable(),
  list_documents: z.array(z.string().min(1)).length(1),
  list_names: z.array(symbolItem),
  list_procedures: z.array(procedureItem),
  list_segments: z.array(segment),
  list_strings: z.array(stringItem),
  procedure_address: canonicalAddress,
  resolve_containing_procedure: containingProcedure,
  search_procedures: z.array(searchItem),
  search_strings: z.array(searchItem),
  set_address_name: z.boolean(),
  set_addresses_names: z.record(z.string(), z.boolean()),
} satisfies Readonly<Record<GhidraInventoryOperation, z.ZodType>>;

/** Validate exact Java-bridge output before creating Evidence. */
export const parseGhidraInventoryResult = (
  operation: GhidraInventoryOperation,
  value: JsonValue,
): Result<JsonValue, AnalysisOutputError> => {
  const parsed = resultSchemas[operation].safeParse(value);
  return parsed.success
    ? ok(jsonValueSchema.parse(parsed.data))
    : err(
        new AnalysisOutputError(
          operation,
          "Ghidra bridge output did not match the inventory contract",
          { cause: parsed.error },
        ),
      );
};
