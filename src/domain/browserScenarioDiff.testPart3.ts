export const __stub = 1;
//     expect(compared.overall_status).toBe("changed");
//   });
//
//   it("compares concurrent network transactions without receipt order, receipt step or capture-local IDs", () => {
//     const compare = (
//       before: BrowserScenarioCapture,
//       after: BrowserScenarioCapture,
//     ) =>
//       compareBrowserScenarios(
//         compareBrowserScenariosInputSchema.parse({
//           before_scenario: before,
//           after_scenario: after,
//         }),
//       ).overall_status;
//     const statuses = { a: 200, b: 404 };
//
//     expect(
//       compare(
//         concurrentCapture(["a", "b"], statuses),
//         concurrentCapture(["b", "a"], statuses, 1, ["a", "b"]),
//       ),
//     ).toBe("unchanged");
//     expect(
//       compare(
//         concurrentCapture(["a", "b"], statuses),
//         concurrentCapture(["b", "a"], { a: 404, b: 200 }),
//       ),
//     ).toBe("changed");
//     expect(
//       compare(
//         concurrentCapture(["a", "b"], statuses, 0, ["a", "b"]),
//         concurrentCapture(["a", "b"], statuses, 0, ["b", "a"]),
//       ),
//     ).toBe("unchanged");
//     // Redirect linkage is distinct from independent concurrent transactions.
//     expect(
//       compare(
//         concurrentCapture(["a", "b"], statuses),
//         concurrentCapture(["a", "b"], statuses, 0, ["a", "b"], true),
//       ),
//     ).toBe("changed");
//   });
// });
//
// describe("scenario comparison recovery guidance", () => {
//   it("retains network guidance beside a changed console event", () => {
//     const before = scenarioCapture({});
//     const afterBase = scenarioCapture({});
//     const consoleEvent = afterBase.events.items[0];
//     if (consoleEvent?.kind !== "console")
//       throw new Error("Expected console fixture");
//     const after = browserScenarioCaptureSchema.parse({
//       ...afterBase,
//       scenario: {
//         ...afterBase.scenario,
//         network_content: {
//           ...afterBase.scenario.network_content,
//           response_body: true,
//         },
//       },
//       events: {
//         ...afterBase.events,
//         items: [{ ...consoleEvent, text: "settings-ready-again" }],
//       },
//     });
//     const compare = (left: typeof before, right: typeof before) =>
//       compareBrowserScenarios(
//         compareBrowserScenariosInputSchema.parse({
//           before_scenario: left,
//           after_scenario: right,
//         }),
//       );
//
//     const changed = compare(before, after);
//     expect(changed.overall_status).toBe("changed");
//     expect(changed.steps.flatMap((step) => step.artifact_diffs)).toContainEqual(
//       expect.objectContaining({
//         artifact: "events",
//         status: "changed",
//         reason: expect.stringContaining("Network content selections differ"),
//       }),
//     );
//     const sameSelection = compare(before, scenarioCapture({}));
//     expect(sameSelection.overall_status).toBe("unchanged");
//     expect(
//       sameSelection.steps.flatMap((step) => step.artifact_diffs),
//     ).not.toContainEqual(expect.objectContaining({ artifact: "events" }));
//     const quietMismatch = compare(
//       before,
//       browserScenarioCaptureSchema.parse({ ...after, events: before.events }),
//     );
//     expect(
//       quietMismatch.steps.flatMap((step) => step.artifact_diffs),
//     ).toContainEqual(
//       expect.objectContaining({
//         artifact: "events",
//         status: "unknown",
//         reason: expect.stringContaining("Network content selections differ"),
//       }),
//     );
//   });
// });
//
// describe("browser scenario comparison", () => {
//   it("records canonical literal normalization and ignores declared volatile fields", () => {
//     const before = scenarioCapture({
//       domText: "<main data-build='build-123'>Settings</main>",
//       elapsedMs: 11,
//       eventSequence: 3,
//     });
//     const after = scenarioCapture({
//       domText: "<main data-build='build-456'>Settings</main>",
//       elapsedMs: 900,
//       eventSequence: 88,
//     });
//     const rules = [
//       {
//         rule_id: "new-build",
//         artifacts: ["dom"] as const,
//         match: "build-456",
//         replacement: "[BUILD]",
//       },
//       {
//         rule_id: "old-build",
//         artifacts: ["dom"] as const,
//         match: "build-123",
//         replacement: "[BUILD]",
//       },
//     ];
//
//     const compared = compareBrowserScenarios(
//       compareBrowserScenariosInputSchema.parse({
//         before_scenario: before,
//         after_scenario: after,
//         normalization: { rules },
//       }),
//     );
//     const reordered = compareBrowserScenarios(
//       compareBrowserScenariosInputSchema.parse({
//         before_scenario: before,
//         after_scenario: after,
//         normalization: {
//           rules: [...rules].reverse().map((rule) => ({
//             ...rule,
//             artifacts: [...rule.artifacts].reverse(),
//           })),
//         },
//       }),
//     );
//
//     expect(compared.overall_status).toBe("unchanged");
//     expect(compared.alignment.status).toBe("aligned");
//     expect(compared.artifact_diffs.total).toBe(0);
//     expect(compared.normalization).toMatchObject({
//       rules: [
//         { rule_id: "new-build", artifacts: ["dom"] },
//         { rule_id: "old-build", artifacts: ["dom"] },
//       ],
//     });
//     expect(reordered.normalization.sha256).toBe(compared.normalization.sha256);
//   });
//
//   it("exposes action mismatches and normalized artifact-level changes", () => {
//     const before = scenarioCapture({
//       domText: "<main>Settings</main>",
//     });
//     const after = scenarioCapture({
//       action: "dblclick",
//       domText: "<main>Advanced settings</main>",
//     });
//
//     const compared = compareBrowserScenarios(
//       compareBrowserScenariosInputSchema.parse({
//         before_scenario: before,
//         after_scenario: after,
//       }),
//     );
//     const step = compared.steps.find(
//       ({ step_id: stepId }) => stepId === "open-settings",
//     );
//
//     expect(compared.overall_status).toBe("changed");
//     expect(compared.alignment).toMatchObject({
//       status: "partial",
//       failures: [
//         expect.objectContaining({
//           code: "action_mismatch",
//           step_id: "open-settings",
//         }),
//       ],
//     });
//     expect(step).toMatchObject({
//       status: "changed",
//       artifact_diffs: [
//         expect.objectContaining({
//           artifact: "action_state",
//           status: "changed",
//         }),
//         expect.objectContaining({ artifact: "dom", status: "changed" }),
//       ],
//     });
//     expect(compared.artifact_diffs).toEqual({ total: 2 });
//   });
// });
//
// describe("browser scenario comparison text values", () => {
//   it("accepts long normalization values and comparison diagnostics", () => {
//     const longText = "x".repeat(5_000);
//     const ruleId = "r".repeat(100);
//     const capture = scenarioCapture({});
//     const compared = compareBrowserScenarios(
//       compareBrowserScenariosInputSchema.parse({
//         before_scenario: capture,
//         after_scenario: capture,
//         normalization: {
//           rules: [
//             {
//               rule_id: ruleId,
//               artifacts: ["dom"],
//               match: longText,
//               replacement: longText,
//             },
//           ],
//         },
//       }),
//     );
//     const stepId = "s".repeat(100);
//     const diagnostic = browserScenarioDiffSchema.parse({
//       ...compared,
//       alignment: {
//         ...compared.alignment,
//         before_only: [stepId],
//         after_only: [stepId],
//         failures: [
//           {
//             code: "missing_before_step",
//             step_id: stepId,
//             reason: longText,
//           },
//         ],
//       },
//       steps: compared.steps.map((step) => ({
//         ...step,
//         step_id: stepId,
//         artifact_diffs: [
//           {
//             artifact: "dom",
//             status: "unknown",
//             before_state: "missing",
//             after_state: "missing",
//             before_sha256: null,
//             after_sha256: null,
//             reason: longText,
//           },
export const _l = 254;
