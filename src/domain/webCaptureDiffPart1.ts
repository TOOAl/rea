export const __stub = 1;
// import { digestCanonicalValue } from "./canonicalDigest.js";
// import {
//   compareUnicodeCodePoints,
//   compositeKey,
// } from "./unicodeCodePointOrder.js";
// import type { WebPageInspection } from "./browserObservationSchemas.js";
// import {
//   webCaptureDiffSchema,
//   type CompareWebCapturesInput,
//   type WebCaptureChange,
//   type WebCaptureDiff,
//   type WebCaptureDimension,
// } from "./webCaptureDiffSchemas.js";
// import type { WebMcpDiscovery } from "./webMcpDiscovery.js";
// import { fingerprintWebCaptureFrames } from "./webCaptureFrameComparison.js";
//
// type Dimension = WebCaptureDimension;
// type Change = WebCaptureChange;
//
// /** Compare normalized observations without treating incomplete absence as proof. */
// export const compareWebCaptures = (
//   input: CompareWebCapturesInput,
// ): WebCaptureDiff => {
//   const before = input.before.inspection;
//   const after = input.after.inspection;
//   const dimensions = compareWebCaptureDimensions(input);
//   const statuses = Object.values(dimensions).map(({ status }) => status);
//   return webCaptureDiffSchema.parse({
//     overall_status: statuses.includes("changed")
//       ? "changed"
//       : statuses.includes("unknown")
//         ? "unknown"
//         : "unchanged",
//     before_target: {
//       target_id: before.target.target_id,
//       url: before.target.url,
//     },
//     after_target: {
//       target_id: after.target.target_id,
//       url: after.target.url,
//     },
//     dimensions,
//     limitations: [
//       "A changed status proves an observed difference; an unknown status means absence could not be established from capture completeness.",
//       "Network comparison covers only activity observed after each CDP attachment. WebSocket connections with the same URL are compared as an unordered collection of ordered frame streams, retaining connection counts; their individual identities are not stable across captures.",
//       "Accessibility roles, ignored state, text, and hierarchy are compared only when the accessibility tree was fully captured and text capture was selected and not truncated.",
//       "Storage key inventories are compared only when selected and complete; usage and quota are compared only when reported. Redacted content is compared through complete SHA-256 fingerprints.",
//     ],
//   });
// };
//
// const compareIdentities = (
//   before: ReadonlyMap<string, string>,
//   after: ReadonlyMap<string, string>,
// ): Change[] => {
//   const changes: Change[] = [];
//   for (const [identity, fingerprint] of before) {
//     const next = after.get(identity);
//     if (next === undefined) changes.push({ identity, change: "removed" });
//     else if (next !== fingerprint)
//       changes.push({ identity, change: "modified" });
//   }
//   for (const identity of after.keys())
//     if (!before.has(identity)) changes.push({ identity, change: "added" });
//   return changes.sort(
//     (left, right) =>
//       compareUnicodeCodePoints(left.identity, right.identity) ||
//       compareUnicodeCodePoints(left.change, right.change),
//   );
// };
//
// const compareDimension = (
//   before: ReadonlyMap<string, string>,
//   after: ReadonlyMap<string, string>,
//   complete: boolean,
//   reason: string,
//   inventoryComplete: boolean | ((identity: string) => boolean) = complete,
// ): Dimension => {
//   // Membership evidence can be complete even when selected content is unknown.
//   const all = compareIdentities(before, after).filter(
//     ({ identity, change }) =>
//       change === "modified" ||
//       (typeof inventoryComplete === "boolean"
//         ? inventoryComplete
//         : inventoryComplete(identity)),
//   );
//   if (all.length > 0)
//     return {
//       status: "changed",
//       total_changes: all.length,
//       changes: all,
//       reason: null,
//     };
//   return complete
//     ? {
//         status: "unchanged",
//         total_changes: 0,
//         changes: [],
//         reason: null,
//       }
//     : {
//         status: "unknown",
//         total_changes: 0,
//         changes: [],
//         reason,
//       };
// };
//
// const accessibilityDimension = (
//   before: WebPageInspection,
//   after: WebPageInspection,
// ): Dimension => {
//   const beforeAccess = accessibilityComparable(before);
//   const afterAccess = accessibilityComparable(after);
//   const textComparable = beforeAccess.text && afterAccess.text;
//   const nodesComparable = beforeAccess.nodes && afterAccess.nodes;
//   return compareDimension(
//     singleton(
//       "accessibility_tree",
//       digestCanonicalValue(
//         accessibilityProjection(
//           before.accessibility,
//           textComparable,
//           nodesComparable,
//         ),
//       ),
//     ),
//     singleton(
//       "accessibility_tree",
//       digestCanonicalValue(
//         accessibilityProjection(
//           after.accessibility,
//           textComparable,
//           nodesComparable,
//         ),
//       ),
//     ),
//     beforeAccess.complete && afterAccess.complete,
//     "Accessibility tree or text capture was incomplete in at least one observation.",
//   );
// };
//
// const storageDimension = (
//   before: WebPageInspection,
//   after: WebPageInspection,
// ): Dimension => {
//   const keysComplete =
//     storageKeysComparable(before) && storageKeysComparable(after);
//   const usageComplete =
//     before.storage.usage_bytes !== null &&
//     after.storage.usage_bytes !== null &&
//     before.storage.quota_bytes !== null &&
//     after.storage.quota_bytes !== null;
//   const comparableFingerprints = storageFingerprintIdentities(
//     before.storage,
//     after.storage,
//   );
//   return compareDimension(
//     storageMap(
//       before.storage,
//       keysComplete,
//       usageComplete,
//       comparableFingerprints,
//     ),
//     storageMap(
//       after.storage,
//       keysComplete,
//       usageComplete,
//       comparableFingerprints,
//     ),
//     storageComparable(before, after, keysComplete, usageComplete),
//     "Storage fingerprints, inventories, usage, or quota were unavailable or truncated in at least one observation.",
//     keysComplete,
//   );
// };
//
// const compareWebCaptureDimensions = (
//   input: CompareWebCapturesInput,
// ): WebCaptureDiff["dimensions"] => {
//   const before = input.before.inspection;
//   const after = input.after.inspection;
//   return {
//     dom_structure: domDimension(before, after),
//     scripts: compareDimension(
//       keyed(
//         before.scripts.items.map(scriptProjection),
//         (item) => item.script_key,
//       ),
//       keyed(
//         after.scripts.items.map(scriptProjection),
//         (item) => item.script_key,
//       ),
//       sectionsComplete(before, ["scripts"]) &&
//         sectionsComplete(after, ["scripts"]),
//       "Script inventory was incomplete in at least one observation.",
//     ),
//     resources: compareDimension(
//       keyed(before.resources, (item) => item.resource_key),
//       keyed(after.resources, (item) => item.resource_key),
//       sectionsComplete(before, ["resources"]) &&
//         sectionsComplete(after, ["resources"]),
//       "Resource inventory was incomplete in at least one observation.",
//     ),
//     network: networkDimension(before, after),
//     metadata: compareAggregate(
//       "metadata",
//       metadataProjection(before),
//       metadataProjection(after),
//       sectionsComplete(before, ["metadata"]) &&
//         sectionsComplete(after, ["metadata"]),
//       "Safe metadata capture was incomplete in at least one observation.",
//     ),
//     webmcp: webMcpDimension(input.before.webmcp, input.after.webmcp),
//     accessibility: accessibilityDimension(before, after),
//     storage: storageDimension(before, after),
//   };
// };
//
// const keyed = <T>(
//   values: readonly T[],
//   identity: (value: T) => string,
// ): ReadonlyMap<string, string> =>
//   new Map(
//     values.map((value) => [identity(value), digestCanonicalValue(value)]),
//   );
//
// type BodyShapeSources = {
//   readonly request: boolean;
//   readonly response: boolean;
// };
//
// const bodyShapesSelected = (inspection: WebPageInspection): boolean =>
//   !inspection.completeness.excluded.some(
//     ({ section, reason }) =>
//       section === "json_body_shapes" && reason === "not_approved",
//   ) &&
//   (inspection.network.requests.length === 0 ||
//     inspection.network.requests.some(
//       ({ body_shapes }) => body_shapes.status !== "not_approved",
//     ));
//
// const webSocketShapesSelected = (inspection: WebPageInspection): boolean =>
//   !inspection.completeness.excluded.some(
export const _l = 243;
