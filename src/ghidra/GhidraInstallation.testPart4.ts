export const __stub = 1;
//       }),
//     );
//     expect(result.status).toBe("unavailable");
//     expect(
//       result.checks.find(({ status }) => status === "failed"),
//     ).toMatchObject({ name: "native_decompiler", code: "executable_missing" });
//   });
//
//   it("explains an accepted decompiler by its header, not only its path", () => {
//     const result = inspectGhidraInstallation(
//       {
//         environment: {},
//         installDir: INSTALL,
//         platform: "linux",
//         architecture: "x64",
//       },
//       host({
//         executableHeader: (path: string) =>
//           path === LINUX_DECOMPILER ? headerProbe(elf(2, 1, 62)) : undefined,
//       }),
//     );
//     expect(result.status).toBe("available");
//     if (result.status !== "available") return;
//     expect(
//       result.checks.find(({ name }) => name === "native_decompiler"),
//     ).toMatchObject({
//       status: "passed",
//       detail: `${LINUX_DECOMPILER} reports elf x86_64, which matches linux/x64`,
//     });
//   });
//
//   it("keeps an unreadable header unknown instead of failing the install", () => {
//     const result = inspectGhidraInstallation(
//       {
//         environment: {},
//         installDir: INSTALL,
//         platform: "linux",
//         architecture: "x64",
//       },
//       host({ executableHeader: () => undefined }),
//     );
//     expect(result.status).toBe("available");
//     if (result.status !== "available") return;
//     expect(
//       result.checks.find(({ name }) => name === "native_decompiler"),
//     ).toMatchObject({
//       status: "passed",
//       detail: expect.stringContaining("could not be established"),
//     });
//   });
//
//   it("accepts a one-slice universal-format Darwin native decompiler", () => {
//     const bytes = fat([0x0100000c]);
//     const result = inspectGhidraInstallation(
//       {
//         environment: {},
//         installDir: INSTALL,
//         platform: "darwin",
//         architecture: "arm64",
//       },
//       host({
//         probeJava: () => ({ ...JAVA, osArch: "aarch64", osName: "Mac OS X" }),
//         executableHeader: (path: string) =>
//           path === MAC_DECOMPILER ? headerProbe(bytes) : undefined,
//       }),
//     );
//     expect(result.status).toBe("available");
//     if (result.status !== "available") return;
//     expect(
//       result.checks.find(({ name }) => name === "native_decompiler"),
//     ).toMatchObject({
//       status: "passed",
//       detail: `${MAC_DECOMPILER} reports mach-o-universal arm64, which matches darwin/arm64`,
//     });
//   });
//
//   it("names the observed and the required executable in the failure", () => {
//     const result = inspectGhidraInstallation(
//       {
//         environment: {},
//         installDir: INSTALL,
//         platform: "darwin",
//         architecture: "arm64",
//       },
//       host({
//         probeJava: () => ({ ...JAVA, osArch: "aarch64", osName: "Mac OS X" }),
//         executableHeader: (path: string) =>
//           path === MAC_DECOMPILER ? headerProbe(elf(2, 1, 62)) : undefined,
//       }),
//     );
//     expect(result.status).toBe("unavailable");
//     if (result.status !== "unavailable") return;
//     expect(
//       result.checks.find(({ name }) => name === "native_decompiler"),
//     ).toMatchObject({
//       status: "failed",
//       detail: expect.stringMatching(
//         /reports elf x86_64, but darwin\/arm64 requires mach-o arm64/u,
//       ),
//       remediation: expect.stringContaining("os/mac_arm_64/decompile"),
//     });
//   });
// });
//
// describe("Ghidra JVM native directory admission", () => {
//   it("rejects a JDK whose os.arch selects a different native decompiler directory", () => {
//     const result = inspectGhidraInstallation(
//       {
//         environment: {},
//         installDir: INSTALL,
//         platform: "darwin",
//         architecture: "arm64",
//       },
//       host({
//         probeJava: () => ({ ...JAVA, osArch: "x86_64", osName: "Mac OS X" }),
//       }),
//     );
//     expect(result.status).toBe("unavailable");
//     if (result.status !== "unavailable") return;
//     expect(
//       result.checks.find(({ name }) => name === "native_decompiler"),
//     ).toMatchObject({
//       status: "failed",
//       code: "executable_missing",
//       detail: expect.stringContaining(
//         "JVM reports os.arch=x86_64, so Ghidra selects its native decompiler from os/mac_x86_64",
//       ),
//       remediation: expect.stringContaining("JAVA_HOME"),
//     });
//   });
//
//   it("accepts a JDK whose os.arch selects the validated native decompiler directory", () => {
//     const result = inspectGhidraInstallation(
//       {
//         environment: {},
//         installDir: INSTALL,
//         platform: "darwin",
//         architecture: "arm64",
//       },
//       host({
//         probeJava: () => ({ ...JAVA, osArch: "aarch64", osName: "Mac OS X" }),
//       }),
//     );
//     expect(result.status).toBe("available");
//   });
//
//   it("rejects a successful Java probe that omits os.arch", () => {
//     const { osArch: _observedArchitecture, ...withoutArchitecture } = JAVA;
//     const result = inspectGhidraInstallation(
//       {
//         environment: {},
//         installDir: INSTALL,
//         platform: "darwin",
//         architecture: "arm64",
//       },
//       host({ probeJava: () => withoutArchitecture }),
//     );
//     expect(result.status).toBe("unavailable");
//     expect(
//       result.checks.find(({ name }) => name === "native_decompiler"),
//     ).toMatchObject({
//       status: "failed",
//       detail: expect.stringContaining("did not report os.arch"),
//     });
//     expect(projectGhidraDoctorInspection(result).available).toBe(false);
//   });
//
//   it.each(["riscv64", "sparcv9", ""])(
//     "refuses an unrecognized JVM os.arch (%s) instead of assuming alignment",
//     (osArch) => {
//       const result = inspectGhidraInstallation(
//         {
//           environment: {},
//           installDir: INSTALL,
//           platform: "darwin",
//           architecture: "arm64",
//         },
//         host({
//           probeJava: () => ({ ...JAVA, osArch }),
//         }),
//       );
//       expect(result.status).toBe("unavailable");
//       if (result.status !== "unavailable") return;
//       expect(
//         result.checks.find(({ name }) => name === "native_decompiler"),
//       ).toMatchObject({
//         status: "failed",
//         detail: expect.stringContaining("unrecognized os.arch="),
//       });
//     },
//   );
//
//   it("rejects a JDK whose os.name selects a different host OS", () => {
//     const result = inspectGhidraInstallation(
//       {
//         environment: {},
//         installDir: INSTALL,
//         platform: "darwin",
//         architecture: "arm64",
//       },
//       host({
//         probeJava: () => ({
//           ...JAVA,
//           osArch: "aarch64",
//           osName: "Windows 11",
//         }),
//       }),
//     );
//     expect(result.status).toBe("unavailable");
//     if (result.status !== "unavailable") return;
//     expect(
//       result.checks.find(({ name }) => name === "native_decompiler"),
//     ).toMatchObject({
//       status: "failed",
//       code: "executable_missing",
//       detail: expect.stringContaining("JVM reports os.name=Windows 11"),
//       remediation: expect.stringContaining("JAVA_HOME"),
//     });
//   });
// });
//
// describe("Ghidra JVM OS admission", () => {
//   it("rejects a successful Java probe that omits os.name", () => {
//     const { osName: _observedOsName, ...withoutOsName } = JAVA;
//     const result = inspectGhidraInstallation(
//       {
//         environment: {},
//         installDir: INSTALL,
//         platform: "linux",
//         architecture: "x64",
//       },
//       host({ probeJava: () => withoutOsName }),
//     );
//     expect(result.status).toBe("unavailable");
//     expect(
//       result.checks.find(({ name }) => name === "native_decompiler"),
//     ).toMatchObject({
//       status: "failed",
//       detail: expect.stringContaining("did not report os.name"),
//     });
//     expect(projectGhidraDoctorInspection(result).available).toBe(false);
//   });
//
//   it.each(["SunOS", "FreeBSD", ""])(
//     "refuses an unrecognized JVM os.name (%s) instead of assuming alignment",
//     (osName) => {
//       const result = inspectGhidraInstallation(
//         {
//           environment: {},
//           installDir: INSTALL,
//           platform: "linux",
//           architecture: "x64",
//         },
//         host({
//           probeJava: () => ({ ...JAVA, osName }),
//         }),
//       );
//       expect(result.status).toBe("unavailable");
//       if (result.status !== "unavailable") return;
//       expect(
//         result.checks.find(({ name }) => name === "native_decompiler"),
//       ).toMatchObject({
//         status: "failed",
//         detail: expect.stringContaining("os.name="),
//       });
//     },
//   );
// });
//
// describe("Ghidra Java probe os.arch extraction", () => {
//   it("extracts os.arch through the real Java probe into the installation diagnostics", () => {
//     vi.mocked(spawnSync).mockReturnValue({
//       status: 0,
//       stdout: "",
//       stderr: [
//         "Property settings:",
//         "    file.encoding = UTF-8",
//         "    java.home = /usr/lib/jvm/jdk-21",
//         "    java.version = 21.0.11",
//         "    java.vm.name = OpenJDK 64-Bit Server VM",
//         "    os.arch = x86_64",
//         "    os.name = Linux",
//         "    sun.arch.data.model = 64",
//         "",
//       ].join("\n"),
//     } as never);
//     try {
//       // No host override: the real system host runs the real probeJava
//       // against the stubbed spawnSync.
//       const inspection = inspectGhidraInstallation({
//         environment: {},
//         installDir: INSTALL,
//         javaHome: "/usr/lib/jvm/jdk-21",
//         platform: "linux",
//         architecture: "x64",
//       });
//       expect(ghidraInstallationDiagnostics(inspection)).toMatchObject({
//         java_os_arch: "x86_64",
//         java_os_name: "Linux",
//       });
//     } finally {
//       vi.mocked(spawnSync).mockReset();
//     }
//   });
// });
export const _l = 305;
