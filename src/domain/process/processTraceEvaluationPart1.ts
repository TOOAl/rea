export const __stub = 1;
// import { z } from "zod";
//
// import type { JsonValue } from "../jsonValue.js";
// import type { ProcessCapture } from "./processCaptureParsing.js";
// import { processSourceTruncated } from "./processCaptureCoverage.js";
// import {
//   comparableProcessObservationPayload,
//   processObservationLocationSchema,
//   projectProcessObservation,
//   type ProcessObservationLocation,
//   type ProcessObservationSource,
// } from "./processObservation.js";
// import {
//   canonicalTraceJson,
//   processTraceCardinalityBounds,
//   processTraceIdentifierSchema,
//   type ProcessTraceSpecification,
// } from "./processTraceSpecification.js";
//
// const matchedEventSchema = z.strictObject({
//   event_id: processTraceIdentifierSchema,
//   location: processObservationLocationSchema,
// });
//
// const sideResultShape = {
//   satisfied_constraints: z.array(z.string()),
//   raw_trace: z.array(matchedEventSchema),
// };
//
// const sideResultSchema = z.union([
//   z.strictObject({
//     ...sideResultShape,
//     status: z.literal("pass"),
//     matched_variant: processTraceIdentifierSchema.nullable(),
//   }),
//   z.strictObject({
//     ...sideResultShape,
//     status: z.enum(["fail", "unknown"]),
//     matched_variant: z.null(),
//   }),
// ]);
//
// const diagnosticSchema = z.strictObject({
//   kind: z.enum([
//     "journal",
//     "predicate",
//     "cardinality",
//     "edge",
//     "prefix",
//     "suffix",
//     "trace",
//   ]),
//   side: z.enum(["left", "right"]),
//   message: z.string(),
//   event_ids: z.array(processTraceIdentifierSchema),
//   locations: z.array(processObservationLocationSchema),
// });
//
// /** Structured verdict for one declared process trace language. */
// export const processTraceComparisonResultSchema = z.strictObject({
//   verdict: z.enum(["equivalent", "different", "nonconforming", "unknown"]),
//   left: sideResultSchema,
//   right: sideResultSchema,
//   diagnostic: diagnosticSchema.nullable(),
// });
// export type ProcessTraceComparisonResult = z.infer<
//   typeof processTraceComparisonResultSchema
// >;
//
// type TraceRecord = {
//   readonly source: ProcessObservationSource;
//   readonly payload: JsonValue;
//   readonly location: ProcessObservationLocation;
// };
//
// const scopesFor = (
//   sources: ReadonlySet<ProcessObservationSource>,
// ): ReadonlySet<string> =>
//   new Set(
//     [...sources].map((source) => {
//       if (source.startsWith("terminal_")) return "terminal";
//       if (source === "lifecycle") return "exit";
//       if (source === "filesystem") return "filesystem";
//       if (source === "process") return "process";
//       return "interaction";
//     }),
//   );
//
// const unknownSide = (
//   rawTrace: z.infer<typeof matchedEventSchema>[] = [],
// ): z.infer<typeof sideResultSchema> => ({
//   status: "unknown",
//   matched_variant: null,
//   satisfied_constraints: [],
//   raw_trace: rawTrace,
// });
//
// export type EvaluatedSide = {
//   readonly result: z.infer<typeof sideResultSchema>;
//   readonly diagnostic: Omit<z.infer<typeof diagnosticSchema>, "side"> | null;
// };
//
// type FailureInput = {
//   readonly kind: z.infer<typeof diagnosticSchema>["kind"];
//   readonly message: string;
//   readonly eventIds: readonly string[];
//   readonly locations: readonly ProcessObservationLocation[];
//   readonly rawTrace: z.infer<typeof matchedEventSchema>[];
// };
//
// const failure = (input: FailureInput): EvaluatedSide => ({
//   result: {
//     status: "fail",
//     matched_variant: null,
//     satisfied_constraints: [],
//     raw_trace: input.rawTrace,
//   },
//   diagnostic: {
//     kind: input.kind,
//     message: input.message,
//     event_ids: [...input.eventIds],
//     locations: [...input.locations],
//   },
// });
//
// type FiniteTraceEvaluation =
//   | { readonly status: "pass"; readonly variant: string }
//   | {
export const _l = 128;
