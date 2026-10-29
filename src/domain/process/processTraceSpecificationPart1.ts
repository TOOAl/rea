export const __stub = 1;
// import canonicalize from "canonicalize";
// import { z } from "zod";
//
// import { IDENTIFIER_PATTERN } from "../stringPatterns.js";
//
// import { jsonValueSchema } from "../jsonValue.js";
// import {
//   comparableProcessObservationPayload,
//   processObservationSourceSchema,
// } from "./processObservation.js";
//
// /**
//  * A declared trace, event or variant identifier. The specification owns this
//  * vocabulary and the comparison result echoes those identifiers verbatim, so
//  * the result module must reuse this schema rather than restate the pattern:
//  * two bounds on the same identifier would reject the result of an accepted
//  * specification.
//  */
// export const processTraceIdentifierSchema = z
//   .string()
//   .regex(IDENTIFIER_PATTERN);
//
// const cardinalitySchema = z.discriminatedUnion("kind", [
//   z.strictObject({ kind: z.literal("required") }),
//   z.strictObject({ kind: z.literal("optional") }),
//   z.strictObject({
//     kind: z.literal("exact"),
//     count: z.number().int().min(0),
//   }),
//   z
//     .strictObject({
//       kind: z.literal("range"),
//       min: z.number().int().min(0),
//       max: z.number().int().min(0),
//     })
//     .refine(({ min, max }) => min <= max, {
//       message: "cardinality min must not exceed max",
//       path: ["min"],
//     }),
// ]);
//
// const eventDeclarationSchema = z.strictObject({
//   id: processTraceIdentifierSchema,
//   source: processObservationSourceSchema,
//   exact: jsonValueSchema,
//   ignore_fields: z
//     .array(
//       z.enum([
//         "sequence",
//         "at_ms",
//         "scheduled_at_ms",
//         "dispatched_at_ms",
//         "elapsed_ms",
//       ]),
//     )
//     .refine((values) => new Set(values).size === values.length, {
//       message: "ignored event fields must be unique",
//     })
//     .optional(),
//   cardinality: cardinalitySchema.default({ kind: "required" }),
// });
//
// const partialOrderLanguageSchema = z.strictObject({
//   kind: z.literal("partial_order"),
//   happens_before: z
//     .array(
//       z.strictObject({
//         before: processTraceIdentifierSchema,
//         after: processTraceIdentifierSchema,
//       }),
//     )
//     .default([]),
//   not_before: z
//     .array(
//       z.strictObject({
//         event: processTraceIdentifierSchema,
//         anchor: processTraceIdentifierSchema,
//       }),
//     )
//     .default([]),
//   unordered_groups: z
//     .array(
//       z.strictObject({ events: z.array(processTraceIdentifierSchema).min(2) }),
//     )
//     .default([]),
//   prefix: z.array(processTraceIdentifierSchema).default([]),
//   suffix: z.array(processTraceIdentifierSchema).default([]),
// });
//
// const finiteTraceTokenSchema = z.union([
//   processTraceIdentifierSchema,
//   z.strictObject({ unordered: z.array(processTraceIdentifierSchema).min(2) }),
// ]);
//
// const finiteTraceLanguageSchema = z.strictObject({
//   kind: z.literal("finite_traces"),
//   variants: z
//     .array(
//       z.strictObject({
//         id: processTraceIdentifierSchema,
//         trace: z.array(finiteTraceTokenSchema),
//       }),
//     )
//     .min(1),
// });
//
// const specificationShapeSchema = z.strictObject({
//   events: z.array(eventDeclarationSchema).min(1),
//   language: z.discriminatedUnion("kind", [
//     partialOrderLanguageSchema,
//     finiteTraceLanguageSchema,
//   ]),
// });
//
// export type ProcessTraceSpecification = z.infer<
//   typeof specificationShapeSchema
// >;
// type PartialOrderLanguage = z.infer<typeof partialOrderLanguageSchema>;
//
// type AcyclicGraphFacts =
//   | {
//       readonly kind: "total-order";
//       readonly rank: ReadonlyMap<string, number>;
//     }
//   | {
//       readonly kind: "partial-order";
//       readonly reverseAdjacency: ReadonlyMap<string, ReadonlySet<string>>;
//     };
// type GraphFacts = { readonly kind: "cyclic" } | AcyclicGraphFacts;
//
// export const canonicalTraceJson = (value: unknown): string => {
//   const serialized = canonicalize(value);
//   if (serialized === undefined)
//     throw new TypeError("Trace specification contains a non-JSON value");
//   return serialized;
// };
//
// export const processTraceCardinalityBounds = (
//   cardinality: ProcessTraceSpecification["events"][number]["cardinality"],
// ): readonly [number, number] => {
//   switch (cardinality.kind) {
//     case "required":
//       return [1, 1];
//     case "optional":
//       return [0, 1];
//     case "exact":
//       return [cardinality.count, cardinality.count];
//     case "range":
//       return [cardinality.min, cardinality.max];
//   }
// };
//
// const addReferenceIssue = (
//   context: z.RefinementCtx,
//   known: ReadonlySet<string>,
//   id: string,
//   path: PropertyKey[],
// ): void => {
//   if (!known.has(id))
//     context.addIssue({
//       code: "custom",
//       message: `unknown event id: ${id}`,
//       path,
//     });
// };
//
// const pairKey = (left: string, right: string): string =>
//   left <= right ? `${left}\0${right}` : `${right}\0${left}`;
//
export const _l = 169;
