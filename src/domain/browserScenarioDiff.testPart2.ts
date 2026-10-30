export const __stub = 1;
//       ? { redirected_from_transaction_state: "root" as const }
//       : {}),
//     method: "GET",
//     url: {
//       url: `https://app.example.test/${path}.js`,
//       origin: "https://app.example.test",
//       query_parameter_names: [],
//       redacted: false,
//     },
//     resource_type: "script",
//     header_names: [],
//     failure: null,
//   });
//   const request = (path: "a" | "b") => ({
//     ...network(path),
//     kind: "request",
//     status: null,
//   });
//   const response = (path: "a" | "b") => ({
//     ...network(path),
//     step_index: responseStep,
//     kind: "response",
//     status: statuses[path],
//   });
//   const events = (
//     redirect
//       ? requestOrder.flatMap((path) => [request(path), response(path)])
//       : [...requestOrder.map(request), ...responseOrder.map(response)]
//   ).map((event, index) => ({ ...event, sequence: index + 1 }));
//   return browserScenarioCaptureSchema.parse({
//     ...base,
//     events: {
//       items: events,
//       retained: events.length,
//       dropped: 0,
//       omissions: noEventOmissions,
//     },
//   });
// };
//
// const redirectChainCapture = (swapLeaves = false, reverseReceipt = false) => {
//   const base = scenarioCapture({});
//   const nodes = [
//     { id: "root-a", parent: null, path: "first-a", status: 301 },
//     { id: "root-b", parent: null, path: "first-b", status: 302 },
//     { id: "middle-a", parent: "root-a", path: "same-middle", status: 307 },
//     { id: "middle-b", parent: "root-b", path: "same-middle", status: 307 },
//     {
//       id: "leaf-a",
//       parent: swapLeaves ? "middle-b" : "middle-a",
//       path: "last-a",
//       status: 200,
//     },
//     {
//       id: "leaf-b",
//       parent: swapLeaves ? "middle-a" : "middle-b",
//       path: "last-b",
//       status: 200,
//     },
//   ];
//   const events = (reverseReceipt ? [...nodes].reverse() : nodes)
//     .flatMap((node) => {
//       const network = {
//         step_index: 0,
//         transaction_id: (reverseReceipt ? "renamed-" : "") + node.id,
//         redirected_from_transaction_id:
//           node.parent === null
//             ? null
//             : (reverseReceipt ? "renamed-" : "") + node.parent,
//         ...(node.parent === null
//           ? { redirected_from_transaction_state: "root" as const }
//           : {}),
//         method: "GET",
//         url: {
//           url: `https://app.example.test/${node.path}`,
//           origin: "https://app.example.test",
//           query_parameter_names: [],
//           redacted: false,
//         },
//         resource_type: "document",
//         header_names: [],
//         failure: null,
//       };
//       return [
//         { ...network, kind: "request", status: null },
//         { ...network, kind: "response", status: node.status },
//       ];
//     })
//     .map((event, index) => ({ ...event, sequence: index + 1 }));
//   return browserScenarioCaptureSchema.parse({
//     ...base,
//     events: {
//       items: events,
//       retained: events.length,
//       dropped: 0,
//       omissions: noEventOmissions,
//     },
//   });
// };
//
// describe("browser scenario network event order", () => {
//   it("retains multi-hop redirect ancestry while ignoring IDs and concurrent receipt order", () => {
//     const compare = (after: BrowserScenarioCapture) =>
//       compareBrowserScenarios(
//         compareBrowserScenariosInputSchema.parse({
//           before_scenario: redirectChainCapture(),
//           after_scenario: after,
//         }),
//       );
//     expect(compare(redirectChainCapture(false, true)).overall_status).toBe(
//       "unchanged",
//     );
//     expect(compare(redirectChainCapture(true)).overall_status).toBe("changed");
//   });
//
//   it("keeps missing and cyclic redirect ancestry incomparable", () => {
//     for (const predecessor of ["missing", "middle-a", null]) {
//       const capture = redirectChainCapture();
//       const events = capture.events.items.map((event) =>
//         "transaction_id" in event && event.transaction_id === "root-a"
//           ? {
//               ...event,
//               redirected_from_transaction_id: predecessor,
//               redirected_from_transaction_state: undefined,
//             }
//           : event,
//       );
//       const broken = browserScenarioCaptureSchema.parse({
//         ...capture,
//         events: { ...capture.events, items: events },
//       });
//       const compared = compareBrowserScenarios(
//         compareBrowserScenariosInputSchema.parse({
//           before_scenario: broken,
//           after_scenario: broken,
//         }),
//       );
//       expect(compared.overall_status).toBe("unknown");
//       expect(
//         compared.steps.flatMap((step) => step.artifact_diffs),
//       ).toContainEqual(
//         expect.objectContaining({
//           artifact: "events",
//           status: "unknown",
//           reason: expect.stringContaining("Redirect"),
//         }),
//       );
//     }
//   });
//
//   it("keeps contradictory phase ancestry unknown", () => {
//     const capture = concurrentCapture(["a", "b"], { a: 200, b: 404 });
//     const events = capture.events.items.map((event) =>
//       event.kind === "response" && event.transaction_id === "request-2"
//         ? {
//             ...event,
//             redirected_from_transaction_id: "request-1",
//             redirected_from_transaction_state: undefined,
//           }
//         : event,
//     );
//     const malformed = browserScenarioCaptureSchema.parse({
//       ...capture,
//       events: { ...capture.events, items: events },
//     });
//     const compared = compareBrowserScenarios(
//       compareBrowserScenariosInputSchema.parse({
//         before_scenario: malformed,
//         after_scenario: malformed,
//       }),
//     );
//     expect(compared.overall_status).toBe("unknown");
//     expect(
//       compared.steps.flatMap((step) => step.artifact_diffs),
//     ).toContainEqual(
//       expect.objectContaining({
//         artifact: "events",
//         status: "unknown",
//         reason: expect.stringContaining("Redirect predecessor"),
//       }),
//     );
//   });
// });
//
// describe("browser scenario network comparison stability", () => {
//   it("keeps normalization away from generated network fingerprints", () => {
//     const rules = [..."0123456789abcdef"].map((match, index) => ({
//       rule_id: `remove-fingerprint-hex-${String(index)}`,
//       artifacts: ["events"] as const,
//       match,
//       replacement: "",
//     }));
//     const compared = compareBrowserScenarios(
//       compareBrowserScenariosInputSchema.parse({
//         before_scenario: concurrentCapture(["a", "b"], {
//           a: 200,
//           b: 404,
//         }),
//         after_scenario: concurrentCapture(["a", "b"], {
//           a: 201,
//           b: 404,
//         }),
//         normalization: { rules },
//       }),
//     );
//     expect(compared.overall_status).toBe("changed");
//   });
//
//   it("reports changed ordinary events despite incomplete redirect ancestry", () => {
//     const withGap = (text: string) => {
//       const base = scenarioCapture({});
//       const consoleEvent = base.events.items[0];
//       if (consoleEvent?.kind !== "console")
//         throw new Error("Expected console fixture");
//       return browserScenarioCaptureSchema.parse({
//         ...base,
//         scenario: {
//           ...base.scenario,
//           event_families: ["console", "network"],
//         },
//         events: {
//           retained: 2,
//           dropped: 0,
//           omissions: noEventOmissions,
//           items: [
//             { ...consoleEvent, text },
//             {
//               sequence: 2,
//               step_index: 0,
//               kind: "request",
//               transaction_id: "orphan-request",
//               redirected_from_transaction_id: null,
//               method: "GET",
//               url: {
//                 url: "https://app.example.test/orphan",
//                 origin: "https://app.example.test",
//                 query_parameter_names: [],
//                 redacted: false,
//               },
//               resource_type: "fetch",
//               header_names: [],
//               status: null,
//               failure: null,
//             },
//           ],
//         },
//       });
//     };
//     const compared = compareBrowserScenarios(
//       compareBrowserScenariosInputSchema.parse({
//         before_scenario: withGap("settings-ready"),
//         after_scenario: withGap("settings-failed"),
//       }),
//     );
export const _l = 254;
