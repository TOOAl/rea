export const __stub = 1;
//     );
//
//     try {
//       const result = await provider.captureScenario(scenario());
//       if (!result.ok) throw result.error;
//       expect(wallClock).toBe(1);
//       expect(Number.isInteger(result.value.duration_ms)).toBe(true);
//       expect(result.value.duration_ms).toBeGreaterThanOrEqual(0);
//       expect(
//         result.value.steps.every(
//           ({ elapsed_ms }) => Number.isInteger(elapsed_ms) && elapsed_ms >= 0,
//         ),
//       ).toBe(true);
//     } finally {
//       vi.restoreAllMocks();
//     }
//   });
// });
//
// describe("PlaywrightBrowserScenarioProvider comparison coverage", () => {
//   it("keeps quiet captures with different event families from comparing unchanged", async () => {
//     const capture = async (events: readonly BrowserScenarioEventFamily[]) => {
//       const provider = new PlaywrightBrowserScenarioProvider(() =>
//         Promise.resolve(new FakeSession("launch")),
//       );
//       const result = await provider.captureScenario(scenario({ events }));
//       if (!result.ok) throw result.error;
//       return result.value;
//     };
//     const compare = async (
//       before: readonly BrowserScenarioEventFamily[],
//       after: readonly BrowserScenarioEventFamily[],
//     ) =>
//       compareBrowserScenarios(
//         compareBrowserScenariosInputSchema.parse({
//           before_scenario: await capture(before),
//           after_scenario: await capture(after),
//         }),
//       );
//
//     const recorded = await capture(["page-errors", "console", "console"]);
//     expect(recorded.completeness.equality_eligible).toBe(true);
//     expect(recorded.scenario.event_families).toEqual([
//       "console",
//       "page-errors",
//     ]);
//     for (const [before, after] of [
//       [[], ["console"]],
//       [["console"], ["page-errors"]],
//     ] as const) {
//       const compared = await compare(before, after);
//       expect(compared.overall_status).toBe("unknown");
//       expect(
//         compared.steps.flatMap((step) => step.artifact_diffs),
//       ).toContainEqual(
//         expect.objectContaining({
//           artifact: "events",
//           status: "unknown",
//           reason: expect.stringContaining("Event family selections differ"),
//         }),
//       );
//     }
//     expect(
//       (await compare(["console", "page-errors"], ["page-errors", "console"]))
//         .overall_status,
//     ).toBe("unchanged");
//   });
// });
//
// describe("PlaywrightBrowserScenarioProvider cleanup", () => {
//   it("returns a cleanup failure with completed observations when close fails", async () => {
//     const session = new FakeSession("launch", {
//       action: new Error("fixture secret action failure"),
//       close: new Error("browser close failed"),
//     });
//     const provider = new PlaywrightBrowserScenarioProvider(() =>
//       Promise.resolve(session),
//     );
//     const result = await provider.captureScenario(scenario());
//
//     expect(result.ok).toBe(false);
//     if (result.ok) return;
//     const projection = projectAnalysisError(result.error);
//     expect(projection).toMatchObject({
//       code: "cleanup_incomplete",
//       details: {
//         cleanup: "incomplete",
//         resources: ["browser_transport"],
//         partial_observation: {
//           kind: "browser-scenario-observation",
//           capture: {
//             browser: { cleanup: "incomplete" },
//             steps: [
//               { step_id: "scenario_start" },
//               { step_id: "wait_0", status: "failed" },
//             ],
//           },
//         },
//       },
//     });
//     expect(session.closeCalls).toBe(1);
//   });
// });
//
// describe("PlaywrightBrowserScenarioProvider operation failures", () => {
//   it.each([{ cleanupFails: false }, { cleanupFails: true }])(
//     "retains typed partial data when operation fails and cleanupFails=$cleanupFails",
//     async ({ cleanupFails }) => {
//       const session = new FakeSession("launch", {
//         capture: {
//           call: 2,
//           error: new AnalysisOutputError(
//             "capture_browser_scenario",
//             "step capture failed",
//             {
//               capturedOutput: {
//                 stdout: "partial stdout",
//                 stderr: "",
//                 truncated: false,
//               },
//               cleanup: {
//                 reason: "capture cleanup is uncertain",
//                 resources: ["capture_handle"],
//               },
//             },
//           ),
//         },
//         ...(cleanupFails ? { close: new Error("browser close failed") } : {}),
//       });
//       session.eventItems = [
//         {
//           sequence: 1,
//           step_index: 0,
//           kind: "console",
//           level: "log",
//           text: "navigation started",
//           url: sanitizeBrowserUrl("https://app.example.test/"),
//         },
//       ];
//       const provider = new PlaywrightBrowserScenarioProvider(() =>
//         Promise.resolve(session),
//       );
//       const result = await provider.captureScenario(scenario());
//
//       expect(result.ok).toBe(false);
//       if (result.ok) return;
//       const projection = projectAnalysisError(result.error);
//       expect(projection).toMatchObject({
//         code: "cleanup_incomplete",
//         details: {
//           diagnostics: {
//             primary_error: {
//               code: "cleanup_incomplete",
//               details: {
//                 operation: "capture_browser_scenario",
//                 reason: "step capture failed",
//               },
//             },
//             ...(cleanupFails
//               ? { cleanup_error: { code: "execution_failure" } }
//               : {}),
//           },
//           partial_observation: {
//             kind: "browser-scenario-observation",
//             capture: {
//               browser: {
//                 cleanup: cleanupFails
//                   ? "incomplete"
//                   : "terminated-owned-process",
//               },
//               steps: [{ step_id: "scenario_start" }],
//               events: {
//                 retained: 1,
//                 dropped: 0,
//                 items: [
//                   expect.objectContaining({ text: "navigation started" }),
//                 ],
//                 omissions: {
//                   by_kind: [],
//                   network_transactions: [],
//                   network_transaction_range: null,
//                 },
//               },
//             },
//           },
//         },
//       });
//       expect(result.error.capturedOutput).toEqual({
//         stdout: "partial stdout",
//         stderr: "",
//         truncated: false,
//       });
//       expect(result.error.cleanup).toEqual(
//         cleanupFails
//           ? {
export const _l = 195;
