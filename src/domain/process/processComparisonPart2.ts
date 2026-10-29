export const __stub = 1;
//   capture: ProcessCapture,
//   dimension: (typeof PROCESS_COMPARISON_DIMENSIONS)[number],
// ): readonly unknown[] => {
//   switch (dimension) {
//     case "terminal":
//       return terminalObservations(capture);
//     case "interaction":
//       return capture.interaction_events;
//     case "exit":
//       return [{ ...capture.exit, settlement: capture.settlement }];
//     case "filesystem":
//       return filesystemObservations(capture);
//     case "process":
//       return capture.process_samples;
//   }
// };
//
// const classifyCollection = (
//   left: readonly unknown[],
//   right: readonly unknown[],
// ): ComparisonStatus => {
//   if (sameJsonValue(left, right)) return "unchanged";
//   if (left.length === 0) return "added";
//   if (right.length === 0) return "removed";
//   return "changed";
// };
//
// const hasUnknown = (
//   capture: ProcessCapture,
//   scope: ProcessCapture["residual_unknowns"][number]["scope"],
// ): boolean => capture.residual_unknowns.some((item) => item.scope === scope);
//
// type DivergenceDimension = Exclude<
//   ProcessCaptureComparison["first_divergence"],
//   { readonly status: "none" | "unknown" }
// >["dimension"];
//
// // Interactions record when their outcome was observed as the dispatch time;
// // every other timed observation uses at_ms.
// const EVENT_TIME_FIELD: Readonly<Record<DivergenceDimension, string>> = {
//   terminal: "at_ms",
//   interaction: "dispatched_at_ms",
//   exit: "at_ms",
//   filesystem: "at_ms",
//   process: "at_ms",
// };
//
// const eventTime = (
//   dimension: DivergenceDimension,
//   value: unknown,
// ): number | null => {
//   if (typeof value !== "object" || value === null) return null;
//   const time: unknown = Reflect.get(value, EVENT_TIME_FIELD[dimension]);
//   return typeof time === "number" && Number.isSafeInteger(time) && time >= 0
//     ? time
//     : null;
// };
//
// const firstCollectionDivergence = (
//   dimension: DivergenceDimension,
//   left: readonly unknown[],
//   right: readonly unknown[],
// ): Extract<
//   ProcessCaptureComparison["first_divergence"],
//   { readonly status: "found" }
// > | null => {
//   const length = Math.max(left.length, right.length);
//   for (let index = 0; index < length; index += 1) {
//     const leftValue = left[index] ?? null;
//     const rightValue = right[index] ?? null;
//     if (sameJsonValue(leftValue, rightValue)) continue;
//     return {
//       status: "found",
//       dimension,
//       index,
//       left_at_ms: eventTime(dimension, leftValue),
//       right_at_ms: eventTime(dimension, rightValue),
//       left: jsonValueSchema.parse(leftValue),
//       right: jsonValueSchema.parse(rightValue),
//     };
//   }
//   return null;
// };
//
// const chooseFirstDivergence = (
//   candidates: ReadonlyArray<Extract<
//     ProcessCaptureComparison["first_divergence"],
//     { readonly status: "found" }
//   > | null>,
// ): ProcessCaptureComparison["first_divergence"] => {
//   const found = candidates.filter(
//     (candidate): candidate is NonNullable<typeof candidate> =>
//       candidate !== null,
//   );
//   return (
//     found.sort((left, right) => {
//       const leftTime = Math.min(
//         left.left_at_ms ?? Number.MAX_SAFE_INTEGER,
//         left.right_at_ms ?? Number.MAX_SAFE_INTEGER,
//       );
//       const rightTime = Math.min(
//         right.left_at_ms ?? Number.MAX_SAFE_INTEGER,
//         right.right_at_ms ?? Number.MAX_SAFE_INTEGER,
//       );
//       return leftTime - rightTime;
//     })[0] ?? { status: "none" }
//   );
// };
//
// const assertComparable = (
//   left: ProcessCapture,
//   right: ProcessCapture,
//   options: { readonly maxCaptureAgeMs?: number; readonly now?: () => number },
// ): void => {
//   if (
//     left.manifest.comparison_contract_sha256 !==
//     right.manifest.comparison_contract_sha256
//   ) {
//     const fields = differingContractFields(
//       left.manifest.comparison_contract,
//       right.manifest.comparison_contract,
//     );
//     throw new AnalysisInputError(OPERATION, undefined, [
//       {
//         path: ["right"],
//         reason: "invalid_value",
//         message: `Process captures have incompatible comparison contracts${fields.length === 0 ? "" : `; these scenario fields differ: ${fields.join(", ")}`}. Capture both scenarios with the same values for these fields, then compare them.`,
//         expected: fields,
//       },
//     ]);
//   }
//   if (options.maxCaptureAgeMs === undefined) return;
//   const maxCaptureAgeMs = options.maxCaptureAgeMs;
export const _l = 133;
