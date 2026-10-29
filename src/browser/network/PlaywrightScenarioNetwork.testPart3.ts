export const __stub = 1;
//   const { collector, events } = harness({
//     request_body: false,
//     response_body: true,
//     header_values: false,
//   });
//   const requests = Array.from(
//     { length: 20 },
//     (_, index) => new RequestFixture(`request-${String(index)}`),
//   );
//   for (const request of requests) {
//     const response = new ResponseFixture(request, "unused");
//     response.read = () =>
//       new Promise((resolve) => {
//         setTimeout(() => resolve(Buffer.from("captured")), 40);
//       });
//     collector.request(request);
//     collector.response(response);
//     collector.finished(request);
//   }
//
//   const finishing = collector.finish();
//   await vi.advanceTimersByTimeAsync(40);
//   await vi.advanceTimersByTimeAsync(40);
//   await finishing;
//
//   const content = events.filter(
//     (event) => event.kind === "network-content" && event.phase === "response",
//   );
//   expect(content).toHaveLength(20);
//   expect(
//     content.every(
//       (event) =>
//         event.kind === "network-content" && event.body.state === "captured",
//     ),
//   ).toBe(true);
// });
//
// it("settles queued reads as cancelled without starting their body APIs", async () => {
//   const controller = new AbortController();
//   const { collector, events } = harness(
//     {
//       request_body: false,
//       response_body: true,
//       header_values: false,
//     },
//     controller.signal,
//   );
//   const requests = Array.from(
//     { length: 20 },
//     (_, index) => new RequestFixture(`request-${String(index)}`),
//   );
//   const responses = requests.map((request) => {
//     const response = new ResponseFixture(request, "unused");
//     response.read = () => new Promise(() => undefined);
//     return response;
//   });
//   requests.forEach((request, index) => {
//     collector.request(request);
//     collector.response(responses[index]!);
//     collector.finished(request);
//   });
//
//   expect(responses.filter(({ bodyReads }) => bodyReads > 0)).toHaveLength(16);
//   controller.abort();
//   await collector.finish();
//
//   expect(responses.filter(({ bodyReads }) => bodyReads > 0)).toHaveLength(16);
//   const content = events.filter(
//     (event) => event.kind === "network-content" && event.phase === "response",
//   );
//   expect(content).toHaveLength(20);
//   expect(
//     content.every(
//       (event) =>
//         event.kind === "network-content" &&
//         event.body.state === "unavailable" &&
//         event.body.reason === "cancelled",
//     ),
//   ).toBe(true);
// });
//
// it("bounds hung completed-body reads and rejects late mutation after finalization", async () => {
//   vi.useFakeTimers();
//   const { collector, events } = harness();
//   const request = new RequestFixture("hung");
//   const response = new ResponseFixture(request, "unused");
//   let release: (bytes: Buffer) => void = () => {
//     throw new Error("Read was not started");
//   };
//   response.read = () =>
//     new Promise((resolve) => {
//       release = resolve;
//     });
//   collector.request(request);
//   collector.response(response);
//   collector.finished(request);
//   const finishing = collector.finish();
//   await vi.advanceTimersByTimeAsync(51);
//   await finishing;
//   const frozen = JSON.stringify(events);
//   expect(events).toContainEqual(
//     expect.objectContaining({
//       kind: "network-content",
//       phase: "response",
//       body: expect.objectContaining({
//         state: "unavailable",
//         reason: "body-read-timeout",
//       }),
//     }),
//   );
//   release(Buffer.from("late"));
//   collector.request(new RequestFixture("after-cutoff"));
//   await Promise.resolve();
//   expect(JSON.stringify(events)).toBe(frozen);
// });
//
// it("cancellation settles pending reads and preserves the cancelled reason", async () => {
//   const controller = new AbortController();
//   const { collector, events } = harness(selection, controller.signal);
//   const request = new RequestFixture("cancel");
//   const response = new ResponseFixture(request, "unused");
//   response.read = () => new Promise(() => undefined);
//   collector.request(request);
//   collector.response(response);
//   collector.finished(request);
//   controller.abort();
//   await collector.finish();
//   expect(events).toContainEqual(
//     expect.objectContaining({
//       kind: "network-content",
//       phase: "response",
//       body: expect.objectContaining({
//         state: "unavailable",
//         reason: "cancelled",
//       }),
//     }),
//   );
// });
//
// it("records failures without attempting to read the failed body", async () => {
//   const { collector, events } = harness();
//   const request = new RequestFixture("failed");
//   const response = new ResponseFixture(request, "partial");
//   collector.request(request);
//   collector.response(response);
//   collector.failed(request);
//   await collector.finish();
//   expect(response.bodyReads).toBe(0);
//   expect(events).toContainEqual(
//     expect.objectContaining({
//       kind: "request-failed",
//       failure: "connection reset",
//     }),
//   );
//   expect(events).toContainEqual(
//     expect.objectContaining({
//       kind: "network-content",
//       phase: "response",
//       body: expect.objectContaining({ reason: "request-failed" }),
//     }),
//   );
// });
//
// it("links observed redirect hops and leaves unseen predecessors unknown", async () => {
//   const { collector, events } = harness();
//   const first = new RequestFixture("first");
//   const next = new RequestFixture("next");
//   next.predecessor = first;
//   const unseen = new RequestFixture("unseen");
//   unseen.predecessor = new RequestFixture("outside-capture");
//   collector.request(first);
//   collector.request(next);
//   collector.request(unseen);
//   await collector.finish();
//   const requests = events.filter((event) => event.kind === "request");
//   expect(requests[0]?.redirected_from_transaction_state).toBe("root");
//   expect(requests[1]?.redirected_from_transaction_id).toBe(
//     requests[0]?.transaction_id,
//   );
//   expect(requests[1]?.redirected_from_transaction_state).toBeUndefined();
//   expect(requests[2]?.redirected_from_transaction_id).toBeNull();
//   expect(requests[2]?.redirected_from_transaction_state).toBe("unknown");
// });
//
// it("preserves read errors and does not turn unexposed or empty bytes into the same state", async () => {
//   const { collector, events } = harness();
//   const missing = new RequestFixture("missing");
//   missing.postDataBuffer = () => null;
//   const response = new ResponseFixture(missing, "unused");
//   response.read = async () => {
//     throw new Error("Cannot read 私密 response");
//   };
//   response.headersArray = async () => {
//     throw new Error("Headers unavailable 私密");
//   };
//   const empty = new RequestFixture("");
//   collector.request(missing);
//   collector.response(response);
//   collector.finished(missing);
//   collector.request(empty);
//   collector.response(new ResponseFixture(empty, ""));
//   collector.finished(empty);
//   await collector.finish();
//   expect(events).toContainEqual(
//     expect.objectContaining({
//       kind: "network-content",
//       phase: "request",
//       body: { state: "not_exposed" },
//     }),
//   );
//   expect(events).toContainEqual(
//     expect.objectContaining({
//       kind: "network-content",
//       phase: "response",
//       headers: {
//         state: "unavailable",
//         message: "Headers unavailable [REDACTED:declared]",
//       },
//       body: {
//         state: "unavailable",
//         reason: "body-read-failed",
export const _l = 221;
