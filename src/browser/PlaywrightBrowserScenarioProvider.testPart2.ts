export const __stub = 1;
//           this.failures.incomplete === true,
//         ),
//         storage: artifactState(
//           "storage",
//           requested,
//           this.failures.incomplete === true,
//         ),
//       }),
//     );
//   }
//
//   close() {
//     this.closeCalls += 1;
//     if (this.failures.close !== undefined)
//       return Promise.reject(this.failures.close);
//     return Promise.resolve(
//       this.mode === "launch"
//         ? ("terminated-owned-process" as const)
//         : ("disconnected-external" as const),
//     );
//   }
//
//   redactError(error: unknown) {
//     return error instanceof Error
//       ? error.message.replaceAll("secret", "[REDACTED]")
//       : "fixture failure";
//   }
// }
//
// describe("PlaywrightBrowserScenarioProvider", () => {
//   it("reports response-body provenance uncertainty without marking event coverage missing", async () => {
//     const session = new FakeSession("launch");
//     const selected = scenario();
//     session.eventItems = [
//       {
//         sequence: 1,
//         step_index: 0,
//         kind: "response",
//         transaction_id: "request-1",
//         redirected_from_transaction_id: null,
//         method: "GET",
//         url: sanitizeBrowserUrl("https://app.example.test/main.js"),
//         resource_type: "script",
//         header_names: [],
//         status: 200,
//         failure: null,
//       },
//       {
//         sequence: 2,
//         step_index: 0,
//         kind: "network-content",
//         transaction_id: "request-1",
//         source_event_sequence: 1,
//         phase: "response",
//         headers: { state: "not_requested" },
//         body: {
//           state: "captured",
//           representation: "playwright-response-body-bytes",
//           encoding: "base64",
//           content: "",
//           bytes: 0,
//           sha256:
//             "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
//           media_type: "text/javascript",
//           redacted: false,
//         },
//       },
//     ];
//     const input = browserScenarioSchema.parse({
//       ...selected,
//       capture: {
//         ...selected.capture,
//         network: { ...selected.capture.network, response_body: true },
//       },
//     });
//     const provider = new PlaywrightBrowserScenarioProvider(() =>
//       Promise.resolve(session),
//     );
//
//     const result = await provider.captureScenario(input);
//     if (!result.ok) throw result.error;
//     expect(result.value.limitations).toContain(
//       PLAYWRIGHT_RESPONSE_BODY_PROVENANCE_LIMITATION,
//     );
//     expect(result.value.completeness.missing_sections).not.toContain("events");
//     expect(result.value.events.items[1]).toMatchObject({
//       kind: "network-content",
//       body: {
//         state: "captured",
//         representation: "playwright-response-body-bytes",
//       },
//     });
//   });
//
//   it("makes reported event gaps ineligible for equality even in launch mode", async () => {
//     const session = new FakeSession("launch");
//     session.eventGaps = ["Popup frames before discovery are unavailable"];
//     const provider = new PlaywrightBrowserScenarioProvider(() =>
//       Promise.resolve(session),
//     );
//     const result = await provider.captureScenario(
//       scenario({ events: ["frames"] }),
//     );
//     if (!result.ok) throw result.error;
//     expect(result.value.completeness).toMatchObject({
//       status: "incomplete",
//       equality_eligible: false,
//       missing_sections: ["events"],
//     });
//     expect(result.value.limitations).toContain(session.eventGaps[0]);
//   });
//
//   it("returns an initial state and every step beyond the former action ceiling", async () => {
//     const session = new FakeSession("launch");
//     const provider = new PlaywrightBrowserScenarioProvider(() =>
//       Promise.resolve(session),
//     );
//     const result = await provider.captureScenario(scenario({ actions: 129 }));
//     if (!result.ok) throw result.error;
//     expect(result.value.scenario.action_count).toBe(129);
//     expect(result.value.steps).toHaveLength(130);
//     expect(result.value.steps.at(-1)?.step_id).toBe("wait_128");
//   });
//
//   it("makes missing and truncated captures ineligible for equality", async () => {
//     const session = new FakeSession("launch", { incomplete: true });
//     const provider = new PlaywrightBrowserScenarioProvider(() =>
//       Promise.resolve(session),
//     );
//     const result = await provider.captureScenario(
//       scenario({ captures: ["screenshot", "dom"] }),
//     );
//     if (!result.ok) throw result.error;
//     expect(result.value.completeness).toMatchObject({
//       status: "truncated",
//       equality_eligible: false,
//       missing_sections: ["dom"],
//       truncated_sections: ["screenshot"],
//     });
//   });
//
//   it("records one failed step, cancels later actions, and still cleans up", async () => {
//     const session = new FakeSession("launch", {
//       action: new Error("fixture secret action failure"),
//     });
//     const provider = new PlaywrightBrowserScenarioProvider(() =>
//       Promise.resolve(session),
//     );
//     const result = await provider.captureScenario(scenario({ actions: 2 }));
//     if (!result.ok) throw result.error;
//     expect(result.value.steps.map(({ status }) => status)).toEqual([
//       "completed",
//       "failed",
//       "cancelled",
//     ]);
//     expect(result.value.steps[1]?.error).toBe(
//       "fixture [REDACTED] action failure",
//     );
//     expect(session.performCalls).toBe(1);
//     expect(session.closeCalls).toBe(1);
//     expect(result.value.completeness.equality_eligible).toBe(false);
//   });
//
//   it("disconnects external CDP sessions and marks pre-attach events missing", async () => {
//     const session = new FakeSession("connect");
//     const provider = new PlaywrightBrowserScenarioProvider(() =>
//       Promise.resolve(session),
//     );
//     const result = await provider.captureScenario(
//       scenario({ mode: "connect" }),
//     );
//     if (!result.ok) throw result.error;
//     expect(result.value.browser).toMatchObject({
//       process_ownership: "external",
//       cleanup: "disconnected-external",
//     });
//     expect(result.value.completeness).toMatchObject({
//       status: "incomplete",
//       equality_eligible: false,
//       missing_sections: ["events"],
//     });
//     expect(session.closeCalls).toBe(1);
//   });
// });
//
// describe("PlaywrightBrowserScenarioProvider timing", () => {
//   it("keeps capture elapsed values valid across a backward wall-clock jump", async () => {
//     let wallClock = 10_000;
//     vi.spyOn(Date, "now").mockImplementation(() => wallClock);
//     const session = new FakeSession("launch");
//     session.onPerform = () => {
//       wallClock = 1;
//     };
//     const provider = new PlaywrightBrowserScenarioProvider(() =>
//       Promise.resolve(session),
export const _l = 195;
