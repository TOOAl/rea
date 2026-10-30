export const __stub = 1;
//   it("refuses universal targets whose selected slice cannot be enforced", () => {
//     const ghidra = provider();
//     const universal: BinaryTarget = {
//       path: "/tmp/fixture",
//       sha256: "a".repeat(64),
//       kind: "executable",
//       format: "mach-o-universal",
//       architecture: "arm64",
//       availableArchitectures: ["x86_64", "arm64"],
//       universalSlice: { offset: 0, size: 32 },
//     };
//
//     expect(ghidra.inspectTargetSupport(universal)).toMatchObject({
//       status: "unsupported",
//       code: "architecture_unsupported",
//       reason: expect.stringContaining("universal Mach-O"),
//       diagnostics: {
//         architecture: "arm64",
//         available_architectures: ["x86_64", "arm64"],
//       },
//     });
//     expect(
//       ghidra.inspectTargetSupport(executableTarget("mach-o", "arm64")),
//     ).toMatchObject({ status: "supported" });
//
//     expect(
//       ghidra.inspectTargetSupport({
//         ...universal,
//         availableArchitectures: ["arm64"] as const,
//       }),
//     ).toMatchObject({ status: "supported" });
//   });
// });
//
// describe("Ghidra platform support", () => {
//   it.each([
//     { architecture: "arm", languageId: "ARM:LE:32:v7" },
//     { architecture: "arm64", languageId: "AARCH64:LE:64:v8A" },
//   ] as const)(
//     "records explicit Windows $architecture processor selection without claiming loader selection",
//     async ({ architecture, languageId }) => {
//       const directory = await mkdtemp(
//         join(tmpdir(), "rea-arm-profile-language-"),
//       );
//       onTestFinished(() => rm(directory, { recursive: true, force: true }));
//       const languages = join(
//         directory,
//         "Ghidra/Processors/fixture/data/languages",
//       );
//       await mkdir(languages, { recursive: true });
//       await writeFile(
//         join(languages, "fixture.ldefs"),
//         `<language_definitions><language processor="${architecture === "arm" ? "ARM" : "AARCH64"}" endian="little" size="${architecture === "arm" ? 32 : 64}" variant="fixture" id="${languageId}"><compiler name="Visual Studio" spec="fixture.cspec" id="windows"/></language></language_definitions>`,
//       );
//       const config = parseConfig({
//         GHIDRA_INSTALL_DIR: directory,
//         REA_GHIDRA_LANGUAGE_ID: languageId,
//         REA_GHIDRA_COMPILER_SPEC_ID: "windows",
//       });
//       if (!config.ok) throw config.error;
//       const ghidra = new GhidraProvider(
//         config.value,
//         silentLogger,
//         {},
//         installationHost("win32"),
//       );
//       const resolved = await ghidra.resolveAnalysisProfile(
//         peTarget(architecture),
//       );
//       if (!resolved.ok) throw resolved.error;
//       expect(resolved.value.profile?.parameters).toMatchObject({
//         windows_arm_pe_import: "explicit-language-v1",
//         windows_arm_pe_machine: peTarget(architecture).peMachine,
//         language_id: languageId,
//         compiler_spec_id: "windows",
//       });
//     },
//   );
//
//   it("versions the Windows ARM PE import without changing other profile lanes", async () => {
//     for (const platform of ["win32", "linux"] as const) {
//       const ghidra = provider(installationHost(platform));
//       for (const architecture of ["x86", "x86_64", "arm", "arm64"] as const) {
//         const resolved = await ghidra.resolveAnalysisProfile(
//           peTarget(architecture),
//         );
//         if (!resolved.ok) throw resolved.error;
//         if (resolved.value.profile === null)
//           throw new Error("Expected a PE analysis profile");
//         const parameters = resolved.value.profile.parameters;
//         if (
//           platform === "win32" &&
//           (architecture === "arm" || architecture === "arm64")
//         )
//           expect(parameters).toHaveProperty(
//             "windows_arm_pe_import",
//             "loader-selected-language-v1",
//           );
//         else expect(parameters).not.toHaveProperty("windows_arm_pe_import");
//         if (
//           platform === "win32" &&
//           (architecture === "arm" || architecture === "arm64")
//         )
//           expect(parameters.windows_arm_pe_machine).toBe(
//             peTarget(architecture).peMachine,
//           );
//         else expect(parameters).not.toHaveProperty("windows_arm_pe_machine");
//       }
//     }
//   });
//
//   it("commits the PE role and managed classification to profile identity", async () => {
//     const ghidra = provider(installationHost("win32"));
//     const application = peTarget("x86_64");
//     const library = {
//       ...application,
//       executableRole: "shared-library",
//     } as const;
//     const digests = new Set<string>();
//     for (const target of [
//       application,
//       library,
//       { ...library, managed: true },
//     ]) {
//       const resolved = await ghidra.resolveAnalysisProfile(target);
//       if (!resolved.ok) throw resolved.error;
//       const profile = resolved.value.profile;
//       if (profile === null) throw new Error("Expected a PE analysis profile");
//       expect(profile.parameters).toMatchObject({
//         executable_role: target.executableRole,
//         managed: target.managed,
//         native_aot_metadata: {
//           contract_revision: "rtr-9.1-x64-pe-read-only-v3",
//           source_bytes: 128 * 1024 * 1024,
//           work_units: 64 * 1024 * 1024,
//           working_memory_bytes: 64 * 1024 * 1024,
//           report_bytes: 4 * 1024 * 1024,
//         },
//       });
//       digests.add(profile.digest);
//     }
//     expect(digests.size).toBe(3);
//     const nonPe = await ghidra.resolveAnalysisProfile(
//       executableTarget("elf", "x86_64"),
//     );
//     if (!nonPe.ok || nonPe.value.profile === null)
//       throw new Error("Expected a non-PE analysis profile");
//     expect(nonPe.value.profile.parameters).not.toHaveProperty(
//       "native_aot_metadata",
//     );
//   });
//
//   it("keeps Windows annotation mutation unavailable independently of native controls", () => {
//     const ghidra = provider(installationHost("win32"));
//     expect(
//       ghidra
//         .capabilities()
//         .find(({ operation }) => operation === "annotate_native_function"),
//     ).toMatchObject({
//       available: false,
//       reason: "Windows Ghidra P0 does not admit database mutation.",
//       availabilityCode: "unsupported_host",
//     });
//   });
// });
//
// describe("Ghidra Windows platform support", () => {
//   it("keeps Windows P0 unavailable until native isolation authority exists", () => {
//     const native = vi
//       .spyOn(nativeLoader, "systemWindowsNativeAuthority")
//       .mockReturnValue({
//         available: false,
//         failureStage: "artifact",
//         reason: WINDOWS_NATIVE_AUTHORITY_UNAVAILABLE_REASON,
//       });
//     onTestFinished(() => native.mockRestore());
//     const ghidra = provider(installationHost("win32"));
//     const nativeApplication = peTarget("x86_64");
//     for (const architecture of ["x86", "x86_64"] as const)
//       expect(ghidra.inspectTargetSupport(peTarget(architecture))).toMatchObject(
//         {
//           status: "supported",
//           diagnostics: {
//             host_platform: "win32",
//             architecture,
//             executable_role: "application",
//             managed: false,
//           },
//         },
//       );
//     expect(ghidra.inspectAvailability()).toMatchObject({
//       status: "unavailable",
//       code: "runtime_missing",
//       reason: expect.stringContaining(
//         "Windows native controls are unavailable",
//       ),
//       diagnostics: {
//         windows_native_failure: {
//           stage: "artifact",
//           remediation: expect.any(String),
//         },
//         windows_security: {
//           job_object_process_ownership: expect.objectContaining({
//             available: false,
//             proof: "not-proven",
//           }),
//           private_runtime_dacl: expect.objectContaining({
//             available: false,
//             proof: "not-proven",
//           }),
//           reparse_safe_path_admission: expect.objectContaining({
//             available: false,
//             proof: "not-proven",
//           }),
//         },
//       },
//     });
//     expect(ghidra.capabilities()).toEqual(
//       expect.arrayContaining([
//         expect.objectContaining({
//           operation: "list_procedures",
//           available: false,
//           availabilityCode: "runtime_missing",
//           limitations: expect.arrayContaining([
//             expect.stringContaining(
//               "matching packaged Windows x64 native addon",
//             ),
//             expect.stringContaining(
//               "private DACLs, and Job Object ownership automatically",
//             ),
//           ]),
//         }),
//       ]),
//     );
//     expect(
//       ghidra.inspectTargetSupport({
//         ...nativeApplication,
//         executableRole: "non-executable",
//       }),
//     ).toMatchObject({
//       status: "unsupported",
//       code: "target_role_unsupported",
//     });
//     expect(
//       ghidra.inspectTargetSupport({ ...nativeApplication, managed: true }),
//     ).toMatchObject({
//       status: "unsupported",
//       code: "managed_target_unsupported",
//     });
//     expect(
//       ghidra.inspectTargetSupport(executableTarget("elf", "x86_64")),
//     ).toMatchObject({
//       status: "unsupported",
//       code: "target_format_unsupported",
//     });
//     // ARM64 PE is admitted on Windows P0 (bounded; see docs/windows-ghidra-p0.md).
//     expect(
//       ghidra.inspectTargetSupport(executableTarget("pe", "arm64")).status,
//     ).toBe("supported");
//     expect(
//       ghidra.inspectTargetSupport(executableTarget("pe", "arm")).status,
//     ).toBe("supported");
//   });
// });
//
// describe("Windows Ghidra native failure diagnostics", () => {
//   it.each([
//     ["artifact", "runtime_missing"],
//     ["self-test", "runtime_unavailable"],
//     ["inspection", "runtime_unavailable"],
//   ] as const)(
//     "keeps Windows P0 unavailable after a %s failure",
//     async (failureStage, code) => {
//       const load = vi
//         .spyOn(nativeLoader, "systemWindowsNativeAuthority")
//         .mockReturnValue({
//           available: false,
//           failureStage,
//           reason: "Windows native controls are unavailable: missing manifest",
//         });
//       const ghidra = provider(installationHost("win32"));
//       const nativeApplication = peTarget("x86_64");
//
//       for (const architecture of ["x86", "x86_64"] as const)
//         expect(
//           ghidra.inspectTargetSupport(peTarget(architecture)),
//         ).toMatchObject({
//           status: "supported",
//           diagnostics: {
//             host_platform: "win32",
//             architecture,
//             executable_role: "application",
//             managed: false,
//           },
//         });
//       expect(ghidra.inspectAvailability()).toMatchObject({
//         status: "unavailable",
//         code,
//         reason: expect.stringContaining(
//           "Windows native controls are unavailable",
//         ),
//         diagnostics: {
//           windows_native_failure: {
//             stage: failureStage,
//             remediation: expect.any(String),
//           },
//           windows_security: {
//             job_object_process_ownership: expect.objectContaining({
//               available: false,
//               proof: "not-proven",
//             }),
//             private_runtime_dacl: expect.objectContaining({
//               available: false,
//               proof: "not-proven",
//             }),
//             reparse_safe_path_admission: expect.objectContaining({
//               available: false,
//               proof: "not-proven",
//             }),
//           },
//         },
//       });
//       expect(load).toHaveBeenCalledTimes(1);
//       expect(ghidra.capabilities()).toEqual(
//         expect.arrayContaining([
//           expect.objectContaining({
//             operation: "list_procedures",
//             available: false,
//             availabilityCode: code,
//             limitations: expect.arrayContaining([
//               expect.stringContaining(
//                 "matching packaged Windows x64 native addon",
//               ),
//               expect.stringContaining(
//                 "private DACLs, and Job Object ownership automatically",
//               ),
//             ]),
//           }),
//         ]),
//       );
//       expect(
//         ghidra.inspectTargetSupport({
//           ...nativeApplication,
//           executableRole: "non-executable",
export const _l = 344;
