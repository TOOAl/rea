export const __stub = 1;
//     return number !== null && excluded(number.toString()) ? null : number;
//   };
//   if (visible.name === "recovery:packet_lost") {
//     fact.loss_declarations.push(lossDeclaration(data, ordinal, read));
//   }
//   if (!packetEvent(visible.name)) return;
//   if (!Array.isArray(data.frames)) {
//     fact.incomplete_fact_records.push(ordinal);
//     return;
//   }
//   for (const [frameIndex, frame] of data.frames.entries()) {
//     if (
//       !object(frame) ||
//       frame.frame_type === undefined ||
//       frame.frame_type === null
//     ) {
//       fact.incomplete_fact_records.push(ordinal);
//       continue;
//     }
//     if (frame.frame_type !== "stream") continue;
//     const p = `/data/frames/${frameIndex}`;
//     const id = read(frame.stream_id, `${p}/stream_id`),
//       offset = read(frame.offset, `${p}/offset`),
//       length = read(frame.length, `${p}/length`);
//     if (id === null || offset === null || length === null) {
//       fact.incomplete_fact_records.push(ordinal);
//       continue;
//     }
//     const direction =
//       visible.name === "transport:packet_sent" ? "sent" : "received";
//     const key = `${direction}/${id}`;
//     let stream = streams.get(key);
//     if (stream === undefined) {
//       stream = {
//         stream_id: id.toString(),
//         direction,
//         confidence: "derived",
//         scope: "observed-stream-frame-ranges",
//         contributions: [],
//         covered_ranges: [],
//         unique_bytes: "0",
//         frame_length_sum: "0",
//         repeated_bytes: "0",
//         reported_final_sizes: [],
//       };
//       streams.set(key, stream);
//     }
//     stream.contributions.push({
//       record_ordinal: ordinal,
//       frame_index: frameIndex,
//       offset: offset.toString(),
//       length: length.toString(),
//       fin: typeof frame.fin === "boolean" ? frame.fin : null,
//     });
//   }
// };
//
// const lossDeclaration = (
//   data: Record<string, unknown>,
//   ordinal: number,
//   read: (value: unknown, pointer: string) => bigint | null,
// ): Trace["loss_declarations"][number] => {
//   const pn = read(data.packet_number, "/data/packet_number");
//   const type = typeof data.type === "string" ? data.type : null;
//   return {
//     record_ordinal: ordinal,
//     confidence: "observed",
//     packet_number:
//       pn === null
//         ? {
//             state: "unknown",
//             reason: "omitted-null-or-redacted",
//           }
//         : { state: "reported", value: pn.toString() },
//     packet_type: type,
//     packet_number_space:
//       type === "initial"
//         ? "initial"
//         : type === "handshake"
//           ? "handshake"
//           : type === "0RTT" || type === "1RTT"
//             ? "application"
//             : null,
//   };
// };
//
// const summarizeStream = (stream: Stream): void => {
//   const spans = stream.contributions
//     .map(
//       (c) => [BigInt(c.offset), BigInt(c.offset) + BigInt(c.length)] as const,
//     )
//     .sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
//   const merged: { start: bigint; end: bigint }[] = [];
//   for (const [start, end] of spans) {
//     if (start === end) continue;
//     const last = merged.at(-1);
//     if (last !== undefined && start <= last.end)
//       last.end = end > last.end ? end : last.end;
//     else merged.push({ start, end });
//   }
//   const sum = stream.contributions.reduce((s, c) => s + BigInt(c.length), 0n);
//   const unique = merged.reduce((s, r) => s + r.end - r.start, 0n);
//   stream.covered_ranges = merged.map((r) => ({
//     start: r.start.toString(),
//     end: r.end.toString(),
//   }));
//   stream.frame_length_sum = sum.toString();
//   stream.unique_bytes = unique.toString();
//   stream.repeated_bytes = (sum - unique).toString();
//   stream.reported_final_sizes = [
//     ...new Set(
//       stream.contributions
//         .filter((c) => c.fin === true)
//         .map((c) => (BigInt(c.offset) + BigInt(c.length)).toString()),
//     ),
//   ];
// };
//
// const packetEvent = (name: unknown): boolean =>
//   name === "transport:packet_sent" || name === "transport:packet_received";
// const object = (value: unknown): value is Record<string, unknown> =>
//   captureObject(value) && !(value instanceof LosslessNumber);
// const invalid = (message: string, pointer: string): never => {
//   throw new CaptureFormatError("format", message, pointer);
// };
//
// /** Canonicalize JSON integer notation exactly, checking expansion before allocation. */
// const unsigned = (value: unknown, pointer: string): bigint | null => {
//   if (value === undefined || value === null) return null;
//   const literal =
export const _l = 130;
