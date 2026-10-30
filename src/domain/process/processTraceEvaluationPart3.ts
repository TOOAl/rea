export const __stub = 1;
//       event,
//     );
//   }
//   for (const record of records) {
//     const match = eventsByKey.get(
//       `${record.source}\0${canonicalTraceJson(
//         comparableProcessObservationPayload(
//           record.payload,
//           ignoredFieldsBySource.get(record.source),
//         ),
//       )}`,
//     );
//     if (match === undefined)
//       return failure({
//         kind: "predicate",
//         message: "Observed event does not match any declared exact predicate.",
//         eventIds: [],
//         locations: [record.location],
//         rawTrace,
//       });
//     rawTrace.push({ event_id: match.id, location: record.location });
//     const locations = locationsById.get(match.id) ?? [];
//     locations.push(record.location);
//     locationsById.set(match.id, locations);
//   }
//   return { rawTrace, locationsById };
// };
//
// const cardinalityFailure = (
//   trace: MatchedTrace,
//   specification: ProcessTraceSpecification,
// ): EvaluatedSide | null => {
//   for (const event of specification.events) {
//     const [minimum, maximum] = processTraceCardinalityBounds(event.cardinality);
//     const locations = trace.locationsById.get(event.id) ?? [];
//     if (locations.length < minimum || locations.length > maximum)
//       return failure({
//         kind: "cardinality",
//         message: `${event.id} observed ${String(locations.length)} times; expected ${String(minimum)}..${String(maximum)}.`,
//         eventIds: [event.id],
//         locations,
//         rawTrace: trace.rawTrace,
//       });
//   }
//   return null;
// };
//
// type PartialOrderLanguage = Extract<
//   ProcessTraceSpecification["language"],
//   { readonly kind: "partial_order" }
// >;
//
// const evaluateOrderingConstraints = (
//   trace: MatchedTrace,
//   language: PartialOrderLanguage,
// ): { readonly failure: EvaluatedSide | null; readonly satisfied: string[] } => {
//   const satisfied: string[] = [];
//   const failures: FailureInput[] = [];
//   for (const edge of language.happens_before) {
//     const before = trace.locationsById.get(edge.before) ?? [];
//     const after = trace.locationsById.get(edge.after) ?? [];
//     const lastBefore = before.at(-1);
//     const firstAfter = after[0];
//     if (lastBefore === undefined && firstAfter !== undefined)
//       failures.push({
//         kind: "edge",
//         message: `${edge.before} is required when ${edge.after} occurs.`,
//         eventIds: [edge.before, edge.after],
//         locations: [firstAfter],
//         rawTrace: trace.rawTrace,
//       });
//     else if (
//       lastBefore !== undefined &&
//       firstAfter !== undefined &&
//       lastBefore.capture_order >= firstAfter.capture_order
//     )
//       failures.push({
//         kind: "edge",
//         message: `${edge.before} must happen before ${edge.after}.`,
//         eventIds: [edge.before, edge.after],
//         locations: [lastBefore, firstAfter],
//         rawTrace: trace.rawTrace,
//       });
//     else satisfied.push(`happens_before:${edge.before}:${edge.after}`);
//   }
//   for (const constraint of language.not_before) {
//     const events = trace.locationsById.get(constraint.event) ?? [];
//     const anchors = trace.locationsById.get(constraint.anchor) ?? [];
//     const firstEvent = events[0];
//     const firstAnchor = anchors[0];
//     if (firstEvent !== undefined && firstAnchor === undefined)
//       failures.push({
//         kind: "edge",
//         message: `${constraint.anchor} is required when ${constraint.event} occurs.`,
//         eventIds: [constraint.event, constraint.anchor],
//         locations: [firstEvent],
//         rawTrace: trace.rawTrace,
//       });
//     else if (
//       firstEvent !== undefined &&
//       firstAnchor !== undefined &&
//       firstEvent.capture_order < firstAnchor.capture_order
//     )
//       failures.push({
//         kind: "edge",
//         message: `${constraint.event} must not occur before ${constraint.anchor}.`,
//         eventIds: [constraint.event, constraint.anchor],
//         locations: [firstEvent, firstAnchor],
//         rawTrace: trace.rawTrace,
//       });
//     else satisfied.push(`not_before:${constraint.event}:${constraint.anchor}`);
//   }
//   if (failures.length === 0) return { failure: null, satisfied };
//   const unique = <T>(values: readonly T[], key: (value: T) => string): T[] => [
//     ...new Map(values.map((value) => [key(value), value])).values(),
//   ];
//   return {
//     failure: failure({
//       kind: "edge",
//       message: failures.map(({ message }) => message).join(" "),
//       eventIds: unique(
//         failures.flatMap(({ eventIds }) => eventIds),
//         String,
//       ),
//       locations: unique(
//         failures.flatMap(({ locations }) => locations),
//         ({ collection, index }) => `${collection}:${String(index)}`,
//       ),
export const _l = 128;
