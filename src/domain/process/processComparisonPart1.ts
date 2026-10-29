export const __stub = 1;
// import canonicalize from "canonicalize";
// import { z } from "zod";
// import { processSourceTruncated } from "./processCaptureCoverage.js";
// import type {
//   ProcessObservationLocation,
//   ProcessObservationSource,
// } from "./processObservation.js";
//
// import type { ProcessCapture } from "./processCaptureParsing.js";
// import { comparableTerminalFrame } from "./processObservation.js";
// import { AnalysisInputError } from "../analysisErrorCore.js";
// import { jsonValueSchema } from "../jsonValue.js";
// import type { ProcessTraceSpecification } from "./processTraceSpecification.js";
// import { processTraceComparisonResultSchema } from "./processTraceEvaluation.js";
// import {
//   dimensionsForTraceSources,
//   traceCoversObservedDimension,
// } from "./processTraceDimensionProjection.js";
//
// import {
//   compareProcessTraces,
//   processTraceOutcomesDiffer,
// } from "./processTraceComparison.js";
// const OPERATION = "compare_process_captures";
//
// /** Comparison classification that never equates incomplete evidence. */
// export const comparisonStatusSchema = z.enum([
//   "unchanged",
//   "added",
//   "removed",
//   "changed",
//   "truncated",
//   "unknown",
//   "contradiction",
// ]);
// type ComparisonStatus = z.infer<typeof comparisonStatusSchema>;
//
// /** Canonical ordered dimensions that contribute to an overall process status. */
// export const PROCESS_COMPARISON_DIMENSIONS = [
//   "terminal",
//   "interaction",
//   "exit",
//   "filesystem",
//   "process",
// ] as const;
//
// /** Derive the overall comparison status from every process dimension. */
// export const deriveProcessComparisonStatus = (
//   dimensions: readonly ComparisonStatus[],
// ): ComparisonStatus => {
//   if (dimensions.includes("truncated")) return "truncated";
//   if (
//     dimensions.some((status) =>
//       ["changed", "added", "removed"].includes(status),
//     )
//   )
//     return "changed";
//   return dimensions.includes("unknown") ? "unknown" : "unchanged";
// };
//
// /** Pure normalized comparison between two captures. */
// export const processCaptureComparisonSchema = z
//   .object({
//     status: comparisonStatusSchema,
//     terminal: comparisonStatusSchema,
//     interaction: comparisonStatusSchema,
//     exit: comparisonStatusSchema,
//     filesystem: comparisonStatusSchema,
//     process: comparisonStatusSchema,
//     first_divergence: z.discriminatedUnion("status", [
//       z.object({ status: z.literal("none") }),
//       z.object({ status: z.literal("unknown"), reason: z.string() }),
//       z.object({
//         status: z.literal("found"),
//         dimension: z.enum([
//           "terminal",
//           "interaction",
//           "exit",
//           "filesystem",
//           "process",
//         ]),
//         index: z.number().int().nonnegative(),
//         left_at_ms: z.number().int().nonnegative().nullable(),
//         right_at_ms: z.number().int().nonnegative().nullable(),
//         left: jsonValueSchema.nullable(),
//         right: jsonValueSchema.nullable(),
//       }),
//     ]),
//     trace: processTraceComparisonResultSchema.optional(),
//     limitations: z.array(z.string()),
//   })
//   .superRefine((comparison, context) => {
//     const expected = deriveProcessComparisonStatus(
//       PROCESS_COMPARISON_DIMENSIONS.map((dimension) => comparison[dimension]),
//     );
//     if (comparison.status !== expected)
//       context.addIssue({
//         code: "custom",
//         message: "Process comparison status contradicts its dimensions",
//         path: ["status"],
//       });
//   });
// export type ProcessCaptureComparison = z.infer<
//   typeof processCaptureComparisonSchema
// >;
//
// const terminalObservations = (capture: ProcessCapture): readonly unknown[] =>
//   [
//     ...capture.frames.map((frame) => ({
//       kind: "raw" as const,
//       ...comparableTerminalFrame(frame),
//     })),
//     ...capture.rendered_frames.map((frame) => ({
//       kind: "rendered" as const,
//       ...frame,
//     })),
//   ].sort((left, right) => {
//     const time = left.at_ms - right.at_ms;
//     if (time !== 0) return time;
//     if (left.kind !== right.kind) return left.kind === "raw" ? -1 : 1;
//     return left.sequence - right.sequence;
//   });
//
// const filesystemObservations = (capture: ProcessCapture): readonly unknown[] =>
//   capture.filesystem_checkpoints;
//
// const sameJsonValue = (left: unknown, right: unknown): boolean => {
//   const encodedLeft = canonicalize(left);
//   return encodedLeft !== undefined && encodedLeft === canonicalize(right);
// };
//
// /** Canonical observations for one process-comparison dimension. */
// export const processDimensionObservations = (
export const _l = 133;
