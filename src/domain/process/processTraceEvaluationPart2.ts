export const __stub = 1;
//       readonly status: "fail";
//       readonly eventIds: readonly string[];
//       readonly locationIndexes: readonly number[];
//     };
//
// /** Match variants once, retaining the best-prefix mismatch for attribution. */
// const evaluateFiniteTrace = (
//   ids: readonly string[],
//   language: Extract<
//     ProcessTraceSpecification["language"],
//     { kind: "finite_traces" }
//   >,
// ): FiniteTraceEvaluation => {
//   let bestPrefix = -1;
//   const bestEventIds = new Set<string>();
//   const bestLocationIndexes = new Set<number>();
//
//   const recordMismatch = (
//     offset: number,
//     missing: readonly string[],
//     unexpected: readonly { readonly id: string; readonly index: number }[],
//   ): void => {
//     if (offset > bestPrefix) {
//       bestPrefix = offset;
//       bestEventIds.clear();
//       bestLocationIndexes.clear();
//     }
//     if (offset !== bestPrefix) return;
//     for (const eventId of missing) bestEventIds.add(eventId);
//     for (const { id, index } of unexpected) {
//       bestEventIds.add(id);
//       bestLocationIndexes.add(index);
//     }
//   };
//
//   for (const variant of language.variants) {
//     let offset = 0;
//     let mismatched = false;
//     for (const token of variant.trace) {
//       const expected = typeof token === "string" ? [token] : token.unordered;
//       const actual = ids.slice(offset, offset + expected.length);
//       const remaining = new Map<string, number>();
//       for (const eventId of expected)
//         remaining.set(eventId, (remaining.get(eventId) ?? 0) + 1);
//       const unexpected: Array<{ readonly id: string; readonly index: number }> =
//         [];
//       for (const [index, eventId] of actual.entries()) {
//         const count = remaining.get(eventId) ?? 0;
//         if (count === 0)
//           unexpected.push({ id: eventId, index: offset + index });
//         else if (count === 1) remaining.delete(eventId);
//         else remaining.set(eventId, count - 1);
//       }
//       const missing = [...remaining].flatMap(([eventId, count]) =>
//         Array.from({ length: count }, () => eventId),
//       );
//       if (
//         missing.length > 0 ||
//         unexpected.length > 0 ||
//         actual.length < expected.length
//       ) {
//         recordMismatch(offset, missing, unexpected);
//         mismatched = true;
//         break;
//       }
//       offset += expected.length;
//     }
//
//     if (mismatched) continue;
//     if (offset === ids.length) return { status: "pass", variant: variant.id };
//     const unexpected = ids[offset];
//     recordMismatch(
//       offset,
//       [],
//       unexpected === undefined ? [] : [{ id: unexpected, index: offset }],
//     );
//   }
//
//   return {
//     status: "fail",
//     eventIds: [...bestEventIds],
//     locationIndexes: [...bestLocationIndexes],
//   };
// };
//
// type MatchedTrace = {
//   readonly rawTrace: z.infer<typeof matchedEventSchema>[];
//   readonly locationsById: ReadonlyMap<string, ProcessObservationLocation[]>;
// };
//
// const collectRecords = (
//   capture: ProcessCapture,
//   sources: ReadonlySet<ProcessObservationSource>,
// ): readonly TraceRecord[] => {
//   const records: TraceRecord[] = [];
//   for (const location of capture.event_journal) {
//     const record = projectProcessObservation(capture, location);
//     if (record !== null && sources.has(record.source))
//       records.push({
//         source: record.source,
//         payload: record.payload,
//         location,
//       });
//   }
//   return records;
// };
//
// const matchRecords = (
//   records: readonly TraceRecord[],
//   specification: ProcessTraceSpecification,
// ): MatchedTrace | EvaluatedSide => {
//   const rawTrace: z.infer<typeof matchedEventSchema>[] = [];
//   const locationsById = new Map<string, ProcessObservationLocation[]>();
//   const ignoredFieldsBySource = new Map<
//     ProcessObservationSource,
//     readonly string[]
//   >();
//   const eventsByKey = new Map<
//     string,
//     ProcessTraceSpecification["events"][number]
//   >();
//   for (const event of specification.events) {
//     const ignoredFields = event.ignore_fields ?? [];
//     ignoredFieldsBySource.set(event.source, ignoredFields);
//     eventsByKey.set(
//       `${event.source}\0${canonicalTraceJson(
//         comparableProcessObservationPayload(event.exact, ignoredFields),
//       )}`,
export const _l = 128;
