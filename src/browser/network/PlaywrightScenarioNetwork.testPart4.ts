export const __stub = 1;
//         message: "Cannot read [REDACTED:declared] response",
//       },
//     }),
//   );
//   expect(events).toContainEqual(
//     expect.objectContaining({
//       kind: "network-content",
//       phase: "response",
//       body: expect.objectContaining({
//         state: "captured",
//         content: "",
//         bytes: 0,
//       }),
//     }),
//   );
//   expect(collector.limitations().length).toBeGreaterThan(0);
// });
//
// it("redacts declared encodings in body media metadata", async () => {
//   const { collector, events } = harness({
//     request_body: false,
//     response_body: true,
//     header_values: false,
//   });
//   const request = new RequestFixture("input");
//   const response = new ResponseFixture(request, "ordinary-bytes");
//   const headers = response.headers();
//   response.headers = () => ({
//     ...headers,
//     "content-type": `text/plain; fixture=${encodeURIComponent("私密")}`,
//   });
//   collector.request(request);
//   collector.response(response);
//   collector.finished(request);
//   await collector.finish();
//   expect(events).toContainEqual(
//     expect.objectContaining({
//       kind: "network-content",
//       phase: "response",
//       body: expect.objectContaining({
//         state: "captured",
//         media_type: "text/plain; fixture=[REDACTED:declared]",
//       }),
//     }),
//   );
// });
//
// it("bounds admitted transactions before invoking content producers", async () => {
//   const { collector, events } = harness();
//   const admitted: RequestFixture[] = [];
//   for (let index = 0; index < 1024; index += 1) {
//     const request = new RequestFixture(`body-${index}`);
//     admitted.push(request);
//     collector.request(request);
//     collector.request(request); // repeated producer delivery cannot add jobs
//   }
//   const rejected = new RequestFixture("rejected");
//   const response = new ResponseFixture(rejected, "rejected");
//   collector.request(rejected);
//   collector.response(response);
//   collector.finished(rejected);
//   await collector.finish();
//   expect(admitted[0]?.bodyReads).toBe(1);
//   expect(
//     admitted.every(
//       (request) => request.bodyReads === 1 && request.headerReads === 1,
//     ),
//   ).toBe(true);
//   expect(rejected.bodyReads).toBe(0);
//   expect(rejected.headerReads).toBe(0);
//   expect(response.bodyReads).toBe(0);
//   expect(response.headerReads).toBe(0);
//   expect(
//     events.filter((event) => event.kind === "network-content"),
//   ).toHaveLength(1024);
//   expect(collector.limitations().join(" ")).toContain("resource budget");
// });
//
// it("uses the caller's transaction limit and reports the exact omitted ID range", async () => {
//   const { collector, events, omittedEventCounts } = harness(
//     selection,
//     undefined,
//     "fixture",
//     { max_network_transactions: 2 },
//   );
//   const requests = Array.from(
//     { length: 4 },
//     (_, index) => new RequestFixture(`body-${String(index)}`),
//   );
//   for (const request of requests) collector.request(request);
//   collector.response(new ResponseFixture(requests[2]!, "body-2"));
//   collector.finished(requests[2]!);
//   await collector.finish();
//   expect(collector.omittedTransactionRange()).toEqual({
//     first_transaction_id: "request-3",
//     last_transaction_id: "request-4",
//     count: 2,
//     reason: "max-network-transactions",
//   });
//   expect(events.filter(({ kind }) => kind === "request")).toHaveLength(2);
//   expect(Object.fromEntries(omittedEventCounts)).toEqual({
//     request: 2,
//     "network-content": 3,
//     response: 1,
//     "request-finished": 1,
//   });
//   expect(requests[2]?.bodyReads).toBe(0);
// });
//
// it("uses the caller's body-byte limit and returns typed size evidence", async () => {
//   const { collector, events } = harness(selection, undefined, "fixture", {
//     max_network_body_bytes: 4,
//   });
//   const request = new RequestFixture("12345");
//   collector.request(request);
//   await collector.finish();
//   expect(events.find(({ kind }) => kind === "network-content")).toMatchObject({
//     transaction_id: "request-1",
//     body: {
//       state: "unavailable",
//       reason: "body-size-limit",
//       limit_bytes: 4,
//       observed_bytes: 5,
//     },
//   });
// });
//
// it("keeps header names and selected body when unselected values are oversized", async () => {
//   const { collector, events } = harness({
//     request_body: true,
//     response_body: false,
//     header_values: false,
//   });
//   const request = new RequestFixture("retained body");
//   request.headers = () => ({
//     "x-large-unselected": "x".repeat(1024 * 1024 + 1),
//   });
//   collector.request(request);
//   await collector.finish();
//
//   expect(events).toContainEqual(
//     expect.objectContaining({
//       kind: "request",
//       header_names: ["x-large-unselected"],
//     }),
//   );
//   expect(
//     events.find((event) => event.kind === "network-content"),
//   ).toMatchObject({
//     phase: "request",
//     headers: { state: "not_requested" },
//     body: { state: "captured" },
//   });
//   expect(request.bodyReads).toBe(1);
// });
//
// it("omits oversized body copies and retains ordinary content", async () => {
//   const { collector, events } = harness();
//   collector.request(new RequestFixture("x".repeat(64 * 1024 + 1)));
//   collector.request(new RequestFixture("ordinary"));
//   await collector.finish();
//   const content = events.filter((event) => event.kind === "network-content");
//   expect(content[0]?.body).toMatchObject({
//     state: "unavailable",
//     reason: "body-size-limit",
//     limit_bytes: 64 * 1024,
//     observed_bytes: 64 * 1024 + 1,
//     message: expect.stringContaining("budget"),
//   });
//   expect(bodyText(content[1]!)).toBe("ordinary");
// });
//
// it("reserves redaction expansion before creating replacement copies", async () => {
//   const { collector, events, secrets } = harness(selection, undefined, "a");
//   const redact = vi.spyOn(secrets, "redactBytes");
//   collector.request(new RequestFixture("a".repeat(64 * 1024)));
//   await collector.finish();
//   expect(
//     events.find((event) => event.kind === "network-content")?.body,
//   ).toMatchObject({
//     state: "unavailable",
//     message: expect.stringContaining("redaction"),
//   });
//   // Ordinary header values can still pass through the byte redactor.
//   expect(redact.mock.calls.every(([value]) => value.length < 64 * 1024)).toBe(
//     true,
//   );
// });
//
// it("does not read content when phase metadata was omitted", async () => {
//   const { secrets, limits } = harness();
//   const redact = vi.spyOn(secrets, "redact");
//   const collector = new PlaywrightScenarioNetwork({
//     selection,
//     limits,
//     secrets,
//     admitText: () => ({
//       status: "omitted",
//       sequence: 1,
//       reason: "max-total-event-allocation-bytes",
//     }),
//     emit: (): BrowserScenarioEventAdmission => ({
//       status: "retained",
//       sequence: 1,
//     }),
//     admitContentBody: () => ({ status: "retained", sequence: 1 }),
//     omitNetwork: () => undefined,
//     omitEvent: () => undefined,
//   });
//   const request = new RequestFixture("ordinary");
//   collector.request(request);
//   await collector.finish();
//   expect(redact).not.toHaveBeenCalled();
//   expect(request.bodyReads + request.headerReads).toBe(0);
//   expect(collector.limitations().join(" ")).toContain(
//     "max-total-event-allocation-bytes",
//   );
//   expect(collector.limitations().join(" ")).toContain("incomplete");
// });
export const _l = 219;
