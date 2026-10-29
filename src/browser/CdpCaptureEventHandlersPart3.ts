export const __stub = 1;
//     rawInitiatorUrl,
//     state.allowedOrigins,
//   );
//   if (rawInitiatorUrl !== undefined && initiatorUrl === undefined)
//     state.completeness.exclude(
//       "network_initiators",
//       exclusionReasonForUrl(rawInitiatorUrl),
//     );
//   state.network.set(requestId, {
//     request_id: requestId,
//     url: sanitized.url,
//     origin: sanitized.origin ?? "",
//     method,
//     resource_type: cdpStringValue(params.type) ?? null,
//     status: null,
//     mime_type: null,
//     encoded_data_length: null,
//     redirects,
//     initiator: {
//       type: initiatorType,
//       url: initiatorUrl?.url ?? null,
//       line: integerOrNull(initiatorFrame?.lineNumber),
//       column: integerOrNull(initiatorFrame?.columnNumber),
//     },
//     body_shapes: requestBodyShape(state, request),
//   });
//   const timestamp = numberValue(params.timestamp);
//   if (timestamp === undefined) state.networkRequestTimestamps.delete(requestId);
//   else state.networkRequestTimestamps.set(requestId, timestamp);
// };
//
// const preserveMalformedRedirectEvidence = (
//   state: CdpCaptureEventsState,
//   requestId: string,
//   previous: NetworkState | undefined,
// ): boolean => {
//   state.completeness.exclude("network_requests", "invalid_protocol_value");
//   if (previous === undefined) return false;
//   state.malformedRedirectRequestIds.add(requestId);
//   if (
//     state.input.include_json_body_shapes &&
//     isJsonMediaType(previous.mime_type) &&
//     previous.body_shapes.response === null
//   ) {
//     updateResponseBodyShape(state, requestId, null);
//     state.completeness.exclude("json_body_shapes", "invalid_protocol_value");
//   }
//   return true;
// };
//
// const redirectResponseUrlReason = (
//   value: string | undefined,
// ):
//   | "invalid_protocol_value"
//   | "disallowed_origin"
//   | "unsupported_url"
//   | "unattributed_origin" => {
//   if (value === undefined || value === "") return "invalid_protocol_value";
//   try {
//     new URL(value);
//   } catch {
//     return "invalid_protocol_value";
//   }
//   return exclusionReasonForUrl(value);
// };
//
// export const handleResponseReceived = (
//   state: CdpCaptureEventsState,
//   params: UnknownRecord,
// ): void => {
//   const requestId = cdpStringValue(params.requestId);
//   if (requestId === undefined) {
//     state.completeness.exclude("network_requests", "invalid_protocol_value");
//     return;
//   }
//   if (state.malformedRedirectRequestIds.has(requestId)) return;
//   const current = state.network.get(requestId);
//   const response = recordValue(params.response);
//   if (current === undefined) return;
//   const sanitized = allowedSanitizedUrl(response?.url, state.allowedOrigins);
//   if (response === undefined || sanitized === undefined) {
//     state.completeness.exclude(
//       "network_requests",
//       response === undefined
//         ? "invalid_protocol_value"
//         : exclusionReasonForUrl(cdpStringValue(response.url)),
//     );
//     state.network.delete(requestId);
//     state.networkRequestTimestamps.delete(requestId);
//     return;
//   }
//   state.network.set(requestId, {
//     ...current,
//     status: numberValue(response.status) ?? null,
//     mime_type: cdpStringValue(response.mimeType) ?? null,
//   });
//   const metadata = safeResponseMetadata(
//     requestId,
//     sanitized.url,
//     response,
//     state.allowedOrigins,
//   );
//   state.responseMetadata.push(metadata.response);
//   state.agentHints.push(...metadata.agentHints);
// };
//
// export const handleLoadingFinished = (
//   state: CdpCaptureEventsState,
//   params: UnknownRecord,
// ): void => {
//   const requestId = cdpStringValue(params.requestId);
//   if (requestId === undefined) return;
//   if (state.malformedRedirectRequestIds.has(requestId)) return;
//   const current = state.network.get(requestId);
//   if (current === undefined) return;
//   const encodedDataLength = numberValue(params.encodedDataLength);
//   if (encodedDataLength === undefined || encodedDataLength < 0) {
//     state.completeness.exclude("network_requests", "invalid_protocol_value");
//     return;
//   }
//   state.network.set(requestId, {
//     ...current,
//     encoded_data_length: encodedDataLength,
//   });
// };
//
// export const handleConsoleAPICalled = (
//   state: CdpCaptureEventsState,
//   params: UnknownRecord,
// ): void => {
//   const frame = firstCallFrame(recordValue(params.stackTrace));
//   if (frame === undefined) {
//     state.completeness.exclude("console_events", "unattributed_origin");
//     return;
//   }
//   const source = allowedSanitizedUrl(frame.url, state.allowedOrigins);
//   if (source === undefined) {
//     state.completeness.exclude(
//       "console_events",
//       exclusionReasonForUrl(cdpStringValue(frame.url)),
//     );
//     return;
//   }
//   const arguments_ = recordsValue(params.args);
//   state.console.push({
//     type: cdpStringValue(params.type) ?? "unknown",
//     timestamp: numberValue(params.timestamp) ?? 0,
//     argument_types: arguments_.map(
//       (argument) => cdpStringValue(argument.type) ?? "unknown",
//     ),
//     url: source.url,
//     line: integerOrNull(frame.lineNumber),
//     column: integerOrNull(frame.columnNumber),
//     text_capture: captureConsoleText(state, arguments_),
//   });
export const _l = 155;
