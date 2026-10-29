export const __stub = 1;
// import { createHash } from "node:crypto";
//
// import { describe, expect, it } from "vitest";
//
// import { compareBrowserScenarios } from "./browserScenarioDiff.js";
// import {
//   compareBrowserScenariosInputSchema,
//   browserScenarioDiffSchema,
// } from "./browserScenarioDiffValues.js";
// import {
//   browserScenarioCaptureSchema,
//   type BrowserScenarioCapture,
// } from "./browserScenarioCapture.js";
// import { DEFAULT_BROWSER_SCENARIO_CAPTURE_LIMITS } from "./browserScenarioCaptureLimits.js";
//
// const noEventOmissions = {
//   by_kind: [],
//   network_transactions: [],
//   network_transaction_range: null,
// } as const;
//
// const networkCapture = (sourceSequence: number, receiptStep: number) => {
//   const base = scenarioCapture({});
//   const events = [
//     {
//       sequence: sourceSequence,
//       step_index: 0,
//       kind: "request",
//       method: "POST",
//       url: {
//         url: "https://app.example.test/api",
//         origin: "https://app.example.test",
//         query_parameter_names: [],
//         redacted: false,
//       },
//       resource_type: "fetch",
//       transaction_id: "request-1",
//       redirected_from_transaction_id: null,
//       redirected_from_transaction_state: "root",
//       header_names: [],
//       status: null,
//       failure: null,
//     },
//     {
//       sequence: sourceSequence + 1,
//       step_index: receiptStep,
//       kind: "network-content",
//       transaction_id: "request-1",
//       phase: "request",
//       source_event_sequence: sourceSequence,
//       headers: { state: "not_requested" },
//       body: {
//         state: "captured",
//         representation: "browser-exposed-request-bytes",
//         encoding: "base64",
//         content: "eA==",
//         bytes: 1,
//         sha256: createHash("sha256").update("x").digest("hex"),
//         media_type: null,
//         redacted: false,
//       },
//     },
//   ];
//   return browserScenarioCaptureSchema.parse({
//     ...base,
//     scenario: {
//       ...base.scenario,
//       network_content: {
//         request_body: true,
//         response_body: false,
//         header_values: false,
//       },
//       event_families: ["network"],
//     },
//     events: {
//       items: events,
//       retained: 2,
//       dropped: 0,
//       omissions: noEventOmissions,
//     },
//   });
// };
//
// it("normalizes network content anchors and attributes late content to its source step", () => {
//   const before = networkCapture(3, 0);
//   const after = networkCapture(90, 1);
//   expect(
//     compareBrowserScenarios(
//       compareBrowserScenariosInputSchema.parse({
//         before_scenario: before,
//         after_scenario: after,
//       }),
//     ).overall_status,
//   ).toBe("unchanged");
//   const content = after.events.items[1];
//   if (content?.kind !== "network-content")
//     throw new Error("Expected content fixture");
//   for (const mutation of [
//     { transaction_id: "another-request" },
//     { source_event_sequence: 91 },
//     { phase: "response" },
//   ])
//     expect(
//       browserScenarioCaptureSchema.safeParse({
//         ...after,
//         events: {
//           ...after.events,
//           items: [after.events.items[0], { ...content, ...mutation }],
//         },
//       }).success,
//     ).toBe(false);
// });
//
// it("reports content-selection mismatch as unknown instead of a website change", () => {
//   const withBody = networkCapture(1, 0);
//   const metadataOnly = browserScenarioCaptureSchema.parse({
//     ...withBody,
//     scenario: {
//       ...withBody.scenario,
//       network_content: {
//         request_body: false,
//         response_body: false,
//         header_values: false,
//       },
//     },
//     events: {
//       ...withBody.events,
//       items: withBody.events.items.filter(
//         (event) => event.kind !== "network-content",
//       ),
//       retained: 1,
//     },
//   });
//   const compared = compareBrowserScenarios(
//     compareBrowserScenariosInputSchema.parse({
//       before_scenario: metadataOnly,
//       after_scenario: withBody,
//     }),
//   );
//   expect(compared.overall_status).toBe("unknown");
//   expect(compared.steps.flatMap((step) => step.artifact_diffs)).toContainEqual(
//     expect.objectContaining({
//       artifact: "events",
//       status: "unknown",
//       reason: expect.stringContaining("content selections differ"),
//     }),
//   );
//   for (const networkContent of [undefined, {}, { request_body: false }])
//     expect(
//       compareBrowserScenariosInputSchema.safeParse({
//         before_scenario: {
//           ...metadataOnly,
//           scenario: {
//             ...metadataOnly.scenario,
//             network_content: networkContent,
//           },
//         },
//         after_scenario: withBody,
//       }).success,
//     ).toBe(false);
// });
//
// it("reports event-family selection mismatch as unknown", () => {
//   const consoleOnly = scenarioCapture({});
//   const withFamilies = (
//     capture: BrowserScenarioCapture,
//     families: BrowserScenarioCapture["scenario"]["event_families"],
//   ) =>
//     browserScenarioCaptureSchema.parse({
//       ...capture,
//       scenario: { ...capture.scenario, event_families: families },
//     });
//   const compare = (
//     before: BrowserScenarioCapture,
//     after: BrowserScenarioCapture,
//   ) =>
//     compareBrowserScenarios(
//       compareBrowserScenariosInputSchema.parse({
//         before_scenario: before,
//         after_scenario: after,
//       }),
//     );
//   const eventDiffs = (compared: ReturnType<typeof compare>) =>
//     compared.steps
//       .flatMap((step) => step.artifact_diffs)
//       .filter(({ artifact }) => artifact === "events");
//
//   const widened = withFamilies(consoleOnly, ["page-errors", "console"]);
//   const mismatched = compare(consoleOnly, widened);
//   expect(mismatched.overall_status).toBe("unknown");
//   expect(eventDiffs(mismatched)).toContainEqual(
//     expect.objectContaining({
//       status: "unknown",
//       before_state: "captured",
//       after_state: "captured",
//       reason: expect.stringContaining(
//         "Event family selections differ (console before, console, page-errors after)",
//       ),
//     }),
//   );
//   expect(
//     compare(
//       withFamilies(consoleOnly, ["console", "page-errors"]),
//       withFamilies(consoleOnly, ["page-errors", "console"]),
//     ).overall_status,
//   ).toBe("unchanged");
//
//   expect(
//     compareBrowserScenariosInputSchema.safeParse({
//       before_scenario: {
//         ...consoleOnly,
//         scenario: { ...consoleOnly.scenario, event_families: ["dialogs"] },
//       },
//       after_scenario: consoleOnly,
//     }).success,
//   ).toBe(false);
//
//   const quiet = browserScenarioCaptureSchema.parse({
//     ...withFamilies(consoleOnly, []),
//     events: { retained: 0, dropped: 0, items: [], omissions: noEventOmissions },
//   });
//   const differentEvents = compare(quiet, widened);
//   expect(differentEvents.overall_status).toBe("unknown");
//   expect(eventDiffs(differentEvents).map(({ status }) => status)).toEqual([
//     "unknown",
//     "unknown",
//   ]);
//
//   const both = eventDiffs(compare(networkCapture(1, 0), consoleOnly));
//   expect(both).toContainEqual(
//     expect.objectContaining({
//       reason: expect.stringMatching(
//         /Event family selections differ.*content selections differ/u,
//       ),
//     }),
//   );
// });
//
// const concurrentCapture = (
//   requestOrder: readonly ("a" | "b")[],
//   statuses: Readonly<Record<"a" | "b", number>>,
//   responseStep = 0,
//   responseOrder: readonly ("a" | "b")[] = requestOrder,
//   redirect = false,
// ) => {
//   const base = scenarioCapture({});
//   const network = (path: "a" | "b") => ({
//     step_index: 0,
//     transaction_id: `request-${String(requestOrder.indexOf(path) + 1)}`,
//     redirected_from_transaction_id:
//       redirect && path === "b"
//         ? `request-${String(requestOrder.indexOf("a") + 1)}`
//         : null,
//     ...(!redirect || path !== "b"
export const _l = 254;
