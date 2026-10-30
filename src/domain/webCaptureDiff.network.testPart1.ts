export const __stub = 1;
// import { describe, expect, it } from "vitest";
//
// import {
//   passiveNetworkCapture,
//   withPassiveDroppedEvents,
// } from "../../tests/fixtures/passiveNetworkCapture.js";
// import {
//   browserCaptureComparisonInputSchema,
//   compareBrowserCaptures,
// } from "./browserCaptureComparison.js";
// import type { WebPageInspection } from "./browserObservationSchemas.js";
// import { webCaptureDiffSchema } from "./webCaptureDiffSchemas.js";
//
// const compare = (before: WebPageInspection, after: WebPageInspection) =>
//   webCaptureDiffSchema.parse(
//     compareBrowserCaptures(
//       browserCaptureComparisonInputSchema.parse({
//         before: { inspection: before },
//         after: { inspection: after },
//       }),
//     ),
//   ).dimensions.network;
//
// const unselectedShapes = (capture: WebPageInspection): WebPageInspection => {
//   capture.completeness.excluded.push({
//     section: "json_body_shapes",
//     reason: "not_approved",
//     count: null,
//   });
//   for (const request of capture.network.requests)
//     request.body_shapes.status = "not_approved";
//   return capture;
// };
//
// const redirectCapture = (resourceType: string | null): WebPageInspection => {
//   const capture = unselectedShapes(passiveNetworkCapture());
//   capture.network.requests[0]!.redirects = [
//     {
//       url: "https://app.example.test/start",
//       response_url: "https://app.example.test/start",
//       method: "GET",
//       resource_type: resourceType,
//       status: 302,
//       mime_type: "text/html",
//       encoded_data_length: 20,
//       request_timestamp: 1,
//       redirect_event_timestamp: 2,
//     },
//   ];
//   return capture;
// };
//
// describe("nullable redirect resource types", () => {
//   it.each([true, false])(
//     "retains uncertainty when a redirect type is omitted (reversed=%s)",
//     (reversed) => {
//       const before = redirectCapture("Document");
//       const after = structuredClone(before);
//       after.network.requests[0]!.redirects![0]!.resource_type = null;
//       const [left, right] = reversed
//         ? ([after, before] as const)
//         : ([before, after] as const);
//       expect(compare(left, right)).toMatchObject({
//         status: "unknown",
//         total_changes: 0,
//         changes: [],
//       });
//     },
//   );
//
//   it.each(["Document", "Fetch"])(
//     "keeps a known redirect type %s comparable",
//     (resourceType) => {
//       const before = redirectCapture("Document");
//       const after = structuredClone(before);
//       after.network.requests[0]!.redirects![0]!.resource_type = resourceType;
//       expect(compare(before, after)).toMatchObject({
//         status: resourceType === "Document" ? "unchanged" : "changed",
//         total_changes: resourceType === "Document" ? 0 : 1,
//       });
//     },
//   );
//
//   it("retains proven HTTP membership with incomplete redirect metadata", () => {
//     const before = unselectedShapes(passiveNetworkCapture([]));
//     const after = redirectCapture(null);
//     expect(compare(before, after)).toMatchObject({
//       status: "changed",
//       total_changes: 1,
//       changes: [{ change: "added" }],
//     });
//   });
// });
//
// describe("passive network inventory changes", () => {
//   it.each(["websocket_connections", "websocket_frames"] as const)(
//     "does not infer duplicate WebSocket inventory changes from dropped %s",
//     (kind) => {
//       const before = unselectedShapes(passiveNetworkCapture());
//       before.network.websocket_connections = [
//         {
//           request_id: "ws-one",
//           url: "wss://app.example.test/live",
//           events: [],
//         },
//       ];
//       const after = structuredClone(before);
//       after.network.websocket_connections.push({
//         request_id: "ws-two",
//         url: "wss://app.example.test/live",
//         events: [],
//       });
//       const limited = withPassiveDroppedEvents(before, { [kind]: 1 });
//       for (const [left, right] of [
//         [limited, after],
//         [after, limited],
//       ] as const)
//         expect(compare(left, right)).toMatchObject({
//           status: "unknown",
//           total_changes: 0,
//           changes: [],
//         });
//       expect(compare(before, after)).toMatchObject({
//         status: "changed",
//         total_changes: 1,
//         changes: [{ change: "modified" }],
//       });
//     },
//   );
//
//   it.each(["dropped", "truncated", "unavailable"] as const)(
//     "does not infer repeated-request count changes from %s HTTP inventory",
//     (limitation) => {
//       const after = unselectedShapes(passiveNetworkCapture(["/a", "/a"]));
//       let before = unselectedShapes(passiveNetworkCapture());
//       if (limitation === "dropped")
//         before = withPassiveDroppedEvents(before, { network_requests: 1 });
//       else if (limitation === "truncated")
//         before.completeness.truncated_sections.push("network_requests");
//       else before.completeness.unavailable_sections.push("network_requests");
//       for (const [left, right] of [
//         [before, after],
//         [after, before],
//       ] as const)
//         expect(compare(left, right)).toMatchObject({
//           status: "unknown",
//           total_changes: 0,
//           changes: [],
//         });
//     },
//   );
//
//   it.each(["unavailable", "partial", "truncated"] as const)(
//     "retains complete request additions/removals with %s selected shapes",
//     (coverage) => {
//       const before = passiveNetworkCapture(["/a"]);
//       const after = passiveNetworkCapture(["/a", "/b"]);
//       for (const capture of [before, after]) {
//         if (coverage === "truncated")
//           capture.completeness.truncated_sections.push("json_body_shapes");
//         else capture.completeness.unavailable_sections.push("json_body_shapes");
//         for (const request of capture.network.requests) {
//           const shape = {
//             root_type: "object" as const,
//             node_count: 1,
//             max_depth_observed: 0,
//             properties: [],
//           };
//           if (coverage !== "unavailable") request.body_shapes.request = shape;
//           if (coverage === "truncated") request.body_shapes.response = shape;
export const _l = 170;
