export const __stub = 1;
// import type { WebPageInspection } from "../domain/browserObservationSchemas.js";
// import { sanitizeBrowserUrl } from "../domain/browserObservation.js";
// import { inferJsonShape } from "../domain/jsonShape.js";
// import { safeResponseMetadata } from "./CdpSafeMetadata.js";
// import {
//   allowedSanitizedUrl,
//   isHttpUrl,
//   numberValue,
//   recordValue,
//   recordsValue,
//   scriptMetadataValues,
//   cdpStringValue,
//   type UnknownRecord,
// } from "./CdpCaptureValues.js";
// import {
//   requestBodyShape,
//   updateResponseBodyShape,
// } from "./CdpCaptureEventBodyShapes.js";
// import {
//   consolePrimitive,
//   decodeBase64,
//   exclusionReasonForUrl,
//   executionContextKey,
//   firstCallFrame,
//   initiatorLocation,
//   integerOrNull,
//   isJsonMediaType,
//   isMainFrameNavigation,
// } from "./CdpCaptureEventHelpers.js";
// import type { CdpCaptureEventsState } from "./CdpCaptureEventState.js";
// import {
//   CDP_CAPTURE_SCRIPT_METADATA_LIMITS,
//   type CapturedScript,
//   type NetworkState,
// } from "./CdpCaptureEventTypes.js";
//
// export const handleExecutionContextCreated = (
//   state: CdpCaptureEventsState,
//   params: UnknownRecord,
// ): void => {
//   const context = recordValue(params.context);
//   const identifier = numberValue(context?.id);
//   const frameId = cdpStringValue(recordValue(context?.auxData)?.frameId);
//   if (
//     identifier === undefined ||
//     !Number.isSafeInteger(identifier) ||
//     frameId === undefined
//   )
//     return;
//   const key = String(identifier);
//   // New contexts may reuse an id. Scripts already parsed keep the frame stored on them.
//   state.executionContextFrames.set(key, frameId);
// };
//
// export const handleExecutionContextDestroyed = (
//   state: CdpCaptureEventsState,
//   params: UnknownRecord,
// ): void => {
//   const key = executionContextKey(params.executionContextId);
//   if (key !== null) state.executionContextFrames.delete(key);
// };
//
// export const handleScriptParsed = (
//   state: CdpCaptureEventsState,
//   params: UnknownRecord,
// ): void => {
//   const scriptId = cdpStringValue(params.scriptId);
//   const rawUrl = cdpStringValue(params.url) ?? "";
//   const sanitized = allowedSanitizedUrl(rawUrl, state.allowedOrigins);
//   if (scriptId === undefined) {
//     state.completeness.exclude("scripts", "invalid_protocol_value");
//     return;
//   }
//   const replacedBytes = state.scriptMetadataBytesById.get(scriptId) ?? 0;
//   state.scriptMetadataBudgetOmissionsById.delete(scriptId);
//   if (replacedBytes > 0) {
//     state.scripts.delete(scriptId);
//     state.scriptMetadataBytesById.delete(scriptId);
//     state.retainedScriptMetadataBytes -= replacedBytes;
//   }
//   if (sanitized === undefined) {
//     state.completeness.exclude("scripts", exclusionReasonForUrl(rawUrl));
//     return;
//   }
//   const executionContext = executionContextKey(params.executionContextId);
//   const baseScript = {
//     scriptId,
//     rawUrl,
//     url: sanitized.url,
//     origin: sanitized.origin,
//     ...scriptMetadataValues(params),
//     language: cdpStringValue(params.scriptLanguage) ?? null,
//     executionContextKey: executionContext,
//     frameId:
//       executionContext === null
//         ? null
//         : (state.executionContextFrames.get(executionContext) ?? null),
//   };
//   const baseBytes = scriptMetadataStringBytes(baseScript);
//   const sourceMapDeclared =
//     typeof params.sourceMapURL === "string" && params.sourceMapURL.length > 0;
//   if (
//     state.scripts.size >= CDP_CAPTURE_SCRIPT_METADATA_LIMITS.scripts ||
//     baseBytes >
//       CDP_CAPTURE_SCRIPT_METADATA_LIMITS.retainedBytes -
//         state.retainedScriptMetadataBytes
//   ) {
//     state.rejectedScriptMetadataBudgetCount += 1;
//     if (sourceMapDeclared) state.rejectedSourceMapMetadataBudgetCount += 1;
//     return;
//   }
//   const sourceMap = sourceMapForScript(
//     params.sourceMapURL,
//     rawUrl,
//     state,
//     CDP_CAPTURE_SCRIPT_METADATA_LIMITS.retainedBytes -
//       state.retainedScriptMetadataBytes -
//       baseBytes,
//   );
//   const { budgetExhausted, ...sourceMapFields } = sourceMap;
//   const script: CapturedScript = { ...baseScript, ...sourceMapFields };
//   if (budgetExhausted)
//     state.scriptMetadataBudgetOmissionsById.set(scriptId, true);
//   const retainedBytes =
//     baseBytes +
//     stringByteLength(sourceMap.sourceMapUrl) +
//     stringByteLength(sourceMap.sourceMapRawUrl);
//   state.retainedScriptMetadataBytes += retainedBytes;
//   state.scriptMetadataBytesById.set(scriptId, retainedBytes);
//   state.scripts.set(scriptId, script);
// };
//
// const scriptMetadataStringBytes = (script: {
//   readonly scriptId: string;
//   readonly rawUrl: string;
//   readonly url: string;
//   readonly origin: string | null;
//   readonly hash: string | null;
//   readonly language: string | null;
//   readonly executionContextKey: string | null;
//   readonly frameId: string | null;
// }): number =>
//   stringByteLength(script.scriptId) +
//   stringByteLength(script.rawUrl) +
//   stringByteLength(script.url) +
//   stringByteLength(script.origin) +
//   stringByteLength(script.hash) +
//   stringByteLength(script.language) +
//   stringByteLength(script.executionContextKey) +
//   stringByteLength(script.frameId);
//
// const stringByteLength = (value: string | null): number =>
//   value === null ? 0 : Buffer.byteLength(value, "utf8");
//
// const sourceMapForScript = (
export const _l = 155;
