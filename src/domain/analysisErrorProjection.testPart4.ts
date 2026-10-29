export const __stub = 1;
//     });
//     expect(projected[2]).toMatchObject({
//       details: { path: "/local/targets/app" },
//     });
//     expect(JSON.stringify(projected)).not.toContain("secret-token");
//   });
//
//   it.each(["EACCES", "EPERM"] as const)(
//     "reports a target the host refused to read (%s) as access_denied",
//     (systemCode) => {
//       const denied = Object.assign(new Error("denied"), { code: systemCode });
//       const reason = `permission denied while reading target: ${systemCode}`;
//       expect(
//         projectAnalysisError(
//           new BinaryTargetError("/local/targets/app", reason, {
//             cause: denied,
//           }),
//         ),
//       ).toMatchObject({
//         code: "access_denied",
//         category: "unavailable",
//         retryable: false,
//         remediation: {
//           action:
//             "Check the current process's read access to the selected path. Retry with a readable local file.",
//         },
//         details: {
//           path: "/local/targets/app",
//           reason,
//           system_code: systemCode,
//           boundary: "filesystem-read",
//         },
//       });
//       expect(
//         projectAnalysisError(
//           new BinaryTargetError("/local/targets/app", "missing", {
//             cause: Object.assign(new Error("missing"), { code: "ENOENT" }),
//           }),
//         ),
//       ).toMatchObject({ code: "target_unavailable" });
//     },
//   );
//
//   it("uses explicit capability recovery while retaining the constraint", () => {
//     const projected = projectAnalysisError(
//       new AnalysisCapabilityUnavailableError(
//         "fixture",
//         "capture",
//         "host constraint",
//         {
//           userMessage: "Use the supported host workflow.",
//           cause: new Error("private internal cause"),
//         },
//       ),
//     );
//     expect(projected).toMatchObject({
//       code: "capability_unavailable",
//       category: "unsupported_provider",
//       message: "Use the supported host workflow.",
//       details: {
//         provider_id: "fixture",
//         operation: "capture",
//         reason: "host constraint",
//       },
//     });
//     expect(JSON.stringify(projected)).not.toContain("private internal cause");
//   });
//
//   it("preserves exact artifact-integrity coordinates", () => {
//     expect(
//       projectAnalysisError(
//         new ArtifactOperationError("inventory_artifact", "integrity", {
//           logicalPath: "main.js",
//           declaredSha256: "a".repeat(64),
//           calculatedSha256: "b".repeat(64),
//           unpacked: true,
//         }),
//       ),
//     ).toMatchObject({
//       category: "integrity_mismatch",
//       details: {
//         logical_path: "main.js",
//         declared_sha256: "a".repeat(64),
//         calculated_sha256: "b".repeat(64),
//         unpacked: true,
//       },
//     });
//   });
//
//   it("gives missing residual unknowns lookup-specific remediation", () => {
//     expect(
//       projectAnalysisError(new UnknownRegistryError("not-found")),
//     ).toMatchObject({
//       code: "execution_failure",
//       message:
//         "The requested residual unknown does not exist in this session. Check the unknown_id and try again.",
//       remediation: {
//         action:
//           "Check that the unknown_id belongs to this session, then retry.",
//       },
//       details: { reason: "not-found" },
//     });
//   });
// });
//
// describe("analysis error projection: operational diagnostics", () => {
//   it("distinguishes an observed Hopper exit from an undetermined provider failure", () => {
//     const exited = projectAnalysisError(
//       new HopperProcessError(7, { operation: "search_strings", requestId: 4 }),
//     );
//     expect(exited).toMatchObject({
//       code: "provider_unavailable",
//       retryable: true,
//       details: {
//         stage: "analysis",
//         provider_state: "exited",
//         retry_action: "restart_provider",
//         operation: "search_strings",
//         request_id: 4,
//         exit_code: 7,
//       },
//     });
//     expect(exited.message).not.toContain("Run `rea doctor`, then try again.");
//     expect(exited.remediation.action).toContain("Restart the owned provider");
//
//     const unknown = projectAnalysisError(
//       new HopperProcessError(null, {
//         operation: "search_strings",
//         requestId: 5,
//       }),
//     );
//     expect(unknown.details).toMatchObject({
//       stage: "analysis",
//       provider_state: "unknown",
//       retry_action: "unknown",
//       operation: "search_strings",
//       request_id: 5,
//       exit_code: null,
//     });
//     expect(unknown.message).toContain("could not determine");
//     expect(unknown.message).not.toContain("stopped");
//     expect(unknown.remediation.action).toContain("provider_operation_health");
//
//     const unreachable = projectAnalysisError(
//       new HopperProcessError(null, {
//         operation: "search_strings",
//         providerState: "unreachable",
//       }),
//     );
//     expect(unreachable.message).toContain(
//       "If Hopper may have exited, call export_evidence_bundle before close_binary",
//     );
//     expect(unreachable.message).toContain("closing clears retained records");
//     expect(unreachable.remediation.action).toContain("export_evidence_bundle");
//   });
// });
//
// describe("analysis error projection: evidence files", () => {
//   it.each([
//     ["read", "missing", "invalid_request", "invalid_input"],
//     ["read", "not-file", "invalid_request", "invalid_input"],
//     ["write", "missing", "invalid_request", "invalid_input"],
//     ["write", "exists", "invalid_request", "invalid_input"],
//     [
//       "read",
//       "invalid-json",
//       "evidence_integrity_mismatch",
//       "execution_failure",
//     ],
//     ["read", "io", "execution_failure", "execution_failure"],
//   ] as const)(
//     "classifies a %s %s evidence file by who can correct it",
//     (operation, reason, code, category) => {
//       const projected = projectAnalysisError(
//         new EvidenceFileError(operation, reason, { path: "/selected.json" }),
//       );
//       expect(projected).toMatchObject({
//         code,
//         category,
//         details: { operation, reason, path: "/selected.json" },
//       });
//       expect(analysisErrorProjectionSchema.parse(projected)).toEqual(projected);
//     },
//   );
// });
//
// it("retains the primary failure and both cleanup reports after a secondary failure", () => {
//   const primary = new AnalysisCancelledError("execute_rizin_command", {
//     capturedOutput: {
//       stdout: "partial",
//       stderr: "diagnostic",
//       truncated: false,
//     },
//     cleanup: { reason: "writer remains", resources: ["writer"] },
//   });
//   const secondary = new AnalysisOutputError("open_binary", "cannot rebind", {
//     cleanup: { reason: "provider remains", resources: ["provider", "writer"] },
//   });
//   const enriched = primary.retainSecondaryFailure(secondary, {
//     rebind_error: projectAnalysisError(secondary),
//   });
//   expect(enriched).toBe(primary);
//   expect(enriched._tag).toBe("AnalysisCancelledError");
//   expect(projectAnalysisError(enriched)).toMatchObject({
//     code: "cleanup_incomplete",
//     details: {
//       execution_failure: "cancelled",
//       resources: ["writer"],
//       cleanup_reason: "writer remains",
//       captured_output: { stdout: "partial", stderr: "diagnostic" },
//       diagnostics: { rebind_error: { code: "cleanup_incomplete" } },
//     },
//   });
// });
export const _l = 214;
