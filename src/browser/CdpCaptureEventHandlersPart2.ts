export const __stub = 1;
//   value: unknown,
//   scriptUrl: string,
//   state: CdpCaptureEventsState,
//   remainingBytes: number,
// ): {
//   readonly sourceMapUrl: string | null;
//   readonly sourceMapRawUrl: string | null;
//   readonly budgetExhausted: boolean;
// } => {
//   const declaredUrl = cdpStringValue(value);
//   if (declaredUrl === undefined || declaredUrl === "")
//     return {
//       sourceMapUrl: null,
//       sourceMapRawUrl: null,
//       budgetExhausted: false,
//     };
//   let rawUrl: string;
//   try {
//     rawUrl = new URL(declaredUrl, scriptUrl).href;
//   } catch (cause: unknown) {
//     // Unparseable URLs are recorded as unsupported, not as failures.
//     void cause;
//     state.completeness.exclude("source_maps", "unsupported_url");
//     return {
//       sourceMapUrl: null,
//       sourceMapRawUrl: null,
//       budgetExhausted: false,
//     };
//   }
//   const sanitized = allowedSanitizedUrl(rawUrl, state.allowedOrigins);
//   if (sanitized !== undefined) {
//     if (
//       stringByteLength(rawUrl) + stringByteLength(sanitized.url) >
//       remainingBytes
//     ) {
//       return {
//         sourceMapUrl: null,
//         sourceMapRawUrl: null,
//         budgetExhausted: true,
//       };
//     }
//     return {
//       sourceMapUrl: sanitized.url,
//       sourceMapRawUrl: rawUrl,
//       budgetExhausted: false,
//     };
//   }
//   state.completeness.exclude("source_maps", exclusionReasonForUrl(rawUrl));
//   return {
//     sourceMapUrl: null,
//     sourceMapRawUrl: null,
//     budgetExhausted: false,
//   };
// };
//
// export const handleRequestWillBeSent = (
//   state: CdpCaptureEventsState,
//   params: UnknownRecord,
// ): void => {
//   const requestId = cdpStringValue(params.requestId);
//   const request = recordValue(params.request);
//   if (requestId === undefined) {
//     state.completeness.exclude("network_requests", "invalid_protocol_value");
//     return;
//   }
//   if (state.malformedRedirectRequestIds.has(requestId)) return;
//   const previous = state.network.get(requestId);
//   if (
//     !Object.hasOwn(params, "redirectResponse") &&
//     previous !== undefined &&
//     preserveMalformedRedirectEvidence(state, requestId, previous)
//   )
//     return;
//   const method = cdpStringValue(request?.method);
//   const initiator = recordValue(params.initiator);
//   const initiatorType = cdpStringValue(initiator?.type);
//   if (
//     request === undefined ||
//     method === undefined ||
//     method.length === 0 ||
//     initiatorType === undefined ||
//     initiatorType.length === 0
//   ) {
//     preserveMalformedRedirectEvidence(state, requestId, previous);
//     return;
//   }
//   const sanitized = allowedSanitizedUrl(request.url, state.allowedOrigins);
//   if (sanitized === undefined) {
//     state.completeness.exclude(
//       "network_requests",
//       exclusionReasonForUrl(cdpStringValue(request.url)),
//     );
//     state.network.delete(requestId);
//     state.networkRequestTimestamps.delete(requestId);
//     return;
//   }
//   const redirectResponse = recordValue(params.redirectResponse);
//   if (
//     Object.hasOwn(params, "redirectResponse") &&
//     redirectResponse === undefined &&
//     preserveMalformedRedirectEvidence(state, requestId, previous)
//   )
//     return;
//   const redirects = [...(previous?.redirects ?? [])];
//   if (redirectResponse !== undefined) {
//     const rawResponseUrl = cdpStringValue(redirectResponse.url);
//     const responseUrl =
//       rawResponseUrl === undefined || rawResponseUrl === ""
//         ? undefined
//         : allowedSanitizedUrl(rawResponseUrl, state.allowedOrigins);
//     const responseUrlReason = redirectResponseUrlReason(rawResponseUrl);
//     if (previous === undefined) {
//       if (responseUrl === undefined)
//         state.completeness.exclude("network_requests", responseUrlReason);
//       else
//         // CDP may deliver the continuation after its predecessor was excluded
//         // by origin policy or before capture began. Keep the final request but
//         // report missing prior coverage without calling it malformed protocol.
//         state.completeness.attachLimited("network_requests");
//     } else if (responseUrl === undefined) {
//       // redirectResponse belongs to the same request ID and can contain an
//       // excluded origin. Drop the entire chain before retaining any details.
//       state.completeness.exclude("network_requests", responseUrlReason);
//       state.network.delete(requestId);
//       state.networkRequestTimestamps.delete(requestId);
//       return;
//     } else {
//       const encodedDataLength = numberValue(redirectResponse.encodedDataLength);
//       if (encodedDataLength === undefined || encodedDataLength < 0)
//         state.completeness.exclude(
//           "network_requests",
//           "invalid_protocol_value",
//         );
//       redirects.push({
//         url: previous.url,
//         response_url: responseUrl.url,
//         method: previous.method,
//         resource_type: previous.resource_type,
//         status: numberValue(redirectResponse.status) ?? null,
//         mime_type: cdpStringValue(redirectResponse.mimeType) ?? null,
//         encoded_data_length:
//           encodedDataLength === undefined || encodedDataLength < 0
//             ? null
//             : encodedDataLength,
//         request_timestamp:
//           state.networkRequestTimestamps.get(requestId) ?? null,
//         // CDP reports redirectResponse on the next requestWillBeSent event.
//         // This is the event boundary, not a separately observed response time.
//         redirect_event_timestamp: numberValue(params.timestamp) ?? null,
//       });
//     }
//   }
//   const initiatorFrame = initiatorLocation(initiator);
//   const rawInitiatorUrl = cdpStringValue(initiatorFrame?.url);
//   const initiatorUrl = allowedSanitizedUrl(
export const _l = 155;
