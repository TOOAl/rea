export const __stub = 1;
//       rawTrace: trace.rawTrace,
//     }),
//     satisfied,
//   };
// };
//
// const boundaryFailure = (
//   trace: MatchedTrace,
//   kind: "prefix" | "suffix",
//   expected: readonly string[],
// ): EvaluatedSide | null => {
//   const ids = trace.rawTrace.map(({ event_id }) => event_id);
//   const actual =
//     kind === "prefix"
//       ? ids.slice(0, expected.length)
//       : expected.length === 0
//         ? []
//         : ids.slice(-expected.length);
//   if (canonicalTraceJson(actual) === canonicalTraceJson(expected)) return null;
//   const locations =
//     kind === "prefix"
//       ? trace.rawTrace.slice(0, expected.length)
//       : trace.rawTrace.slice(-expected.length);
//   return failure({
//     kind,
//     message: `Observed trace does not satisfy the declared ${kind}.`,
//     eventIds: expected,
//     locations: locations.map(({ location }) => location),
//     rawTrace: trace.rawTrace,
//   });
// };
//
// const evaluatePartialOrder = (
//   trace: MatchedTrace,
//   language: PartialOrderLanguage,
// ): EvaluatedSide => {
//   const ordering = evaluateOrderingConstraints(trace, language);
//   if (ordering.failure !== null) return ordering.failure;
//   const prefixFailure = boundaryFailure(trace, "prefix", language.prefix);
//   if (prefixFailure !== null) return prefixFailure;
//   const suffixFailure = boundaryFailure(trace, "suffix", language.suffix);
//   if (suffixFailure !== null) return suffixFailure;
//   const satisfied = ordering.satisfied;
//   satisfied.push(
//     ...language.unordered_groups.map(
//       ({ events }) => `unordered:${events.join(":")}`,
//     ),
//   );
//   if (language.prefix.length > 0)
//     satisfied.push(`prefix:${language.prefix.join(":")}`);
//   if (language.suffix.length > 0)
//     satisfied.push(`suffix:${language.suffix.join(":")}`);
//   return {
//     result: {
//       status: "pass",
//       matched_variant: null,
//       satisfied_constraints: satisfied,
//       raw_trace: trace.rawTrace,
//     },
//     diagnostic: null,
//   };
// };
//
// const evaluateMatchedTrace = (
//   trace: MatchedTrace,
//   specification: ProcessTraceSpecification,
// ): EvaluatedSide => {
//   const invalidCardinality = cardinalityFailure(trace, specification);
//   if (invalidCardinality !== null) return invalidCardinality;
//   if (specification.language.kind === "partial_order")
//     return evaluatePartialOrder(trace, specification.language);
//   const ids = trace.rawTrace.map(({ event_id }) => event_id);
//   const evaluation = evaluateFiniteTrace(ids, specification.language);
//   return evaluation.status === "fail"
//     ? failure({
//         kind: "trace",
//         message: "Observed events do not match any finite trace variant.",
//         eventIds: evaluation.eventIds,
//         locations: evaluation.locationIndexes.flatMap((index) => {
//           const location = trace.rawTrace[index]?.location;
//           return location === undefined ? [] : [location];
//         }),
//         rawTrace: trace.rawTrace,
//       })
//     : {
//         result: {
//           status: "pass",
//           matched_variant: evaluation.variant,
//           satisfied_constraints: [`variant:${evaluation.variant}`],
//           raw_trace: trace.rawTrace,
//         },
//         diagnostic: null,
//       };
// };
//
// export const evaluateProcessTraceSide = (
//   capture: ProcessCapture,
//   specification: ProcessTraceSpecification,
// ): EvaluatedSide => {
//   const sources = new Set(specification.events.map(({ source }) => source));
//   const relevantScopes = scopesFor(sources);
//   const incomplete =
//     [...sources].some((source) => processSourceTruncated(capture, source)) ||
//     capture.residual_unknowns.some(({ scope }) => relevantScopes.has(scope));
//   if (capture.event_journal.length === 0)
//     return {
//       result: unknownSide(),
//       diagnostic: {
//         kind: "journal",
//         message: "Capture has no cross-source event journal.",
//         event_ids: [],
//         locations: [],
//       },
//     };
//   const matched = matchRecords(collectRecords(capture, sources), specification);
//   if (incomplete)
//     return {
//       result: unknownSide(
//         "rawTrace" in matched ? matched.rawTrace : matched.result.raw_trace,
//       ),
//       diagnostic: null,
//     };
//   return "rawTrace" in matched
//     ? evaluateMatchedTrace(matched, specification)
//     : matched;
// };
export const _l = 126;
