export const __stub = 1;
// import { isSafeNumber, LosslessNumber } from "lossless-json";
// import type { JsonValue } from "../../domain/jsonValue.js";
// import type { QlogCaptureFacts } from "../../domain/qlogCapture.js";
// import {
//   webNetworkCapturePayloadSchema,
//   type WebNetworkCaptureRecord,
// } from "../../domain/webNetworkCapture.js";
// import type { z } from "zod";
// import { parseCaptureJson } from "./CaptureJson.js";
// import { CaptureFormatError } from "./CaptureFormatError.js";
// import {
//   CaptureRedaction,
//   captureObject,
//   capturePointer,
// } from "./CaptureRedaction.js";
// import { QLOG_CAPTURE_PROVIDER_IDENTITY } from "./CaptureRelease.js";
//
// const MAX_VARINT = (1n << 62n) - 1n;
// const credentials = new Set([
//   "authorization",
//   "proxy-authorization",
//   "cookie",
//   "set-cookie",
// ]);
// type Projection = Pick<
//   WebNetworkCaptureRecord,
//   "reported" | "numeric_literals" | "binary_fields" | "redactions"
// >;
// type Trace = QlogCaptureFacts["traces"][number];
// type Stream = Trace["streams"][number];
//
// /** Inspect the selected aioquic JSON profile without authenticating its producer or interpreting other qlog layouts. */
// export const decodeQlogCapture = (
//   text: string,
//   sensitiveValues: readonly string[],
// ): z.output<typeof webNetworkCapturePayloadSchema> => {
//   const raw = parseCaptureJson(text, "qlog");
//   if (!object(raw) || raw.qlog_format !== "JSON" || raw.qlog_version !== "0.3")
//     throw new CaptureFormatError(
//       "unsupported",
//       "Only the aioquic 1.5.0 JSON qlog 0.3 profile is supported.",
//     );
//   if (!Array.isArray(raw.traces))
//     return invalid("qlog must contain a traces array.", "/traces");
//   const traces = raw.traces.map(validateTrace);
//   const container = project(
//     { ...raw, traces: traces.map((trace) => ({ ...trace, events: null })) },
//     sensitiveValues,
//   );
//   const records: WebNetworkCaptureRecord[] = [];
//   const facts: Trace[] = [];
//   const excluded = (value: string): boolean =>
//     sensitiveValues.some((literal) => value.includes(literal));
//   const ancestorsHidden = excluded("traces") || excluded("events");
//   for (const [traceIndex, trace] of traces.entries()) {
//     const tracePointer = `/traces/${traceIndex}`;
//     const fact = createTraceFact(
//       trace,
//       traceIndex,
//       sensitiveValues,
//       ancestorsHidden,
//     );
//     const streams = new Map<string, Stream>();
//     for (const [eventIndex, event] of trace.events.entries()) {
//       const ordinal = records.length;
//       const projection: Projection = ancestorsHidden
//         ? {
//             reported: null,
//             numeric_literals: [],
//             binary_fields: [],
//             redactions: [{ pointer: "", reason: "explicit-sensitive-value" }],
//           }
//         : project(event, sensitiveValues);
//       records.push({
//         ordinal,
//         location: ancestorsHidden
//           ? { kind: "unknown", reason: "explicit-sensitive-value" }
//           : {
//               kind: "json-pointer",
//               pointer: `${tracePointer}/events/${eventIndex}`,
//             },
//         ...projection,
//         limitations: [
//           "Record ordinal is derived from trace/event source traversal, not global time order. Qlog lengths and FIN do not expose original HTTP body bytes or establish network completeness.",
//         ],
//       });
//       collectTransportFacts(projection, ordinal, {
//         fact,
//         streams,
//         excluded,
//         name: object(event) && typeof event.name === "string" ? event.name : "",
//       });
//     }
//     for (const stream of streams.values()) {
//       summarizeStream(stream);
//       const numericValues = [
//         stream.frame_length_sum,
//         stream.unique_bytes,
//         stream.repeated_bytes,
//         ...stream.reported_final_sizes,
//         ...stream.covered_ranges.flatMap((r) => [r.start, r.end]),
//       ];
//       // A stream can have more contributions than call arguments allow.
//       if (numericValues.some(excluded))
//         for (const contribution of stream.contributions)
//           fact.incomplete_fact_records.push(contribution.record_ordinal);
//       else fact.streams.push(stream);
//     }
//     fact.incomplete_fact_records = [...new Set(fact.incomplete_fact_records)];
//     facts.push(fact);
//   }
//   return {
//     decoder: { ...QLOG_CAPTURE_PROVIDER_IDENTITY },
//     container: {
//       reported: container.reported,
//       numeric_literals: container.numeric_literals,
//       redactions: container.redactions,
//       records_pointer: null,
//     },
//     total_records: records.length,
//     records,
//     qlog: {
//       profile: "aioquic-1.5.0-json-0.3",
//       scope: "all-recorded-events-before-selection",
//       body_bytes: "not-reported",
//       clock: {
//         unit: "milliseconds",
//         domain: "unix-epoch",
//         basis: "selected-aioquic-profile-not-producer-authentication",
//       },
export const _l = 130;
