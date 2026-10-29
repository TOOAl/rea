export const __stub = 1;
// import { z } from "zod";
// import { fixedTupleSchema } from "./fixedTupleSchema.js";
// import { addressCoordinate } from "./native/addressCoordinate.js";
//
// import type { JsonValue } from "./jsonValue.js";
//
// import { err, ok, type Result } from "./result.js";
// import { nativeApiBoundarySchema } from "./native/nativeApiBoundary.js";
// import { nativeValueFlowSchema } from "./native/nativeValueFlow.js";
// import { AnalysisOutputError } from "./analysisErrorCore.js";
//
// export interface AddressedName {
//   readonly address: string;
//   readonly name: string;
// }
//
// export interface SegmentSummary {
//   readonly name: string;
//   readonly start: string;
//   readonly end: string;
//   readonly readable: boolean | null;
//   readonly writable: boolean | null;
//   readonly executable: boolean | null;
//   readonly image_base?: string;
//   readonly address_space?: string;
// }
//
// /** Return a bounded byte distance between canonical addresses in one space. */
// export const addressDistance = (start: string, end: string): number | null => {
//   const left = addressCoordinate(start);
//   const right = addressCoordinate(end);
//   if (left === null || right === null || left.space !== right.space)
//     return null;
//   const distance = right.offset - left.offset;
//   if (distance < 0n || distance > BigInt(Number.MAX_SAFE_INTEGER)) return null;
//   return Number(distance);
// };
//
// const procedureMapSchema = z.record(z.string(), z.string());
// const addressedNamesSchema = z.array(
//   z.object({ address: z.string(), name: z.string() }),
// );
// const addressedNameMapSchema = z.record(z.string(), z.string());
// const segmentSchema = z.object({
//   name: z.string(),
//   start: z.string(),
//   end: z.string(),
//   readable: z.boolean().nullable(),
//   writable: z.boolean().nullable(),
//   executable: z.boolean().nullable(),
//   image_base: z.string().min(1).exactOptional(),
//   address_space: z.string().min(1).exactOptional(),
// });
// const unavailableAnalysisFactSchema = z
//   .object({ available: z.literal(false), reason: z.string() })
//   .strict();
// /** Typed string evidence shared by inventories and referenced function literals. */
// export const analysisStringSchema = z.object({
//   address: z.string(),
//   value: z.string(),
//   provider_value: z
//     .string()
//     .exactOptional()
//     .describe(
//       "Original provider display text, which may shorten the typed object.",
//     ),
//   decoding: unavailableAnalysisFactSchema
//     .exactOptional()
//     .describe(
//       "When present, value retains native display text because typed bytes could not be decoded.",
//     ),
//   string: z
//     .object({
//       encoding: z.string().min(1),
//       encoding_status: z
//         .enum(["observed", "inferred"])
//         .exactOptional()
//         .describe(
//           "Whether the provider declares the encoding or REA infers it from the typed bytes and native display. This does not establish the original source's intended encoding.",
//         ),
//       termination: z.enum(["missing", "present_or_not_required"]),
//       byte_length: z.number().int().min(0),
//     })
//     .exactOptional(),
// });
//
// /** An analyzed bookmark retains a missing provider label as null. */
// export const analysisBookmarkSchema = z.strictObject({
//   address: z.string(),
//   name: z.string().nullable(),
// });
// /** Complete observed function-body ranges; every range endpoint is inclusive. */
// export const functionBodySchema = z.discriminatedUnion("available", [
//   unavailableAnalysisFactSchema,
//   z
//     .strictObject({
//       available: z.literal(true),
//       provenance: z.string().min(1),
//       ranges: z.array(
//         z.strictObject({
//           start: z.string(),
//           end: z
//             .string()
//             .describe("Inclusive last address of this observed body range."),
//         }),
//       ),
//       total_bytes: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER),
//       span_bytes: z
//         .number()
//         .int()
//         .min(0)
//         .max(Number.MAX_SAFE_INTEGER)
//         .nullable(),
//       non_contiguous: z.boolean(),
//       contains_entry: z.boolean(),
//     })
//     .superRefine((body, context) => {
//       let total = 0n;
//       const bounds = new Map<string | null, { start: bigint; end: bigint }>();
//       const closedSpaces = new Set<string | null>();
//       let previousSpace: string | null | undefined;
//       for (const range of body.ranges) {
//         const start = addressCoordinate(range.start);
//         const end = addressCoordinate(range.end);
//         if (
//           start === null ||
//           end === null ||
//           start.space !== end.space ||
//           end.offset < start.offset
//         ) {
//           context.addIssue({
//             code: "custom",
//             message: "Function body range has invalid inclusive endpoints",
//           });
//           return;
//         }
//         if (previousSpace !== undefined && previousSpace !== start.space)
//           closedSpaces.add(previousSpace);
//         const previous = bounds.get(start.space);
//         if (
//           closedSpaces.has(start.space) ||
//           (previous !== undefined && start.offset <= previous.end + 1n)
//         ) {
//           context.addIssue({
//             code: "custom",
//             message:
export const _l = 146;
