export const __stub = 1;
//         ],
//       })),
//       limitations: [longText],
//     });
//
//     expect(diagnostic.normalization.rules[0]).toMatchObject({
//       rule_id: ruleId,
//       match: longText,
//       replacement: longText,
//     });
//     expect(diagnostic.alignment.failures[0]?.reason).toBe(longText);
//     expect(diagnostic.steps[0]?.artifact_diffs[0]?.reason).toBe(longText);
//     expect(diagnostic.limitations).toEqual([longText]);
//   });
// });
//
// describe("browser scenario comparison validation", () => {
//   it("does not accept caller limits that would omit difference records", () => {
//     const capture = scenarioCapture({});
//     expect(
//       compareBrowserScenariosInputSchema.safeParse({
//         before_scenario: capture,
//         after_scenario: capture,
//         max_changes: 1,
//       }).success,
//     ).toBe(false);
//   });
//
//   it("returns every aligned step beyond the former capture ceiling", () => {
//     const before = multiStepScenarioCapture(130, "before");
//     const after = multiStepScenarioCapture(130, "after");
//     const result = compareBrowserScenarios(
//       compareBrowserScenariosInputSchema.parse({
//         before_scenario: before,
//         after_scenario: after,
//       }),
//     );
//
//     expect(result.alignment).toMatchObject({
//       status: "aligned",
//       aligned_steps: 131,
//     });
//     expect(result.steps).toHaveLength(131);
//     expect(result.steps.at(-1)).toMatchObject({
//       before_step_index: 130,
//       after_step_index: 130,
//       status: "changed",
//     });
//     expect(result.artifact_diffs.total).toBe(130);
//   });
//
//   it("reports missing aligned steps without claiming equality", () => {
//     const before = scenarioCapture({});
//     const after = scenarioCapture({ stepId: "open-profile" });
//
//     const compared = compareBrowserScenarios(
//       compareBrowserScenariosInputSchema.parse({
//         before_scenario: before,
//         after_scenario: after,
//       }),
//     );
//
//     expect(compared.overall_status).toBe("unknown");
//     expect(compared.alignment).toMatchObject({
//       status: "partial",
//       aligned_steps: 1,
//       before_only: ["open-settings"],
//       after_only: ["open-profile"],
//       failures: expect.arrayContaining([
//         expect.objectContaining({
//           code: "missing_before_step",
//           step_id: "open-profile",
//         }),
//         expect.objectContaining({
//           code: "missing_after_step",
//           step_id: "open-settings",
//         }),
//       ]),
//     });
//   });
//
//   it("rejects duplicate normalization rule IDs", () => {
//     const capture = scenarioCapture({});
//     expect(
//       compareBrowserScenariosInputSchema.safeParse({
//         before_scenario: capture,
//         after_scenario: capture,
//         normalization: {
//           rules: [
//             {
//               rule_id: "volatile",
//               artifacts: ["dom"],
//               match: "one",
//               replacement: "[VALUE]",
//             },
//             {
//               rule_id: "volatile",
//               artifacts: ["url"],
//               match: "two",
//               replacement: "[VALUE]",
//             },
//           ],
//         },
//       }).success,
//     ).toBe(false);
//   });
// });
//
// const multiStepScenarioCapture = (
//   actionCount: number,
//   content: string,
// ): BrowserScenarioCapture => {
//   const capture = scenarioCapture({});
//   const template = capture.steps[1];
//   if (template === undefined) throw new Error("Expected scenario action step");
//   const steps = [
//     capture.steps[0],
//     ...Array.from({ length: actionCount }, (_, index) => ({
//       ...template,
//       step_index: index + 1,
//       step_id: `step-${String(index + 1)}`,
//       event_sequence_start: index + 1,
//       event_sequence_end: index + 1,
//       artifacts: {
//         ...template.artifacts,
//         dom: {
//           state: "captured" as const,
//           value: textArtifact(`${content}-${String(index + 1)}`),
//         },
//       },
//     })),
//   ];
//   return browserScenarioCaptureSchema.parse({
//     ...capture,
//     scenario: { ...capture.scenario, action_count: actionCount },
//     steps,
//   });
// };
//
// interface ScenarioCaptureOptions {
//   readonly stepId?: string;
//   readonly action?: string;
//   readonly domText?: string;
//   readonly elapsedMs?: number;
//   readonly eventSequence?: number;
// }
//
// const scenarioCapture = (
//   options: ScenarioCaptureOptions,
// ): BrowserScenarioCapture => {
//   const url = {
//     url: "https://app.example.test/settings",
//     origin: "https://app.example.test",
//     query_parameter_names: [],
//     redacted: false,
//   };
//   const completeness = {
//     status: "complete",
//     equality_eligible: true,
//     missing_sections: [],
//     truncated_sections: [],
//   };
//   const artifacts = (text: string) => ({
//     screenshot: { state: "not_requested" },
//     dom: { state: "captured", value: textArtifact(text) },
//     accessibility: { state: "not_requested" },
//     url: { state: "captured", value: url },
//     history: { state: "not_requested" },
//     storage: { state: "not_requested" },
//   });
//   const eventSequence = options.eventSequence ?? 1;
//   return browserScenarioCaptureSchema.parse({
//     browser: {
//       mode: "launch",
//       process_ownership: "provider-owned",
//       cleanup: "terminated-owned-process",
//       product: "Chromium",
//       version: "149.0",
//     },
//     scenario: {
//       start_origin: "https://app.example.test",
//       action_count: 1,
//       secret_references: [],
//       network_content: {
//         request_body: false,
//         response_body: false,
//         header_values: false,
//       },
//       event_families: ["console"],
//       limits: DEFAULT_BROWSER_SCENARIO_CAPTURE_LIMITS,
//     },
//     duration_ms: options.elapsedMs ?? 10,
//     steps: [
//       {
//         step_index: 0,
//         step_id: "scenario_start",
//         action: "scenario_start",
//         status: "completed",
//         elapsed_ms: 0,
//         before_url: url,
//         after_url: url,
//         error: null,
//         event_sequence_start: 1,
//         event_sequence_end: 0,
//         artifacts: artifacts("<main>Ready</main>"),
//         completeness,
//       },
//       {
//         step_index: 1,
//         step_id: options.stepId ?? "open-settings",
//         action: options.action ?? "click",
//         status: "completed",
//         elapsed_ms: options.elapsedMs ?? 10,
//         before_url: url,
//         after_url: url,
//         error: null,
//         event_sequence_start: eventSequence,
//         event_sequence_end: eventSequence,
//         artifacts: artifacts(options.domText ?? "<main>Settings</main>"),
//         completeness,
//       },
//     ],
//     events: {
//       retained: 1,
//       dropped: 0,
//       items: [
//         {
//           sequence: eventSequence,
//           step_index: 1,
//           kind: "console",
//           level: "info",
//           text: "settings-ready",
//           url: null,
//         },
//       ],
//       omissions: noEventOmissions,
//     },
//     completeness,
//     limitations: [],
//   });
// };
//
// const textArtifact = (text: string) => {
//   const bytes = Buffer.from(text);
//   return {
//     sha256: createHash("sha256").update(bytes).digest("hex"),
//     bytes: bytes.byteLength,
//     text,
//   };
// };
export const _l = 250;
