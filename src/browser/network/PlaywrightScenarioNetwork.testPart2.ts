export const __stub = 1;
//   expect(new Set(content.map((event) => event.transaction_id)).size).toBe(2);
// });
//
// it("keeps metadata-only capture free of body and header-value reads", async () => {
//   const { collector, events } = harness({
//     request_body: false,
//     response_body: false,
//     header_values: false,
//   });
//   const request = new RequestFixture("body");
//   const response = new ResponseFixture(request, "reply");
//   collector.request(request);
//   collector.response(response);
//   collector.finished(request);
//   await collector.finish();
//   expect(
//     request.bodyReads +
//       request.headerReads +
//       response.bodyReads +
//       response.headerReads,
//   ).toBe(0);
//   expect(events.map(({ kind }) => kind)).toEqual([
//     "request",
//     "response",
//     "request-finished",
//   ]);
//   expect(JSON.stringify(events)).not.toContain("private-transport");
// });
//
// it("reports unfinished metadata even when content was not selected", async () => {
//   const { collector, events } = harness({
//     request_body: false,
//     response_body: false,
//     header_values: false,
//   });
//   const request = new RequestFixture("body");
//   collector.request(request);
//   await collector.finish();
//   expect(events.map(({ kind }) => kind)).toEqual([
//     "request",
//     "request-unfinished",
//   ]);
//   expect(collector.limitations()).toHaveLength(1);
//   expect(request.bodyReads + request.headerReads).toBe(0);
// });
//
// it.each([
//   {
//     selection: {
//       request_body: true,
//       response_body: false,
//       header_values: false,
//     },
//     reads: [1, 0, 0, 0],
//     phases: ["request"],
//   },
//   {
//     selection: {
//       request_body: false,
//       response_body: true,
//       header_values: false,
//     },
//     reads: [0, 0, 1, 0],
//     phases: ["response"],
//   },
//   {
//     selection: {
//       request_body: false,
//       response_body: false,
//       header_values: true,
//     },
//     reads: [0, 1, 0, 1],
//     phases: ["request", "response"],
//   },
// ])(
//   "reads only the selected content $selection",
//   async ({ selection: selected, reads, phases }) => {
//     const { collector, events } = harness(selected);
//     const request = new RequestFixture("input");
//     const response = new ResponseFixture(request, "output");
//     collector.request(request);
//     collector.response(response);
//     collector.finished(request);
//     await collector.finish();
//     expect([
//       request.bodyReads,
//       request.headerReads,
//       response.bodyReads,
//       response.headerReads,
//     ]).toEqual(reads);
//     expect(
//       events
//         .filter((event) => event.kind === "network-content")
//         .map((event) => event.phase),
//     ).toEqual(phases);
//   },
// );
//
// it("preserves duplicate headers and binary bytes, redacting credentials and declared UTF-8 secrets", async () => {
//   const { collector, events } = harness();
//   const request = new RequestFixture("input");
//   const response = new ResponseFixture(request, "unused");
//   response.read = async () =>
//     Buffer.concat([
//       Buffer.from([0xff, 0x00]),
//       Buffer.from("私密"),
//       Buffer.from([0xfe]),
//     ]);
//   collector.request(request);
//   collector.response(response);
//   expect(response.bodyReads).toBe(0);
//   collector.finished(request);
//   await collector.finish();
//   const content = events.find(
//     (event) => event.kind === "network-content" && event.phase === "response",
//   );
//   if (content?.kind !== "network-content" || content.body.state !== "captured")
//     throw new Error("Missing response");
//   expect(Buffer.from(content.body.content, "base64")).toEqual(
//     Buffer.concat([
//       Buffer.from([0xff, 0x00]),
//       Buffer.from("[REDACTED:declared]"),
//       Buffer.from([0xfe]),
//     ]),
//   );
//   expect(content.body.redacted).toBe(true);
//   expect(content.headers).toEqual({
//     state: "captured",
//     items: [
//       { name: "X-Repeat", value: "first", redacted: false },
//       { name: "X-Repeat", value: "second", redacted: false },
//       { name: "Set-Cookie", value: null, redacted: true },
//     ],
//   });
//   expect(JSON.stringify(events)).not.toContain("transport-secret");
// });
//
// it("does not read unfinished streaming responses and reports the cutoff", async () => {
//   const { collector, events } = harness();
//   const request = new RequestFixture("stream");
//   const response = new ResponseFixture(request, "never-complete");
//   collector.request(request);
//   collector.response(response);
//   await collector.finish();
//   expect(response.bodyReads).toBe(0);
//   expect(events).toContainEqual(
//     expect.objectContaining({
//       kind: "request-unfinished",
//       reason: "capture-ended",
//     }),
//   );
//   expect(events).toContainEqual(
//     expect.objectContaining({
//       kind: "network-content",
//       phase: "response",
//       body: expect.objectContaining({
//         state: "unavailable",
//         reason: "response-unfinished",
//       }),
//     }),
//   );
//   expect(collector.limitations().length).toBeGreaterThan(0);
// });
//
// it("queues completed body reads behind the active-read limit", async () => {
//   const { collector, events } = harness({
//     request_body: false,
//     response_body: true,
//     header_values: false,
//   });
//   const requests = Array.from(
//     { length: 20 },
//     (_, index) => new RequestFixture(`request-${String(index)}`),
//   );
//   const releases: Array<(bytes: Buffer) => void> = [];
//   let activeReads = 0;
//   let maximumActiveReads = 0;
//   for (const request of requests) {
//     const response = new ResponseFixture(request, "unused");
//     response.read = () =>
//       new Promise((resolve) => {
//         activeReads += 1;
//         maximumActiveReads = Math.max(maximumActiveReads, activeReads);
//         releases.push((bytes) => {
//           activeReads -= 1;
//           resolve(bytes);
//         });
//       });
//     collector.request(request);
//     collector.response(response);
//     collector.finished(request);
//   }
//
//   let releasedReads = 0;
//   while (releasedReads < requests.length) {
//     await new Promise<void>((resolve) => setTimeout(resolve, 0));
//     const batch = releases.splice(0);
//     expect(batch.length).toBeGreaterThan(0);
//     batch.forEach((release) => release(Buffer.from("captured")));
//     releasedReads += batch.length;
//   }
//   await collector.finish();
//
//   const content = events.filter(
//     (event) => event.kind === "network-content" && event.phase === "response",
//   );
//   expect(maximumActiveReads).toBe(16);
//   expect(content).toHaveLength(20);
//   expect(
//     content.every(
//       (event) =>
//         event.kind === "network-content" && event.body.state === "captured",
//     ),
//   ).toBe(true);
//   expect(events.filter(({ kind }) => kind === "network-content")).toHaveLength(
//     20,
//   );
// });
//
// it("starts each queued body's timeout when its read begins", async () => {
//   vi.useFakeTimers();
export const _l = 221;
