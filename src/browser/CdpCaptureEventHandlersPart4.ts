export const __stub = 1;
// };
//
// const captureConsoleText = (
//   state: CdpCaptureEventsState,
//   arguments_: readonly UnknownRecord[],
// ): WebPageInspection["console"]["events"][number]["text_capture"] => {
//   if (!state.input.include_console_text)
//     return {
//       status: "not_approved",
//       values: [],
//       retained_bytes: 0,
//     };
//   const values: WebPageInspection["console"]["events"][number]["text_capture"]["values"] =
//     [];
//   let retainedBytes = 0;
//   for (const [argumentIndex, argument] of arguments_.entries()) {
//     const primitive = consolePrimitive(argument);
//     if (primitive === undefined) continue;
//     const text = primitive.text;
//     values.push({
//       argument_index: argumentIndex,
//       type: primitive.type,
//       text,
//     });
//     retainedBytes += Buffer.byteLength(text);
//   }
//   return {
//     status: "included",
//     values,
//     retained_bytes: retainedBytes,
//   };
// };
//
// export const handleWebSocketFrame = (
//   state: CdpCaptureEventsState,
//   params: UnknownRecord,
//   direction: "sent" | "received",
// ): void => {
//   const requestId = cdpStringValue(params.requestId);
//   if (requestId === undefined) return;
//   const connection = state.webSocketConnectionsById.get(requestId);
//   if (connection === undefined) return;
//   const response = recordValue(params.response);
//   const payload = cdpStringValue(response?.payloadData) ?? "";
//   const opcode = Math.max(0, Math.trunc(numberValue(response?.opcode) ?? 0));
//   const decoded = opcode === 1 ? undefined : decodeBase64(payload);
//   if (opcode !== 1 && decoded === undefined)
//     state.completeness.exclude("websocket_frames", "invalid_protocol_value");
//   connection.events.push({
//     direction,
//     opcode,
//     payload_bytes:
//       opcode === 1 ? Buffer.byteLength(payload) : (decoded?.byteLength ?? null),
//     payload_shape: captureWebSocketShape(state, payload, opcode),
//   });
// };
//
// const captureWebSocketShape = (
//   state: CdpCaptureEventsState,
//   payload: string,
//   opcode: number,
// ): WebPageInspection["network"]["websocket_connections"][number]["events"][number]["payload_shape"] => {
//   if (!state.input.include_websocket_shapes) return null;
//   if (opcode !== 1) return { format: "binary", json_shape: null };
//   const shape = inferJsonShape(payload);
//   return {
//     format: shape === null ? "text" : "json",
//     json_shape: shape,
//   };
// };
//
// export const handleWebSocketCreated = (
//   state: CdpCaptureEventsState,
//   params: UnknownRecord,
// ): void => {
//   const requestId = cdpStringValue(params.requestId);
//   const rawUrl = cdpStringValue(params.url);
//   if (requestId === undefined) {
//     state.completeness.exclude(
//       "websocket_connections",
//       "invalid_protocol_value",
//     );
//     return;
//   }
//   if (rawUrl === undefined) {
//     state.completeness.exclude(
//       "websocket_connections",
//       "invalid_protocol_value",
//     );
//     return;
//   }
//   const sourceUrl = sanitizeBrowserUrl(rawUrl).url;
//   let parsed: URL;
//   try {
//     parsed = new URL(sourceUrl);
//   } catch (cause: unknown) {
//     // Unparseable URLs are recorded as unsupported, not as failures.
//     void cause;
//     state.completeness.exclude("websocket_connections", "unsupported_url");
//     return;
//   }
//   if (parsed.protocol === "ws:") parsed.protocol = "http:";
//   else if (parsed.protocol === "wss:") parsed.protocol = "https:";
//   else {
//     state.completeness.exclude("websocket_connections", "unsupported_url");
//     return;
//   }
//   if (!state.allowedOrigins.has(parsed.origin)) {
//     state.completeness.exclude("websocket_connections", "disallowed_origin");
//     return;
//   }
//   if (state.webSocketConnectionsById.has(requestId)) {
//     state.completeness.exclude(
//       "websocket_connections",
//       "invalid_protocol_value",
//     );
//     return;
//   }
//   state.webSocketConnectionsById.set(requestId, {
//     request_id: requestId,
//     url: sourceUrl,
//     events: [],
//   });
// };
//
// export const handleFrameNavigated = (
//   state: CdpCaptureEventsState,
//   params: UnknownRecord,
// ): void => {
//   const frame = recordValue(params.frame);
//   if (state.mainFrameId === undefined) return;
//   if (
//     !isMainFrameNavigation(
//       { method: "Page.frameNavigated", params },
//       state.mainFrameId,
//     )
//   )
//     return;
//   const rawUrl = cdpStringValue(frame?.url);
//   const loaderId = cdpStringValue(frame?.loaderId);
//   // `frameNavigated` re-fires for a document already reported (same URL and
//   // loader). Treating that as a navigation aborted a valid capture with
//   // `target_changed`, which is a false claim that the target moved.
//   const document = `${String(loaderId ?? "")}\0${String(rawUrl ?? "")}`;
//   if (state.committedDocument === document) return;
//   state.committedDocument = document;
//   state.navigationDuringCapture = true;
//   if (
//     isHttpUrl(rawUrl) &&
//     allowedSanitizedUrl(rawUrl, state.allowedOrigins) === undefined
//   )
//     state.originViolation = true;
// };
export const _l = 153;
