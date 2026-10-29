export const __stub = 1;
//     const before = unselectedShapes(passiveNetworkCapture());
//     const changedType = structuredClone(before);
//     changedType.network.requests[0]!.resource_type = "Fetch";
//     expect(compare(before, changedType)).toMatchObject({
//       status: "changed",
//       total_changes: 2,
//       changes: expect.arrayContaining([
//         expect.objectContaining({ change: "added" }),
//         expect.objectContaining({ change: "removed" }),
//       ]),
//     });
//     before.network.requests.push({
//       ...passiveNetworkCapture(["/b"]).network.requests[0]!,
//       resource_type: null,
//     });
//     const changedStatus = structuredClone(before);
//     changedStatus.network.requests[0]!.status = 503;
//     expect(compare(before, changedStatus)).toMatchObject({
//       status: "changed",
//       total_changes: 1,
//       changes: [{ change: "modified" }],
//     });
//   });
// });
//
// describe("passive dropped-event inventory coverage", () => {
//   it("does not infer request absence from a capture with independently counted drops", () => {
//     const before = withPassiveDroppedEvents(passiveNetworkCapture(), {
//       network_requests: 1,
//     });
//     const after = passiveNetworkCapture(["/a", "/b"]);
//     expect(before.completeness).toMatchObject({
//       status: "truncated",
//       truncated_sections: [],
//       unavailable_sections: [],
//       attach_limited_sections: [],
//       policy_filtered_sections: [],
//       dropped_events: { network_requests: 1, total: 1 },
//     });
//     for (const [left, right] of [
//       [before, after],
//       [after, before],
//     ] as const)
//       expect(compare(left, right)).toMatchObject({
//         status: "unknown",
//         total_changes: 0,
//       });
//     const changed = structuredClone(before);
//     changed.network.requests[0]!.status = 503;
//     expect(compare(before, changed)).toMatchObject({
//       status: "changed",
//       total_changes: 1,
//       changes: [{ change: "modified" }],
//     });
//   });
//
//   it.each([
//     "network_requests",
//     "websocket_connections",
//     "websocket_frames",
//   ] as const)(
//     "cannot prove network equality after dropped %s even when shapes are unselected",
//     (kind) => {
//       const before = withPassiveDroppedEvents(
//         unselectedShapes(passiveNetworkCapture()),
//         { [kind]: 1 },
//       );
//       expect(before.completeness.truncated_sections).toEqual([]);
//       expect(compare(before, structuredClone(before))).toMatchObject({
//         status: "unknown",
//         total_changes: 0,
//       });
//     },
//   );
//
//   it.each(["websocket_connections", "websocket_frames"] as const)(
//     "keeps %s drops separate from HTTP inventory",
//     (kind) => {
//       const before = withPassiveDroppedEvents(passiveNetworkCapture(), {
//         [kind]: 1,
//       });
//       const after = structuredClone(before);
//       after.network.websocket_connections.push({
//         request_id: "ws",
//         url: "wss://app.example.test/live",
//         events: [],
//       });
//       for (const [left, right] of [
//         [before, after],
//         [after, before],
//       ] as const)
//         expect(compare(left, right)).toMatchObject({
//           status: "unknown",
//           total_changes: 0,
//         });
//       after.network.requests.push({
//         ...passiveNetworkCapture(["/b"]).network.requests[0]!,
//         request_id: "request-b",
//       });
//       for (const [left, right, change] of [
//         [before, after, "added"],
//         [after, before, "removed"],
//       ] as const)
//         expect(compare(left, right)).toMatchObject({
//           status: "changed",
//           total_changes: 1,
//           changes: [{ identity: expect.stringMatching(/^net_/u), change }],
//         });
//     },
//   );
//
//   it("retains complete WebSocket membership despite HTTP drops", () => {
//     const before = withPassiveDroppedEvents(passiveNetworkCapture(), {
//       network_requests: 1,
//     });
//     const after = structuredClone(before);
//     after.network.websocket_connections.push({
//       request_id: "ws",
//       url: "wss://app.example.test/live",
//       events: [],
//     });
//     expect(compare(before, after)).toMatchObject({
//       status: "changed",
//       total_changes: 1,
//       changes: [{ identity: expect.stringMatching(/^ws_/u), change: "added" }],
//     });
//     expect(compare(after, before)).toMatchObject({
//       status: "changed",
//       total_changes: 1,
//       changes: [
//         { identity: expect.stringMatching(/^ws_/u), change: "removed" },
//       ],
//     });
//   });
//
//   it.each([
//     "console_events",
//     "scripts",
//     "timeline_events",
//     "webmcp_tools",
//   ] as const)(
//     "does not use the total or unrelated %s drops as HTTP absence limits",
//     (kind) => {
//       const before = withPassiveDroppedEvents(
//         unselectedShapes(passiveNetworkCapture()),
//         { [kind]: 2 },
//       );
//       expect(before.completeness).toMatchObject({
//         status: "truncated",
//         dropped_events: { total: 2 },
//       });
//       expect(compare(before, structuredClone(before))).toMatchObject({
//         status: "unchanged",
//         total_changes: 0,
//       });
//       const after = unselectedShapes(passiveNetworkCapture(["/a", "/b"]));
//       expect(compare(before, after)).toMatchObject({
//         status: "changed",
//         total_changes: 1,
//         changes: [{ change: "added" }],
//       });
//       expect(compare(after, before)).toMatchObject({
//         status: "changed",
//         total_changes: 1,
//         changes: [{ change: "removed" }],
//       });
//     },
//   );
// });
export const _l = 169;
