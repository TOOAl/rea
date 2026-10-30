export const __stub = 1;
//             }
//           : undefined,
//       ),
//     );
//     expect(projected.retryable).toBe(!cleanupIncomplete);
//     expect(projected.code).toBe(
//       cleanupIncomplete ? "cleanup_incomplete" : "resource_constraint",
//     );
//     expect(projected.details).toMatchObject({
//       resource: "capacity",
//       reported_limits: { max_concurrent_inspections: 2 },
//     });
//     expect(projected.remediation.action).toContain("Wait");
//     expect(analysisErrorProjectionSchema.safeParse(projected).success).toBe(
//       true,
//     );
//   },
// );
//
// it.each([
//   ["memory", null],
//   ["memory", { address_space_bytes: 67108864 }],
//   ["cpu", null],
//   ["cpu", { cpu_seconds: 1 }],
//   ["file-size", null],
//   ["file-size", { file_size_bytes: 1024 }],
//   ["transport", { result_budget_bytes: 10485760 }],
// ] as const)(
//   "projects reported %s constraints with observed or unknown limits: %j",
//   (resource, limits) => {
//     const projected = projectAnalysisError(
//       new AnalysisResourceConstraintError(
//         "inspect_binary_layout",
//         resource,
//         resource === "memory"
//           ? "Memory allocation failed; exact cause unknown."
//           : "Observed SIGXCPU; exact signal cause unknown.",
//         limits,
//         { capturedOutput: retainedOutput },
//       ),
//     );
//     expect(projected).toMatchObject({
//       code: "resource_constraint",
//       category: "resource_constraint",
//       retryable: false,
//       details: {
//         resource,
//         reported_limits: limits,
//         captured_output: retainedOutput,
//       },
//     });
//     expect(analysisErrorProjectionSchema.safeParse(projected).success).toBe(
//       true,
//     );
//   },
// );
// it.each([
//   new AnalysisInputError("inspect", { capturedOutput: retainedOutput }),
//   new AnalysisOutputError("inspect", "invalid reply", {
//     capturedOutput: retainedOutput,
//   }),
//   new AnalysisCapabilityUnavailableError(
//     "provider",
//     "inspect",
//     "unsupported profile",
//     { capturedOutput: retainedOutput },
//   ),
//   new AnalysisCancelledError("inspect", { capturedOutput: retainedOutput }),
//   new AnalysisTimeoutError("inspect", 30, { capturedOutput: retainedOutput }),
//   new ProviderSelectionError({
//     operation: "inspect",
//     reason: "provider_unavailable",
//     requestedProviderId: "provider",
//     candidateIds: [],
//     capturedOutput: retainedOutput,
//   }),
// ])(
//   "retains captured output without changing the typed primary failure: $._tag",
//   (failure) => {
//     expect(projectAnalysisError(failure).details?.captured_output).toEqual(
//       retainedOutput,
//     );
//   },
// );
//
// it.each([
//   new AnalysisCancelledError("observe_native_calls", {
//     cleanup: {
//       reason: "target process termination could not be verified",
//       resources: ["native-target:4242"],
//     },
//   }),
//   new AnalysisTimeoutError("observe_native_calls", 65_000, {
//     cleanup: {
//       reason: "target process identity was unavailable",
//       resources: ["native-target:4242"],
//     },
//   }),
// ])("retains incomplete cleanup for lifecycle failures: $._tag", (failure) => {
//   expect(projectAnalysisError(failure)).toMatchObject({
//     code: "cleanup_incomplete",
//     details: {
//       cleanup: "incomplete",
//       cleanup_reason: expect.any(String),
//       resources: ["native-target:4242"],
//     },
//   });
// });
//
// it("retains the original failure tag and code when cleanup is incomplete", () => {
//   const error = new EvidenceIntegrityError(
//     "The launched native target did not match its selected digest",
//     {
//       cleanup: {
//         reason: "target survivor identity could not be verified",
//         resources: ["native-target:4242"],
//       },
//     },
//   );
//   expect(error._tag).toBe("EvidenceIntegrityError");
//   expect(projectAnalysisError(error)).toMatchObject({
//     code: "cleanup_incomplete",
//     category: "integrity_mismatch",
//     details: {
//       cleanup: "incomplete",
//       cleanup_reason: "target survivor identity could not be verified",
//       resources: ["native-target:4242"],
//       execution_failure: "evidence_integrity_mismatch",
//     },
//   });
// });
//
// it("projects native partial observations through healthy cancellation failures", () => {
//   const projected = projectAnalysisError(
//     new AnalysisCancelledError("observe_native_calls", {
//       partialObservation: nativeCallPartialObservation,
//     }),
//   );
//
//   expect(projected).toMatchObject({
//     code: "cancelled",
//     details: {
//       operation: "observe_native_calls",
//       cleanup: "complete",
//       partial_observation: nativeCallPartialObservation,
//     },
//   });
//   expect(analysisErrorProjectionSchema.safeParse(projected).success).toBe(true);
// });
//
// it("retains native partial observations and cleanup uncertainty on provider failures", () => {
//   const projected = projectAnalysisError(
//     new ProviderAdapterError("native-lldb", "observe_native_calls", {
//       partialObservation: nativeCallPartialObservation,
//       cleanup: {
//         reason: "target process termination could not be verified",
//         resources: ["native-target:4242"],
//       },
//     }),
//   );
//
//   expect(projected).toMatchObject({
//     code: "cleanup_incomplete",
//     details: {
//       provider_id: "native-lldb",
//       operation: "observe_native_calls",
//       cleanup: "incomplete",
//       cleanup_reason: "target process termination could not be verified",
//       resources: ["native-target:4242"],
//       execution_failure: "execution_failure",
//       partial_observation: nativeCallPartialObservation,
//     },
//   });
//   expect(analysisErrorProjectionSchema.safeParse(projected).success).toBe(true);
// });
//
// describe("analysis error projection: browser provider failures", () => {
//   it("explains the service-worker policy refusal and names its recovery", () => {
//     const projected = projectAnalysisError(
//       new BrowserObservationError(
//         "capture_browser_scenario",
//         "service_worker_blocked",
//       ),
//     );
//
//     expect(projected).toMatchObject({
//       code: "target_unavailable",
//       category: "unavailable",
//       retryable: false,
//       message: expect.stringContaining("service-worker policy is block"),
//       remediation: {
//         action: expect.stringContaining("environment.service_workers to allow"),
//       },
//       details: {
//         operation: "capture_browser_scenario",
//         reason: "service_worker_blocked",
//       },
//     });
//   });
//
//   it("projects the primary browser failure alongside incomplete cleanup", () => {
//     const projected = projectAnalysisError(
//       new BrowserObservationError(
//         "observe_javascript_runtime",
//         "cleanup_failed",
//         {
//           cause: new AggregateError([
//             new BrowserObservationError(
//               "observe_javascript_runtime",
//               "target_changed",
//             ),
//             new Error("socket close failed"),
//           ]),
//         },
//       ),
//     );
//
//     expect(projected).toMatchObject({
export const _l = 218;
