export const __stub = 1;
//           direction: "sent",
//           opcode: 1,
//           payload_bytes: 4,
//           payload_shape: { format: "text", json_shape: null },
//         },
//       ],
//     });
//     const after = structuredClone(before);
//     const event = after.network.websocket_connections[0]!.events[0]!;
//     event.payload_bytes = null;
//     event.payload_shape = null;
//     expect(compare(before, after)).toMatchObject({
//       status: "unknown",
//       total_changes: 0,
//     });
//     after.network.requests.push({
//       ...passiveNetworkCapture(["/b"]).network.requests[0]!,
//       request_id: "request-b",
//     });
//     expect(compare(before, after)).toMatchObject({
//       status: "changed",
//       total_changes: 1,
//       changes: [{ identity: expect.stringMatching(/^net_/u), change: "added" }],
//     });
//   });
// });
//
// describe("repeated HTTP request identity uncertainty", () => {
//   it.each([true, false])(
//     "keeps repeated-request regrouping unknown when one type is missing (shapes selected=%s)",
//     (selected) => {
//       const before = passiveNetworkCapture(["/a", "/a"]);
//       const after = structuredClone(before);
//       after.network.requests[1]!.resource_type = null;
//       if (!selected)
//         for (const capture of [before, after]) unselectedShapes(capture);
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
//   it("retains a known repeated-request count change", () => {
//     const before = unselectedShapes(passiveNetworkCapture(["/a", "/a"]));
//     const after = unselectedShapes(passiveNetworkCapture());
//     for (const [left, right] of [
//       [before, after],
//       [after, before],
//     ] as const)
//       expect(compare(left, right)).toMatchObject({
//         status: "changed",
//         total_changes: 1,
//         changes: [{ change: "modified" }],
//       });
//   });
//
//   it("does not assign observed content to an ambiguous type bucket", () => {
//     const before = unselectedShapes(passiveNetworkCapture(["/a", "/a"]));
//     before.network.requests[1]!.resource_type = null;
//     before.network.requests[1]!.status = 503;
//     const after = structuredClone(before);
//     after.network.requests[0]!.status = 503;
//     after.network.requests[1]!.status = 200;
//     for (const [left, right] of [
//       [before, after],
//       [after, before],
//     ] as const)
//       expect(compare(left, right)).toMatchObject({
//         status: "unknown",
//         total_changes: 0,
//         changes: [],
//       });
//   });
// });
//
// describe("nullable HTTP request identities", () => {
//   it.each([true, false])(
//     "keeps known/unknown resource-type matches uncertain (shapes selected=%s)",
//     (selected) => {
//       const before = passiveNetworkCapture();
//       const after = structuredClone(before);
//       after.network.requests[0]!.resource_type = null;
//       if (!selected)
//         for (const capture of [before, after]) unselectedShapes(capture);
//       for (const [left, right] of [
//         [before, after],
//         [after, before],
//       ] as const)
//         expect(compare(left, right)).toMatchObject({
//           status: "unknown",
//           total_changes: 0,
//           changes: [],
//           reason: expect.stringContaining("request identity"),
//         });
//     },
//   );
//
//   it("does not prove equality from two unknown request types", () => {
//     const capture = unselectedShapes(passiveNetworkCapture());
//     capture.network.requests[0]!.resource_type = null;
//     expect(compare(capture, structuredClone(capture))).toMatchObject({
//       status: "unknown",
//       total_changes: 0,
//       reason: expect.stringContaining("request identity"),
//     });
//   });
//
//   it("does not assign an unknown type to one of multiple same-method/URL candidates", () => {
//     const before = unselectedShapes(passiveNetworkCapture(["/a", "/a"]));
//     before.network.requests[1]!.resource_type = "Fetch";
//     const after = structuredClone(before);
//     after.network.requests[1]!.resource_type = null;
//     for (const [left, right] of [
//       [before, after],
//       [after, before],
//     ] as const)
//       expect(compare(left, right)).toMatchObject({
//         status: "unknown",
//         total_changes: 0,
//       });
//   });
//
//   it.each([
//     ["/b", "GET"],
//     ["/a", "POST"],
//   ])(
//     "retains a distinct %s %s request beside ambiguous identities",
//     (path, method) => {
//       const before = unselectedShapes(passiveNetworkCapture());
//       const after = unselectedShapes(passiveNetworkCapture(["/a", path]));
//       after.network.requests[0]!.resource_type = null;
//       after.network.requests[1]!.method = method;
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
//   it("uses a complete empty peer inventory to prove absence despite an unknown type", () => {
//     const empty = unselectedShapes(passiveNetworkCapture([]));
//     const observed = unselectedShapes(passiveNetworkCapture());
//     observed.network.requests[0]!.resource_type = null;
//     for (const [left, right, change] of [
//       [empty, observed, "added"],
//       [observed, empty, "removed"],
//     ] as const)
//       expect(compare(left, right)).toMatchObject({
//         status: "changed",
//         total_changes: 1,
//         changes: [{ change }],
//       });
//     expect(compare(empty, empty)).toMatchObject({
//       status: "unchanged",
//       total_changes: 0,
//     });
//   });
//
//   it("retains definite type changes and independently observed metadata changes", () => {
export const _l = 170;
