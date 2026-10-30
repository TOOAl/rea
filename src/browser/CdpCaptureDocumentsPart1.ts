export const __stub = 1;
// import type { InspectWebPageInput } from "../domain/browserObservation.js";
// import type { WebPageInspection } from "../domain/browserObservationSchemas.js";
// import {
//   allowedSanitizedUrl,
//   numberValue,
//   recordValue,
//   recordsValue,
//   requiredRecord,
//   cdpStringValue,
//   type UnknownRecord,
// } from "./CdpCaptureValues.js";
// import {
//   cdpSnapshotAttributesResolve,
//   cdpSnapshotString,
//   cdpSnapshotValueString,
// } from "./CdpSnapshotStrings.js";
// import type { BrowserExclusionReason } from "../domain/browserCompleteness.js";
// import { exclusionReasonForUrl } from "./CdpCaptureEventHelpers.js";
// import type { CdpCaptureCompleteness } from "./CdpCaptureCompleteness.js";
// import {
//   createDocumentSvgAncestry,
//   domSvgLink,
//   type DomSvgNodeQuery,
// } from "./CdpCaptureDomSvg.js";
// import { compareUnicodeCodePoints } from "../domain/unicodeCodePointOrder.js";
//
// export type CapturedResource = Omit<
//   WebPageInspection["resources"][number],
//   "resource_key"
// > & { readonly rawUrl: string };
//
// /** Normalize every allowed frame, optionally selecting a leading frame. */
// export const captureFrames = (
//   result: unknown,
//   allowedOrigins: ReadonlySet<string>,
//   maximum?: number,
//   completeness?: CdpCaptureCompleteness,
// ): {
//   readonly items: WebPageInspection["frames"];
// } => {
//   const root = recordValue(recordValue(result)?.frameTree);
//   if (root === undefined) {
//     completeness?.exclude("frames", "invalid_protocol_value");
//     return { items: [] };
//   }
//   const items: WebPageInspection["frames"] = [];
//   for (const tree of walkFrameTrees(root, (omittedCount) =>
//     completeness?.exclude("frames", "invalid_protocol_value", omittedCount),
//   )) {
//     const frame = recordValue(tree.frame);
//     const frameId = cdpStringValue(frame?.id);
//     const sanitized = allowedSanitizedUrl(frame?.url, allowedOrigins);
//     if (frame === undefined || frameId === undefined) {
//       completeness?.exclude("frames", "invalid_protocol_value");
//       continue;
//     }
//     if (sanitized === undefined || sanitized.origin === null) {
//       completeness?.exclude(
//         "frames",
//         exclusionReasonForUrl(cdpStringValue(frame.url)),
//       );
//       continue;
//     }
//     if (maximum !== undefined && items.length >= maximum) continue;
//     const parentFrameId = cdpStringValue(frame.parentId);
//     // Only the enclosing tree's root may legitimately omit parent evidence.
//     if (
//       (tree !== root || Object.hasOwn(frame, "parentId")) &&
//       (parentFrameId === undefined || parentFrameId.length === 0)
//     )
//       completeness?.exclude("frames", "invalid_protocol_value");
//     items.push({
//       frame_id: frameId,
//       parent_frame_id: parentFrameId ?? null,
//       url: sanitized.url,
//       origin: sanitized.origin,
//     });
//   }
//   return { items };
// };
//
// /** Read the current main-frame URL from an untrusted Page.getFrameTree result. */
// export const mainFrameUrl = (result: unknown): string | undefined =>
//   cdpStringValue(
//     recordValue(recordValue(requiredRecord(result).frameTree)?.frame)?.url,
//   );
//
// /** Normalize every allowed resource. */
// export const captureResources = (
//   result: unknown,
//   allowedOrigins: ReadonlySet<string>,
//   completeness?: CdpCaptureCompleteness,
// ): {
//   readonly items: readonly CapturedResource[];
// } => {
//   const root = recordValue(recordValue(result)?.frameTree);
//   if (root === undefined) {
//     completeness?.exclude("resources", "invalid_protocol_value");
//     return { items: [] };
//   }
//   const items: CapturedResource[] = [];
//   for (const resource of frameTreeResources(root, (count) =>
//     completeness?.exclude("resources", "invalid_protocol_value", count),
//   )) {
//     const url = allowedSanitizedUrl(resource.url, allowedOrigins);
//     if (url === undefined || url.origin === null) {
//       completeness?.exclude(
//         "resources",
//         exclusionReasonForUrl(cdpStringValue(resource.url)),
//       );
//       continue;
//     }
//     const type = cdpStringValue(resource.type);
//     const mimeType = cdpStringValue(resource.mimeType);
//     if (type === undefined || type.length === 0 || mimeType === undefined) {
//       completeness?.exclude("resources", "invalid_protocol_value");
//       continue;
//     }
//     const rawContentSize = numberValue(resource.contentSize);
//     const contentSize =
//       rawContentSize !== undefined && rawContentSize >= 0
//         ? rawContentSize
//         : null;
//     if (resource.contentSize !== undefined && contentSize === null)
//       completeness?.exclude("resources", "invalid_protocol_value");
//     items.push({
//       rawUrl: cdpStringValue(resource.url) ?? "",
//       url: url.url,
//       origin: url.origin,
//       type,
//       mime_type: mimeType,
//       content_size: contentSize,
//     });
//   }
//   return { items };
// };
//
// /**
//  * Yield resource records from every frame of a resource tree. A missing or
//  * non-array `resources` list, or a non-record entry, is reported as invalid
//  * rather than read as an empty frame.
//  */
// export const frameTreeResources = function* (
//   root: UnknownRecord,
//   onInvalid: (count: number | null) => void,
// ): Generator<UnknownRecord> {
//   for (const tree of walkFrameTrees(root, onInvalid)) {
//     if (!Array.isArray(tree.resources)) {
//       onInvalid(null);
//       continue;
//     }
//     for (const entry of tree.resources) {
//       const resource = recordValue(entry);
//       if (resource === undefined) onInvalid(1);
//       else yield resource;
//     }
//   }
// };
//
// export const walkFrameTrees = function* (
//   root: UnknownRecord,
//   onMalformedChild?: (omittedCount: number | null) => void,
// ): Generator<UnknownRecord> {
//   const pending = [root];
//   while (pending.length > 0) {
//     const tree = pending.pop();
//     if (tree === undefined) return;
//     const rawChildren = tree.childFrames;
//     if (rawChildren !== undefined && !Array.isArray(rawChildren))
//       onMalformedChild?.(null);
//     const children = Array.isArray(rawChildren)
//       ? rawChildren.flatMap((child) => {
//           const parsed = recordValue(child);
//           if (parsed === undefined) onMalformedChild?.(null);
//           return parsed === undefined ? [] : [parsed];
//         })
//       : [];
//     for (let index = children.length - 1; index >= 0; index -= 1) {
//       const child = children[index];
//       if (child !== undefined) pending.push(child);
//     }
//     yield tree;
//   }
// };
//
// interface DomMetadataCapture {
//   readonly urls: WebPageInspection["metadata"]["dom_urls"];
//   readonly agentHints: WebPageInspection["metadata"]["agent_hints"];
//   readonly excludedUrls: number;
//   readonly unresolvedSvgNodes: number;
// }
//
// export interface DomCapture extends DomMetadataCapture {
//   readonly total: number;
//   readonly nodes: WebPageInspection["dom"]["nodes"];
// }
export const _l = 196;
