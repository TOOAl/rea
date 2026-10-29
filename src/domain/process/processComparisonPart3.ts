export const __stub = 1;
//   const now = (options.now ?? Date.now)();
//   const stale = (
//     [
//       ["left", left],
//       ["right", right],
//     ] as const
//   ).flatMap(([side, { manifest }]) => {
//     const age = now - Date.parse(manifest.completed_at);
//     return age > maxCaptureAgeMs
//       ? [
//           `${side} completed at ${manifest.completed_at} (${String(age)} ms ago)`,
//         ]
//       : [];
//   });
//   if (stale.length > 0)
//     throw new AnalysisInputError(OPERATION, undefined, [
//       {
//         path: ["max_capture_age_ms"],
//         reason: "out_of_range",
//         message: `Process capture exceeds max_capture_age_ms ${String(maxCaptureAgeMs)}: ${stale.join("; ")}. Recapture the stale scenario or raise max_capture_age_ms.`,
//       },
//     ]);
// };
//
// /** Name top-level contract fields whose canonical values differ. */
// const differingContractFields = (
//   left: Readonly<Record<string, unknown>>,
//   right: Readonly<Record<string, unknown>>,
// ): string[] =>
//   [...new Set([...Object.keys(left), ...Object.keys(right)])]
//     .filter(
//       (field) =>
//         !Object.hasOwn(left, field) ||
//         !Object.hasOwn(right, field) ||
//         canonicalize(left[field]) !== canonicalize(right[field]),
//     )
//     .sort();
//
// const LOCATION_SOURCES = {
//   frames: "terminal_raw",
//   rendered_frames: "terminal_rendered",
//   interaction_events: "interaction",
//   lifecycle: "lifecycle",
//   process_samples: "process",
//   filesystem_checkpoints: "filesystem",
// } as const satisfies Record<
//   ProcessObservationLocation["collection"],
//   ProcessObservationSource
// >;
//
// const applyTraceVerdict = (
//   dimensions: ComparisonDimensions,
//   specification: ProcessTraceSpecification,
//   trace: ReturnType<typeof compareProcessTraces>,
//   captures: readonly [left: ProcessCapture, right: ProcessCapture],
// ): ComparisonDimensions => {
//   const traceShowsDifference = processTraceOutcomesDiffer(trace);
//   const traceStatus =
//     trace.verdict === "unknown"
//       ? "unknown"
//       : trace.verdict === "equivalent" || !traceShowsDifference
//         ? "unchanged"
//         : "changed";
//   const sources = new Set(specification.events.map(({ source }) => source));
//   const covered = dimensionsForTraceSources(sources);
//   // A different verdict names the failing events and observations; attribute
//   // it only to their dimensions; unrelated comparisons keep their own status,
//   // including unknown coverage and independently observed additions/removals.
//   const diagnosticSources = new Set<ProcessObservationSource>([
//     ...specification.events
//       .filter(({ id }) => trace.diagnostic?.event_ids.includes(id) === true)
//       .map(({ source }) => source),
//     ...(trace.diagnostic?.locations ?? []).map(
//       ({ collection }) => LOCATION_SOURCES[collection],
//     ),
//   ]);
//   const attributed =
//     diagnosticSources.size > 0
//       ? dimensionsForTraceSources(diagnosticSources)
//       : covered;
//   const statusFor = (
//     dimension: (typeof PROCESS_COMPARISON_DIMENSIONS)[number],
//   ): ComparisonStatus => {
//     const exact = dimensions[dimension];
//     if (!covered.has(dimension)) return exact;
//     if (trace.verdict === "nonconforming") return exact;
//     if (trace.verdict === "different")
//       return traceShowsDifference && attributed.has(dimension)
//         ? "changed"
//         : exact;
//     if (
//       trace.verdict === "unknown" &&
//       ["changed", "added", "removed"].includes(exact)
//     )
//       return exact;
//     return traceCoversObservedDimension(
//       dimension,
//       sources,
//       captures[0],
//       captures[1],
//     )
//       ? traceStatus
//       : exact;
//   };
//   return {
//     terminal: statusFor("terminal"),
//     interaction: statusFor("interaction"),
//     exit: statusFor("exit"),
//     filesystem: statusFor("filesystem"),
//     process: statusFor("process"),
//   };
// };
//
// type ComparisonDimensions = Pick<
//   ProcessCaptureComparison,
//   "terminal" | "interaction" | "exit" | "filesystem" | "process"
// >;
//
// const compareDimensions = (
//   left: ProcessCapture,
//   right: ProcessCapture,
//   sameNormalization: boolean,
// ): ComparisonDimensions => {
//   const classify = (
//     scope: ProcessCapture["residual_unknowns"][number]["scope"],
//     leftValues: readonly unknown[],
//     rightValues: readonly unknown[],
//     source: ProcessObservationSource,
//   ): ComparisonStatus =>
//     !sameNormalization ||
//     hasUnknown(left, scope) ||
//     hasUnknown(right, scope) ||
//     processSourceTruncated(left, source) ||
export const _l = 133;
