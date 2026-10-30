export const __stub = 1;
//       code: "cleanup_incomplete",
//       details: {
//         operation: "observe_javascript_runtime",
//         reason: "cleanup_failed",
//         cleanup: "incomplete",
//         resources: ["browser_transport"],
//         primary_reason: "target_changed",
//       },
//     });
//   });
// });
//
// describe("analysis error projection: Hopper provider failures", () => {
//   it("reports a timed-out active Hopper request and actionable retry guidance", () => {
//     const projected = projectAnalysisError(
//       new HopperTimeoutError(30_000, "trace_feature", 42, "busy"),
//     );
//
//     expect(projected).toMatchObject({
//       code: "provider_timeout",
//       category: "timeout",
//       retryable: true,
//       details: {
//         stage: "analysis",
//         operation: "trace_feature",
//         request_id: 42,
//         provider_state: "busy",
//         timeout_ms: 30_000,
//       },
//     });
//     expect(projected.message).toContain("binary_session.analysis_activity");
//     expect(projected.remediation.action).toContain(
//       "wait for the active Hopper request",
//     );
//   });
//
//   it("identifies the REA session that already owns a Hopper target", () => {
//     const error = new HopperStartError({
//       ownerRunId: "session-owner",
//       userMessage:
//         "This Hopper target is already open in REA session session-owner. Use that REA session or close it before opening this target again.",
//     });
//     expect(projectAnalysisError(error)).toMatchObject({
//       category: "unavailable",
//       message: expect.stringContaining("session-owner"),
//       remediation: {
//         action: expect.stringContaining(
//           "Use the active REA session session-owner",
//         ),
//       },
//     });
//   });
//
//   it("retains the Hopper request and provider diagnostic on a remote failure", () => {
//     expect(
//       projectAnalysisError(
//         new HopperRemoteError(
//           7,
//           "Hopper analysis failed in the selected document",
//           {
//             diagnosticType: "bridge_exception",
//             operation: "trace_feature",
//             requestId: 43,
//           },
//         ),
//       ),
//     ).toMatchObject({
//       code: "execution_failure",
//       details: {
//         stage: "analysis",
//         provider_code: 7,
//         diagnostic_type: "bridge_exception",
//         operation: "trace_feature",
//         request_id: 43,
//       },
//       message: expect.stringContaining("Hopper analysis failed"),
//     });
//   });
// });
//
// describe("analysis error projection: detached provider diagnostics", () => {
//   it.each(["adapter", "cancelled", "timeout"])(
//     "preserves detached, actionable diagnostics for %s errors",
//     (kind) => {
//       const diagnostics = {
//         runtime_root: "/tmp/rea-ghidra-fixture",
//         profile_digest: "a".repeat(64),
//         exit_code: 1,
//       };
//       const error =
//         kind === "adapter"
//           ? new ProviderAdapterError("ghidra", "health", { diagnostics })
//           : kind === "cancelled"
//             ? new AnalysisCancelledError("health", { diagnostics })
//             : new AnalysisTimeoutError("health", 250, { diagnostics });
//
//       expect(error.diagnostics).not.toBe(diagnostics);
//       expect(projectAnalysisError(error)).toMatchObject({
//         details: {
//           ...(kind === "adapter" ? { provider_id: "ghidra" } : {}),
//           operation: "health",
//           diagnostics,
//         },
//       });
//       diagnostics.exit_code = 2;
//       expect(error.diagnostics?.exit_code).toBe(1);
//     },
//   );
// });
//
// describe("analysis error projection: Hopper startup failures", () => {
//   it("maps the Linux startup compatibility exit codes without host internals", () => {
//     const expected = [
//       [70, "private_display_unavailable"],
//       [71, "x11_authorization_failed"],
//       [72, "unsupported_hopper_build"],
//       [73, "invalid_launch_command"],
//       [74, "process_ownership_mismatch"],
//       [75, "hopper_exited_during_startup"],
//       [76, "unsupported_demo_dialog"],
//       [77, "unexpected_display_geometry"],
//       [78, "x11_input_failed"],
//       [79, "runtime_dependency_unavailable"],
//       [80, "x11_socket_directory_unusable"],
//     ] as const;
//
//     for (const [exitCode, code] of expected) {
//       const projected = projectAnalysisError(new HopperProcessError(exitCode));
//       expect(projected).toMatchObject({
//         code: "provider_unavailable",
//         details: { failure_code: code, exit_code: exitCode },
//       });
//       expect(projected.message).toMatch(/\S/u);
//       expect(JSON.stringify(projected)).not.toContain("/proc/");
//     }
//   });
// });
//
// describe("analysis error projection: retry guidance", () => {
//   it.each([
//     [
//       "unreadable output",
//       new AnalysisOutputError("inspect_firmware_regions", "report missing"),
//       "unreadable_output",
//     ],
//     [
//       "adapter failure",
//       new ProviderAdapterError("firmware", "inspect_firmware_regions"),
//       "execution_failure",
//     ],
//     [
//       "Hopper remote failure",
//       new HopperRemoteError(7, "Hopper analysis failed", {
//         diagnosticType: "bridge_exception",
//         operation: "trace_feature",
//       }),
//       "execution_failure",
//     ],
//   ])(
//     "does not recommend an unchanged retry for non-retryable %s",
//     (_name, error, code) => {
//       const projected = projectAnalysisError(error);
//
//       expect(projected).toMatchObject({ code, retryable: false });
//       for (const text of [projected.message, projected.remediation.action])
//         expect(text).not.toMatch(/\bretry\b/iu);
//     },
//   );
// });
//
// describe("analysis error projection: caller contract", () => {
//   it("preserves the reported output constraint without exposing its internal cause", () => {
//     const projected = projectAnalysisError(
//       new AnalysisOutputError(
//         "extract_firmware",
//         "Report exceeded the declared byte budget",
//         { cause: new Error("private internal cause") },
//       ),
//     );
//     expect(projected).toMatchObject({
//       code: "unreadable_output",
//       details: {
//         operation: "extract_firmware",
//         reason: "Report exceeded the declared byte budget",
//       },
//     });
//     expect(JSON.stringify(projected)).not.toContain("private internal cause");
//   });
//   it("maps representative failures without exposing causes", () => {
//     const secretCause = new Error("secret-token");
//     const projected = [
//       projectAnalysisError(
//         new AnalysisInputError("overview", { cause: secretCause }),
//       ),
//       projectAnalysisError(
//         new AnalysisCapabilityUnavailableError("fixture", "overview", "absent"),
//       ),
//       projectAnalysisError(
//         new BinaryTargetError("/local/targets/app", "invalid", {
//           cause: secretCause,
//         }),
//       ),
//     ];
//
//     expect(projected.map(({ code }) => code)).toEqual([
//       "invalid_request",
//       "capability_unavailable",
//       "target_unavailable",
//     ]);
//     expect(projected[1]).toMatchObject({
//       category: "unsupported_provider",
//       message:
//         "This analysis is unavailable for the current target. Choose another analysis or target.",
//       details: {
//         provider_id: "fixture",
//         operation: "overview",
//         reason: "absent",
//       },
export const _l = 218;
