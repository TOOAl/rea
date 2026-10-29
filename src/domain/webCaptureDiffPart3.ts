export const __stub = 1;
//     changes: [],
//     reason:
//       compared.reason === null
//         ? responseEvidenceReason
//         : `${responseEvidenceReason} ${compared.reason}`,
//   };
// };
//
// const networkMap = (
//   inspection: WebPageInspection,
//   sources: ReadonlyMap<string, BodyShapeSources>,
//   projection: {
//     readonly metadataFields: ReadonlyMap<
//       string,
//       ReadonlySet<NetworkMetadataField>
//     >;
//     readonly ambiguousIdentities: ReadonlySet<string>;
//     readonly inventoryComplete: boolean;
//   },
// ): ReadonlyMap<string, string> => {
//   const grouped = new Map<string, string[]>();
//   for (const request of inspection.network.requests) {
//     const identity = networkIdentity(request);
//     // A missing type can move repeated requests between these buckets. Neither
//     // their counts nor fingerprints establish a change to that typed group.
//     if (projection.ambiguousIdentities.has(identity)) continue;
//     const shapes = sources.get(identity);
//     const values = grouped.get(identity) ?? [];
//     const response: Record<string, unknown> = {};
//     for (const field of projection.metadataFields.get(identity) ?? [])
//       response[field] = request[field];
//     values.push(
//       digestCanonicalValue({
//         ...response,
//         redirects: (request.redirects ?? []).map(
//           (
//             {
//               request_timestamp: _requestTimestamp,
//               redirect_event_timestamp: _redirectEventTimestamp,
//               ...redirect
//             },
//             index,
//           ) => {
//             const response: Partial<
//               Record<NetworkMetadataField, number | string>
//             > = {};
//             for (const field of projection.metadataFields.get(
//               redirectNetworkIdentity(identity, index),
//             ) ?? [])
//               if (redirect[field] !== null) response[field] = redirect[field];
//             return {
//               url: redirect.url,
//               response_url: redirect.response_url,
//               method: redirect.method,
//               ...response,
//             };
//           },
//         ),
//         initiator: request.initiator,
//         ...(shapes?.request === true
//           ? { request_shape: request.body_shapes.request }
//           : {}),
//         ...(shapes?.response === true
//           ? { response_shape: request.body_shapes.response }
//           : {}),
//       }),
//     );
//     grouped.set(identity, values);
//   }
//   return new Map(
//     [...grouped].map(([identity, values]) => [
//       identity,
//       digestCanonicalValue(
//         // Repeated samples do not establish multiplicity across omissions;
//         // keep their known content without interpreting missing rows as change.
//         (projection.inventoryComplete ? values : [...new Set(values)]).sort(),
//       ),
//     ]),
//   );
// };
//
// type WebSocketGroup = {
//   readonly url: string;
//   readonly stream: string;
//   readonly connections: WebPageInspection["network"]["websocket_connections"];
// };
//
// const webSocketGroups = (
//   inspection: WebPageInspection,
// ): ReadonlyMap<string, WebSocketGroup> => {
//   const groups = new Map<string, WebSocketGroup>();
//   for (const connection of inspection.network.websocket_connections) {
//     const stream = digestCanonicalValue(
//       connection.events.map(({ direction, opcode }) => ({
//         direction,
//         opcode,
//       })),
//     );
//     const key = digestCanonicalValue({ url: connection.url, stream });
//     const previous = groups.get(key);
//     if (previous !== undefined) previous.connections.push(connection);
//     else
//       groups.set(key, {
//         url: connection.url,
//         stream,
//         connections: [connection],
//       });
//   }
//   return groups;
// };
//
// const webSocketMetadataMap = (
//   groups: ReadonlyMap<string, WebSocketGroup>,
// ): ReadonlyMap<string, string> => {
//   const byUrl = new Map<string, string[]>();
//   for (const group of groups.values()) {
//     const streams = byUrl.get(group.url) ?? [];
//     for (let index = 0; index < group.connections.length; index += 1)
//       streams.push(group.stream);
//     byUrl.set(group.url, streams);
//   }
//   return new Map(
//     [...byUrl].map(([url, streams]) => [
//       `ws_${digestCanonicalValue(url)}`,
//       digestCanonicalValue(streams.sort(compareUnicodeCodePoints)),
//     ]),
//   );
// };
//
// const webSocketPayloadMaps = (
//   beforeGroups: ReadonlyMap<string, WebSocketGroup>,
//   afterGroups: ReadonlyMap<string, WebSocketGroup>,
//   selected: boolean,
// ): readonly [ReadonlyMap<string, string>, ReadonlyMap<string, string>] => {
//   const left = new Map<string, string>();
//   const right = new Map<string, string>();
//   for (const [groupKey, beforeGroup] of beforeGroups) {
//     const afterGroup = afterGroups.get(groupKey);
//     if (
//       afterGroup === undefined ||
//       beforeGroup.connections.length !== afterGroup.connections.length
//     )
//       continue;
//     const eventCount = beforeGroup.connections[0]?.events.length ?? 0;
//     const comparableBytes = new Set<number>();
//     const comparableShapes = new Set<number>();
//     for (let index = 0; index < eventCount; index += 1) {
//       if (
//         beforeGroup.connections.every(
//           (connection) => connection.events[index]?.payload_bytes !== null,
//         ) &&
//         afterGroup.connections.every(
//           (connection) => connection.events[index]?.payload_bytes !== null,
//         )
//       )
//         comparableBytes.add(index);
//       // Compare only when every same-metadata connection has shape evidence
//       // on both sides; this avoids assigning an unknown shape to a known one.
//       if (
//         selected &&
//         beforeGroup.connections.every(
//           (connection) => connection.events[index]?.payload_shape !== null,
//         ) &&
//         afterGroup.connections.every(
//           (connection) => connection.events[index]?.payload_shape !== null,
//         )
//       )
//         comparableShapes.add(index);
//     }
//     if (comparableBytes.size === 0 && comparableShapes.size === 0) continue;
//     const project = (group: WebSocketGroup) =>
//       digestCanonicalValue(
//         group.connections
//           .map((connection) =>
//             connection.events.map((event, index) => {
//               const comparablePayload: Record<string, unknown> = {};
//               if (comparableBytes.has(index))
//                 comparablePayload.payload_bytes = event.payload_bytes;
//               if (comparableShapes.has(index))
//                 comparablePayload.payload_shape = event.payload_shape;
//               return Object.keys(comparablePayload).length === 0
//                 ? null
//                 : comparablePayload;
//             }),
//           )
//           .map((stream) => digestCanonicalValue(stream))
//           .sort(compareUnicodeCodePoints),
//       );
//     const identity = `wss_${groupKey}`;
//     left.set(identity, project(beforeGroup));
//     right.set(identity, project(afterGroup));
//   }
//   return [left, right];
// };
//
// const webMcpDimension = (
//   before: WebMcpDiscovery | null,
//   after: WebMcpDiscovery | null,
// ): Dimension => {
//   const afterTools = new Map(
//     after?.tools.items.map((tool) => [tool.tool_key, tool]),
//   );
//   const unknownHints = new Set(
//     (before?.tools.items ?? [])
//       .filter((tool) => {
//         const other = afterTools.get(tool.tool_key);
//         return (
//           other !== undefined &&
//           (tool.annotations.consequential === undefined ||
//             other.annotations.consequential === undefined)
//         );
//       })
//       .map((tool) => tool.tool_key),
//   );
//   const project = (
//     discovery: WebMcpDiscovery | null,
//   ): ReadonlyMap<string, string> =>
//     keyed(
//       (discovery?.tools.items ?? []).map((tool) => {
//         if (!unknownHints.has(tool.tool_key)) return tool;
//         const { consequential: _unknown, ...annotations } = tool.annotations;
//         return { ...tool, annotations };
//       }),
//       (tool) => tool.tool_key,
//     );
//   const result = compareDimension(
//     project(before),
//     project(after),
//     webMcpComplete(before) && webMcpComplete(after),
//     "WebMCP discovery was unavailable or incomplete in at least one capture.",
//   );
//   return result.status === "unchanged" && unknownHints.size > 0
//     ? {
//         ...result,
//         status: "unknown",
//         reason:
//           "Consequential annotations were not recorded or were invalid in at least one capture.",
//       }
//     : result;
// };
//
// const webMcpComplete = (discovery: WebMcpDiscovery | null): boolean =>
//   discovery !== null &&
export const _l = 243;
