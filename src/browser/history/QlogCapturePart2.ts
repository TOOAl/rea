export const __stub = 1;
//       traces: facts,
//     },
//   };
// };
//
// const createTraceFact = (
//   trace: Record<string, unknown> & { events: unknown[] },
//   traceIndex: number,
//   sensitiveValues: readonly string[],
//   ancestorsHidden: boolean,
// ): Trace => {
//   const tracePointer = `/traces/${traceIndex}`;
//   const metadata = project(
//     { ...trace, events: null },
//     sensitiveValues,
//   ).reported;
//   const meta = !ancestorsHidden && object(metadata) ? metadata : null;
//   const common =
//     meta !== null && object(meta.common_fields) ? meta.common_fields : null;
//   const vantage =
//     meta !== null && object(meta.vantage_point)
//       ? meta.vantage_point.type
//       : null;
//   return {
//     trace_index: traceIndex,
//     location: ancestorsHidden
//       ? { kind: "unknown", reason: "explicit-sensitive-value" }
//       : { kind: "json-pointer", pointer: tracePointer },
//     event_count: trace.events.length,
//     odcid: typeof common?.ODCID === "string" ? common.ODCID : null,
//     vantage_point:
//       vantage === "client" || vantage === "server" ? vantage : null,
//     loss_declarations: [],
//     streams: [],
//     incomplete_fact_records: [],
//   };
// };
//
// const validateTrace = (
//   trace: unknown,
//   index: number,
// ): Record<string, unknown> & { events: unknown[] } => {
//   const pointer = `/traces/${index}`;
//   if (!object(trace) || !Array.isArray(trace.events))
//     return invalid("qlog trace must contain an events array.", pointer);
//   for (const [eventIndex, event] of trace.events.entries()) {
//     const eventPointer = `${pointer}/events/${eventIndex}`;
//     if (
//       !object(event) ||
//       typeof event.name !== "string" ||
//       !(event.time instanceof LosslessNumber) ||
//       !Number.isFinite(Number(event.time.value)) ||
//       !object(event.data)
//     )
//       invalid(
//         "qlog events must be objects with name, finite numeric time and object data.",
//         eventPointer,
//       );
//     // Validate interpretable fields on ORIGINAL values even when a declaration
//     // subsequently hides them. Missing fields remain meaningful unknowns.
//     if (event.name === "recovery:packet_lost")
//       unsigned(event.data.packet_number, `${eventPointer}/data/packet_number`);
//     if (packetEvent(event.name) && Array.isArray(event.data.frames)) {
//       for (const [frameIndex, frame] of event.data.frames.entries()) {
//         if (object(frame) && frame.frame_type === "stream") {
//           validateStreamFrame(
//             frame,
//             `${eventPointer}/data/frames/${frameIndex}`,
//           );
//         }
//       }
//     }
//   }
//   return { ...trace, events: trace.events };
// };
//
// const validateStreamFrame = (
//   frame: Record<string, unknown>,
//   p: string,
// ): void => {
//   unsigned(frame.stream_id, `${p}/stream_id`);
//   const offset = unsigned(frame.offset, `${p}/offset`);
//   const length = unsigned(frame.length, `${p}/length`);
//   if (offset !== null && length !== null && offset + length > MAX_VARINT)
//     invalid("qlog stream final offset exceeds the QUIC varint range.", p);
//   if (
//     frame.fin !== undefined &&
//     frame.fin !== null &&
//     typeof frame.fin !== "boolean"
//   )
//     invalid("qlog STREAM fin must be boolean when reported.", `${p}/fin`);
// };
//
// const collectTransportFacts = (
//   projection: Projection,
//   ordinal: number,
//   state: {
//     fact: Trace;
//     streams: Map<string, Stream>;
//     excluded: (value: string) => boolean;
//     /** Validated source event name, before declarations are applied. */
//     name: string;
//   },
// ): void => {
//   const { fact, streams, excluded, name } = state;
//   if (!object(projection.reported) || !object(projection.reported.data)) {
//     fact.incomplete_fact_records.push(ordinal);
//     return;
//   }
//   const visible = projection.reported;
//   // Facts are selected by event name, so a declaration that hides the name
//   // of a loss or packet event omits its facts like any other hidden field.
//   if (
//     (name === "recovery:packet_lost" || packetEvent(name)) &&
//     visible.name !== name
//   ) {
//     fact.incomplete_fact_records.push(ordinal);
//     return;
//   }
//   const data = visible.data;
//   if (!object(data)) return;
//   const literals = new Map(
//     projection.numeric_literals.map((n) => [n.pointer, n.literal]),
//   );
//   const read = (value: unknown, pointer: string): bigint | null => {
//     const literal = literals.get(pointer);
//     const number = unsigned(
//       literal === undefined ? value : new LosslessNumber(literal),
//       pointer,
//     );
export const _l = 130;
