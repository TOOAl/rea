export const __stub = 1;
// import { analysisViewInputError } from "./analysisViewErrors.js";
// import { createHash } from "node:crypto";
// import { z } from "zod";
// import type { AnalysisError } from "../analysisErrorBase.js";
// import { analysisInputErrorFromIssues } from "../inputIssueProjection.js";
// import type { JsonValue } from "../jsonValue.js";
// import { err, ok, type Result } from "../result.js";
// import {
//   webNetworkCaptureRecordSchema,
//   webNetworkCaptureBinaryDescriptorSchema,
//   webNetworkCaptureSchema,
//   webNetworkCaptureArtifactSchema,
//   webNetworkCaptureDecoderSchema,
//   WEB_NETWORK_CAPTURE_FORMATS,
//   type WebNetworkCaptureRecord,
//   type WebNetworkCapture,
// } from "../webNetworkCapture.js";
// import type {
//   AnalysisViewParent,
//   AnalysisViewRequest,
//   UnsignedAnalysisView,
// } from "./analysisView.js";
// import {
//   completeWithinViewCoverage,
//   pageViewCoverage,
// } from "./analysisViewCoverage.js";
// import {
//   qlogSummarySchema,
//   summarizeQlogCapture,
//   projectQlogCapturePage,
// } from "./qlogCaptureView.js";
//
// /** Offsets page the parent's retained record order, preserving producer ordinals. */
// export const captureViewRequestSchema = z.strictObject({
//   kind: z.literal("capture"),
//   detail: z.enum(["preview", "complete"]).default("preview"),
//   offset: z.number().int().nonnegative().default(0),
//   limit: z.number().int().positive().default(64),
// });
//
// const previewSchema = webNetworkCaptureRecordSchema.extend({
//   binary_fields: z.array(webNetworkCaptureBinaryDescriptorSchema),
// });
// export const captureViewItemsSchema = z.array(
//   z.union([webNetworkCaptureRecordSchema, previewSchema]),
// );
//
// /** Count/identity overview; bodies and the archive member inventory stay in the parent. */
// export const captureSummarySchema = z.strictObject({
//   artifact: webNetworkCaptureArtifactSchema,
//   decoder: webNetworkCaptureDecoderSchema,
//   format: z.enum(WEB_NETWORK_CAPTURE_FORMATS),
//   total_records: z.number().int().nonnegative(),
//   retained_records: z.number().int().nonnegative(),
//   runtime_attribution: z.literal("unknown"),
//   qlog: qlogSummarySchema.optional(),
// });
//
// const object = (
//   value: JsonValue,
// ): Readonly<Record<string, JsonValue>> | null =>
//   value !== null && typeof value === "object" && !Array.isArray(value)
//     ? value
//     : null;
//
// const HEADLINE_FIELDS = [
//   "method",
//   "url",
//   "httpVersion",
//   "http_version",
//   "status",
//   "statusText",
//   "reason",
// ];
// // Native mitmproxy flows report the request target in parts and the status
// // as status_code. They are previewed only for mitmproxy records and only when
// // each value has its field's well-formed shape, which also bounds the
// // serialized size of every record (at most ~4 KiB for an escape-heavy path).
// // The path must be origin or asterisk form without control characters and
// // without any "@": native redaction misses absolute and ambiguous spellings,
// // and URL parsing can fail before it recognises their userinfo, so a preview
// // fails closed on the marker every userinfo needs. Host and authority never
// // carry a userinfo marker either.
// // Target fields come only from the request and the status only from the
// // response, and integer slots require the producer's own integer type.
// // Excluded values stay in complete record pages.
// const MITMPROXY_HEADLINE_FIELDS: Readonly<Record<string, readonly string[]>> = {
//   request: ["scheme", "host", "port", "authority", "path"],
//   response: ["status_code"],
// };
// const MITMPROXY_PATH_MAX_LENGTH = 2 * 1024;
// const integerIn = (value: JsonValue, min: number, max: number): boolean =>
//   typeof value === "number" &&
//   Number.isInteger(value) &&
//   value >= min &&
//   value <= max;
// /** True when a code unit is C0, DEL or (optionally) a space. */
// const hasControl = (value: string, includeSpace: boolean): boolean => {
//   for (let index = 0; index < value.length; index += 1) {
//     const code = value.charCodeAt(index);
//     if (code < 0x20 || code === 0x7f || (includeSpace && code === 0x20))
//       return true;
//   }
//   return false;
// };
// // An unpaired surrogate has no UTF-8 form, so no producer reported it as text.
// const LONE_SURROGATE = /\p{Cs}/u;
// const hostLike = (value: JsonValue, maxLength: number): boolean =>
//   typeof value === "string" &&
//   value.length <= maxLength &&
//   !hasControl(value, true) &&
//   !/[@/\\]/u.test(value) &&
//   !LONE_SURROGATE.test(value);
// type NumericSidecar = WebNetworkCaptureRecord["numeric_literals"][number];
// type BinaryField = WebNetworkCaptureRecord["binary_fields"][number];
// const MITMPROXY_INTEGER_FIELDS = new Set(["port", "status_code"]);
// /** Retained native producer bytes whose content, length and digest are all the text's UTF-8. */
// const describesText = (descriptor: BinaryField, text: string): boolean => {
//   if (
//     descriptor.representation !== "producer-bytes" ||
//     descriptor.state !== "retained"
//   )
//     return false;
//   // An unpaired surrogate has no UTF-8 form; Buffer.from would invent
//   // replacement-character bytes that no producer value could have had.
//   const utf8 = Buffer.from(text, "utf8");
//   return (
//     utf8.toString("utf8") === text &&
//     descriptor.bytes === utf8.length &&
//     descriptor.content_base64 === utf8.toString("base64") &&
//     descriptor.sha256 === createHash("sha256").update(utf8).digest("hex")
//   );
// };
// /**
//  * Integer slots need exactly one integer sidecar whose literal is the value's
export const _l = 135;
