export const __stub = 1;
// import { afterEach, expect, it, vi } from "vitest";
//
// import { browserScenarioSchema } from "../../domain/browserScenario.js";
// import {
//   type BrowserScenarioEventAdmission,
//   browserScenarioEventSchema,
//   type BrowserScenarioEvent,
// } from "../../domain/browserScenarioCaptureValues.js";
// import type { BrowserNetworkContentSelection } from "../../domain/browserNetworkEvidence.js";
// import { BrowserScenarioSecrets } from "../BrowserScenarioSecrets.js";
// import {
//   PlaywrightScenarioNetwork,
//   type ScenarioNetworkRequest,
//   type ScenarioNetworkResponse,
// } from "./PlaywrightScenarioNetwork.js";
//
// class RequestFixture implements ScenarioNetworkRequest {
//   headerReads = 0;
//   bodyReads = 0;
//   predecessor: ScenarioNetworkRequest | null = null;
//   constructor(readonly marker: string) {}
//   method() {
//     return "POST";
//   }
//   url() {
//     return "https://example.test/same-url";
//   }
//   resourceType() {
//     return "fetch";
//   }
//   headers(): Record<string, string> {
//     return {
//       "content-type": "text/plain",
//       authorization: "Bearer private-transport",
//     };
//   }
//   async headersArray() {
//     this.headerReads += 1;
//     return Object.entries(this.headers()).map(([name, value]) => ({
//       name,
//       value,
//     }));
//   }
//   postDataBuffer(): Buffer | null {
//     this.bodyReads += 1;
//     return Buffer.from(this.marker);
//   }
//   redirectedFrom() {
//     return this.predecessor;
//   }
//   failure() {
//     return { errorText: "connection reset" };
//   }
// }
//
// class ResponseFixture implements ScenarioNetworkResponse {
//   bodyReads = 0;
//   headerReads = 0;
//   read: () => Promise<Buffer>;
//   constructor(
//     private readonly source: ScenarioNetworkRequest,
//     marker: string,
//   ) {
//     this.read = async () => Buffer.from(marker);
//   }
//   request() {
//     return this.source;
//   }
//   url() {
//     return this.source.url();
//   }
//   status() {
//     return 200;
//   }
//   headers() {
//     return {
//       "content-type": "application/octet-stream",
//       "set-cookie": "session=transport-secret",
//     };
//   }
//   async headersArray() {
//     this.headerReads += 1;
//     return [
//       { name: "X-Repeat", value: "first" },
//       { name: "X-Repeat", value: "second" },
//       { name: "Set-Cookie", value: "session=transport-secret" },
//     ];
//   }
//   body() {
//     this.bodyReads += 1;
//     return this.read();
//   }
// }
//
// const selection = {
//   request_body: true,
//   response_body: true,
//   header_values: true,
// };
// const harness = (
//   selected: BrowserNetworkContentSelection = selection,
//   signal?: AbortSignal,
//   secretValue = "私密",
//   limitsInput: unknown = {},
// ) => {
//   const scenario = browserScenarioSchema.parse({
//     browser: { mode: "launch", executable_path: "/fixture/chrome" },
//     start_url: { url: "https://example.test" },
//     actions: [{ step_id: "done", action: "wait_for_timeout", duration_ms: 1 }],
//     secrets: [
//       { secret_id: "declared", environment_variable: "FIXTURE_SECRET" },
//     ],
//     capture: { limits: limitsInput },
//   });
//   const secrets = BrowserScenarioSecrets.resolve(scenario, {
//     FIXTURE_SECRET: secretValue,
//   });
//   if (secrets === undefined) throw new Error("Fixture secret was not resolved");
//   const events: BrowserScenarioEvent[] = [];
//   const omittedEventCounts = new Map<string, number>();
//   const collector = new PlaywrightScenarioNetwork({
//     selection: selected,
//     limits: scenario.capture.limits,
//     secrets,
//     readTimeoutMs: 50,
//     ...(signal === undefined ? {} : { signal }),
//     emit: (event) => {
//       const sequence = events.length + 1;
//       events.push(
//         browserScenarioEventSchema.parse({ ...event, sequence, step_index: 0 }),
//       );
//       return { status: "retained", sequence };
//     },
//     admitText: () => ({ status: "retained", sequence: events.length + 1 }),
//     admitContentBody: () => ({
//       status: "retained",
//       sequence: events.length + 1,
//     }),
//     omitNetwork: (transactionId, kind, reason) => {
//       let omission = networkOmissions.get(transactionId);
//       if (omission === undefined) {
//         omission = { kinds: new Set(), reasons: new Set() };
//         networkOmissions.set(transactionId, omission);
//       }
//       omission.kinds.add(kind);
//       omission.reasons.add(reason);
//     },
//     omitEvent: (kind) => {
//       omittedEventCounts.set(kind, (omittedEventCounts.get(kind) ?? 0) + 1);
//     },
//   });
//   const networkOmissions = new Map<
//     string,
//     { kinds: Set<string>; reasons: Set<string> }
//   >();
//   return {
//     collector,
//     events,
//     limits: scenario.capture.limits,
//     secrets,
//     networkOmissions,
//     omittedEventCounts,
//   };
// };
//
// const bodyText = (event: BrowserScenarioEvent) => {
//   if (event.kind !== "network-content" || event.body.state !== "captured")
//     throw new Error("Expected retained network bytes");
//   return Buffer.from(event.body.content, "base64").toString();
// };
//
// afterEach(() => vi.useRealTimers());
//
// it("redacts declared secrets in browser-produced form and JSON encodings", async () => {
//   for (const secret of ["私密", 'space " and \n']) {
//     const { collector, events } = harness(selection, undefined, secret);
//     const encoded = new RequestFixture(
//       `value=${new URLSearchParams([["value", secret]]).toString().slice(6)}`,
//     );
//     const json = new RequestFixture(JSON.stringify({ value: secret }));
//     collector.request(encoded);
//     collector.request(json);
//     await collector.finish();
//     const content = events.filter(
//       (event) => event.kind === "network-content" && event.phase === "request",
//     );
//     expect(content.map(bodyText)).toEqual([
//       "value=[REDACTED:declared]",
//       '{"value":"[REDACTED:declared]"}',
//     ]);
//   }
// });
//
// it("associates out-of-order same-URL responses by request identity", async () => {
//   const { collector, events } = harness();
//   const slow = new RequestFixture("slow");
//   const fast = new RequestFixture("fast");
//   collector.request(slow);
//   collector.request(fast);
//   collector.response(new ResponseFixture(fast, "reply:fast"));
//   collector.response(new ResponseFixture(slow, "reply:slow"));
//   collector.finished(fast);
//   collector.finished(slow);
//   await collector.finish();
//   const content = events.filter((event) => event.kind === "network-content");
//   for (const marker of ["slow", "fast"]) {
//     const request = content.find(
//       (event) => event.phase === "request" && bodyText(event) === marker,
//     );
//     const response = content.find(
//       (event) =>
//         event.phase === "response" && bodyText(event) === `reply:${marker}`,
//     );
//     expect(response).toMatchObject({
//       body: { representation: "playwright-response-body-bytes" },
//     });
//     expect(request?.transaction_id).toBe(response?.transaction_id);
//     expect(request?.source_event_sequence).not.toBe(
//       response?.source_event_sequence,
//     );
//   }
export const _l = 221;
