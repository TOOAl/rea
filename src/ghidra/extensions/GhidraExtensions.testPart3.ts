export const __stub = 1;
// describe("Ghidra extension profile and producer validation", () => {
//   it("requires exact inventory, artifact digest and consistent producer status", async () => {
//     const { extension } = await artifact();
//     const valid = result(extension.sha256);
//     const inventoryMismatch =
//       "Ghidra extension result inventory differs from its committed profile.";
//     expect(validateGhidraExtensionResults([extension], [valid])).toBeNull();
//     expect(validateGhidraExtensionResults([extension], [])).toBe(
//       inventoryMismatch,
//     );
//     expect(validateGhidraExtensionResults([], [valid])).toBe(inventoryMismatch);
//     expect(validateGhidraExtensionResults([extension], [valid, valid])).toBe(
//       inventoryMismatch,
//     );
//     expect(
//       validateGhidraExtensionResults(
//         [extension],
//         [{ ...valid, sha256: "b".repeat(64) }],
//       ),
//     ).toBe("Ghidra extension identity mismatch: nativeaot");
//     expect(
//       validateGhidraExtensionResults(
//         [extension],
//         [{ ...valid, status: "complete" }],
//       ),
//     ).toBe(
//       "NativeAOT extension returned a malformed or inconsistent producer report.",
//     );
//   });
//   it("requires matching explicit configuration for imported executable profiles", async () => {
//     const { extension, path } = await artifact();
//     expect(
//       validateGhidraExtensionProfile(
//         [extension],
//         config(path),
//         target,
//         "linux",
//       ),
//     ).toBeNull();
//     expect(
//       validateGhidraExtensionProfile([extension], config(), target, "linux"),
//     ).toBe(
//       "Configured Ghidra extension inventory differs from the resolved analysis profile.",
//     );
//     expect(
//       validateGhidraExtensionProfile(
//         [extension],
//         config(path),
//         target,
//         "darwin",
//       ),
//     ).toBe(
//       "NativeAOT recovery is verified on Linux only; omit REA_GHIDRA_NATIVEAOT_JAR for ordinary native analysis.",
//     );
//     expect(
//       validateGhidraExtensionProfile(
//         [{ ...extension, entry_class: "arbitrary.Code" }],
//         config(path),
//         target,
//         "linux",
//       ),
//     ).toBe(
//       "Ghidra extension profile lacks matching explicit local configuration: nativeaot",
//     );
//     expect(
//       validateGhidraExtensionProfile(
//         [{ ...extension, configured_path: "/another.jar" }],
//         config(path),
//         target,
//         "linux",
//       ),
//     ).toBe(
//       "Ghidra extension profile lacks matching explicit local configuration: nativeaot",
//     );
//   });
//   it("does not classify PE/CLI or ReadyToRun as NativeAOT", async () => {
//     const resolved = await resolveGhidraExtensions(
//       config("/absent.jar"),
//       { ...target, format: "pe", managed: true, executableRole: "application" },
//       "linux",
//     );
//     expect(resolved.ok).toBe(false);
//     if (!resolved.ok)
//       expect(projectAnalysisError(resolved.error)).toMatchObject({
//         code: "unsupported_target",
//         remediation: {
//           action: expect.stringContaining("inspect_managed_artifact"),
//         },
//       });
//   });
//   it("does not substitute another artifact under an unchanged configured path", async () => {
//     const first = await artifact();
//     const second = await artifact();
//     await expect(
//       snapshotGhidraExtensions(
//         [{ ...second.extension, configured_path: first.path }],
//         await root(),
//       ),
//     ).rejects.toThrow("resolved path differs");
//   });
//   it("rejects unregistered descriptors before snapshot filesystem writes", async () => {
//     const { extension } = await artifact();
//     const runtime = await root();
//     await expect(
//       snapshotGhidraExtensions([{ ...extension, id: "unknown" }], runtime),
//     ).rejects.toThrow("Unregistered");
//   });
// });
//
// describe("Ghidra extension recovery coverage", () => {
//   it("validates positive recovery, measured partial coverage and distinct table identities", async () => {
//     const { extension } = await artifact();
//     const baseline = result(extension.sha256);
//     const positive: GhidraExtensionResult = {
//       ...baseline,
//       status: "complete",
//       reason: null,
//       result: {
//         ...baseline.result,
//         status: "complete",
//         reason: null,
//         method_tables: 1,
//         header_address: "0x401000",
//         discovery: "signature-heuristic",
//         format_major: 9,
//         format_minor: 1,
//         types: [
export const _l = 127;
