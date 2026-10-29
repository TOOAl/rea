export const __stub = 1;
//     ({ section, reason }) =>
//       section === "websocket_shapes" && reason === "not_approved",
//   );
//
// const networkIdentity = (
//   request: WebPageInspection["network"]["requests"][number],
// ): string =>
//   `net_${digestCanonicalValue({ method: request.method, url: request.url, resource_type: request.resource_type })}`;
//
// /** An unknown request type can match any observed type at the same method/URL. */
// const networkIdentityCoverage = (
//   before: WebPageInspection,
//   after: WebPageInspection,
// ): {
//   readonly complete: boolean;
//   readonly ambiguousIdentities: ReadonlySet<string>;
// } => {
//   const complete = [before, after].every((inspection) =>
//     inspection.network.requests.every(
//       ({ resource_type }) => resource_type !== null,
//     ),
//   );
//   const ambiguousIdentities = new Set<string>();
//   if (complete) return { complete, ambiguousIdentities };
//   type Request = WebPageInspection["network"]["requests"][number];
//   const matchKey = (request: Request): string =>
//     JSON.stringify([request.method, request.url]);
//   const unknownTypes = (
//     inspection: WebPageInspection,
//   ): ReadonlyMap<string, boolean> => {
//     const groups = new Map<string, boolean>();
//     for (const request of inspection.network.requests) {
//       const key = matchKey(request);
//       groups.set(
//         key,
//         groups.get(key) === true || request.resource_type === null,
//       );
//     }
//     return groups;
//   };
//   const retainPotentialMatches = (
//     inspection: WebPageInspection,
//     peer: ReadonlyMap<string, boolean>,
//   ): void => {
//     for (const request of inspection.network.requests) {
//       const peerUnknown = peer.get(matchKey(request));
//       if (
//         peerUnknown === true ||
//         (peerUnknown === false && request.resource_type === null)
//       )
//         ambiguousIdentities.add(networkIdentity(request));
//     }
//   };
//   retainPotentialMatches(before, unknownTypes(after));
//   retainPotentialMatches(after, unknownTypes(before));
//   return { complete, ambiguousIdentities };
// };
//
// const networkResponseFields = [
//   "status",
//   "mime_type",
//   "encoded_data_length",
// ] as const;
// const redirectMetadataFields = [
//   ...networkResponseFields,
//   "resource_type",
// ] as const;
// type NetworkMetadataField = (typeof redirectMetadataFields)[number];
//
// /** Own both comparable fields and completeness instead of deriving it from set sizes. */
// const sharedNetworkMetadata = (
//   before: WebPageInspection,
//   after: WebPageInspection,
// ): {
//   readonly fields: ReadonlyMap<string, ReadonlySet<NetworkMetadataField>>;
//   readonly complete: boolean;
// } => {
//   const shared = new Map<string, Set<NetworkMetadataField>>();
//   let complete = true;
//   const retainKnownFields = (
//     identity: string,
//     metadata: Pick<
//       WebPageInspection["network"]["requests"][number],
//       NetworkMetadataField
//     >,
//     required: readonly NetworkMetadataField[],
//   ): void => {
//     const fields = shared.get(identity) ?? new Set(required);
//     for (const field of required)
//       if (metadata[field] === null) {
//         fields.delete(field);
//         complete = false;
//       }
//     shared.set(identity, fields);
//   };
//   for (const inspection of [before, after])
//     for (const request of inspection.network.requests) {
//       const identity = networkIdentity(request);
//       retainKnownFields(identity, request, networkResponseFields);
//       for (const [index, redirect] of (request.redirects ?? []).entries())
//         retainKnownFields(
//           redirectNetworkIdentity(identity, index),
//           redirect,
//           redirectMetadataFields,
//         );
//     }
//   return { fields: shared, complete };
// };
//
// const redirectNetworkIdentity = (identity: string, index: number): string =>
//   compositeKey([identity, "redirect", index]);
// /** Section lists and per-kind dropped counts independently limit absence evidence. */
// const networkInventoryComplete = (
//   inspection: WebPageInspection,
//   sections: readonly (
//     | "network_requests"
//     | "websocket_connections"
//     | "websocket_frames"
//   )[],
// ): boolean =>
//   sectionsComplete(inspection, sections) &&
//   sections.every(
//     (section) => inspection.completeness.dropped_events[section] === 0,
//   );
//
// const networkDimension = (
//   before: WebPageInspection,
//   after: WebPageInspection,
// ): Dimension => {
//   const requestsComplete = [before, after].every((inspection) =>
//     networkInventoryComplete(inspection, ["network_requests"]),
//   );
//   const webSocketInventoryComplete = [before, after].every((inspection) =>
//     networkInventoryComplete(inspection, [
//       "websocket_connections",
//       "websocket_frames",
//     ]),
//   );
//   const requestIdentities = networkIdentityCoverage(before, after);
//   const metadata = sharedNetworkMetadata(before, after);
//   const selected = bodyShapesSelected(before) && bodyShapesSelected(after);
//   const webSocketShapes =
//     webSocketShapesSelected(before) && webSocketShapesSelected(after);
//   const projection = {
//     metadataFields: metadata.fields,
//     ambiguousIdentities: requestIdentities.ambiguousIdentities,
//     inventoryComplete: requestsComplete,
//   };
//   const sources = new Map<string, BodyShapeSources>();
//   if (selected) {
//     const observedSources = (inspection: WebPageInspection) => {
//       const result = new Map<string, BodyShapeSources>();
//       for (const request of inspection.network.requests) {
//         const identity = networkIdentity(request);
//         const previous = result.get(identity);
//         result.set(identity, {
//           request:
//             previous?.request !== false && request.body_shapes.request !== null,
//           response:
//             previous?.response !== false &&
//             request.body_shapes.response !== null,
//         });
//       }
//       return result;
//     };
//     const left = observedSources(before);
//     const right = observedSources(after);
//     for (const [identity, coverage] of left) {
//       const next = right.get(identity);
//       sources.set(identity, {
//         request: coverage.request && next?.request === true,
//         response: coverage.response && next?.response === true,
//       });
//     }
//   }
//   const shapesComplete =
//     !selected ||
//     [before, after].every(
//       (inspection) =>
//         sectionsComplete(inspection, ["json_body_shapes"]) &&
//         inspection.network.requests.every(
//           ({ body_shapes }) => body_shapes.status === "included",
//         ),
//     );
//   const webSocketShapesComplete =
//     !webSocketShapes ||
//     [before, after].every(
//       (inspection) =>
//         sectionsComplete(inspection, ["websocket_shapes"]) &&
//         inspection.network.websocket_connections.every((connection) =>
//           connection.events.every((event) => event.payload_shape !== null),
//         ),
//     );
//   const webSocketPayloadBytesComplete = [before, after].every((inspection) =>
//     inspection.network.websocket_connections.every((connection) =>
//       connection.events.every((event) => event.payload_bytes !== null),
//     ),
//   );
//   const beforeWebSockets = webSocketGroups(before);
//   const afterWebSockets = webSocketGroups(after);
//   const [beforeWebSocketPayload, afterWebSocketPayload] = webSocketPayloadMaps(
//     beforeWebSockets,
//     afterWebSockets,
//     webSocketShapes,
//   );
//   const compared = compareDimension(
//     new Map([
//       ...networkMap(before, sources, projection),
//       ...(webSocketInventoryComplete
//         ? webSocketMetadataMap(beforeWebSockets)
//         : []),
//       ...beforeWebSocketPayload,
//     ]),
//     new Map([
//       ...networkMap(after, sources, projection),
//       ...(webSocketInventoryComplete
//         ? webSocketMetadataMap(afterWebSockets)
//         : []),
//       ...afterWebSocketPayload,
//     ]),
//     requestsComplete &&
//       requestIdentities.complete &&
//       webSocketInventoryComplete &&
//       shapesComplete &&
//       webSocketPayloadBytesComplete &&
//       webSocketShapesComplete,
//     requestIdentities.complete
//       ? "Network capture or selected HTTP/WebSocket payload-shape coverage is limited, unavailable, incomplete, or includes dropped network events."
//       : "HTTP request identity is incomplete because a resource type is unavailable; potentially matching type groups cannot establish membership/content changes or complete network equality.",
//     // HTTP and WebSocket identities have independent inventory coverage. Shape
//     // selection can prevent equality without erasing proven membership changes.
//     (identity) =>
//       identity.startsWith("net_")
//         ? requestsComplete
//         : identity.startsWith("ws_") && webSocketInventoryComplete,
//   );
//   if (metadata.complete) return compared;
//   const responseEvidenceReason =
//     "HTTP response or redirect status, MIME type, byte count, or resource-type evidence is incomplete.";
//   if (compared.status === "changed") return compared;
//   return {
//     status: "unknown",
//     total_changes: 0,
export const _l = 243;
